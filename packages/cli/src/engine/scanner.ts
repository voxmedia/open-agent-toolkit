import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { CliError } from '@errors/index';
import { SCOPE_CONTENT_TYPES, type Scope } from '@shared/types';

type ConcreteScope = Exclude<Scope, 'all'>;

export interface CanonicalEntry {
  name: string;
  type: 'skill' | 'agent';
  canonicalPath: string;
  isFile: boolean;
}

interface ScannedEntry {
  name: string;
  isFile: boolean;
}

async function readEntries(dirPath: string): Promise<ScannedEntry[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const results: ScannedEntry[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push({ name: entry.name, isFile: false });
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push({ name: entry.name, isFile: true });
      }
    }

    results.sort((left, right) => left.name.localeCompare(right.name));
    return results;
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
    const includeFiles = contentType === 'agent';
    const scanned = await readEntries(contentDir);

    for (const scannedEntry of scanned) {
      if (scannedEntry.isFile && !includeFiles) {
        continue;
      }
      entries.push({
        name: scannedEntry.name,
        type: contentType,
        canonicalPath: join(contentDir, scannedEntry.name),
        isFile: scannedEntry.isFile,
      });
    }
  }

  return entries;
}
