import { writeFile } from 'node:fs/promises';
import { buildCommandContext } from '@app/command-context';
import type {
  InstructionActionRecord,
  InstructionEntry,
  InstructionsSyncCommandDependencies,
} from '@commands/instructions/instructions.types';
import {
  buildInstructionsPayload,
  EXPECTED_CLAUDE_CONTENT,
  formatInstructionsReport,
  scanInstructionFiles,
} from '@commands/instructions/instructions.utils';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface PlanSyncActionsArgs {
  entries: InstructionEntry[];
  force: boolean;
}

function defaultDependencies(): InstructionsSyncCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    scanInstructionFiles,
    writeFile,
  };
}

function planSyncActions({
  entries,
  force,
}: PlanSyncActionsArgs): InstructionActionRecord[] {
  const actions: InstructionActionRecord[] = [];

  for (const entry of entries) {
    if (entry.status === 'missing') {
      actions.push({
        type: 'create',
        target: entry.claudePath,
        reason: 'missing CLAUDE.md pointer file',
        result: 'planned',
      });
      continue;
    }

    if (entry.status !== 'content_mismatch') {
      continue;
    }

    if (!force) {
      actions.push({
        type: 'skip',
        target: entry.claudePath,
        reason: 'content mismatch requires --force',
        result: 'skipped',
      });
      continue;
    }

    actions.push({
      type: 'update',
      target: entry.claudePath,
      reason: 'overwrite CLAUDE.md with canonical pointer',
      result: 'planned',
    });
  }

  return actions;
}

async function applySyncActions(
  actions: InstructionActionRecord[],
  dependencies: InstructionsSyncCommandDependencies,
): Promise<InstructionActionRecord[]> {
  const appliedActions: InstructionActionRecord[] = [];

  for (const action of actions) {
    if (action.result !== 'planned') {
      appliedActions.push(action);
      continue;
    }

    await dependencies.writeFile(
      action.target,
      EXPECTED_CLAUDE_CONTENT,
      'utf8',
    );
    appliedActions.push({
      ...action,
      result: 'applied',
    });
  }

  return appliedActions;
}

function getPostSyncEntries(
  entries: InstructionEntry[],
  actions: InstructionActionRecord[],
): InstructionEntry[] {
  const actionByTarget = new Map(
    actions.map((action) => [action.target, action]),
  );

  return entries.map((entry) => {
    const action = actionByTarget.get(entry.claudePath);

    if (!action) {
      return entry;
    }

    if (action.result === 'applied' && action.type !== 'skip') {
      return {
        ...entry,
        status: 'ok',
        detail: 'pointer synced',
      };
    }

    return entry;
  });
}

function hasSkippedActions(actions: InstructionActionRecord[]): boolean {
  return actions.some((action) => action.result === 'skipped');
}

export function createInstructionsSyncCommand(
  overrides: Partial<InstructionsSyncCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultDependencies(),
    ...overrides,
  };

  return new Command('sync')
    .description('Repair AGENTS.md to CLAUDE.md pointer drift')
    .option('--dry-run', 'Preview sync changes without applying')
    .option('--force', 'Overwrite mismatched CLAUDE.md files')
    .action(async (options: { dryRun?: boolean; force?: boolean }, command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );

      try {
        const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
        const entries = await dependencies.scanInstructionFiles(repoRoot);
        const plannedActions = planSyncActions({
          entries,
          force: options.force ?? false,
        });

        const dryRun = options.dryRun ?? false;
        const actions = dryRun
          ? plannedActions
          : await applySyncActions(plannedActions, dependencies);

        const payload = buildInstructionsPayload({
          mode: dryRun ? 'dry-run' : 'apply',
          entries: dryRun ? entries : getPostSyncEntries(entries, actions),
          actions,
        });

        if (context.json) {
          context.logger.json(payload);
        } else {
          context.logger.info(formatInstructionsReport(payload, repoRoot));
          if (dryRun) {
            context.logger.warn(
              '\nDry-run only: no filesystem changes were made.',
            );
            if (plannedActions.length > 0) {
              context.logger.info('Run without --dry-run to apply changes.');
            } else {
              context.logger.info('No changes to apply.');
            }
          } else if (payload.status === 'ok') {
            context.logger.success('\nInstruction sync applied successfully.');
          }
        }

        process.exitCode = hasSkippedActions(actions) ? 1 : 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({ status: 'error', message });
        } else {
          context.logger.error(message);
        }
        process.exitCode = error instanceof CliError ? error.exitCode : 2;
      }
    });
}
