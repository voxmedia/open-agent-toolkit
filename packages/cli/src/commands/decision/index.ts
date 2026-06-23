import { resolve } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { initializeDecisionRecords } from './init';
import { createDecisionRecord } from './new';
import { regenerateDecisionIndex } from './regenerate-index';

interface InitOptions {
  decisionsRoot?: string;
}

interface RegenerateOptions {
  decisionsRoot?: string;
}

interface NewOptions {
  decisionsRoot?: string;
  status?: string;
  context?: string;
  createdAt?: string;
}

interface DecisionCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: typeof resolveProjectRoot;
  resolveAssetsRoot: typeof resolveAssetsRoot;
  initializeDecisionRecords: typeof initializeDecisionRecords;
  regenerateDecisionIndex: typeof regenerateDecisionIndex;
  createDecisionRecord: typeof createDecisionRecord;
}

const DEFAULT_DEPENDENCIES: DecisionCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveAssetsRoot,
  initializeDecisionRecords,
  regenerateDecisionIndex,
  createDecisionRecord,
};

async function resolveDecisionsRoot(
  context: CommandContext,
  projectRoot: string,
  configuredRoot?: string,
): Promise<string> {
  if (configuredRoot) {
    return resolve(context.cwd, configuredRoot);
  }

  return resolve(projectRoot, '.oat', 'repo', 'reference', 'decisions');
}

function reportError(context: CommandContext, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (context.json) {
    context.logger.json({ status: 'error', message });
  } else {
    context.logger.error(message);
  }
  process.exitCode = 1;
}

export function createDecisionCommand(
  overrides: Partial<DecisionCommandDependencies> = {},
): Command {
  const dependencies: DecisionCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const cmd = new Command('decision').description(
    'Manage file-backed decision records and indexes',
  );

  cmd
    .command('init')
    .description('Scaffold the canonical decision directory and index')
    .option(
      '--decisions-root <path>',
      'Decisions root directory (defaults to .oat/repo/reference/decisions)',
    )
    .action(async (options: InitOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
        const decisionsRoot = await resolveDecisionsRoot(
          context,
          projectRoot,
          options.decisionsRoot,
        );
        const result =
          await dependencies.initializeDecisionRecords(decisionsRoot);

        if (context.json) {
          context.logger.json({ status: 'ok', ...result });
        } else {
          context.logger.info(
            `Initialized decision scaffold at ${result.decisionsRoot}`,
          );
          if (result.created.length > 0) {
            context.logger.info(`Created: ${result.created.join(', ')}`);
          }
          if (result.skipped.length > 0) {
            context.logger.info(
              `Skipped existing: ${result.skipped.join(', ')}`,
            );
          }
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('regenerate')
    .description('Regenerate the managed decision index table')
    .option(
      '--decisions-root <path>',
      'Decisions root directory (defaults to .oat/repo/reference/decisions)',
    )
    .action(async (options: RegenerateOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
        const decisionsRoot = await resolveDecisionsRoot(
          context,
          projectRoot,
          options.decisionsRoot,
        );
        await dependencies.regenerateDecisionIndex(decisionsRoot);

        if (context.json) {
          context.logger.json({ status: 'ok', decisionsRoot });
        } else {
          context.logger.info(`Regenerated decision index at ${decisionsRoot}`);
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  cmd
    .command('new')
    .description('Create a new file-backed decision record')
    .argument('<title>', 'Decision title')
    .option(
      '--decisions-root <path>',
      'Decisions root directory (defaults to .oat/repo/reference/decisions)',
    )
    .option('--status <status>', 'Decision status', 'proposed')
    .option('--context <text>', 'Initial context body text')
    .option(
      '--created-at <timestamp>',
      'Creation timestamp seed for reproducible ID generation',
    )
    .action(async (title: string, options: NewOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
        const decisionsRoot = await resolveDecisionsRoot(
          context,
          projectRoot,
          options.decisionsRoot,
        );
        const assetsRoot = await dependencies.resolveAssetsRoot();
        const result = await dependencies.createDecisionRecord({
          decisionsRoot,
          assetsRoot,
          templatesRoot: resolve(projectRoot, '.oat', 'templates'),
          title,
          status: options.status,
          context: options.context,
          createdAt: options.createdAt,
        });

        if (context.json) {
          context.logger.json({ status: 'ok', ...result });
        } else {
          context.logger.info(`Created decision record ${result.id}`);
          context.logger.info(`Wrote ${result.filePath}`);
        }
        process.exitCode = 0;
      } catch (error) {
        reportError(context, error);
      }
    });

  return cmd;
}
