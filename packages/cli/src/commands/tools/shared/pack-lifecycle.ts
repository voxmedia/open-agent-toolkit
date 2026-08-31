import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { readOatConfig, writeOatConfig } from '@config/oat-config';
import type { ConcreteScope } from '@shared/types';

import {
  applyPackReconcilePlan,
  type ApplyPackReconcileDependencies,
  type ApplyPackReconcileResult,
  preflightPackReconcilePlans,
} from './apply-pack-reconcile';
import {
  dependencyRetainedAssetIds,
  expandPackLifecycleRequests,
  type ExpandedPackLifecycleRequest,
  type PackDefinitionResolver,
} from './pack-dependencies';
import {
  inventoryScopedPack,
  type ScopedPackInventory,
} from './pack-inventory';
import {
  planPackReconcile,
  resolveSharedOwnerRetentions,
  type PackReconcileAction,
  type PackReconcilePlan,
} from './pack-reconcile';
import {
  hasScopedPackOwnershipEvidence,
  writeScopedPackIntent,
  writeScopedPackLease,
} from './scoped-pack-intent';
import type { PackName } from './types';

export interface PackLifecycleRequest {
  pack: PackName;
  scope: ConcreteScope;
  scopeRoot: string;
  assetsRoot: string;
  action: PackReconcileAction;
}

export interface PackLifecycleResult {
  request: ExpandedPackLifecycleRequest;
  before: ScopedPackInventory;
  plan: PackReconcilePlan;
  apply: ApplyPackReconcileResult | null;
}

export interface PackLifecycleDependencies {
  inventory?: typeof inventoryScopedPack;
  plan?: typeof planPackReconcile;
  preflight?: typeof preflightPackReconcilePlans;
  apply?: typeof applyPackReconcilePlan;
  getDefinition?: PackDefinitionResolver;
  hasOwnershipEvidence?: typeof hasScopedPackOwnershipEvidence;
  applyDependencies?: Partial<ApplyPackReconcileDependencies>;
}

function lifecycleInventoryKey(request: ExpandedPackLifecycleRequest): string {
  return JSON.stringify({
    pack: request.pack,
    scope: request.scope,
    scopeRoot: request.scopeRoot,
    assetsRoot: request.assetsRoot,
  });
}

async function writeGenerated(
  scopeRoot: string,
  operation: Parameters<ApplyPackReconcileDependencies['writeGenerated']>[0],
): Promise<void> {
  await mkdir(dirname(operation.destination), { recursive: true });
  switch (operation.generation) {
    case 'projects-root-default':
      await writeFile(operation.destination, '.oat/projects/shared\n', 'utf8');
      return;
    case 'projects-config-default': {
      const config = await readOatConfig(scopeRoot);
      if (config.projects?.root?.trim()) return;
      await writeOatConfig(scopeRoot, {
        ...config,
        projects: { ...config.projects, root: '.oat/projects/shared' },
      });
      return;
    }
    case 'empty-file':
      await writeFile(operation.destination, '', 'utf8');
  }
}

export async function reconcilePackLifecycles(
  requests: readonly PackLifecycleRequest[],
  options: {
    dryRun?: boolean;
    dependencies?: PackLifecycleDependencies;
  } = {},
): Promise<PackLifecycleResult[]> {
  const dependencies = options.dependencies ?? {};
  const getDefinition = dependencies.getDefinition;
  const inventory = dependencies.inventory ?? inventoryScopedPack;
  const plan = dependencies.plan ?? planPackReconcile;
  const expanded = expandPackLifecycleRequests(requests, getDefinition);
  const projectedLeaseConsumers = new Map<string, PackName[]>();
  const planned: PackLifecycleResult[] = [];
  for (const request of expanded) {
    const key = lifecycleInventoryKey(request);
    const inventoried = await inventory(request);
    const projectedConsumers = projectedLeaseConsumers.get(key);
    const before = projectedConsumers
      ? {
          ...inventoried,
          intent: {
            ...inventoried.intent,
            requiredBy: projectedConsumers,
          },
        }
      : inventoried;
    const retainedAssets =
      request.action === 'remove'
        ? await resolveSharedOwnerRetentions({
            packs: [request.pack],
            scope: request.scope,
            scopeRoot: request.scopeRoot,
            hasOwnershipEvidence: async (pack, scope, scopeRoot) =>
              (
                dependencies.hasOwnershipEvidence ??
                hasScopedPackOwnershipEvidence
              )({
                pack,
                scope,
                scopeRoot,
              }),
          })
        : [];
    const retainedConsumers = before.intent.requiredBy.filter(
      (consumer) =>
        request.dependency?.lease !== 'release' ||
        consumer !== request.dependency.requiredBy,
    );
    const reconcilePlan = plan({
      ...request,
      inventory: before,
      retainedAssets,
      retainedDependencyAssetIds: dependencyRetainedAssetIds(
        request.pack,
        retainedConsumers,
        getDefinition,
      ),
    });
    planned.push({
      request,
      before,
      plan: reconcilePlan,
      apply: null,
    });
    if (request.dependency) {
      const nextConsumers = new Set(before.intent.requiredBy);
      if (request.dependency.lease === 'acquire') {
        nextConsumers.add(request.dependency.requiredBy);
      } else {
        nextConsumers.delete(request.dependency.requiredBy);
      }
      projectedLeaseConsumers.set(key, [...nextConsumers].sort());
    }
  }

  if (options.dryRun) return planned;

  await (dependencies.preflight ?? preflightPackReconcilePlans)(
    planned.map(({ request, plan: value }) => ({
      plan: value,
      scopeRoot: request.scopeRoot,
    })),
  );

  const results: PackLifecycleResult[] = [];
  for (const entry of planned) {
    const request = entry.request;
    const applied = await (dependencies.apply ?? applyPackReconcilePlan)(
      entry.plan,
      request.scopeRoot,
      {
        ...dependencies.applyDependencies,
        writeGenerated: async (operation) =>
          writeGenerated(request.scopeRoot, operation),
        writeIntent: async (operation) =>
          writeScopedPackIntent({
            pack: operation.pack,
            scope: operation.scope,
            scopeRoot: request.scopeRoot,
            enabled: operation.enabled,
          }),
        writeLease: async (operation) =>
          writeScopedPackLease({
            pack: operation.pack,
            scope: operation.scope,
            scopeRoot: request.scopeRoot,
            requiredBy: operation.requiredBy,
            enabled: operation.enabled,
          }),
        inventory: async () => inventory(request),
      },
    );
    results.push({ ...entry, apply: applied });
  }
  return results;
}

export async function reconcilePackLifecycle(
  request: PackLifecycleRequest,
  options: {
    dryRun?: boolean;
    dependencies?: PackLifecycleDependencies;
  } = {},
): Promise<PackLifecycleResult> {
  const results = await reconcilePackLifecycles([request], options);
  return (
    results.find(
      ({ request: candidate }) =>
        candidate.pack === request.pack &&
        candidate.scope === request.scope &&
        candidate.scopeRoot === request.scopeRoot &&
        candidate.action === request.action &&
        !candidate.dependency,
    ) ?? results[0]!
  );
}

export async function reconcilePackDependencyLifecycles(
  request: PackLifecycleRequest,
  options: {
    dryRun?: boolean;
    dependencies?: PackLifecycleDependencies;
  } = {},
): Promise<PackLifecycleResult[]> {
  const dependencyRequests = expandPackLifecycleRequests(
    [request],
    options.dependencies?.getDefinition,
  ).filter(({ dependency }) => dependency !== undefined);
  if (dependencyRequests.length === 0) return [];
  return reconcilePackLifecycles(dependencyRequests, options);
}
