import { join } from 'node:path';

import type { ConcreteScope } from '@shared/types';

import type { ScopedPackInventory } from './pack-inventory';
import { getPackDefinition } from './pack-manifest';
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
    };

export interface PackReconcilePlan {
  pack: PackName;
  scope: ConcreteScope;
  action: PackReconcileAction;
  operations: readonly PackReconcileOperation[];
  expectedCompleteness: PackCompleteness;
  changedCanonicalPaths: readonly string[];
}

export interface PlanPackReconcileInput {
  pack: PackName;
  scope: ConcreteScope;
  scopeRoot: string;
  assetsRoot: string;
  action: PackReconcileAction;
  inventory: ScopedPackInventory;
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
  if (ownership === 'seed-if-missing' && !isMissing) return [];
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
  const definition = getPackDefinition(input.pack);
  if (!definition.allowedScopes.includes(input.scope)) {
    throw new Error(`Pack ${input.pack} does not allow ${input.scope} scope`);
  }
  const applicableAssets = definition.assets.filter(({ scopes }) =>
    scopes.includes(input.scope),
  );
  const changedCanonicalPaths: string[] = [];
  const operations: PackReconcileOperation[] = [];

  for (const asset of applicableAssets) {
    const assetOperations =
      input.action === 'remove'
        ? [removalOperation(asset, input)].filter(
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

  const desiredIntent = input.action !== 'remove';
  if (
    input.inventory.intent.enabled !== desiredIntent ||
    (desiredIntent && input.inventory.intent.source !== 'declared')
  ) {
    operations.push({
      kind: 'write-intent',
      pack: input.pack,
      scope: input.scope,
      enabled: desiredIntent,
    });
  }

  return {
    pack: input.pack,
    scope: input.scope,
    action: input.action,
    operations,
    expectedCompleteness: input.action === 'remove' ? 'absent' : 'complete',
    changedCanonicalPaths: [...new Set(changedCanonicalPaths)],
  };
}

export function serializePackReconcilePlan(plan: PackReconcilePlan): string {
  return JSON.stringify(plan, null, 2);
}
