import type { CommandContext } from '@app/command-context';
import type { SyncOperationResult } from '@engine/engine.types';

import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncSummary,
} from './sync.types';
import {
  buildCollectionLifecycle,
  countPlannedOperations,
  formatCollectionLifecycle,
  toSyncOutputPlan,
} from './sync.utils';

function summarize(scopePlans: ScopeSyncPlan[]): SyncSummary {
  return {
    plannedOperations: countPlannedOperations(scopePlans),
    applied: 0,
    failed: 0,
    skipped: scopePlans.reduce((total, scopePlan) => {
      const extensionSkipped = scopePlan.materializationExtensions.reduce(
        (count, extension) =>
          count +
          extension.operations.filter(
            (operation) => operation.action === 'skip',
          ).length,
        0,
      );
      return (
        total +
        scopePlan.plan.entries.filter((entry) => entry.operation === 'skip')
          .length +
        (scopePlan.plan.collections ?? []).filter(
          ({ action }) => action === 'fallback-per-entry',
        ).length +
        extensionSkipped
      );
    }, 0),
  };
}

function buildOperationResults(
  scopePlans: readonly ScopeSyncPlan[],
): SyncOperationResult[] {
  return scopePlans.flatMap((scopePlan) =>
    [...scopePlan.plan.entries, ...scopePlan.plan.removals].map(
      (operation) => ({
        scope: scopePlan.scope,
        provider: operation.provider,
        contentKind: operation.canonical.type,
        asset: operation.canonical.name,
        action: operation.operation,
        status: operation.operation === 'skip' ? 'current' : 'planned',
      }),
    ),
  );
}

function formatMaterializationExtensions(scopePlan: ScopeSyncPlan): string {
  return scopePlan.materializationExtensions
    .map((extension) => {
      const lines = extension.operations.map((operation) => {
        const entry = operation.entryName ? ` (${operation.entryName})` : '';
        return `- ${operation.provider}:${operation.target}:${operation.action} ${operation.path}${entry} (${operation.reason})`;
      });
      return `${extension.provider} extension (dry-run)\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

function formatDryRunOutput(
  scopePlans: ScopeSyncPlan[],
  dependencies: SyncCommandDependencies,
): string {
  if (scopePlans.length === 0) {
    return dependencies.formatSyncPlan(
      {
        scope: 'project',
        entries: [],
        removals: [],
      },
      false,
    );
  }

  return scopePlans
    .map((scopePlan) => {
      const collectionOutput = formatCollectionLifecycle(
        buildCollectionLifecycle(scopePlan),
      );
      const syncOutput =
        collectionOutput &&
        scopePlan.plan.entries.length === 0 &&
        scopePlan.plan.removals.length === 0
          ? 'Per-entry sync plan\nNo per-entry operations.'
          : dependencies.formatSyncPlan(scopePlan.plan, false);
      const extensionOutput = formatMaterializationExtensions(scopePlan);
      return [
        `Scope: ${scopePlan.scope}\n${syncOutput}`,
        collectionOutput,
        extensionOutput,
      ]
        .filter(Boolean)
        .join('\n\n');
    })
    .join('\n\n');
}

export function runSyncDryRun(
  context: CommandContext,
  scopePlans: ScopeSyncPlan[],
  dependencies: SyncCommandDependencies,
): void {
  const summary = summarize(scopePlans);
  const providerMismatches = scopePlans
    .map((scopePlan) => scopePlan.providerMismatches)
    .filter((mismatch) => mismatch !== undefined);
  const versionSkew = scopePlans
    .map((scopePlan) => scopePlan.versionSkew)
    .filter((skew) => skew !== undefined);
  const materializationExtensions = scopePlans.flatMap(
    (scopePlan) => scopePlan.materializationExtensions,
  );
  const operationResults = buildOperationResults(scopePlans);
  const collectionOperations = scopePlans.flatMap((scopePlan) =>
    buildCollectionLifecycle(scopePlan),
  );
  const codexExtensions = materializationExtensions
    .filter((extension) => extension.provider === 'codex')
    .map((extension) => ({
      operations: extension.operations.map((operation) => ({
        action: operation.action,
        target: operation.target as 'role' | 'config',
        path: operation.path,
        reason: operation.reason,
        roleName: operation.entryName,
      })),
      managedRoles: extension.managedEntries,
      aggregateConfigHash: extension.aggregateHash,
    }));

  if (context.json) {
    context.logger.json({
      scope: context.scope,
      dryRun: true,
      plans: scopePlans.map(toSyncOutputPlan),
      collectionOperations,
      summary,
      providerMismatches,
      versionSkew,
      materializationExtensions,
      operationResults,
      codexExtensions,
    });
  } else {
    context.logger.info(formatDryRunOutput(scopePlans, dependencies));
    context.logger.warn('\nDry-run only: no filesystem changes were made.');
    if (summary.plannedOperations > 0) {
      context.logger.info('Run without --dry-run to apply changes.');
    } else {
      context.logger.info('No changes to apply.');
    }
  }

  process.exitCode = 0;
}
