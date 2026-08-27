import { mkdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import {
  isSyncedCheckout,
  resolveScopeRoot,
  SYNCED_REMOTE,
  syncedRefName,
} from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';

import type { GitRunner } from './git';

export interface SyncTarget {
  repoRoot: string;
  slug: string;
  projectPath: string;
  ref: string;
  remote: string;
}

export interface AllowlistedPathspecOptions {
  summaryExportPath?: string | null;
  additionalAllowlistedPaths?: string[];
}

export function buildSyncTarget(
  repoRoot: string,
  projectsRoot: string,
  slug: string,
): SyncTarget {
  const syncedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
  return {
    repoRoot: resolve(repoRoot),
    slug,
    projectPath: resolve(syncedRoot, slug),
    ref: syncedRefName(slug),
    remote: SYNCED_REMOTE,
  };
}

export async function createSyncedProject(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
  const tree = await git.run(['hash-object', '-t', 'tree', '/dev/null'], {
    cwd: target.repoRoot,
  });
  const commit = await git.run(
    [
      'commit-tree',
      tree.stdout,
      '-m',
      `chore(oat): init synced project ${target.slug}`,
    ],
    { cwd: target.repoRoot },
  );
  await git.run(['update-ref', target.ref, commit.stdout], {
    cwd: target.repoRoot,
  });
  await mkdir(dirname(target.projectPath), { recursive: true });
  await git.run(
    ['worktree', 'add', '--detach', target.projectPath, target.ref],
    { cwd: target.repoRoot },
  );
  await assertNestedWorktree(target, git);
}

export async function assertNestedWorktree(
  target: SyncTarget,
  git: GitRunner,
): Promise<void> {
  if (
    resolve(target.projectPath) === resolve(target.repoRoot) ||
    !(await isSyncedCheckout(target.projectPath))
  ) {
    throw new CliError(
      `Refusing synced mutation: ${target.projectPath} is not a nested git worktree.`,
      2,
    );
  }

  const topLevel = await git.run(['rev-parse', '--show-toplevel'], {
    cwd: target.projectPath,
  });
  const [actualTopLevel, expectedTopLevel] = await Promise.all([
    realpath(topLevel.stdout),
    realpath(target.projectPath),
  ]);
  if (actualTopLevel !== expectedTopLevel) {
    throw new CliError(
      `Refusing synced mutation: expected nested toplevel ${expectedTopLevel}, got ${actualTopLevel}.`,
      2,
    );
  }
}

function isWithin(root: string, candidate: string): boolean {
  const child = relative(root, candidate);
  return (
    child === '' ||
    (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child))
  );
}

function repoRelativePath(repoRoot: string, pathspec: string): string {
  const absolute = isAbsolute(pathspec)
    ? resolve(pathspec)
    : resolve(repoRoot, pathspec);
  if (!isWithin(resolve(repoRoot), absolute)) {
    throw new CliError(
      `Refusing parent-branch mutation outside the repository: ${pathspec}`,
      2,
    );
  }
  return relative(resolve(repoRoot), absolute).split(sep).join('/');
}

export function assertAllowlistedPathspecs(
  repoRoot: string,
  pathspecs: string[],
  options: AllowlistedPathspecOptions = {},
): void {
  const explicitPaths = new Set(
    (options.additionalAllowlistedPaths ?? []).map((path) =>
      repoRelativePath(repoRoot, path),
    ),
  );
  const summaryRoot = options.summaryExportPath
    ? isAbsolute(options.summaryExportPath)
      ? resolve(options.summaryExportPath)
      : resolve(repoRoot, options.summaryExportPath)
    : null;

  for (const pathspec of pathspecs) {
    const repoRelative = repoRelativePath(repoRoot, pathspec);
    const absolute = resolve(repoRoot, repoRelative);
    const allowed =
      repoRelative === '.gitignore' ||
      repoRelative === '.gitattributes' ||
      /^\.oat\/projects\/synced\/[a-zA-Z0-9_-]+\.json$/.test(repoRelative) ||
      /^\.oat\/projects\/shared\/[a-zA-Z0-9_-]+(?:\/.*)?$/.test(repoRelative) ||
      explicitPaths.has(repoRelative) ||
      (summaryRoot !== null && isWithin(summaryRoot, absolute));

    if (!allowed) {
      throw new CliError(
        `Refusing non-allowlisted parent-branch pathspec: ${pathspec}`,
        2,
      );
    }
  }
}
