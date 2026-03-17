import { resolve } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { regenerateBacklogIndex } from './regenerate-index';
import {
  generateUniqueBacklogId,
  readExistingBacklogIds,
} from './shared/generate-id';

interface RegenerateIndexOptions {
  backlogRoot?: string;
}

interface GenerateIdOptions {
  createdAt?: string;
}

interface BacklogCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: typeof resolveProjectRoot;
  regenerateBacklogIndex: typeof regenerateBacklogIndex;
}

const DEFAULT_DEPENDENCIES: BacklogCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  regenerateBacklogIndex,
};

async function resolveBacklogRoot(
  context: CommandContext,
  configuredRoot?: string,
  dependencies: BacklogCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<string> {
  if (configuredRoot) {
    return resolve(context.cwd, configuredRoot);
  }

  const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
  return resolve(projectRoot, '.oat', 'repo', 'reference', 'backlog');
}

export function createBacklogCommand(
  overrides: Partial<BacklogCommandDependencies> = {},
): Command {
  const dependencies: BacklogCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const cmd = new Command('backlog').description(
    'Manage file-backed backlog items and indexes',
  );

  cmd
    .command('regenerate-index')
    .description('Regenerate the managed backlog index table')
    .option(
      '--backlog-root <path>',
      'Backlog root directory (defaults to .oat/repo/reference/backlog)',
    )
    .action(async (options: RegenerateIndexOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const backlogRoot = await resolveBacklogRoot(
        context,
        options.backlogRoot,
        dependencies,
      );
      await dependencies.regenerateBacklogIndex(backlogRoot);

      if (context.json) {
        context.logger.json({ status: 'ok', backlogRoot });
      } else {
        context.logger.info(`Regenerated backlog index at ${backlogRoot}`);
      }
      process.exitCode = 0;
    });

  cmd
    .command('generate-id')
    .description('Generate a backlog item identifier from a filename seed')
    .argument('<filename>', 'Filename or slug seed for the backlog item')
    .option(
      '--created-at <timestamp>',
      'Creation timestamp seed for reproducible ID generation',
    )
    .action(
      async (
        filename: string,
        options: GenerateIdOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        const backlogRoot = await resolveBacklogRoot(
          context,
          undefined,
          dependencies,
        );
        const createdAt = options.createdAt ?? new Date().toISOString();
        const existingIds = await readExistingBacklogIds(backlogRoot);
        const id = generateUniqueBacklogId(filename, createdAt, existingIds);

        if (context.json) {
          context.logger.json({ status: 'ok', id, filename, createdAt });
        } else {
          context.logger.info(id);
        }
        process.exitCode = 0;
      },
    );

  return cmd;
}
