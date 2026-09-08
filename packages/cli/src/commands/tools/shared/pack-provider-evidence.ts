import type {
  ManagedContentKind,
  ProviderScopeContext,
  UserAgentMaterializationCoverage,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';

import type { AutoSyncResult } from './auto-sync';
import {
  PROVIDER_DIAGNOSTIC_SOURCE,
  providerDiagnostics,
  type ProviderReachabilityEvidence,
  type ToolPackEvidence,
} from './pack-evidence';
import type { PackInventory, ScopedPackInventory } from './pack-inventory';
import {
  projectProviderReachability,
  type ProviderExtensionOperationEvidence,
  type ProviderSyncOperationEvidence,
  type ProviderRefreshPolicyLookup,
} from './provider-reachability';
import { refreshPolicyFromAdvice } from './sync-evidence';
import type { PackAssetKind, PackName } from './types';

/**
 * Pack asset kinds that a provider can project.
 *
 * `template`, `script`, and `seed` assets are canonical-only: no provider
 * mapping or materialization extension consumes them, so claiming provider
 * reachability for them would invent a surface that does not exist.
 */
const PROVIDER_CONTENT_KIND: Partial<
  Record<PackAssetKind, ManagedContentKind>
> = {
  skill: 'skill',
  agent: 'agent',
  directory: 'directory',
};

type AssetsByContentKind = Partial<
  Record<ManagedContentKind, readonly string[]>
>;

function pushAsset(
  target: Record<string, string[]>,
  contentKind: ManagedContentKind,
  path: string,
): void {
  (target[contentKind] ??= []).push(path);
}

/** Realized managed assets for one scope, grouped by provider content kind. */
export function packAssetsByContentKind(
  scoped: ScopedPackInventory,
): AssetsByContentKind {
  const grouped: Record<string, string[]> = {};
  for (const asset of scoped.assets) {
    if (asset.status === 'missing') continue;
    if (asset.definition.ownership[scoped.scope] !== 'managed') continue;
    const contentKind = PROVIDER_CONTENT_KIND[asset.definition.kind];
    if (contentKind === undefined) continue;
    pushAsset(grouped, contentKind, asset.path);
  }
  return grouped;
}

/**
 * Assets the pack inventory reports as having no provider materialization.
 *
 * This is an inventory observation about assets, not a reachability claim:
 * the mapper still decides which providers are responsible from registry
 * capability alone.
 */
export function unmaterializedAssetsByContentKind(
  scoped: ScopedPackInventory,
): AssetsByContentKind {
  const grouped: Record<string, string[]> = {};
  for (const diagnostic of scoped.diagnostics) {
    if (diagnostic.code !== 'user-agent-unmaterialized') continue;
    for (const path of diagnostic.paths) pushAsset(grouped, 'agent', path);
  }
  return grouped;
}

export interface PackProviderEvidenceInput {
  pack: PackName;
  /** Per-scope pack inventory; the sole source of the asset lists. */
  scopedInventories: readonly ScopedPackInventory[];
  providerContexts: readonly ProviderScopeContext[];
  mode: 'lifecycle' | 'inventory';
  /** Only meaningful in `lifecycle` mode; `false` records a skipped sync. */
  syncRan?: boolean;
  syncOperationResults?: readonly ProviderSyncOperationEvidence[];
  extensionResults?: readonly ProviderExtensionOperationEvidence[];
  refreshPolicy?: ProviderRefreshPolicyLookup;
  /** Restricts evidence to these scopes; defaults to every resolved context. */
  scopes?: readonly ConcreteScope[];
}

/**
 * The single seam that turns provider registry state plus pack inventory into
 * reachability evidence, shared by the lifecycle outcomes and every inventory
 * renderer so the two cannot drift.
 */
export function packProviderEvidence(
  input: PackProviderEvidenceInput,
): ProviderReachabilityEvidence[] {
  const contexts = input.scopes
    ? input.providerContexts.filter((context) =>
        input.scopes!.includes(context.scope),
      )
    : input.providerContexts;
  return contexts.flatMap((providerScopeContext) => {
    const scoped = input.scopedInventories.find(
      ({ scope }) => scope === providerScopeContext.scope,
    );
    if (scoped === undefined) return [];
    const assets = packAssetsByContentKind(scoped);
    if (Object.keys(assets).length === 0) return [];
    return projectProviderReachability({
      providerScopeContext,
      assets,
      mode: input.mode,
      ...(input.syncRan !== undefined ? { syncRan: input.syncRan } : {}),
      ...(input.syncOperationResults
        ? { syncOperationResults: input.syncOperationResults }
        : {}),
      ...(input.extensionResults
        ? { extensionResults: input.extensionResults }
        : {}),
      ...(input.refreshPolicy ? { refreshPolicy: input.refreshPolicy } : {}),
      unmaterializedAssets: unmaterializedAssetsByContentKind(scoped),
    });
  });
}

/**
 * Drops `user-agent-unmaterialized` when an active provider materializes all
 * managed user-scope roles.
 *
 * `status` and `doctor` have always applied this; `list` and `info` did not,
 * so they reported user agents as unmaterialized that the active Codex or
 * Cursor adapter in fact supplies. Sharing one implementation is what makes
 * the four surfaces agree.
 */
export function applyUserAgentCoverage(
  inventory: PackInventory,
  coverage: UserAgentMaterializationCoverage,
): PackInventory {
  if (coverage !== 'all') return inventory;
  return {
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
  };
}

/**
 * Provider evidence for a pack lifecycle outcome (install, update, remove).
 *
 * When `sync` is absent the auto-sync step did not run, so no projection or
 * materialization claim is made and the evidence carries activation and
 * capability only — the pinned matrix's `not-run` row.
 */
export function lifecycleProviderEvidence(input: {
  pack: PackName;
  scopedInventories: readonly ScopedPackInventory[];
  providerContexts: readonly ProviderScopeContext[];
  scopes?: readonly ConcreteScope[];
  sync?: AutoSyncResult;
}): ProviderReachabilityEvidence[] {
  const runs = input.sync?.evidence ?? [];
  return packProviderEvidence({
    pack: input.pack,
    scopedInventories: input.scopedInventories,
    providerContexts: input.providerContexts,
    mode: 'lifecycle',
    syncRan: runs.some(({ ran }) => ran),
    syncOperationResults: runs.flatMap(
      ({ operationResults }) => operationResults,
    ),
    extensionResults: runs.flatMap(({ extensionResults }) => extensionResults),
    refreshPolicy: refreshPolicyFromAdvice(
      runs.flatMap(({ refreshAdvice }) => refreshAdvice),
    ),
    ...(input.scopes ? { scopes: input.scopes } : {}),
  });
}

/**
 * Re-projects a pack evidence item with lifecycle provider evidence.
 *
 * `providerDiagnostics` only emits `provider-materialization-failed` in
 * lifecycle mode, so an observed failure reaches pack evidence only when the
 * outcome's `finalEvidence` is rebuilt with the run's provider rows. Without
 * this the error-severity code would have no production emitter at all.
 */
export function withLifecycleProviderEvidence(
  evidence: ToolPackEvidence | null,
  providers: readonly ProviderReachabilityEvidence[],
): ToolPackEvidence | null {
  if (evidence === null || providers.length === 0) return evidence;
  // Diagnostics are merged onto the existing item rather than re-derived
  // through `projectPackEvidence`: that helper re-resolves the pack name from
  // canonical inventory or scope facts and throws when neither is present,
  // which must never happen inside a lifecycle path that already succeeded.
  // Every already-computed field, including scope verification, is preserved.
  return {
    ...evidence,
    providers,
    diagnostics: [
      // Previously projected provider rows are replaced, not appended to. The
      // update and removal flows project once before auto-sync and again
      // afterwards, so appending would emit each inactive or unsupported
      // provider twice in the final JSON. Canonical diagnostics and the
      // unattributed inventory-derived warning use a different `source` and
      // are preserved.
      ...evidence.diagnostics.filter(
        ({ source }) => source !== PROVIDER_DIAGNOSTIC_SOURCE,
      ),
      ...providerDiagnostics({
        pack: evidence.pack,
        providers,
        mode: 'lifecycle',
      }),
    ],
  };
}
