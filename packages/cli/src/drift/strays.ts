import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join, normalize, resolve } from 'node:path';
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

function isManifestTracked(providerPath: string, manifest: Manifest): boolean {
  const normalizedProviderPath = normalizePath(providerPath);
  return manifest.entries.some((entry) => {
    const manifestPath = normalizePath(entry.providerPath);
    return (
      manifestPath === normalizedProviderPath ||
      normalizedProviderPath.endsWith(`/${manifestPath}`)
    );
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
    const providerPathFromRoot = join(providerDir, entry.name);
    if (isManifestTracked(providerPathFromRoot, manifest)) {
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
