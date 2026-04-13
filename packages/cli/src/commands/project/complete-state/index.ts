import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { renderCompletedProjectState } from './state-utils';

interface ProjectCompleteStateOptions {
  archived?: boolean;
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
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectCompleteStateDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  dirExists,
  fileExists,
  now: () => new Date(),
};

function resolveTargetProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  return isAbsolute(projectPath) ? projectPath : join(repoRoot, projectPath);
}

async function runProjectCompleteState(
  projectPath: string,
  options: ProjectCompleteStateOptions,
  context: CommandContext,
  dependencies: ProjectCompleteStateDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const targetProjectPath = resolveTargetProjectPath(repoRoot, projectPath);

    if (!(await dependencies.dirExists(targetProjectPath))) {
      throw new CliError(`Project not found: ${projectPath}`, 1);
    }

    const statePath = join(targetProjectPath, 'state.md');
    if (!(await dependencies.fileExists(statePath))) {
      throw new CliError(`Project state.md not found: ${statePath}`, 1);
    }

    const now = dependencies.now();
    const content = await dependencies.readFile(statePath, 'utf8');
    const updatedContent = renderCompletedProjectState(content, {
      archived: options.archived ?? false,
      nowUtc: now.toISOString(),
      today: now.toISOString().slice(0, 10),
    });
    await dependencies.writeFile(statePath, updatedContent, 'utf8');

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
