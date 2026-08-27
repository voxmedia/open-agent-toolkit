import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readSyncedRecord } from '@commands/project/sync/record';
import {
  commitRecordChange as defaultCommitRecordChange,
  pullSynced as defaultPullSynced,
  pushSynced as defaultPushSynced,
  type PullResult,
  type PushResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import {
  resolveSyncedTarget,
  type ResolvedSyncTarget,
} from '@commands/project/sync/resolve-target';
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
import {
  PROJECT_SCOPES,
  resolveProjectScope,
  resolveScopeRoot,
  syncedRecordPath,
  type ProjectScope,
} from '@commands/shared/project-scope';
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
import { assertValidProjectStateFilesystemContent } from '@validation/project-state';
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
  readSyncedRecord: typeof readSyncedRecord;
  resolveSyncedTarget: typeof resolveSyncedTarget;
  pullSynced: (
    target: SyncTarget,
    git: GitRunner,
    options?: { adopt?: boolean; now?: Date },
  ) => Promise<PullResult>;
  pushSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { message?: string },
  ) => Promise<PushResult>;
  commitRecordChange: typeof defaultCommitRecordChange;
  gitRunner: GitRunner;
  processEnv: NodeJS.ProcessEnv;
  now: () => Date;
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
  readSyncedRecord,
  resolveSyncedTarget,
  pullSynced: defaultPullSynced,
  pushSynced: defaultPushSynced,
  commitRecordChange: defaultCommitRecordChange,
  gitRunner: defaultGitRunner,
  processEnv: process.env,
  now: () => new Date(),
};

interface ResolvedProject {
  projectName: string;
  projectPath: string;
  fullProjectPath: string;
  scope: ProjectScope;
  syncTarget?: ResolvedSyncTarget;
}

function pointerPath(repoRoot: string, absolutePath: string): string {
  const relativePath = relative(repoRoot, absolutePath);
  return relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
    ? absolutePath
    : relativePath.split(sep).join('/');
}

function successfulPull(result: PullResult): boolean {
  return (
    result.status === 'created' ||
    result.status === 'updated' ||
    result.status === 'up-to-date'
  );
}

async function materializeSyncedProject(
  repoRoot: string,
  target: ResolvedSyncTarget,
  dependencies: ProjectOpenDependencies,
): Promise<void> {
  const result = await dependencies.pullSynced(target, dependencies.gitRunner, {
    adopt: target.adopt,
  });
  if (!successfulPull(result)) {
    throw new Error(
      `Unable to open synced project ${target.slug}: pull ${result.status}.`,
    );
  }
  if (result.pendingRecordPaths?.length) {
    await dependencies.commitRecordChange(
      repoRoot,
      result.pendingRecordPaths,
      `chore(oat): adopt synced project ${target.slug}`,
      dependencies.gitRunner,
    );
  }
}

async function resolveProject(
  repoRoot: string,
  projectsRoot: string,
  input: string,
  dependencies: ProjectOpenDependencies,
): Promise<ResolvedProject> {
  const sharedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'shared');
  const explicit = isAbsolute(input) || input.includes('/');
  if (explicit) {
    const fullProjectPath = isAbsolute(input)
      ? resolve(input)
      : resolve(repoRoot, input);
    const scope = resolveProjectScope(fullProjectPath, sharedRoot);
    if (!scope) {
      throw new Error(
        `Project path is outside configured scope roots: ${input}`,
      );
    }
    const projectName = basename(fullProjectPath);
    let syncTarget: ResolvedSyncTarget | undefined;
    if (scope === 'synced') {
      syncTarget = await dependencies.resolveSyncedTarget(
        { repoRoot, env: dependencies.processEnv },
        fullProjectPath,
        {},
        { allowMissingCheckout: true },
      );
      if (!(await dependencies.dirExists(fullProjectPath))) {
        await materializeSyncedProject(repoRoot, syncTarget, dependencies);
      }
    } else if (!(await dependencies.dirExists(fullProjectPath))) {
      throw new Error(`Project not found: ${input}`);
    }
    return {
      projectName,
      projectPath: pointerPath(repoRoot, fullProjectPath),
      fullProjectPath,
      scope,
      syncTarget,
    };
  }

  const candidates: Array<{
    scope: ProjectScope;
    fullProjectPath: string;
    present: boolean;
  }> = [];
  for (const scope of PROJECT_SCOPES) {
    const scopeRoot = resolveScopeRoot(repoRoot, projectsRoot, scope);
    const fullProjectPath = join(scopeRoot, input);
    if (await dependencies.dirExists(fullProjectPath)) {
      candidates.push({ scope, fullProjectPath, present: true });
    } else if (
      scope === 'synced' &&
      (await dependencies.readSyncedRecord(
        syncedRecordPath(scopeRoot, input),
      )) !== null
    ) {
      candidates.push({ scope, fullProjectPath, present: false });
    }
  }
  if (candidates.length > 1) {
    throw new Error(
      `Project name "${input}" is ambiguous across scopes: ${candidates
        .map((candidate) => candidate.scope)
        .join(', ')}. Pass an explicit project path.`,
    );
  }

  let candidate = candidates[0];
  let syncTarget: ResolvedSyncTarget | undefined;
  if (!candidate) {
    try {
      syncTarget = await dependencies.resolveSyncedTarget(
        { repoRoot, env: dependencies.processEnv },
        input,
        {},
        { allowMissingCheckout: true },
      );
      candidate = {
        scope: 'synced',
        fullProjectPath: syncTarget.projectPath,
        present: false,
      };
    } catch {
      throw new Error(`Project not found: ${input}`);
    }
  }
  if (candidate.scope === 'synced') {
    syncTarget ??= await dependencies.resolveSyncedTarget(
      { repoRoot, env: dependencies.processEnv },
      candidate.fullProjectPath,
      {},
      { allowMissingCheckout: true },
    );
    if (!candidate.present) {
      await materializeSyncedProject(repoRoot, syncTarget, dependencies);
    }
  }
  return {
    projectName: input,
    projectPath: pointerPath(repoRoot, candidate.fullProjectPath),
    fullProjectPath: candidate.fullProjectPath,
    scope: candidate.scope,
    syncTarget,
  };
}

async function publishSyncedTransition(
  target: SyncTarget,
  action: 'resume' | 'pause',
  dependencies: ProjectOpenDependencies,
): Promise<void> {
  const result = await dependencies.pushSynced(target, dependencies.gitRunner, {
    message: `chore(oat): ${action} synced project ${target.slug}`,
  });
  if (result.status !== 'pushed' && result.status !== 'up-to-date') {
    throw new Error(
      `Unable to ${action} synced project ${target.slug}: push ${result.status}; active project pointer was not changed.`,
    );
  }
}

async function maybeResumePausedProject(
  statePath: string,
  projectPath: string,
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
  nextBlock = upsertFrontmatterField(
    nextBlock,
    'oat_project_state_updated',
    dependencies.now().toISOString(),
    true,
  ).nextBlock;

  if (nextBlock !== frontmatter) {
    const nextContent = replaceFrontmatter(stateContent, nextBlock);
    await assertValidProjectStateFilesystemContent(nextContent, {
      filePath: statePath,
      projectPath,
    });
    await dependencies.writeFile(statePath, nextContent, 'utf8');
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
    const resolved = await resolveProject(
      repoRoot,
      projectsRoot,
      projectName,
      dependencies,
    );
    const { projectPath, fullProjectPath } = resolved;

    const statePath = join(fullProjectPath, 'state.md');
    if (!(await dependencies.fileExists(statePath))) {
      throw new Error(`Project state.md not found: ${statePath}`);
    }

    const localConfig = await dependencies.readOatLocalConfig(repoRoot);
    const previousActiveProject = localConfig.activeProject ?? null;

    const resumedFromPaused = await maybeResumePausedProject(
      statePath,
      fullProjectPath,
      dependencies,
    );
    if (resumedFromPaused && resolved.syncTarget) {
      await publishSyncedTransition(
        resolved.syncTarget,
        'resume',
        dependencies,
      );
    }

    if (previousActiveProject === projectPath && !resumedFromPaused) {
      if (context.json) {
        context.logger.json({
          status: 'ok',
          projectName: resolved.projectName,
          projectPath,
          scope: resolved.scope,
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
        projectName: resolved.projectName,
        projectPath,
        scope: resolved.scope,
        previousActiveProject,
        resumedFromPaused,
        reason: options.reason ?? null,
      });
    } else {
      if (previousActiveProject) {
        context.logger.info(
          `Switching from ${basename(previousActiveProject)} to ${resolved.projectName}.`,
        );
      } else {
        context.logger.info(`Opened project: ${resolved.projectName}`);
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
