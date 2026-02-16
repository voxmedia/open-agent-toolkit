import { access, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { loadManifest, type Manifest } from '@manifest/index';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { cursorAdapter } from '@providers/cursor';
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
  const adapters = [claudeAdapter, cursorAdapter, codexAdapter];

  return Promise.all(
    adapters.map(async (adapter) => ({
      name: adapter.name,
      detected: await adapter.detect(scopeRoot),
      version: adapter.detectVersion ? await adapter.detectVersion() : null,
    })),
  );
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

  if (scope === 'project') {
    const codexAgentsPath = join(scopeRoot, '.codex', 'agents');
    const codexAgentsPathOk = await dependencies.pathExists(codexAgentsPath);
    checks.push({
      name: `${scope}:codex_agents_path`,
      description: 'Codex agent path availability',
      status: codexAgentsPathOk ? 'pass' : 'warn',
      message: codexAgentsPathOk
        ? 'Codex agents path is available.'
        : 'Codex agents path is not available.',
      fix: codexAgentsPathOk
        ? undefined
        : 'Ensure `.codex/agents` exists and run `oat sync --apply` to refresh provider views.',
    });
  }

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
        : 'Run `oat sync --apply` or `oat init` to create manifest.',
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
