import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import {
  checkProjectCloseout,
  formatCloseoutRefusal,
} from '@commands/project/closeout-check/index';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveEffectiveConfig } from '@config/resolve';
import { CliError } from '@errors/cli-error';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { assertValidProjectStateFilesystemContent } from '@validation/project-state';
import { Command } from 'commander';

import { renderCompletedProjectState } from './state-utils';

interface ProjectCompleteStateOptions {
  archived?: boolean;
  autonomous?: boolean;
}

interface ProjectCompleteStateDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readFile: typeof defaultReadFile;
  writeFile: typeof defaultWriteFile;
  dirExists: typeof dirExists;
  fileExists: typeof fileExists;
  resolveEffectiveConfig: typeof resolveEffectiveConfig;
  /** Environment read for `OAT_AUTONOMOUS`; injectable for tests. */
  env: NodeJS.ProcessEnv;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectCompleteStateDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  dirExists,
  fileExists,
  resolveEffectiveConfig,
  env: process.env,
  now: () => new Date(),
};

async function runProjectCompleteState(
  projectPath: string,
  options: ProjectCompleteStateOptions,
  context: CommandContext,
  dependencies: ProjectCompleteStateDependencies,
): Promise<void> {
  try {
    // Refuse the same closeout invariant `oat project closeout-check` reports,
    // before any write: a configured, autonomous, or lite closeout cannot
    // reach terminal completion without its complete durable snapshot.
    const {
      targetProjectPath,
      statePath,
      stateContent: content,
      result,
    } = await checkProjectCloseout(
      projectPath,
      { autonomous: options.autonomous ?? false },
      context,
      dependencies,
    );
    if (result.status === 'incomplete') {
      throw new CliError(formatCloseoutRefusal(projectPath, result), 1);
    }

    const now = dependencies.now();
    const updatedContent = renderCompletedProjectState(content, {
      archived: options.archived ?? false,
      nowUtc: now.toISOString(),
      today: now.toISOString().slice(0, 10),
    });
    await assertValidProjectStateFilesystemContent(updatedContent, {
      filePath: statePath,
      projectPath: targetProjectPath,
    });
    if (updatedContent !== content) {
      await dependencies.writeFile(statePath, updatedContent, 'utf8');
    }

    if (context.json) {
      context.logger.json({
        status: 'ok',
        projectPath,
        statePath,
        archived: options.archived ?? false,
      });
    } else {
      context.logger.info(`Updated completed project state: ${projectPath}`);
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}

export function createProjectCompleteStateCommand(
  overrides: Partial<ProjectCompleteStateDependencies> = {},
): Command {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('complete-state')
    .description('Update a project state.md to the completed lifecycle shape')
    .argument('<project-path>', 'Project path to update')
    .option('--archived', 'Mark the completed project as archived locally')
    .option(
      '--autonomous',
      'Treat the closeout as autonomous (also implied by OAT_AUTONOMOUS=1)',
    )
    .action(
      async (
        projectPath: string,
        options: ProjectCompleteStateOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runProjectCompleteState(
          projectPath,
          options,
          context,
          dependencies,
        );
      },
    );
}
