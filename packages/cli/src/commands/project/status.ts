import { basename, dirname, isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  classifyUnmaterializedSyncedRecord,
  directoryExists,
  probeAuthoritativeCompletedRef,
  projectListHint,
} from '@commands/project/list';
import { defaultGitRunner } from '@commands/project/sync/git';
import { readSyncedRecord } from '@commands/project/sync/record';
import { probeSyncedTerminalRefs } from '@commands/project/sync/resolve-target';
import { getProjectStateWithReviewAncestry } from '@commands/review/head-ancestry';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  canonicalizePath,
  resolveScopeRoot,
  syncedRecordPath,
} from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveActiveProject,
  type ActiveProjectResolution,
} from '@config/oat-config';
import { resolveProjectRoot } from '@fs/paths';
import { type ProjectState } from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

interface ProjectStatusDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  getProjectState: (projectPath: string) => Promise<ProjectState>;
  resolveUnpulledSyncedProject: (
    projectDir: string,
    repoRoot?: string,
  ) => Promise<UnpulledSyncedProject | null>;
}

/** A synced project recorded on this branch whose checkout is not here. */
type UnpulledSyncedProject = Awaited<
  ReturnType<typeof classifyUnmaterializedSyncedRecord>
>;

interface ProjectStatusOptions {
  field?: string;
  projectPath?: string;
  shell?: string[];
}

const DEFAULT_DEPENDENCIES: ProjectStatusDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveActiveProject,
  getProjectState: getProjectStateWithReviewAncestry,
  resolveUnpulledSyncedProject,
};

/**
 * A synced project that has a record on this branch but no checkout in this
 * worktree has no readable state, so no mode is known: status reports the
 * storage instruction `list` gives for it (`oat project pull`), never a
 * lifecycle recommendation. Returns null for every other path, including any
 * project folder that exists. Without a repository root (an absolute
 * `--project-path`), the root is the repository holding the path, never the
 * working directory's.
 */
async function resolveUnpulledSyncedProject(
  projectDir: string,
  knownRepoRoot?: string,
): Promise<UnpulledSyncedProject | null> {
  if (await directoryExists(projectDir)) {
    return null;
  }
  const repoRoot = knownRepoRoot ?? (await repositoryHolding(projectDir));
  if (!repoRoot) {
    return null;
  }
  const projectsRoot = await resolveProjectsRoot(repoRoot, process.env);
  const scopeRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
  if (canonicalizePath(dirname(projectDir)) !== canonicalizePath(scopeRoot)) {
    return null;
  }
  let recordPath: string;
  try {
    recordPath = syncedRecordPath(scopeRoot, basename(projectDir));
  } catch {
    return null;
  }
  const record = await readSyncedRecord(recordPath);
  if (!record) {
    return null;
  }
  return classifyUnmaterializedSyncedRecord(repoRoot, projectsRoot, record, {
    probeAuthoritativeCompletedRef,
    probeSyncedTerminalRefs,
    gitRunner: defaultGitRunner,
  });
}

async function repositoryHolding(path: string): Promise<string | null> {
  let current = dirname(path);
  while (!(await directoryExists(current))) {
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  try {
    return await resolveProjectRoot(current);
  } catch {
    return null;
  }
}

function formatUnpulledStatusLines(project: UnpulledSyncedProject): string[] {
  return [
    `Project: ${project.name}`,
    `Path: ${project.path}`,
    `Scope: synced (checkout ${project.checkout})`,
    `Recommendation: ${project.recommendation.skill}`,
    `Reason: ${project.recommendation.reason}`,
    `Hint: ${projectListHint(project)}`,
  ];
}

function resolveTargetProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  return isAbsolute(projectPath) ? projectPath : join(repoRoot, projectPath);
}

interface FreestyleProjectFiles {
  agents: string;
  shape: string;
}

/**
 * Freestyle's project `AGENTS.md` and `shape.md` sit in the project folder,
 * where instruction sync never reaches, so status names both paths. They are
 * joined to the project directory status read, as the caller named it, rather
 * than to `project.path`, which is empty for a synced project read from its
 * nested worktree.
 */
function freestyleProjectFiles(
  project: ProjectState,
  projectDir: string,
): FreestyleProjectFiles | null {
  if (project.workflowMode !== 'freestyle') {
    return null;
  }
  return {
    agents: join(projectDir, 'AGENTS.md'),
    shape: join(projectDir, 'shape.md'),
  };
}

function formatProjectStatusLines(
  project: ProjectState,
  files: FreestyleProjectFiles | null,
): string[] {
  // Freestyle has no lifecycle phase, progress or current task to report.
  const position = files
    ? [
        'Mode: freestyle (no lifecycle workflow)',
        `Rules: ${files.agents}`,
        `Shape: ${files.shape}`,
      ]
    : [
        `Phase: ${project.phase} (${project.phaseStatus})`,
        `Progress: ${project.progress.completed}/${project.progress.total}`,
        `Current task: ${project.progress.currentTaskId ?? 'none'}`,
      ];
  return [
    `Project: ${project.name}`,
    `Path: ${project.path}`,
    ...position,
    ...project.blockers.map((blocker) =>
      typeof blocker === 'string'
        ? `Blocker: ${blocker}`
        : `Blocker: ${blocker.task_id}: ${blocker.reason} (since ${blocker.since})`,
    ),
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
      const unpulled = await dependencies.resolveUnpulledSyncedProject(
        options.projectPath,
      );
      if (unpulled) {
        writeUnpulledStatusOutput(context, options, unpulled);
        return;
      }
      const project = await dependencies.getProjectState(options.projectPath);
      writeProjectStatusOutput(
        context,
        options,
        { status: 'ok', project },
        options.projectPath,
      );
      return;
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);

    if (options.projectPath) {
      const targetPath = resolveTargetProjectPath(
        repoRoot,
        options.projectPath,
      );
      const unpulled = await dependencies.resolveUnpulledSyncedProject(
        targetPath,
        repoRoot,
      );
      if (unpulled) {
        writeUnpulledStatusOutput(context, options, unpulled);
        return;
      }
      const project = await dependencies.getProjectState(targetPath);
      writeProjectStatusOutput(
        context,
        options,
        { status: 'ok', project },
        options.projectPath,
      );
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
      // An active synced project recorded on this branch but not pulled here
      // gets the same pull instruction as an explicit --project-path.
      if (activeProject.path) {
        const unpulled = await dependencies.resolveUnpulledSyncedProject(
          resolveTargetProjectPath(repoRoot, activeProject.path),
          repoRoot,
        );
        if (unpulled) {
          writeUnpulledStatusOutput(context, options, unpulled);
          return;
        }
      }
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
    writeProjectStatusOutput(
      context,
      options,
      { status: 'ok', project },
      activeProject.path,
    );
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

function writeUnpulledStatusOutput(
  context: CommandContext,
  options: ProjectStatusOptions,
  project: UnpulledSyncedProject,
): void {
  writeStatusPayload(context, options, { status: 'ok', project }, () =>
    formatUnpulledStatusLines(project),
  );
}

function writeProjectStatusOutput(
  context: CommandContext,
  options: ProjectStatusOptions,
  status: { status: 'ok'; project: ProjectState },
  projectDir: string,
): void {
  const files = freestyleProjectFiles(status.project, projectDir);
  const payload = files ? { ...status, projectFiles: files } : status;
  writeStatusPayload(context, options, payload, () =>
    formatProjectStatusLines(payload.project, files),
  );
}

function writeStatusPayload(
  context: CommandContext,
  options: ProjectStatusOptions,
  payload: unknown,
  textLines: () => string[],
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
    for (const line of textLines()) {
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
