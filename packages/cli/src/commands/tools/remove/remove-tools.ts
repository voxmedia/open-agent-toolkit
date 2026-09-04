import { join } from 'node:path';

import {
  packScopeFactsFromInventory,
  projectPackEvidence,
} from '@commands/tools/shared/pack-evidence';
import {
  hasScopedPackPlacementEvidence,
  type InventoryScopedPackInput,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import {
  type PackLifecycleRequest,
  type PackLifecycleResult,
} from '@commands/tools/shared/pack-lifecycle';
import type { PackLifecycleOutcome } from '@commands/tools/shared/pack-lifecycle-outcome';
import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import { resolveSharedOwnerRetentions } from '@commands/tools/shared/pack-reconcile';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type {
  PackAssetDefinition,
  PackName,
  ToolInfo,
} from '@commands/tools/shared/types';
import {
  type ManagedRootName,
  resolveManagedScopeRoots,
  validateManagedPath,
} from '@fs/paths';
import type { ConcreteScope } from '@shared/types';

export type RemoveTarget =
  | { kind: 'name'; name: string }
  | { kind: 'pack'; pack: PackName }
  | { kind: 'all' };

export interface RemoveToolsDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: ConcreteScope,
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  removeDirectory: (path: string) => Promise<void>;
  removeFile: (path: string) => Promise<void>;
  pathExists: (path: string) => Promise<boolean>;
  hasPackOwnershipEvidence: (
    pack: PackName,
    scope: ConcreteScope,
    scopeRoot: string,
  ) => Promise<boolean>;
  reconcilePacks?: (
    requests: readonly PackLifecycleRequest[],
    options?: { dryRun?: boolean },
  ) => Promise<PackLifecycleResult[]>;
  inventoryScopedPack?: (
    input: InventoryScopedPackInput,
  ) => Promise<ScopedPackInventory>;
  writeScopedPackIntent?: (input: {
    pack: PackName;
    scope: ConcreteScope;
    scopeRoot: string;
    enabled: boolean;
  }) => Promise<unknown>;
}

interface RemovedTool {
  name: string;
  type: 'skill' | 'agent';
  scope: ConcreteScope;
}

/**
 * Per-pack, per-scope evidence that a removal actually acted on the pack.
 *
 * `removed` is true when a scanned pack tool matched, or when a
 * manifest-declared managed destination for that pack existed on disk before
 * removal ran (including one retained for a shared owner). It gates clearing
 * durable scoped intent: a removal that found no trace of a pack removed
 * nothing, reports that nothing was removed, and must leave the intent that
 * `oat tools update` restores from (FR5) untouched. Under `--dry-run` it
 * reports what a real run would have acted on.
 */
export interface PackRemovalOutcome {
  pack: PackName;
  scope: ConcreteScope;
  removed: boolean;
}

export interface RemoveResult {
  removed: RemovedTool[];
  removedAssets: Array<{ path: string; scope: ConcreteScope }>;
  retainedOwnerData: Array<{
    path: string;
    scope: ConcreteScope;
    reason: string;
  }>;
  packOutcomes: PackRemovalOutcome[];
  notInstalled: string[];
  lifecycle?: PackLifecycleOutcome[];
}

function matchesTarget(tool: ToolInfo, target: RemoveTarget): boolean {
  switch (target.kind) {
    case 'name':
      return tool.name === target.name;
    case 'pack':
      return tool.pack === target.pack;
    case 'all':
      return true;
  }
}

async function removeTool(
  tool: ToolInfo,
  scopeRoot: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<void> {
  if (dryRun) return;

  if (tool.type === 'agent') {
    const agentPath = join(scopeRoot, '.agents', 'agents', `${tool.name}.md`);
    await deps.removeFile(agentPath);
  } else {
    const skillPath = join(scopeRoot, '.agents', 'skills', tool.name);
    await deps.removeDirectory(skillPath);
  }
}

function isDirectoryAsset(asset: PackAssetDefinition): boolean {
  return asset.kind === 'skill' || asset.kind === 'directory';
}

interface ManagedRemovalTarget {
  path: string;
  isDirectory: boolean;
}

interface ScopeRemovalPlan {
  scope: ConcreteScope;
  scopeRoot: string;
  matched: ToolInfo[];
  managedTargets: ManagedRemovalTarget[];
  retainedOwnerData: Array<{ path: string; reason: string }>;
  presentPacks: PackName[];
  beforeInventories: ScopedPackInventory[];
}

interface ManagedPackRemovalPlan {
  targets: ManagedRemovalTarget[];
  retained: Array<{ path: string; reason: string }>;
  /**
   * Packs with at least one manifest-declared managed asset on disk at this
   * scope before removal ran, including assets retained for a shared owner.
   * This is the pack's physical footprint, and it is what separates a real
   * removal from a no-op.
   */
  presentPacks: PackName[];
}

export function selectedPacks(target: Exclude<RemoveTarget, { kind: 'name' }>) {
  return target.kind === 'pack'
    ? [target.pack]
    : PACK_MANIFEST.map(({ name }) => name);
}

function selectedManagedAssets(
  packs: readonly PackName[],
  scope: ConcreteScope,
): Array<{ pack: PackName; asset: PackAssetDefinition }> {
  return PACK_MANIFEST.filter(({ name }) => packs.includes(name)).flatMap(
    ({ name, assets }) =>
      assets
        .filter(
          (asset) =>
            asset.scopes.includes(scope) &&
            asset.ownership[scope] === 'managed',
        )
        .map((asset) => ({ pack: name, asset })),
  );
}

function managedRootName(asset: PackAssetDefinition): ManagedRootName {
  const name = asset.destination.split('/')[0];
  if (name !== '.agents' && name !== '.oat') {
    throw new Error(
      `Pack asset ${asset.id} has unsupported managed root: ${asset.destination}`,
    );
  }
  return name;
}

async function planManagedPackRemoval(
  packs: readonly PackName[],
  scope: ConcreteScope,
  scopeRoot: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<ManagedPackRemovalPlan> {
  const retentions = await resolveSharedOwnerRetentions({
    packs,
    scope,
    scopeRoot,
    hasOwnershipEvidence: deps.hasPackOwnershipEvidence,
  });
  const retainedPaths = new Set(retentions.map(({ path }) => path));
  const managedAssets = selectedManagedAssets(packs, scope);

  // Sampled before anything is deleted, because that is the only moment at
  // which a pack's physical footprint is still observable. Retained
  // shared-owner assets count: the pack declares them, so a removal that had to
  // consider them is not a no-op for that pack.
  const assetPaths = new Map<string, string>();
  for (const { asset } of managedAssets) {
    assetPaths.set(asset.destination, join(scopeRoot, asset.destination));
  }
  const existence = new Map(
    await Promise.all(
      [...assetPaths.values()].map(
        async (path): Promise<[string, boolean]> => [
          path,
          await deps.pathExists(path),
        ],
      ),
    ),
  );
  const presentPacks = [
    ...new Set(
      managedAssets
        .filter(({ asset }) =>
          existence.get(assetPaths.get(asset.destination)!),
        )
        .map(({ pack }) => pack),
    ),
  ];

  const targets = new Map<
    string,
    { asset: PackAssetDefinition; isDirectory: boolean }
  >();
  for (const { asset } of managedAssets) {
    const path = join(scopeRoot, asset.destination);
    if (targets.has(path) || retainedPaths.has(path)) continue;
    targets.set(path, { asset, isDirectory: isDirectoryAsset(asset) });
  }

  const retained = [...retainedPaths].map((path) => ({
    path,
    reason: 'retained shared owner data',
  }));

  if (dryRun) {
    return {
      targets: [...targets.entries()].map(([path, { isDirectory }]) => ({
        path,
        isDirectory,
      })),
      retained,
      presentPacks,
    };
  }

  const roots = await resolveManagedScopeRoots(scopeRoot);
  return {
    targets: await Promise.all(
      [...targets.entries()].map(
        async ([
          path,
          { asset, isDirectory },
        ]): Promise<ManagedRemovalTarget> => {
          await validateManagedPath(path, roots[managedRootName(asset)]);
          return { path, isDirectory };
        },
      ),
    ),
    retained,
    presentPacks,
  };
}

async function executeManagedPackRemoval(
  targets: ManagedRemovalTarget[],
  deps: RemoveToolsDependencies,
): Promise<void> {
  for (const target of targets) {
    if (target.isDirectory) {
      await deps.removeDirectory(target.path);
    } else {
      await deps.removeFile(target.path);
    }
  }

  const remaining = (
    await Promise.all(
      targets.map(async ({ path }) =>
        (await deps.pathExists(path)) ? path : null,
      ),
    )
  ).filter((path): path is string => path !== null);
  if (remaining.length > 0) {
    throw new Error(
      `Managed pack removal incomplete; assets remain: ${remaining.join(', ')}`,
    );
  }
}

export async function removeTools(
  target: RemoveTarget,
  scopes: ConcreteScope[],
  cwd: string,
  home: string,
  dryRun: boolean,
  deps: RemoveToolsDependencies,
): Promise<RemoveResult> {
  const removed: RemovedTool[] = [];
  const removedAssets: RemoveResult['removedAssets'] = [];
  const retainedOwnerData: RemoveResult['retainedOwnerData'] = [];
  const packOutcomes: PackRemovalOutcome[] = [];
  const assetsRoot = await deps.resolveAssetsRoot();

  if (target.kind === 'name') {
    for (const scope of scopes) {
      const scopeRoot = await deps.resolveScopeRoot(scope, cwd, home);
      const tools = await deps.scanTools({ scope, scopeRoot, assetsRoot });
      const matched = tools.filter((tool) => matchesTarget(tool, target));
      for (const tool of matched) {
        await removeTool(tool, scopeRoot, dryRun, deps);
        removed.push({ name: tool.name, type: tool.type, scope: tool.scope });
      }
    }

    return {
      removed,
      removedAssets,
      retainedOwnerData,
      packOutcomes: [],
      notInstalled: removed.length === 0 ? [target.name] : [],
    };
  }

  if (deps.reconcilePacks) {
    const packs = selectedPacks(target);
    const requests: PackLifecycleRequest[] = [];
    const roots = new Map<ConcreteScope, string>();
    for (const scope of scopes) {
      const scopeRoot = await deps.resolveScopeRoot(scope, cwd, home);
      roots.set(scope, scopeRoot);
      for (const pack of packs) {
        const definition = PACK_MANIFEST.find(({ name }) => name === pack)!;
        if (!definition.allowedScopes.includes(scope)) continue;
        requests.push({
          pack,
          scope,
          scopeRoot,
          assetsRoot,
          action: 'remove',
        });
      }
    }
    const lifecycle = await deps.reconcilePacks(requests, { dryRun });
    for (const entry of lifecycle) {
      for (const operation of entry.plan.operations) {
        if (
          operation.kind !== 'remove-dir' &&
          operation.kind !== 'remove-file'
        ) {
          continue;
        }
        removedAssets.push({
          path: operation.path,
          scope: entry.request.scope,
        });
        const asset = entry.before.assets.find(
          ({ definition }) => definition.id === operation.assetId,
        )?.definition;
        if (asset?.kind === 'skill' || asset?.kind === 'agent') {
          removed.push({
            name: asset.destination.split('/').at(-1)!.replace(/\.md$/, ''),
            type: asset.kind,
            scope: entry.request.scope,
          });
        }
      }
      retainedOwnerData.push(
        ...entry.plan.retainedAssets.map(({ path }) => ({
          path,
          scope: entry.request.scope,
          reason: 'retained shared owner data',
        })),
        ...entry.plan.retainedDependencyAssetIds.map((assetId) => ({
          path:
            entry.before.assets.find(
              ({ definition }) => definition.id === assetId,
            )?.path ?? assetId,
          scope: entry.request.scope,
          reason: 'retained dependency lease',
        })),
      );
    }
    for (const request of requests) {
      const entry = lifecycle.find(
        ({ request: candidate }) =>
          !candidate.dependency &&
          candidate.pack === request.pack &&
          candidate.scope === request.scope,
      );
      packOutcomes.push({
        pack: request.pack,
        scope: request.scope,
        removed: entry ? hasScopedPackPlacementEvidence(entry.before) : false,
      });
    }

    if (target.kind === 'all') {
      for (const scope of scopes) {
        const scopeRoot = roots.get(scope)!;
        const tools = await deps.scanTools({ scope, scopeRoot, assetsRoot });
        for (const tool of tools.filter(({ pack }) => pack === 'custom')) {
          await removeTool(tool, scopeRoot, dryRun, deps);
          removed.push({ name: tool.name, type: tool.type, scope: tool.scope });
        }
      }
    }

    return {
      removed,
      removedAssets,
      retainedOwnerData,
      packOutcomes,
      notInstalled: [],
    };
  }

  const plans: ScopeRemovalPlan[] = [];
  for (const scope of scopes) {
    const scopeRoot = await deps.resolveScopeRoot(scope, cwd, home);
    const tools = await deps.scanTools({ scope, scopeRoot, assetsRoot });
    const matched = tools.filter((tool) => matchesTarget(tool, target));
    const managedPlan = await planManagedPackRemoval(
      selectedPacks(target),
      scope,
      scopeRoot,
      dryRun,
      deps,
    );
    const beforeInventories = deps.inventoryScopedPack
      ? await Promise.all(
          selectedPacks(target).map((pack) =>
            deps.inventoryScopedPack!({
              pack,
              scope,
              scopeRoot,
              assetsRoot,
            }),
          ),
        )
      : [];
    const seedData = PACK_MANIFEST.filter(({ name }) =>
      selectedPacks(target).includes(name),
    ).flatMap(({ assets }) =>
      assets
        .filter(
          (asset) =>
            asset.scopes.includes(scope) &&
            asset.ownership[scope] === 'seed-if-missing',
        )
        .map(({ destination }) => ({
          path: join(scopeRoot, destination),
          reason: 'repository or scope owner data',
        })),
    );
    plans.push({
      scope,
      scopeRoot,
      matched,
      managedTargets: managedPlan.targets,
      retainedOwnerData: [...managedPlan.retained, ...seedData],
      presentPacks: managedPlan.presentPacks,
      beforeInventories,
    });
  }

  for (const plan of plans) {
    if (target.kind === 'all') {
      for (const tool of plan.matched.filter(({ pack }) => pack === 'custom')) {
        await removeTool(tool, plan.scopeRoot, dryRun, deps);
      }
    }
    if (!dryRun) {
      await executeManagedPackRemoval(plan.managedTargets, deps);
    }
    removed.push(
      ...plan.matched.map(({ name, type, scope }) => ({ name, type, scope })),
    );
    removedAssets.push(
      ...plan.managedTargets.map(({ path }) => ({ path, scope: plan.scope })),
    );
    retainedOwnerData.push(
      ...plan.retainedOwnerData.map((entry) => ({
        ...entry,
        scope: plan.scope,
      })),
    );
    packOutcomes.push(
      ...selectedPacks(target).map((pack) => ({
        pack,
        scope: plan.scope,
        removed:
          plan.matched.some((tool) => tool.pack === pack) ||
          plan.presentPacks.includes(pack),
      })),
    );
  }

  const finalInventories = dryRun
    ? plans.flatMap(({ beforeInventories }) => beforeInventories)
    : [];

  return {
    removed,
    removedAssets,
    retainedOwnerData,
    packOutcomes,
    notInstalled: [],
    lifecycle: removalLifecycleOutcomes(
      selectedPacks(target),
      scopes,
      packOutcomes,
      dryRun,
      finalInventories,
    ),
  };
}

export function removalLifecycleOutcomes(
  packs: readonly PackName[],
  scopes: readonly ConcreteScope[],
  outcomes: readonly PackRemovalOutcome[],
  dryRun: boolean,
  finalInventories: readonly ScopedPackInventory[],
): PackLifecycleOutcome[] {
  if (finalInventories.length === 0) return [];
  return packs.map((pack) => {
    const packInventories = finalInventories.filter(
      (inventory) => inventory.pack === pack,
    );
    const finalEvidence =
      packInventories.length === 0
        ? null
        : projectPackEvidence({
            canonical: null,
            scopes: packInventories.map(packScopeFactsFromInventory),
          });
    const removed = outcomes.some(
      (outcome) => outcome.pack === pack && outcome.removed,
    );
    const inventoriedScopes = new Set(
      packInventories.map(({ scope }) => scope),
    );
    const inventoryVerified =
      finalEvidence !== null &&
      finalEvidence.unknownScopes.length === 0 &&
      scopes.every((scope) => inventoriedScopes.has(scope));
    const remainingScopes = finalEvidence
      ? scopes.filter((scope) =>
          finalEvidence.knownRealizedScopes.includes(scope),
        )
      : [...scopes];
    const verified =
      inventoryVerified && (dryRun || remainingScopes.length === 0);
    const recovery = !inventoryVerified
      ? [
          {
            code: 'final-inventory-unverified' as const,
            message: `Re-run status for ${pack}; final removal state could not be verified`,
          },
        ]
      : !dryRun && remainingScopes.length > 0
        ? remainingScopes.map((scope) => ({
            code: 'canonical-verification-failed' as const,
            message: `Removal remains incomplete for ${pack} at ${scope} scope; rerun oat tools remove --pack ${pack} --scope ${scope}`,
          }))
        : [];
    return {
      schemaVersion: 1,
      selection: {
        pack,
        requested:
          scopes.includes('project') && scopes.includes('user')
            ? 'both'
            : scopes[0]!,
        retainedRealizedScopes: finalEvidence?.knownRealizedScopes ?? [],
        targetScopes: scopes,
      },
      canonical: {
        status: removed && !dryRun ? 'applied' : 'unchanged',
        results: [],
      },
      sync: { scopes: [], status: 'not-run', providers: [] },
      finalEvidence,
      status: verified ? 'complete' : inventoryVerified ? 'partial' : 'failed',
      recovery,
    };
  });
}

export function failedRemovalLifecycleOutcomes(
  target: Exclude<RemoveTarget, { kind: 'name' }>,
  scopes: readonly ConcreteScope[],
  error: unknown,
): PackLifecycleOutcome[] {
  const message = error instanceof Error ? error.message : String(error);
  return selectedPacks(target).map((pack) => ({
    schemaVersion: 1,
    selection: {
      pack,
      requested:
        scopes.includes('project') && scopes.includes('user')
          ? 'both'
          : scopes[0]!,
      retainedRealizedScopes: [],
      targetScopes: scopes,
    },
    canonical: { status: 'failed', results: [] },
    sync: { scopes: [], status: 'not-run', providers: [] },
    finalEvidence: null,
    status: 'failed',
    recovery: [{ code: 'canonical-apply-failed', message }],
  }));
}

export function failedPostRemovalLifecycleOutcomes(
  target: Exclude<RemoveTarget, { kind: 'name' }>,
  scopes: readonly ConcreteScope[],
  outcomes: readonly PackRemovalOutcome[],
  stage: 'intent-write' | 'final-inventory',
  failedPack: PackName,
  failedScope: ConcreteScope,
  error: unknown,
): PackLifecycleOutcome[] {
  const detail = error instanceof Error ? error.message : String(error);
  return selectedPacks(target).map((pack) => {
    const canonicalApplied = outcomes.some(
      (outcome) => outcome.pack === pack && outcome.removed,
    );
    const stageLabel =
      stage === 'intent-write'
        ? 'durable intent update failed'
        : 'final inventory failed';
    const canonicalSummary = canonicalApplied
      ? `Canonical removal was applied for ${pack}, but final state is unverified`
      : `No canonical removal was observed for ${pack}; final state remains unverified`;
    return {
      schemaVersion: 1,
      selection: {
        pack,
        requested:
          scopes.includes('project') && scopes.includes('user')
            ? 'both'
            : scopes[0]!,
        retainedRealizedScopes: [],
        targetScopes: scopes,
      },
      canonical: {
        status: canonicalApplied ? 'applied' : 'unchanged',
        results: [],
      },
      sync: { scopes: [], status: 'not-run', providers: [] },
      finalEvidence: null,
      status: 'failed',
      recovery: scopes.map((scope) => ({
        code: 'final-inventory-unverified',
        message: `${canonicalSummary} because ${stageLabel} for ${failedPack} at ${failedScope} scope: ${detail}. Rerun oat tools remove --pack ${pack} --scope ${scope}`,
      })),
    };
  });
}
