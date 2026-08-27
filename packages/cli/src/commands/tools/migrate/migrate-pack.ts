import {
  applyPackReconcilePlan,
  type ApplyPackReconcileDependencies,
} from '@commands/tools/shared/apply-pack-reconcile';
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

export interface ExecuteMigrationDestinationDependencies {
  apply?: typeof applyPackReconcilePlan;
  applyDependencies: ApplyPackReconcileDependencies;
}

export interface CompleteMigrationSourceRemovalInput {
  confirmation: 'confirmed' | 'declined' | 'non-interactive';
  sourceRoot: string;
  assetsRoot: string;
}

export interface CompleteMigrationSourceRemovalDependencies {
  inventory: () => Promise<ScopedPackInventory>;
  plan?: typeof planPackReconcile;
  apply?: typeof applyPackReconcilePlan;
  applyDependencies: Omit<ApplyPackReconcileDependencies, 'inventory'>;
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
    ...input.sourceInventory.assets.filter(
      ({ definition: asset, status }) =>
        asset.ownership[input.from] === 'seed-if-missing' &&
        status !== 'missing',
    ),
    ...input.destinationInventory.assets.filter(
      ({ definition: asset, status }) =>
        asset.ownership[input.to] === 'seed-if-missing' && status !== 'missing',
    ),
  ]
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

export async function executeMigrationDestination(
  preview: PackMigrationPreview,
  destinationRoot: string,
  dependencies: ExecuteMigrationDestinationDependencies,
): Promise<PackMigrationOutcome> {
  if (
    preview.destinationPlan.pack !== preview.pack ||
    preview.destinationPlan.scope !== preview.to ||
    preview.destinationPlan.action !== 'migrate-destination'
  ) {
    throw new Error('Migration destination plan does not match the preview');
  }
  if (preview.conflicts.length > 0) {
    throw new Error(
      `Migration destination conflicts must be resolved before mutation: ${preview.conflicts.map(({ assetId }) => assetId).join(', ')}`,
    );
  }

  const applied = await (dependencies.apply ?? applyPackReconcilePlan)(
    preview.destinationPlan,
    destinationRoot,
    dependencies.applyDependencies,
  );
  const destinationInventory = applied.inventory;
  const drifted = destinationInventory.assets.filter(
    ({ definition: asset, status }) =>
      asset.ownership[preview.to] === 'managed' && status !== 'current',
  );
  if (
    destinationInventory.pack !== preview.pack ||
    destinationInventory.scope !== preview.to ||
    destinationInventory.completeness !== 'complete' ||
    !destinationInventory.intent.enabled ||
    destinationInventory.intent.source !== 'declared' ||
    drifted.length > 0
  ) {
    throw new Error(
      `Migration destination verification did not produce a complete current declared installation for ${preview.pack} at ${preview.to} scope`,
    );
  }

  return {
    preview,
    status: 'destination-verified',
    destinationInventory,
  };
}

function migrationRetry(preview: PackMigrationPreview): string {
  return `Re-run interactively: oat tools migrate --pack ${preview.pack} --from ${preview.from} --to ${preview.to}`;
}

export async function completeMigrationSourceRemoval(
  destination: PackMigrationOutcome,
  input: CompleteMigrationSourceRemovalInput,
  dependencies: CompleteMigrationSourceRemovalDependencies,
): Promise<PackMigrationOutcome> {
  if (
    destination.status !== 'destination-verified' &&
    destination.status !== 'source-removal-failed'
  ) {
    throw new Error(
      'Migration source removal requires a verified destination outcome',
    );
  }
  if (!destination.destinationInventory) {
    throw new Error(
      'Migration source removal requires verified destination inventory',
    );
  }
  const preview = destination.preview;
  if (input.confirmation !== 'confirmed') {
    return {
      ...destination,
      status: 'retained-both',
      recovery: [
        input.confirmation === 'non-interactive'
          ? 'Source removal requires interactive confirmation; both scopes were retained.'
          : 'Source removal was declined; both scopes were retained.',
        migrationRetry(preview),
      ],
    };
  }

  const sourceBefore = await dependencies.inventory();
  assertInventory(sourceBefore, preview.pack, preview.from, 'source');
  const sourcePlan = (dependencies.plan ?? planPackReconcile)({
    pack: preview.pack,
    scope: preview.from,
    scopeRoot: input.sourceRoot,
    assetsRoot: input.assetsRoot,
    action: 'remove',
    inventory: sourceBefore,
  });

  try {
    const applied = await (dependencies.apply ?? applyPackReconcilePlan)(
      sourcePlan,
      input.sourceRoot,
      {
        ...dependencies.applyDependencies,
        inventory: dependencies.inventory,
      },
    );
    return {
      preview,
      status: 'migrated',
      destinationInventory: destination.destinationInventory,
      sourceInventory: applied.inventory,
    };
  } catch (error) {
    let sourceInventory = sourceBefore;
    let inventoryFailure: string | null = null;
    try {
      sourceInventory = await dependencies.inventory();
    } catch (inventoryError) {
      inventoryFailure =
        inventoryError instanceof Error
          ? inventoryError.message
          : String(inventoryError);
    }
    const remaining = sourceInventory.assets
      .filter(
        ({ definition: asset, status }) =>
          asset.ownership[preview.from] === 'managed' && status !== 'missing',
      )
      .map(({ path }) => path);
    const detail = error instanceof Error ? error.message : String(error);
    return {
      preview,
      status: 'source-removal-failed',
      destinationInventory: destination.destinationInventory,
      sourceInventory,
      recovery: [
        `Source removal failed: ${detail}`,
        `Remaining source paths: ${remaining.length > 0 ? remaining.join(', ') : 'inventory unavailable'}`,
        ...(inventoryFailure
          ? [`Source re-inventory failed: ${inventoryFailure}`]
          : []),
        migrationRetry(preview),
      ],
    };
  }
}
