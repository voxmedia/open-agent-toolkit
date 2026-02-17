import type { CommandContext } from '@app/command-context';
import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncSummary,
} from './sync.types';

function countPlannedOperations(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    return (
      total +
      [...scopePlan.plan.entries, ...scopePlan.plan.removals].filter(
        (entry) => entry.operation !== 'skip',
      ).length
    );
  }, 0);
}

function countSkippedEntries(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
    return (
      total +
      scopePlan.plan.entries.filter((entry) => entry.operation === 'skip')
        .length
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
      return `Scope: ${scopePlan.scope}\n${dependencies.formatSyncPlan(scopePlan.plan, true)}`;
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
    const hasPlannedOperations = [
      ...scopePlan.plan.entries,
      ...scopePlan.plan.removals,
    ].some((entry) => entry.operation !== 'skip');

    if (!hasPlannedOperations) {
      continue;
    }

    const result = await dependencies.executeSyncPlan(
      scopePlan.plan,
      scopePlan.manifest,
      scopePlan.manifestPath,
    );
    applied += result.applied;
    failed += result.failed;
  }

  const summary = buildSummary(scopePlans, applied, failed);
  const providerMismatches = scopePlans
    .map((scopePlan) => scopePlan.providerMismatches)
    .filter((mismatch) => mismatch !== undefined);
  if (context.json) {
    context.logger.json({
      scope: context.scope,
      apply: true,
      plans: scopePlans.map((scopePlan) => scopePlan.plan),
      summary,
      providerMismatches,
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
