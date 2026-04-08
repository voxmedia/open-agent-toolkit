import { lstat, readFile, readlink, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { computeContentHash, computeStringHash } from '@manifest/hash';
import type { ManifestEntry } from '@manifest/manifest.types';

import type { DriftReport } from './drift.types';

export interface CopyTransform {
  transformCanonical: (content: string, canonicalPath: string) => string;
}

function createReport(
  entry: ManifestEntry,
  state: DriftReport['state'],
): DriftReport {
  return {
    canonical: entry.canonicalPath,
    provider: entry.provider,
    providerPath: entry.providerPath,
    state,
  };
}

export async function detectDrift(
  entry: ManifestEntry,
  scopeRoot: string,
  copyTransform?: CopyTransform,
): Promise<DriftReport> {
  const providerPath = resolve(scopeRoot, entry.providerPath);
  const canonicalPath = resolve(scopeRoot, entry.canonicalPath);

  // Missing check must run first, before strategy-specific branches.
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
      return createReport(entry, { status: 'missing' });
    }
    throw error;
  }

  if (entry.strategy === 'symlink') {
    if (!providerStat.isSymbolicLink()) {
      return createReport(entry, {
        status: 'drifted',
        reason: 'replaced',
      });
    }

    const linkTarget = await readlink(providerPath);
    const resolvedTarget = resolve(dirname(providerPath), linkTarget);

    try {
      await stat(resolvedTarget);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return createReport(entry, {
          status: 'drifted',
          reason: 'broken',
        });
      }
      throw error;
    }

    if (resolvedTarget !== canonicalPath) {
      return createReport(entry, {
        status: 'drifted',
        reason: 'replaced',
      });
    }

    return createReport(entry, { status: 'in_sync' });
  }

  const currentHash = await computeContentHash(providerPath, entry.isFile);
  if (entry.contentHash === currentHash) {
    return createReport(entry, { status: 'in_sync' });
  }

  // When the manifest hash is stale (e.g. frontmatter-only edits to the
  // canonical source that don't change the rendered output), re-derive the
  // expected provider content from the current canonical + transform and
  // compare that instead.
  if (copyTransform && entry.isFile) {
    const canonicalContent = await readFile(canonicalPath, 'utf8');
    const rendered = copyTransform.transformCanonical(
      canonicalContent,
      entry.canonicalPath,
    );
    if (computeStringHash(rendered) === currentHash) {
      return createReport(entry, { status: 'in_sync' });
    }
  }

  return createReport(entry, {
    status: 'drifted',
    reason: 'modified',
  });
}
