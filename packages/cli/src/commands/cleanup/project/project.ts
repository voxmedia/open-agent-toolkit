import { readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';
import type { CleanupActionRecord, CleanupJsonPayload } from '../cleanup.types';
import { createCleanupPayload } from '../cleanup.utils';
import {
  createProjectCleanupScanResult,
  projectNeedsLifecycleComplete,
  projectNeedsStateFile,
} from './project.utils';

export interface CleanupProjectScanOptions {
  repoRoot: string;
}

function toRepoRelativePath(repoRoot: string, targetPath: string): string {
  return relative(repoRoot, targetPath).replaceAll('\\', '/');
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
    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories.push(join(root, entry.name));
      }
    }
  }

  return directories;
}

async function planActiveProjectPointerCleanup(
  repoRoot: string,
): Promise<CleanupActionRecord[]> {
  const activeProjectPath = join(repoRoot, '.oat', 'active-project');
  if (!(await fileExists(activeProjectPath))) {
    return [];
  }

  const rawPointer = (await readFile(activeProjectPath, 'utf8')).trim();
  if (!rawPointer) {
    return [];
  }

  const resolvedPointer = isAbsolute(rawPointer)
    ? rawPointer
    : join(repoRoot, rawPointer);

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
      target: '.oat/active-project',
      reason: 'invalid .oat/active-project pointer',
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

export async function scanCleanupProjectDrift({
  repoRoot,
}: CleanupProjectScanOptions): Promise<CleanupJsonPayload> {
  const projectDirectories = await discoverProjectDirectories(repoRoot);
  const pointerActions = await planActiveProjectPointerCleanup(repoRoot);

  const nestedActions = await Promise.all(
    projectDirectories.map((projectDirectory) =>
      planProjectDirectoryCleanup(repoRoot, projectDirectory),
    ),
  );
  const actions = [...pointerActions, ...nestedActions.flat()];
  const scanResult = createProjectCleanupScanResult(
    projectDirectories.length,
    [],
  );

  return createCleanupPayload({
    status: actions.length > 0 ? 'drift' : 'ok',
    apply: false,
    scanned: scanResult.scanned,
    issuesFound: actions.length,
    actions,
  });
}

function formatCleanupProjectPlan(payload: CleanupJsonPayload): string {
  const lines: string[] = [
    `cleanup project (${payload.mode})`,
    `status: ${payload.status}`,
    `summary: scanned=${payload.summary.scanned}, issues=${payload.summary.issuesFound}, planned=${payload.summary.planned}`,
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

interface CleanupProjectCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  scanCleanupProjectDrift: (
    options: CleanupProjectScanOptions,
  ) => Promise<CleanupJsonPayload>;
}

function defaultDependencies(): CleanupProjectCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    scanCleanupProjectDrift,
  };
}

export function createCleanupProjectCommand(
  overrides: Partial<CleanupProjectCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultDependencies(),
    ...overrides,
  };

  return new Command('project')
    .description('Cleanup project pointers, state, and lifecycle drift')
    .action(async (_options, command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
      const payload = await dependencies.scanCleanupProjectDrift({ repoRoot });

      if (context.json) {
        context.logger.json(payload);
      } else {
        context.logger.info(formatCleanupProjectPlan(payload));
      }

      process.exitCode = 0;
    });
}
