import {
  applyPackReconcilePlan,
  type ApplyPackReconcileDependencies,
} from '@commands/tools/shared/apply-pack-reconcile';
import { canonicalPathsForPack } from '@commands/tools/shared/install-sync-context';
import {
  hasScopedPackPlacementEvidence,
  type ScopedPackInventory,
} from '@commands/tools/shared/pack-inventory';
import type { PackLifecycleResult } from '@commands/tools/shared/pack-lifecycle';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import {
  planPackReconcile,
  type PackSharedOwnerRetention,
  type PackReconcilePlan,
} from '@commands/tools/shared/pack-reconcile';
import type {
  PackAssetKind,
  PackAssetStatus,
  PackName,
} from '@commands/tools/shared/types';
import type { ConcreteScope } from '@shared/types';
export interface MigrationAssetPreview {
  assetId: string;
  kind: PackAssetKind;
  scope: ConcreteScope;
  path: string;
  status: PackAssetStatus;
  reason?: string;
}

export interface PackMigrationPreview {
  pack: PackName;
  from: ConcreteScope;
  to: ConcreteScope;
  projectRoot: string;
  sourceIntent: ScopedPackInventory['intent']['source'];
  status: 'ready' | 'blocked';
  additions: readonly MigrationAssetPreview[];
  duplicates: readonly MigrationAssetPreview[];
  conflicts: readonly MigrationAssetPreview[];
  removals: readonly MigrationAssetPreview[];
  retained: readonly MigrationAssetPreview[];
  diagnostics: ScopedPackInventory['intent']['diagnostics'];
  destinationPlan: PackReconcilePlan;
}

export interface MigrationPendingSync {
  scope: ConcreteScope;
  action: 'install' | 'remove';
  projectRoot: string;
  canonicalPaths: readonly string[];
  command: string;
}

export interface PackMigrationOutcome {
  preview: PackMigrationPreview;
  status:
    | 'previewed'
    | 'blocked'
    | 'destination-verified'
    | 'destination-sync-failed'
    | 'retained-both'
    | 'migrated'
    | 'source-removal-failed'
    | 'source-sync-failed';
  destinationInventory?: ScopedPackInventory;
  sourceInventory?: ScopedPackInventory;
  recovery?: readonly string[];
  pendingSync?: MigrationPendingSync;
  dependencyLifecycles?: readonly PackLifecycleResult[];
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
  sourceRetentions?: readonly PackSharedOwnerRetention[];
}

export interface MigrationSyncInput {
  scope: ConcreteScope;
  action: 'install' | 'remove';
  canonicalPaths: readonly string[];
}

export interface ExecuteMigrationDestinationDependencies {
  apply?: typeof applyPackReconcilePlan;
  applyDependencies: ApplyPackReconcileDependencies;
  sync?: (input: MigrationSyncInput) => Promise<void>;
  acquireDependencies?: () => Promise<PackLifecycleResult[]>;
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
  resolveSourceRetentions?: () => Promise<PackSharedOwnerRetention[]>;
  resolveRetainedDependencyAssetIds?: () => Promise<string[]>;
  sync?: (input: MigrationSyncInput) => Promise<void>;
  releaseDependencies?: () => Promise<PackLifecycleResult[]>;
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
  scope: ConcreteScope,
  reason?: string,
): MigrationAssetPreview {
  return {
    assetId: asset.definition.id,
    kind: asset.definition.kind,
    scope,
    path: asset.path,
    status: asset.status,
    ...(reason ? { reason } : {}),
  };
}

export function planPackMigration(
  input: PlanPackMigrationInput,
): PackMigrationPreview {
  if (input.from === input.to) {
    throw new Error('Migration source and destination scopes must differ');
  }
  const packDefinition = getPackDefinition(input.pack);
  if (!packDefinition.allowedScopes.includes(input.from)) {
    throw new Error(
      `Pack ${input.pack} does not allow ${input.from} source scope`,
    );
  }
  if (!packDefinition.allowedScopes.includes(input.to)) {
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

  const conflicts = input.destinationInventory.assets.filter(
    ({ definition: asset, status }) =>
      asset.ownership[input.to] === 'managed' && status === 'newer',
  );
  const unfilteredDestinationPlan = planPackReconcile({
    pack: input.pack,
    scope: input.to,
    scopeRoot: input.destinationRoot,
    assetsRoot: input.assetsRoot,
    action: 'migrate-destination',
    inventory: input.destinationInventory,
  });
  const conflictIds = new Set(
    conflicts.map(({ definition: asset }) => asset.id),
  );
  const conflictCanonicalPaths = new Set(
    conflicts.flatMap(({ definition: asset }) =>
      asset.kind === 'skill' || asset.kind === 'agent'
        ? [asset.destination]
        : [],
    ),
  );
  const destinationPlan: PackReconcilePlan = {
    ...unfilteredDestinationPlan,
    operations: unfilteredDestinationPlan.operations.filter(
      (operation) =>
        operation.kind === 'write-intent' ||
        operation.kind === 'write-lease' ||
        !conflictIds.has(operation.assetId),
    ),
    changedCanonicalPaths:
      unfilteredDestinationPlan.changedCanonicalPaths.filter(
        (path) => !conflictCanonicalPaths.has(path),
      ),
  };
  const additionIds = new Set(
    destinationPlan.operations.flatMap((operation) =>
      operation.kind === 'write-intent' || operation.kind === 'write-lease'
        ? []
        : [operation.assetId],
    ),
  );
  const additions = input.destinationInventory.assets
    .filter(
      ({ definition }) =>
        additionIds.has(definition.id) && !conflictIds.has(definition.id),
    )
    .map((asset) => previewAsset(asset, input.to, 'destination-reconcile'));
  const duplicates = input.destinationInventory.assets
    .filter(
      ({ definition: asset, status }) =>
        asset.ownership[input.to] === 'managed' && status === 'current',
    )
    .map((asset) => previewAsset(asset, input.to, 'already-current'));
  const retainedIds = new Set(
    (input.sourceRetentions ?? []).map(({ assetId }) => assetId),
  );
  const removals = input.sourceInventory.assets
    .filter(
      ({ definition: asset, status }) =>
        asset.ownership[input.from] === 'managed' &&
        status !== 'missing' &&
        !retainedIds.has(asset.id),
    )
    .map((asset) => previewAsset(asset, input.from, 'source-managed'));
  const retained = input.sourceInventory.assets
    .filter(
      ({ definition: asset, status }) =>
        asset.ownership[input.from] === 'seed-if-missing' &&
        status !== 'missing',
    )
    .map((asset) => previewAsset(asset, input.from, 'scope-owner-data'))
    .concat(
      input.destinationInventory.assets
        .filter(
          ({ definition: asset, status }) =>
            asset.ownership[input.to] === 'seed-if-missing' &&
            status !== 'missing',
        )
        .map((asset) => previewAsset(asset, input.to, 'scope-owner-data')),
    )
    .concat(
      (input.sourceRetentions ?? []).flatMap((retention) => {
        const asset = input.sourceInventory.assets.find(
          ({ definition }) => definition.id === retention.assetId,
        );
        return asset
          ? [
              previewAsset(
                asset,
                input.from,
                `shared owner: ${retention.retainedBy.join(', ')}`,
              ),
            ]
          : [];
      }),
    )
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
    projectRoot:
      input.from === 'project' ? input.sourceRoot : input.destinationRoot,
    sourceIntent: input.sourceInventory.intent.source,
    status: conflicts.length > 0 ? 'blocked' : 'ready',
    additions,
    duplicates,
    conflicts: conflicts.map((asset) =>
      previewAsset(asset, input.to, 'newer-destination-asset'),
    ),
    removals,
    retained,
    diagnostics: input.destinationInventory.intent.diagnostics,
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
  if (preview.status === 'blocked' || preview.conflicts.length > 0) {
    throw new Error(
      `Migration destination conflicts must be resolved before mutation: ${preview.conflicts.map(({ assetId }) => assetId).join(', ')}`,
    );
  }

  const dependencyLifecycles =
    (await dependencies.acquireDependencies?.()) ?? [];
  const applied = await (dependencies.apply ?? applyPackReconcilePlan)(
    preview.destinationPlan,
    destinationRoot,
    { ...dependencies.applyDependencies, sync: undefined },
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

  const canonicalPaths = canonicalPathsForPack(preview.pack);
  try {
    await dependencies.sync?.({
      scope: preview.to,
      action: 'install',
      canonicalPaths,
    });
  } catch (error) {
    const pendingSync = pendingSyncState(
      preview,
      preview.to,
      'install',
      canonicalPaths,
    );
    return {
      preview,
      status: 'destination-sync-failed',
      destinationInventory,
      pendingSync,
      recovery: [
        `Destination provider sync failed: ${error instanceof Error ? error.message : String(error)}`,
        `Source was retained. Retry provider sync: ${pendingSync.command}`,
        migrationRetry(preview),
      ],
    };
  }

  return {
    preview,
    status: 'destination-verified',
    destinationInventory,
    dependencyLifecycles,
  };
}

function migrationRetry(preview: PackMigrationPreview): string {
  return `Re-run interactively: ${renderCommand([
    'oat',
    '--cwd',
    preview.projectRoot,
    'tools',
    'migrate',
    '--pack',
    preview.pack,
    '--from',
    preview.from,
    '--to',
    preview.to,
  ])}`;
}

function pendingSyncState(
  preview: PackMigrationPreview,
  scope: ConcreteScope,
  action: 'install' | 'remove',
  canonicalPaths: readonly string[],
): MigrationPendingSync {
  const flag =
    action === 'install' ? '--install-canonical' : '--remove-canonical';
  return {
    scope,
    action,
    projectRoot: preview.projectRoot,
    canonicalPaths,
    command: renderCommand([
      'oat',
      '--cwd',
      preview.projectRoot,
      'sync',
      '--scope',
      scope,
      ...canonicalPaths.flatMap((path) => [flag, path]),
    ]),
  };
}

function quoteCommandArgument(argument: string): string {
  if (/^[a-zA-Z0-9_@+=:,./-]+$/.test(argument)) return argument;
  return process.platform === 'win32'
    ? `'${argument.replaceAll("'", "''")}'`
    : `'${argument.replaceAll("'", `'"'"'`)}'`;
}

function renderCommand(arguments_: readonly string[]): string {
  return arguments_.map(quoteCommandArgument).join(' ');
}

export async function completeMigrationSourceRemoval(
  destination: PackMigrationOutcome,
  input: CompleteMigrationSourceRemovalInput,
  dependencies: CompleteMigrationSourceRemovalDependencies,
): Promise<PackMigrationOutcome> {
  if (
    destination.status !== 'destination-verified' &&
    destination.status !== 'source-removal-failed' &&
    destination.status !== 'source-sync-failed'
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
  if (destination.status === 'source-sync-failed') {
    if (
      !destination.pendingSync ||
      destination.pendingSync.action !== 'remove'
    ) {
      throw new Error('Source sync retry is missing its canonical path state');
    }
    try {
      await dependencies.sync?.({
        scope: destination.pendingSync.scope,
        action: 'remove',
        canonicalPaths: destination.pendingSync.canonicalPaths,
      });
      return {
        ...destination,
        status: 'migrated',
        pendingSync: undefined,
        recovery: undefined,
      };
    } catch (error) {
      return {
        ...destination,
        recovery: [
          `Source provider sync failed: ${error instanceof Error ? error.message : String(error)}`,
          `Retry provider sync: ${destination.pendingSync.command}`,
        ],
      };
    }
  }
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
  const sourceRetentions =
    (await dependencies.resolveSourceRetentions?.()) ?? [];
  const retainedDependencyAssetIds =
    (await dependencies.resolveRetainedDependencyAssetIds?.()) ?? [];
  const sourcePlan = (dependencies.plan ?? planPackReconcile)({
    pack: preview.pack,
    scope: preview.from,
    scopeRoot: input.sourceRoot,
    assetsRoot: input.assetsRoot,
    action: 'remove',
    inventory: sourceBefore,
    retainedAssets: sourceRetentions,
    retainedDependencyAssetIds,
  });

  try {
    const applied = await (dependencies.apply ?? applyPackReconcilePlan)(
      sourcePlan,
      input.sourceRoot,
      {
        ...dependencies.applyDependencies,
        inventory: dependencies.inventory,
        sync: undefined,
      },
    );
    const dependencyLifecycles =
      (await dependencies.releaseDependencies?.()) ?? [];
    const removedCanonicalPaths = [
      ...new Set([
        ...sourcePlan.changedCanonicalPaths,
        ...dependencyLifecycles.flatMap(
          ({ plan }) => plan.changedCanonicalPaths,
        ),
      ]),
    ];
    try {
      await dependencies.sync?.({
        scope: preview.from,
        action: 'remove',
        canonicalPaths: removedCanonicalPaths,
      });
    } catch (error) {
      const pendingSync = pendingSyncState(
        preview,
        preview.from,
        'remove',
        removedCanonicalPaths,
      );
      return {
        preview,
        status: 'source-sync-failed',
        destinationInventory: destination.destinationInventory,
        sourceInventory: applied.inventory,
        dependencyLifecycles: [
          ...(destination.dependencyLifecycles ?? []),
          ...dependencyLifecycles,
        ],
        pendingSync,
        recovery: [
          `Source provider sync failed: ${error instanceof Error ? error.message : String(error)}`,
          `Retry provider sync: ${pendingSync.command}`,
        ],
      };
    }
    return {
      preview,
      status: 'migrated',
      destinationInventory: destination.destinationInventory,
      sourceInventory: applied.inventory,
      dependencyLifecycles: [
        ...(destination.dependencyLifecycles ?? []),
        ...dependencyLifecycles,
      ],
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
          asset.ownership[preview.from] === 'managed' &&
          status !== 'missing' &&
          !sourceRetentions.some(({ assetId }) => assetId === asset.id),
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
