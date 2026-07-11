export type WorkflowDispatchMatrixTier =
  | 'economy'
  | 'balanced'
  | 'high'
  | 'frontier';

export interface WorkflowDispatchRouteTarget {
  harness?: string;
  model?: string;
  effort?: string;
}

export interface DispatchRouteTargetValidation {
  valid: boolean;
  reason?: string;
}

export type WorkflowDispatchRouteEntry = string | WorkflowDispatchRouteTarget;
export type WorkflowDispatchRoute = WorkflowDispatchRouteEntry[];

export interface WorkflowDispatchFallbackRoute {
  route: WorkflowDispatchRoute;
}

export type WorkflowDispatchCandidate =
  | WorkflowDispatchRouteEntry
  | WorkflowDispatchFallbackRoute;

export interface WorkflowDispatchCandidateLadder {
  candidates: WorkflowDispatchCandidate[];
}

export type WorkflowDispatchLegacyMatrixCell = string | WorkflowDispatchRoute;
export type WorkflowDispatchMatrixCell =
  | WorkflowDispatchCandidateLadder
  | WorkflowDispatchLegacyMatrixCell;
export type WorkflowDispatchProviderValue =
  | string
  | Partial<Record<WorkflowDispatchMatrixTier, WorkflowDispatchMatrixCell>>;

export type DispatchMatrixNormalizationIssueKind =
  | 'malformed-provider'
  | 'malformed-tier'
  | 'malformed-candidate';

export interface DispatchMatrixNormalizationIssue {
  path: string;
  kind: DispatchMatrixNormalizationIssueKind;
  value: unknown;
}

export interface NormalizedDispatchMatrix {
  providers: Record<string, WorkflowDispatchProviderValue>;
  issues: DispatchMatrixNormalizationIssue[];
}

export type DispatchMatrixSource =
  | 'local-config'
  | 'repo-config'
  | 'user-config'
  | 'project-state';

export interface DispatchMatrixWalkContext {
  source: DispatchMatrixSource;
  pathPrefix: string;
}

export interface DispatchMatrixCellRef {
  provider: string;
  tier: WorkflowDispatchMatrixTier | null;
  candidateIndex: number | null;
  fallbackRouteIndex: number | null;
  value: string | null;
  target: WorkflowDispatchRouteTarget | null;
  path: string;
  source: DispatchMatrixSource;
}

export const VALID_DISPATCH_MATRIX_TIERS: readonly WorkflowDispatchMatrixTier[] =
  ['economy', 'balanced', 'high', 'frontier'];

const VALID_CODEX_PROVIDER_SCALARS = new Set([
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]);
const VALID_CLAUDE_PROVIDER_SCALARS = new Set([
  'haiku',
  'sonnet',
  'opus',
  'fable',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeProviderScalar(
  provider: string,
  value: unknown,
): string | undefined {
  const scalar = trimNonEmptyString(value);
  if (scalar === undefined) {
    return undefined;
  }

  if (provider === 'codex' && !VALID_CODEX_PROVIDER_SCALARS.has(scalar)) {
    return undefined;
  }
  if (provider === 'claude' && !VALID_CLAUDE_PROVIDER_SCALARS.has(scalar)) {
    return undefined;
  }

  return scalar;
}

function normalizeRouteTarget(
  value: unknown,
): WorkflowDispatchRouteTarget | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const target: WorkflowDispatchRouteTarget = {};
  const harness = trimNonEmptyString(value.harness);
  const model = trimNonEmptyString(value.model);
  const effort = trimNonEmptyString(value.effort);
  if (harness !== undefined) {
    target.harness = harness;
  }
  if (model !== undefined) {
    target.model = model;
  }
  if (effort !== undefined) {
    target.effort = effort;
  }

  return Object.keys(target).length > 0 ? target : undefined;
}

function pushMalformedCandidate(
  issues: DispatchMatrixNormalizationIssue[],
  path: string,
  value: unknown,
): void {
  issues.push({ path, kind: 'malformed-candidate', value });
}

function normalizeRoute(
  provider: string,
  value: unknown,
  path: string,
  issues: DispatchMatrixNormalizationIssue[],
): WorkflowDispatchRoute | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const route: WorkflowDispatchRoute = [];
  for (const [index, entry] of value.entries()) {
    const scalar = normalizeProviderScalar(provider, entry);
    if (scalar !== undefined) {
      route.push(scalar);
      continue;
    }

    const target = normalizeRouteTarget(entry);
    if (target !== undefined) {
      route.push(target);
      continue;
    }

    pushMalformedCandidate(issues, `${path}[${index}]`, entry);
  }

  return route.length > 0 ? route : undefined;
}

function normalizeCandidate(
  provider: string,
  value: unknown,
  path: string,
  issues: DispatchMatrixNormalizationIssue[],
): WorkflowDispatchCandidate | undefined {
  const scalar = normalizeProviderScalar(provider, value);
  if (scalar !== undefined) {
    return scalar;
  }

  if (isRecord(value) && Object.hasOwn(value, 'route')) {
    const issueCount = issues.length;
    const route = normalizeRoute(
      provider,
      value.route,
      `${path}.route`,
      issues,
    );
    if (route !== undefined) {
      return { route };
    }
    if (issues.length === issueCount) {
      pushMalformedCandidate(issues, path, value);
    }
    return undefined;
  }

  const target = normalizeRouteTarget(value);
  if (target !== undefined) {
    return target;
  }

  pushMalformedCandidate(issues, path, value);
  return undefined;
}

function normalizeMatrixCell(
  provider: string,
  value: unknown,
  path: string,
  issues: DispatchMatrixNormalizationIssue[],
  compatibilityMode: 'layered-config' | 'project-state',
): WorkflowDispatchCandidateLadder | undefined {
  const scalar = normalizeProviderScalar(provider, value);
  if (scalar !== undefined) {
    return { candidates: [scalar] };
  }

  if (isWorkflowDispatchCandidateLadder(value)) {
    const candidates: WorkflowDispatchCandidate[] = [];
    for (const [index, candidate] of value.candidates.entries()) {
      const normalized = normalizeCandidate(
        provider,
        candidate,
        `${path}.candidates[${index}]`,
        issues,
      );
      if (normalized !== undefined) {
        candidates.push(normalized);
      }
    }
    if (value.candidates.length === 0) {
      pushMalformedCandidate(issues, path, value);
    }
    return candidates.length > 0 ? { candidates } : undefined;
  }

  if (compatibilityMode === 'layered-config') {
    const target = normalizeRouteTarget(value);
    if (target !== undefined) {
      return { candidates: [target] };
    }
  }

  if (Array.isArray(value)) {
    const issueCount = issues.length;
    const route = normalizeRoute(provider, value, path, issues);
    if (route !== undefined) {
      return { candidates: [{ route }] };
    }
    if (issues.length === issueCount) {
      pushMalformedCandidate(issues, path, value);
    }
    return undefined;
  }

  pushMalformedCandidate(issues, path, value);
  return undefined;
}

export function normalizeDispatchMatrix(
  value: unknown,
  options: {
    pathPrefix: string;
    compatibilityMode: 'layered-config' | 'project-state';
  },
): NormalizedDispatchMatrix {
  const providers: Record<string, WorkflowDispatchProviderValue> = {};
  const issues: DispatchMatrixNormalizationIssue[] = [];
  if (!isRecord(value)) {
    return {
      providers,
      issues: [
        {
          path: options.pathPrefix,
          kind: 'malformed-provider',
          value,
        },
      ],
    };
  }

  for (const [provider, rawProviderValue] of Object.entries(value)) {
    const providerPath = `${options.pathPrefix}.${provider}`;
    const scalar = normalizeProviderScalar(provider, rawProviderValue);
    if (scalar !== undefined) {
      providers[provider] = scalar;
      continue;
    }

    if (!isRecord(rawProviderValue)) {
      issues.push({
        path: providerPath,
        kind: 'malformed-provider',
        value: rawProviderValue,
      });
      continue;
    }

    const tiers: Partial<
      Record<WorkflowDispatchMatrixTier, WorkflowDispatchCandidateLadder>
    > = {};
    for (const [tier, rawCell] of Object.entries(rawProviderValue)) {
      const tierPath = `${providerPath}.${tier}`;
      if (!(VALID_DISPATCH_MATRIX_TIERS as readonly string[]).includes(tier)) {
        issues.push({ path: tierPath, kind: 'malformed-tier', value: rawCell });
        continue;
      }

      const normalized = normalizeMatrixCell(
        provider,
        rawCell,
        tierPath,
        issues,
        options.compatibilityMode,
      );
      if (normalized !== undefined) {
        tiers[tier as WorkflowDispatchMatrixTier] = normalized;
      }
    }

    if (Object.keys(tiers).length > 0) {
      providers[provider] = tiers;
    } else if (Object.keys(rawProviderValue).length === 0) {
      issues.push({
        path: providerPath,
        kind: 'malformed-provider',
        value: rawProviderValue,
      });
    }
  }

  return { providers, issues };
}

export function isCodexMaterializedRouteTarget(
  provider: string,
  target: WorkflowDispatchRouteTarget,
): boolean {
  return (target.harness ?? provider) === 'codex';
}

export function validateDispatchRouteTarget(
  provider: string,
  target: WorkflowDispatchRouteTarget,
): DispatchRouteTargetValidation {
  if (!isCodexMaterializedRouteTarget(provider, target)) {
    return { valid: true };
  }

  if (!target.model || !target.effort) {
    return {
      valid: false,
      reason:
        'Codex materialized dispatch targets must provide both model and effort.',
    };
  }

  return { valid: true };
}

export function isWorkflowDispatchFallbackRoute(
  value: unknown,
): value is WorkflowDispatchFallbackRoute {
  return isRecord(value) && Array.isArray(value.route);
}

export function isWorkflowDispatchCandidateLadder(
  value: unknown,
): value is WorkflowDispatchCandidateLadder {
  return isRecord(value) && Array.isArray(value.candidates);
}

export function toWorkflowDispatchCandidateLadder(
  cell: WorkflowDispatchMatrixCell,
): WorkflowDispatchCandidateLadder {
  if (isWorkflowDispatchCandidateLadder(cell)) {
    return cell;
  }

  return {
    candidates: [Array.isArray(cell) ? { route: cell } : cell],
  };
}

function appendRef(
  refs: DispatchMatrixCellRef[],
  provider: string,
  tier: WorkflowDispatchMatrixTier | null,
  candidateIndex: number | null,
  fallbackRouteIndex: number | null,
  entry: WorkflowDispatchRouteEntry,
  path: string,
  source: DispatchMatrixSource,
): void {
  refs.push({
    provider,
    tier,
    candidateIndex,
    fallbackRouteIndex,
    value: typeof entry === 'string' ? entry : null,
    target: typeof entry === 'string' ? null : entry,
    path,
    source,
  });
}

export function walkDispatchMatrix(
  providers: Record<string, WorkflowDispatchProviderValue>,
  context: DispatchMatrixWalkContext,
): DispatchMatrixCellRef[] {
  const refs: DispatchMatrixCellRef[] = [];
  for (const [provider, providerValue] of Object.entries(providers)) {
    const providerPath = `${context.pathPrefix}.${provider}`;
    if (typeof providerValue === 'string') {
      appendRef(
        refs,
        provider,
        null,
        null,
        null,
        providerValue,
        providerPath,
        context.source,
      );
      continue;
    }

    for (const tier of VALID_DISPATCH_MATRIX_TIERS) {
      const cell = providerValue[tier];
      if (cell === undefined) {
        continue;
      }
      const ladder = toWorkflowDispatchCandidateLadder(cell);
      for (const [candidateIndex, candidate] of ladder.candidates.entries()) {
        const candidatePath = `${providerPath}.${tier}.candidates[${candidateIndex}]`;
        if (isWorkflowDispatchFallbackRoute(candidate)) {
          for (const [routeIndex, entry] of candidate.route.entries()) {
            appendRef(
              refs,
              provider,
              tier,
              candidateIndex,
              routeIndex,
              entry,
              `${candidatePath}.route[${routeIndex}]`,
              context.source,
            );
          }
          continue;
        }

        appendRef(
          refs,
          provider,
          tier,
          candidateIndex,
          null,
          candidate,
          candidatePath,
          context.source,
        );
      }
    }
  }

  return refs;
}
