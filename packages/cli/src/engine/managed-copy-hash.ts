import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import {
  compareDirectoryRelativePaths,
  createFramedDirectoryDigest,
  updateFramedDirectoryDigest,
} from '@manifest/hash';
import type { ManifestEntry } from '@manifest/manifest.types';

import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from './markers';

/**
 * The banner-and-sentinel-aware hash of an OAT-managed directory copy.
 *
 * When `oat sync` materializes a directory copy it deliberately decorates the
 * provider tree with two artifacts the canonical tree does not have: an
 * `.oat-generated` sentinel and a marker line prepended to `SKILL.md` /
 * `AGENT.md`. Hashing that tree raw therefore never equals the canonical hash
 * the manifest records, which is why every raw reader saw a fresh copy as
 * drifted. This module owns the comparison that accounts for both.
 *
 * Standing claims owned here (backstop: `managed-copy-hash.test.ts`):
 *
 * 1. For a faithful managed directory copy the digest returned is **equal** to
 *    `computeDirectoryHash` of the canonical directory — the same value
 *    `execute-plan.ts` writes into the manifest `contentHash`. The encoding is
 *    not merely the same shape as `manifest/hash.ts`: this module calls that
 *    module's `createFramedDirectoryDigest`, `compareDirectoryRelativePaths`
 *    and `updateFramedDirectoryDigest`, so the domain tag, the ordering and
 *    the per-field length framing cannot drift apart. That framing is what
 *    makes the digest a self-delimiting encoding of the sorted file list
 *    (wave-7 final review, Critical 4 — the header of `manifest/hash.ts`
 *    records the collision that motivated it, the cross-encoding forgery the
 *    domain tag closes, and the one-time manifest migration it forces).
 * 2. `null` is returned rather than a digest whenever the sentinel does not
 *    name exactly this canonical path — and likewise when the sentinel is
 *    absent or has trailing content, when the marker file is missing or does
 *    not start with exactly the expected banner, or when the provider tree
 *    holds any non-regular entry.
 * 3. "Non-regular entry" includes two shapes the pre-hardening helper waved
 *    through, for two different reasons: a `.oat-generated` sentinel that is a
 *    symlink (or anything other than a regular file) — it was skipped by
 *    pathname before its type was ever examined and then read through a
 *    symlink-following `readFile`; and a provider root that is a symlink
 *    rather than a real directory — the root was never type-checked before
 *    `readdir`, which traverses a symlinked directory. Both return `null`.
 *    Without this the detector and planner would newly accept a
 *    symlink-substituted provider view as `in_sync`.
 * 4. A `skill` or `agent` copy must actually contain its marker file. The
 *    banner check used to be keyed on `file === markerPath` while walking the
 *    tree, so deleting `SKILL.md` outright did not fail the check — it simply
 *    skipped it. Combined with the unframed digest that let a view drop
 *    `SKILL.md`, fuse its bytes into a surviving file, and read `in_sync`. The
 *    requirement is unconditional, so a skill directory that genuinely has no
 *    `SKILL.md` (a layout `applyCopyMarker` tolerates as best-effort) is now
 *    permanently `drifted` / `update_copy` rather than `in_sync`: the safe
 *    direction, and the direction the review asked for.
 *
 * These claims describe a quiescent tree. Every check here is path-based, so
 * none of them survives an adversary swapping an entry between the check and
 * the read — the same pre-existing limitation every other filesystem reader in
 * this package shares. The guarantee that does hold unconditionally is the
 * superset property below: each check is additive, so no interleaving lets
 * this helper accept an input the pre-hardening helper rejected.
 *
 * This module's rejection set is therefore a strict superset of the original
 * private helper's, on every consumer. `classifyObsoleteMappingRetirement`
 * inherits the stricter contract deliberately: for the symlinked-sentinel
 * shape it now classifies `detach` rather than `remove`, the safe direction
 * for a destructive path (a symlinked root was already `detach` there, because
 * `expectedTypeMatches` is computed from `lstat` before the helper runs).
 *
 * `null` means "this is not a verifiable managed copy", never "it matches".
 * Callers must fall back to their raw comparison on `null`, so an unverifiable
 * copy degrades to `drifted` / `update_copy` rather than to a false `in_sync`.
 * A tampered body still produces a digest, but a different one.
 */
export async function computeManagedDirectoryCopyHash(
  providerPath: string,
  canonicalPath: string,
  contentType: ManifestEntry['contentType'],
): Promise<string | null> {
  const expectedMarker = `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
  const sentinelPath = join(providerPath, OAT_DIRECTORY_SENTINEL);

  try {
    // The provider root must be a real directory. `lstat` does not resolve the
    // final component, so a symlink pointing at an otherwise faithful tree is
    // rejected here rather than silently traversed by `readdir`.
    const providerStat = await lstat(providerPath);
    if (!providerStat.isDirectory()) {
      return null;
    }

    // Type-check the sentinel before reading it. `readFile` follows symlinks,
    // so without this a symlink to a file holding the exact marker would
    // authenticate a tree the writer never produced.
    //
    // This is a check against the state on disk, not a handle-bound one: like
    // every other filesystem reader in this package (`manifest/hash.ts`, the
    // detector's own `lstat` + `computeContentHash`, and this file's caller in
    // `classifyObsoleteMappingRetirement`), it resolves each path more than
    // once and so cannot exclude a concurrent swap between the check and the
    // read. It is not a defence against an adversary racing writes inside the
    // provider directory; closing that would take handle-bound traversal
    // (`openat`/`O_NOFOLLOW`) across all of those readers. What it does
    // guarantee is that this helper's checks are a strict superset of the ones
    // it replaced, so no input accepted here was rejected before.
    const sentinelStat = await lstat(sentinelPath);
    if (!sentinelStat.isFile()) {
      return null;
    }

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
        // Validate the type before skipping by pathname: a non-regular
        // sentinel must disqualify the tree, not be waved through.
        if (!entry.isFile()) {
          return false;
        }
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
      compareDirectoryRelativePaths(
        relative(providerPath, left),
        relative(providerPath, right),
      ),
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

    // The marker file must be present, not merely validated when it happens to
    // exist. Keying the banner check on `file === markerPath` inside the loop
    // below meant a view with no `SKILL.md` at all skipped the check entirely,
    // which is half of the forgery this module now rejects.
    if (markerPath !== null && !files.includes(markerPath)) {
      return null;
    }

    const hash = createFramedDirectoryDigest();

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
      // Shared with `manifest/hash.ts` rather than mirrored: the canonical
      // digest this must reproduce is produced by the very same encoder.
      updateFramedDirectoryDigest(hash, relativePath, content);
    }

    return hash.digest('hex');
  } catch {
    return null;
  }
}
