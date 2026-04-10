import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveActiveProject,
  type ActiveProjectResolution,
} from '@config/oat-config';
import { resolveProjectRoot } from '@fs/paths';
import {
  getProjectState,
  type ProjectState,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

interface ProjectStatusDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  getProjectState: (projectPath: string) => Promise<ProjectState>;
}

const DEFAULT_DEPENDENCIES: ProjectStatusDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveActiveProject,
  getProjectState,
};

function formatProjectStatusLines(project: ProjectState): string[] {
  return [
    `Project: ${project.name}`,
    `Path: ${project.path}`,
    `Phase: ${project.phase} (${project.phaseStatus})`,
    `Progress: ${project.progress.completed}/${project.progress.total}`,
    `Current task: ${project.progress.currentTaskId ?? 'none'}`,
    `Recommendation: ${project.recommendation.skill}`,
    `Reason: ${project.recommendation.reason}`,
  ];
}

async function runProjectStatus(
  context: CommandContext,
  dependencies: ProjectStatusDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const activeProject = await dependencies.resolveActiveProject(repoRoot);

    if (activeProject.status === 'unset') {
      const message =
        'No active project set (.oat/config.local.json has no activeProject).';
      if (context.json) {
        context.logger.json({ status: 'unset', message });
      } else {
        context.logger.error(message);
      }
      process.exitCode = 1;
      return;
    }

    if (activeProject.status === 'missing' || !activeProject.path) {
      const message = activeProject.path
        ? `Active project path is missing or invalid: ${activeProject.path}`
        : 'Active project path is missing or invalid.';
      if (context.json) {
        context.logger.json({
          status: 'missing',
          projectName: activeProject.name,
          projectPath: activeProject.path,
          message,
        });
      } else {
        context.logger.error(message);
      }
      process.exitCode = 1;
      return;
    }

    const project = await dependencies.getProjectState(
      join(repoRoot, activeProject.path),
    );

    if (context.json) {
      context.logger.json({ status: 'ok', project });
    } else {
      for (const line of formatProjectStatusLines(project)) {
        context.logger.info(line);
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

export function createProjectStatusCommand(
  overrides: Partial<ProjectStatusDependencies> = {},
): Command {
  const dependencies: ProjectStatusDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('status')
    .description('Show the current OAT project state')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runProjectStatus(context, dependencies);
    });
}
