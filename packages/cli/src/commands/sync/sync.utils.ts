import { isAbsolute, relative, resolve, sep } from 'node:path';

import type { CollectionOperationResult } from '@engine/execute-plan';

import type {
  CollectionLifecycleOutput,
  CollectionOutputPlan,
  ScopeSyncPlan,
  SyncOutputPlan,
} from './sync.types';

const MUTATING_COLLECTION_ACTIONS = new Set([
  'create-collection-link',
  'adopt-collection-link',
  'inherit-collection',
  'detach-collection',
]);

function scopeRelativePath(scopeRoot: string, path: string): string {
  const relativePath = relative(resolve(scopeRoot), resolve(path));
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    return '<outside-scope>';
  }
  return relativePath.replaceAll('\\', '/') || '.';
}

function proofSummary(
  proof: NonNullable<ScopeSyncPlan['plan']['collections']>[number]['proof'],
): CollectionOutputPlan['proof'] {
  return proof.status === 'ineligible'
    ? { status: proof.status, reason: proof.reason }
    : { status: proof.status };
}

export function toSyncOutputPlan(scopePlan: ScopeSyncPlan): SyncOutputPlan {
  return {
    ...scopePlan.plan,
    collections: scopePlan.plan.collections?.map((collection) => ({
      ...collection,
      canonicalDir: scopeRelativePath(
        scopePlan.scopeRoot,
        collection.canonicalDir,
      ),
      providerDir: scopeRelativePath(
        scopePlan.scopeRoot,
        collection.providerDir,
      ),
      proof: proofSummary(collection.proof),
    })),
  };
}

function resultKey(
  result: Pick<
    CollectionOperationResult,
    'provider' | 'contentType' | 'action' | 'ownership'
  >,
): string {
  return JSON.stringify([
    result.provider,
    result.contentType,
    result.action,
    result.ownership,
  ]);
}

export function buildCollectionLifecycle(
  scopePlan: ScopeSyncPlan,
  results: readonly CollectionOperationResult[] = [],
): CollectionLifecycleOutput[] {
  const resultsByKey = new Map<string, CollectionOperationResult[]>();
  for (const result of results) {
    const key = resultKey(result);
    resultsByKey.set(key, [...(resultsByKey.get(key) ?? []), result]);
  }

  return (scopePlan.plan.collections ?? []).map((collection) => {
    const matching = resultsByKey.get(resultKey(collection))?.shift();
    return {
      scope: scopePlan.scope,
      provider: collection.provider,
      contentType: collection.contentType,
      action: collection.action,
      ownership: collection.ownership,
      canonicalDir: scopeRelativePath(
        scopePlan.scopeRoot,
        collection.canonicalDir,
      ),
      providerDir: scopeRelativePath(
        scopePlan.scopeRoot,
        collection.providerDir,
      ),
      reason: collection.reason,
      result: {
        status: matching?.status ?? 'planned',
        reason: matching?.reason ?? collection.reason,
      },
    };
  });
}

export function formatCollectionLifecycle(
  lifecycle: readonly CollectionLifecycleOutput[],
): string {
  if (lifecycle.length === 0) {
    return '';
  }
  return `Collection aliases\n${lifecycle
    .map(
      (entry) =>
        `- [${entry.scope}] ${entry.provider}/${entry.contentType}:${entry.action} ownership=${entry.ownership} ${entry.canonicalDir} -> ${entry.providerDir}\n  reason: ${entry.reason}\n  result: ${entry.result.status} — ${entry.result.reason}`,
    )
    .join('\n')}`;
}

export function countPlannedOperations(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    const extensionOperations = scopePlan.materializationExtensions.reduce(
      (count, extension) =>
        count +
        extension.operations.filter((entry) => entry.action !== 'skip').length,
      0,
    );
    return (
      total +
      [...scopePlan.plan.entries, ...scopePlan.plan.removals].filter(
        (entry) => entry.operation !== 'skip',
      ).length +
      (scopePlan.plan.collections ?? []).filter((collection) =>
        MUTATING_COLLECTION_ACTIONS.has(collection.action),
      ).length +
      extensionOperations
    );
  }, 0);
}
