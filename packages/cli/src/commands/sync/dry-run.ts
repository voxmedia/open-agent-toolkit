import type { CommandContext } from '@app/command-context';
import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncSummary,
} from './sync.types';
import { countPlannedOperations } from './sync.utils';

function summarize(scopePlans: ScopeSyncPlan[]): SyncSummary {
  return {
    plannedOperations: countPlannedOperations(scopePlans),
    applied: 0,
    failed: 0,
    skipped: scopePlans.reduce((total, scopePlan) => {
      const codexSkipped =
        scopePlan.codexExtension?.operations.filter(
          (operation) => operation.action === 'skip',
        ).length ?? 0;
      return (
        total +
        scopePlan.plan.entries.filter((entry) => entry.operation === 'skip')
          .length +
        codexSkipped
      );
    }, 0),
  };
}

function formatCodexExtension(scopePlan: ScopeSyncPlan): string {
  const codexExtension = scopePlan.codexExtension;
  if (!codexExtension) {
    return '';
  }

  const lines = codexExtension.operations.map((operation) => {
    const role = operation.roleName ? ` (${operation.roleName})` : '';
    return `- codex:${operation.target}:${operation.action} ${operation.path}${role} (${operation.reason})`;
  });

  return `Codex extension (dry-run)\n${lines.join('\n')}`;
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
      const syncOutput = dependencies.formatSyncPlan(scopePlan.plan, false);
      const codexOutput = formatCodexExtension(scopePlan);
      return codexOutput
        ? `Scope: ${scopePlan.scope}\n${syncOutput}\n\n${codexOutput}`
        : `Scope: ${scopePlan.scope}\n${syncOutput}`;
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
  const codexExtensions = scopePlans
    .map((scopePlan) => scopePlan.codexExtension)
    .filter((extension) => extension !== undefined);

  if (context.json) {
    context.logger.json({
      scope: context.scope,
      dryRun: true,
      plans: scopePlans.map((scopePlan) => scopePlan.plan),
      summary,
      providerMismatches,
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
