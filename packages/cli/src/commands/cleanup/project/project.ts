import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { generateStateDashboard } from '@commands/state/generate';
import { clearActiveProject, readOatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { ensureDir, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import type { CleanupActionRecord, CleanupJsonPayload } from '../cleanup.types';
import { createCleanupPayload, toRepoRelativePath } from '../cleanup.utils';
import {
  projectNeedsLifecycleComplete,
  projectNeedsStateFile,
  renderProjectStateTemplate,
  upsertLifecycleCompleteFrontmatter,
} from './project.utils';

export interface CleanupProjectRunOptions {
  repoRoot: string;
  dryRun?: boolean;
  today?: string;
}

interface CleanupProjectCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  runCleanupProject: (
    options: CleanupProjectRunOptions,
  ) => Promise<CleanupJsonPayload>;
}

interface CleanupProjectRunDependencies {
  refreshDashboard: (repoRoot: string) => Promise<void>;
}

function defaultRunDependencies(): CleanupProjectRunDependencies {
  return {
    refreshDashboard: async (repoRoot) => {
      await generateStateDashboard({ repoRoot });
    },
  };
}

function defaultCommandDependencies(): CleanupProjectCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    runCleanupProject,
  };
}

async function discoverProjectDirectories(repoRoot: string): Promise<string[]> {
  const roots = ['.oat/projects/shared', '.oat/projects/local'].map((root) =>
    join(repoRoot, root),
  );
  const directories: string[] = [];

  for (const root of roots) {
    let rootIsDirectory = false;
    try {
      rootIsDirectory = (await stat(root)).isDirectory();
    } catch {
      rootIsDirectory = false;
    }

    if (!rootIsDirectory) {
      continue;
    }

    const entries = await readdir(root, { withFileTypes: true });
    const sortedDirectoryNames = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const directoryName of sortedDirectoryNames) {
      directories.push(join(root, directoryName));
    }
  }

  return directories.sort((left, right) => left.localeCompare(right));
}

async function planActiveProjectPointerCleanup(
  repoRoot: string,
): Promise<CleanupActionRecord[]> {
  const localConfig = await readOatLocalConfig(repoRoot);
  const activeProjectPath = localConfig.activeProject?.trim();
  if (!activeProjectPath) {
    return [];
  }

  const resolvedPointer = join(repoRoot, activeProjectPath);

  let pointerExists = false;
  try {
    pointerExists = (await stat(resolvedPointer)).isDirectory();
  } catch {
    pointerExists = false;
  }

  const pointerStateExists = await fileExists(
    join(resolvedPointer, 'state.md'),
  );
  if (pointerExists && pointerStateExists) {
    return [];
  }

  return [
    {
      type: 'clear',
      target: '.oat/config.local.json',
      reason: 'invalid activeProject in .oat/config.local.json',
      phase: 'project-scan',
      result: 'planned',
    },
  ];
}

async function planProjectDirectoryCleanup(
  repoRoot: string,
  projectDirectory: string,
): Promise<CleanupActionRecord[]> {
  const actions: CleanupActionRecord[] = [];
  const entries = await readdir(projectDirectory, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  if (projectNeedsStateFile(fileNames)) {
    actions.push({
      type: 'create',
      target: toRepoRelativePath(repoRoot, join(projectDirectory, 'state.md')),
      reason: 'state.md missing while lifecycle artifacts exist',
      phase: 'project-scan',
      result: 'planned',
    });
    return actions;
  }

  if (!fileNames.includes('state.md') || !fileNames.includes('plan.md')) {
    return actions;
  }

  const [planContent, stateContent] = await Promise.all([
    readFile(join(projectDirectory, 'plan.md'), 'utf8'),
    readFile(join(projectDirectory, 'state.md'), 'utf8'),
  ]);

  if (projectNeedsLifecycleComplete(planContent, stateContent)) {
    actions.push({
      type: 'update',
      target: toRepoRelativePath(repoRoot, join(projectDirectory, 'state.md')),
      reason: 'completed project missing oat_lifecycle: complete',
      phase: 'project-scan',
      result: 'planned',
    });
  }

  return actions;
}

async function collectPlannedActions(repoRoot: string): Promise<{
  scanned: number;
  actions: CleanupActionRecord[];
}> {
  const projectDirectories = await discoverProjectDirectories(repoRoot);
  const pointerActions = await planActiveProjectPointerCleanup(repoRoot);
  const nestedActions = await Promise.all(
    projectDirectories.map((projectDirectory) =>
      planProjectDirectoryCleanup(repoRoot, projectDirectory),
    ),
  );

  return {
    scanned: projectDirectories.length,
    actions: [...pointerActions, ...nestedActions.flat()],
  };
}

function fallbackStateTemplate(projectName: string, today: string): string {
  return [
    '---',
    'oat_current_task: null',
    'oat_last_commit: null',
    'oat_blockers: []',
    'oat_phase: discovery',
    'oat_phase_status: in_progress',
    'oat_workflow_mode: spec-driven',
    'oat_workflow_origin: native',
    'oat_generated: false',
    '---',
    '',
    `# Project State: ${projectName}`,
    '',
    `**Started:** ${today}`,
    `**Last Updated:** ${today}`,
  ].join('\n');
}

async function loadStateTemplate(
  repoRoot: string,
  projectName: string,
  today: string,
): Promise<string> {
  const templatePath = join(repoRoot, '.oat', 'templates', 'state.md');
  if (!(await fileExists(templatePath))) {
    return fallbackStateTemplate(projectName, today);
  }

  const templateContent = await readFile(templatePath, 'utf8');
  return renderProjectStateTemplate(templateContent, projectName, today);
}

async function applyCleanupAction(
  repoRoot: string,
  action: CleanupActionRecord,
  today: string,
): Promise<CleanupActionRecord> {
  const targetPath = join(repoRoot, action.target);

  if (action.type === 'clear') {
    if (action.target === '.oat/config.local.json') {
      await clearActiveProject(repoRoot);
      return { ...action, result: 'applied' };
    }

    await rm(targetPath, { force: true });
    return { ...action, result: 'applied' };
  }

  if (action.type === 'create') {
    const projectName = basename(dirname(targetPath));
    const renderedState = await loadStateTemplate(repoRoot, projectName, today);
    await ensureDir(dirname(targetPath));
    await writeFile(targetPath, renderedState, 'utf8');
    return { ...action, result: 'applied' };
  }

  if (action.type === 'update') {
    const content = await readFile(targetPath, 'utf8');
    const updatedContent = upsertLifecycleCompleteFrontmatter(content);
    await writeFile(targetPath, updatedContent, 'utf8');
    return { ...action, result: 'applied' };
  }

  return { ...action, result: 'applied' };
}

export async function runCleanupProject(
  {
    repoRoot,
    dryRun = false,
    today = new Date().toISOString().slice(0, 10),
  }: CleanupProjectRunOptions,
  overrides: Partial<CleanupProjectRunDependencies> = {},
): Promise<CleanupJsonPayload> {
  const dependencies = {
    ...defaultRunDependencies(),
    ...overrides,
  };

  const { scanned, actions: plannedActions } =
    await collectPlannedActions(repoRoot);

  if (dryRun) {
    return createCleanupPayload({
      status: plannedActions.length > 0 ? 'drift' : 'ok',
      dryRun: true,
      scanned,
      issuesFound: plannedActions.length,
      actions: plannedActions,
    });
  }

  const appliedActions: CleanupActionRecord[] = [];
  for (const action of plannedActions) {
    appliedActions.push(await applyCleanupAction(repoRoot, action, today));
  }

  if (appliedActions.length > 0) {
    await dependencies.refreshDashboard(repoRoot);
    appliedActions.push({
      type: 'regenerate',
      target: '.oat/state.md',
      reason: 'refresh dashboard after apply mutations',
      phase: 'project-apply',
      result: 'applied',
    });
  }

  return createCleanupPayload({
    status: 'ok',
    dryRun: false,
    scanned,
    issuesFound: plannedActions.length,
    actions: appliedActions,
  });
}

function formatCleanupProjectPlan(payload: CleanupJsonPayload): string {
  const lines: string[] = [
    `cleanup project (${payload.mode})`,
    `status: ${payload.status}`,
    `summary: scanned=${payload.summary.scanned}, issues=${payload.summary.issuesFound}, planned=${payload.summary.planned}, applied=${payload.summary.applied}, skipped=${payload.summary.skipped}, blocked=${payload.summary.blocked}`,
  ];

  if (payload.actions.length === 0) {
    lines.push('actions: none');
    return lines.join('\n');
  }

  lines.push('actions:');
  for (const action of payload.actions) {
    lines.push(`- ${action.type} ${action.target} (${action.reason})`);
  }

  return lines.join('\n');
}

export function createCleanupProjectCommand(
  overrides: Partial<CleanupProjectCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultCommandDependencies(),
    ...overrides,
  };

  return new Command('project')
    .description('Cleanup project pointers, state, and lifecycle drift')
    .option('--dry-run', 'Preview cleanup without applying')
    .action(async (options: { dryRun?: boolean }, command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
        const payload = await dependencies.runCleanupProject({
          repoRoot,
          dryRun: options.dryRun ?? false,
        });

        if (context.json) {
          context.logger.json(payload);
        } else {
          context.logger.info(formatCleanupProjectPlan(payload));
        }

        process.exitCode = payload.status === 'ok' ? 0 : 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({ status: 'error', message });
        } else {
          context.logger.error(message);
        }
        process.exitCode = error instanceof CliError ? error.exitCode : 2;
      }
    });
}
