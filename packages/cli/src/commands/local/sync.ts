import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { copyDirectory, dirExists, fileExists } from '@fs/io';

import { expandLocalPaths } from './expand';

export type SyncStatus = 'copied' | 'skipped' | 'missing';

export interface SyncEntry {
  path: string;
  status: SyncStatus;
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
