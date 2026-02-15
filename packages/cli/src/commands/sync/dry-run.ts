import type { CommandContext } from '../../app/command-context';
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

function summarize(scopePlans: ScopeSyncPlan[]): SyncSummary {
  return {
    plannedOperations: countPlannedOperations(scopePlans),
    applied: 0,
    failed: 0,
    skipped: scopePlans.reduce((total, scopePlan) => {
      return (
        total +
        scopePlan.plan.entries.filter((entry) => entry.operation === 'skip')
          .length
      );
    }, 0),
  };
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
      return `Scope: ${scopePlan.scope}\n${dependencies.formatSyncPlan(scopePlan.plan, false)}`;
    })
    .join('\n\n');
}

export function runSyncDryRun(
  context: CommandContext,
  scopePlans: ScopeSyncPlan[],
  dependencies: SyncCommandDependencies,
): void {
  const summary = summarize(scopePlans);
  if (context.json) {
    context.logger.json({
      scope: context.scope,
      apply: false,
      plans: scopePlans.map((scopePlan) => scopePlan.plan),
      summary,
    });
  } else {
    context.logger.info(formatDryRunOutput(scopePlans, dependencies));
    context.logger.warn('\nDry-run only: no filesystem changes were made.');
    if (summary.plannedOperations > 0) {
      context.logger.info(
        `Apply changes with: oat sync --scope ${context.scope} --apply`,
      );
    } else {
      context.logger.info('No changes to apply.');
    }
  }

  process.exitCode = 0;
}
