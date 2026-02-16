import { readdir } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import type { CanonicalEntry } from '@engine/scanner';
import { CliError } from '@errors/index';
import { toPosixPath } from '@fs/paths';
import type { Manifest } from '@manifest/manifest.types';
import type { DriftReport } from './drift.types';

function inferContentType(providerDir: string): CanonicalEntry['type'] | null {
  const dirName = basename(toPosixPath(providerDir));
  if (dirName === 'skills') {
    return 'skill';
  }
  if (dirName === 'agents') {
    return 'agent';
  }
  return null;
}

export function inferScopeRoot(providerDir: string): string {
  const normalized = toPosixPath(resolve(providerDir));
  const segments = normalized.split('/').filter(Boolean);

  for (let index = segments.length - 2; index >= 0; index -= 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    if (
      segment?.startsWith('.') &&
      (nextSegment === 'skills' || nextSegment === 'agents')
    ) {
      const rootPath = `/${segments.slice(0, index).join('/')}`;
      return rootPath === '' ? '/' : rootPath;
    }
  }

  return resolve(providerDir, '..', '..');
}

function toScopeRelative(path: string, scopeRoot: string): string {
  return toPosixPath(relative(scopeRoot, resolve(path)));
}

function isManifestTracked(
  providerPathRelative: string,
  manifest: Manifest,
): boolean {
  const normalizedProviderPath = toPosixPath(providerPathRelative);
  return manifest.entries.some((entry) => {
    const manifestPath = toPosixPath(entry.providerPath);
    return manifestPath === normalizedProviderPath;
  });
}

function isCanonicalEntry(
  name: string,
  contentType: CanonicalEntry['type'] | null,
  canonicalEntries: CanonicalEntry[],
): boolean {
  if (!contentType) {
    return false;
  }

  return canonicalEntries.some((entry) => {
    return entry.name === name && entry.type === contentType;
  });
}

async function readProviderEntries(resolvedProviderDir: string) {
  try {
    return await readdir(resolvedProviderDir, {
      withFileTypes: true,
      encoding: 'utf8',
    });
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
        `Permission denied reading provider directory ${resolvedProviderDir}. Adjust permissions and retry.`,
      );
    }
    throw error;
  }
}

export async function detectStrays(
  provider: string,
  providerDir: string,
  manifest: Manifest,
  canonicalEntries: CanonicalEntry[],
): Promise<DriftReport[]> {
  const contentType = inferContentType(providerDir);
  const scopeRoot = inferScopeRoot(providerDir);
  const reports: DriftReport[] = [];
  const resolvedProviderDir = resolve(providerDir);
  const entries = await readProviderEntries(resolvedProviderDir);

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) {
      continue;
    }

    const providerPath = join(resolvedProviderDir, entry.name);
    const providerPathRelative = toScopeRelative(providerPath, scopeRoot);
    if (isManifestTracked(providerPathRelative, manifest)) {
      continue;
    }

    if (isCanonicalEntry(entry.name, contentType, canonicalEntries)) {
      continue;
    }

    reports.push({
      canonical: null,
      provider,
      providerPath: providerPathRelative,
      state: { status: 'stray' },
    });
  }

  reports.sort((left, right) =>
    left.providerPath.localeCompare(right.providerPath),
  );
  return reports;
}
