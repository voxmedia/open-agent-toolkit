import { access, lstat, readlink } from 'node:fs/promises';
import { basename, dirname, join, normalize, resolve } from 'node:path';
import type { SyncConfig } from '../config/sync-config';
import { computeDirectoryHash } from '../manifest/hash';
import { findEntry } from '../manifest/manager';
import type { Manifest, ManifestEntry } from '../manifest/manifest.types';
import type { ProviderAdapter } from '../providers/shared/adapter.types';
import { getSyncMappings } from '../providers/shared/adapter.utils';
import type { ContentType } from '../shared/types';
import type {
  EngineScope,
  RemovalSyncPlanEntry,
  SyncPlan,
  SyncPlanEntry,
} from './engine.types';
import type { CanonicalEntry } from './scanner';

interface ComputeSyncPlanArgs {
  canonical: CanonicalEntry[];
  adapters: ProviderAdapter[];
  manifest: Manifest;
  scope: EngineScope;
  config: SyncConfig;
  scopeRoot?: string;
}

function buildUpLevels(depth: number): string[] {
  return Array.from({ length: depth }, () => '..');
}

function segmentDepth(relativePath: string): number {
  const normalized = relativePath.replaceAll('\\', '/');
  return normalized.split('/').filter(Boolean).length;
}

function canonicalRelativePath(entry: CanonicalEntry): string {
  return join(
    '.agents',
    entry.type === 'skill' ? 'skills' : 'agents',
    entry.name,
  );
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
): 'symlink' | 'copy' | null {
  const providerConfig = config.providers[adapter.name];
  if (providerConfig?.enabled === false) {
    return null;
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
  return {
    canonical: {
      name: basename(canonicalRelative),
      type: manifestEntry.contentType,
      canonicalPath: resolve(scopeRoot, canonicalRelative),
    },
    provider: manifestEntry.provider,
    providerPath: resolve(scopeRoot, manifestEntry.providerPath),
    operation: 'remove',
    strategy: manifestEntry.strategy,
    reason: 'canonical entry no longer exists',
  };
}

async function classifyOperation(
  canonicalEntry: CanonicalEntry,
  providerPath: string,
  strategy: 'symlink' | 'copy',
): Promise<Pick<SyncPlanEntry, 'operation' | 'reason'>> {
  if (strategy === 'symlink') {
    let stat: Awaited<ReturnType<typeof lstat>>;
    try {
      stat = await lstat(providerPath);
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

    if (!stat.isSymbolicLink()) {
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

  const canonicalHash = await computeDirectoryHash(
    canonicalEntry.canonicalPath,
  );
  const providerHash = await computeDirectoryHash(providerPath);

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

export async function computeSyncPlan({
  canonical,
  adapters,
  manifest,
  scope,
  config,
  scopeRoot: explicitScopeRoot,
}: ComputeSyncPlanArgs): Promise<SyncPlan> {
  const entries: SyncPlanEntry[] = [];
  const removals: RemovalSyncPlanEntry[] = [];
  const scopeRoot = resolveScopeRoot(canonical, explicitScopeRoot);
  const seenCanonicalKeys = new Set<string>();
  const activeProviderNames = new Set<string>();

  for (const adapter of adapters) {
    const strategy = resolveStrategy(adapter, config);
    if (!strategy) {
      continue;
    }

    activeProviderNames.add(adapter.name);

    for (const mapping of getSyncMappings(adapter, scope)) {
      for (const canonicalEntry of canonical) {
        if (!entryContentTypeMatches(canonicalEntry, mapping.contentType)) {
          continue;
        }

        const relativeCanonicalPath = canonicalRelativePath(canonicalEntry);
        if (!entryInsideMapping(canonicalEntry, mapping.canonicalDir)) {
          continue;
        }

        const entryScopeRoot = scopeRoot
          ? scopeRoot
          : resolveScopeRootFromCanonical(
              canonicalEntry,
              relativeCanonicalPath,
            );
        const providerPath = resolve(
          entryScopeRoot,
          mapping.providerDir,
          canonicalEntry.name,
        );

        const manifestEntry = findEntry(
          manifest,
          normalize(relativeCanonicalPath),
          adapter.name,
        );

        const operation = await classifyOperation(
          canonicalEntry,
          providerPath,
          manifestEntry?.strategy ?? strategy,
        );

        entries.push({
          canonical: canonicalEntry,
          provider: adapter.name,
          providerPath,
          operation: operation.operation,
          strategy: manifestEntry?.strategy ?? strategy,
          reason: operation.reason,
        });

        seenCanonicalKeys.add(
          `${normalize(relativeCanonicalPath)}::${adapter.name}`,
        );
      }
    }
  }

  if (!scopeRoot) {
    return { scope, entries, removals };
  }

  for (const manifestEntry of manifest.entries) {
    if (!activeProviderNames.has(manifestEntry.provider)) {
      continue;
    }

    if (scope === 'user' && manifestEntry.contentType === 'agent') {
      continue;
    }

    const canonicalKey = `${normalize(manifestEntry.canonicalPath)}::${manifestEntry.provider}`;
    if (seenCanonicalKeys.has(canonicalKey)) {
      continue;
    }

    removals.push(createRemovalEntry(manifestEntry, scopeRoot));
  }

  return { scope, entries, removals };
}
