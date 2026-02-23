import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { buildCommandContext, type CommandContext } from '@app/command-context';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import {
  removeFrontmatterField,
  replaceFrontmatter,
  upsertFrontmatterField,
} from '@commands/shared/frontmatter-write';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  generateStateDashboard as defaultGenerateStateDashboard,
  type GenerateStateResult,
} from '@commands/state/generate';
import {
  clearActiveProject,
  type OatLocalConfig,
  readOatLocalConfig,
} from '@config/oat-config';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ProjectPauseOptions {
  reason?: string;
}

interface ProjectPauseDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  clearActiveProject: (
    repoRoot: string,
    options?: { lastPaused?: string },
  ) => Promise<void>;
  generateStateDashboard: (options: {
    repoRoot: string;
  }) => Promise<GenerateStateResult>;
  readFile: typeof defaultReadFile;
  writeFile: typeof defaultWriteFile;
  dirExists: typeof dirExists;
  fileExists: typeof fileExists;
  processEnv: NodeJS.ProcessEnv;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectPauseDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  readOatLocalConfig,
  clearActiveProject,
  generateStateDashboard: defaultGenerateStateDashboard,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  dirExists,
  fileExists,
  processEnv: process.env,
  now: () => new Date(),
};

async function runProjectPause(
  projectName: string | undefined,
  options: ProjectPauseOptions,
  context: CommandContext,
  dependencies: ProjectPauseDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    const localConfig = await dependencies.readOatLocalConfig(repoRoot);
    const activeProject = localConfig.activeProject ?? null;

    let projectPath: string;
    let resolvedProjectName: string;

    if (projectName) {
      projectPath = join(projectsRoot, projectName);
      resolvedProjectName = projectName;
    } else {
      if (!activeProject) {
        throw new Error('No project specified and no active project');
      }
      projectPath = activeProject;
      resolvedProjectName = projectPath.split('/').at(-1) ?? projectPath;
    }

    const fullProjectPath = join(repoRoot, projectPath);
    if (!(await dependencies.dirExists(fullProjectPath))) {
      throw new Error(`Project not found: ${resolvedProjectName}`);
    }

    const statePath = join(fullProjectPath, 'state.md');
    if (!(await dependencies.fileExists(statePath))) {
      throw new Error(`Project state.md not found: ${statePath}`);
    }

    const content = await dependencies.readFile(statePath, 'utf8');
    const frontmatter = getFrontmatterBlock(content);
    if (!frontmatter) {
      throw new Error(`state.md is missing frontmatter: ${statePath}`);
    }

    let nextBlock = upsertFrontmatterField(
      frontmatter,
      'oat_lifecycle',
      'paused',
      true,
    ).nextBlock;
    nextBlock = upsertFrontmatterField(
      nextBlock,
      'oat_pause_timestamp',
      dependencies.now().toISOString(),
      true,
    ).nextBlock;

    if (options.reason) {
      nextBlock = upsertFrontmatterField(
        nextBlock,
        'oat_pause_reason',
        options.reason,
        true,
      ).nextBlock;
    } else {
      nextBlock = removeFrontmatterField(nextBlock, 'oat_pause_reason');
    }

    if (nextBlock !== frontmatter) {
      await dependencies.writeFile(
        statePath,
        replaceFrontmatter(content, nextBlock),
        'utf8',
      );
    }

    const pointerCleared = activeProject === projectPath;
    if (pointerCleared) {
      await dependencies.clearActiveProject(repoRoot, {
        lastPaused: projectPath,
      });
    }

    await dependencies.generateStateDashboard({ repoRoot });

    if (context.json) {
      context.logger.json({
        status: 'ok',
        projectName: resolvedProjectName,
        projectPath,
        pointerCleared,
        reason: options.reason ?? null,
      });
    } else {
      context.logger.info(`Paused project: ${resolvedProjectName}`);
      if (pointerCleared) {
        context.logger.info('Cleared active project pointer.');
      }
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProjectPauseCommand(
  overrides: Partial<ProjectPauseDependencies> = {},
): Command {
  const dependencies: ProjectPauseDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('pause')
    .description('Pause an OAT project')
    .argument('[name]', 'Project name (defaults to active project)')
    .option('--reason <string>', 'Optional reason to persist in project state')
    .action(
      async (
        name: string | undefined,
        options: ProjectPauseOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runProjectPause(name, options, context, dependencies);
      },
    );
}
