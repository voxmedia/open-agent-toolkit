import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { copyDirectory, copySingleFile, createSymlink } from '@fs/io';
import { computeContentHash, computeStringHash } from '@manifest/hash';
import {
  addEntry,
  findEntry,
  removeEntry,
  saveManifest,
} from '@manifest/manager';
import type { Manifest, ManifestEntry } from '@manifest/manifest.types';

import type {
  SyncOperationResult,
  SyncPlan,
  SyncPlanEntry,
  SyncResult,
} from './engine.types';
import { insertMarker, writeDirectorySentinel } from './markers';
import { assertSafeProviderMutationPath } from './provider-path-safety';

interface ExecuteSyncPlanDependencies {
  beforeFirstMutation?: () => Promise<void>;
}

const DEFAULT_EXECUTE_SYNC_PLAN_DEPENDENCIES: ExecuteSyncPlanDependencies = {};

function mutatesProviderPath(entry: SyncPlanEntry): boolean {
  return entry.operation !== 'skip' && entry.operation !== 'detach';
}

function operationEvidence(
  scope: SyncPlan['scope'],
  entry: SyncPlanEntry,
  status: SyncOperationResult['status'],
  failure?: string,
): SyncOperationResult {
  return {
    scope,
    provider: entry.provider,
    contentKind: entry.canonical.type,
    asset: entry.canonical.name,
    action: entry.operation,
    status,
    ...(failure ? { failure } : {}),
  };
}

function classifyFailure(
  error: unknown,
): Pick<SyncOperationResult, 'status' | 'failure'> {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  ) {
    return {
      status: 'missing',
      failure:
        'Canonical or provider input was missing; restore it and retry sync.',
    };
  }
  return {
    status: 'failed',
    failure:
      'Operation failed; inspect local verbose diagnostics and retry sync.',
  };
}

async function assertSafeEntryProviderPath(
  entry: SyncPlanEntry,
): Promise<void> {
  const scopeRoot = inferScopeRoot(resolve(entry.canonical.canonicalPath));
  await assertSafeProviderMutationPath(scopeRoot, entry.providerPath);
}

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
      ? entry.renderedContent !== undefined
        ? computeStringHash(entry.renderedContent)
        : await computeContentHash(
            resolve(entry.canonical.canonicalPath),
            entry.canonical.isFile,
          )
      : null;

  return {
    canonicalPath,
    providerPath,
    provider: entry.provider,
    contentType: entry.canonical.type,
    strategy,
    contentHash,
    isFile: entry.canonical.isFile,
    lastSynced: new Date().toISOString(),
  };
}

function markerFileNameForEntry(entry: SyncPlanEntry): string {
  if (entry.canonical.isFile) {
    throw new Error(
      'Directory marker filenames are only valid for copied directory entries.',
    );
  }

  // Rules are file-based, so only agent and skill directory copies reach here.
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
        undefined,
        planEntry.canonical.isFile,
      );
      const manifestEntry = await toManifestEntry(planEntry, strategyUsed);
      return addEntry(manifest, manifestEntry);
    }
    case 'create_copy':
    case 'update_copy': {
      if (planEntry.operation === 'update_copy') {
        await rm(planEntry.providerPath, { recursive: true, force: true });
      }
      if (
        planEntry.canonical.isFile &&
        planEntry.renderedContent !== undefined
      ) {
        await mkdir(dirname(planEntry.providerPath), { recursive: true });
        await writeFile(
          planEntry.providerPath,
          planEntry.renderedContent,
          'utf8',
        );
      } else if (planEntry.canonical.isFile) {
        await copySingleFile(
          planEntry.canonical.canonicalPath,
          planEntry.providerPath,
        );
      } else {
        await copyDirectory(
          planEntry.canonical.canonicalPath,
          planEntry.providerPath,
        );
        await applyCopyMarker(planEntry);
      }
      const manifestEntry = await toManifestEntry(planEntry, 'copy');
      return addEntry(manifest, manifestEntry);
    }
    case 'remove': {
      await rm(planEntry.providerPath, { recursive: true, force: true });
      const { canonicalPath } = resolveManifestPaths(planEntry);
      return removeEntry(manifest, canonicalPath, planEntry.provider);
    }
    case 'detach': {
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

async function ensureSkipEntryManaged(
  planEntry: SyncPlanEntry,
  manifest: Manifest,
): Promise<Manifest> {
  const { canonicalPath } = resolveManifestPaths(planEntry);
  const existing = findEntry(manifest, canonicalPath, planEntry.provider);
  if (existing) {
    return manifest;
  }

  const manifestEntry = await toManifestEntry(planEntry, planEntry.strategy);
  return addEntry(manifest, manifestEntry);
}

export async function executeSyncPlan(
  plan: SyncPlan,
  manifest: Manifest,
  manifestPath: string,
  dependencies: ExecuteSyncPlanDependencies = DEFAULT_EXECUTE_SYNC_PLAN_DEPENDENCIES,
): Promise<SyncResult> {
  let nextManifest = manifest;
  let beforeFirstMutationCalled = false;
  const operationResults: SyncOperationResult[] = [];
  const operations = [...plan.entries, ...plan.removals];

  for (const operation of operations) {
    if (mutatesProviderPath(operation)) {
      await assertSafeEntryProviderPath(operation);
    }
  }

  for (const operation of operations) {
    if (operation.operation === 'skip') {
      nextManifest = await ensureSkipEntryManaged(operation, nextManifest);
      operationResults.push(
        operationEvidence(plan.scope, operation, 'current'),
      );
      continue;
    }

    try {
      if (mutatesProviderPath(operation)) {
        if (!beforeFirstMutationCalled) {
          beforeFirstMutationCalled = true;
          await dependencies.beforeFirstMutation?.();
        }
        await assertSafeEntryProviderPath(operation);
      }
      nextManifest = await applyEntry(operation, nextManifest);
      operationResults.push(
        operationEvidence(plan.scope, operation, 'changed'),
      );
    } catch (error) {
      const failure = classifyFailure(error);
      operationResults.push(
        operationEvidence(
          plan.scope,
          operation,
          failure.status,
          failure.failure,
        ),
      );
    }
  }

  await saveManifest(manifestPath, nextManifest);
  return {
    applied: operationResults.filter(({ status }) => status === 'changed')
      .length,
    failed: operationResults.filter(
      ({ status }) => status === 'failed' || status === 'missing',
    ).length,
    skipped: operationResults.filter(({ status }) => status === 'current')
      .length,
    operations: operationResults,
  };
}
