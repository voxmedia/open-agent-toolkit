import { lstat, readdir, realpath, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { CliError } from '@errors/cli-error';
import { copyDirectory, dirExists, fileExists } from '@fs/io';

import { expandLocalPaths } from './expand';

export type SyncStatus = 'copied' | 'skipped' | 'missing';

export interface SyncEntry {
  path: string;
  status: SyncStatus;
  reason?: 'nested-worktree';
}

export interface SyncResult {
  entries: SyncEntry[];
  copied: number;
  skipped: number;
  missing: number;
}

export interface SyncOptions {
  repoRoot?: string;
  sourceRoot: string;
  targetRoot: string;
  localPaths: string[];
  direction: 'to' | 'from';
  force: boolean;
  gitRunner?: GitRunner;
}

async function canonicalizeLocalSyncPath(path: string): Promise<string> {
  const absolute = resolve(path);
  try {
    return await realpath(absolute);
  } catch (error) {
    if (
      !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
    ) {
      throw error;
    }
    const parent = dirname(absolute);
    if (parent === absolute) return absolute;
    return join(
      await canonicalizeLocalSyncPath(parent),
      relative(parent, absolute),
    );
  }
}

function pathsOverlap(left: string, right: string): boolean {
  const leftToRight = relative(left, right);
  const rightToLeft = relative(right, left);
  const isWithin = (candidate: string) =>
    candidate === '' ||
    (candidate !== '..' &&
      !candidate.startsWith(`..${sep}`) &&
      !isAbsolute(candidate));
  return isWithin(leftToRight) || isWithin(rightToLeft);
}

function worktreeOwnsRoot(worktreePath: string, rootPath: string): boolean {
  const relativeRoot = relative(worktreePath, rootPath);
  return (
    relativeRoot === '' ||
    (relativeRoot !== '..' &&
      !relativeRoot.startsWith(`..${sep}`) &&
      !isAbsolute(relativeRoot))
  );
}

async function registeredNestedWorktrees(
  repoRoot: string,
  sourceRoot: string,
  targetRoot: string,
  git: GitRunner,
): Promise<string[]> {
  const result = await git.run(['worktree', 'list', '--porcelain'], {
    cwd: repoRoot,
    allowFailure: true,
  });
  if (result.code !== 0) {
    throw new CliError(
      `Unable to inspect registered worktrees before local sync: ${result.stderr || result.stdout || `git worktree list failed with exit ${result.code}`}`,
      2,
    );
  }
  const records = result.stdout ? result.stdout.split(/\n\n+/) : [];
  const registered: string[] = [];
  for (const record of records) {
    const lines = record.split('\n').filter(Boolean);
    const worktreeLines = lines.filter((line) => line.startsWith('worktree '));
    const worktreeLine = worktreeLines[0];
    if (
      lines.length === 0 ||
      worktreeLines.length !== 1 ||
      typeof worktreeLine !== 'string' ||
      !worktreeLine.startsWith('worktree ') ||
      lines[0] !== worktreeLine ||
      worktreeLine.slice('worktree '.length).trim() === ''
    ) {
      throw new CliError(
        'Malformed `git worktree list --porcelain` output; refusing local sync.',
        2,
      );
    }
    registered.push(
      await canonicalizeLocalSyncPath(worktreeLine.slice('worktree '.length)),
    );
  }
  if (registered.length === 0) {
    throw new CliError(
      'Git returned no registered worktrees; refusing repository-aware local sync.',
      2,
    );
  }
  const supportedRoots = await Promise.all([
    canonicalizeLocalSyncPath(sourceRoot),
    canonicalizeLocalSyncPath(targetRoot),
  ]);
  return [...new Set(registered)].filter(
    (worktreePath) =>
      !supportedRoots.some((rootPath) =>
        worktreeOwnsRoot(worktreePath, rootPath),
      ),
  );
}

async function containsNestedGitMarker(root: string): Promise<boolean> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return false;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.name === '.git') return true;
    const entryPath = join(root, entry.name);
    if (entry.isSymbolicLink()) {
      // Local sync does not follow directory symlinks while looking for a
      // worktree boundary. A symlink target is copied as a link by the I/O
      // layer and cannot authorize recursive deletion of its destination.
      continue;
    }
    if (entry.isDirectory() && (await containsNestedGitMarker(entryPath))) {
      return true;
    }
    if (!entry.isDirectory() && !entry.isFile()) {
      // Force filesystem errors to surface instead of silently treating an
      // unfamiliar entry as safe.
      await lstat(entryPath);
    }
  }
  return false;
}

export async function syncLocalPaths(
  options: SyncOptions,
): Promise<SyncResult> {
  const { sourceRoot, targetRoot, localPaths, direction, force } = options;

  // Determine actual from/to based on direction
  const fromRoot = direction === 'to' ? sourceRoot : targetRoot;
  const toRoot = direction === 'to' ? targetRoot : sourceRoot;

  const entries: SyncEntry[] = [];
  const registered = options.repoRoot
    ? await registeredNestedWorktrees(
        options.repoRoot,
        sourceRoot,
        targetRoot,
        options.gitRunner ?? defaultGitRunner,
      )
    : [];

  const { resolved, missingGlobs } = await expandLocalPaths(
    fromRoot,
    localPaths,
  );

  for (const pattern of missingGlobs) {
    entries.push({ path: pattern, status: 'missing' });
  }

  for (const localPath of resolved) {
    const sourcePath = join(fromRoot, localPath);
    const destPath = join(toRoot, localPath);

    const sourceExists =
      (await dirExists(sourcePath)) || (await fileExists(sourcePath));

    if (!sourceExists) {
      entries.push({ path: localPath, status: 'missing' });
      continue;
    }

    // This check must cover the whole selected entry on both sides and must
    // happen before force-removal. A localPath may be an ancestor of a linked
    // worktree, so checking only `<entry>/.git` is insufficient.
    const [canonicalSourcePath, canonicalDestPath] = await Promise.all([
      canonicalizeLocalSyncPath(sourcePath),
      canonicalizeLocalSyncPath(destPath),
    ]);
    if (
      registered.some(
        (worktreePath) =>
          pathsOverlap(canonicalSourcePath, worktreePath) ||
          pathsOverlap(canonicalDestPath, worktreePath),
      ) ||
      (await containsNestedGitMarker(sourcePath)) ||
      (await containsNestedGitMarker(destPath))
    ) {
      entries.push({
        path: localPath,
        status: 'skipped',
        reason: 'nested-worktree',
      });
      continue;
    }

    const destExists =
      (await dirExists(destPath)) || (await fileExists(destPath));

    if (destExists && !force) {
      entries.push({ path: localPath, status: 'skipped' });
      continue;
    }

    if (destExists && force) {
      await rm(destPath, { recursive: true, force: true });
    }

    await copyDirectory(sourcePath, destPath);
    entries.push({ path: localPath, status: 'copied' });
  }

  return {
    entries,
    copied: entries.filter((e) => e.status === 'copied').length,
    skipped: entries.filter((e) => e.status === 'skipped').length,
    missing: entries.filter((e) => e.status === 'missing').length,
  };
}
