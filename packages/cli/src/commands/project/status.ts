import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  readOpenLinkedProjects,
  type OpenLinkedProjects,
} from '@commands/project/linked/ledger';
import { projectListHint } from '@commands/project/list';
import {
  describeOrchestratorCheckout,
  formatOrchestratorLines,
  readCurrentBranch,
  readOrchestratorBranch,
  type OrchestratorCheckout,
} from '@commands/project/orchestrator/branch';
import {
  resolveUnpulledSyncedProject,
  type UnpulledSyncedProject,
} from '@commands/project/unpulled-synced';
import { getProjectStateWithReviewAncestry } from '@commands/review/head-ancestry';
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
  /** This checkout's branch; null on a detached HEAD or outside git. */
  readCurrentBranch: (cwd: string) => Promise<string | null>;
  /** A freestyle project's recorded orchestrator branch; null if unclaimed. */
  readOrchestratorBranch: (projectDir: string) => Promise<string | null>;
  /** A freestyle parent's open rows in its `linked-projects.md`. */
  readOpenLinkedProjects: (projectDir: string) => Promise<OpenLinkedProjects>;
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
  getProjectState: getProjectStateWithReviewAncestry,
  resolveUnpulledSyncedProject,
  readCurrentBranch: (cwd) => readCurrentBranch(cwd),
  readOrchestratorBranch,
  readOpenLinkedProjects,
};

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

/** What status reports about a freestyle project beyond its files. */
interface FreestyleCoordination {
  orchestrator: OrchestratorCheckout;
  linkedProjects: OpenLinkedProjects;
}

/**
 * One line per open link, so a parent cannot miss a linked project whose
 * records it has not acknowledged; an unreadable ledger is said, not hidden.
 */
function formatOpenLinkLines(linked: OpenLinkedProjects): string[] {
  if (linked.error) {
    return [`Linked projects: unreadable (${linked.error})`];
  }
  return linked.open.map(
    (row) =>
      `Open linked project: ${row.name} (${row.scope}, ${row.path}): ${row.purpose}; after reading its records, acknowledge with \`oat project linked ack ${row.name}\``,
  );
}

function formatProjectStatusLines(
  project: ProjectState,
  files: FreestyleProjectFiles | null,
  coordination: FreestyleCoordination | null,
): string[] {
  // Freestyle has no lifecycle phase, progress or current task to report.
  const position = files
    ? [
        'Mode: freestyle (no lifecycle workflow)',
        `Rules: ${files.agents}`,
        `Shape: ${files.shape}`,
        ...(coordination
          ? [
              ...formatOrchestratorLines(coordination.orchestrator),
              ...formatOpenLinkLines(coordination.linkedProjects),
            ]
          : []),
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
      await writeProjectStatusOutput(
        context,
        dependencies,
        options,
        { status: 'ok', project },
        options.projectPath,
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
      await writeProjectStatusOutput(
        context,
        dependencies,
        options,
        { status: 'ok', project },
        options.projectPath,
        targetPath,
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

    const activeDir = join(repoRoot, activeProject.path);
    const project = await dependencies.getProjectState(activeDir);
    await writeProjectStatusOutput(
      context,
      dependencies,
      options,
      { status: 'ok', project },
      activeProject.path,
      activeDir,
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

/**
 * `projectDir` is the project folder as the caller named it, used in the
 * printed paths; `absoluteDir` is the same folder resolved, used for reads.
 */
async function writeProjectStatusOutput(
  context: CommandContext,
  dependencies: ProjectStatusDependencies,
  options: ProjectStatusOptions,
  status: { status: 'ok'; project: ProjectState },
  projectDir: string,
  absoluteDir: string,
): Promise<void> {
  const files = freestyleProjectFiles(status.project, projectDir);
  const coordination = files
    ? {
        orchestrator: describeOrchestratorCheckout(
          await dependencies.readOrchestratorBranch(absoluteDir),
          await dependencies.readCurrentBranch(context.cwd),
        ),
        linkedProjects: await dependencies.readOpenLinkedProjects(absoluteDir),
      }
    : null;
  const payload = files
    ? { ...status, projectFiles: files, ...coordination }
    : status;
  writeStatusPayload(context, options, payload, () =>
    formatProjectStatusLines(payload.project, files, coordination),
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
