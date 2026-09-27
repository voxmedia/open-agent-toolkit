import type {
  ManagedContentKind,
  ProviderCatalogRefreshPolicy,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';

import type {
  ProviderExtensionOperationEvidence,
  ProviderSyncOperationEvidence,
} from './provider-reachability';

/**
 * Per-provider refresh advice as the sync run reports it.
 *
 * Structurally mirrors the `providerRefreshAdvice` entries in the sync JSON
 * payload. The tools lifecycle consumes that payload; it never reshapes it.
 */
export interface SyncProviderRefreshAdvice {
  scope: ConcreteScope;
  provider: string;
  contentKind: ManagedContentKind;
  visibility?: {
    state?: string;
    reason?: string;
    policy?: ProviderCatalogRefreshPolicy;
  };
}

/** Normalized evidence from one sync run at one scope. */
export interface SyncRunEvidence {
  scope: ConcreteScope;
  ran: boolean;
  /**
   * The run's aggregate failure count from `summary.failed`.
   *
   * Carried separately because a sync can fail without throwing and without
   * emitting a per-operation `failed` result: a rejected collection counts as
   * a failure but is not a planned operation.
   */
  failedOperations: number;
  operationResults: readonly ProviderSyncOperationEvidence[];
  extensionResults: readonly ProviderExtensionOperationEvidence[];
  refreshAdvice: readonly SyncProviderRefreshAdvice[];
}

export function emptySyncRunEvidence(scope: ConcreteScope): SyncRunEvidence {
  return {
    scope,
    ran: false,
    failedOperations: 0,
    operationResults: [],
    extensionResults: [],
    refreshAdvice: [],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const SOURCED_REFRESH_STATES: ReadonlySet<string> = new Set([
  'live',
  'manual-refresh',
  'restart-required',
]);
const REFRESH_PROVENANCE_KINDS: ReadonlySet<string> = new Set([
  'official-contract',
  'validated-local-behavior',
  'repository-decision',
]);

/**
 * Validates a catalog-refresh policy from sync advice.
 *
 * The advice policy outranks the registered capability policy in the
 * lifecycle projection, and `visibilityFor` switches exhaustively over its
 * state with a `never` default that throws. An unrecognized state or a policy
 * missing its required fields must therefore never reach that switch: it is
 * dropped here so the projection falls back to the registry policy.
 */
function asRefreshPolicy(
  value: unknown,
): ProviderCatalogRefreshPolicy | undefined {
  const policy = asRecord(value);
  const state = asString(policy?.state);
  if (!policy || state === undefined) return undefined;

  if (state === 'unknown') {
    const reason = asString(policy.reason);
    return reason === undefined ? undefined : { state, reason };
  }

  if (!SOURCED_REFRESH_STATES.has(state)) return undefined;
  const provenance = asRecord(policy.provenance);
  const kind = asString(provenance?.kind);
  const reference = asString(provenance?.reference);
  const verifiedAt = asString(provenance?.verifiedAt);
  if (
    !provenance ||
    kind === undefined ||
    !REFRESH_PROVENANCE_KINDS.has(kind) ||
    reference === undefined ||
    verifiedAt === undefined ||
    (provenance.providerVersion !== undefined &&
      asString(provenance.providerVersion) === undefined)
  ) {
    return undefined;
  }
  return {
    state: state as 'live' | 'manual-refresh' | 'restart-required',
    provenance: {
      kind: kind as Extract<
        ProviderCatalogRefreshPolicy,
        { provenance: unknown }
      >['provenance']['kind'],
      reference,
      verifiedAt,
      ...(asString(provenance.providerVersion) !== undefined
        ? { providerVersion: asString(provenance.providerVersion)! }
        : {}),
    },
  };
}

/**
 * Normalizes a captured sync JSON payload into reachability inputs.
 *
 * Defensive rather than trusting: the payload shape is owned by the sync
 * command, so an absent or renamed field degrades to "no evidence" instead of
 * throwing inside a lifecycle operation that already succeeded.
 */
export function normalizeSyncEvidence(
  scope: ConcreteScope,
  payload: unknown,
): SyncRunEvidence {
  const record = asRecord(payload);
  if (record === null) return { ...emptySyncRunEvidence(scope), ran: true };
  const summary = asRecord(record.summary);
  const failedOperations =
    typeof summary?.failed === 'number' ? summary.failed : 0;

  const operationResults = asArray(record.operationResults).flatMap(
    (entry): ProviderSyncOperationEvidence[] => {
      const operation = asRecord(entry);
      const provider = asString(operation?.provider);
      const status = asString(operation?.status);
      // `contentKind` is required on the same footing as `provider` and
      // `status`: defaulting it would let an operation of unknown kind be
      // attributed to a skill row it never touched. An absent field is
      // dropped rather than guessed.
      const contentKind = asString(operation?.contentKind);
      if (
        !operation ||
        provider === undefined ||
        status === undefined ||
        contentKind === undefined
      ) {
        return [];
      }
      return [
        {
          provider,
          scope:
            (asString(operation.scope) as ConcreteScope | undefined) ?? scope,
          contentKind:
            contentKind as ProviderSyncOperationEvidence['contentKind'],
          asset: asString(operation.asset) ?? '',
          status: status as ProviderSyncOperationEvidence['status'],
          ...(asString(operation.failure) !== undefined
            ? { failure: asString(operation.failure)! }
            : {}),
        },
      ];
    },
  );

  const extensionResults = asArray(record.materializationExtensions).flatMap(
    (entry): ProviderExtensionOperationEvidence[] => {
      const extension = asRecord(entry);
      const provider = asString(extension?.provider);
      if (!extension || provider === undefined) return [];
      return asArray(
        extension.operationResults ?? extension.operations,
      ).flatMap((candidate): ProviderExtensionOperationEvidence[] => {
        const operation = asRecord(candidate);
        const status = asString(operation?.status);
        if (!operation || status === undefined) return [];
        return [
          {
            provider,
            scope:
              (asString(extension.scope) as ConcreteScope | undefined) ?? scope,
            // Extension operations carry no canonical content kind; the
            // registered extensions materialize agent roles.
            contentKind: 'agent',
            ...(asString(operation.target) !== undefined
              ? { target: asString(operation.target)! }
              : {}),
            ...(asString(operation.path) !== undefined
              ? { path: asString(operation.path)! }
              : {}),
            status: status as ProviderExtensionOperationEvidence['status'],
            ...(asString(operation.failure) !== undefined
              ? { failure: asString(operation.failure)! }
              : {}),
          },
        ];
      });
    },
  );

  const refreshAdvice = asArray(record.providerRefreshAdvice).flatMap(
    (entry): SyncProviderRefreshAdvice[] => {
      const advice = asRecord(entry);
      const provider = asString(advice?.provider);
      const contentKind = asString(advice?.contentKind);
      if (!advice || provider === undefined || contentKind === undefined) {
        return [];
      }
      const visibility = asRecord(advice.visibility);
      const policy = asRefreshPolicy(visibility?.policy);
      return [
        {
          provider,
          scope: (asString(advice.scope) as ConcreteScope | undefined) ?? scope,
          contentKind: contentKind as ManagedContentKind,
          ...(visibility
            ? {
                visibility: {
                  ...(asString(visibility.state) !== undefined
                    ? { state: asString(visibility.state)! }
                    : {}),
                  ...(asString(visibility.reason) !== undefined
                    ? { reason: asString(visibility.reason)! }
                    : {}),
                  ...(policy !== undefined ? { policy } : {}),
                },
              }
            : {}),
        },
      ];
    },
  );

  return {
    scope,
    ran: true,
    failedOperations,
    operationResults,
    extensionResults,
    refreshAdvice,
  };
}

/**
 * Builds a refresh-policy lookup from observed sync advice.
 *
 * Returns `undefined` for a provider the run reported nothing about, so the
 * mapper falls back to the registered registry policy rather than inventing
 * one.
 */
export function refreshPolicyFromAdvice(
  advice: readonly SyncProviderRefreshAdvice[],
): (input: {
  provider: string;
  scope: ConcreteScope;
  contentKind: ManagedContentKind;
}) => ProviderCatalogRefreshPolicy | undefined {
  return ({ provider, scope, contentKind }) =>
    advice.find(
      (candidate) =>
        candidate.provider === provider &&
        candidate.scope === scope &&
        candidate.contentKind === contentKind,
    )?.visibility?.policy;
}
