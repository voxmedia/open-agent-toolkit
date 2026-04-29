import { isAbsolute, join } from 'node:path';

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

interface ProjectStatusOptions {
  field?: string;
  projectPath?: string;
  shell?: string[];
}

const DEFAULT_DEPENDENCIES: ProjectStatusDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveActiveProject,
  getProjectState,
};

function resolveTargetProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  return isAbsolute(projectPath) ? projectPath : join(repoRoot, projectPath);
}

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

function readDotPath(payload: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cursor: unknown = payload;

  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object') {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(cursor, part)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }

  return cursor;
}

function formatRawValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function shellQuote(value: string): string {
  return `'${value.split("'").join("'\\''")}'`;
}

const SHELL_ASSIGNMENT_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/;

function formatShellAssignment(
  assignment: string,
  payload: unknown,
): string | null {
  const match = SHELL_ASSIGNMENT_RE.exec(assignment);
  if (!match) {
    return null;
  }

  const name = match[1];
  const path = match[2];
  if (!name || !path) {
    return null;
  }
  const value = formatRawValue(readDotPath(payload, path));
  return `${name}=${shellQuote(value)}`;
}

async function runProjectStatus(
  context: CommandContext,
  dependencies: ProjectStatusDependencies,
  options: ProjectStatusOptions,
): Promise<void> {
  try {
    if (options.projectPath && isAbsolute(options.projectPath)) {
      const project = await dependencies.getProjectState(options.projectPath);
      writeProjectStatusOutput(context, options, { status: 'ok', project });
      return;
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);

    if (options.projectPath) {
      const project = await dependencies.getProjectState(
        resolveTargetProjectPath(repoRoot, options.projectPath),
      );
      writeProjectStatusOutput(context, options, { status: 'ok', project });
      return;
    }

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
    writeProjectStatusOutput(context, options, { status: 'ok', project });
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

function writeProjectStatusOutput(
  context: CommandContext,
  options: ProjectStatusOptions,
  payload: { status: 'ok'; project: ProjectState },
): void {
  if (options.field && options.shell?.length) {
    context.logger.error(
      '`--field` and `--shell` are mutually exclusive; pass only one.',
    );
    process.exitCode = 1;
    return;
  }

  if (options.field) {
    context.logger.info(formatRawValue(readDotPath(payload, options.field)));
    process.exitCode = 0;
    return;
  }

  if (options.shell?.length) {
    const lines: string[] = [];
    for (const assignment of options.shell) {
      const line = formatShellAssignment(assignment, payload);
      if (!line) {
        context.logger.error(
          `Invalid shell assignment "${assignment}". Expected NAME=path with a shell-safe variable name.`,
        );
        process.exitCode = 1;
        return;
      }
      lines.push(line);
    }
    for (const line of lines) {
      context.logger.info(line);
    }
    process.exitCode = 0;
    return;
  }

  if (context.json) {
    context.logger.json(payload);
  } else {
    for (const line of formatProjectStatusLines(payload.project)) {
      context.logger.info(line);
    }
  }

  process.exitCode = 0;
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
    .option(
      '--field <path>',
      'Print a single field from the project status payload by dot path',
    )
    .option(
      '--project-path <path>',
      'Read status from an explicit project path instead of the active project',
    )
    .option(
      '--shell <assignment...>',
      'Print shell-safe NAME=value assignments for one or more NAME=path pairs',
    )
    .action(async (options: ProjectStatusOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runProjectStatus(context, dependencies, options);
    });
}
