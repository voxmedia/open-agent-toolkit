import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  pushSynced as defaultPushSynced,
  type PushResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import {
  resolveSyncedTarget,
  type ResolvedSyncTarget,
} from '@commands/project/sync/resolve-target';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
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
  type ProjectScope,
} from '@commands/shared/project-scope';
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
import { CliError } from '@errors/cli-error';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { assertValidProjectStateFilesystemContent } from '@validation/project-state';
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
  resolveSyncedTarget: typeof resolveSyncedTarget;
  pushSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { message?: string },
  ) => Promise<PushResult>;
  gitRunner: GitRunner;
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
  resolveSyncedTarget,
  pushSynced: defaultPushSynced,
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

async function resolveNamedProject(
  repoRoot: string,
  projectsRoot: string,
  input: string,
  dependencies: ProjectPauseDependencies,
): Promise<ResolvedProject> {
  const sharedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'shared');
  const explicit = isAbsolute(input) || input.includes('/');
  if (explicit) {
    const fullProjectPath = isAbsolute(input)
      ? resolve(input)
      : resolve(repoRoot, input);
    const scope = resolveProjectScope(fullProjectPath, sharedRoot, repoRoot);
    if (!scope) {
      throw new CliError(
        `Project path is outside configured scope roots: ${input}`,
        1,
      );
    }
    if (!(await dependencies.dirExists(fullProjectPath))) {
      throw new CliError(`Project not found: ${input}`, 1);
    }
    return {
      projectName: basename(fullProjectPath),
      projectPath: pointerPath(repoRoot, fullProjectPath),
      fullProjectPath,
      scope,
      syncTarget:
        scope === 'synced'
          ? await dependencies.resolveSyncedTarget(
              { repoRoot, env: dependencies.processEnv },
              fullProjectPath,
            )
          : undefined,
    };
  }

  const candidates: ResolvedProject[] = [];
  for (const scope of PROJECT_SCOPES) {
    const fullProjectPath = join(
      resolveScopeRoot(repoRoot, projectsRoot, scope),
      input,
    );
    if (!(await dependencies.dirExists(fullProjectPath))) continue;
    candidates.push({
      projectName: input,
      projectPath: pointerPath(repoRoot, fullProjectPath),
      fullProjectPath,
      scope,
      syncTarget:
        scope === 'synced'
          ? await dependencies.resolveSyncedTarget(
              { repoRoot, env: dependencies.processEnv },
              fullProjectPath,
            )
          : undefined,
    });
  }
  if (candidates.length > 1) {
    throw new CliError(
      `Project name "${input}" is ambiguous across scopes: ${candidates
        .map((candidate) => candidate.scope)
        .join(', ')}. Pass an explicit project path.`,
      1,
    );
  }
  if (!candidates[0]) {
    throw new CliError(`Project not found: ${input}`, 1);
  }
  return candidates[0];
}

async function publishPausedState(
  target: SyncTarget,
  dependencies: ProjectPauseDependencies,
): Promise<PushResult> {
  const result = await dependencies.pushSynced(target, dependencies.gitRunner, {
    message: `chore(oat): pause synced project ${target.slug}`,
  });
  if (result.status !== 'pushed' && result.status !== 'up-to-date') {
    const recovery =
      result.status === 'conflict'
        ? ` Resolve the conflicted files without discarding either side, then run oat project pull ${target.slug} --continue followed by oat project push ${target.slug}, then re-run oat project pause ${target.slug} to finish and clear the active pointer; or run oat project pull ${target.slug} --abort to leave the committed local pause unpublished.`
        : ` The committed local pause was retained with a clean checkout; re-run oat project pause ${target.slug} to retry publication.`;
    throw new PausePublicationError(
      `Unable to pause synced project ${target.slug}: push ${result.status}; active project pointer was not changed.${recovery}`,
      result.status,
    );
  }
  return result;
}

class PausePublicationError extends CliError {
  constructor(
    message: string,
    readonly status: Exclude<PushResult['status'], 'pushed' | 'up-to-date'>,
  ) {
    super(message, 1);
  }
}

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

    let resolved: ResolvedProject;
    if (projectName) {
      resolved = await resolveNamedProject(
        repoRoot,
        projectsRoot,
        projectName,
        dependencies,
      );
    } else {
      if (!activeProject) {
        throw new CliError('No project specified and no active project', 1);
      }
      resolved = await resolveNamedProject(
        repoRoot,
        projectsRoot,
        activeProject,
        dependencies,
      );
    }
    const {
      projectName: resolvedProjectName,
      projectPath,
      fullProjectPath,
    } = resolved;

    const statePath = join(fullProjectPath, 'state.md');
    if (!(await dependencies.fileExists(statePath))) {
      throw new CliError(`Project state.md not found: ${statePath}`, 1);
    }

    const content = await dependencies.readFile(statePath, 'utf8');
    const frontmatter = getFrontmatterBlock(content);
    if (!frontmatter) {
      throw new CliError(`state.md is missing frontmatter: ${statePath}`, 1);
    }

    let nextBlock = upsertFrontmatterField(
      frontmatter,
      'oat_lifecycle',
      'paused',
      true,
    ).nextBlock;
    const nowIso = dependencies.now().toISOString();
    nextBlock = upsertFrontmatterField(
      nextBlock,
      'oat_pause_timestamp',
      nowIso,
      true,
    ).nextBlock;
    nextBlock = upsertFrontmatterField(
      nextBlock,
      'oat_project_state_updated',
      nowIso,
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
      const nextContent = replaceFrontmatter(content, nextBlock);
      try {
        await assertValidProjectStateFilesystemContent(nextContent, {
          filePath: statePath,
          projectPath: fullProjectPath,
        });
      } catch (error) {
        throw new CliError(
          error instanceof Error ? error.message : String(error),
          1,
        );
      }
      await dependencies.writeFile(statePath, nextContent, 'utf8');
    }

    if (resolved.syncTarget) {
      try {
        await publishPausedState(resolved.syncTarget, dependencies);
      } catch (error) {
        if (
          nextBlock !== frontmatter &&
          !(error instanceof PausePublicationError)
        ) {
          await dependencies.writeFile(statePath, content, 'utf8');
        }
        throw error;
      }
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
        scope: resolved.scope,
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
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
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
