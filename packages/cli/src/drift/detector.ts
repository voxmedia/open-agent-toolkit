import { lstat, readFile, readlink, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { proveCollectionIdentity } from '@engine/collection-sync';
import { computeManagedDirectoryCopyHash } from '@engine/managed-copy-hash';
import {
  computeContentHash,
  computeDirectoryDigests,
  computeStringHash,
} from '@manifest/hash';
import type { ManifestEntryV2 } from '@manifest/manifest.types';

import type { DriftReport } from './drift.types';

export interface CopyTransform {
  transformCanonical: (content: string, canonicalPath: string) => string;
}

function createReport(
  entry: ManifestEntryV2,
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
  entry: ManifestEntryV2,
  scopeRoot: string,
  copyTransform?: CopyTransform,
): Promise<DriftReport> {
  const providerPath = resolve(scopeRoot, entry.providerPath);
  const canonicalPath = resolve(scopeRoot, entry.canonicalPath);

  if (entry.strategy === 'collection') {
    const proof = await proveCollectionIdentity({
      root: scopeRoot,
      canonicalDir: dirname(canonicalPath),
      providerDir: dirname(providerPath),
    });
    if (proof.status === 'exact-link') {
      return createReport(entry, { status: 'in_sync' });
    }
    if (proof.status === 'absent') {
      return createReport(entry, { status: 'missing' });
    }
    return createReport(entry, {
      status: 'drifted',
      reason: proof.reason === 'broken-link' ? 'broken' : 'replaced',
    });
  }

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

  // A directory copy is decorated by the writer: `applyCopyMarker` adds the
  // `.oat-generated` sentinel and prepends the banner to SKILL.md/AGENT.md,
  // while the manifest records the undecorated canonical hash. Re-ask the
  // question with those two artifacts excluded, so a faithful copy reads
  // `in_sync` instead of permanently `modified`.
  //
  // Deliberately *not* gated on `copyTransform`: the banner and sentinel are
  // engine-owned rather than adapter-owned, and `commands/tools/info/index.ts`
  // passes no transform. Gating here would leave `oat tools info` disagreeing
  // with `oat status`. A `null` result — no sentinel, a sentinel naming a
  // different canonical path, a marker file that is absent or does not carry
  // the banner, a non-regular entry — falls through to the raw verdict below,
  // as does any other digest, so a tampered or unverifiable copy is still
  // `drifted`.
  if (!entry.isFile && entry.contentHash !== null) {
    const managedHash = await computeManagedDirectoryCopyHash(
      providerPath,
      canonicalPath,
      entry.contentType,
    );
    if (managedHash !== null) {
      if (managedHash === entry.contentHash) {
        return createReport(entry, { status: 'in_sync' });
      }

      // Pre-framing manifest bridge (wave-7 final review, Critical 4).
      // Length framing changed every directory digest, and a no-op `oat sync`
      // does not restamp an entry it already owns (`ensureSkipEntryManaged` in
      // `engine/execute-plan.ts` returns the manifest untouched for `skip`), so
      // a manifest written before the change keeps its legacy value
      // indefinitely. Without this branch every pre-existing copy-strategy
      // install would report drift that no command repairs.
      //
      // This cannot reopen the collision. It fires only when the recorded hash
      // is the legacy digest of the canonical tree, and acceptance still rests
      // entirely on the framed digests: framing is injective, so
      // `managedHash === framed` means the copy's logical content is exactly
      // the canonical file set, which the legacy digests therefore also agreed
      // on. Every input accepted here was accepted before the change too, so
      // the branch cannot widen the acceptance set. That argument needs both
      // digests to describe one canonical state, which is why
      // `computeDirectoryDigests` folds them from a single capture rather than
      // from two traversals — pairing `framed` from one state with `legacy`
      // from another would accept a view the pre-framing detector rejected.
      //
      // Any failure to read the canonical tree is treated as "cannot verify",
      // which falls through to `drifted` below.
      const canonicalDigests = await computeDirectoryDigests(
        canonicalPath,
      ).catch(() => null);
      if (
        canonicalDigests !== null &&
        entry.contentHash === canonicalDigests.legacy &&
        managedHash === canonicalDigests.framed
      ) {
        return createReport(entry, { status: 'in_sync' });
      }
    }
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
