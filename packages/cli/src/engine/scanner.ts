import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CliError } from '@errors/index';
import { SCOPE_CONTENT_TYPES, type Scope } from '@shared/types';

type ConcreteScope = Exclude<Scope, 'all'>;

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

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'EACCES' || error.code === 'EPERM')
    ) {
      throw new CliError(
        `Permission denied reading canonical directory ${dirPath}. Adjust permissions and retry.`,
      );
    }
    throw error;
  }
}

export async function scanCanonical(
  basePath: string,
  scope: ConcreteScope,
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
