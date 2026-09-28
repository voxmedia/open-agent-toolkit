import {
  lstat,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

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
  EXPECTED_CLAUDE_CONTENT,
  formatInstructionsReport,
  readConfiguredInstructionSyncStrategy,
  resolveInstructionPointerExcludes,
  resolveInstructionSyncStrategy,
  scanInstructionFiles,
  verifyManagedShimUnchanged,
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

export async function removeInstructionFile(
  path: string,
  remove: typeof rm = rm,
): Promise<void> {
  await remove(path, { force: true });
}

function defaultDependencies(): InstructionsSyncCommandDependencies {
  return {
    buildCommandContext,
    lstat,
    readConfiguredInstructionSyncStrategy,
    readFile,
    readFileBytes: (path: string) => readFile(path),
    readlink,
    removeFile: removeInstructionFile,
    resolveInstructionPointerExcludes,
    resolveProjectRoot,
    scanInstructionFiles,
    symlinkFile: async (target: string, path: string) => {
      await symlink(target, path, 'file');
    },
    writeFile,
  };
}

function getShimLabel(strategy: InstructionSyncStrategy): string {
  switch (strategy) {
    case 'symlink':
      return 'symlink';
    case 'copy':
      return 'hard copy';
    case 'none':
      return 'removal';
    default:
      return 'pointer file';
  }
}

function getSyncReason(
  actionType: 'create' | 'update',
  strategy: InstructionSyncStrategy,
): string {
  const label = getShimLabel(strategy);
  return actionType === 'create'
    ? `missing CLAUDE.md ${label}`
    : `overwrite CLAUDE.md with canonical ${label}`;
}

function getSyncedDetail(strategy: InstructionSyncStrategy): string {
  switch (strategy) {
    case 'none':
      return 'no CLAUDE.md';
    case 'symlink':
      return 'symlink synced';
    case 'copy':
      return 'copy synced';
    default:
      return 'pointer synced';
  }
}

function getAgentsPath(entry: InstructionEntry): string {
  return entry.agentsPath ?? join(dirname(entry.claudePath), 'AGENTS.md');
}

function getErrorCode(error: unknown): string | null {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : null;
}

function hasUnreadableCanonicalAgents(entry: InstructionEntry): boolean {
  return (
    entry.agentsPath !== null &&
    (entry.detail === 'broken AGENTS.md symlink' ||
      entry.detail.startsWith('unreadable AGENTS.md symlink target') ||
      entry.detail.startsWith('unable to read AGENTS.md'))
  );
}

function hasUnreadableClaudeSource(entry: InstructionEntry): boolean {
  return (
    entry.agentsPath === null &&
    (entry.detail === 'broken CLAUDE.md symlink' ||
      entry.detail.startsWith('unreadable CLAUDE.md symlink target') ||
      entry.detail.startsWith('unable to read CLAUDE.md'))
  );
}

function wrapStrayResyncError(
  error: unknown,
  agentsPath: string,
  claudePath: string,
): CliError {
  const message = error instanceof Error ? error.message : String(error);
  return new CliError(
    `Adopted stray instructions into ${agentsPath}, but failed to regenerate ${claudePath}: ${message}`,
    error instanceof CliError ? error.exitCode : 2,
  );
}

/**
 * Plan strategy `none`: remove exact managed shims, adopt strays into
 * AGENTS.md without writing a shim back, and never write or overwrite a
 * CLAUDE.md. `--force` has no effect here: nothing that is not an exact
 * managed shape is ever deleted.
 */
function planNoShimActions(
  entries: InstructionEntry[],
): InstructionActionRecord[] {
  const actions: InstructionActionRecord[] = [];

  for (const entry of entries) {
    if (entry.status === 'managed_shim' && entry.managedShim) {
      actions.push({
        type: 'remove',
        target: entry.claudePath,
        reason: `remove OAT-managed CLAUDE.md ${getShimLabel(entry.managedShim.shape)} (strategy none)`,
        result: 'planned',
      });
      continue;
    }

    if (entry.status === 'stray') {
      actions.push({
        type: 'create',
        target: getAgentsPath(entry),
        reason: 'adopt stray CLAUDE.md into canonical AGENTS.md',
        result: 'planned',
      });
      continue;
    }

    if (entry.status !== 'content_mismatch') {
      continue;
    }

    if (hasUnreadableCanonicalAgents(entry) && entry.agentsPath) {
      actions.push({
        type: 'skip',
        target: entry.agentsPath,
        reason: 'canonical AGENTS.md unreadable; repair manually',
        result: 'skipped',
      });
      continue;
    }

    actions.push({
      type: 'skip',
      target: entry.claudePath,
      reason: 'CLAUDE.md unreadable; repair manually',
      result: 'skipped',
    });
  }

  return actions;
}

function planSyncActions({
  entries,
  force,
  strategy,
}: PlanSyncActionsArgs): InstructionActionRecord[] {
  if (strategy === 'none') {
    return planNoShimActions(entries);
  }

  const actions: InstructionActionRecord[] = [];

  for (const entry of entries) {
    if (entry.status === 'stray') {
      actions.push({
        type: 'create',
        target: getAgentsPath(entry),
        reason: 'adopt stray CLAUDE.md into canonical AGENTS.md',
        result: 'planned',
      });
      actions.push({
        type: 'update',
        target: entry.claudePath,
        reason: getSyncReason('update', strategy),
        result: 'planned',
      });
      continue;
    }

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

    if (hasUnreadableClaudeSource(entry)) {
      actions.push({
        type: 'skip',
        target: entry.claudePath,
        reason: 'CLAUDE.md unreadable; repair manually',
        result: 'skipped',
      });
      continue;
    }

    if (hasUnreadableCanonicalAgents(entry)) {
      const unreadableAgentsPath = entry.agentsPath;
      if (!unreadableAgentsPath) {
        throw new CliError(
          `Unable to resolve unreadable AGENTS.md path for ${entry.claudePath}`,
          2,
        );
      }
      actions.push({
        type: 'skip',
        target: unreadableAgentsPath,
        reason: 'canonical AGENTS.md unreadable; repair manually',
        result: 'skipped',
      });
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
  const entriesByTarget = new Map<string, InstructionEntry>();

  for (const entry of entries) {
    entriesByTarget.set(entry.claudePath, entry);
    entriesByTarget.set(getAgentsPath(entry), entry);
  }

  for (const action of actions) {
    if (action.result !== 'planned') {
      appliedActions.push(action);
      continue;
    }

    const entry = entriesByTarget.get(action.target);
    if (!entry) {
      throw new CliError(
        `Unable to resolve instruction entry for ${action.target}`,
        2,
      );
    }

    const agentsPath = getAgentsPath(entry);
    const isAgentsAction = action.target === agentsPath;

    if (action.type === 'remove') {
      if (!entry.managedShim || !entry.agentsPath) {
        throw new CliError(
          `No planning record for CLAUDE.md removal at ${action.target}`,
          2,
        );
      }
      // Fail closed at the last moment: the file may have been edited or
      // replaced since the scan classified it. Anything but the exact shim
      // the scan recorded is kept and reported, never deleted.
      const changed = await verifyManagedShimUnchanged(
        action.target,
        entry.agentsPath,
        entry.managedShim,
        dependencies,
      );
      if (changed !== null) {
        appliedActions.push({
          type: 'skip',
          target: action.target,
          reason: `CLAUDE.md changed since planning (${changed}); kept`,
          result: 'skipped',
        });
        continue;
      }
      await dependencies.removeFile(action.target);
      appliedActions.push({
        ...action,
        result: 'applied',
      });
      continue;
    }

    if (isAgentsAction) {
      try {
        await dependencies.lstat(agentsPath);
        throw new CliError(
          `Canonical AGENTS.md appeared during sync at ${agentsPath}; re-run to reclassify before adopting stray CLAUDE.md`,
          2,
        );
      } catch (error) {
        if (error instanceof CliError) {
          throw error;
        }
        if (getErrorCode(error) !== 'ENOENT') {
          throw error;
        }
      }

      const adoptedContent = await dependencies.readFile(
        entry.claudePath,
        'utf8',
      );
      await dependencies.writeFile(agentsPath, adoptedContent, 'utf8');
      appliedActions.push({
        ...action,
        result: 'applied',
      });
      continue;
    }

    if (!entry.agentsPath && action.type !== 'update') {
      throw new CliError(`Unable to resolve AGENTS.md for ${action.target}`, 2);
    }

    if (strategy === 'none') {
      throw new CliError(
        `Refusing to write ${action.target}: strategy none keeps no CLAUDE.md`,
        2,
      );
    }

    try {
      if (action.type === 'update') {
        await dependencies.removeFile(action.target);
      }

      if (strategy === 'symlink') {
        const symlinkTarget = relative(dirname(action.target), agentsPath);
        await dependencies.symlinkFile(symlinkTarget, action.target);
      } else if (strategy === 'copy') {
        const agentsContent = await dependencies.readFile(agentsPath, 'utf8');
        await dependencies.writeFile(action.target, agentsContent, 'utf8');
      } else {
        await dependencies.writeFile(
          action.target,
          EXPECTED_CLAUDE_CONTENT,
          'utf8',
        );
      }
    } catch (error) {
      if (entry.status === 'stray') {
        throw wrapStrayResyncError(error, agentsPath, action.target);
      }
      throw error;
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
    const adoptedAction = actionByTarget.get(getAgentsPath(entry));

    if (!action && !adoptedAction) {
      return entry;
    }

    if (action?.type === 'remove' && action.result === 'applied') {
      return {
        ...entry,
        status: 'ok',
        detail: 'OAT-managed CLAUDE.md removed',
      };
    }

    if (
      strategy === 'none' &&
      entry.status === 'stray' &&
      adoptedAction?.result === 'applied'
    ) {
      return {
        ...entry,
        agentsPath: getAgentsPath(entry),
        status: 'unmanaged',
        detail: 'adopted into AGENTS.md; CLAUDE.md kept',
      };
    }

    if (
      action?.result === 'applied' &&
      (entry.status !== 'stray' || adoptedAction?.result === 'applied')
    ) {
      return {
        ...entry,
        agentsPath: getAgentsPath(entry),
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

  // `--strategy` has no Commander default: a filled-in default is
  // indistinguishable from an explicit flag and would always hide
  // `documentation.instructionSyncStrategy`.
  return new Command('sync')
    .description(
      'Repair AGENTS.md/CLAUDE.md sync drift using the selected strategy',
    )
    .option('--dry-run', 'Preview sync changes without applying')
    .option('--force', 'Overwrite mismatched CLAUDE.md files')
    .addOption(
      new Option(
        '--strategy <strategy>',
        'Sync strategy for this run (overrides documentation.instructionSyncStrategy)',
      ).choices([...INSTRUCTION_SYNC_STRATEGIES]),
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
          const strategy = resolveInstructionSyncStrategy(
            options.strategy,
            await dependencies.readConfiguredInstructionSyncStrategy(repoRoot),
          );
          const exclusions =
            await dependencies.resolveInstructionPointerExcludes(repoRoot);
          // Warned before any work: an operator whose opt-out silently matches
          // nothing must hear about it even when the sync then succeeds.
          for (const warning of exclusions.warnings) {
            context.logger.warn(warning);
          }
          const entries = await dependencies.scanInstructionFiles(repoRoot, {
            excludedPaths: exclusions.configured,
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
            strategy,
            entries: dryRun
              ? entries
              : getPostSyncEntries(entries, actions, strategy),
            actions,
            excludedPaths: exclusions.configured,
            effectiveExcludedPaths: exclusions.effective,
            exclusionWarnings: exclusions.warnings,
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
