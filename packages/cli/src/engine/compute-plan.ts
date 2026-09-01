import { createHash } from 'node:crypto';
import {
  access,
  lstat,
  readdir,
  readFile,
  readlink,
  stat,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  join,
  normalize,
  relative,
  resolve,
} from 'node:path';

import type { SyncConfig } from '@config/sync-config';
import { computeContentHash, computeStringHash } from '@manifest/hash';
import { findEntry } from '@manifest/manager';
import type {
  Manifest,
  ManifestEntry,
  ManifestEntryV2,
  ManifestV2,
} from '@manifest/manifest.types';
import type {
  PathMapping,
  ProviderAdapter,
} from '@providers/shared/adapter.types';
import { getSyncMappings } from '@providers/shared/adapter.utils';
import type { ContentType } from '@shared/types';

import { proveCollectionIdentity } from './collection-sync';
import type {
  CollectionProjectionPlan,
  EngineScope,
  RemovalSyncPlanEntry,
  SyncPlan,
  SyncPlanEntry,
} from './engine.types';
import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from './markers';
import { assertSafeProviderMutationPath } from './provider-path-safety';
import type { CanonicalEntry } from './scanner';

interface ComputeSyncPlanArgs {
  canonical: CanonicalEntry[];
  adapters: ProviderAdapter[];
  manifest: Manifest;
  scope: EngineScope;
  config: SyncConfig;
  scopeRoot?: string;
  allowedCanonicalPaths?: string[];
  extensionOwnedCanonicalPathsByProvider?: Readonly<
    Record<string, readonly string[]>
  >;
}

function buildUpLevels(depth: number): string[] {
  return Array.from({ length: depth }, () => '..');
}

function segmentDepth(relativePath: string): number {
  const normalized = relativePath.replaceAll('\\', '/');
  return normalized.split('/').filter(Boolean).length;
}

function canonicalDirectoryName(contentType: CanonicalEntry['type']): string {
  if (contentType === 'skill') {
    return 'skills';
  }
  if (contentType === 'agent') {
    return 'agents';
  }
  return 'rules';
}

function canonicalRelativePath(entry: CanonicalEntry): string {
  return join('.agents', canonicalDirectoryName(entry.type), entry.name);
}

function providerEntryName(
  entry: CanonicalEntry,
  providerExtension?: string,
): string {
  if (!providerExtension || !entry.isFile) {
    return entry.name;
  }

  return entry.name.replace(/\.md$/, providerExtension);
}

function resolveScopeRootFromCanonical(
  entry: CanonicalEntry,
  relativeCanonicalPath: string,
): string {
  const depth = segmentDepth(relativeCanonicalPath);
  return resolve(entry.canonicalPath, ...buildUpLevels(depth));
}

function entryInsideMapping(
  entry: CanonicalEntry,
  mappingCanonicalDir: string,
): boolean {
  const relativeCanonicalPath = canonicalRelativePath(entry).replaceAll(
    '\\',
    '/',
  );
  const normalizedMappingCanonicalDir = mappingCanonicalDir.replaceAll(
    '\\',
    '/',
  );
  return (
    relativeCanonicalPath === normalizedMappingCanonicalDir ||
    relativeCanonicalPath.startsWith(`${normalizedMappingCanonicalDir}/`)
  );
}

function resolveStrategy(
  adapter: ProviderAdapter,
  config: SyncConfig,
  transformCanonical?: boolean,
): 'symlink' | 'copy' | null {
  const providerConfig = config.providers[adapter.name];
  if (providerConfig?.enabled === false) {
    return null;
  }

  if (transformCanonical) {
    return 'copy';
  }

  const configuredStrategy =
    providerConfig?.strategy ??
    config.defaultStrategy ??
    adapter.defaultStrategy;

  if (configuredStrategy === 'copy') {
    return 'copy';
  }

  if (configuredStrategy === 'symlink') {
    return 'symlink';
  }

  // Auto resolves to symlink at planning time; executeSyncPlan handles
  // platform fallback to copy when symlink creation is unsupported.
  if (adapter.defaultStrategy === 'copy') {
    return 'copy';
  }

  return 'symlink';
}

function resolveConfiguredStrategy(
  adapter: ProviderAdapter,
  config: SyncConfig,
): 'auto' | 'symlink' | 'copy' | null {
  const providerConfig = config.providers[adapter.name];
  if (providerConfig?.enabled === false) {
    return null;
  }

  return (
    providerConfig?.strategy ??
    config.defaultStrategy ??
    adapter.defaultStrategy
  );
}

function relativeManifestPath(scopeRoot: string, path: string): string {
  return relative(scopeRoot, path).replaceAll('\\', '/');
}

function collectionFallbackReason(
  reason: CollectionIdentityProofReason,
): string {
  if (reason === 'real-directory') {
    return 'provider collection is a real directory; use per-entry sync';
  }
  return `collection identity is ${reason}; preserve the provider collection without child mutation`;
}

type CollectionIdentityProofReason = Extract<
  CollectionProjectionPlan['proof'],
  { status: 'ineligible' }
>['reason'];

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function createRemovalEntry(
  manifestEntry: ManifestEntry,
  scopeRoot: string,
): RemovalSyncPlanEntry {
  const canonicalRelative = manifestEntry.canonicalPath;
  const name = basename(canonicalRelative);
  return {
    canonical: {
      name,
      type: manifestEntry.contentType,
      canonicalPath: resolve(scopeRoot, canonicalRelative),
      isFile: manifestEntry.isFile,
    },
    provider: manifestEntry.provider,
    providerPath: resolve(scopeRoot, manifestEntry.providerPath),
    operation: 'remove',
    strategy: manifestEntry.strategy,
    reason: 'canonical entry no longer exists',
  };
}

function createRetirementEntry(
  manifestEntry: ManifestEntry,
  scopeRoot: string,
  operation: RemovalSyncPlanEntry['operation'],
  reason: string,
): RemovalSyncPlanEntry {
  return {
    ...createRemovalEntry(manifestEntry, scopeRoot),
    operation,
    reason,
  };
}

function createCollectionDetachmentEntry(
  manifestEntry: ManifestEntryV2,
  scopeRoot: string,
): RemovalSyncPlanEntry {
  const canonicalRelative = manifestEntry.canonicalPath;
  return {
    canonical: {
      name: basename(canonicalRelative),
      type: manifestEntry.contentType,
      canonicalPath: resolve(scopeRoot, canonicalRelative),
      isFile: manifestEntry.isFile,
    },
    provider: manifestEntry.provider,
    providerPath: resolve(scopeRoot, manifestEntry.providerPath),
    operation: 'detach',
    strategy: 'symlink',
    reason: 'collection inheritance no longer includes canonical entry',
  };
}

function manifestEntryInsideMapping(
  entry: ManifestEntry,
  mapping: PathMapping,
): boolean {
  if (entry.contentType !== mapping.contentType) {
    return false;
  }

  const canonicalPath = normalize(entry.canonicalPath).replaceAll('\\', '/');
  const canonicalDir = normalize(mapping.canonicalDir).replaceAll('\\', '/');
  return (
    canonicalPath === canonicalDir ||
    canonicalPath.startsWith(`${canonicalDir}/`)
  );
}

async function computeManagedDirectoryCopyHash(
  providerPath: string,
  canonicalPath: string,
  contentType: ManifestEntry['contentType'],
): Promise<string | null> {
  const expectedMarker = `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
  const sentinelPath = join(providerPath, OAT_DIRECTORY_SENTINEL);

  try {
    const sentinel = await readFile(sentinelPath, 'utf8');
    if (sentinel !== `${expectedMarker}\n`) {
      return null;
    }
  } catch {
    return null;
  }

  const files: string[] = [];
  async function collectFiles(current: string): Promise<boolean> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (fullPath === sentinelPath) {
        continue;
      }
      if (entry.isDirectory()) {
        if (!(await collectFiles(fullPath))) {
          return false;
        }
        continue;
      }
      if (!entry.isFile()) {
        return false;
      }
      files.push(fullPath);
    }
    return true;
  }

  try {
    if (!(await collectFiles(providerPath))) {
      return null;
    }

    files.sort((left, right) =>
      relative(providerPath, left).localeCompare(relative(providerPath, right)),
    );

    const markerFileName =
      contentType === 'skill'
        ? 'SKILL.md'
        : contentType === 'agent'
          ? 'AGENT.md'
          : null;
    const markerPath = markerFileName
      ? join(providerPath, markerFileName)
      : null;
    const hash = createHash('sha256');

    for (const file of files) {
      const relativePath = relative(providerPath, file);
      let content = await readFile(file);
      if (file === markerPath) {
        const markerPrefix = Buffer.from(`${expectedMarker}\n`);
        if (
          content.length < markerPrefix.length ||
          !content.subarray(0, markerPrefix.length).equals(markerPrefix)
        ) {
          return null;
        }
        content = content.subarray(markerPrefix.length);
      }
      hash.update(relativePath);
      hash.update('\0');
      hash.update(content);
      hash.update('\0');
    }

    return hash.digest('hex');
  } catch {
    return null;
  }
}

export async function classifyObsoleteMappingRetirement(
  manifestEntry: ManifestEntry,
  scopeRoot: string,
): Promise<RemovalSyncPlanEntry> {
  const providerPath = resolve(scopeRoot, manifestEntry.providerPath);
  const canonicalPath = resolve(scopeRoot, manifestEntry.canonicalPath);
  let providerStat: Awaited<ReturnType<typeof lstat>>;

  try {
    providerStat = await lstat(providerPath);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return createRetirementEntry(
        manifestEntry,
        scopeRoot,
        'detach',
        'obsolete mapping provider path is missing; detach manifest ownership',
      );
    }

    return createRetirementEntry(
      manifestEntry,
      scopeRoot,
      'detach',
      'obsolete mapping provider path is unverified; preserve and detach manifest ownership',
    );
  }

  if (manifestEntry.strategy === 'symlink') {
    if (providerStat.isSymbolicLink()) {
      try {
        const linkTarget = await readlink(providerPath);
        const resolvedTarget = resolve(dirname(providerPath), linkTarget);
        await stat(resolvedTarget);
        if (resolvedTarget === canonicalPath) {
          return createRetirementEntry(
            manifestEntry,
            scopeRoot,
            'remove',
            'obsolete mapping has verified clean managed symlink',
          );
        }
      } catch {
        // Broken or unreadable links are preserved and detached below.
      }
    }

    return createRetirementEntry(
      manifestEntry,
      scopeRoot,
      'detach',
      'obsolete mapping provider path is changed or unverified; preserve and detach manifest ownership',
    );
  }

  const expectedTypeMatches = manifestEntry.isFile
    ? providerStat.isFile()
    : providerStat.isDirectory();
  if (expectedTypeMatches && manifestEntry.contentHash) {
    try {
      const currentHash = await computeContentHash(
        providerPath,
        manifestEntry.isFile,
      );
      if (currentHash === manifestEntry.contentHash) {
        return createRetirementEntry(
          manifestEntry,
          scopeRoot,
          'remove',
          'obsolete mapping has verified clean managed copy',
        );
      }
    } catch {
      // Hash failures are unverified and therefore non-destructive.
    }

    if (!manifestEntry.isFile) {
      const managedHash = await computeManagedDirectoryCopyHash(
        providerPath,
        canonicalPath,
        manifestEntry.contentType,
      );
      if (managedHash === manifestEntry.contentHash) {
        return createRetirementEntry(
          manifestEntry,
          scopeRoot,
          'remove',
          'obsolete mapping has verified clean managed copy',
        );
      }
    }
  }

  return createRetirementEntry(
    manifestEntry,
    scopeRoot,
    'detach',
    'obsolete mapping provider path is changed or unverified; preserve and detach manifest ownership',
  );
}

async function classifyOperation(
  canonicalEntry: CanonicalEntry,
  providerPath: string,
  strategy: 'symlink' | 'copy',
  renderedContent?: string,
): Promise<Pick<SyncPlanEntry, 'operation' | 'reason'>> {
  if (strategy === 'symlink') {
    let providerStat: Awaited<ReturnType<typeof lstat>>;
    try {
      providerStat = await lstat(providerPath);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return {
          operation: 'create_symlink',
          reason: 'provider path does not exist',
        };
      }
      throw error;
    }

    if (!providerStat.isSymbolicLink()) {
      return {
        operation: 'update_symlink',
        reason: 'provider path is not a symlink',
      };
    }

    const linkTarget = await readlink(providerPath);
    const resolvedTarget = resolve(dirname(providerPath), linkTarget);
    const canonicalPath = resolve(canonicalEntry.canonicalPath);
    const targetExists = await pathExists(resolvedTarget);

    if (!targetExists) {
      return {
        operation: 'update_symlink',
        reason: 'symlink target is missing',
      };
    }

    if (resolvedTarget !== canonicalPath) {
      return {
        operation: 'update_symlink',
        reason: 'symlink target differs from canonical path',
      };
    }

    return {
      operation: 'skip',
      reason: 'already in sync',
    };
  }

  const exists = await pathExists(providerPath);
  if (!exists) {
    return {
      operation: 'create_copy',
      reason: 'provider path does not exist',
    };
  }

  const canonicalHash =
    renderedContent !== undefined
      ? computeStringHash(renderedContent)
      : await computeContentHash(
          canonicalEntry.canonicalPath,
          canonicalEntry.isFile,
        );
  const providerHash = await computeContentHash(
    providerPath,
    canonicalEntry.isFile,
  );

  if (canonicalHash === providerHash) {
    return {
      operation: 'skip',
      reason: 'already in sync',
    };
  }

  return {
    operation: 'update_copy',
    reason: 'copied content differs from canonical content',
  };
}

function resolveScopeRoot(
  canonical: CanonicalEntry[],
  explicitScopeRoot?: string,
): string | null {
  if (explicitScopeRoot) {
    return resolve(explicitScopeRoot);
  }

  const firstEntry = canonical[0];
  if (!firstEntry) {
    return null;
  }

  return resolveScopeRootFromCanonical(
    firstEntry,
    canonicalRelativePath(firstEntry),
  );
}

function entryContentTypeMatches(
  entry: CanonicalEntry,
  contentType: ContentType,
): boolean {
  return entry.type === contentType;
}

function canonicalPathAllowed(
  relativeCanonicalPath: string,
  canonicalFilter: Set<string> | null,
): boolean {
  if (!canonicalFilter) {
    return true;
  }

  return canonicalFilter.has(normalize(relativeCanonicalPath));
}

export async function computeSyncPlan({
  canonical,
  adapters,
  manifest,
  scope,
  config,
  scopeRoot: explicitScopeRoot,
  allowedCanonicalPaths,
  extensionOwnedCanonicalPathsByProvider,
}: ComputeSyncPlanArgs): Promise<SyncPlan> {
  const entries: SyncPlanEntry[] = [];
  const removals: RemovalSyncPlanEntry[] = [];
  const collections: CollectionProjectionPlan[] = [];
  const scopeRoot = resolveScopeRoot(canonical, explicitScopeRoot);
  const seenCanonicalKeys = new Set<string>();
  const activeProviderNames = new Set<string>();
  const activeMappingsByProvider = new Map<string, PathMapping[]>();
  const manifestV2 = manifest as unknown as ManifestV2;
  const canonicalFilter = allowedCanonicalPaths
    ? new Set(
        allowedCanonicalPaths.map((canonicalPath) => normalize(canonicalPath)),
      )
    : null;

  for (const adapter of adapters) {
    if (resolveStrategy(adapter, config)) {
      activeProviderNames.add(adapter.name);
    }

    for (const mapping of getSyncMappings(adapter, scope)) {
      const mappingStrategy = resolveStrategy(
        adapter,
        config,
        Boolean(mapping.transformCanonical),
      );
      if (!mappingStrategy) {
        continue;
      }

      const activeMappings = activeMappingsByProvider.get(adapter.name) ?? [];
      activeMappings.push(mapping);
      activeMappingsByProvider.set(adapter.name, activeMappings);

      const configuredStrategy = resolveConfiguredStrategy(adapter, config);
      const collectionCandidates = canonical.filter((canonicalEntry) => {
        if (!entryContentTypeMatches(canonicalEntry, mapping.contentType)) {
          return false;
        }
        const relativeCanonicalPath = canonicalRelativePath(canonicalEntry);
        const extensionOwnedPaths =
          extensionOwnedCanonicalPathsByProvider?.[adapter.name] ?? [];
        return (
          !extensionOwnedPaths.some(
            (ownedPath) =>
              normalize(ownedPath) === normalize(relativeCanonicalPath),
          ) &&
          canonicalPathAllowed(relativeCanonicalPath, canonicalFilter) &&
          entryInsideMapping(canonicalEntry, mapping.canonicalDir)
        );
      });
      let inheritCollection = false;

      if (
        configuredStrategy === 'auto' &&
        adapter.defaultStrategy !== 'copy' &&
        !mapping.transformCanonical &&
        !mapping.providerExtension &&
        scopeRoot !== null &&
        collectionCandidates.length > 0
      ) {
        const canonicalDir = resolve(scopeRoot, mapping.canonicalDir);
        const providerDir = resolve(scopeRoot, mapping.providerDir);
        const proof = await proveCollectionIdentity({
          root: scopeRoot,
          canonicalDir,
          providerDir,
        });
        const existingCollection = manifest.collections.find(
          (collection) =>
            collection.provider === adapter.name &&
            collection.contentType === mapping.contentType &&
            collection.canonicalDir ===
              relativeManifestPath(scopeRoot, canonicalDir) &&
            collection.providerDir ===
              relativeManifestPath(scopeRoot, providerDir),
        );
        const inheritedEntries = collectionCandidates.map((entry) =>
          relativeManifestPath(scopeRoot, entry.canonicalPath),
        );
        const existingInheritedEntries = existingCollection
          ? manifestV2.entries
              .filter(
                (entry) =>
                  entry.strategy === 'collection' &&
                  entry.collectionId === existingCollection.id,
              )
              .map((entry) => entry.canonicalPath)
              .sort()
          : [];
        const inheritedEntriesUnchanged =
          existingCollection !== undefined &&
          existingInheritedEntries.length === inheritedEntries.length &&
          existingInheritedEntries.every(
            (entry, index) => entry === [...inheritedEntries].sort()[index],
          );

        if (proof.status === 'absent') {
          collections.push({
            provider: adapter.name,
            scope,
            contentType: mapping.contentType,
            canonicalDir,
            providerDir,
            action: 'create-collection-link',
            ownership: 'oat-created',
            configuredStrategy: 'auto',
            proof,
            inheritedEntries,
            reason: 'provider collection is absent',
          });
          inheritCollection = true;
        } else if (proof.status === 'exact-link') {
          if (!inheritedEntriesUnchanged) {
            collections.push({
              provider: adapter.name,
              scope,
              contentType: mapping.contentType,
              canonicalDir,
              providerDir,
              action:
                existingCollection === undefined
                  ? 'adopt-collection-link'
                  : 'inherit-collection',
              ownership: existingCollection?.ownership ?? 'adopted-exact',
              configuredStrategy: 'auto',
              proof,
              inheritedEntries,
              reason:
                existingCollection === undefined
                  ? 'existing collection alias exactly matches canonical target'
                  : 'owned collection alias inheritance changed',
            });
          }
          inheritCollection = true;
        } else {
          if (existingCollection !== undefined) {
            collections.push({
              provider: adapter.name,
              scope,
              contentType: mapping.contentType,
              canonicalDir,
              providerDir,
              action: 'detach-collection',
              ownership: existingCollection.ownership,
              configuredStrategy: 'auto',
              proof,
              inheritedEntries: existingInheritedEntries,
              reason:
                'owned collection alias changed or became unverifiable; preserve and detach ownership',
            });
            inheritCollection = true;
            continue;
          }
          const fallback = proof.reason === 'real-directory';
          collections.push({
            provider: adapter.name,
            scope,
            contentType: mapping.contentType,
            canonicalDir,
            providerDir,
            action: fallback ? 'fallback-per-entry' : 'reject-collection',
            ownership: 'none',
            configuredStrategy: 'auto',
            proof,
            inheritedEntries,
            reason: collectionFallbackReason(proof.reason),
          });
          inheritCollection = !fallback;
        }
      }

      if (inheritCollection) {
        for (const canonicalEntry of collectionCandidates) {
          seenCanonicalKeys.add(
            `${normalize(canonicalRelativePath(canonicalEntry))}::${adapter.name}`,
          );
        }
        continue;
      }

      for (const canonicalEntry of canonical) {
        if (!entryContentTypeMatches(canonicalEntry, mapping.contentType)) {
          continue;
        }

        const relativeCanonicalPath = canonicalRelativePath(canonicalEntry);
        const extensionOwnedPaths =
          extensionOwnedCanonicalPathsByProvider?.[adapter.name] ?? [];
        if (
          extensionOwnedPaths.some(
            (ownedPath) =>
              normalize(ownedPath) === normalize(relativeCanonicalPath),
          )
        ) {
          continue;
        }
        if (!canonicalPathAllowed(relativeCanonicalPath, canonicalFilter)) {
          continue;
        }
        if (!entryInsideMapping(canonicalEntry, mapping.canonicalDir)) {
          continue;
        }

        const renderedContent =
          mapping.transformCanonical && canonicalEntry.isFile
            ? mapping.transformCanonical(
                await readFile(canonicalEntry.canonicalPath, 'utf8'),
                relativeCanonicalPath.replaceAll('\\', '/'),
              )
            : undefined;

        const entryScopeRoot = scopeRoot
          ? scopeRoot
          : resolveScopeRootFromCanonical(
              canonicalEntry,
              relativeCanonicalPath,
            );
        const providerPath = resolve(
          entryScopeRoot,
          mapping.providerDir,
          providerEntryName(canonicalEntry, mapping.providerExtension),
        );

        const manifestEntry = findEntry(
          manifest,
          normalize(relativeCanonicalPath),
          adapter.name,
        );
        const entryStrategy = mapping.transformCanonical
          ? 'copy'
          : (manifestEntry?.strategy ?? mappingStrategy);

        await assertSafeProviderMutationPath(entryScopeRoot, providerPath);
        const operation = await classifyOperation(
          canonicalEntry,
          providerPath,
          entryStrategy,
          renderedContent,
        );

        entries.push({
          canonical: canonicalEntry,
          provider: adapter.name,
          providerPath,
          operation: operation.operation,
          strategy: entryStrategy,
          reason: operation.reason,
          renderedContent,
        });

        seenCanonicalKeys.add(
          `${normalize(relativeCanonicalPath)}::${adapter.name}`,
        );
      }
    }
  }

  if (!scopeRoot) {
    return { scope, entries, removals, collections };
  }

  for (const collection of manifest.collections) {
    if (activeProviderNames.has(collection.provider)) {
      continue;
    }
    const canonicalDir = resolve(scopeRoot, collection.canonicalDir);
    const providerDir = resolve(scopeRoot, collection.providerDir);
    const proof = await proveCollectionIdentity({
      root: scopeRoot,
      canonicalDir,
      providerDir,
    });
    collections.push({
      provider: collection.provider,
      scope,
      contentType: collection.contentType,
      canonicalDir,
      providerDir,
      action: 'detach-collection',
      ownership: collection.ownership,
      configuredStrategy: 'auto',
      proof,
      inheritedEntries: manifestV2.entries
        .filter(
          (entry) =>
            entry.strategy === 'collection' &&
            entry.collectionId === collection.id,
        )
        .map((entry) => entry.canonicalPath),
      reason: 'provider is disabled; reconcile collection ownership',
    });
  }

  for (const manifestEntry of manifestV2.entries) {
    if (manifestEntry.strategy === 'collection') {
      if (!activeProviderNames.has(manifestEntry.provider)) {
        continue;
      }
      const canonicalKey = `${normalize(manifestEntry.canonicalPath)}::${manifestEntry.provider}`;
      if (!seenCanonicalKeys.has(canonicalKey)) {
        removals.push(
          createCollectionDetachmentEntry(manifestEntry, scopeRoot),
        );
      }
      continue;
    }
    if (!activeProviderNames.has(manifestEntry.provider)) {
      continue;
    }

    const perEntryManifestEntry = manifestEntry as ManifestEntry;

    const canonicalKey = `${normalize(manifestEntry.canonicalPath)}::${manifestEntry.provider}`;
    if (seenCanonicalKeys.has(canonicalKey)) {
      continue;
    }
    if (
      canonicalFilter &&
      !canonicalFilter.has(normalize(manifestEntry.canonicalPath))
    ) {
      continue;
    }

    const mappingStillExists = (
      activeMappingsByProvider.get(manifestEntry.provider) ?? []
    ).some((mapping) =>
      manifestEntryInsideMapping(perEntryManifestEntry, mapping),
    );

    const removal = mappingStillExists
      ? createRemovalEntry(perEntryManifestEntry, scopeRoot)
      : await classifyObsoleteMappingRetirement(
          perEntryManifestEntry,
          scopeRoot,
        );
    if (removal.operation === 'remove') {
      await assertSafeProviderMutationPath(scopeRoot, removal.providerPath);
    }
    removals.push(removal);
  }

  return { scope, entries, removals, collections };
}
