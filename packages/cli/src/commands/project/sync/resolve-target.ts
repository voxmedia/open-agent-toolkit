import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  resolveProjectScope,
  resolveScopeRoot,
  syncedRefName,
} from '@commands/shared/project-scope';
import { readOatLocalConfig, type OatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';

import {
  assertCanonicalSyncTargetIdentity,
  buildSyncTarget,
  classifyAdoptionRecord,
  type AdoptionRecordState,
  type SyncTarget,
} from './ref-sync';

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
  classifyAdoptionRecord: typeof classifyAdoptionRecord;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  pathExists: (path: string) => Promise<boolean>;
  realpath: typeof realpath;
  gitRunner: GitRunner;
}

export interface ResolvedSyncTarget extends SyncTarget {
  adopt: boolean;
  adoptionRecord: AdoptionRecordState;
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
  classifyAdoptionRecord,
  readOatLocalConfig,
  pathExists,
  realpath,
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
  let slug = requested;

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

    const directChild = relative(syncedRoot, projectPath);
    if (
      directChild === '' ||
      directChild === '..' ||
      directChild.startsWith(`..${sep}`) ||
      isAbsolute(directChild) ||
      directChild.includes(sep) ||
      !isBareSlug(directChild)
    ) {
      throw new CliError(
        `Project path must identify exactly one direct child of the synced project root: ${requested}`,
        1,
      );
    }
    slug = directChild;
  }

  const target = buildSyncTarget(context.repoRoot, projectsRoot, slug);
  const checkoutExists = await assertCanonicalSyncTargetIdentity(target, {
    pathExists: dependencies.pathExists,
    realpath: dependencies.realpath,
    exitCode: 1,
  });
  const adoptionRecord = await dependencies.classifyAdoptionRecord(
    target,
    dependencies.gitRunner,
  );

  let adopt = adoptionRecord === 'pending';
  if (!checkoutExists && adoptionRecord === 'create') {
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
  } else if (
    checkoutExists &&
    adoptionRecord === 'create' &&
    options.allowMissingCheckout
  ) {
    adopt = true;
  }

  return { ...target, adopt, adoptionRecord };
}
