import type { CommandContext } from '@app/command-context';
import type { SyncOperationResult } from '@engine/engine.types';
import type { SyncPlan, SyncResult } from '@engine/index';

import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncSummary,
} from './sync.types';
import { countPlannedOperations } from './sync.utils';

function countSkippedExtensionEntries(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    const extensionSkipped = scopePlan.materializationExtensions.reduce(
      (count, extension) =>
        count +
        extension.operations.filter((operation) => operation.action === 'skip')
          .length,
      0,
    );
    return total + extensionSkipped;
  }, 0);
}

function buildSummary(
  scopePlans: ScopeSyncPlan[],
  operationResults: readonly SyncOperationResult[],
  extensionApplied: number,
  extensionFailed: number,
): SyncSummary {
  return {
    plannedOperations: countPlannedOperations(scopePlans),
    applied:
      operationResults.filter(({ status }) => status === 'changed').length +
      extensionApplied,
    failed:
      operationResults.filter(
        ({ status }) => status === 'failed' || status === 'missing',
      ).length + extensionFailed,
    skipped:
      operationResults.filter(({ status }) => status === 'current').length +
      countSkippedExtensionEntries(scopePlans),
  };
}

function normalizeOperationResults(
  plan: SyncPlan,
  result: SyncResult,
): SyncOperationResult[] {
  if (result.operations) {
    return result.operations;
  }

  let appliedRemaining = result.applied;
  let failedRemaining = result.failed;
  const plannedOperations = [...plan.entries, ...plan.removals];
  const normalized = plannedOperations.map((operation) => {
    let status: SyncOperationResult['status'];
    let failure: string | undefined;
    if (operation.operation === 'skip') {
      status = 'current';
    } else if (appliedRemaining > 0) {
      appliedRemaining -= 1;
      status = 'changed';
    } else if (failedRemaining > 0) {
      failedRemaining -= 1;
      status = 'failed';
      failure =
        'Operation failed; inspect local verbose diagnostics and retry sync.';
    } else {
      status = 'unknown';
    }
    return {
      scope: plan.scope,
      provider: operation.provider,
      contentKind: operation.canonical.type,
      asset: operation.canonical.name,
      action: operation.operation,
      status,
      ...(failure ? { failure } : {}),
    };
  });
  const fallbackOperation = plannedOperations[0];
  if (!fallbackOperation) {
    return normalized;
  }
  while (appliedRemaining > 0) {
    appliedRemaining -= 1;
    normalized.push({
      scope: plan.scope,
      provider: fallbackOperation.provider,
      contentKind: fallbackOperation.canonical.type,
      asset: fallbackOperation.canonical.name,
      action: fallbackOperation.operation,
      status: 'changed',
    });
  }
  while (failedRemaining > 0) {
    failedRemaining -= 1;
    normalized.push({
      scope: plan.scope,
      provider: fallbackOperation.provider,
      contentKind: fallbackOperation.canonical.type,
      asset: fallbackOperation.canonical.name,
      action: fallbackOperation.operation,
      status: 'failed',
      failure:
        'Operation failed; inspect local verbose diagnostics and retry sync.',
    });
  }
  return normalized;
}

function formatAppliedOutput(
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
      true,
    );
  }

  return scopePlans
    .map((scopePlan) => {
      const syncOutput = dependencies.formatSyncPlan(scopePlan.plan, true);
      if (scopePlan.materializationExtensions.length === 0) {
        return `Scope: ${scopePlan.scope}\n${syncOutput}`;
      }

      const extensionSections = scopePlan.materializationExtensions.map(
        (extension) => {
          const lines = extension.operations.map((operation) => {
            const entry = operation.entryName
              ? ` (${operation.entryName})`
              : '';
            return `- ${operation.provider}:${operation.target}:${operation.action} ${operation.path}${entry} (${operation.reason})`;
          });
          return `${extension.provider} extension (applied)\n${lines.join('\n')}`;
        },
      );

      return `Scope: ${scopePlan.scope}\n${syncOutput}\n\n${extensionSections.join('\n\n')}`;
    })
    .join('\n\n');
}

export async function runSyncApply(
  context: CommandContext,
  scopePlans: ScopeSyncPlan[],
  dependencies: SyncCommandDependencies,
): Promise<void> {
  let extensionApplied = 0;
  let extensionFailed = 0;
  const operationResults: SyncOperationResult[] = [];

  for (const scopePlan of scopePlans) {
    const hasSyncEntries =
      scopePlan.plan.entries.length > 0 || scopePlan.plan.removals.length > 0;
    const hasExtensionPlannedOperations =
      scopePlan.materializationExtensionPlans.some((plan) =>
        plan.operations.some((operation) => operation.action !== 'skip'),
      );
    // Derived from the same diagnostic that produced the pre-mutation advisory
    // (`detectVersionSkew` in ./index), so the restamp and the warning cannot
    // drift apart: this manifest is only ever restamped when sync has already
    // reported the provenance the restamp is about to overwrite.
    const shouldRefreshManifestVersion = scopePlan.versionSkew !== undefined;

    if (
      !hasSyncEntries &&
      !hasExtensionPlannedOperations &&
      !shouldRefreshManifestVersion
    ) {
      continue;
    }

    if (hasSyncEntries || shouldRefreshManifestVersion) {
      const result = await dependencies.executeSyncPlan(
        scopePlan.plan,
        scopePlan.manifest,
        scopePlan.manifestPath,
      );
      operationResults.push(
        ...normalizeOperationResults(scopePlan.plan, result),
      );
    }

    for (const plan of scopePlan.materializationExtensionPlans) {
      if (!plan.operations.some((operation) => operation.action !== 'skip')) {
        continue;
      }
      const extension = dependencies
        .getMaterializationExtensions()
        .find((candidate) => candidate.provider === plan.provider);
      if (!extension) {
        throw new Error(
          `Materialization extension ${plan.provider} disappeared before apply.`,
        );
      }
      const result = await dependencies.applyMaterializationExtensionPlan(
        extension,
        scopePlan.scopeRoot,
        plan,
      );
      extensionApplied += result.applied;
      extensionFailed += result.failed;
      const summary = scopePlan.materializationExtensions.find(
        (candidate) => candidate.provider === plan.provider,
      );
      if (summary) {
        Object.assign(summary, result);
      }
    }
  }

  const summary = buildSummary(
    scopePlans,
    operationResults,
    extensionApplied,
    extensionFailed,
  );
  const providerMismatches = scopePlans
    .map((scopePlan) => scopePlan.providerMismatches)
    .filter((mismatch) => mismatch !== undefined);
  const versionSkew = scopePlans
    .map((scopePlan) => scopePlan.versionSkew)
    .filter((skew) => skew !== undefined);
  const materializationExtensions = scopePlans.flatMap(
    (scopePlan) => scopePlan.materializationExtensions,
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
      applied: extension.applied,
      failed: extension.failed,
      skipped: extension.skipped,
    }));
  if (context.json) {
    context.logger.json({
      scope: context.scope,
      dryRun: false,
      plans: scopePlans.map((scopePlan) => scopePlan.plan),
      summary,
      providerMismatches,
      versionSkew,
      materializationExtensions,
      operationResults,
      codexExtensions,
    });
  } else {
    context.logger.info(formatAppliedOutput(scopePlans, dependencies));
    if (summary.plannedOperations === 0) {
      context.logger.info('\nNo changes required.');
    } else if (summary.failed > 0) {
      context.logger.warn('\nSync completed with partial failures.');
    } else {
      context.logger.success('\nSync applied successfully.');
    }
  }

  process.exitCode = summary.failed > 0 ? 1 : 0;
}
