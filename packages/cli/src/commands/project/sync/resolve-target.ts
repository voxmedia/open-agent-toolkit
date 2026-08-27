import { stat } from 'node:fs/promises';
import { basename, isAbsolute, resolve } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readSyncedRecord } from '@commands/project/sync/record';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  resolveProjectScope,
  resolveScopeRoot,
  syncedRefName,
  syncedRecordPath,
} from '@commands/shared/project-scope';
import { readOatLocalConfig, type OatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';

import { buildSyncTarget, type SyncTarget } from './ref-sync';

const PROJECT_SLUG_PATTERN = /^(?!-)[a-zA-Z0-9_-]+$/;

export interface ResolveSyncedTargetContext {
  repoRoot: string;
  env?: NodeJS.ProcessEnv;
}

export interface ResolveSyncedTargetOptions {
  allowMissingCheckout?: boolean;
}

export interface ResolveSyncedTargetDependencies {
  resolveProjectsRoot: typeof resolveProjectsRoot;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  readSyncedRecord: typeof readSyncedRecord;
  pathExists: (path: string) => Promise<boolean>;
  gitRunner: GitRunner;
}

export interface ResolvedSyncTarget extends SyncTarget {
  adopt: boolean;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

const DEFAULT_DEPENDENCIES: ResolveSyncedTargetDependencies = {
  resolveProjectsRoot,
  readOatLocalConfig,
  readSyncedRecord,
  pathExists,
  gitRunner: defaultGitRunner,
};

function isBareSlug(value: string): boolean {
  return PROJECT_SLUG_PATTERN.test(value);
}

export async function resolveSyncedTarget(
  context: ResolveSyncedTargetContext,
  pathOrSlug?: string,
  overrides: Partial<ResolveSyncedTargetDependencies> = {},
  options: ResolveSyncedTargetOptions = {},
): Promise<ResolvedSyncTarget> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const projectsRoot = await dependencies.resolveProjectsRoot(
    context.repoRoot,
    context.env ?? process.env,
  );
  const syncedRoot = resolveScopeRoot(context.repoRoot, projectsRoot, 'synced');

  let requested = pathOrSlug;
  if (!requested) {
    requested =
      (await dependencies.readOatLocalConfig(context.repoRoot)).activeProject ??
      undefined;
    if (!requested) {
      throw new CliError('No active project is configured.', 1);
    }
  }

  const bareSlug = isBareSlug(requested);
  const projectPath = bareSlug
    ? resolve(syncedRoot, requested)
    : isAbsolute(requested)
      ? resolve(requested)
      : resolve(context.repoRoot, requested);
  const slug = bareSlug ? requested : basename(projectPath);
  const checkoutExists = await dependencies.pathExists(projectPath);
  const record = await dependencies.readSyncedRecord(
    syncedRecordPath(syncedRoot, slug),
  );

  if (!bareSlug) {
    const scope = resolveProjectScope(
      projectPath,
      resolve(context.repoRoot, projectsRoot),
    );
    if (scope && scope !== 'synced') {
      throw new CliError(
        `Project ${requested} is in ${scope} scope; this command requires synced scope.`,
        1,
      );
    }
    if (!scope) {
      throw new CliError(
        `Project path is outside the synced project root: ${requested}`,
        1,
      );
    }
  }

  let adopt = false;
  if (!checkoutExists && !record) {
    if (options.allowMissingCheckout) {
      const remote = await dependencies.gitRunner.run(
        ['ls-remote', '--exit-code', 'origin', `refs/oat/projects/${slug}`],
        { cwd: context.repoRoot, allowFailure: true },
      );
      if (remote.code === 0) {
        adopt = true;
      } else if (
        !(
          remote.code === 2 &&
          remote.stdout.trim() === '' &&
          remote.stderr.trim() === ''
        )
      ) {
        throw new CliError(
          `git ls-remote origin ${syncedRefName(slug)} failed (exit ${remote.code}): ${remote.stderr || remote.stdout || 'unknown Git error'}`,
          2,
        );
      }
    }
    if (!adopt) {
      throw new CliError(
        `No synced project named ${slug} locally or on origin.`,
        1,
      );
    }
  } else if (!checkoutExists && !options.allowMissingCheckout) {
    throw new CliError(`No synced project named ${slug}.`, 1);
  } else if (checkoutExists && !record && options.allowMissingCheckout) {
    adopt = true;
  }

  return { ...buildSyncTarget(context.repoRoot, projectsRoot, slug), adopt };
}
