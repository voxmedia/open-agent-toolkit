import type { SyncOperationResult } from '@engine/engine.types';
import type { MaterializationOperationResult } from '@providers/shared/materialization-extension';
import type {
  ManagedContentKind,
  ProviderCatalogRefreshPolicy,
  ProviderContentCapability,
  ProviderProjectionMode,
  ProviderScopeContext,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';

import type {
  ProviderMaterializationState,
  ProviderReachabilityEvidence,
  ProviderVisibilityState,
  RecoveryAction,
} from './pack-evidence';

/**
 * Maps config-aware provider registry state onto per-pack reachability
 * evidence.
 *
 * Per DR-260831 the reachability decision is registry- and config-derived:
 * activation comes from `ProviderScopeContext.activation` (sync config plus
 * adapter detection), capability and refresh policy come from the registered
 * `ProviderContentCapability` rows, and projection/materialization come from
 * the sync run's own operation results. The mapper never probes the
 * filesystem for a provider directory to decide that a provider is reachable.
 *
 * The one absence signal that originates outside the registry is
 * `unmaterializedAssets`: the pack inventory's list of managed assets that
 * have no provider materialization. That list is an inventory observation
 * about assets, not a reachability claim about a provider — the mapper still
 * decides *which* providers are responsible for it from registry capability
 * alone, and attributes it to none when no active provider supports the
 * scope and content kind.
 */

/** A sync operation result narrowed to the fields reachability needs. */
export type ProviderSyncOperationEvidence = Pick<
  SyncOperationResult,
  'provider' | 'contentKind' | 'asset' | 'status'
> & {
  scope: ConcreteScope;
  failure?: string;
};

/** A materialization-extension result narrowed the same way. */
export type ProviderExtensionOperationEvidence = Pick<
  MaterializationOperationResult,
  'provider' | 'status'
> & {
  scope: ConcreteScope;
  contentKind?: ManagedContentKind;
  path?: string;
  /**
   * `role` targets one managed entry; `config` targets the provider's shared
   * aggregate configuration, which every managed role for that provider
   * depends on.
   */
  target?: string;
  failure?: string;
};

/** Optional per-provider refresh-policy override observed by a sync run. */
export type ProviderRefreshPolicyLookup = (input: {
  provider: string;
  scope: ConcreteScope;
  contentKind: ManagedContentKind;
}) => ProviderCatalogRefreshPolicy | undefined;

export interface ProviderReachabilityInput {
  /** Config-aware activation, detection, and registrations for one scope. */
  providerScopeContext: ProviderScopeContext;
  /** Content kinds the pack actually places at this scope, with their assets. */
  assets: Readonly<Partial<Record<ManagedContentKind, readonly string[]>>>;
  /** Registry capability rows; defaults to each registration's own rows. */
  capabilities?: readonly ProviderContentCapability[];
  /** Core sync operation results for this scope, when a sync ran. */
  syncOperationResults?: readonly ProviderSyncOperationEvidence[];
  /** Materialization-extension results for this scope, when a sync ran. */
  extensionResults?: readonly ProviderExtensionOperationEvidence[];
  /** Overrides the registry catalog-refresh policy with observed advice. */
  refreshPolicy?: ProviderRefreshPolicyLookup;
  /**
   * `lifecycle` means a sync actually ran and its results are authoritative.
   * `inventory` is a read-only surface that observed no sync.
   */
  mode: 'lifecycle' | 'inventory';
  /**
   * `false` records that auto-sync was disabled or skipped: no projection or
   * materialization claim can be made, so no diagnostic is produced.
   */
  syncRan?: boolean;
  /** Managed assets the pack inventory reports as unmaterialized. */
  unmaterializedAssets?: Readonly<
    Partial<Record<ManagedContentKind, readonly string[]>>
  >;
}

const CONTENT_KIND_ORDER: readonly ManagedContentKind[] = [
  'skill',
  'agent',
  'rule',
  'directory',
];

function projectionModeFor(
  capability: ProviderContentCapability,
): ProviderProjectionMode | null {
  return (
    capability.projectionModes.find((mode) => mode !== 'unsupported') ?? null
  );
}

/**
 * Maps a registered catalog-refresh policy onto visibility evidence.
 *
 * The switch is exhaustive with a `never` default rather than a fall-through:
 * a policy state added later must fail to compile instead of silently
 * becoming "needs a new session", which would be advice this repository never
 * sourced.
 */
function visibilityFor(
  policy: ProviderCatalogRefreshPolicy,
  provider: string,
): { state: ProviderVisibilityState; reason: string } {
  switch (policy.state) {
    case 'unknown':
      return { state: 'unknown', reason: policy.reason };
    case 'live':
      return {
        state: 'live',
        reason: `${provider} reads the projected content without a refresh`,
      };
    case 'manual-refresh':
      return {
        state: 'manual-refresh',
        reason: `${provider} needs a catalog refresh before the change is visible`,
      };
    case 'restart-required':
      return {
        state: 'restart-required',
        reason: `${provider} needs a new session before the change is visible`,
      };
    default: {
      const unhandled: never = policy;
      throw new Error(
        `Unhandled provider catalog refresh state: ${JSON.stringify(unhandled)}`,
      );
    }
  }
}

function syncRecovery(scope: ConcreteScope): RecoveryAction {
  return {
    code: 'run-sync',
    command: `oat sync --scope ${scope}`,
    message: `Run sync for ${scope} scope to materialize provider views.`,
  };
}

function recoveryFor(input: {
  provider: string;
  scope: ConcreteScope;
  activationState: 'active' | 'inactive';
  support: ProviderContentCapability['support'];
  materialization: ProviderMaterializationState;
  visibility: ProviderVisibilityState;
  projected: boolean;
}): RecoveryAction[] {
  if (input.activationState === 'inactive') {
    return [
      {
        code: 'enable-provider',
        message: `Enable ${input.provider} in the ${input.scope} sync config to project content to it.`,
      },
    ];
  }
  if (input.support !== 'supported') return [];
  if (input.materialization === 'failed') {
    return [
      {
        code: 'retry-sync',
        command: `oat sync --scope ${input.scope}`,
        message: `Re-run sync for ${input.provider} and inspect the reported failure.`,
      },
    ];
  }
  if (input.materialization === 'missing') return [syncRecovery(input.scope)];
  if (!input.projected) return [];
  if (input.visibility === 'manual-refresh') {
    return [
      {
        code: 'refresh-provider-catalog',
        message: `Refresh the ${input.provider} catalog to see the updated content.`,
      },
    ];
  }
  if (input.visibility === 'restart-required') {
    return [
      {
        code: 'restart-provider-session',
        message: `Start a new ${input.provider} session to see the updated content.`,
      },
    ];
  }
  if (input.visibility === 'unknown') {
    return [
      {
        code: 'verify-provider-visibility',
        message: `Verify in ${input.provider} that the content is listed; no sourced refresh contract is registered.`,
      },
    ];
  }
  return [];
}

/**
 * Projects one reachability row per active-or-registered provider and per
 * content kind the pack places at this scope.
 */
export function projectProviderReachability(
  input: ProviderReachabilityInput,
): ProviderReachabilityEvidence[] {
  const { providerScopeContext: context } = input;
  const scope = context.scope;
  const active = new Set(context.activeProviders);
  const kinds = CONTENT_KIND_ORDER.filter(
    (kind) => (input.assets[kind]?.length ?? 0) > 0,
  );
  const evidence: ProviderReachabilityEvidence[] = [];

  for (const registration of context.registrations) {
    const provider = registration.adapter.name;
    const activation = context.activation.find(
      (candidate) => candidate.provider === provider,
    );
    const activationState = active.has(provider) ? 'active' : 'inactive';
    const capabilities = input.capabilities ?? registration.capabilities;

    for (const contentKind of kinds) {
      const assets = input.assets[contentKind] ?? [];
      const capability = capabilities.find(
        (candidate) =>
          candidate.scope === scope && candidate.contentKind === contentKind,
      );
      const support = capability?.support ?? 'unknown';
      const projectionModes = capability?.projectionModes ?? [];
      const capabilityReason =
        capability === undefined
          ? `${provider} registers no ${scope} ${contentKind} capability`
          : (capability.unsupportedReason ??
            `${provider} projects ${scope} ${contentKind} content via ${projectionModes.join(', ') || 'no mode'}`);

      let materialization: {
        state: ProviderMaterializationState;
        detail: string;
      };
      if (activationState === 'inactive' || support !== 'supported') {
        materialization = {
          state: 'not-applicable',
          detail:
            activationState === 'inactive'
              ? `${provider} is inactive for ${scope} scope`
              : capabilityReason,
        };
      } else if (input.mode === 'lifecycle' && input.syncRan === false) {
        materialization = {
          state: 'not-applicable',
          detail: 'No sync ran for this operation',
        };
      } else if (input.mode === 'lifecycle') {
        materialization = observedMaterialization({
          provider,
          scope,
          contentKind,
          assets,
          syncOperationResults: input.syncOperationResults ?? [],
          extensionResults: input.extensionResults ?? [],
        });
      } else {
        const unmaterialized = input.unmaterializedAssets?.[contentKind] ?? [];
        materialization =
          unmaterialized.length > 0
            ? {
                state: 'missing',
                detail: `${provider} has no ${scope} ${contentKind} materialization for ${unmaterialized.length} managed asset(s)`,
              }
            : {
                // A read-only surface observed no sync. The pack inventory can
                // report a positive absence, but its silence is not evidence
                // that the provider view exists: claiming `materialized` here
                // would assert reachability nothing established, which is
                // exactly what DR-260831 forbids. Silence stays a non-claim.
                state: 'not-applicable',
                detail: `No sync was observed for ${provider} ${scope} ${contentKind} content`,
              };
      }

      const policy = input.refreshPolicy?.({ provider, scope, contentKind }) ??
        capability?.catalogRefresh ?? {
          state: 'unknown' as const,
          reason: `No ${provider} ${scope} ${contentKind} refresh contract is registered`,
        };
      const reachable = activationState === 'active' && support === 'supported';
      // Projection and materialization already collapse to `not-applicable`
      // for a provider that is inactive or cannot carry this content kind.
      // Visibility follows them: refresh or restart advice about a provider
      // that is not even active reads as guidance the user should act on.
      const visibility = reachable
        ? visibilityFor(policy, provider)
        : {
            state: 'not-applicable' as const,
            reason:
              activationState === 'inactive'
                ? `${provider} is inactive for ${scope} scope, so it has no catalog visibility`
                : `${provider} does not project ${scope} ${contentKind} content, so it has no catalog visibility`,
          };
      const projected = materialization.state === 'materialized';
      const projectionState =
        activationState === 'inactive' || support !== 'supported'
          ? ('not-applicable' as const)
          : projected
            ? ('projected' as const)
            : materialization.state === 'missing'
              ? ('absent' as const)
              : ('not-applicable' as const);

      evidence.push({
        provider,
        scope,
        contentKind,
        assets:
          materialization.state === 'missing'
            ? (input.unmaterializedAssets?.[contentKind] ?? assets)
            : assets,
        activation: {
          state: activationState,
          source: activation?.source ?? 'undetected-unset',
          reason:
            activation?.reason ??
            `${provider} has no recorded activation evidence`,
        },
        capability: {
          support,
          projectionModes,
          reason: capabilityReason,
        },
        projection: {
          state: projectionState,
          mode:
            projectionState === 'not-applicable' || capability === undefined
              ? null
              : projectionModeFor(capability),
        },
        materialization,
        visibility,
        recovery: recoveryFor({
          provider,
          scope,
          activationState,
          support,
          materialization: materialization.state,
          visibility: visibility.state,
          projected,
        }),
      });
    }
  }
  return evidence;
}

/**
 * Materialization state observed from a sync run's own operation results.
 *
 * A sync that ran and planned nothing for this provider and content kind is
 * not evidence of a missing projection, so it stays a non-claim rather than
 * becoming a warning that would flip a healthy pack evidence block to
 * `partial`.
 */
/**
 * Canonical identity of an asset path.
 *
 * Sync operation results identify an asset by its canonical entry name, while
 * a pack inventory row carries the asset's filesystem path. Comparing the
 * final path segment is what keeps one pack's operation from being attributed
 * to a different pack that merely shares a content kind.
 */
function canonicalAssetName(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.[^.]+$/, '');
}

function operationBelongsToAssets(
  identity: string | undefined,
  assetNames: ReadonlySet<string>,
): boolean {
  // An operation with no usable identity cannot be attributed to a specific
  // pack, so it is deliberately not counted for any of them.
  if (identity === undefined || identity === '') return false;
  return assetNames.has(canonicalAssetName(identity));
}

function observedMaterialization(input: {
  provider: string;
  scope: ConcreteScope;
  contentKind: ManagedContentKind;
  assets: readonly string[];
  syncOperationResults: readonly ProviderSyncOperationEvidence[];
  extensionResults: readonly ProviderExtensionOperationEvidence[];
}): { state: ProviderMaterializationState; detail: string } {
  const { provider, scope, contentKind } = input;
  const assetNames = new Set(input.assets.map(canonicalAssetName));
  const operations = [
    ...input.syncOperationResults.filter(
      (result) =>
        result.provider === provider &&
        result.scope === scope &&
        result.contentKind === contentKind &&
        operationBelongsToAssets(result.asset, assetNames),
    ),
    ...input.extensionResults.filter(
      (result) =>
        result.provider === provider &&
        result.scope === scope &&
        (result.contentKind === undefined ||
          result.contentKind === contentKind) &&
        // A `config` target is the provider's shared aggregate file, which is
        // not any one pack's asset but which every managed role for this
        // provider depends on. It is therefore attributed provider-wide
        // rather than dropped; a `role` target must still match this row's
        // own assets so one pack's failure cannot be reported against another.
        (result.target === 'config' ||
          operationBelongsToAssets(result.path, assetNames)),
    ),
  ];
  const failed = operations.filter(
    (operation) => operation.status === 'failed',
  );
  if (failed.length > 0) {
    return {
      state: 'failed',
      detail: `${provider} ${scope} ${contentKind} materialization failed: ${
        failed
          .map((operation) => operation.failure)
          .filter((failure): failure is string => Boolean(failure))
          .join('; ') || 'no failure detail reported'
      }`,
    };
  }
  // Status is classified explicitly rather than as "anything but failed":
  // `missing`, `unsupported`, `planned`, and `unknown` are not evidence that
  // the provider view now exists.
  const succeeded = operations.filter(
    (operation) =>
      operation.status === 'changed' || operation.status === 'current',
  );
  if (succeeded.length > 0) {
    return {
      state: 'materialized',
      detail: `${succeeded.length} ${provider} ${scope} ${contentKind} operation(s) succeeded`,
    };
  }
  const missing = operations.filter(
    (operation) => operation.status === 'missing',
  );
  if (missing.length > 0) {
    return {
      state: 'missing',
      detail: `${provider} has no ${scope} ${contentKind} projection for ${missing.length} asset(s)`,
    };
  }
  return {
    state: 'not-applicable',
    detail: `No ${provider} ${scope} ${contentKind} operation was required`,
  };
}

/**
 * Re-projects existing reachability rows with a sync run's observed results.
 *
 * Activation and capability were already derived from the registry before the
 * sync ran and do not change; only projection, materialization, visibility,
 * and recovery are refined. Inactive or unsupported rows are returned
 * untouched.
 */
export function applySyncEvidence(
  providers: readonly ProviderReachabilityEvidence[],
  input: {
    syncRan: boolean;
    syncOperationResults?: readonly ProviderSyncOperationEvidence[];
    extensionResults?: readonly ProviderExtensionOperationEvidence[];
  },
): ProviderReachabilityEvidence[] {
  if (!input.syncRan) return [...providers];
  return providers.map((evidence) => {
    if (
      evidence.activation.state === 'inactive' ||
      evidence.capability.support !== 'supported'
    ) {
      return evidence;
    }
    const materialization = observedMaterialization({
      provider: evidence.provider,
      scope: evidence.scope,
      contentKind: evidence.contentKind,
      assets: evidence.assets,
      syncOperationResults: input.syncOperationResults ?? [],
      extensionResults: input.extensionResults ?? [],
    });
    const projected = materialization.state === 'materialized';
    return {
      ...evidence,
      projection: {
        state: projected
          ? ('projected' as const)
          : materialization.state === 'missing'
            ? ('absent' as const)
            : ('not-applicable' as const),
        mode: evidence.projection.mode,
      },
      materialization,
      recovery: recoveryFor({
        provider: evidence.provider,
        scope: evidence.scope,
        activationState: evidence.activation.state,
        support: evidence.capability.support,
        materialization: materialization.state,
        visibility: evidence.visibility.state,
        projected,
      }),
    };
  });
}
