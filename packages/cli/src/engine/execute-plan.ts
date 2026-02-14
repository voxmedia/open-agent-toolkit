import { rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { copyDirectory, createSymlink } from '../fs/io';
import { computeDirectoryHash } from '../manifest/hash';
import { addEntry, removeEntry, saveManifest } from '../manifest/manager';
import type { Manifest, ManifestEntry } from '../manifest/manifest.types';
import type { SyncPlan, SyncPlanEntry, SyncResult } from './engine.types';
import { insertMarker, writeDirectorySentinel } from './markers';

export function inferScopeRoot(canonicalPath: string): string {
  const normalizedPath = canonicalPath.replaceAll('\\', '/');
  const marker = '/.agents/';
  const markerIndex = normalizedPath.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(
      `Cannot infer scope root from canonical path: ${canonicalPath}`,
    );
  }

  return resolve(normalizedPath.slice(0, markerIndex));
}

function resolveManifestPaths(entry: SyncPlanEntry): {
  canonicalPath: string;
  providerPath: string;
} {
  const scopeRoot = inferScopeRoot(resolve(entry.canonical.canonicalPath));

  return {
    canonicalPath: relative(scopeRoot, resolve(entry.canonical.canonicalPath)),
    providerPath: relative(scopeRoot, resolve(entry.providerPath)),
  };
}

async function toManifestEntry(
  entry: SyncPlanEntry,
  strategy: 'symlink' | 'copy',
): Promise<ManifestEntry> {
  const { canonicalPath, providerPath } = resolveManifestPaths(entry);
  const contentHash =
    strategy === 'copy'
      ? await computeDirectoryHash(resolve(entry.canonical.canonicalPath))
      : null;

  return {
    canonicalPath,
    providerPath,
    provider: entry.provider,
    contentType: entry.canonical.type,
    strategy,
    contentHash,
    lastSynced: new Date().toISOString(),
  };
}

function markerFileNameForEntry(entry: SyncPlanEntry): string {
  return entry.canonical.type === 'agent' ? 'AGENT.md' : 'SKILL.md';
}

async function applyCopyMarker(entry: SyncPlanEntry): Promise<void> {
  const markerPath = join(entry.providerPath, markerFileNameForEntry(entry));

  try {
    await writeDirectorySentinel(
      entry.providerPath,
      entry.canonical.canonicalPath,
    );
    await insertMarker(markerPath, entry.canonical.canonicalPath);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      // Marker insertion is best-effort for non-standard directory layouts.
      return;
    }
    throw error;
  }
}

async function applyEntry(
  planEntry: SyncPlanEntry,
  manifest: Manifest,
): Promise<Manifest> {
  switch (planEntry.operation) {
    case 'create_symlink':
    case 'update_symlink': {
      if (planEntry.operation === 'update_symlink') {
        await rm(planEntry.providerPath, { recursive: true, force: true });
      }
      const strategyUsed = await createSymlink(
        planEntry.canonical.canonicalPath,
        planEntry.providerPath,
      );
      const manifestEntry = await toManifestEntry(planEntry, strategyUsed);
      return addEntry(manifest, manifestEntry);
    }
    case 'create_copy':
    case 'update_copy': {
      if (planEntry.operation === 'update_copy') {
        await rm(planEntry.providerPath, { recursive: true, force: true });
      }
      await copyDirectory(
        planEntry.canonical.canonicalPath,
        planEntry.providerPath,
      );
      await applyCopyMarker(planEntry);
      const manifestEntry = await toManifestEntry(planEntry, 'copy');
      return addEntry(manifest, manifestEntry);
    }
    case 'remove': {
      await rm(planEntry.providerPath, { recursive: true, force: true });
      const { canonicalPath } = resolveManifestPaths(planEntry);
      return removeEntry(manifest, canonicalPath, planEntry.provider);
    }
    case 'skip': {
      return manifest;
    }
    default:
      return manifest;
  }
}

export async function executeSyncPlan(
  plan: SyncPlan,
  manifest: Manifest,
  manifestPath: string,
): Promise<SyncResult> {
  let nextManifest = manifest;
  const result: SyncResult = {
    applied: 0,
    failed: 0,
    skipped: 0,
  };
  const operations = [...plan.entries, ...plan.removals];

  for (const operation of operations) {
    if (operation.operation === 'skip') {
      result.skipped += 1;
      continue;
    }

    try {
      nextManifest = await applyEntry(operation, nextManifest);
      result.applied += 1;
    } catch {
      result.failed += 1;
    }
  }

  await saveManifest(manifestPath, nextManifest);
  return result;
}
