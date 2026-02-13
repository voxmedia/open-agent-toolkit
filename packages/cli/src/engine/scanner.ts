import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SCOPE_CONTENT_TYPES, type Scope } from '../shared/types';

export interface CanonicalEntry {
  name: string;
  type: 'skill' | 'agent';
  canonicalPath: string;
}

async function readDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return [];
    }
    throw error;
  }
}

export async function scanCanonical(
  basePath: string,
  scope: Scope,
): Promise<CanonicalEntry[]> {
  const scopeRoot = resolve(basePath);
  const entries: CanonicalEntry[] = [];

  for (const contentType of SCOPE_CONTENT_TYPES[scope]) {
    const contentDir = join(
      scopeRoot,
      '.agents',
      contentType === 'skill' ? 'skills' : 'agents',
    );
    const names = await readDirectories(contentDir);

    for (const name of names) {
      entries.push({
        name,
        type: contentType,
        canonicalPath: join(contentDir, name),
      });
    }
  }

  return entries;
}
