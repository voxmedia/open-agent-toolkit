import {
  access,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { compareVersions } from '@commands/init/tools/shared/version';
import { getSkillVersion } from '@commands/shared/frontmatter';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import TOML from '@iarna/toml';
import { loadManifest, type Manifest } from '@manifest/index';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { geminiAdapter } from '@providers/gemini';
import type { ConcreteScope } from '@shared/types';
import { type DoctorCheck, formatDoctorResults } from '@ui/output';
import { Command } from 'commander';

interface DoctorDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  pathExists: (path: string) => Promise<boolean>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  checkSymlinkSupport: (scopeRoot: string) => Promise<boolean>;
  checkProviders: (
    scopeRoot: string,
  ) => Promise<
    Array<{ name: string; detected: boolean; version: string | null }>
  >;
  readFile: (path: string) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  checkSkillVersions: (
    scopeRoot: string,
    assetsRoot: string,
    pathExists: (path: string) => Promise<boolean>,
  ) => Promise<SkillVersionReport>;
}

interface OutdatedSkillVersion {
  skill: string;
  installedVersion: string | null;
  bundledVersion: string | null;
}

interface SkillVersionReport {
  installedSkillCount: number;
  skippedMissingBundledCount: number;
  outdatedSkills: OutdatedSkillVersion[];
}

async function pathExistsDefault(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function checkSymlinkSupportDefault(
  _scopeRoot: string,
): Promise<boolean> {
  const tempDir = await mkdtemp(join(tmpdir(), 'oat-doctor-'));
  const targetDir = join(tempDir, 'target');
  const linkDir = join(tempDir, 'link');

  try {
    // Intentionally use a non-existent target to validate symlink syscall
    // capability only; we are not validating target resolution here.
    await symlink(targetDir, linkDir, 'dir');
    return true;
  } catch {
    return false;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function checkProvidersDefault(
  scopeRoot: string,
): Promise<Array<{ name: string; detected: boolean; version: string | null }>> {
  const adapters = [
    claudeAdapter,
    cursorAdapter,
    codexAdapter,
    copilotAdapter,
    geminiAdapter,
  ];

  return Promise.all(
    adapters.map(async (adapter) => ({
      name: adapter.name,
      detected: await adapter.detect(scopeRoot),
      version: adapter.detectVersion ? await adapter.detectVersion() : null,
    })),
  );
}

async function checkSkillVersionsDefault(
  scopeRoot: string,
  assetsRoot: string,
  pathExists: (path: string) => Promise<boolean>,
): Promise<SkillVersionReport> {
  const installedSkillsRoot = join(scopeRoot, '.agents', 'skills');
  const entries = await readdir(installedSkillsRoot, {
    withFileTypes: true,
    encoding: 'utf8',
  }).catch(() => null);
  if (!entries) {
    return {
      installedSkillCount: 0,
      skippedMissingBundledCount: 0,
      outdatedSkills: [],
    };
  }

  const skillNames = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('oat-'))
    .map((entry) => entry.name)
    .sort();

  const outdatedSkills: OutdatedSkillVersion[] = [];
  let skippedMissingBundledCount = 0;

  for (const skillName of skillNames) {
    const installedSkillDir = join(installedSkillsRoot, skillName);
    const bundledSkillDir = join(assetsRoot, 'skills', skillName);
    const bundledExists = await pathExists(bundledSkillDir);
    if (!bundledExists) {
      skippedMissingBundledCount += 1;
      continue;
    }

    const [installedVersion, bundledVersion] = await Promise.all([
      getSkillVersion(installedSkillDir),
      getSkillVersion(bundledSkillDir),
    ]);
    const comparison = compareVersions(installedVersion, bundledVersion);
    if (comparison === 'outdated') {
      outdatedSkills.push({
        skill: skillName,
        installedVersion: installedVersion ?? null,
        bundledVersion: bundledVersion ?? null,
      });
    }
  }

  return {
    installedSkillCount: skillNames.length,
    skippedMissingBundledCount,
    outdatedSkills,
  };
}

function formatVersionForDisplay(version: string | null): string {
  return version ?? '(unversioned)';
}

function formatOutdatedSkillList(
  outdatedSkills: OutdatedSkillVersion[],
): string {
  return outdatedSkills
    .map(
      (skillVersion) =>
        `${skillVersion.skill} (${formatVersionForDisplay(skillVersion.installedVersion)} < ${formatVersionForDisplay(skillVersion.bundledVersion)})`,
    )
    .join(', ');
}

function createDependencies(): DoctorDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    pathExists: pathExistsDefault,
    loadManifest,
    checkSymlinkSupport: checkSymlinkSupportDefault,
    checkProviders: checkProvidersDefault,
    readFile: async (path) => readFile(path, 'utf8'),
    resolveAssetsRoot,
    // Default binding remains self-contained, but still honors the caller-
    // provided pathExists dependency from runChecksForScope when available.
    checkSkillVersions: (
      scopeRoot,
      assetsRoot,
      pathExists = pathExistsDefault,
    ) => checkSkillVersionsDefault(scopeRoot, assetsRoot, pathExists),
  };
}

async function runChecksForScope(
  scope: ConcreteScope,
  scopeRoot: string,
  dependencies: DoctorDependencies,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const skillsPath = join(scopeRoot, '.agents', 'skills');
  const agentsPath = join(scopeRoot, '.agents', 'agents');
  const hasSkills = await dependencies.pathExists(skillsPath);
  const hasAgents =
    scope === 'project' ? await dependencies.pathExists(agentsPath) : true;
  const canonicalOk = hasSkills && hasAgents;
  checks.push({
    name: `${scope}:canonical_directories`,
    description: 'Canonical directory existence',
    status: canonicalOk ? 'pass' : 'warn',
    message: canonicalOk
      ? 'Canonical directories are present.'
      : 'Canonical directories are missing.',
    fix: canonicalOk
      ? undefined
      : 'Run `oat init` to create canonical directories.',
  });

  const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
  const manifestExists = await dependencies.pathExists(manifestPath);
  try {
    await dependencies.loadManifest(manifestPath);
    checks.push({
      name: `${scope}:manifest`,
      description: 'Manifest availability and validity',
      status: manifestExists ? 'pass' : 'warn',
      message: manifestExists
        ? 'Manifest loaded successfully.'
        : 'Manifest file not found; default empty manifest in use.',
      fix: manifestExists
        ? undefined
        : 'Run `oat sync` or `oat init` to create manifest.',
    });
  } catch (error) {
    checks.push({
      name: `${scope}:manifest`,
      description: 'Manifest availability and validity',
      status: 'fail',
      message:
        error instanceof Error
          ? `Manifest validation failed: ${error.message}`
          : 'Manifest validation failed.',
      fix: 'Repair or remove manifest and rerun `oat init`.',
    });
  }

  const symlinkSupported = await dependencies.checkSymlinkSupport(scopeRoot);
  checks.push({
    name: `${scope}:symlink_support`,
    description: 'Symlink capability',
    status: symlinkSupported ? 'pass' : 'warn',
    message: symlinkSupported
      ? 'Symlink operations are supported.'
      : 'Symlink operations are unavailable; copy fallback may be used.',
    fix: symlinkSupported
      ? undefined
      : 'Use copy strategy or grant symlink permissions.',
  });

  const providers = await dependencies.checkProviders(scopeRoot);
  const detectedCount = providers.filter(
    (provider) => provider.detected,
  ).length;
  checks.push({
    name: `${scope}:providers`,
    description: 'Provider detection and version',
    status: detectedCount > 0 ? 'pass' : 'warn',
    message:
      detectedCount > 0
        ? `Detected ${detectedCount} provider(s): ${providers
            .filter((provider) => provider.detected)
            .map((provider) =>
              provider.version
                ? `${provider.name}@${provider.version}`
                : provider.name,
            )
            .join(', ')}`
        : 'No providers detected in scope.',
    fix:
      detectedCount > 0
        ? undefined
        : 'Install or enable a provider directory (e.g. .claude, .cursor, .codex).',
  });

  if (scope === 'project') {
    try {
      const assetsRoot = await dependencies.resolveAssetsRoot();
      const skillVersions = await dependencies.checkSkillVersions(
        scopeRoot,
        assetsRoot,
        dependencies.pathExists,
      );
      if (skillVersions.outdatedSkills.length > 0) {
        checks.push({
          name: `${scope}:skill_versions`,
          description: 'Installed skill version parity with bundled assets',
          status: 'warn',
          message: `Outdated installed skills: ${formatOutdatedSkillList(
            skillVersions.outdatedSkills,
          )}`,
          fix: 'Run `oat init tools` to update outdated skills.',
        });
      } else if (skillVersions.installedSkillCount === 0) {
        checks.push({
          name: `${scope}:skill_versions`,
          description: 'Installed skill version parity with bundled assets',
          status: 'pass',
          message: 'No installed oat-* skills found for version comparison.',
        });
      } else if (skillVersions.skippedMissingBundledCount > 0) {
        checks.push({
          name: `${scope}:skill_versions`,
          description: 'Installed skill version parity with bundled assets',
          status: 'pass',
          message: `All comparable skill versions are current. Skipped ${skillVersions.skippedMissingBundledCount} skill(s) without bundled counterpart.`,
        });
      } else {
        checks.push({
          name: `${scope}:skill_versions`,
          description: 'Installed skill version parity with bundled assets',
          status: 'pass',
          message: 'All installed skill versions are current.',
        });
      }
    } catch (error) {
      checks.push({
        name: `${scope}:skill_versions`,
        description: 'Installed skill version parity with bundled assets',
        status: 'warn',
        message:
          error instanceof Error
            ? `Unable to compare installed skill versions: ${error.message}`
            : 'Unable to compare installed skill versions.',
        fix: 'Run `pnpm build` and rerun `oat doctor`.',
      });
    }

    const codexConfigPath = join(scopeRoot, '.codex', 'config.toml');
    const codexConfigExists = await dependencies.pathExists(codexConfigPath);

    if (codexConfigExists) {
      let parsedConfig: Record<string, unknown> | null = null;
      try {
        parsedConfig = TOML.parse(
          await dependencies.readFile(codexConfigPath),
        ) as Record<string, unknown>;
        checks.push({
          name: `${scope}:codex_config_toml`,
          description: 'Codex config TOML parseability',
          status: 'pass',
          message: '.codex/config.toml parsed successfully.',
        });
      } catch (error) {
        checks.push({
          name: `${scope}:codex_config_toml`,
          description: 'Codex config TOML parseability',
          status: 'fail',
          message:
            error instanceof Error
              ? `Failed to parse .codex/config.toml: ${error.message}`
              : 'Failed to parse .codex/config.toml.',
          fix: 'Repair .codex/config.toml syntax and rerun doctor.',
        });
      }

      if (parsedConfig) {
        const features =
          parsedConfig.features &&
          typeof parsedConfig.features === 'object' &&
          !Array.isArray(parsedConfig.features)
            ? (parsedConfig.features as Record<string, unknown>)
            : null;
        const agents =
          parsedConfig.agents &&
          typeof parsedConfig.agents === 'object' &&
          !Array.isArray(parsedConfig.agents)
            ? (parsedConfig.agents as Record<string, unknown>)
            : null;

        const managedRoles = Object.entries(agents ?? {})
          .filter(([, config]) => {
            if (
              !config ||
              typeof config !== 'object' ||
              Array.isArray(config)
            ) {
              return false;
            }
            const configFile = (config as Record<string, unknown>).config_file;
            return (
              typeof configFile === 'string' && configFile.startsWith('agents/')
            );
          })
          .map(([roleName]) => roleName);

        if (managedRoles.length > 0) {
          const multiAgentEnabled =
            features?.multi_agent === true || features?.multi_agent === 'true';
          checks.push({
            name: `${scope}:codex_multi_agent`,
            description: 'Codex multi-agent feature flag',
            status: multiAgentEnabled ? 'pass' : 'warn',
            message: multiAgentEnabled
              ? 'features.multi_agent is enabled for codex managed roles.'
              : 'Codex managed roles detected but features.multi_agent is not true.',
            fix: multiAgentEnabled
              ? undefined
              : 'Set [features] multi_agent = true in .codex/config.toml.',
          });

          const missingRoleFiles: string[] = [];
          for (const roleName of managedRoles) {
            const roleConfig = (agents as Record<string, unknown>)[
              roleName
            ] as Record<string, unknown>;
            const configFile = roleConfig.config_file;
            if (typeof configFile !== 'string') {
              continue;
            }
            const absoluteRolePath = join(scopeRoot, '.codex', configFile);
            if (!(await dependencies.pathExists(absoluteRolePath))) {
              missingRoleFiles.push(configFile);
            }
          }

          checks.push({
            name: `${scope}:codex_role_file_refs`,
            description: 'Codex role config_file references',
            status: missingRoleFiles.length === 0 ? 'pass' : 'warn',
            message:
              missingRoleFiles.length === 0
                ? 'All codex role config_file references exist.'
                : `Missing codex role files: ${missingRoleFiles.join(', ')}`,
            fix:
              missingRoleFiles.length === 0
                ? undefined
                : 'Regenerate codex roles with `oat sync --scope project`.',
          });
        }
      }
    }
  }

  return checks;
}

async function runDoctorCommand(
  context: CommandContext,
  dependencies: DoctorDependencies,
): Promise<void> {
  const checks: DoctorCheck[] = [];

  for (const scope of resolveConcreteScopes(context.scope)) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    const scopeChecks = await runChecksForScope(scope, scopeRoot, dependencies);
    checks.push(...scopeChecks);
  }

  if (context.json) {
    context.logger.json({ scope: context.scope, checks });
  } else {
    context.logger.info(formatDoctorResults(checks));
  }

  const hasFail = checks.some((check) => check.status === 'fail');
  const hasWarn = checks.some((check) => check.status === 'warn');
  process.exitCode = hasFail ? 2 : hasWarn ? 1 : 0;
}

export function createDoctorCommand(
  overrides: Partial<DoctorDependencies> = {},
): Command {
  const dependencies: DoctorDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('doctor')
    .description('Run environment and setup diagnostics')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDoctorCommand(context, dependencies);
    });
}
