import { glob } from 'node:fs/promises';

const GLOB_CHARS = /[*?[]/;

export function isGlobPattern(path: string): boolean {
  return GLOB_CHARS.test(path);
}

export interface ExpandResult {
  resolved: string[];
  missingGlobs: string[];
}

export async function expandLocalPaths(
  root: string,
  localPaths: string[],
): Promise<ExpandResult> {
  const resolved: string[] = [];
  const missingGlobs: string[] = [];

  for (const localPath of localPaths) {
    if (!isGlobPattern(localPath)) {
      resolved.push(localPath);
      continue;
    }

    const matches: string[] = [];
    for await (const match of glob(localPath, { cwd: root })) {
      matches.push(match);
    }

    if (matches.length === 0) {
      missingGlobs.push(localPath);
    } else {
      resolved.push(...matches.sort());
    }
  }

  return { resolved, missingGlobs };
}
