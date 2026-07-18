import {
  access,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { compareVersions } from '@commands/init/tools/shared/version';
import {
  createPjmDisabledCheck,
  runPjmDoctorChecks,
  type PjmDoctorOptions,
} from '@commands/pjm/doctor';
import { getSkillVersion } from '@commands/shared/frontmatter';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  walkDispatchMatrix,
  type DispatchMatrixCellRef,
  type DispatchMatrixSource,
} from '@config/dispatch-matrix';
import {
  readOatConfig,
  type OatConfig,
  type OatLocalConfig,
  readOatLocalConfig,
  readUserConfig,
  type UserConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import TOML from '@iarna/toml';
import { loadManifest, type Manifest } from '@manifest/index';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { isOatManagedCodexRoleFile } from '@providers/codex/codec/shared';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { CURSOR_MODEL_PIN_MAPPINGS } from '@providers/cursor/codec/catalog';
import { geminiAdapter } from '@providers/gemini';
import {
  diagnoseCursorMaterializedModels,
  validateMatrixCell,
  type CursorMaterializedModelDiagnostic,
  type MatrixCellAvailability,
  type MatrixCellAvailabilityResponse,
  type ValidateMatrixCellOptions,
} from '@providers/identity/availability';
import {
  createDispatchValidationPassContext,
  validateDispatchMatrixRefs,
} from '@providers/identity/dispatch-validation';
import type { ConcreteScope } from '@shared/types';
import { type DoctorCheck, formatDoctorResults } from '@ui/output';
import { Command } from 'commander';

import { checkStaleInvocations } from './stale-invocations';

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
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  readUserConfig: (userConfigDir: string) => Promise<UserConfig>;
  validateMatrixCell: (
    provider: string,
    value: string,
    options: ValidateMatrixCellOptions,
  ) => Promise<MatrixCellAvailabilityResponse>;
  diagnoseCursorMaterializedModels: (
    ladderModelIds: readonly string[],
    options: ValidateMatrixCellOptions,
  ) => Promise<CursorMaterializedModelDiagnostic[]>;
  createDispatchValidationPassContext: typeof createDispatchValidationPassContext;
  validateDispatchMatrixRefs: typeof validateDispatchMatrixRefs;
  processEnv: NodeJS.ProcessEnv;
  runPjmDoctorChecks: (
    repoRoot: string,
    options?: PjmDoctorOptions,
  ) => Promise<DoctorCheck[]>;
  checkSkillVersions: (
    scopeRoot: string,
    assetsRoot: string,
    pathExists: (path: string) => Promise<boolean>,
  ) => Promise<SkillVersionReport>;
  checkStaleInvocations: (repoRoot: string) => Promise<DoctorCheck>;
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

interface DispatchMatrixCellIssue extends DispatchMatrixCellRef {
  availability: Exclude<MatrixCellAvailability, 'valid'>;
  message?: string;
}

type DispatchMatrixConfigSource = Extract<
  DispatchMatrixSource,
  'user-config' | 'repo-config' | 'local-config'
>;

interface DispatchMatrixConfigLayerEntry {
  source: DispatchMatrixConfigSource;
  config: Pick<OatConfig, 'workflow'>;
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
    readOatConfig,
    readOatLocalConfig,
    readUserConfig,
    validateMatrixCell,
    diagnoseCursorMaterializedModels,
    createDispatchValidationPassContext,
    validateDispatchMatrixRefs,
    processEnv: process.env,
    runPjmDoctorChecks,
    // Default binding remains self-contained, but still honors the caller-
    // provided pathExists dependency from runChecksForScope when available.
    checkSkillVersions: (
      scopeRoot,
      assetsRoot,
      pathExists = pathExistsDefault,
    ) => checkSkillVersionsDefault(scopeRoot, assetsRoot, pathExists),
    checkStaleInvocations,
  };
}

async function createCursorMaterializedModelsCheck(
  scopeRoot: string,
  dependencies: DoctorDependencies,
): Promise<DoctorCheck> {
  const diagnostics = await dependencies.diagnoseCursorMaterializedModels(
    CURSOR_MODEL_PIN_MAPPINGS.map((mapping) => mapping.ladderModelId),
    { cwd: scopeRoot, env: dependencies.processEnv },
  );
  const missing = diagnostics.filter(
    (diagnostic) => diagnostic.availability === 'missing',
  );
  const unvalidated = diagnostics.filter(
    (diagnostic) => diagnostic.availability === 'unvalidated',
  );
  if (missing.length > 0) {
    return {
      name: 'project:cursor_materialized_models',
      description: 'Cursor materialized target catalog availability',
      status: 'warn',
      message:
        `Broad Cursor CLI catalog no longer lists: ${missing.map((entry) => entry.ladderModelId).join(', ')}. ` +
        'This availability check does not verify definition pins or runtime identity.',
      fix: 'Refresh Cursor model mappings and rerun `oat sync --scope project`.',
    };
  }
  if (unvalidated.length > 0) {
    return {
      name: 'project:cursor_materialized_models',
      description: 'Cursor materialized target catalog availability',
      status: 'warn',
      message:
        'Cursor broad CLI catalog could not be checked. Definition pins and runtime identity were not tested.',
    };
  }
  return {
    name: 'project:cursor_materialized_models',
    description: 'Cursor materialized target catalog availability',
    status: 'pass',
    message:
      `All ${diagnostics.length} mapped flat Cursor IDs remain listed in the broad CLI catalog. ` +
      'This does not verify definition pins or runtime identity.',
  };
}

function collectDispatchMatrixCellRefs(
  layers: DispatchMatrixConfigLayerEntry[],
): DispatchMatrixCellRef[] {
  return layers.flatMap(({ source, config }) => {
    const providers = config.workflow?.dispatchCeiling?.providers ?? {};
    return walkDispatchMatrix(providers, {
      source,
      pathPrefix: 'workflow.dispatchCeiling.providers',
    });
  });
}

function dispatchMatrixSourceLabel(source: DispatchMatrixSource): string {
  switch (source) {
    case 'user-config':
      return 'user';
    case 'repo-config':
      return 'shared';
    case 'local-config':
      return 'local';
    case 'project-state':
      return 'project-state';
  }
}

function dispatchMatrixRefValue(ref: DispatchMatrixCellRef): string {
  return ref.value ?? ref.target?.model ?? ref.target?.effort ?? 'unknown';
}

function dispatchMatrixAvailabilityRef(ref: DispatchMatrixCellRef): {
  provider: string;
  value: string;
  target: DispatchMatrixCellRef['target'];
} | null {
  if (ref.value !== null) {
    return { provider: ref.provider, value: ref.value, target: null };
  }
  if (ref.target === null) {
    return null;
  }

  const value = ref.target.model ?? ref.target.effort;
  if (!value) {
    return null;
  }
  return {
    provider: ref.target.harness ?? ref.provider,
    value,
    target: ref.target,
  };
}

function formatDispatchMatrixIssueList(
  issues: DispatchMatrixCellRef[],
): string {
  return issues
    .map((issue) => {
      const suffix =
        'message' in issue && typeof issue.message === 'string'
          ? `; ${issue.message}`
          : '';
      return `${issue.path}=${dispatchMatrixRefValue(issue)} (${dispatchMatrixSourceLabel(issue.source)} config)${suffix}`;
    })
    .join(', ');
}

async function createDispatchMatrixDoctorCheck(
  scopeRoot: string,
  layers: DispatchMatrixConfigLayerEntry[],
  dependencies: DoctorDependencies,
): Promise<DoctorCheck> {
  const refs = collectDispatchMatrixCellRefs(layers).filter(
    (ref) => dispatchMatrixAvailabilityRef(ref) !== null,
  );
  if (refs.length === 0) {
    return {
      name: 'project:dispatch_matrix',
      description: 'Dispatch matrix cell availability',
      status: 'pass',
      message:
        'No configured dispatch matrix cells found in user, shared, or local config layers.',
    };
  }

  const pass = dependencies.createDispatchValidationPassContext({
    cwd: scopeRoot,
    env: dependencies.processEnv,
    validateMatrixCell: dependencies.validateMatrixCell,
  });
  const results = await dependencies.validateDispatchMatrixRefs(refs, pass);

  const issues: DispatchMatrixCellIssue[] = [];
  for (const result of results) {
    if (result.status !== 'valid') {
      issues.push({
        ...result.ref,
        availability: result.status,
        ...(result.diagnostic ? { message: result.diagnostic } : {}),
      });
    }
  }

  if (issues.length === 0) {
    return {
      name: 'project:dispatch_matrix',
      description: 'Dispatch matrix cell availability',
      status: 'pass',
      message: `All configured dispatch matrix cells are available: ${formatDispatchMatrixIssueList(
        refs,
      )}.`,
    };
  }

  const unknown = issues.filter(
    (issue) => issue.availability === 'unknown-value',
  );
  const unvalidated = issues.filter(
    (issue) => issue.availability === 'unvalidated',
  );
  const messageParts: string[] = [];
  if (unknown.length > 0) {
    messageParts.push(
      `Unknown dispatch matrix cells: ${formatDispatchMatrixIssueList(
        unknown,
      )}`,
    );
  }
  if (unvalidated.length > 0) {
    messageParts.push(
      `Unvalidated dispatch matrix cells: ${formatDispatchMatrixIssueList(
        unvalidated,
      )}`,
    );
  }

  const hasUnknown = unknown.length > 0;
  const hasUnvalidated = unvalidated.length > 0;

  return {
    name: 'project:dispatch_matrix',
    description: 'Dispatch matrix cell availability',
    status: hasUnknown || hasUnvalidated ? 'warn' : 'pass',
    message: messageParts.join('. '),
    fix: hasUnknown
      ? 'Run `oat config set workflow.dispatchCeiling.providers.<provider> <value>` with an available value, or refresh provider assets with `oat sync --scope project`.'
      : undefined,
  };
}

function getCodexAgentConfigFile(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null;
  }

  const configFile = (config as Record<string, unknown>).config_file;
  return typeof configFile === 'string' && configFile.startsWith('agents/')
    ? configFile
    : null;
}

function isLikelyOatGeneratedCodexRoleName(roleName: string): boolean {
  return (
    roleName === 'oat-phase-implementer' ||
    roleName === 'oat-reviewer' ||
    roleName.startsWith('oat-phase-implementer-') ||
    roleName.startsWith('oat-reviewer-')
  );
}

async function isManagedCodexRoleConfig(
  scopeRoot: string,
  roleName: string,
  configFile: string,
  dependencies: DoctorDependencies,
): Promise<boolean> {
  const absoluteRolePath = join(scopeRoot, '.codex', configFile);
  if (!(await dependencies.pathExists(absoluteRolePath))) {
    return isLikelyOatGeneratedCodexRoleName(roleName);
  }

  try {
    const roleContent = await dependencies.readFile(absoluteRolePath);
    return isOatManagedCodexRoleFile(roleContent, roleName);
  } catch {
    return false;
  }
}

interface CodexMaxDepthEntry {
  present: boolean;
  value: unknown;
}

function getCodexAgents(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const agents = config.agents;
  return agents && typeof agents === 'object' && !Array.isArray(agents)
    ? (agents as Record<string, unknown>)
    : {};
}

function getCodexMaxDepthEntry(
  config: Record<string, unknown>,
): CodexMaxDepthEntry {
  const agents = getCodexAgents(config);
  return {
    present: Object.prototype.hasOwnProperty.call(agents, 'max_depth'),
    value: agents.max_depth,
  };
}

/**
 * Applies Codex config precedence without letting an invalid project value fall
 * through to the lower-precedence user value.
 */
async function resolveDoctorCodexMaxDepth(
  scope: ConcreteScope,
  parsedConfig: Record<string, unknown>,
  userHome: string,
  dependencies: DoctorDependencies,
): Promise<CodexMaxDepthEntry> {
  const scopedEntry = getCodexMaxDepthEntry(parsedConfig);
  if (scope !== 'project' || scopedEntry.present) {
    return scopedEntry;
  }

  const userConfigPath = join(userHome, '.codex', 'config.toml');
  if (!(await dependencies.pathExists(userConfigPath))) {
    return scopedEntry;
  }

  try {
    return getCodexMaxDepthEntry(
      TOML.parse(await dependencies.readFile(userConfigPath)) as Record<
        string,
        unknown
      >,
    );
  } catch {
    return { present: true, value: null };
  }
}

function createCodexMaxDepthCheck(
  scope: ConcreteScope,
  entry: CodexMaxDepthEntry,
): DoctorCheck {
  const topology = 'root (0) → phase implementer (1)';
  const optionalTopology = 'optional nested child (2)';
  const numericDepth =
    typeof entry.value === 'number' && Number.isFinite(entry.value)
      ? entry.value
      : null;
  const sufficient =
    !entry.present || (numericDepth !== null && numericDepth >= 1);
  let state: string;
  if (!entry.present) {
    state = 'agents.max_depth is missing';
  } else if (numericDepth === null) {
    state = 'agents.max_depth is not a valid number';
  } else {
    state = `agents.max_depth is ${numericDepth}`;
  }

  return {
    name: `${scope}:codex_max_depth`,
    description: 'Codex managed-role phase dispatch depth',
    status: sufficient ? 'pass' : 'warn',
    message: sufficient
      ? numericDepth !== null && numericDepth >= 2
        ? `${state}; sufficient for ${topology} and ${optionalTopology}.`
        : `${state}; sufficient for ${topology}. Depth 2 enables ${optionalTopology} when useful.`
      : `${state}; OAT managed implementation requires ${topology}.`,
    fix: sufficient
      ? undefined
      : `Run \`oat sync --scope ${scope}\`, or materialize a single role with \`oat providers codex materialize <agent-name> --model <model> --effort <effort> --scope ${scope}\`.`,
  };
}

async function runCodexChecksForScope(
  scope: ConcreteScope,
  scopeRoot: string,
  userHome: string,
  dependencies: DoctorDependencies,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const codexConfigPath = join(scopeRoot, '.codex', 'config.toml');
  if (!(await dependencies.pathExists(codexConfigPath))) {
    return checks;
  }

  let parsedConfig: Record<string, unknown>;
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
    return checks;
  }

  const features =
    parsedConfig.features &&
    typeof parsedConfig.features === 'object' &&
    !Array.isArray(parsedConfig.features)
      ? (parsedConfig.features as Record<string, unknown>)
      : null;
  const agents = getCodexAgents(parsedConfig);
  const managedRoles: string[] = [];
  const roleConfigFiles = new Map<string, string>();

  for (const [roleName, roleConfig] of Object.entries(agents)) {
    const configFile = getCodexAgentConfigFile(roleConfig);
    if (!configFile) {
      continue;
    }
    roleConfigFiles.set(roleName, configFile);
    if (
      await isManagedCodexRoleConfig(
        scopeRoot,
        roleName,
        configFile,
        dependencies,
      )
    ) {
      managedRoles.push(roleName);
    }
  }

  if (managedRoles.length === 0) {
    return checks;
  }

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

  checks.push(
    createCodexMaxDepthCheck(
      scope,
      await resolveDoctorCodexMaxDepth(
        scope,
        parsedConfig,
        userHome,
        dependencies,
      ),
    ),
  );

  const missingRoleFiles: string[] = [];
  for (const roleName of managedRoles) {
    const configFile = roleConfigFiles.get(roleName);
    if (!configFile) continue;
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
        : `Regenerate codex roles with \`oat sync --scope ${scope}\`, or materialize a single role with \`oat providers codex materialize <agent-name> --model <model> --effort <effort> --scope ${scope}\`.`,
  });

  return checks;
}

async function runChecksForScope(
  scope: ConcreteScope,
  scopeRoot: string,
  userConfigDir: string,
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

  if (
    scope === 'project' &&
    providers.some(
      (provider) => provider.name === 'cursor' && provider.detected,
    )
  ) {
    checks.push(
      await createCursorMaterializedModelsCheck(scopeRoot, dependencies),
    );
  }

  checks.push(
    ...(await runCodexChecksForScope(
      scope,
      scopeRoot,
      dirname(userConfigDir),
      dependencies,
    )),
  );

  if (scope === 'project') {
    checks.push(await dependencies.checkStaleInvocations(scopeRoot));

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

    const repoReferenceRoot = join(scopeRoot, '.oat', 'repo');
    const [userConfig, config, localConfig] = await Promise.all([
      dependencies.readUserConfig(userConfigDir),
      dependencies.readOatConfig(scopeRoot),
      dependencies.readOatLocalConfig(scopeRoot),
    ]);
    checks.push(
      await createDispatchMatrixDoctorCheck(
        scopeRoot,
        [
          { source: 'user-config', config: userConfig },
          { source: 'repo-config', config },
          { source: 'local-config', config: localConfig },
        ],
        dependencies,
      ),
    );
    const projectManagementEnabled =
      config.tools?.['project-management'] === true;
    if (projectManagementEnabled) {
      checks.push(
        ...(await dependencies.runPjmDoctorChecks(repoReferenceRoot, {
          projectManagementEnabled: true,
        })),
      );
    } else if (await dependencies.pathExists(repoReferenceRoot)) {
      checks.push(createPjmDisabledCheck());
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
    const scopeChecks = await runChecksForScope(
      scope,
      scopeRoot,
      join(context.home, '.oat'),
      dependencies,
    );
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

  return withScopeOption(new Command('doctor'))
    .description('Run environment and setup diagnostics')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDoctorCommand(context, dependencies);
    });
}
