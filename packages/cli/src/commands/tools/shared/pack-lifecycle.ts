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
  inventoryScopedPack,
  type ScopedPackInventory,
} from './pack-inventory';
import {
  planPackReconcile,
  type PackReconcileAction,
  type PackReconcilePlan,
} from './pack-reconcile';
import { writeScopedPackIntent } from './scoped-pack-intent';
import type { PackName } from './types';

export interface PackLifecycleRequest {
  pack: PackName;
  scope: ConcreteScope;
  scopeRoot: string;
  assetsRoot: string;
  action: PackReconcileAction;
}

export interface PackLifecycleResult {
  request: PackLifecycleRequest;
  before: ScopedPackInventory;
  plan: PackReconcilePlan;
  apply: ApplyPackReconcileResult | null;
}

export interface PackLifecycleDependencies {
  inventory?: typeof inventoryScopedPack;
  plan?: typeof planPackReconcile;
  preflight?: typeof preflightPackReconcilePlans;
  apply?: typeof applyPackReconcilePlan;
  applyDependencies?: Partial<ApplyPackReconcileDependencies>;
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
        projects: { root: '.oat/projects/shared' },
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
  const inventory = dependencies.inventory ?? inventoryScopedPack;
  const plan = dependencies.plan ?? planPackReconcile;
  const planned = await Promise.all(
    requests.map(async (request) => {
      const before = await inventory(request);
      return {
        request,
        before,
        plan: plan({ ...request, inventory: before }),
        apply: null,
      } satisfies PackLifecycleResult;
    }),
  );

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
  return (await reconcilePackLifecycles([request], options))[0]!;
}
