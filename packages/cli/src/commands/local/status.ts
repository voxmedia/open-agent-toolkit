import { readFile } from 'node:fs/promises';
import { join, matchesGlob } from 'node:path';

import { dirExists, fileExists } from '@fs/io';

import { expandLocalPaths } from './expand';

export interface LocalPathStatus {
  path: string;
  exists: boolean;
  gitignored: boolean;
}

function matchesGitignoreLine(localPath: string, line: string): boolean {
  // Normalize: strip leading `/` (root-relative marker) and trailing `/` (dir marker)
  const normalizedLine = line.replace(/^\//, '').replace(/\/+$/, '');
  const normalizedPath = localPath.replace(/\/+$/, '');

  // Exact match
  if (normalizedPath === normalizedLine) return true;

  // Glob match (for patterns containing *, ?, or [)
  if (/[*?[]/.test(normalizedLine)) {
    return matchesGlob(normalizedPath, normalizedLine);
  }

  return false;
}

async function isPathGitignored(
  repoRoot: string,
  localPath: string,
): Promise<boolean> {
  const gitignorePath = join(repoRoot, '.gitignore');

  try {
    const content = await readFile(gitignorePath, 'utf8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'));

    return lines.some((line) => matchesGitignoreLine(localPath, line));
  } catch {
    return false;
  }
}

export async function checkLocalPathsStatus(
  repoRoot: string,
  localPaths: string[],
): Promise<LocalPathStatus[]> {
  const results: LocalPathStatus[] = [];

  const { resolved, missingGlobs } = await expandLocalPaths(
    repoRoot,
    localPaths,
  );

  for (const pattern of missingGlobs) {
    results.push({ path: pattern, exists: false, gitignored: false });
  }

  for (const localPath of resolved) {
    const absolutePath = join(repoRoot, localPath);
    const exists =
      (await dirExists(absolutePath)) || (await fileExists(absolutePath));
    const gitignored = await isPathGitignored(repoRoot, localPath);

    results.push({ path: localPath, exists, gitignored });
  }

  return results;
}
