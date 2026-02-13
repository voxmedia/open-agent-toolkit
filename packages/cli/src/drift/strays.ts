import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join, normalize, relative, resolve } from 'node:path';
import type { CanonicalEntry } from '../engine/scanner';
import type { Manifest } from '../manifest/manifest.types';
import type { DriftReport } from './drift.types';

function normalizePath(path: string): string {
  return normalize(path).replaceAll('\\', '/');
}

function inferProvider(providerDir: string): string {
  const normalized = normalizePath(providerDir);
  const marker = normalized
    .split('/')
    .reverse()
    .find((segment) => segment.startsWith('.'));
  if (!marker) {
    return 'unknown';
  }
  return marker.replace(/^\./, '');
}

function inferContentType(providerDir: string): CanonicalEntry['type'] | null {
  const dirName = basename(normalizePath(providerDir));
  if (dirName === 'skills') {
    return 'skill';
  }
  if (dirName === 'agents') {
    return 'agent';
  }
  return null;
}

function inferScopeRoot(providerDir: string): string {
  const normalized = normalizePath(resolve(providerDir));
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
  return normalizePath(relative(scopeRoot, resolve(path)));
}

function isManifestTracked(
  providerPathRelative: string,
  manifest: Manifest,
): boolean {
  const normalizedProviderPath = normalizePath(providerPathRelative);
  return manifest.entries.some((entry) => {
    const manifestPath = normalizePath(entry.providerPath);
    return manifestPath === normalizedProviderPath;
  });
}

function isCanonicalEntry(
  name: string,
  contentType: CanonicalEntry['type'] | null,
  canonicalEntries: CanonicalEntry[],
): boolean {
  return canonicalEntries.some((entry) => {
    if (entry.name !== name) {
      return false;
    }
    if (!contentType) {
      return true;
    }
    return entry.type === contentType;
  });
}

export async function detectStrays(
  providerDir: string,
  manifest: Manifest,
  canonicalEntries: CanonicalEntry[],
): Promise<DriftReport[]> {
  const provider = inferProvider(providerDir);
  const contentType = inferContentType(providerDir);
  const scopeRoot = inferScopeRoot(providerDir);
  const reports: DriftReport[] = [];
  const resolvedProviderDir = resolve(providerDir);

  let entries: Dirent[];
  try {
    entries = await readdir(resolvedProviderDir, {
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
    throw error;
  }

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
      providerPath,
      state: { status: 'stray' },
    });
  }

  reports.sort((left, right) =>
    left.providerPath.localeCompare(right.providerPath),
  );
  return reports;
}
