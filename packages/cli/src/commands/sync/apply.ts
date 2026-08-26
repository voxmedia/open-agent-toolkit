import type { CommandContext } from '@app/command-context';
import { OAT_VERSION } from '@shared/oat-version';

import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncSummary,
} from './sync.types';
import { countPlannedOperations } from './sync.utils';

function countSkippedEntries(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    const extensionSkipped = scopePlan.materializationExtensions.reduce(
      (count, extension) =>
        count +
        extension.operations.filter((operation) => operation.action === 'skip')
          .length,
      0,
    );
    return (
      total +
      scopePlan.plan.entries.filter((entry) => entry.operation === 'skip')
        .length +
      extensionSkipped
    );
  }, 0);
}

function buildSummary(
  scopePlans: ScopeSyncPlan[],
  applied: number,
  failed: number,
): SyncSummary {
  return {
    plannedOperations: countPlannedOperations(scopePlans),
    applied,
    failed,
    skipped: countSkippedEntries(scopePlans),
  };
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
  let applied = 0;
  let failed = 0;

  for (const scopePlan of scopePlans) {
    const hasSyncEntries =
      scopePlan.plan.entries.length > 0 || scopePlan.plan.removals.length > 0;
    const hasExtensionPlannedOperations =
      scopePlan.materializationExtensionPlans.some((plan) =>
        plan.operations.some((operation) => operation.action !== 'skip'),
      );
    const shouldRefreshManifestVersion =
      scopePlan.manifest.oatVersion !== OAT_VERSION;

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
      applied += result.applied;
      failed += result.failed;
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
      applied += result.applied;
      failed += result.failed;
      const summary = scopePlan.materializationExtensions.find(
        (candidate) => candidate.provider === plan.provider,
      );
      if (summary) {
        Object.assign(summary, result);
      }
    }
  }

  const summary = buildSummary(scopePlans, applied, failed);
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
      codexExtensions,
    });
  } else {
    context.logger.info(formatAppliedOutput(scopePlans, dependencies));
    if (summary.plannedOperations === 0) {
      context.logger.info('\nNo changes required.');
    } else if (failed > 0) {
      context.logger.warn('\nSync completed with partial failures.');
    } else {
      context.logger.success('\nSync applied successfully.');
    }
  }

  process.exitCode = failed > 0 ? 1 : 0;
}
