import { join } from 'node:path';

import type { ConcreteScope } from '@shared/types';

import type { PackDependencyLease } from './pack-dependencies';
import type { ScopedPackInventory } from './pack-inventory';
import { getPackDefinition, PACK_MANIFEST } from './pack-manifest';
import type {
  PackAssetDefinition,
  PackAssetGeneration,
  PackCompleteness,
  PackName,
} from './types';

export type PackReconcileAction =
  | 'install'
  | 'update'
  | 'remove'
  | 'migrate-destination';

export type PackReconcileOperation =
  | {
      kind: 'copy-dir' | 'copy-file';
      assetId: string;
      source: string;
      destination: string;
      force: boolean;
    }
  | {
      kind: 'write-generated';
      assetId: string;
      generation: PackAssetGeneration;
      destination: string;
    }
  | { kind: 'chmod'; assetId: string; path: string; mode: number }
  | { kind: 'remove-dir' | 'remove-file'; assetId: string; path: string }
  | {
      kind: 'write-intent';
      pack: PackName;
      scope: ConcreteScope;
      enabled: boolean;
    }
  | {
      kind: 'write-lease';
      pack: PackName;
      scope: ConcreteScope;
      requiredBy: PackName;
      enabled: boolean;
    };

export interface PackReconcilePlan {
  pack: PackName;
  scope: ConcreteScope;
  action: PackReconcileAction;
  operations: readonly PackReconcileOperation[];
  expectedCompleteness: PackCompleteness | null;
  selectedAssetIds: readonly string[];
  expectedAssetStatus: 'current' | 'missing' | null;
  expectedAssetStatuses?: Readonly<Record<string, 'current' | 'missing'>>;
  changedCanonicalPaths: readonly string[];
  retainedAssets: readonly PackSharedOwnerRetention[];
  retainedDependencyAssetIds: readonly string[];
}

export interface PackSharedOwnerRetention {
  assetId: string;
  path: string;
  retainedBy: readonly PackName[];
  reason: 'retained-shared-owner';
}

export interface PlanPackReconcileInput {
  pack: PackName;
  scope: ConcreteScope;
  scopeRoot: string;
  assetsRoot: string;
  action: PackReconcileAction;
  inventory: ScopedPackInventory;
  retainedAssets?: readonly PackSharedOwnerRetention[];
  retainedDependencyAssetIds?: readonly string[];
  assetIds?: readonly string[];
  dependency?: PackDependencyLease;
}

export interface ResolveSharedOwnerRetentionsInput {
  packs: readonly PackName[];
  scope: ConcreteScope;
  scopeRoot: string;
  hasOwnershipEvidence: (
    pack: PackName,
    scope: ConcreteScope,
    scopeRoot: string,
  ) => Promise<boolean>;
}

export async function resolveSharedOwnerRetentions(
  input: ResolveSharedOwnerRetentionsInput,
): Promise<PackSharedOwnerRetention[]> {
  const selected = new Set(input.packs);
  const retentions: PackSharedOwnerRetention[] = [];
  const seen = new Set<string>();
  for (const definition of PACK_MANIFEST.filter(({ name }) =>
    selected.has(name),
  )) {
    for (const asset of definition.assets) {
      if (
        !asset.sharedOwner ||
        !asset.scopes.includes(input.scope) ||
        asset.ownership[input.scope] !== 'managed' ||
        seen.has(asset.destination)
      ) {
        continue;
      }
      const otherOwners = PACK_MANIFEST.filter(
        ({ name, assets }) =>
          !selected.has(name) &&
          assets.some(
            (candidate) =>
              candidate.sharedOwner === asset.sharedOwner &&
              candidate.destination === asset.destination &&
              candidate.scopes.includes(input.scope) &&
              candidate.ownership[input.scope] === 'managed',
          ),
      );
      const evidence = await Promise.all(
        otherOwners.map(async ({ name }) => ({
          name,
          retained: await input.hasOwnershipEvidence(
            name,
            input.scope,
            input.scopeRoot,
          ),
        })),
      );
      const retainedBy = evidence
        .filter(({ retained }) => retained)
        .map(({ name }) => name);
      if (retainedBy.length === 0) continue;
      seen.add(asset.destination);
      retentions.push({
        assetId: asset.id,
        path: join(input.scopeRoot, asset.destination),
        retainedBy,
        reason: 'retained-shared-owner',
      });
    }
  }
  return retentions;
}

function isDirectoryAsset(asset: PackAssetDefinition): boolean {
  return asset.kind === 'skill' || asset.kind === 'directory';
}

function canonicalPath(asset: PackAssetDefinition): string | null {
  return asset.kind === 'skill' || asset.kind === 'agent'
    ? asset.destination
    : null;
}

function materializationOperations(
  asset: PackAssetDefinition,
  input: PlanPackReconcileInput,
): PackReconcileOperation[] {
  const observed = input.inventory.assets.find(
    ({ definition }) => definition.id === asset.id,
  );
  const ownership = asset.ownership[input.scope];
  const isMissing = observed?.status === 'missing';
  if (
    ownership === 'seed-if-missing' &&
    !isMissing &&
    !(
      asset.generation === 'projects-config-default' &&
      observed?.status === 'outdated'
    )
  )
    return [];
  if (ownership === 'managed' && observed?.status === 'current') return [];

  const destination = join(input.scopeRoot, asset.destination);
  if (asset.generation) {
    return [
      {
        kind: 'write-generated',
        assetId: asset.id,
        generation: asset.generation,
        destination,
      },
    ];
  }
  if (!asset.source) {
    throw new Error(`Pack asset ${asset.id} has no source or generation`);
  }
  const operations: PackReconcileOperation[] = [
    {
      kind: isDirectoryAsset(asset) ? 'copy-dir' : 'copy-file',
      assetId: asset.id,
      source: join(input.assetsRoot, asset.source),
      destination,
      force: ownership === 'managed',
    },
  ];
  if (asset.executable) {
    operations.push({
      kind: 'chmod',
      assetId: asset.id,
      path: destination,
      mode: 0o755,
    });
  }
  return operations;
}

function removalOperation(
  asset: PackAssetDefinition,
  input: PlanPackReconcileInput,
): PackReconcileOperation | null {
  if (asset.ownership[input.scope] !== 'managed') return null;
  if (input.retainedAssets?.some(({ assetId }) => assetId === asset.id)) {
    return null;
  }
  if (input.retainedDependencyAssetIds?.includes(asset.id)) return null;
  const observed = input.inventory.assets.find(
    ({ definition }) => definition.id === asset.id,
  );
  if (!observed || observed.status === 'missing') return null;
  return {
    kind: isDirectoryAsset(asset) ? 'remove-dir' : 'remove-file',
    assetId: asset.id,
    path: join(input.scopeRoot, asset.destination),
  };
}

export function planPackReconcile(
  input: PlanPackReconcileInput,
): PackReconcilePlan {
  if (
    input.inventory.pack !== input.pack ||
    input.inventory.scope !== input.scope
  ) {
    throw new Error(
      'Pack reconcile inventory does not match requested pack and scope',
    );
  }
  const packDefinition = getPackDefinition(input.pack);
  if (!packDefinition.allowedScopes.includes(input.scope)) {
    throw new Error(`Pack ${input.pack} does not allow ${input.scope} scope`);
  }
  const allApplicableAssets = packDefinition.assets.filter(({ scopes }) =>
    scopes.includes(input.scope),
  );
  const requestedAssetIds = new Set(input.assetIds ?? []);
  if (requestedAssetIds.size > 0) {
    for (const assetId of requestedAssetIds) {
      if (!allApplicableAssets.some(({ id }) => id === assetId)) {
        throw new Error(
          `Pack ${input.pack} dependency selected unknown or out-of-scope asset ${assetId}`,
        );
      }
    }
  }
  const applicableAssets =
    requestedAssetIds.size > 0
      ? allApplicableAssets.filter(({ id }) => requestedAssetIds.has(id))
      : allApplicableAssets;
  const changedCanonicalPaths: string[] = [];
  const operations: PackReconcileOperation[] = [];
  const retainedAssets = input.retainedAssets ?? [];

  const directDependencyRetention =
    input.dependency?.lease === 'release' && input.inventory.intent.direct;
  for (const asset of applicableAssets) {
    const assetOperations =
      input.action === 'remove'
        ? [
            directDependencyRetention ? null : removalOperation(asset, input),
          ].filter(
            (operation): operation is PackReconcileOperation =>
              operation !== null,
          )
        : materializationOperations(asset, input);
    operations.push(...assetOperations);
    if (assetOperations.length > 0) {
      const path = canonicalPath(asset);
      if (path) changedCanonicalPaths.push(path);
    }
  }

  if (input.dependency) {
    const desiredLease = input.dependency.lease === 'acquire';
    const hasLease = input.inventory.intent.requiredBy.includes(
      input.dependency.requiredBy,
    );
    if (hasLease !== desiredLease) {
      operations.push({
        kind: 'write-lease',
        pack: input.pack,
        scope: input.scope,
        requiredBy: input.dependency.requiredBy,
        enabled: desiredLease,
      });
    }
  } else {
    const desiredIntent = input.action !== 'remove';
    if (
      input.inventory.intent.direct !== desiredIntent ||
      (desiredIntent && input.inventory.intent.source !== 'declared')
    ) {
      operations.push({
        kind: 'write-intent',
        pack: input.pack,
        scope: input.scope,
        enabled: desiredIntent,
      });
    }
  }

  const managedAssets = applicableAssets.filter(
    (asset) => asset.ownership[input.scope] === 'managed',
  );
  const retainedPresent = managedAssets.filter(
    (asset) =>
      (retainedAssets.some(({ assetId }) => assetId === asset.id) ||
        input.retainedDependencyAssetIds?.includes(asset.id)) &&
      input.inventory.assets.some(
        ({ definition, status }) =>
          definition.id === asset.id && status !== 'missing',
      ),
  ).length;
  const expectedRemovalCompleteness =
    retainedPresent === 0
      ? 'absent'
      : retainedPresent === managedAssets.length
        ? 'complete'
        : 'partial';
  const retainedSelectedAssets = applicableAssets.filter(
    (asset) =>
      retainedAssets.some(({ assetId }) => assetId === asset.id) ||
      input.retainedDependencyAssetIds?.includes(asset.id),
  ).length;
  const expectedSelectedRemovalStatus =
    retainedSelectedAssets === 0
      ? 'missing'
      : retainedSelectedAssets === applicableAssets.length
        ? 'current'
        : null;
  const expectedAssetStatuses =
    requestedAssetIds.size === 0
      ? undefined
      : (Object.fromEntries(
          applicableAssets.map((asset) => [
            asset.id,
            input.action !== 'remove' ||
            directDependencyRetention ||
            retainedAssets.some(({ assetId }) => assetId === asset.id) ||
            input.retainedDependencyAssetIds?.includes(asset.id)
              ? 'current'
              : 'missing',
          ]),
        ) satisfies Record<string, 'current' | 'missing'>);

  return {
    pack: input.pack,
    scope: input.scope,
    action: input.action,
    operations,
    expectedCompleteness:
      requestedAssetIds.size > 0
        ? null
        : input.action === 'remove'
          ? expectedRemovalCompleteness
          : 'complete',
    selectedAssetIds: applicableAssets.map(({ id }) => id),
    expectedAssetStatus:
      requestedAssetIds.size === 0
        ? null
        : input.action !== 'remove' || directDependencyRetention
          ? 'current'
          : expectedSelectedRemovalStatus,
    expectedAssetStatuses,
    changedCanonicalPaths: [...new Set(changedCanonicalPaths)],
    retainedAssets,
    retainedDependencyAssetIds: input.retainedDependencyAssetIds ?? [],
  };
}

export function serializePackReconcilePlan(plan: PackReconcilePlan): string {
  return JSON.stringify(plan, null, 2);
}
