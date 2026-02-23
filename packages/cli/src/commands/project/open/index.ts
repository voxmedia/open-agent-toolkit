import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { basename, join } from 'node:path';
import { buildCommandContext, type CommandContext } from '@app/command-context';
import {
  getFrontmatterBlock,
  getFrontmatterField,
} from '@commands/shared/frontmatter';
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
  type OatLocalConfig,
  readOatLocalConfig,
  setActiveProject,
  writeOatLocalConfig,
} from '@config/oat-config';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

interface ProjectOpenOptions {
  reason?: string;
}

interface ProjectOpenDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  writeOatLocalConfig: (
    repoRoot: string,
    config: OatLocalConfig,
  ) => Promise<void>;
  setActiveProject: (repoRoot: string, path: string) => Promise<void>;
  generateStateDashboard: (options: {
    repoRoot: string;
  }) => Promise<GenerateStateResult>;
  readFile: typeof defaultReadFile;
  writeFile: typeof defaultWriteFile;
  dirExists: typeof dirExists;
  fileExists: typeof fileExists;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: ProjectOpenDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  readOatLocalConfig,
  writeOatLocalConfig,
  setActiveProject,
  generateStateDashboard: defaultGenerateStateDashboard,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  dirExists,
  fileExists,
  processEnv: process.env,
};

async function maybeResumePausedProject(
  statePath: string,
  dependencies: ProjectOpenDependencies,
): Promise<boolean> {
  const stateContent = await dependencies.readFile(statePath, 'utf8');
  const frontmatter = getFrontmatterBlock(stateContent);
  if (!frontmatter) {
    throw new Error(`state.md is missing frontmatter: ${statePath}`);
  }

  if (getFrontmatterField(frontmatter, 'oat_lifecycle') !== 'paused') {
    return false;
  }

  let nextBlock = upsertFrontmatterField(
    frontmatter,
    'oat_lifecycle',
    'active',
    true,
  ).nextBlock;
  nextBlock = removeFrontmatterField(nextBlock, 'oat_pause_timestamp');
  nextBlock = removeFrontmatterField(nextBlock, 'oat_pause_reason');

  if (nextBlock !== frontmatter) {
    await dependencies.writeFile(
      statePath,
      replaceFrontmatter(stateContent, nextBlock),
      'utf8',
    );
  }

  return true;
}

async function runProjectOpen(
  projectName: string,
  options: ProjectOpenOptions,
  context: CommandContext,
  dependencies: ProjectOpenDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    const projectPath = join(projectsRoot, projectName);
    const fullProjectPath = join(repoRoot, projectPath);

    if (!(await dependencies.dirExists(fullProjectPath))) {
      throw new Error(`Project not found: ${projectName}`);
    }

    const statePath = join(fullProjectPath, 'state.md');
    if (!(await dependencies.fileExists(statePath))) {
      throw new Error(`Project state.md not found: ${statePath}`);
    }

    const localConfig = await dependencies.readOatLocalConfig(repoRoot);
    const previousActiveProject = localConfig.activeProject ?? null;

    if (previousActiveProject === projectPath) {
      if (context.json) {
        context.logger.json({
          status: 'ok',
          projectName,
          projectPath,
          previousActiveProject,
          resumedFromPaused: false,
          reason: options.reason ?? null,
          message: 'already active',
        });
      } else {
        context.logger.info(`Project ${projectName} is already active.`);
      }
      process.exitCode = 0;
      return;
    }

    const resumedFromPaused = await maybeResumePausedProject(
      statePath,
      dependencies,
    );

    await dependencies.setActiveProject(repoRoot, projectPath);

    if (localConfig.lastPausedProject === projectPath) {
      const updatedConfig = await dependencies.readOatLocalConfig(repoRoot);
      await dependencies.writeOatLocalConfig(repoRoot, {
        ...updatedConfig,
        lastPausedProject: null,
      });
    }

    await dependencies.generateStateDashboard({ repoRoot });

    if (context.json) {
      context.logger.json({
        status: 'ok',
        projectName,
        projectPath,
        previousActiveProject,
        resumedFromPaused,
        reason: options.reason ?? null,
      });
    } else {
      if (previousActiveProject) {
        context.logger.info(
          `Switching from ${basename(previousActiveProject)} to ${projectName}.`,
        );
      } else {
        context.logger.info(`Opened project: ${projectName}`);
      }
      if (resumedFromPaused) {
        context.logger.info(
          'Resumed paused project and cleared pause metadata.',
        );
      }
      if (options.reason) {
        context.logger.info(`Reason: ${options.reason}`);
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

export function createProjectOpenCommand(
  overrides: Partial<ProjectOpenDependencies> = {},
): Command {
  const dependencies: ProjectOpenDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('open')
    .description('Open or switch to an OAT project')
    .argument('<name>', 'Project name')
    .option('--reason <string>', 'Optional reason for opening or switching')
    .action(
      async (name: string, options: ProjectOpenOptions, command: Command) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runProjectOpen(name, options, context, dependencies);
      },
    );
}
