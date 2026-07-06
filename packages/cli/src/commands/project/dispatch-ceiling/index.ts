import { access, readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  compileDispatchPolicyPreset,
  type DispatchPolicyCompileResult,
} from '@config/dispatch-ceiling-preset';
import {
  resolveActiveProject,
  VALID_CLAUDE_DISPATCH_CEILINGS,
  VALID_CODEX_DISPATCH_CEILINGS,
  VALID_MANAGED_DISPATCH_POLICIES,
  type ActiveProjectResolution,
  type WorkflowCodexDispatchCeiling,
  type WorkflowClaudeDispatchCeiling,
  type WorkflowDispatchPolicyMode,
  type WorkflowManagedDispatchPolicy,
} from '@config/oat-config';
import {
  resolveEffectiveConfig,
  type ResolvedConfig,
  type ResolvedConfigSource,
} from '@config/resolve';
import { resolveProjectRoot } from '@fs/paths';
import TOML from '@iarna/toml';
import {
  getCeilingAdapter,
  type CeilingDispatchArgs,
  type CeilingRole,
  type EnforcementMechanism,
} from '@providers/ceiling/registry';
import { Command } from 'commander';
import YAML from 'yaml';

// Provider-neutral: accept arbitrary provider names. Codex/Claude get concrete
// enforcement; every other provider routes through the fallback advisory adapter
// (mode: unsupported) rather than erroring. Typed concrete-value validation is
// applied only for the providers that have a value enum.
type DispatchCeilingProvider = 'codex' | 'claude' | (string & {});
type DispatchCeilingValue =
  | WorkflowCodexDispatchCeiling
  | WorkflowClaudeDispatchCeiling;
type DispatchCeilingSource =
  | 'local-config'
  | 'repo-config'
  | 'user-config'
  | 'env'
  | 'project-state';

type DispatchCeilingMode = 'enforced' | 'advisory' | 'unsupported';

interface ProviderResolution {
  value: DispatchCeilingValue | null;
  mode: DispatchCeilingMode;
  mechanism: EnforcementMechanism;
  dispatchArgs: CeilingDispatchArgs;
  verifyOnDispatch: boolean;
  selection: DispatchSelection;
}

interface DispatchCeilingDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  readFile: (path: string) => Promise<string>;
  pathExists: (path: string) => Promise<boolean>;
  processEnv: NodeJS.ProcessEnv;
}

interface DispatchCeilingResolveOptions {
  provider?: string;
  role?: string;
  orchestratorTier?: string;
  preferred?: string;
  projectPath?: string;
  preflight?: boolean;
  nonInteractive?: boolean;
  json?: boolean;
}

interface DispatchCeilingResolution {
  status: 'resolved' | 'unresolved' | 'blocked';
  provider: DispatchCeilingProvider;
  value: DispatchCeilingValue | null;
  policyMode: WorkflowDispatchPolicyMode | null;
  policy: WorkflowManagedDispatchPolicy | 'legacy-ceiling' | null;
  source: DispatchCeilingSource | null;
  preset: string | null;
  unresolved: boolean;
  projectPath: string | null;
  providerDefaultEffort: string;
  providers: Record<string, ProviderResolution>;
  message?: string;
}

const CODEX_VALUES: readonly WorkflowCodexDispatchCeiling[] = [
  ...VALID_CODEX_DISPATCH_CEILINGS,
];

const CLAUDE_VALUES: readonly WorkflowClaudeDispatchCeiling[] = [
  ...VALID_CLAUDE_DISPATCH_CEILINGS,
];

type DispatchSelectionMode =
  | 'capped'
  | 'uncapped'
  | 'review-target'
  | 'inherit-default'
  | 'unresolved';

interface DispatchSelection {
  role: CeilingRole;
  preferredValue: DispatchCeilingValue | null;
  selectedValue: DispatchCeilingValue | null;
  capped: boolean;
  selectionMode: DispatchSelectionMode;
  policyMode: WorkflowDispatchPolicyMode | null;
  policy: WorkflowManagedDispatchPolicy | 'legacy-ceiling' | null;
}

const DEFAULT_DEPENDENCIES: DispatchCeilingDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveEffectiveConfig,
  resolveActiveProject,
  readFile: async (path: string) => readFile(path, 'utf8'),
  pathExists: async (path: string) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  processEnv: process.env,
};

function normalizeProvider(value: string | undefined): DispatchCeilingProvider {
  // Provider-neutral: accept any provider name. Unknown providers do not throw;
  // they resolve through the fallback advisory adapter as `mode: unsupported`.
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error('Provider is required.');
  }
  return normalized;
}

function isValidProviderValue(
  provider: DispatchCeilingProvider,
  value: unknown,
): value is DispatchCeilingValue {
  // Typed concrete-value validation only applies to providers with a value
  // enum. Unknown providers have no concrete ceiling value (always advisory).
  if (provider === 'codex') {
    return (
      typeof value === 'string' &&
      CODEX_VALUES.includes(value as WorkflowCodexDispatchCeiling)
    );
  }
  if (provider === 'claude') {
    return (
      typeof value === 'string' &&
      CLAUDE_VALUES.includes(value as WorkflowClaudeDispatchCeiling)
    );
  }
  return false;
}

function configSourceToCeilingSource(
  source: ResolvedConfigSource,
): DispatchCeilingSource | null {
  if (source === 'local') {
    return 'local-config';
  }
  if (source === 'shared') {
    return 'repo-config';
  }
  if (source === 'user') {
    return 'user-config';
  }
  if (source === 'env') {
    return 'env';
  }
  return null;
}

function sourceLabel(source: DispatchCeilingSource | null): string {
  switch (source) {
    case 'local-config':
      return 'local config';
    case 'repo-config':
      return 'repo config';
    case 'user-config':
      return 'user config';
    case 'env':
      return 'environment';
    case 'project-state':
      return 'project state';
    default:
      return 'none';
  }
}

function providerLabel(provider: DispatchCeilingProvider): string {
  if (provider === 'codex') {
    return 'Codex';
  }
  if (provider === 'claude') {
    return 'Claude';
  }
  // Unknown providers: title-case the raw name for human-readable output.
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function resolveTargetProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  return isAbsolute(projectPath) ? projectPath : join(repoRoot, projectPath);
}

interface ResolvedDispatchPolicy {
  mode: WorkflowDispatchPolicyMode;
  policy: WorkflowManagedDispatchPolicy | 'legacy-ceiling' | null;
  value: DispatchCeilingValue | null;
  source: DispatchCeilingSource;
  preset: string | null;
}

function isValidManagedPolicy(
  value: unknown,
): value is WorkflowManagedDispatchPolicy {
  return (
    typeof value === 'string' &&
    VALID_MANAGED_DISPATCH_POLICIES.includes(
      value as WorkflowManagedDispatchPolicy,
    )
  );
}

function validManagedPolicyList(): string {
  return VALID_MANAGED_DISPATCH_POLICIES.join(', ');
}

function validProviderValueList(provider: DispatchCeilingProvider): string {
  return providerValueOrder(provider)?.join(', ') ?? 'none';
}

function compiledPolicyValueForProvider(
  provider: DispatchCeilingProvider,
  compiled: DispatchPolicyCompileResult,
): DispatchCeilingValue | null {
  if (!('providers' in compiled)) {
    return null;
  }

  const value = compiled.providers[provider as keyof typeof compiled.providers];
  return isValidProviderValue(provider, value) ? value : null;
}

function invalidProjectPolicyMessage(value: unknown): string {
  const actual = typeof value === 'string' ? value : String(value);
  return `Invalid project dispatch policy "${actual}". Valid managed policies: ${validManagedPolicyList()}. Use mode "inherit" for host defaults.`;
}

function readProjectDispatchPolicy(
  provider: DispatchCeilingProvider,
  content: string,
): ResolvedDispatchPolicy | null {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }

  const parsed: unknown = YAML.parse(frontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const policy = (parsed as Record<string, unknown>)['oat_dispatch_policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return null;
  }

  const policyRecord = policy as Record<string, unknown>;
  const mode = policyRecord['mode'];
  if (mode === 'inherit') {
    return {
      mode,
      policy: null,
      value: null,
      source: 'project-state',
      preset: null,
    };
  }

  if (mode !== 'managed') {
    const actual = typeof mode === 'string' ? mode : String(mode);
    throw new Error(
      `Invalid project dispatch policy mode "${actual}". Valid modes: managed, inherit.`,
    );
  }

  const policyValue = policyRecord['policy'];
  if (!isValidManagedPolicy(policyValue)) {
    throw new Error(invalidProjectPolicyMessage(policyValue));
  }

  const compiled = compileDispatchPolicyPreset(policyValue);
  if (policyValue === 'uncapped') {
    return {
      mode,
      policy: policyValue,
      value: null,
      source: 'project-state',
      preset: policyValue,
    };
  }

  const providers = policyRecord['providers'];
  const explicitValue =
    providers && typeof providers === 'object' && !Array.isArray(providers)
      ? (providers as Record<string, unknown>)[provider]
      : null;
  const providerOrder = providerValueOrder(provider);
  if (
    providerOrder &&
    explicitValue !== null &&
    explicitValue !== undefined &&
    !isValidProviderValue(provider, explicitValue)
  ) {
    throw new Error(
      `Invalid project dispatch policy provider value "${String(explicitValue)}" for ${provider}. Valid values: ${validProviderValueList(provider)}.`,
    );
  }
  const value = isValidProviderValue(provider, explicitValue)
    ? explicitValue
    : compiledPolicyValueForProvider(provider, compiled);

  return {
    mode,
    policy: policyValue,
    value,
    source: 'project-state',
    preset: policyValue,
  };
}

function readLegacyProjectDispatchCeiling(
  provider: DispatchCeilingProvider,
  parsed: Record<string, unknown>,
): ResolvedDispatchPolicy | null {
  const ceiling = parsed['oat_dispatch_ceiling'];
  if (!ceiling || typeof ceiling !== 'object' || Array.isArray(ceiling)) {
    return null;
  }

  const ceilingRecord = ceiling as Record<string, unknown>;
  // Clean break: read concrete per-provider values only. The preset label is
  // provenance and is never used to drive dispatch.
  const providers = ceilingRecord['providers'];
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) {
    return null;
  }

  const value = (providers as Record<string, unknown>)[provider];
  if (!isValidProviderValue(provider, value)) {
    return null;
  }

  const presetValue = ceilingRecord['preset'];
  return {
    mode: 'managed',
    policy: 'legacy-ceiling',
    value,
    source: 'project-state',
    preset: typeof presetValue === 'string' ? presetValue : null,
  };
}

function readProjectDispatchCeiling(
  provider: DispatchCeilingProvider,
  content: string,
): ResolvedDispatchPolicy | null {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }

  const parsed: unknown = YAML.parse(frontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return (
    readProjectDispatchPolicy(provider, content) ??
    readLegacyProjectDispatchCeiling(
      provider,
      parsed as Record<string, unknown>,
    )
  );
}

async function resolveProjectStateCeiling(
  provider: DispatchCeilingProvider,
  projectPath: string | null,
  dependencies: DispatchCeilingDependencies,
): Promise<ResolvedDispatchPolicy | null> {
  if (!projectPath) {
    return null;
  }

  let content: string;
  try {
    content = await dependencies.readFile(join(projectPath, 'state.md'));
  } catch {
    return null;
  }

  return readProjectDispatchCeiling(provider, content);
}

async function resolveProjectPath(
  repoRoot: string,
  dependencies: DispatchCeilingDependencies,
  options: DispatchCeilingResolveOptions,
): Promise<string | null> {
  if (options.projectPath) {
    return resolveTargetProjectPath(repoRoot, options.projectPath);
  }

  const activeProject = await dependencies.resolveActiveProject(repoRoot);
  if (activeProject.status !== 'active' || !activeProject.path) {
    return null;
  }
  return join(repoRoot, activeProject.path);
}

function readResolvedConfigCeiling(
  provider: DispatchCeilingProvider,
  resolvedConfig: ResolvedConfig,
): ResolvedDispatchPolicy | null {
  const modeEntry = resolvedConfig.resolved['workflow.dispatchPolicy.mode'];
  const policyEntry = resolvedConfig.resolved['workflow.dispatchPolicy.policy'];
  const modeSource = modeEntry
    ? configSourceToCeilingSource(modeEntry.source)
    : null;
  const policySource = policyEntry
    ? configSourceToCeilingSource(policyEntry.source)
    : null;

  if (
    modeEntry?.value === 'inherit' &&
    modeSource !== null &&
    modeEntry.source !== 'default'
  ) {
    return {
      mode: 'inherit',
      policy: null,
      value: null,
      source: modeSource,
      preset: null,
    };
  }

  if (
    modeEntry?.value === 'managed' &&
    isValidManagedPolicy(policyEntry?.value) &&
    policySource !== null &&
    policyEntry?.source !== 'default'
  ) {
    const policy = policyEntry.value;
    const compiled = compileDispatchPolicyPreset(policy);
    return {
      mode: 'managed',
      policy,
      value: compiledPolicyValueForProvider(provider, compiled),
      source: policySource,
      preset: policy,
    };
  }

  // Read the concrete per-provider value from the nested key. The flat
  // `workflow.dispatchCeiling.<provider>` shape was removed in p01; never read
  // the preset label for dispatch.
  const entry =
    resolvedConfig.resolved[`workflow.dispatchCeiling.providers.${provider}`];
  const source = entry ? configSourceToCeilingSource(entry.source) : null;
  if (
    !entry ||
    !source ||
    entry.source === 'default' ||
    !isValidProviderValue(provider, entry.value)
  ) {
    return null;
  }

  return {
    mode: 'managed',
    policy: 'legacy-ceiling',
    value: entry.value,
    source,
    preset: null,
  };
}

function normalizeRole(value: string | undefined): CeilingRole {
  return value === 'reviewer' ? 'reviewer' : 'implementer';
}

function providerValueOrder(
  provider: DispatchCeilingProvider,
): readonly DispatchCeilingValue[] | null {
  if (provider === 'codex') {
    return CODEX_VALUES;
  }
  if (provider === 'claude') {
    return CLAUDE_VALUES;
  }
  return null;
}

function normalizePreferredValue(
  provider: DispatchCeilingProvider,
  value: string | undefined,
): DispatchCeilingValue | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const order = providerValueOrder(provider);
  if (!order) {
    return null;
  }

  if (!isValidProviderValue(provider, normalized)) {
    const validValues = order.join(', ');
    throw new Error(
      `Invalid preferred dispatch value "${normalized}" for ${provider}. Valid values: ${validValues}.`,
    );
  }

  return normalized;
}

function selectDispatchValue(
  provider: DispatchCeilingProvider,
  role: CeilingRole,
  policy: ResolvedDispatchPolicy,
  preferredValue: DispatchCeilingValue | null,
): DispatchSelection {
  const baseSelection = {
    role,
    policyMode: policy.mode,
    policy: policy.policy,
  };

  if (policy.mode === 'inherit') {
    return {
      ...baseSelection,
      preferredValue: null,
      selectedValue: null,
      capped: false,
      selectionMode: 'inherit-default',
    };
  }

  if (policy.policy === 'uncapped') {
    return {
      ...baseSelection,
      preferredValue: role === 'reviewer' ? null : preferredValue,
      selectedValue: role === 'reviewer' ? null : preferredValue,
      capped: false,
      selectionMode: role === 'reviewer' ? 'review-target' : 'uncapped',
    };
  }

  if (policy.value === null) {
    return {
      ...baseSelection,
      preferredValue: null,
      selectedValue: null,
      capped: false,
      selectionMode: 'capped',
    };
  }

  if (role === 'reviewer' || preferredValue === null) {
    return {
      ...baseSelection,
      preferredValue,
      selectedValue: policy.value,
      capped: false,
      selectionMode: role === 'reviewer' ? 'review-target' : 'capped',
    };
  }

  const order = providerValueOrder(provider);
  const preferredIndex = order?.indexOf(preferredValue) ?? -1;
  const ceilingIndex = order?.indexOf(policy.value) ?? -1;
  if (!order || preferredIndex < 0 || ceilingIndex < 0) {
    return {
      ...baseSelection,
      preferredValue,
      selectedValue: policy.value,
      capped: false,
      selectionMode: 'capped',
    };
  }

  const selectedIndex = Math.min(preferredIndex, ceilingIndex);
  return {
    ...baseSelection,
    preferredValue,
    selectedValue: order[selectedIndex]!,
    capped: preferredIndex > ceilingIndex,
    selectionMode: 'capped',
  };
}

/**
 * Join a resolved ceiling value with the active provider's adapter to compute
 * the enforcement mode, mechanism, dispatch args, and verify-on-upgrade flag.
 * Mode is computed here at call time — it is never read from persisted state.
 */
function buildProviderResolution(
  provider: DispatchCeilingProvider,
  policy: ResolvedDispatchPolicy | null,
  role: CeilingRole,
  orchestratorTier: string | undefined,
  preferredValue: DispatchCeilingValue | null,
): ProviderResolution {
  const adapter = getCeilingAdapter(provider);

  if (policy === null) {
    return {
      value: null,
      mode: adapter.supportsCeiling ? 'advisory' : 'unsupported',
      mechanism: adapter.mechanism,
      dispatchArgs: null,
      verifyOnDispatch: false,
      selection: {
        role,
        preferredValue,
        selectedValue: null,
        capped: false,
        selectionMode: 'unresolved',
        policyMode: null,
        policy: null,
      },
    };
  }

  const selection = selectDispatchValue(provider, role, policy, preferredValue);
  const dispatchValue = selection.selectedValue;
  const dispatchArgs = dispatchValue
    ? adapter.compileToDispatchArgs(dispatchValue, role, {
        orchestratorTier,
      })
    : null;

  let mode: DispatchCeilingMode;
  if (!adapter.supportsCeiling) {
    mode = 'unsupported';
  } else if (dispatchArgs) {
    mode = 'enforced';
  } else {
    mode = 'advisory';
  }

  return {
    value: policy.value,
    mode,
    mechanism: adapter.mechanism,
    dispatchArgs,
    verifyOnDispatch: dispatchValue
      ? adapter.verifyOnDispatch(dispatchValue, {
          orchestratorTier,
        })
      : false,
    selection,
  };
}

function readCodexDefaultFromToml(content: string): string | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = TOML.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }

  const value = parsed['model_reasoning_effort'];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function resolveCodexProviderDefaultEffort(
  repoRoot: string,
  context: CommandContext,
  dependencies: DispatchCeilingDependencies,
): Promise<string> {
  const candidates = [
    join(repoRoot, '.codex', 'config.toml'),
    join(context.home, '.codex', 'config.toml'),
  ];

  for (const candidate of candidates) {
    if (!(await dependencies.pathExists(candidate))) {
      continue;
    }
    const value = readCodexDefaultFromToml(
      await dependencies.readFile(candidate),
    );
    if (value) {
      return value;
    }
  }

  return 'unknown';
}

function blockMessage(provider: DispatchCeilingProvider): string {
  const label = providerLabel(provider);
  return `BLOCKED: ${label} dispatch policy is unresolved in non-interactive mode.\nSet workflow.dispatchPolicy.mode/workflow.dispatchPolicy.policy, workflow.dispatchCeiling.providers.${provider}, oat_dispatch_policy, or legacy oat_dispatch_ceiling.`;
}

function isNonInteractiveEnv(env: NodeJS.ProcessEnv): boolean {
  return env['OAT_NON_INTERACTIVE'] === '1';
}

async function resolveDispatchCeiling(
  context: CommandContext,
  dependencies: DispatchCeilingDependencies,
  options: DispatchCeilingResolveOptions,
): Promise<DispatchCeilingResolution> {
  const provider = normalizeProvider(options.provider);
  const role = normalizeRole(options.role);
  const orchestratorTier = options.orchestratorTier;
  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const userConfigDir = join(context.home, '.oat');
  const [resolvedConfig, projectPath] = await Promise.all([
    dependencies.resolveEffectiveConfig(
      repoRoot,
      userConfigDir,
      dependencies.processEnv,
    ),
    resolveProjectPath(repoRoot, dependencies, options),
  ]);

  const providerDefaultEffort =
    provider === 'codex'
      ? await resolveCodexProviderDefaultEffort(repoRoot, context, dependencies)
      : 'not-applicable';
  const preferredValue = normalizePreferredValue(provider, options.preferred);

  const resolvedValue = await resolveCeilingValue(
    provider,
    resolvedConfig,
    projectPath,
    dependencies,
  );

  const providerResolution = buildProviderResolution(
    provider,
    resolvedValue,
    role,
    orchestratorTier,
    preferredValue,
  );
  const providers: Record<string, ProviderResolution> = {
    [provider]: providerResolution,
  };

  if (resolvedValue) {
    return {
      status: 'resolved',
      provider,
      value: resolvedValue.value,
      policyMode: resolvedValue.mode,
      policy: resolvedValue.policy,
      source: resolvedValue.source,
      preset: resolvedValue.preset,
      unresolved: false,
      projectPath,
      providerDefaultEffort,
      providers,
    };
  }

  const shouldBlock =
    options.nonInteractive === true ||
    isNonInteractiveEnv(dependencies.processEnv) ||
    (options.preflight === true && !context.interactive && !context.json);
  const message = shouldBlock ? blockMessage(provider) : undefined;
  return {
    status: shouldBlock ? 'blocked' : 'unresolved',
    provider,
    value: null,
    policyMode: null,
    policy: null,
    source: null,
    preset: null,
    unresolved: true,
    projectPath,
    providerDefaultEffort,
    providers,
    message,
  };
}

interface ResolvedCeilingValue {
  mode: WorkflowDispatchPolicyMode;
  policy: WorkflowManagedDispatchPolicy | 'legacy-ceiling' | null;
  value: DispatchCeilingValue | null;
  source: DispatchCeilingSource;
  preset: string | null;
}

/**
 * Resolve the concrete per-provider ceiling value, applying config precedence
 * (local > shared > user, via `resolveEffectiveConfig`) before project state.
 * Never reads the preset label for dispatch — the preset is surfaced as
 * provenance only.
 */
async function resolveCeilingValue(
  provider: DispatchCeilingProvider,
  resolvedConfig: ResolvedConfig,
  projectPath: string | null,
  dependencies: DispatchCeilingDependencies,
): Promise<ResolvedCeilingValue | null> {
  const configCeiling = readResolvedConfigCeiling(provider, resolvedConfig);
  if (configCeiling) {
    return configCeiling;
  }

  const projectCeiling = await resolveProjectStateCeiling(
    provider,
    projectPath,
    dependencies,
  );
  if (projectCeiling) {
    return projectCeiling;
  }

  return null;
}

function policyLabel(
  policy: WorkflowManagedDispatchPolicy | 'legacy-ceiling' | null,
): string {
  if (policy === 'legacy-ceiling') {
    return 'legacy capped';
  }
  return policy ?? 'inherit host defaults';
}

function writeHumanResolution(
  context: CommandContext,
  resolution: DispatchCeilingResolution,
): void {
  const label = providerLabel(resolution.provider);
  if (resolution.status === 'blocked' && resolution.message) {
    context.logger.error(resolution.message);
    return;
  }

  context.logger.info(
    `${label} dispatch policy: ${policyLabel(resolution.policy)}`,
  );
  context.logger.info(`Resolved cap: ${resolution.value ?? 'none'}`);
  context.logger.info(`Source: ${sourceLabel(resolution.source)}`);

  const providerResolution = resolution.providers[resolution.provider];
  if (providerResolution) {
    context.logger.info(
      `Mode: ${providerResolution.mode} (${providerResolution.mechanism})`,
    );
    context.logger.info(
      `Selection: ${providerResolution.selection.selectionMode}`,
    );
  }

  if (resolution.provider === 'codex') {
    context.logger.info(
      `Codex provider default effort: ${resolution.providerDefaultEffort}`,
    );
    if (providerResolution?.selection.selectionMode === 'inherit-default') {
      context.logger.info(
        'Note: OAT will not select a Codex effort; base/unpinned roles resolve through the provider default.',
      );
    } else if (providerResolution?.selection.selectionMode === 'uncapped') {
      context.logger.info(
        'Note: OAT will use the preferred pinned Codex variant with no configured cap. Actual host support for upward effort selection must be verified by the dispatching host.',
      );
    } else if (
      providerResolution?.selection.selectionMode === 'review-target'
    ) {
      context.logger.info(
        'Note: Reviewer dispatch uses the configured target when one exists; uncapped/inherit policies provide no reviewer target.',
      );
    } else {
      context.logger.info(
        `Note: OAT will use pinned subagent variants up to ${resolution.value ?? 'the resolved policy cap'}. Base/unpinned roles resolve through the provider default.`,
      );
    }
    if (
      providerResolution?.selection.selectedValue &&
      providerResolution.selection.preferredValue
    ) {
      context.logger.info(
        `Selected Codex effort: ${providerResolution.selection.selectedValue}`,
      );
    }
  } else {
    context.logger.info('Effort axis: not-applicable');
    if (providerResolution?.selection.selectionMode === 'inherit-default') {
      context.logger.info(
        'Note: OAT will not select a Claude model; Task dispatch inherits host/provider behavior.',
      );
    }
    if (
      providerResolution?.selection.selectedValue &&
      providerResolution.selection.preferredValue
    ) {
      context.logger.info(
        `Selected dispatch value: ${providerResolution.selection.selectedValue}`,
      );
    }
  }
}

async function runDispatchCeilingResolve(
  context: CommandContext,
  dependencies: DispatchCeilingDependencies,
  options: DispatchCeilingResolveOptions,
): Promise<void> {
  try {
    const resolution = await resolveDispatchCeiling(
      context,
      dependencies,
      options,
    );

    if (context.json) {
      context.logger.json(resolution);
    } else {
      writeHumanResolution(context, resolution);
    }

    process.exitCode = resolution.status === 'blocked' ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProjectDispatchCeilingCommand(
  overrides: Partial<DispatchCeilingDependencies> = {},
): Command {
  const dependencies: DispatchCeilingDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const command = new Command('dispatch-ceiling').description(
    'Resolve OAT project dispatch ceiling metadata',
  );

  command.addCommand(
    new Command('resolve')
      .description('Resolve dispatch policy for a provider')
      .requiredOption(
        '--provider <provider>',
        'Provider name: codex or claude are enforced; any other provider resolves as advisory (unsupported)',
      )
      .option(
        '--role <role>',
        'Dispatch role for variant compilation: implementer (default) or reviewer',
      )
      .option(
        '--orchestrator-tier <tier>',
        'Orchestrator tier, used to flag verify-on-upgrade for above-orchestrator requests',
      )
      .option(
        '--preferred <value>',
        'Preferred implementer/fix dispatch value before applying the resolved policy',
      )
      .option(
        '--project-path <path>',
        'Read project-state policy from an explicit project path',
      )
      .option(
        '--preflight',
        'Treat unresolved non-interactive resolution as an implementation block',
      )
      .option(
        '--non-interactive',
        'Force non-interactive block behavior when the ceiling is unresolved',
      )
      .option('--json', 'Output machine-readable JSON')
      .action(async (options: DispatchCeilingResolveOptions, cmd: Command) => {
        const globalOptions = readGlobalOptions(cmd);
        const context = dependencies.buildCommandContext({
          ...globalOptions,
          json: globalOptions.json === true || options.json === true,
        });
        await runDispatchCeilingResolve(context, dependencies, options);
      }),
  );

  return command;
}
