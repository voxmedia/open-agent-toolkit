import type { CommandContext } from '@app/command-context';
import type {
  ScopeSyncPlan,
  SyncCommandDependencies,
  SyncSummary,
} from './sync.types';
import { countPlannedOperations } from './sync.utils';

function countSkippedEntries(scopePlans: ScopeSyncPlan[]): number {
  return scopePlans.reduce((total, scopePlan) => {
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
      const codexExtension = scopePlan.codexExtension;
      if (!codexExtension) {
        return `Scope: ${scopePlan.scope}\n${syncOutput}`;
      }

      const codexLines = codexExtension.operations.map((operation) => {
        const role = operation.roleName ? ` (${operation.roleName})` : '';
        return `- codex:${operation.target}:${operation.action} ${operation.path}${role} (${operation.reason})`;
      });

      return `Scope: ${scopePlan.scope}\n${syncOutput}\n\nCodex extension (applied)\n${codexLines.join('\n')}`;
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
    const hasSyncPlannedOperations = [
      ...scopePlan.plan.entries,
      ...scopePlan.plan.removals,
    ].some((entry) => entry.operation !== 'skip');
    const hasCodexPlannedOperations =
      scopePlan.codexExtensionPlan?.operations.some(
        (operation) => operation.action !== 'skip',
      ) ?? false;

    if (!hasSyncPlannedOperations && !hasCodexPlannedOperations) {
      continue;
    }

    if (hasSyncPlannedOperations) {
      const result = await dependencies.executeSyncPlan(
        scopePlan.plan,
        scopePlan.manifest,
        scopePlan.manifestPath,
      );
      applied += result.applied;
      failed += result.failed;
    }

    if (scopePlan.codexExtensionPlan && hasCodexPlannedOperations) {
      const codexResult = await dependencies.applyCodexProjectExtensionPlan(
        scopePlan.scopeRoot,
        scopePlan.codexExtensionPlan,
      );
      applied += codexResult.applied;
      failed += codexResult.failed;
      if (scopePlan.codexExtension) {
        scopePlan.codexExtension = {
          ...scopePlan.codexExtension,
          applied: codexResult.applied,
          failed: codexResult.failed,
          skipped: codexResult.skipped,
        };
      }
    }
  }

  const summary = buildSummary(scopePlans, applied, failed);
  const providerMismatches = scopePlans
    .map((scopePlan) => scopePlan.providerMismatches)
    .filter((mismatch) => mismatch !== undefined);
  const codexExtensions = scopePlans
    .map((scopePlan) => scopePlan.codexExtension)
    .filter((extension) => extension !== undefined);
  if (context.json) {
    context.logger.json({
      scope: context.scope,
      apply: true,
      plans: scopePlans.map((scopePlan) => scopePlan.plan),
      summary,
      providerMismatches,
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
