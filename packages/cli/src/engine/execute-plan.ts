import { mkdir, readlink, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import {
  copyDirectory,
  copySingleFile,
  createCollectionSymlinkNoClobber,
  createSymlink,
  removeCollectionSymlinkIfUnchanged,
  type CreatedCollectionSymlink,
} from '@fs/io';
import { computeContentHash, computeStringHash } from '@manifest/hash';
import { saveManifest as persistManifest } from '@manifest/manager';
import type {
  Manifest,
  ManifestEntry,
  ManifestV2,
} from '@manifest/manifest.types';

import {
  collectionProofMatches,
  projectCollectionOwnership,
  proveCollectionIdentity,
} from './collection-sync';
import type {
  CollectionProjectionPlan,
  SyncOperationResult,
  SyncPlan,
  SyncPlanEntry,
  SyncResult,
} from './engine.types';
import { insertMarker, writeDirectorySentinel } from './markers';
import { assertSafeProviderMutationPath } from './provider-path-safety';

interface ExecuteSyncPlanDependencies {
  beforeFirstMutation?: () => Promise<void>;
  saveManifest?: typeof persistManifest;
  createCollectionSymlinkNoClobber?: typeof createCollectionSymlinkNoClobber;
  removeCollectionSymlinkIfUnchanged?: typeof removeCollectionSymlinkIfUnchanged;
  proveCollectionIdentity?: typeof proveCollectionIdentity;
}

const DEFAULT_EXECUTE_SYNC_PLAN_DEPENDENCIES: ExecuteSyncPlanDependencies = {};

export interface CollectionOperationResult {
  provider: string;
  contentType: CollectionProjectionPlan['contentType'];
  action: CollectionProjectionPlan['action'];
  ownership: CollectionProjectionPlan['ownership'];
  status:
    | 'changed'
    | 'current'
    | 'fallback'
    | 'rejected'
    | 'failed'
    | 'partial';
  reason: string;
}

export type CollectionSyncResult = SyncResult & {
  collectionResults: CollectionOperationResult[];
};

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
  manifest: ManifestV2,
): Promise<ManifestV2> {
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
      return addManifestEntry(manifest, manifestEntry);
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
      return addManifestEntry(manifest, manifestEntry);
    }
    case 'remove': {
      await rm(planEntry.providerPath, { recursive: true, force: true });
      const { canonicalPath } = resolveManifestPaths(planEntry);
      return removeManifestEntry(manifest, canonicalPath, planEntry.provider);
    }
    case 'detach': {
      const { canonicalPath } = resolveManifestPaths(planEntry);
      return removeManifestEntry(manifest, canonicalPath, planEntry.provider);
    }
    case 'skip': {
      return manifest;
    }
    default:
      return manifest;
  }
}

function addManifestEntry(
  manifest: ManifestV2,
  entry: ManifestEntry,
): ManifestV2 {
  return {
    ...manifest,
    entries: [
      ...manifest.entries.filter(
        (candidate) =>
          !(
            candidate.canonicalPath === entry.canonicalPath &&
            candidate.provider === entry.provider
          ),
      ),
      entry,
    ],
    lastUpdated: new Date().toISOString(),
  };
}

function removeManifestEntry(
  manifest: ManifestV2,
  canonicalPath: string,
  provider: string,
): ManifestV2 {
  const entries = manifest.entries.filter(
    (entry) =>
      !(entry.canonicalPath === canonicalPath && entry.provider === provider),
  );
  return entries.length === manifest.entries.length
    ? manifest
    : { ...manifest, entries, lastUpdated: new Date().toISOString() };
}

async function ensureSkipEntryManaged(
  planEntry: SyncPlanEntry,
  manifest: ManifestV2,
): Promise<ManifestV2> {
  const { canonicalPath } = resolveManifestPaths(planEntry);
  const existing = manifest.entries.find(
    (entry) =>
      entry.canonicalPath === canonicalPath &&
      entry.provider === planEntry.provider,
  );
  if (existing) {
    return manifest;
  }

  const manifestEntry = await toManifestEntry(planEntry, planEntry.strategy);
  return addManifestEntry(manifest, manifestEntry);
}

interface CreatedCollection {
  plan: CollectionProjectionPlan;
  created: CreatedCollectionSymlink;
}

function detachCollectionOwnership(
  manifest: ManifestV2,
  plan: CollectionProjectionPlan,
): ManifestV2 {
  const scopeRoot = inferScopeRoot(plan.canonicalDir);
  const canonicalDir = relative(scopeRoot, plan.canonicalDir).replaceAll(
    '\\',
    '/',
  );
  const providerDir = relative(scopeRoot, plan.providerDir).replaceAll(
    '\\',
    '/',
  );
  const detachedIds = new Set(
    manifest.collections
      .filter(
        (collection) =>
          collection.provider === plan.provider &&
          collection.contentType === plan.contentType &&
          collection.canonicalDir === canonicalDir &&
          collection.providerDir === providerDir,
      )
      .map(({ id }) => id),
  );
  if (detachedIds.size === 0) {
    return manifest;
  }

  return {
    ...manifest,
    collections: manifest.collections.filter(({ id }) => !detachedIds.has(id)),
    entries: manifest.entries.filter(
      (entry) =>
        entry.strategy !== 'collection' ||
        entry.collectionId === undefined ||
        !detachedIds.has(entry.collectionId),
    ),
    lastUpdated: new Date().toISOString(),
  };
}

async function executeCollectionTransaction(
  plans: readonly CollectionProjectionPlan[],
  manifest: ManifestV2,
  dependencies: Required<
    Pick<
      ExecuteSyncPlanDependencies,
      | 'saveManifest'
      | 'createCollectionSymlinkNoClobber'
      | 'removeCollectionSymlinkIfUnchanged'
      | 'proveCollectionIdentity'
    >
  >,
  manifestPath: string,
  beforeMutation: () => Promise<void>,
): Promise<{
  manifest: ManifestV2;
  results: CollectionOperationResult[];
  attempted: boolean;
  persisted: boolean;
}> {
  const passiveResults: CollectionOperationResult[] = plans
    .filter(
      ({ action }) =>
        action === 'fallback-per-entry' || action === 'reject-collection',
    )
    .map((plan) => ({
      provider: plan.provider,
      contentType: plan.contentType,
      action: plan.action,
      ownership: plan.ownership,
      status: plan.action === 'fallback-per-entry' ? 'fallback' : 'rejected',
      reason: plan.reason,
    }));
  const actionable = plans.filter(
    ({ action }) =>
      action === 'create-collection-link' ||
      action === 'adopt-collection-link' ||
      action === 'inherit-collection',
  );
  const detachments = plans.filter(
    ({ action }) => action === 'detach-collection',
  );
  if (actionable.length === 0 && detachments.length === 0) {
    return {
      manifest,
      results: passiveResults,
      attempted: false,
      persisted: false,
    };
  }

  const verified = new Map<
    CollectionProjectionPlan,
    Awaited<ReturnType<typeof proveCollectionIdentity>>
  >();
  for (const plan of actionable) {
    const current = await dependencies.proveCollectionIdentity({
      root: inferScopeRoot(plan.canonicalDir),
      canonicalDir: plan.canonicalDir,
      providerDir: plan.providerDir,
    });
    if (!collectionProofMatches(plan.proof, current)) {
      return {
        manifest,
        results: [
          ...passiveResults,
          ...actionable.map((candidate) => ({
            provider: candidate.provider,
            contentType: candidate.contentType,
            action: candidate.action,
            ownership: candidate.ownership,
            status: 'failed' as const,
            reason:
              candidate === plan
                ? 'collection identity changed after planning; preserved destination'
                : 'collection transaction aborted before mutation',
          })),
        ],
        attempted: true,
        persisted: false,
      };
    }
    verified.set(plan, current);
  }

  const createdCollections: CreatedCollection[] = [];
  let nextManifest = manifest;
  try {
    await beforeMutation();
    for (const plan of actionable) {
      if (plan.action === 'create-collection-link') {
        const created = await dependencies.createCollectionSymlinkNoClobber(
          plan.canonicalDir,
          plan.providerDir,
        );
        createdCollections.push({ plan, created });
        const rescanned = await dependencies.proveCollectionIdentity({
          root: inferScopeRoot(plan.canonicalDir),
          canonicalDir: plan.canonicalDir,
          providerDir: plan.providerDir,
        });
        if (rescanned.status !== 'exact-link') {
          throw new Error('created collection alias did not verify as exact');
        }
        verified.set(plan, rescanned);
      }

      const proof = verified.get(plan);
      if (proof?.status !== 'exact-link') {
        throw new Error('collection alias exact identity is unavailable');
      }
      nextManifest = await projectCollectionOwnership(
        nextManifest,
        plan,
        proof,
      );
    }

    for (const plan of detachments) {
      nextManifest = detachCollectionOwnership(nextManifest, plan);
    }

    await dependencies.saveManifest(manifestPath, nextManifest);

    const detachmentResults: CollectionOperationResult[] = [];
    for (const plan of detachments) {
      let reason = plan.reason;
      let status: CollectionOperationResult['status'] = 'changed';
      if (
        plan.ownership === 'oat-created' &&
        plan.proof.status === 'exact-link'
      ) {
        try {
          const current = await dependencies.proveCollectionIdentity({
            root: inferScopeRoot(plan.canonicalDir),
            canonicalDir: plan.canonicalDir,
            providerDir: plan.providerDir,
          });
          if (
            current.status === 'exact-link' &&
            collectionProofMatches(plan.proof, current)
          ) {
            const removed =
              await dependencies.removeCollectionSymlinkIfUnchanged(
                plan.providerDir,
                {
                  device: current.providerLink.device,
                  inode: current.providerLink.inode,
                  linkText: await readlink(plan.providerDir),
                },
              );
            if (!removed) {
              status = 'partial';
              reason =
                'collection ownership detached; alias changed during removal and was preserved';
            }
          } else {
            reason =
              'collection ownership detached; alias identity changed after planning and was preserved';
          }
        } catch {
          status = 'partial';
          reason =
            'collection ownership detached; alias removal could not be proven safe and was preserved';
        }
      }
      detachmentResults.push({
        provider: plan.provider,
        contentType: plan.contentType,
        action: plan.action,
        ownership: plan.ownership,
        status,
        reason,
      });
    }

    return {
      manifest: nextManifest,
      results: [
        ...passiveResults,
        ...actionable.map((plan) => ({
          provider: plan.provider,
          contentType: plan.contentType,
          action: plan.action,
          ownership: plan.ownership,
          status:
            plan.action === 'inherit-collection'
              ? ('current' as const)
              : ('changed' as const),
          reason: plan.reason,
        })),
        ...detachmentResults,
      ],
      attempted: true,
      persisted: true,
    };
  } catch {
    const rollback = await Promise.all(
      [...createdCollections]
        .reverse()
        .map(({ plan, created }) =>
          dependencies.removeCollectionSymlinkIfUnchanged(
            plan.providerDir,
            created,
          ),
        ),
    );
    const partial = rollback.some((removed) => !removed);
    return {
      manifest,
      results: [
        ...passiveResults,
        ...actionable.map((plan) => ({
          provider: plan.provider,
          contentType: plan.contentType,
          action: plan.action,
          ownership: plan.ownership,
          status: partial ? ('partial' as const) : ('failed' as const),
          reason: partial
            ? 'collection transaction failed and an unchanged-link rollback could not be proven'
            : 'collection transaction failed; newly created links were rolled back',
        })),
        ...detachments.map((plan) => ({
          provider: plan.provider,
          contentType: plan.contentType,
          action: plan.action,
          ownership: plan.ownership,
          status: 'failed' as const,
          reason: 'collection transaction failed before ownership detachment',
        })),
      ],
      attempted: true,
      persisted: false,
    };
  }
}

export async function executeSyncPlan(
  plan: SyncPlan,
  manifest: Manifest,
  manifestPath: string,
  dependencies: ExecuteSyncPlanDependencies = DEFAULT_EXECUTE_SYNC_PLAN_DEPENDENCIES,
): Promise<CollectionSyncResult> {
  const saveManifest = dependencies.saveManifest ?? persistManifest;
  const collectionDependencies = {
    saveManifest,
    createCollectionSymlinkNoClobber:
      dependencies.createCollectionSymlinkNoClobber ??
      createCollectionSymlinkNoClobber,
    removeCollectionSymlinkIfUnchanged:
      dependencies.removeCollectionSymlinkIfUnchanged ??
      removeCollectionSymlinkIfUnchanged,
    proveCollectionIdentity:
      dependencies.proveCollectionIdentity ?? proveCollectionIdentity,
  };
  let nextManifest: ManifestV2 = manifest;
  let beforeFirstMutationCalled = false;
  const operationResults: SyncOperationResult[] = [];
  const operations = [...plan.entries, ...plan.removals];

  const beforeMutation = async (): Promise<void> => {
    if (!beforeFirstMutationCalled) {
      beforeFirstMutationCalled = true;
      await dependencies.beforeFirstMutation?.();
    }
  };

  for (const operation of operations) {
    if (mutatesProviderPath(operation)) {
      await assertSafeEntryProviderPath(operation);
    }
  }

  const collectionTransaction = await executeCollectionTransaction(
    plan.collections ?? [],
    nextManifest,
    collectionDependencies,
    manifestPath,
    beforeMutation,
  );
  nextManifest = collectionTransaction.manifest;

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
        await beforeMutation();
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

  if (operations.length > 0 || !collectionTransaction.attempted) {
    await saveManifest(manifestPath, nextManifest);
  }
  const collectionApplied = collectionTransaction.results.filter(
    ({ status }) => status === 'changed',
  ).length;
  const collectionFailed = collectionTransaction.results.filter(
    ({ status }) =>
      status === 'failed' || status === 'partial' || status === 'rejected',
  ).length;
  const collectionSkipped = collectionTransaction.results.filter(
    ({ status }) => status === 'current' || status === 'fallback',
  ).length;
  return {
    applied:
      operationResults.filter(({ status }) => status === 'changed').length +
      collectionApplied,
    failed:
      operationResults.filter(
        ({ status }) => status === 'failed' || status === 'missing',
      ).length + collectionFailed,
    skipped:
      operationResults.filter(({ status }) => status === 'current').length +
      collectionSkipped,
    operations: operationResults,
    collectionResults: collectionTransaction.results,
  };
}
