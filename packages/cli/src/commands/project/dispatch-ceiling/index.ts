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
  getDispatchPolicyChoices,
  managedDispatchPolicyValueList,
  renderDispatchPolicyChoicesMarkdown,
} from '@config/dispatch-policy-options';
import {
  resolveActiveProject,
  VALID_CLAUDE_DISPATCH_CEILINGS,
  VALID_CODEX_DISPATCH_CEILINGS,
  VALID_DISPATCH_MATRIX_TIERS,
  VALID_MANAGED_DISPATCH_POLICIES,
  validateDispatchRouteTarget,
  type ActiveProjectResolution,
  type WorkflowDispatchMatrixCell,
  type WorkflowDispatchMatrixTier,
  type WorkflowDispatchProviderValue,
  type WorkflowDispatchRoute,
  type WorkflowDispatchRouteTarget,
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
import {
  classifyModelFamily,
  type ModelFamily,
} from '@providers/identity/family';
import { Command } from 'commander';
import YAML from 'yaml';

// Provider-neutral: accept arbitrary provider names. Codex/Claude get concrete
// enforcement; every other provider routes through the fallback advisory adapter
// (mode: unsupported) rather than erroring. Typed concrete-value validation is
// applied only for the providers that have a value enum.
type DispatchCeilingProvider = 'codex' | 'claude' | (string & {});
type DispatchCeilingValue = string;
type DispatchCeilingSource =
  | 'local-config'
  | 'repo-config'
  | 'user-config'
  | 'env'
  | 'project-state';

type DispatchCeilingMode = 'enforced' | 'advisory' | 'unsupported';
type ProjectDispatchMatrix = Record<string, WorkflowDispatchProviderValue>;

interface ProviderResolution {
  value: DispatchCeilingValue | null;
  mode: DispatchCeilingMode;
  mechanism: EnforcementMechanism;
  dispatchArgs: CeilingDispatchArgs;
  modelAxis: string;
  effortAxis: string;
  verifyOnDispatch: boolean;
  cellSource: DispatchCeilingSource | null;
  target: ResolvedDispatchRouteTarget | null;
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
  escalationLevel?: string;
  projectPath?: string;
  preflight?: boolean;
  nonInteractive?: boolean;
  json?: boolean;
}

interface DispatchCeilingChoicesOptions {
  format?: string;
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
  matrix: ProjectDispatchMatrix | null;
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
  | 'no-review-target'
  | 'inherit-default'
  | 'unresolved';
type DispatchSelectionBranch =
  | 'matrix-pinned'
  | 'prompt-persisted'
  | 'escalation-target'
  | 'inherit'
  | 'unresolved';

interface ResolvedDispatchRouteTarget {
  harness: string;
  model?: string;
  effort?: string;
  crossHarness: boolean;
  routeIndex: number;
  routeLength: number;
}

interface DispatchSelection {
  role: CeilingRole;
  preferredValue: DispatchCeilingValue | null;
  selectedValue: DispatchCeilingValue | null;
  capped: boolean;
  selectionMode: DispatchSelectionMode;
  selectionBranch: DispatchSelectionBranch;
  family: ModelFamily;
  target: ResolvedDispatchRouteTarget | null;
  cellSource: DispatchCeilingSource | null;
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
  return typeof value === 'string' && value.trim().length > 0;
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
  matrix: ProjectDispatchMatrix | null;
  cellSource: DispatchCeilingSource | null;
  target: ResolvedDispatchRouteTarget | null;
  selectionBranch: DispatchSelectionBranch;
  warnings: string[];
}

type ConfigCandidateSource = Exclude<ResolvedConfigSource, 'default'>;

interface ResolvedConfigDispatchCandidate extends ResolvedDispatchPolicy {
  configSource: ConfigCandidateSource;
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
  return managedDispatchPolicyValueList(', ');
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

function normalizeProjectMatrixBareValue(
  provider: DispatchCeilingProvider,
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const order = providerValueOrder(provider);
  if (order && !isValidProviderValue(provider, trimmed)) {
    return undefined;
  }

  return trimmed;
}

function normalizeProjectMatrixRouteTarget(
  value: unknown,
): WorkflowDispatchRouteTarget | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const target: WorkflowDispatchRouteTarget = {};
  for (const key of ['harness', 'model', 'effort'] as const) {
    const rawValue = record[key];
    if (typeof rawValue === 'string' && rawValue.trim()) {
      target[key] = rawValue.trim();
    }
  }

  return Object.keys(target).length > 0 ? target : undefined;
}

function normalizeProjectMatrixCell(
  provider: DispatchCeilingProvider,
  value: unknown,
): WorkflowDispatchMatrixCell | undefined {
  const bareValue = normalizeProjectMatrixBareValue(provider, value);
  if (bareValue !== undefined) {
    return bareValue;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const route: WorkflowDispatchRoute = [];
  for (const entry of value) {
    const bareEntry = normalizeProjectMatrixBareValue(provider, entry);
    if (bareEntry !== undefined) {
      route.push(bareEntry);
      continue;
    }

    const target = normalizeProjectMatrixRouteTarget(entry);
    if (target !== undefined) {
      route.push(target);
    }
  }

  return route.length > 0 ? route : undefined;
}

function normalizeProjectMatrixProviderValue(
  provider: DispatchCeilingProvider,
  value: unknown,
): WorkflowDispatchProviderValue | undefined {
  const bareValue = normalizeProjectMatrixBareValue(provider, value);
  if (bareValue !== undefined) {
    return bareValue;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const tierMap: Partial<
    Record<WorkflowDispatchMatrixTier, WorkflowDispatchMatrixCell>
  > = {};
  for (const [tier, rawCell] of Object.entries(value)) {
    if (!(VALID_DISPATCH_MATRIX_TIERS as readonly string[]).includes(tier)) {
      continue;
    }

    const normalized = normalizeProjectMatrixCell(provider, rawCell);
    if (normalized !== undefined) {
      tierMap[tier as WorkflowDispatchMatrixTier] = normalized;
    }
  }

  return Object.keys(tierMap).length > 0 ? tierMap : undefined;
}

function readProjectDispatchMatrix(value: unknown): {
  matrix: ProjectDispatchMatrix | null;
  warnings: string[];
} {
  if (value === undefined || value === null) {
    return { matrix: null, warnings: [] };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      matrix: null,
      warnings: [
        'Ignoring malformed oat_dispatch_policy.matrix in project state.',
      ],
    };
  }

  const matrix: ProjectDispatchMatrix = {};
  for (const [provider, rawProviderValue] of Object.entries(value)) {
    if (!provider.trim()) {
      continue;
    }
    const normalized = normalizeProjectMatrixProviderValue(
      provider,
      rawProviderValue,
    );
    if (normalized !== undefined) {
      matrix[provider] = normalized;
    }
  }

  if (Object.keys(matrix).length === 0) {
    return {
      matrix: null,
      warnings: [
        'Ignoring malformed oat_dispatch_policy.matrix in project state.',
      ],
    };
  }

  return { matrix, warnings: [] };
}

function policyTier(
  policy: WorkflowManagedDispatchPolicy | 'legacy-ceiling' | null,
): WorkflowDispatchMatrixTier | null {
  return typeof policy === 'string' &&
    (VALID_DISPATCH_MATRIX_TIERS as readonly string[]).includes(policy)
    ? (policy as WorkflowDispatchMatrixTier)
    : null;
}

function uncappedPreferredTier(
  provider: DispatchCeilingProvider,
  role: CeilingRole,
  preferredValue: DispatchCeilingValue | null,
): WorkflowDispatchMatrixTier | null {
  if (provider !== 'codex' || role === 'reviewer' || preferredValue === null) {
    return null;
  }

  if (
    (VALID_DISPATCH_MATRIX_TIERS as readonly string[]).includes(preferredValue)
  ) {
    return preferredValue as WorkflowDispatchMatrixTier;
  }

  let matchedTier: WorkflowDispatchMatrixTier | null = null;
  for (const tier of VALID_DISPATCH_MATRIX_TIERS) {
    const compiledValue = compiledPolicyValueForProvider(
      provider,
      compileDispatchPolicyPreset(tier),
    );
    if (compiledValue === preferredValue) {
      matchedTier = tier;
    }
  }

  return matchedTier;
}

function dispatchValueFromRouteTarget(
  target: ResolvedDispatchRouteTarget,
): string | null {
  const adapter = getCeilingAdapter(target.harness);
  if (adapter.mechanism === 'pinned-variant') {
    return target.effort ?? null;
  }
  if (adapter.mechanism === 'model-arg') {
    return target.model ?? null;
  }
  return null;
}

interface MatrixCellResolution {
  value: DispatchCeilingValue | null;
  cellSource: DispatchCeilingSource;
  target: ResolvedDispatchRouteTarget | null;
  selectionBranch: DispatchSelectionBranch;
  warnings: string[];
}

function routeTargetFromBareValue(
  provider: DispatchCeilingProvider,
  value: DispatchCeilingValue,
  routeIndex: number,
  routeLength: number,
): ResolvedDispatchRouteTarget {
  const adapter = getCeilingAdapter(provider);
  const target: ResolvedDispatchRouteTarget = {
    harness: provider,
    crossHarness: false,
    routeIndex,
    routeLength,
  };

  if (adapter.mechanism === 'pinned-variant') {
    target.effort = value;
  } else {
    target.model = value;
  }

  return target;
}

function routeTargetFromObject(
  provider: DispatchCeilingProvider,
  target: WorkflowDispatchRouteTarget,
  routeIndex: number,
  routeLength: number,
): ResolvedDispatchRouteTarget {
  const harness = target.harness ?? provider;
  return {
    harness,
    ...(target.model ? { model: target.model } : {}),
    ...(target.effort ? { effort: target.effort } : {}),
    crossHarness: harness !== provider,
    routeIndex,
    routeLength,
  };
}

function resolveRouteMatrixCell(
  provider: DispatchCeilingProvider,
  route: WorkflowDispatchRoute,
  escalationLevel: number,
  cellSource: DispatchCeilingSource,
): MatrixCellResolution | null {
  const routeIndex = Math.min(escalationLevel, route.length - 1);
  const entry = route[routeIndex];
  if (entry === undefined) {
    return null;
  }

  const target =
    typeof entry === 'string'
      ? routeTargetFromBareValue(provider, entry, routeIndex, route.length)
      : routeTargetFromObject(provider, entry, routeIndex, route.length);
  const targetValidation =
    typeof entry === 'string'
      ? { valid: true }
      : validateDispatchRouteTarget(provider, entry);
  const value = targetValidation.valid
    ? typeof entry === 'string'
      ? entry
      : dispatchValueFromRouteTarget(target)
    : null;
  const warnings = targetValidation.valid
    ? []
    : [
        `Ignoring incomplete Codex dispatch target at route index ${routeIndex}: ${targetValidation.reason}`,
      ];

  return {
    value,
    cellSource,
    target,
    selectionBranch: routeIndex > 0 ? 'escalation-target' : 'matrix-pinned',
    warnings,
  };
}

function resolveProviderCellFromValue(
  provider: DispatchCeilingProvider,
  providerValue: WorkflowDispatchProviderValue | undefined,
  tier: WorkflowDispatchMatrixTier | null,
  cellSource: DispatchCeilingSource,
  escalationLevel: number,
): MatrixCellResolution | null {
  if (providerValue === undefined) {
    return null;
  }

  if (typeof providerValue === 'string') {
    return {
      value: providerValue,
      cellSource,
      target: null,
      selectionBranch: 'prompt-persisted',
      warnings: [],
    };
  }

  if (tier === null) {
    return null;
  }

  const cell = providerValue[tier];
  if (cell === undefined) {
    return null;
  }

  if (typeof cell === 'string') {
    return {
      value: cell,
      cellSource,
      target: null,
      selectionBranch: 'matrix-pinned',
      warnings: [],
    };
  }

  return resolveRouteMatrixCell(provider, cell, escalationLevel, cellSource);
}

function resolveProviderMatrixCell(
  provider: DispatchCeilingProvider,
  tier: WorkflowDispatchMatrixTier | null,
  resolvedConfig: ResolvedConfig,
  projectMatrix: ProjectDispatchMatrix | null,
  escalationLevel: number,
): MatrixCellResolution | null {
  let selected: MatrixCellResolution | null = null;
  const layers: Array<{
    source: DispatchCeilingSource;
    providers: ProjectDispatchMatrix | undefined | null;
  }> = [
    {
      source: 'user-config',
      providers: resolvedConfig.user.workflow?.dispatchCeiling?.providers,
    },
    {
      source: 'repo-config',
      providers: resolvedConfig.shared.workflow?.dispatchCeiling?.providers,
    },
    {
      source: 'local-config',
      providers: resolvedConfig.local.workflow?.dispatchCeiling?.providers,
    },
    { source: 'project-state', providers: projectMatrix },
  ];

  for (const layer of layers) {
    const resolved = resolveProviderCellFromValue(
      provider,
      layer.providers?.[provider],
      tier,
      layer.source,
      escalationLevel,
    );
    if (resolved) {
      selected = resolved;
    }
  }

  return selected;
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
  const parsedMatrix = readProjectDispatchMatrix(policyRecord['matrix']);
  const mode = policyRecord['mode'];
  if (mode === 'inherit') {
    return {
      mode,
      policy: null,
      value: null,
      source: 'project-state',
      preset: null,
      matrix: parsedMatrix.matrix,
      cellSource: null,
      target: null,
      selectionBranch: 'inherit',
      warnings: parsedMatrix.warnings,
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
      matrix: parsedMatrix.matrix,
      cellSource: null,
      target: null,
      selectionBranch: 'prompt-persisted',
      warnings: parsedMatrix.warnings,
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
    matrix: parsedMatrix.matrix,
    cellSource: 'project-state',
    target: null,
    selectionBranch: 'prompt-persisted',
    warnings: parsedMatrix.warnings,
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
    matrix: null,
    cellSource: 'project-state',
    target: null,
    selectionBranch: 'prompt-persisted',
    warnings: [],
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

function isConfigCandidateSource(
  source: ResolvedConfigSource | undefined,
): source is ConfigCandidateSource {
  return source !== undefined && source !== 'default';
}

function configSourcePrecedence(source: ResolvedConfigSource): number {
  switch (source) {
    case 'env':
      return 4;
    case 'local':
      return 3;
    case 'shared':
      return 2;
    case 'user':
      return 1;
    case 'default':
      return 0;
  }
}

function lowerPrecedenceConfigSource(
  left: ConfigCandidateSource,
  right: ConfigCandidateSource,
): ConfigCandidateSource {
  return configSourcePrecedence(left) <= configSourcePrecedence(right)
    ? left
    : right;
}

function stripConfigCandidateSource(
  candidate: ResolvedConfigDispatchCandidate,
): ResolvedDispatchPolicy {
  return {
    mode: candidate.mode,
    policy: candidate.policy,
    value: candidate.value,
    source: candidate.source,
    preset: candidate.preset,
    matrix: candidate.matrix,
    cellSource: candidate.cellSource,
    target: candidate.target,
    selectionBranch: candidate.selectionBranch,
    warnings: candidate.warnings,
  };
}

function readResolvedConfigPolicyCandidate(
  provider: DispatchCeilingProvider,
  resolvedConfig: ResolvedConfig,
): ResolvedConfigDispatchCandidate | null {
  const modeEntry = resolvedConfig.resolved['workflow.dispatchPolicy.mode'];
  const policyEntry = resolvedConfig.resolved['workflow.dispatchPolicy.policy'];

  if (
    modeEntry?.value === 'inherit' &&
    isConfigCandidateSource(modeEntry.source)
  ) {
    const source = configSourceToCeilingSource(modeEntry.source);
    if (source === null) {
      return null;
    }

    return {
      mode: 'inherit',
      policy: null,
      value: null,
      source,
      preset: null,
      matrix: null,
      cellSource: null,
      target: null,
      selectionBranch: 'inherit',
      warnings: [],
      configSource: modeEntry.source,
    };
  }

  if (
    modeEntry?.value === 'managed' &&
    isValidManagedPolicy(policyEntry?.value) &&
    isConfigCandidateSource(modeEntry.source) &&
    isConfigCandidateSource(policyEntry?.source)
  ) {
    const policy = policyEntry.value;
    const compiled = compileDispatchPolicyPreset(policy);
    const configSource = lowerPrecedenceConfigSource(
      modeEntry.source,
      policyEntry.source,
    );
    const source = configSourceToCeilingSource(configSource);
    if (source === null) {
      return null;
    }

    return {
      mode: 'managed',
      policy,
      value: compiledPolicyValueForProvider(provider, compiled),
      source,
      preset: policy,
      matrix: null,
      cellSource: null,
      target: null,
      selectionBranch: 'prompt-persisted',
      warnings: [],
      configSource,
    };
  }

  return null;
}

function readResolvedLegacyConfigCeilingCandidate(
  provider: DispatchCeilingProvider,
  resolvedConfig: ResolvedConfig,
): ResolvedConfigDispatchCandidate | null {
  // Read the concrete per-provider value from the nested key. The flat
  // `workflow.dispatchCeiling.<provider>` shape was removed in p01; never read
  // the preset label for dispatch.
  const entry =
    resolvedConfig.resolved[`workflow.dispatchCeiling.providers.${provider}`];
  if (
    !entry ||
    !isConfigCandidateSource(entry.source) ||
    !isValidProviderValue(provider, entry.value)
  ) {
    return null;
  }

  const source = configSourceToCeilingSource(entry.source);
  if (source === null) {
    return null;
  }

  return {
    mode: 'managed',
    policy: 'legacy-ceiling',
    value: entry.value,
    source,
    preset: null,
    matrix: null,
    cellSource: source,
    target: null,
    selectionBranch: 'prompt-persisted',
    warnings: [],
    configSource: entry.source,
  };
}

function readResolvedConfigCeiling(
  provider: DispatchCeilingProvider,
  resolvedConfig: ResolvedConfig,
): ResolvedDispatchPolicy | null {
  const policyCandidate = readResolvedConfigPolicyCandidate(
    provider,
    resolvedConfig,
  );
  const legacyCandidate = readResolvedLegacyConfigCeilingCandidate(
    provider,
    resolvedConfig,
  );

  if (!policyCandidate) {
    return legacyCandidate ? stripConfigCandidateSource(legacyCandidate) : null;
  }

  if (!legacyCandidate) {
    return stripConfigCandidateSource(policyCandidate);
  }

  const winner =
    configSourcePrecedence(policyCandidate.configSource) >=
    configSourcePrecedence(legacyCandidate.configSource)
      ? policyCandidate
      : legacyCandidate;
  return stripConfigCandidateSource(winner);
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

function normalizeEscalationLevel(value: string | undefined): number {
  if (value === undefined) {
    return 0;
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      `Invalid escalation level "${value}". Use a non-negative integer.`,
    );
  }

  return Number.parseInt(normalized, 10);
}

function selectionFamily(
  provider: DispatchCeilingProvider,
  value: DispatchCeilingValue | null,
  target: ResolvedDispatchRouteTarget | null,
): ModelFamily {
  return value
    ? classifyModelFamily({ value, providerId: target?.harness ?? provider })
    : 'unknown';
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
    cellSource: policy.cellSource,
    target: policy.target,
  };

  if (policy.mode === 'inherit') {
    return {
      ...baseSelection,
      preferredValue: null,
      selectedValue: null,
      capped: false,
      selectionMode: 'inherit-default',
      selectionBranch: 'inherit',
      family: 'unknown',
      target: null,
    };
  }

  if (policy.policy === 'uncapped') {
    const targetValue = policy.target
      ? dispatchValueFromRouteTarget(policy.target)
      : null;
    const selectedValue =
      role === 'reviewer' ? null : (targetValue ?? preferredValue);
    const target = role === 'reviewer' || !targetValue ? null : policy.target;
    return {
      ...baseSelection,
      preferredValue: role === 'reviewer' ? null : preferredValue,
      selectedValue,
      capped: false,
      selectionMode: role === 'reviewer' ? 'no-review-target' : 'uncapped',
      selectionBranch: target
        ? policy.selectionBranch
        : selectedValue
          ? 'prompt-persisted'
          : 'unresolved',
      family: selectionFamily(provider, selectedValue, target),
      target,
    };
  }

  if (policy.value === null) {
    return {
      ...baseSelection,
      preferredValue: null,
      selectedValue: null,
      capped: false,
      selectionMode: policy.target ? 'unresolved' : 'capped',
      selectionBranch: policy.selectionBranch,
      family: 'unknown',
      target: policy.target,
    };
  }

  if (role === 'reviewer' || preferredValue === null) {
    return {
      ...baseSelection,
      preferredValue,
      selectedValue: policy.value,
      capped: false,
      selectionMode: role === 'reviewer' ? 'review-target' : 'capped',
      selectionBranch: policy.selectionBranch,
      family: selectionFamily(provider, policy.value, policy.target),
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
      selectionBranch: policy.selectionBranch,
      family: selectionFamily(provider, policy.value, policy.target),
    };
  }

  const selectedIndex = Math.min(preferredIndex, ceilingIndex);
  const selectedValue = order[selectedIndex]!;
  return {
    ...baseSelection,
    preferredValue,
    selectedValue,
    capped: preferredIndex > ceilingIndex,
    selectionMode: 'capped',
    selectionBranch: policy.selectionBranch,
    family: selectionFamily(
      provider,
      selectedValue,
      selectedValue === policy.value ? policy.target : null,
    ),
    target: selectedValue === policy.value ? policy.target : null,
  };
}

function hasCodexVariantDispatchArgs(
  dispatchArgs: CeilingDispatchArgs,
): dispatchArgs is { variant: string } {
  return (
    dispatchArgs !== null &&
    'variant' in dispatchArgs &&
    typeof dispatchArgs.variant === 'string' &&
    dispatchArgs.variant.length > 0
  );
}

function hasModelDispatchArgs(
  dispatchArgs: CeilingDispatchArgs,
): dispatchArgs is { model: string } {
  return (
    dispatchArgs !== null &&
    'model' in dispatchArgs &&
    typeof dispatchArgs.model === 'string' &&
    dispatchArgs.model.length > 0
  );
}

function modelAxis(
  selection: DispatchSelection,
  dispatchArgs: CeilingDispatchArgs,
): string {
  if (selection.target?.model && dispatchArgs) {
    return `selected:${selection.target.model}`;
  }

  if (hasModelDispatchArgs(dispatchArgs)) {
    return `selected:${dispatchArgs.model}`;
  }

  if (selection.selectionMode === 'inherit-default') {
    return 'inherited';
  }

  return 'unresolved';
}

function codexEffortAxis(
  selection: DispatchSelection,
  dispatchArgs: CeilingDispatchArgs,
): string {
  if (hasCodexVariantDispatchArgs(dispatchArgs) && selection.target?.effort) {
    return `selected:${selection.target.effort}`;
  }

  if (
    selection.selectionMode === 'inherit-default' ||
    selection.selectionMode === 'no-review-target'
  ) {
    return 'provider-default';
  }

  return 'unresolved';
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
      modelAxis: 'unresolved',
      effortAxis: provider === 'codex' ? 'provider-default' : 'not-applicable',
      verifyOnDispatch: false,
      cellSource: null,
      target: null,
      selection: {
        role,
        preferredValue,
        selectedValue: null,
        capped: false,
        selectionMode: 'unresolved',
        selectionBranch: 'unresolved',
        family: 'unknown',
        target: null,
        cellSource: null,
        policyMode: null,
        policy: null,
      },
    };
  }

  const selection = selectDispatchValue(provider, role, policy, preferredValue);
  const dispatchValue = selection.selectedValue;
  const isCrossHarness = selection.target?.crossHarness === true;
  const dispatchArgs =
    dispatchValue && !isCrossHarness
      ? adapter.compileToDispatchArgs(dispatchValue, role, {
          orchestratorTier,
          target: selection.target,
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
    modelAxis: modelAxis(selection, dispatchArgs),
    effortAxis:
      provider === 'codex'
        ? codexEffortAxis(selection, dispatchArgs)
        : 'not-applicable',
    verifyOnDispatch:
      dispatchValue && !isCrossHarness
        ? adapter.verifyOnDispatch(dispatchValue, {
            orchestratorTier,
            target: selection.target,
          })
        : false,
    cellSource: policy.cellSource,
    target: selection.target,
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
  const escalationLevel = normalizeEscalationLevel(options.escalationLevel);

  const resolvedValue = await resolveCeilingValue(
    provider,
    resolvedConfig,
    projectPath,
    dependencies,
    escalationLevel,
    role,
    preferredValue,
  );
  for (const warning of resolvedValue?.warnings ?? []) {
    context.logger.warn(warning);
  }

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
      matrix: resolvedValue.matrix,
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
    matrix: null,
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
  matrix: ProjectDispatchMatrix | null;
  cellSource: DispatchCeilingSource | null;
  target: ResolvedDispatchRouteTarget | null;
  selectionBranch: DispatchSelectionBranch;
  warnings: string[];
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
  escalationLevel: number,
  role: CeilingRole,
  preferredValue: DispatchCeilingValue | null,
): Promise<ResolvedCeilingValue | null> {
  const configCeiling = readResolvedConfigCeiling(provider, resolvedConfig);
  const projectCeiling = await resolveProjectStateCeiling(
    provider,
    projectPath,
    dependencies,
  );

  const baseCeiling = configCeiling ?? projectCeiling;
  if (!baseCeiling) {
    return null;
  }

  if (baseCeiling.mode === 'inherit') {
    return baseCeiling;
  }

  if (baseCeiling.policy === 'uncapped') {
    const preferredTier = uncappedPreferredTier(provider, role, preferredValue);

    if (preferredTier) {
      const matrixCell = resolveProviderMatrixCell(
        provider,
        preferredTier,
        resolvedConfig,
        projectCeiling?.matrix ?? null,
        escalationLevel,
      );
      if (matrixCell) {
        return {
          ...baseCeiling,
          cellSource: matrixCell.cellSource,
          target: matrixCell.target,
          selectionBranch: matrixCell.selectionBranch,
          warnings: [...baseCeiling.warnings, ...matrixCell.warnings],
        };
      }
    }

    return baseCeiling;
  }

  const tier = policyTier(baseCeiling.policy);
  const matrixCell = resolveProviderMatrixCell(
    provider,
    tier,
    resolvedConfig,
    projectCeiling?.matrix ?? null,
    escalationLevel,
  );
  if (matrixCell) {
    return {
      ...baseCeiling,
      value: matrixCell.value,
      cellSource: matrixCell.cellSource,
      target: matrixCell.target,
      selectionBranch: matrixCell.selectionBranch,
      warnings: [...baseCeiling.warnings, ...matrixCell.warnings],
    };
  }

  if (
    baseCeiling.policy !== 'legacy-ceiling' &&
    baseCeiling.value === null &&
    providerValueOrder(provider) === null
  ) {
    return null;
  }

  return baseCeiling;
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
    if (providerResolution.target) {
      const details = [
        `harness=${providerResolution.target.harness}`,
        providerResolution.target.model
          ? `model=${providerResolution.target.model}`
          : null,
        providerResolution.target.effort
          ? `effort=${providerResolution.target.effort}`
          : null,
      ]
        .filter(Boolean)
        .join(' ');
      const suffix = providerResolution.target.crossHarness
        ? ' (cross-harness target; native dispatch args deferred)'
        : '';
      context.logger.info(`Dispatch target: ${details}${suffix}`);
    }
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
        'Note: Reviewer dispatch uses the configured target from the resolved capped policy.',
      );
    } else if (
      providerResolution?.selection.selectionMode === 'no-review-target'
    ) {
      context.logger.info(
        'Note: Managed uncapped reviewer dispatch has no configured target; use the base/unpinned reviewer fallback.',
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

async function runDispatchCeilingChoices(
  context: CommandContext,
  options: DispatchCeilingChoicesOptions,
): Promise<void> {
  const choices = getDispatchPolicyChoices();
  const format = (options.format ?? 'markdown').trim().toLowerCase();

  if (context.json || options.json) {
    context.logger.json({ status: 'ok', choices });
    process.exitCode = 0;
    return;
  }

  if (format !== 'markdown') {
    context.logger.error(
      `Invalid choices format "${options.format}". Valid formats: markdown.`,
    );
    process.exitCode = 1;
    return;
  }

  context.logger.info(renderDispatchPolicyChoicesMarkdown(choices));
  process.exitCode = 0;
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
    new Command('choices')
      .description('Print canonical dispatch policy choices')
      .option('--format <format>', 'Output format: markdown', 'markdown')
      .option('--json', 'Output machine-readable JSON')
      .action(async (options: DispatchCeilingChoicesOptions, cmd: Command) => {
        const globalOptions = readGlobalOptions(cmd);
        const context = dependencies.buildCommandContext({
          ...globalOptions,
          json: globalOptions.json === true || options.json === true,
        });
        await runDispatchCeilingChoices(context, options);
      }),
  );

  command.addCommand(
    new Command('resolve')
      .description('Resolve dispatch policy for a provider')
      .requiredOption(
        '--provider <provider>',
        'Provider name: codex, claude, or cursor are enforced; unregistered providers resolve as unsupported advisory',
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
        '--escalation-level <level>',
        'Ordered route entry to select; 0 is the floor and higher values advance through escalation targets',
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
