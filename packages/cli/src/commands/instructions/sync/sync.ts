import { readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import {
  INSTRUCTION_SYNC_STRATEGIES,
  type InstructionSyncStrategy,
  type InstructionActionRecord,
  type InstructionEntry,
  type InstructionsSyncCommandDependencies,
} from '@commands/instructions/instructions.types';
import {
  buildInstructionsPayload,
  DEFAULT_INSTRUCTION_SYNC_STRATEGY,
  EXPECTED_CLAUDE_CONTENT,
  formatInstructionsReport,
  resolveInstructionSyncStrategy,
  scanInstructionFiles,
} from '@commands/instructions/instructions.utils';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command, Option } from 'commander';

interface PlanSyncActionsArgs {
  entries: InstructionEntry[];
  force: boolean;
  strategy: InstructionSyncStrategy;
}

function defaultDependencies(): InstructionsSyncCommandDependencies {
  return {
    buildCommandContext,
    readFile,
    removeFile: async (path: string) => {
      await rm(path, { force: true, recursive: true });
    },
    resolveProjectRoot,
    scanInstructionFiles,
    symlinkFile: async (target: string, path: string) => {
      await symlink(target, path, 'file');
    },
    writeFile,
  };
}

function getSyncReason(
  actionType: 'create' | 'update',
  strategy: InstructionSyncStrategy,
): string {
  const label =
    strategy === 'symlink'
      ? 'symlink'
      : strategy === 'copy'
        ? 'hard copy'
        : 'pointer file';
  return actionType === 'create'
    ? `missing CLAUDE.md ${label}`
    : `overwrite CLAUDE.md with canonical ${label}`;
}

function getSyncedDetail(strategy: InstructionSyncStrategy): string {
  switch (strategy) {
    case 'symlink':
      return 'symlink synced';
    case 'copy':
      return 'copy synced';
    default:
      return 'pointer synced';
  }
}

function planSyncActions({
  entries,
  force,
  strategy,
}: PlanSyncActionsArgs): InstructionActionRecord[] {
  const actions: InstructionActionRecord[] = [];

  for (const entry of entries) {
    if (entry.status === 'missing') {
      actions.push({
        type: 'create',
        target: entry.claudePath,
        reason: getSyncReason('create', strategy),
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
      reason: getSyncReason('update', strategy),
      result: 'planned',
    });
  }

  return actions;
}

async function applySyncActions(
  actions: InstructionActionRecord[],
  entries: InstructionEntry[],
  dependencies: InstructionsSyncCommandDependencies,
  strategy: InstructionSyncStrategy,
): Promise<InstructionActionRecord[]> {
  const appliedActions: InstructionActionRecord[] = [];
  const entriesByClaudePath = new Map(
    entries.map((entry) => [entry.claudePath, entry]),
  );

  for (const action of actions) {
    if (action.result !== 'planned') {
      appliedActions.push(action);
      continue;
    }

    const entry = entriesByClaudePath.get(action.target);
    if (!entry?.agentsPath) {
      throw new CliError(`Unable to resolve AGENTS.md for ${action.target}`, 2);
    }

    if (action.type === 'update') {
      await dependencies.removeFile(action.target);
    }

    if (strategy === 'symlink') {
      const symlinkTarget = relative(dirname(action.target), entry.agentsPath);
      await dependencies.symlinkFile(symlinkTarget, action.target);
    } else if (strategy === 'copy') {
      const agentsContent = await dependencies.readFile(
        entry.agentsPath,
        'utf8',
      );
      await dependencies.writeFile(action.target, agentsContent, 'utf8');
    } else {
      await dependencies.writeFile(
        action.target,
        EXPECTED_CLAUDE_CONTENT,
        'utf8',
      );
    }

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
  strategy: InstructionSyncStrategy,
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
        detail: getSyncedDetail(strategy),
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
    .addOption(
      new Option('--strategy <strategy>', 'Sync strategy')
        .choices([...INSTRUCTION_SYNC_STRATEGIES])
        .default(DEFAULT_INSTRUCTION_SYNC_STRATEGY),
    )
    .action(
      async (
        options: {
          dryRun?: boolean;
          force?: boolean;
          strategy?: InstructionSyncStrategy;
        },
        command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );

        try {
          const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
          const strategy = resolveInstructionSyncStrategy(options.strategy);
          const entries = await dependencies.scanInstructionFiles(repoRoot, {
            strategy,
          });
          const plannedActions = planSyncActions({
            entries,
            force: options.force ?? false,
            strategy,
          });

          const dryRun = options.dryRun ?? false;
          const actions = dryRun
            ? plannedActions
            : await applySyncActions(
                plannedActions,
                entries,
                dependencies,
                strategy,
              );

          const payload = buildInstructionsPayload({
            mode: dryRun ? 'dry-run' : 'apply',
            entries: dryRun
              ? entries
              : getPostSyncEntries(entries, actions, strategy),
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
              context.logger.success(
                '\nInstruction sync applied successfully.',
              );
            }
          }

          process.exitCode = hasSkippedActions(actions) ? 1 : 0;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = error instanceof CliError ? error.exitCode : 2;
        }
      },
    );
}
