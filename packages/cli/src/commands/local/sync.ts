import { lstat, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

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
  sourceRoot: string;
  targetRoot: string;
  localPaths: string[];
  direction: 'to' | 'from';
  force: boolean;
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
    if (
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
