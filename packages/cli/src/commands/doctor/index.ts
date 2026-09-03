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
  resolvePjmAdoption,
  type PjmAdoption,
  type ResolvePjmAdoptionOptions,
} from '@commands/pjm/adoption';
import {
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
  packEvidenceBlock,
  projectRenderablePackEvidence,
  unavailablePackEvidence,
  type PackEvidenceBlockV1,
} from '@commands/tools/shared/format-pack-inventory';
import {
  attributeSharedOwnerDiagnostics,
  hasScopedPackPlacementEvidence,
  inventoryPack,
  type InventoryPackInput,
  type PackInventory,
} from '@commands/tools/shared/pack-inventory';
import { PACK_NAMES } from '@commands/tools/shared/pack-manifest';
import {
  formatPackPaths,
  type PackPathRoots,
  updatePackRecovery,
} from '@commands/tools/shared/pack-paths';
import type { PackName } from '@commands/tools/shared/types';
import {
  walkDispatchMatrix,
  type DispatchMatrixCellRef,
  type DispatchMatrixSource,
} from '@config/dispatch-matrix';
import {
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig,
  type SyncConfig,
} from '@config/index';
import {
  readOatConfig,
  readOatConfigForDefaultScopeRepair,
  type OatConfig,
  type OatLocalConfig,
  readOatLocalConfig,
  readUserConfig,
  type UserConfig,
} from '@config/oat-config';
import { resolveUserSyncConfig } from '@config/user-sync-config';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import TOML from '@iarna/toml';
import { loadManifest, type Manifest } from '@manifest/index';
import { isOatManagedCodexRoleFile } from '@providers/codex/codec/shared';
import { CURSOR_MODEL_PIN_MAPPINGS } from '@providers/cursor/codec/catalog';
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
import {
  getConfigAwareAdapters,
  getProviderRegistrations,
  resolveProviderScopeContext,
  type ProviderAdapter,
  type ProviderScopeContext,
} from '@providers/shared';
import {
  userAgentMaterializationCoverage,
  type UserAgentMaterializationCoverage,
} from '@providers/shared/registry';
import {
  adviseProviderRefresh,
  type ProviderVisibilityEvidence,
} from '@providers/shared/restart-adviser';
import type { ConcreteScope } from '@shared/types';
import { type DoctorCheck, formatDoctorResults } from '@ui/output';
import { Command } from 'commander';

import { checkStaleInvocations } from './stale-invocations';
import { checkSyncedProjects } from './synced-projects';

interface DoctorProviderRefreshAdvice {
  scope: ConcreteScope;
  provider: string;
  contentKind: string;
  visibility: ProviderVisibilityEvidence;
}

function collectProviderRefreshAdvice(
  contexts: ReadonlyMap<ConcreteScope, ProviderScopeContext>,
): DoctorProviderRefreshAdvice[] {
  return [...contexts.entries()].flatMap(([scope, context]) => {
    const active = new Set(context.activeProviders);
    return context.registrations.flatMap((registration) => {
      if (!active.has(registration.adapter.name)) return [];
      return registration.capabilities
        .filter(
          (capability) =>
            capability.scope === scope && capability.support === 'supported',
        )
        .map((capability) => ({
          scope,
          provider: registration.adapter.name,
          contentKind: capability.contentKind,
          visibility: adviseProviderRefresh({
            policy: capability.catalogRefresh,
            materialization: 'unknown',
            observation: {
              state: 'not-reported',
              reference:
                'oat doctor validates managed state but does not query the active provider catalog',
            },
          }),
        }));
    });
  });
}

function formatProviderRefreshAdvice(
  advice: readonly DoctorProviderRefreshAdvice[],
): string | null {
  if (advice.length === 0) return null;
  return [
    'Provider catalog visibility:',
    ...advice.map(
      ({ scope, provider, contentKind, visibility }) =>
        `  [${scope}] ${provider}/${contentKind}: ${visibility.state} (${visibility.policy.state})`,
    ),
  ].join('\n');
}

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
  resolveUserSyncConfig: (userConfigDir: string) => Promise<SyncConfig>;
  loadSyncConfig: (configPath: string) => Promise<SyncConfig>;
  getAdapters: () => ProviderAdapter[];
  getConfigAwareAdapters: (
    adapters: ProviderAdapter[],
    scopeRoot: string,
    config: SyncConfig,
  ) => Promise<{ activeAdapters: ProviderAdapter[] }>;
  resolveProviderScopeContext?: (input: {
    scope: ConcreteScope;
    scopeRoot: string;
    config: SyncConfig;
  }) => Promise<ProviderScopeContext>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  readOatConfigForDefaultScopeRepair: (repoRoot: string) => Promise<OatConfig>;
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
  resolvePjmAdoption: (
    options: ResolvePjmAdoptionOptions,
  ) => Promise<PjmAdoption>;
  inventoryPack: (input: InventoryPackInput) => Promise<PackInventory>;
  checkSkillVersions: (
    scopeRoot: string,
    assetsRoot: string,
    pathExists: (path: string) => Promise<boolean>,
  ) => Promise<SkillVersionReport>;
  checkStaleInvocations: (repoRoot: string) => Promise<DoctorCheck>;
  checkSyncedProjects: (repoRoot: string) => Promise<DoctorCheck[]>;
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
  const adapters = getProviderRegistrations().map(({ adapter }) => adapter);

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
    resolveUserSyncConfig,
    async loadSyncConfig(configPath) {
      return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
    },
    getAdapters: () => getProviderRegistrations().map(({ adapter }) => adapter),
    getConfigAwareAdapters,
    resolveProviderScopeContext,
    readOatConfig,
    readOatConfigForDefaultScopeRepair,
    readOatLocalConfig,
    readUserConfig,
    validateMatrixCell,
    diagnoseCursorMaterializedModels,
    createDispatchValidationPassContext,
    validateDispatchMatrixRefs,
    processEnv: process.env,
    runPjmDoctorChecks,
    resolvePjmAdoption,
    inventoryPack,
    // Default binding remains self-contained, but still honors the caller-
    // provided pathExists dependency from runChecksForScope when available.
    checkSkillVersions: (
      scopeRoot,
      assetsRoot,
      pathExists = pathExistsDefault,
    ) => checkSkillVersionsDefault(scopeRoot, assetsRoot, pathExists),
    checkStaleInvocations,
    checkSyncedProjects,
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

/**
 * Pack diagnostics are reported by kind so that every finding carries one
 * scoped, copy-pasteable recovery command (or explicitly none when the state
 * is owner-owned rather than drifted).
 */
type PackStateFindingCode =
  | 'partial'
  | 'stale'
  | 'newer'
  | 'retained-override'
  | 'legacy-false-conflict'
  | 'duplicate-scope'
  | 'shared-owner-observation'
  | 'user-agent-unmaterialized';

interface PackStateFinding {
  pack: PackName;
  scope: ConcreteScope | null;
  code: PackStateFindingCode;
  detail: string;
  paths: string[];
  recovery: string | null;
}

function collectPackStateFindings(
  inventories: PackInventory[],
): PackStateFinding[] {
  const findings: PackStateFinding[] = [];

  for (const inventory of inventories) {
    for (const scoped of inventory.scopes) {
      const { scope } = scoped;
      if (!hasScopedPackPlacementEvidence(scoped)) {
        continue;
      }

      const managed = scoped.assets.filter(
        (asset) => asset.definition.ownership[scope] === 'managed',
      );
      if (scoped.completeness !== 'complete') {
        const missing = managed.filter(({ status }) => status === 'missing');
        findings.push({
          pack: inventory.pack,
          scope,
          code: 'partial',
          detail:
            scoped.completeness === 'absent'
              ? 'declared intent with no installed managed assets'
              : `missing ${missing.length} of ${managed.length} managed asset(s)`,
          paths: missing.map(({ path }) => path),
          recovery: updatePackRecovery(inventory.pack, scope),
        });
      }

      const stale = scoped.assets.filter(({ status }) => status === 'outdated');
      if (stale.length > 0) {
        findings.push({
          pack: inventory.pack,
          scope,
          code: 'stale',
          detail: `${stale.length} managed asset(s) behind the bundled release`,
          paths: stale.map(({ path }) => path),
          recovery: updatePackRecovery(inventory.pack, scope),
        });
      }

      const newer = scoped.assets.filter(({ status }) => status === 'newer');
      if (newer.length > 0) {
        findings.push({
          pack: inventory.pack,
          scope,
          code: 'newer',
          detail: `${newer.length} installed asset(s) are newer than the bundled release`,
          paths: newer.map(({ path }) => path),
          recovery: null,
        });
      }

      const retained = scoped.assets.filter(
        (asset) =>
          asset.definition.ownership[scope] === 'seed-if-missing' &&
          asset.status === 'present',
      );
      if (retained.length > 0) {
        findings.push({
          pack: inventory.pack,
          scope,
          code: 'retained-override',
          detail: `${retained.length} owner-owned override(s) retained; managed defaults are not applied here`,
          paths: retained.map(({ path }) => path),
          recovery: null,
        });
      }

      for (const diagnostic of scoped.diagnostics) {
        if (diagnostic.code === 'legacy-false-conflict') {
          findings.push({
            pack: inventory.pack,
            scope,
            code: 'legacy-false-conflict',
            detail:
              'legacy false intent with installed managed assets; adopt or remove the install',
            paths: diagnostic.paths,
            recovery: updatePackRecovery(inventory.pack, scope),
          });
          continue;
        }
        if (diagnostic.code === 'user-agent-unmaterialized') {
          // A documented scope limitation rather than drift: `oat tools update`
          // cannot repair it, so no recovery command is offered and the check
          // stays a pass. The message still names every affected agent so the
          // absent capability is not reported as a complete pack.
          findings.push({
            pack: inventory.pack,
            scope,
            code: 'user-agent-unmaterialized',
            detail: `${diagnostic.paths.length} user-scope agent(s) lack native provider-role materialization; canonical instruction reads are unaffected, and active Codex or Cursor materialization supplies only the bundled managed roles, so install this pack at project scope to materialize the affected agents`,
            paths: diagnostic.paths,
            recovery: null,
          });
          continue;
        }
        if (diagnostic.code === 'shared-owner-observation') {
          findings.push({
            pack: inventory.pack,
            scope,
            code: 'shared-owner-observation',
            detail: diagnostic.message,
            paths: diagnostic.paths,
            recovery: null,
          });
        }
      }
    }

    for (const diagnostic of inventory.diagnostics) {
      if (diagnostic.code !== 'duplicate-scope') continue;
      findings.push({
        pack: inventory.pack,
        scope: null,
        code: 'duplicate-scope',
        detail:
          'installed at project and user scope; provider precedence is not inferred',
        paths: diagnostic.paths,
        recovery: `oat tools migrate --pack ${inventory.pack} --from project --to user`,
      });
    }
  }

  return findings;
}

function formatPackFinding(
  finding: PackStateFinding,
  roots: PackPathRoots,
): string {
  const paths = formatPackPaths(finding.paths, roots);
  return paths.length > 0
    ? `${finding.pack} [${finding.code}]: ${finding.detail} (${paths})`
    : `${finding.pack} [${finding.code}]: ${finding.detail}`;
}

function uniqueRecoveries(findings: PackStateFinding[]): string[] {
  return [
    ...new Set(
      findings
        .map(({ recovery }) => recovery)
        .filter((recovery): recovery is string => recovery !== null),
    ),
  ];
}

function createScopedPackStateCheck(
  scope: ConcreteScope,
  findings: PackStateFinding[],
  roots: PackPathRoots,
): DoctorCheck {
  const scoped = findings.filter((finding) => finding.scope === scope);
  if (scoped.length === 0) {
    return {
      name: `${scope}:pack_state`,
      description: 'Managed pack completeness and drift',
      status: 'pass',
      message: 'All installed managed packs are complete and current.',
    };
  }

  const recoveries = uniqueRecoveries(scoped);
  return {
    name: `${scope}:pack_state`,
    description: 'Managed pack completeness and drift',
    status: recoveries.length > 0 ? 'warn' : 'pass',
    message: `Findings:\n${scoped
      .map((finding) => `  - ${formatPackFinding(finding, roots)}`)
      .join('\n')}`,
    fix: recoveries.length > 0 ? recoveries.join('\n  Fix: ') : undefined,
  };
}

function createPackDuplicationCheck(
  findings: PackStateFinding[],
  roots: PackPathRoots,
): DoctorCheck {
  const duplicates = findings.filter(
    (finding) => finding.code === 'duplicate-scope',
  );
  if (duplicates.length === 0) {
    return {
      name: 'packs:scope_duplication',
      description: 'Cross-scope pack duplication',
      status: 'pass',
      message: 'No managed pack is installed at both project and user scope.',
    };
  }

  return {
    name: 'packs:scope_duplication',
    description: 'Cross-scope pack duplication',
    status: 'warn',
    message: `Findings:\n${duplicates
      .map((finding) => `  - ${formatPackFinding(finding, roots)}`)
      .join('\n')}`,
    fix: uniqueRecoveries(duplicates).join('\n  Fix: '),
  };
}

async function createPackStateChecks(
  scopeRoots: Map<ConcreteScope, string>,
  providerContexts: Map<ConcreteScope, ProviderScopeContext>,
  dependencies: DoctorDependencies,
): Promise<{ checks: DoctorCheck[]; evidence: PackEvidenceBlockV1 }> {
  if (scopeRoots.size === 0) {
    return { checks: [], evidence: packEvidenceBlock([]) };
  }

  const roots: PackPathRoots = {
    ...(scopeRoots.has('project')
      ? { projectRoot: scopeRoots.get('project')! }
      : {}),
    ...(scopeRoots.has('user') ? { userRoot: scopeRoots.get('user')! } : {}),
  };

  let findings: PackStateFinding[];
  let inventories: PackInventory[];
  try {
    const assetsRoot = await dependencies.resolveAssetsRoot();
    const userRoot = scopeRoots.get('user');
    const userAgentCoverage: UserAgentMaterializationCoverage = userRoot
      ? await (async () => {
          const config = await dependencies.resolveUserSyncConfig(
            join(userRoot, '.oat'),
          );
          const providerContext = providerContexts.get('user') ?? null;
          const activeAdapters = providerContext
            ? providerContext.registrations
                .filter(({ adapter }) =>
                  providerContext.activeProviders.includes(adapter.name),
                )
                .map(({ adapter }) => adapter)
            : await dependencies
                .getConfigAwareAdapters(
                  dependencies.getAdapters(),
                  userRoot,
                  config,
                )
                .then(
                  ({ activeAdapters: resolvedAdapters }) => resolvedAdapters,
                );
          const activeProviders = activeAdapters.map(({ name }) => name);
          const knownRegistrations = getProviderRegistrations().filter(
            ({ adapter }) => activeProviders.includes(adapter.name),
          );
          let coverage = userAgentMaterializationCoverage({
            registrations: providerContext?.registrations ?? knownRegistrations,
            activeProviders,
          });
          if (coverage !== 'all') {
            const mappings = activeAdapters.flatMap(({ userMappings }) =>
              userMappings.filter(({ contentType }) => contentType === 'agent'),
            );
            if (mappings.some(({ nativeRead }) => !nativeRead)) {
              coverage = 'all';
            } else if (mappings.length > 0 && coverage === 'none') {
              coverage = 'bundled';
            }
          }
          return coverage;
        })()
      : 'none';
    inventories = attributeSharedOwnerDiagnostics(
      await Promise.all(
        PACK_NAMES.map((pack) =>
          dependencies.inventoryPack({
            pack,
            assetsRoot,
            ...roots,
            ...(userRoot
              ? {
                  userManagedRoleMaterialization: userAgentCoverage !== 'none',
                }
              : {}),
          }),
        ),
      ),
    );
    if (userAgentCoverage === 'all') {
      inventories = inventories.map((inventory) => ({
        ...inventory,
        scopes: inventory.scopes.map((scoped) =>
          scoped.scope === 'user'
            ? {
                ...scoped,
                diagnostics: scoped.diagnostics.filter(
                  ({ code }) => code !== 'user-agent-unmaterialized',
                ),
              }
            : scoped,
        ),
        diagnostics: inventory.diagnostics.filter(
          ({ code }) => code !== 'user-agent-unmaterialized',
        ),
      }));
    }
    findings = collectPackStateFindings(inventories);
  } catch (error) {
    const detail =
      error instanceof Error
        ? `Unable to inventory managed packs: ${error.message}`
        : 'Unable to inventory managed packs.';
    const evidence = packEvidenceBlock(
      PACK_NAMES.map((pack) =>
        unavailablePackEvidence({
          pack,
          scopes: [...scopeRoots.keys()],
          reason: detail,
          roots,
        }),
      ),
    );
    return {
      checks: [
        {
          name: 'packs:inventory',
          description: 'Managed pack inventory availability',
          status: 'warn',
          message: evidence.diagnostics[0]?.detail ?? detail,
          fix: 'Run `pnpm build` and rerun `oat doctor`.',
        },
      ],
      evidence,
    };
  }

  const checks: DoctorCheck[] = [];
  for (const scope of scopeRoots.keys()) {
    checks.push(createScopedPackStateCheck(scope, findings, roots));
  }
  if (scopeRoots.has('project') && scopeRoots.has('user')) {
    checks.push(createPackDuplicationCheck(findings, roots));
  }
  return {
    checks,
    evidence: packEvidenceBlock(
      inventories.map((canonical) =>
        projectRenderablePackEvidence(canonical, roots),
      ),
    ),
  };
}

function createScopeUnavailableCheck(
  scope: ConcreteScope,
  error: unknown,
): DoctorCheck {
  const reason = error instanceof Error ? `: ${error.message}` : '.';
  return {
    name: `${scope}:scope_availability`,
    description: `${scope === 'project' ? 'Project' : 'User'} scope availability`,
    status: 'warn',
    message: `${scope === 'project' ? 'Project' : 'User'} scope is unavailable${reason}`,
    fix: `Run \`oat doctor --scope ${scope === 'project' ? 'user' : 'project'}\`, or rerun inside a directory where ${scope} scope resolves.`,
  };
}

async function runChecksForScope(
  scope: ConcreteScope,
  scopeRoot: string,
  userConfigDir: string,
  dependencies: DoctorDependencies,
  providerContext?: ProviderScopeContext,
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

  const providers = providerContext
    ? await Promise.all(
        providerContext.registrations.map(async ({ adapter }) => ({
          name: adapter.name,
          detected: providerContext.detectedProviders.includes(adapter.name),
          version: adapter.detectVersion ? await adapter.detectVersion() : null,
        })),
      )
    : await dependencies.checkProviders(scopeRoot);
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
    checks.push(...(await dependencies.checkSyncedProjects(scopeRoot)));

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
    const [userConfig, configResult, localConfig] = await Promise.all([
      dependencies.readUserConfig(userConfigDir),
      dependencies.readOatConfig(scopeRoot).then(
        (config) => ({ config }),
        async (error: unknown) => {
          if (
            !(error instanceof Error) ||
            !error.message.startsWith('Invalid projects.defaultScope in ')
          ) {
            throw error;
          }
          return {
            config:
              await dependencies.readOatConfigForDefaultScopeRepair(scopeRoot),
            defaultScopeError: error.message,
          };
        },
      ),
      dependencies.readOatLocalConfig(scopeRoot),
    ]);
    if ('defaultScopeError' in configResult) {
      checks.push({
        name: 'project:projects_default_scope',
        description: 'Project creation default scope',
        status: 'fail',
        message: configResult.defaultScopeError,
        fix: 'Run `oat config set projects.defaultScope <shared|local|synced>`.',
      });
    }
    const config = configResult.config;
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
    // PJM capability now normally lives at user scope, so repository pack
    // intent is no longer evidence of repository adoption. Adoption state is
    // authoritative and already covers every case where a PJM canonical file
    // exists (`partial-initialization` is returned whenever any is present), so
    // the presence of `.oat/repo` adds nothing. Keying off it as well would fire
    // only when `.oat/repo` exists with zero PJM canonical files — a repository
    // that uses `.oat/repo` for non-PJM content such as `oat index` knowledge,
    // and deliberately declined PJM. That is a false positive, and it made
    // `oat doctor` disagree with `oat status`'s `shouldReportPjmAdoption`.
    const adoption = await dependencies.resolvePjmAdoption({
      projectRoot: scopeRoot,
      repoRoot: repoReferenceRoot,
      config,
    });
    if (adoption.state !== 'none') {
      checks.push(
        ...(await dependencies.runPjmDoctorChecks(repoReferenceRoot, {
          projectRoot: scopeRoot,
          adoption,
        })),
      );
    }
  }

  return checks;
}

async function runDoctorCommand(
  context: CommandContext,
  dependencies: DoctorDependencies,
): Promise<void> {
  const checks: DoctorCheck[] = [];
  const scopes = resolveConcreteScopes(context.scope);
  const scopeRoots = new Map<ConcreteScope, string>();
  const providerContexts = new Map<ConcreteScope, ProviderScopeContext>();

  for (const scope of scopes) {
    let scopeRoot: string;
    try {
      scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    } catch (error) {
      // `--scope all` outside a Git repository still completes user-scope
      // diagnostics; an explicitly requested scope stays a hard failure.
      if (scope === 'project' && scopes.includes('user')) {
        checks.push(createScopeUnavailableCheck(scope, error));
        continue;
      }
      throw error;
    }
    scopeRoots.set(scope, scopeRoot);
    const providerContext = dependencies.resolveProviderScopeContext
      ? await dependencies.resolveProviderScopeContext({
          scope,
          scopeRoot,
          config:
            scope === 'user'
              ? await dependencies.resolveUserSyncConfig(
                  join(context.home, '.oat'),
                )
              : await dependencies.loadSyncConfig(
                  join(scopeRoot, '.oat', 'sync', 'config.json'),
                ),
        })
      : undefined;
    if (providerContext) providerContexts.set(scope, providerContext);
    const scopeChecks = await runChecksForScope(
      scope,
      scopeRoot,
      join(context.home, '.oat'),
      dependencies,
      providerContext,
    );
    checks.push(...scopeChecks);
  }

  const packState = await createPackStateChecks(
    scopeRoots,
    providerContexts,
    dependencies,
  );
  checks.push(...packState.checks);
  const providerRefreshAdvice = collectProviderRefreshAdvice(providerContexts);

  if (context.json) {
    context.logger.json({
      scope: context.scope,
      checks,
      packEvidence: packState.evidence,
      providerRefreshAdvice,
    });
  } else {
    context.logger.info(formatDoctorResults(checks));
    const providerSummary = formatProviderRefreshAdvice(providerRefreshAdvice);
    if (providerSummary) context.logger.info(providerSummary);
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
  if (
    overrides.resolveProviderScopeContext === undefined &&
    (overrides.getAdapters !== undefined ||
      overrides.getConfigAwareAdapters !== undefined ||
      overrides.checkProviders !== undefined)
  ) {
    dependencies.resolveProviderScopeContext = undefined;
  }

  return withScopeOption(new Command('doctor'))
    .description('Run environment and setup diagnostics')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDoctorCommand(context, dependencies);
    });
}
