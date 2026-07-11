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
import { normalizeDispatchMatrix } from '@config/dispatch-matrix';
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
  isWorkflowDispatchCandidateLadder,
  isWorkflowDispatchFallbackRoute,
  toWorkflowDispatchCandidateLadder,
  validateDispatchRouteTarget,
  type ActiveProjectResolution,
  type WorkflowDispatchCandidate,
  type WorkflowDispatchCandidateLadder,
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
  isDirectDispatchRoleName,
  CLAUDE_TIER_ORDER,
  type CeilingDispatchArgs,
  type CeilingRole,
  type EnforcementMechanism,
} from '@providers/ceiling/registry';
import {
  classifyModelFamily,
  type ModelFamily,
} from '@providers/identity/family';
import { Command, Option } from 'commander';
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
  | 'project-state'
  | 'invocation';

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
  ceilingTier?: string;
  candidateModel?: string;
  candidateEffort?: string;
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
  | 'candidate'
  | 'capped'
  | 'uncapped'
  | 'review-target'
  | 'no-review-target'
  | 'inherit-default'
  | 'unresolved';
type DispatchSelectionBranch =
  | 'candidate-requested'
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
  requestedCandidate: RequestedDispatchCandidate | null;
  candidateTier: WorkflowDispatchMatrixTier | null;
  ceilingTier: WorkflowDispatchMatrixTier | null;
  ceilingTarget: ResolvedDispatchRouteTarget | null;
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

interface RequestedDispatchCandidate {
  model: string;
  effort?: string;
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
    case 'invocation':
      return 'explicit invocation';
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
  matrixCompatibility?: ProjectDispatchMatrix | null;
  cellSource: DispatchCeilingSource | null;
  target: ResolvedDispatchRouteTarget | null;
  selectionBranch: DispatchSelectionBranch;
  warnings: string[];
  requestedCandidate?: RequestedDispatchCandidate;
  candidateTier?: WorkflowDispatchMatrixTier;
  ceilingTier?: WorkflowDispatchMatrixTier;
  ceilingTarget?: ResolvedDispatchRouteTarget | null;
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

function isProjectMatrixRecord(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toProjectMatrixCompatibility(
  rawMatrix: Record<string, unknown>,
  matrix: ProjectDispatchMatrix,
): ProjectDispatchMatrix {
  const compatibility: ProjectDispatchMatrix = {};
  for (const [provider, providerValue] of Object.entries(matrix)) {
    if (typeof providerValue === 'string') {
      compatibility[provider] = providerValue;
      continue;
    }

    const rawProvider = isProjectMatrixRecord(rawMatrix[provider])
      ? rawMatrix[provider]
      : {};
    const tiers: Partial<
      Record<WorkflowDispatchMatrixTier, WorkflowDispatchMatrixCell>
    > = {};
    for (const [tier, cell] of Object.entries(providerValue)) {
      const matrixTier = tier as WorkflowDispatchMatrixTier;
      const rawCell = rawProvider[matrixTier];
      const ladder = toWorkflowDispatchCandidateLadder(cell);
      const firstCandidate = ladder.candidates[0];

      if (typeof rawCell === 'string' && typeof firstCandidate === 'string') {
        tiers[matrixTier] = firstCandidate;
        continue;
      }
      if (
        Array.isArray(rawCell) &&
        firstCandidate !== undefined &&
        isWorkflowDispatchFallbackRoute(firstCandidate)
      ) {
        tiers[matrixTier] = firstCandidate.route;
        continue;
      }

      tiers[matrixTier] = cell;
    }
    compatibility[provider] = tiers;
  }

  return compatibility;
}

function readProjectDispatchMatrix(value: unknown): {
  matrix: ProjectDispatchMatrix | null;
  compatibilityMatrix: ProjectDispatchMatrix | null;
  warnings: string[];
} {
  if (value === undefined || value === null) {
    return { matrix: null, compatibilityMatrix: null, warnings: [] };
  }

  const normalized = normalizeDispatchMatrix(value, {
    pathPrefix: 'oat_dispatch_policy.matrix',
    compatibilityMode: 'project-state',
  });
  const matrix = Object.fromEntries(
    Object.entries(normalized.providers).filter(([provider]) =>
      Boolean(provider.trim()),
    ),
  );
  if (!isProjectMatrixRecord(value) || Object.keys(matrix).length === 0) {
    return {
      matrix: null,
      compatibilityMatrix: null,
      warnings: [
        'Ignoring malformed oat_dispatch_policy.matrix in project state.',
      ],
    };
  }

  return {
    matrix,
    compatibilityMatrix: toProjectMatrixCompatibility(value, matrix),
    warnings: [],
  };
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

  if (isWorkflowDispatchCandidateLadder(cell)) {
    const ceiling = cell.candidates.at(-1);
    if (ceiling === undefined) {
      return null;
    }
    if (typeof ceiling === 'string') {
      return resolveRouteMatrixCell(
        provider,
        [ceiling],
        escalationLevel,
        cellSource,
      );
    }
    const route = isWorkflowDispatchFallbackRoute(ceiling)
      ? ceiling.route
      : ([ceiling] satisfies WorkflowDispatchRoute);
    return resolveRouteMatrixCell(provider, route, escalationLevel, cellSource);
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

interface ResolvedMatrixCellDefinition {
  cell: WorkflowDispatchMatrixCell;
  cellSource: DispatchCeilingSource;
}

interface RequestedMatrixCandidateResolution {
  resolution: MatrixCellResolution;
  candidateTier: WorkflowDispatchMatrixTier;
}

function resolveProviderMatrixCellDefinition(
  provider: DispatchCeilingProvider,
  tier: WorkflowDispatchMatrixTier,
  resolvedConfig: ResolvedConfig,
  projectMatrix: ProjectDispatchMatrix | null,
): ResolvedMatrixCellDefinition | null {
  let selected: ResolvedMatrixCellDefinition | null = null;
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
    const providerValue = layer.providers?.[provider];
    if (typeof providerValue === 'string') {
      selected = null;
      continue;
    }
    const cell = providerValue?.[tier];
    if (cell !== undefined) {
      selected = { cell, cellSource: layer.source };
    }
  }

  return selected;
}

function candidateRoute(
  candidate: WorkflowDispatchCandidate,
): WorkflowDispatchRoute {
  return isWorkflowDispatchFallbackRoute(candidate)
    ? candidate.route
    : [candidate];
}

function candidatePrimaryTarget(
  provider: DispatchCeilingProvider,
  tier: WorkflowDispatchMatrixTier,
  candidate: WorkflowDispatchCandidate,
): ResolvedDispatchRouteTarget {
  const route = candidateRoute(candidate);
  const entry = route[0];
  if (entry === undefined) {
    throw new Error(
      `Malformed ${provider} candidate ordering in ${tier}: fallback routes cannot be empty.`,
    );
  }
  if (typeof entry !== 'string') {
    const validation = validateDispatchRouteTarget(provider, entry);
    if (!validation.valid) {
      throw new Error(
        `Malformed ${provider} candidate ordering in ${tier}: ${validation.reason}`,
      );
    }
  }

  const target =
    typeof entry === 'string'
      ? routeTargetFromBareValue(provider, entry, 0, route.length)
      : routeTargetFromObject(provider, entry, 0, route.length);
  if (target.model && isDirectDispatchRoleName(target.model)) {
    throw new Error(
      `Malformed ${provider} candidate ordering in ${tier}: direct dispatch role names are not candidate models.`,
    );
  }
  const targetAdapter = getCeilingAdapter(target.harness);
  if (
    targetAdapter.mechanism === 'pinned-variant' &&
    (!target.model ||
      !target.effort ||
      !CODEX_VALUES.includes(target.effort as WorkflowCodexDispatchCeiling))
  ) {
    throw new Error(
      `Malformed ${provider} candidate ordering in ${tier}: Codex candidates require a model and supported effort.`,
    );
  }
  if (targetAdapter.mechanism === 'model-arg' && !target.model) {
    throw new Error(
      `Malformed ${provider} candidate ordering in ${tier}: model-argument candidates require a model.`,
    );
  }

  return target;
}

function candidateTargetKey(target: ResolvedDispatchRouteTarget): string {
  return JSON.stringify([
    target.harness,
    target.model ?? null,
    target.effort ?? null,
  ]);
}

function assertCandidateOrder(
  provider: DispatchCeilingProvider,
  tier: WorkflowDispatchMatrixTier,
  ladder: WorkflowDispatchCandidateLadder,
): ResolvedDispatchRouteTarget[] {
  if (ladder.candidates.length === 0) {
    throw new Error(
      `Malformed ${provider} candidate ordering in ${tier}: candidates cannot be empty.`,
    );
  }

  const targets: ResolvedDispatchRouteTarget[] = [];
  const seen = new Set<string>();
  let previousClaudeRank: number | null = null;
  const codexRanksByModel = new Map<string, number>();
  for (const candidate of ladder.candidates) {
    const target = candidatePrimaryTarget(provider, tier, candidate);
    const key = candidateTargetKey(target);
    if (seen.has(key)) {
      throw new Error(
        `Malformed ${provider} candidate ordering in ${tier}: duplicate candidate ${key}.`,
      );
    }
    seen.add(key);

    if (target.harness === 'claude' && target.model) {
      const rank = CLAUDE_TIER_ORDER.indexOf(target.model);
      if (rank < 0) {
        throw new Error(
          `Malformed ${provider} candidate ordering in ${tier}: unsupported Claude model ${JSON.stringify(target.model)}.`,
        );
      }
      if (previousClaudeRank !== null && rank < previousClaudeRank) {
        throw new Error(
          `Malformed ${provider} candidate ordering in ${tier}: Claude candidates must be nondecreasing.`,
        );
      }
      previousClaudeRank = rank;
    }

    if (target.harness === 'codex' && target.model && target.effort) {
      const rank = CODEX_VALUES.indexOf(
        target.effort as WorkflowCodexDispatchCeiling,
      );
      const previousRank = codexRanksByModel.get(target.model);
      if (previousRank !== undefined && rank < previousRank) {
        throw new Error(
          `Malformed ${provider} candidate ordering in ${tier}: Codex efforts for ${target.model} must be nondecreasing.`,
        );
      }
      codexRanksByModel.set(target.model, rank);
    }

    targets.push(target);
  }

  return targets;
}

function assertTierCeilingsNondecreasing(
  provider: DispatchCeilingProvider,
  previous: ResolvedDispatchRouteTarget | null,
  current: ResolvedDispatchRouteTarget,
  tier: WorkflowDispatchMatrixTier,
): void {
  if (!previous || previous.harness !== current.harness) {
    return;
  }

  if (
    current.harness === 'claude' &&
    previous.model &&
    current.model &&
    CLAUDE_TIER_ORDER.indexOf(current.model) <
      CLAUDE_TIER_ORDER.indexOf(previous.model)
  ) {
    throw new Error(
      `Malformed ${provider} candidate ordering in ${tier}: named tier ceilings must be nondecreasing.`,
    );
  }
  if (
    current.harness === 'codex' &&
    previous.model === current.model &&
    previous.effort &&
    current.effort &&
    CODEX_VALUES.indexOf(current.effort as WorkflowCodexDispatchCeiling) <
      CODEX_VALUES.indexOf(previous.effort as WorkflowCodexDispatchCeiling)
  ) {
    throw new Error(
      `Malformed ${provider} candidate ordering in ${tier}: named tier ceilings must be nondecreasing.`,
    );
  }
}

function requestedCandidateMatches(
  provider: DispatchCeilingProvider,
  requested: RequestedDispatchCandidate,
  target: ResolvedDispatchRouteTarget,
): boolean {
  if (target.harness !== provider || target.model !== requested.model) {
    return false;
  }
  return provider !== 'codex' || target.effort === requested.effort;
}

function formatRequestedCandidate(
  provider: DispatchCeilingProvider,
  requested: RequestedDispatchCandidate,
): string {
  return provider === 'codex'
    ? `${requested.model}/${requested.effort}`
    : requested.model;
}

function resolveRequestedMatrixCandidate(
  provider: DispatchCeilingProvider,
  requested: RequestedDispatchCandidate,
  ceilingTier: WorkflowDispatchMatrixTier | null,
  resolvedConfig: ResolvedConfig,
  projectMatrix: ProjectDispatchMatrix | null,
  escalationLevel: number,
): RequestedMatrixCandidateResolution {
  const ceilingIndex =
    ceilingTier === null
      ? VALID_DISPATCH_MATRIX_TIERS.length - 1
      : VALID_DISPATCH_MATRIX_TIERS.indexOf(ceilingTier);
  let ceilingCellFound = ceilingTier === null;
  let previousCeiling: ResolvedDispatchRouteTarget | null = null;
  let allowedMatch:
    | {
        tier: WorkflowDispatchMatrixTier;
        candidate: WorkflowDispatchCandidate;
        cellSource: DispatchCeilingSource;
        routeSignature: string;
      }
    | undefined;
  let foundAboveCeiling = false;

  for (const [tierIndex, tier] of VALID_DISPATCH_MATRIX_TIERS.entries()) {
    const definition = resolveProviderMatrixCellDefinition(
      provider,
      tier,
      resolvedConfig,
      projectMatrix,
    );
    if (!definition) {
      continue;
    }
    if (tier === ceilingTier) {
      ceilingCellFound = true;
    }

    const ladder = toWorkflowDispatchCandidateLadder(definition.cell);
    const targets = assertCandidateOrder(provider, tier, ladder);
    const currentCeiling = targets.at(-1)!;
    assertTierCeilingsNondecreasing(
      provider,
      previousCeiling,
      currentCeiling,
      tier,
    );
    previousCeiling = currentCeiling;

    for (const [candidateIndex, target] of targets.entries()) {
      if (!requestedCandidateMatches(provider, requested, target)) {
        continue;
      }
      const candidate = ladder.candidates[candidateIndex]!;
      const routeSignature = JSON.stringify(candidateRoute(candidate));
      if (tierIndex > ceilingIndex) {
        foundAboveCeiling = true;
        continue;
      }
      if (allowedMatch && allowedMatch.routeSignature !== routeSignature) {
        throw new Error(
          `Ambiguous ${provider} candidate ${formatRequestedCandidate(provider, requested)} is configured with multiple routes at or below the ${ceilingTier ?? 'uncapped'} ceiling.`,
        );
      }
      allowedMatch ??= {
        tier,
        candidate,
        cellSource: definition.cellSource,
        routeSignature,
      };
    }
  }

  if (!ceilingCellFound) {
    throw new Error(
      `Exact candidate selection requires a configured ${ceilingTier} candidate ladder for ${provider}.`,
    );
  }
  if (!allowedMatch) {
    const label = formatRequestedCandidate(provider, requested);
    if (foundAboveCeiling) {
      throw new Error(
        `${provider} candidate ${label} is above the configured ${ceilingTier} ceiling.`,
      );
    }
    throw new Error(
      `${provider} candidate ${label} is not present in the configured ${provider} candidate ladders.`,
    );
  }

  const resolution = resolveRouteMatrixCell(
    provider,
    candidateRoute(allowedMatch.candidate),
    escalationLevel,
    allowedMatch.cellSource,
  );
  if (!resolution || resolution.value === null) {
    throw new Error(
      `Configured ${provider} candidate ${formatRequestedCandidate(provider, requested)} cannot compile to an exact dispatch target.`,
    );
  }

  return {
    resolution: {
      ...resolution,
      selectionBranch:
        resolution.selectionBranch === 'escalation-target'
          ? 'escalation-target'
          : 'candidate-requested',
    },
    candidateTier: allowedMatch.tier,
  };
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
      matrixCompatibility: parsedMatrix.compatibilityMatrix,
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
      matrixCompatibility: parsedMatrix.compatibilityMatrix,
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
    matrixCompatibility: parsedMatrix.compatibilityMatrix,
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
    matrixCompatibility: candidate.matrixCompatibility,
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
  if (value === undefined) {
    return 'implementer';
  }
  if (value === 'implementer' || value === 'reviewer') {
    return value;
  }
  throw new Error(
    `Invalid dispatch role ${JSON.stringify(value)}. Expected implementer or reviewer.`,
  );
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

function normalizeCeilingTier(
  value: string | undefined,
  role: CeilingRole,
): WorkflowDispatchMatrixTier | null {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim();
  if (
    !(VALID_DISPATCH_MATRIX_TIERS as readonly string[]).includes(normalized)
  ) {
    throw new Error(
      `Invalid invocation ceiling tier "${normalized}". Valid tiers: ${VALID_DISPATCH_MATRIX_TIERS.join(', ')}.`,
    );
  }
  if (role === 'reviewer') {
    throw new Error(
      'Invocation ceiling tiers are only supported for implementer/fix task dispatch; reviewers use the configured review ceiling.',
    );
  }

  return normalized as WorkflowDispatchMatrixTier;
}

function normalizeRequestedCandidate(
  provider: DispatchCeilingProvider,
  role: CeilingRole,
  options: DispatchCeilingResolveOptions,
): RequestedDispatchCandidate | null {
  const model = options.candidateModel?.trim() ?? '';
  const effort = options.candidateEffort?.trim() ?? '';
  if (!model && !effort) {
    return null;
  }

  if (options.preferred?.trim()) {
    throw new Error(
      'Exact candidate flags cannot be combined with --preferred; use one selection path.',
    );
  }
  if (role === 'reviewer') {
    throw new Error(
      'Reviewer candidate requests are not supported; reviewers use the configured review ceiling.',
    );
  }
  if (!model) {
    throw new Error('--candidate-model is required for an exact candidate.');
  }
  if (isDirectDispatchRoleName(model)) {
    throw new Error(
      'Direct dispatch role names are not candidate models; request the configured provider model and effort instead.',
    );
  }

  if (provider === 'codex') {
    if (!effort) {
      throw new Error(
        '--candidate-effort is required for an exact Codex candidate.',
      );
    }
    if (!CODEX_VALUES.includes(effort as WorkflowCodexDispatchCeiling)) {
      throw new Error(
        `Invalid Codex candidate effort "${effort}". Valid values: ${CODEX_VALUES.join(', ')}.`,
      );
    }
    return { model, effort };
  }

  if (effort) {
    throw new Error(
      `--candidate-effort is only valid for Codex; ${provider} candidates use --candidate-model only.`,
    );
  }
  if (
    provider === 'claude' &&
    !CLAUDE_VALUES.includes(model as WorkflowClaudeDispatchCeiling)
  ) {
    throw new Error(
      `Invalid Claude candidate model "${model}". Valid values: ${CLAUDE_VALUES.join(', ')}.`,
    );
  }

  return { model };
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
    requestedCandidate: policy.requestedCandidate ?? null,
    candidateTier: policy.candidateTier ?? null,
    ceilingTier: policy.ceilingTier ?? policyTier(policy.policy),
    ceilingTarget: policy.ceilingTarget ?? policy.target,
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

  if (policy.requestedCandidate) {
    const selectedValue = policy.target
      ? dispatchValueFromRouteTarget(policy.target)
      : null;
    return {
      ...baseSelection,
      preferredValue: null,
      selectedValue,
      capped: false,
      selectionMode: selectedValue ? 'candidate' : 'unresolved',
      selectionBranch: policy.selectionBranch,
      family: selectionFamily(provider, selectedValue, policy.target),
      target: policy.target,
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
  const targetValue = policy.target
    ? dispatchValueFromRouteTarget(policy.target)
    : null;
  const selectedTarget = targetValue === selectedValue ? policy.target : null;
  return {
    ...baseSelection,
    preferredValue,
    selectedValue,
    capped: preferredIndex > ceilingIndex,
    selectionMode: 'capped',
    selectionBranch: policy.selectionBranch,
    family: selectionFamily(provider, selectedValue, selectedTarget),
    target: selectedTarget,
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
        requestedCandidate: null,
        candidateTier: null,
        ceilingTier: null,
        ceilingTarget: null,
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
  const requestedCandidate = normalizeRequestedCandidate(
    provider,
    role,
    options,
  );
  const preferredValue = normalizePreferredValue(provider, options.preferred);
  const ceilingTier = normalizeCeilingTier(options.ceilingTier, role);
  const escalationLevel = normalizeEscalationLevel(options.escalationLevel);

  const resolvedValue = await resolveCeilingValue(
    provider,
    resolvedConfig,
    projectPath,
    dependencies,
    escalationLevel,
    role,
    preferredValue,
    requestedCandidate,
    ceilingTier,
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
    const incompleteManagedPreflight =
      options.preflight === true &&
      resolvedValue.mode === 'managed' &&
      providerResolution.mode === 'advisory' &&
      providerResolution.selection.target?.crossHarness !== true &&
      providerResolution.selection.selectionMode !== 'no-review-target';

    if (incompleteManagedPreflight) {
      const shouldBlock =
        options.nonInteractive === true ||
        isNonInteractiveEnv(dependencies.processEnv) ||
        (!context.interactive && !context.json);
      const message = shouldBlock ? blockMessage(provider) : undefined;
      return {
        status: shouldBlock ? 'blocked' : 'unresolved',
        provider,
        value: resolvedValue.value,
        policyMode: resolvedValue.mode,
        policy: resolvedValue.policy,
        source: resolvedValue.source,
        preset: resolvedValue.preset,
        unresolved: true,
        projectPath,
        providerDefaultEffort,
        matrix: resolvedValue.matrixCompatibility ?? resolvedValue.matrix,
        providers,
        message,
      };
    }

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
      matrix: resolvedValue.matrixCompatibility ?? resolvedValue.matrix,
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
  matrixCompatibility?: ProjectDispatchMatrix | null;
  cellSource: DispatchCeilingSource | null;
  target: ResolvedDispatchRouteTarget | null;
  selectionBranch: DispatchSelectionBranch;
  warnings: string[];
  requestedCandidate?: RequestedDispatchCandidate;
  candidateTier?: WorkflowDispatchMatrixTier;
  ceilingTier?: WorkflowDispatchMatrixTier;
  ceilingTarget?: ResolvedDispatchRouteTarget | null;
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
  requestedCandidate: RequestedDispatchCandidate | null,
  invocationCeilingTier: WorkflowDispatchMatrixTier | null,
): Promise<ResolvedCeilingValue | null> {
  const configCeiling = readResolvedConfigCeiling(provider, resolvedConfig);
  const projectCeiling = await resolveProjectStateCeiling(
    provider,
    projectPath,
    dependencies,
  );

  let baseCeiling = configCeiling ?? projectCeiling;
  if (!baseCeiling) {
    return null;
  }

  if (invocationCeilingTier) {
    baseCeiling = {
      ...baseCeiling,
      mode: 'managed',
      policy: invocationCeilingTier,
      value: compiledPolicyValueForProvider(
        provider,
        compileDispatchPolicyPreset(invocationCeilingTier),
      ),
      source: 'invocation',
      preset: invocationCeilingTier,
      matrix: projectCeiling?.matrix ?? baseCeiling.matrix,
      matrixCompatibility:
        projectCeiling?.matrixCompatibility ?? baseCeiling.matrixCompatibility,
      cellSource: null,
      target: null,
      selectionBranch: 'prompt-persisted',
      ceilingTier: invocationCeilingTier,
      ceilingTarget: null,
    };
  }

  if (baseCeiling.mode === 'inherit') {
    if (requestedCandidate) {
      throw new Error(
        'Exact candidate selection requires a managed dispatch policy and configured candidate ladder.',
      );
    }
    return baseCeiling;
  }

  if (requestedCandidate) {
    if (baseCeiling.policy === 'legacy-ceiling') {
      throw new Error(
        'Exact candidate selection requires a configured candidate ladder; legacy scalar dispatch ceilings support --preferred only during migration.',
      );
    }
    const ceilingTier = policyTier(baseCeiling.policy);
    const selected = resolveRequestedMatrixCandidate(
      provider,
      requestedCandidate,
      ceilingTier,
      resolvedConfig,
      projectCeiling?.matrix ?? null,
      escalationLevel,
    );
    const ceilingCell = ceilingTier
      ? resolveProviderMatrixCell(
          provider,
          ceilingTier,
          resolvedConfig,
          projectCeiling?.matrix ?? null,
          escalationLevel,
        )
      : null;
    return {
      ...baseCeiling,
      value: ceilingCell?.value ?? baseCeiling.value,
      cellSource: selected.resolution.cellSource,
      target: selected.resolution.target,
      selectionBranch: selected.resolution.selectionBranch,
      warnings: [
        ...baseCeiling.warnings,
        ...(ceilingCell?.warnings ?? []),
        ...selected.resolution.warnings,
      ],
      requestedCandidate,
      candidateTier: selected.candidateTier,
      ceilingTarget: ceilingCell?.target ?? null,
      ...(ceilingTier ? { ceilingTier } : {}),
    };
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
    if (
      provider === 'codex' &&
      role === 'implementer' &&
      preferredValue !== null &&
      matrixCell.value !== null
    ) {
      const order = providerValueOrder(provider);
      const preferredIndex = order?.indexOf(preferredValue) ?? -1;
      const ceilingIndex = order?.indexOf(matrixCell.value) ?? -1;
      if (order && preferredIndex >= 0 && ceilingIndex >= 0) {
        const selectedValue = order[Math.min(preferredIndex, ceilingIndex)]!;
        if (selectedValue !== matrixCell.value) {
          const selectedTarget =
            matrixCell.target?.harness === 'codex'
              ? { ...matrixCell.target, effort: selectedValue }
              : matrixCell.target;
          return {
            ...baseCeiling,
            value: matrixCell.value,
            cellSource: matrixCell.cellSource,
            target: selectedTarget,
            selectionBranch: matrixCell.selectionBranch,
            warnings: [...baseCeiling.warnings, ...matrixCell.warnings],
          };
        }
      }
    }

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
    if (providerResolution.selection.requestedCandidate) {
      const requested = providerResolution.selection.requestedCandidate;
      context.logger.info(
        `Requested candidate: model=${requested.model}${requested.effort ? ` effort=${requested.effort}` : ''}`,
      );
      context.logger.info(
        `Candidate tier: ${providerResolution.selection.candidateTier ?? 'none'}; ceiling tier: ${providerResolution.selection.ceilingTier ?? 'uncapped'}`,
      );
      const ceilingTarget = providerResolution.selection.ceilingTarget;
      if (ceilingTarget) {
        context.logger.info(
          `Effective ceiling target: model=${ceilingTarget.model ?? 'none'}${ceilingTarget.effort ? ` effort=${ceilingTarget.effort}` : ''}`,
        );
      }
    }
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
      .addOption(
        new Option(
          '--role <role>',
          'Dispatch role for variant compilation: implementer (default) or reviewer',
        ).choices(['implementer', 'reviewer']),
      )
      .option(
        '--orchestrator-tier <tier>',
        'Orchestrator tier, used to flag verify-on-upgrade for above-orchestrator requests',
      )
      .option(
        '--preferred <value>',
        'Legacy preferred implementer/fix value before applying the resolved policy',
      )
      .addOption(
        new Option(
          '--ceiling-tier <tier>',
          'Invocation-only named maximum tier; never persists configuration or project state',
        ).choices([...VALID_DISPATCH_MATRIX_TIERS]),
      )
      .option(
        '--candidate-model <model>',
        'Exact configured implementer candidate model beneath the named ceiling',
      )
      .option(
        '--candidate-effort <effort>',
        'Exact configured Codex candidate effort paired with --candidate-model',
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
