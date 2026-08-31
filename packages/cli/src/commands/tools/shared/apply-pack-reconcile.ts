import { chmod, rm } from 'node:fs/promises';

import {
  copyDirWithStatus,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import {
  type ManagedRootName,
  type ResolvedManagedRoot,
  resolveManagedScopeRoots,
  validateManagedPath,
} from '@fs/paths';

import type { ScopedPackInventory } from './pack-inventory';
import type {
  PackReconcileOperation,
  PackReconcilePlan,
} from './pack-reconcile';

export interface ApplyPackReconcileDependencies {
  resolveManagedRoots?: (
    scopeRoot: string,
  ) => Promise<Record<ManagedRootName, ResolvedManagedRoot>>;
  validatePath?: (
    candidatePath: string,
    managedRoot: ResolvedManagedRoot,
  ) => Promise<{ realManagedRoot: string; realPath: string }>;
  copyDirectory?: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<unknown>;
  copyFile?: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<unknown>;
  removePath?: (path: string, directory: boolean) => Promise<void>;
  chmodPath?: (path: string, mode: number) => Promise<void>;
  writeGenerated: (
    operation: Extract<PackReconcileOperation, { kind: 'write-generated' }>,
  ) => Promise<void>;
  writeIntent: (
    operation: Extract<PackReconcileOperation, { kind: 'write-intent' }>,
  ) => Promise<void>;
  writeLease?: (
    operation: Extract<PackReconcileOperation, { kind: 'write-lease' }>,
  ) => Promise<void>;
  inventory: () => Promise<ScopedPackInventory>;
  sync?: (input: {
    scope: PackReconcilePlan['scope'];
    action: PackReconcilePlan['action'];
    changedCanonicalPaths: readonly string[];
  }) => Promise<void>;
}

export interface ApplyPackReconcileResult {
  applied: readonly PackReconcileOperation[];
  inventory: ScopedPackInventory;
  synced: boolean;
}

export interface PackReconcilePreflightDependencies {
  resolveManagedRoots?: ApplyPackReconcileDependencies['resolveManagedRoots'];
  validatePath?: ApplyPackReconcileDependencies['validatePath'];
}

function operationPath(operation: PackReconcileOperation): string | null {
  switch (operation.kind) {
    case 'copy-dir':
    case 'copy-file':
    case 'write-generated':
      return operation.destination;
    case 'chmod':
    case 'remove-dir':
    case 'remove-file':
      return operation.path;
    case 'write-intent':
    case 'write-lease':
      return null;
  }
}

function managedRootForPath(path: string): ManagedRootName {
  const normalized = path.replaceAll('\\', '/');
  if (normalized.includes('/.agents/')) return '.agents';
  if (normalized.includes('/.oat/')) return '.oat';
  throw new Error(`Pack reconcile path is outside a managed root: ${path}`);
}

export async function preflightPackReconcilePlans(
  entries: readonly { plan: PackReconcilePlan; scopeRoot: string }[],
  dependencies: PackReconcilePreflightDependencies = {},
): Promise<void> {
  const resolveRoots =
    dependencies.resolveManagedRoots ?? resolveManagedScopeRoots;
  const validate = dependencies.validatePath ?? validateManagedPath;
  const rootsByScope = new Map<
    string,
    Record<ManagedRootName, ResolvedManagedRoot>
  >();
  for (const { plan, scopeRoot } of entries) {
    let roots = rootsByScope.get(scopeRoot);
    if (!roots) {
      roots = await resolveRoots(scopeRoot);
      rootsByScope.set(scopeRoot, roots);
    }
    const seen = new Set<string>();
    for (const operation of plan.operations) {
      const path = operationPath(operation);
      if (!path || seen.has(path)) continue;
      await validate(path, roots[managedRootForPath(path)]);
      seen.add(path);
    }
  }
}

function assertExpectedInventory(
  plan: PackReconcilePlan,
  inventory: ScopedPackInventory,
): void {
  if (
    inventory.pack !== plan.pack ||
    inventory.scope !== plan.scope ||
    (plan.expectedCompleteness !== null &&
      inventory.completeness !== plan.expectedCompleteness)
  ) {
    throw new Error(
      `Pack ${plan.pack} ${plan.scope} verification expected ${plan.expectedCompleteness} but found ${inventory.completeness}`,
    );
  }
  if (plan.expectedAssetStatuses) {
    const invalid = inventory.assets.filter(({ definition, status }) => {
      const expected = plan.expectedAssetStatuses?.[definition.id];
      return expected !== undefined && status !== expected;
    });
    if (invalid.length > 0) {
      throw new Error(
        `Pack ${plan.pack} ${plan.scope} verification expected selected asset states: ${invalid.map(({ definition, status }) => `${definition.id} expected ${plan.expectedAssetStatuses?.[definition.id]} (${status})`).join(', ')}`,
      );
    }
  } else if (plan.expectedAssetStatus) {
    const invalid = inventory.assets.filter(
      ({ definition, status }) =>
        plan.selectedAssetIds.includes(definition.id) &&
        status !== plan.expectedAssetStatus,
    );
    if (invalid.length > 0) {
      throw new Error(
        `Pack ${plan.pack} ${plan.scope} verification expected selected assets ${plan.expectedAssetStatus}: ${invalid.map(({ definition, status }) => `${definition.id} (${status})`).join(', ')}`,
      );
    }
  }
  if (plan.action === 'remove') return;
  const drifted = inventory.assets.filter(
    ({ definition, status }) =>
      definition.ownership[plan.scope] === 'managed' &&
      (plan.expectedCompleteness !== null ||
        plan.selectedAssetIds.includes(definition.id)) &&
      status !== 'current',
  );
  if (drifted.length > 0) {
    throw new Error(
      `Pack ${plan.pack} ${plan.scope} verification found drifted managed assets: ${drifted.map(({ definition, status }) => `${definition.id} (${status})`).join(', ')}`,
    );
  }
}

export async function applyPackReconcilePlan(
  plan: PackReconcilePlan,
  scopeRoot: string,
  dependencies: ApplyPackReconcileDependencies,
): Promise<ApplyPackReconcileResult> {
  const resolveRoots =
    dependencies.resolveManagedRoots ?? resolveManagedScopeRoots;
  const validate = dependencies.validatePath ?? validateManagedPath;
  const roots = await resolveRoots(scopeRoot);
  const validatedPaths = new Map<string, string>();

  // Validate every planned filesystem target before the first mutation.
  for (const operation of plan.operations) {
    const path = operationPath(operation);
    if (!path || validatedPaths.has(path)) continue;
    const { realPath } = await validate(path, roots[managedRootForPath(path)]);
    validatedPaths.set(path, realPath);
  }

  const applied: PackReconcileOperation[] = [];
  const stateOperations: Array<
    Extract<PackReconcileOperation, { kind: 'write-intent' | 'write-lease' }>
  > = [];

  for (const operation of plan.operations) {
    if (operation.kind === 'write-intent' || operation.kind === 'write-lease') {
      stateOperations.push(operation);
      continue;
    }
    const path = operationPath(operation);
    if (!path) continue;
    const realPath = validatedPaths.get(path);
    if (!realPath) throw new Error(`Missing validated path for ${path}`);
    switch (operation.kind) {
      case 'copy-dir':
        await (dependencies.copyDirectory ?? copyDirWithStatus)(
          operation.source,
          realPath,
          operation.force,
        );
        break;
      case 'copy-file':
        await (dependencies.copyFile ?? copyFileWithStatus)(
          operation.source,
          realPath,
          operation.force,
        );
        break;
      case 'write-generated':
        await dependencies.writeGenerated({
          ...operation,
          destination: realPath,
        });
        break;
      case 'chmod':
        await (dependencies.chmodPath ?? chmod)(realPath, operation.mode);
        break;
      case 'remove-dir':
      case 'remove-file':
        await (
          dependencies.removePath ??
          (async (target, directory) =>
            rm(target, { recursive: directory, force: true }))
        )(realPath, operation.kind === 'remove-dir');
        break;
    }
    applied.push(operation);
  }

  const verifiedInventory = await dependencies.inventory();
  assertExpectedInventory(plan, verifiedInventory);
  for (const operation of stateOperations) {
    if (operation.kind === 'write-intent') {
      await dependencies.writeIntent(operation);
    } else {
      if (!dependencies.writeLease) {
        throw new Error('Pack dependency reconciliation requires writeLease');
      }
      await dependencies.writeLease(operation);
    }
    applied.push(operation);
  }
  const inventory =
    stateOperations.length > 0
      ? await dependencies.inventory()
      : verifiedInventory;
  assertExpectedInventory(plan, inventory);

  const shouldSync = plan.changedCanonicalPaths.length > 0 && dependencies.sync;
  if (shouldSync) {
    await dependencies.sync!({
      scope: plan.scope,
      action: plan.action,
      changedCanonicalPaths: plan.changedCanonicalPaths,
    });
  }
  return { applied, inventory, synced: Boolean(shouldSync) };
}
