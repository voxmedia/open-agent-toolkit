import {
  hasScopedPackPlacementEvidence,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import {
  planPackReconcile,
  type PackReconcileOperation,
  type PackReconcilePlan,
} from '@commands/tools/shared/pack-reconcile';
import type { PackAssetStatus, PackName } from '@commands/tools/shared/types';
import type { ConcreteScope } from '@shared/types';

export interface MigrationAssetPreview {
  assetId: string;
  path: string;
  status: PackAssetStatus;
}

export interface PackMigrationPreview {
  pack: PackName;
  from: ConcreteScope;
  to: ConcreteScope;
  sourceIntent: ScopedPackInventory['intent']['source'];
  status: 'ready';
  additions: readonly PackReconcileOperation[];
  duplicates: readonly MigrationAssetPreview[];
  conflicts: readonly MigrationAssetPreview[];
  removals: readonly MigrationAssetPreview[];
  retained: readonly MigrationAssetPreview[];
  destinationPlan: PackReconcilePlan;
}

export interface PackMigrationOutcome {
  preview: PackMigrationPreview;
  status:
    | 'previewed'
    | 'destination-verified'
    | 'retained-both'
    | 'migrated'
    | 'source-removal-failed';
  destinationInventory?: ScopedPackInventory;
  sourceInventory?: ScopedPackInventory;
  recovery?: readonly string[];
}

export interface PlanPackMigrationInput {
  pack: PackName;
  from: ConcreteScope;
  to: ConcreteScope;
  sourceRoot: string;
  destinationRoot: string;
  assetsRoot: string;
  sourceInventory: ScopedPackInventory;
  destinationInventory: ScopedPackInventory;
}

function assertInventory(
  inventory: ScopedPackInventory,
  pack: PackName,
  scope: ConcreteScope,
  label: string,
): void {
  if (inventory.pack !== pack || inventory.scope !== scope) {
    throw new Error(
      `Migration ${label} inventory does not match pack ${pack} at ${scope} scope`,
    );
  }
}

function previewAsset(
  asset: ScopedPackInventory['assets'][number],
): MigrationAssetPreview {
  return {
    assetId: asset.definition.id,
    path: asset.path,
    status: asset.status,
  };
}

export function planPackMigration(
  input: PlanPackMigrationInput,
): PackMigrationPreview {
  if (input.from === input.to) {
    throw new Error('Migration source and destination scopes must differ');
  }
  const definition = getPackDefinition(input.pack);
  if (!definition.allowedScopes.includes(input.from)) {
    throw new Error(
      `Pack ${input.pack} does not allow ${input.from} source scope`,
    );
  }
  if (!definition.allowedScopes.includes(input.to)) {
    throw new Error(
      `Pack ${input.pack} does not allow ${input.to} destination scope`,
    );
  }
  assertInventory(input.sourceInventory, input.pack, input.from, 'source');
  assertInventory(
    input.destinationInventory,
    input.pack,
    input.to,
    'destination',
  );
  if (!hasScopedPackPlacementEvidence(input.sourceInventory)) {
    throw new Error(
      `Pack ${input.pack} is not installed at ${input.from} scope`,
    );
  }

  const legacyConflicts = input.destinationInventory.intent.diagnostics.filter(
    ({ code }) => code === 'legacy-false-conflict',
  );
  if (legacyConflicts.length > 0) {
    throw new Error(
      `Migration destination conflict: ${legacyConflicts.map(({ message }) => message).join('; ')}`,
    );
  }

  const conflicts = input.destinationInventory.assets.filter(
    ({ definition: asset, status }) =>
      asset.ownership[input.to] === 'managed' && status === 'newer',
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Migration destination conflict: ${conflicts.map(({ definition: asset }) => asset.id).join(', ')}`,
    );
  }

  const destinationPlan = planPackReconcile({
    pack: input.pack,
    scope: input.to,
    scopeRoot: input.destinationRoot,
    assetsRoot: input.assetsRoot,
    action: 'migrate-destination',
    inventory: input.destinationInventory,
  });
  const additions = destinationPlan.operations.filter(
    ({ kind }) => kind !== 'write-intent',
  );
  const duplicates = input.destinationInventory.assets
    .filter(
      ({ definition: asset, status }) =>
        asset.ownership[input.to] === 'managed' && status === 'current',
    )
    .map(previewAsset);
  const removals = input.sourceInventory.assets
    .filter(
      ({ definition: asset, status }) =>
        asset.ownership[input.from] === 'managed' && status !== 'missing',
    )
    .map(previewAsset);
  const retained = [
    ...input.sourceInventory.assets,
    ...input.destinationInventory.assets,
  ]
    .filter(({ definition: asset, status }) =>
      asset.ownership[input.from] === 'seed-if-missing' ||
      asset.ownership[input.to] === 'seed-if-missing'
        ? status !== 'missing'
        : false,
    )
    .map(previewAsset)
    .filter(
      (entry, index, entries) =>
        entries.findIndex(
          (candidate) =>
            candidate.assetId === entry.assetId &&
            candidate.path === entry.path,
        ) === index,
    );

  return {
    pack: input.pack,
    from: input.from,
    to: input.to,
    sourceIntent: input.sourceInventory.intent.source,
    status: 'ready',
    additions,
    duplicates,
    conflicts: conflicts.map(previewAsset),
    removals,
    retained,
    destinationPlan,
  };
}
