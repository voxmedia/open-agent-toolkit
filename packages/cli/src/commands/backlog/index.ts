import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { archiveBacklogItem, BacklogArchiveError } from './archive';
import { initializeBacklog } from './init';
import { regenerateBacklogIndex } from './regenerate-index';
import { generateBacklogId } from './shared/generate-id';

interface InitOptions {
  backlogRoot?: string;
}

interface RegenerateIndexOptions {
  backlogRoot?: string;
}

interface ArchiveOptions {
  backlogRoot?: string;
  wontDo?: boolean;
  summary?: string;
}

interface GenerateIdOptions {
  createdAt?: string;
}

interface BacklogCommandDependencies {
  buildCommandContext: typeof buildCommandContext;
  resolveProjectRoot: typeof resolveProjectRoot;
  initializeBacklog: typeof initializeBacklog;
  regenerateBacklogIndex: typeof regenerateBacklogIndex;
  archiveBacklogItem: typeof archiveBacklogItem;
  pathExists: (path: string) => Promise<boolean>;
}

async function pathExistsDefault(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return false;
  }
}

const DEFAULT_DEPENDENCIES: BacklogCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  initializeBacklog,
  regenerateBacklogIndex,
  archiveBacklogItem,
  pathExists: pathExistsDefault,
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
  return resolve(projectRoot, '.oat', 'repo', 'pjm', 'backlog');
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
    .command('init')
    .description(
      'Scaffold the canonical backlog directory structure and starter files',
    )
    .option(
      '--backlog-root <path>',
      'Backlog root directory (defaults to .oat/repo/pjm/backlog)',
    )
    .action(async (options: InitOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const backlogRoot = await resolveBacklogRoot(
        context,
        options.backlogRoot,
        dependencies,
      );
      await dependencies.initializeBacklog(backlogRoot);

      if (context.json) {
        context.logger.json({ status: 'ok', backlogRoot });
      } else {
        context.logger.info(`Initialized backlog scaffold at ${backlogRoot}`);
      }
      process.exitCode = 0;
    });

  cmd
    .command('regenerate-index')
    .description('Regenerate the managed backlog index table')
    .option(
      '--backlog-root <path>',
      'Backlog root directory (defaults to .oat/repo/pjm/backlog)',
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
      const { itemCount, warnings } =
        await dependencies.regenerateBacklogIndex(backlogRoot);

      if (context.json) {
        context.logger.json({ status: 'ok', backlogRoot, itemCount, warnings });
      } else {
        for (const warning of warnings) {
          context.logger.warn(warning);
        }
        context.logger.info(`Regenerated backlog index at ${backlogRoot}`);
      }
      process.exitCode = 0;
    });

  cmd
    .command('archive')
    .description(
      'Close out a backlog item: set a terminal status, record it in completed.md, move it to archived/, and regenerate the index',
    )
    .argument('<id>', 'Backlog item id (`BL-YYMMDD-slug`)')
    .option('--wont-do', 'Close the item as `wont_do` instead of `closed`')
    .option('--summary <text>', 'One-line outcome summary for completed.md')
    .option(
      '--backlog-root <path>',
      'Backlog root directory (defaults to .oat/repo/pjm/backlog)',
    )
    .action(async (id: string, options: ArchiveOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const backlogRoot = await resolveBacklogRoot(
        context,
        options.backlogRoot,
        dependencies,
      );

      try {
        const result = await dependencies.archiveBacklogItem(backlogRoot, id, {
          wontDo: options.wontDo,
          summary: options.summary,
        });

        if (context.json) {
          context.logger.json(result);
        } else {
          for (const warning of result.warnings) {
            context.logger.warn(warning);
          }
          if (result.result === 'noop') {
            context.logger.info(`Backlog item ${id} is already archived.`);
          } else {
            context.logger.success(
              `Archived ${id} as ${result.status} (moved to ${result.movedTo}).`,
            );
          }
        }
        process.exitCode = 0;
      } catch (error) {
        if (error instanceof BacklogArchiveError) {
          if (context.json) {
            context.logger.json({
              result: 'error',
              id,
              message: error.message,
            });
          } else {
            context.logger.error(error.message);
          }
          process.exitCode = error.exitCode;
          return;
        }
        throw error;
      }
    });

  cmd
    .command('generate-id')
    .description(
      'Generate a backlog item identifier (`BL-YYMMDD-slug`) from a title or slug',
    )
    .argument('<title-or-slug>', 'Title or slug seed for the backlog item')
    .option(
      '--created-at <timestamp>',
      'Creation timestamp seed for reproducible ID generation',
    )
    .action(
      async (
        titleOrSlug: string,
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
        const id = generateBacklogId(titleOrSlug, createdAt);
        const candidatePaths = [
          join(backlogRoot, 'items', `${id}.md`),
          join(backlogRoot, 'archived', `${id}.md`),
        ];
        const collides = (
          await Promise.all(
            candidatePaths.map((candidatePath) =>
              dependencies.pathExists(candidatePath),
            ),
          )
        ).some(Boolean);

        if (collides) {
          const message = `Backlog item ${id} already exists. Use a more specific title or slug to disambiguate.`;
          if (context.json) {
            context.logger.json({ status: 'error', id, message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = 1;
          return;
        }

        if (context.json) {
          context.logger.json({
            status: 'ok',
            id,
            titleOrSlug,
            createdAt,
          });
        } else {
          context.logger.info(id);
        }
        process.exitCode = 0;
      },
    );

  return cmd;
}
