import { createHash, type Hash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { CliError } from '@errors/index';

export function computeStringHash(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

async function collectFiles(
  root: string,
  current: string,
  acc: string[],
): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(current, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, fullPath, acc);
      continue;
    }
    if (entry.isFile()) {
      acc.push(fullPath);
    }
  }
}

export async function computeFileHash(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath);
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new CliError(`File does not exist: ${filePath}`);
    }

    throw new CliError(
      `Failed to compute hash for ${filePath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      2,
    );
  }
}

export async function computeContentHash(
  contentPath: string,
  isFile: boolean,
): Promise<string> {
  return isFile
    ? computeFileHash(contentPath)
    : computeDirectoryHash(contentPath);
}

const FRAMED_DIRECTORY_DIGEST_DOMAIN = '\0oat-directory-digest-v2\0';

/**
 * The digests of a directory tree: the sorted `(relativePath, content)` list of
 * every regular file under it, hashed with SHA-256.
 *
 * ## Length framing (wave-7 final review, Critical 4)
 *
 * `framed` is the digest every caller compares. The stream opens with a fixed
 * domain tag and then, for every file in order, each field carries its own byte
 * length ahead of its bytes — `<byteLength> NUL <bytes>` for the relative path,
 * then the same for the content. That makes the stream a self-delimiting
 * encoding of the sorted file list, so two distinct file lists cannot produce
 * the same stream. Files are ordered by their UTF-8 path bytes rather than by
 * `localeCompare`, which is not a total order (distinct Unicode spellings can
 * compare equal) and would otherwise leave the digest dependent on directory
 * enumeration order and the host's ICU data.
 *
 * `legacy` is the digest this module produced before that change: a bare
 * `relPath NUL content NUL …` stream, ordered by `localeCompare`. A relative
 * path cannot contain NUL but file *content* can, so the stream did not
 * determine the file set. The review's witness:
 * `{references/p.md: "P", references/q.md: "Q"}` and the
 * single file `{references/p.md: "P\0references/q.md\0Q"}` both hashed to
 * `2bb17da7d373d82dd09024613a5bc31764837c2590441dfbc0eda55d3bcd283c`. A forged
 * provider view could therefore delete `SKILL.md`, fuse its bytes into a
 * surviving file, and still reproduce the canonical digest — reading `in_sync`
 * with `oat sync` planning `skip`, permanently healthy-looking and
 * unrepairable.
 *
 * The domain tag is what keeps the two encodings apart, and it is load-bearing
 * rather than decorative. A recorded `contentHash` carries no version, so a
 * legacy value is compared against framed values — including by the raw fast
 * path in `drift/detector.ts` that runs before any marker or sentinel check.
 * Without separation those namespaces overlap: the canonical tree
 * `{"8": "SKILL.md26\0# evil\n", "SKILL.md": "# skill\n"}` and the single-file
 * provider tree `{"SKILL.md": "# evil\n\0SKILL.md\0# skill\n\0"}` emit the
 * identical byte string under the legacy and framed encoders respectively
 * (`1b83055cfb0680a8f70cdb66ba4902a6a48627f5584b0ae3bbebf9fc44830b70`), so an
 * undecorated forged view would have been accepted. The tag opens the framed
 * stream with a NUL byte; a legacy stream opens with a relative path and paths
 * cannot contain NUL, so the two encoders' input spaces are disjoint and no
 * framed digest equals a legacy digest under SHA-256 collision resistance —
 * the same assumption every other comparison here already rests on.
 *
 * `legacy` is retained for exactly one purpose: `drift/detector.ts` uses it to
 * recognize a manifest written before the framing change and re-decide with
 * `framed`. It is never an acceptance basis for provider content on its own.
 * The migration is needed because framing changes every recorded
 * `contentHash`, and `oat sync` plans `skip` for a faithful tree while
 * `ensureSkipEntryManaged` (`engine/execute-plan.ts`) does not restamp an entry
 * it already owns — so a legacy value is never rewritten by a no-op sync.
 * Measured on the built CLI: a directory-copy entry whose `contentHash` no
 * longer matches reports `drifted/modified` from `oat status`, `oat sync`
 * answers `skip` / "already in sync", and the manifest keeps the old value.
 *
 * ## Bounds this digest still does not cover
 *
 * Both recorded rather than closed (wave-7 final review, Important 5, and
 * `BL-260909-use-handle-bound-traversal`): file mode bits and empty
 * directories. A provider view differing from canonical only in those respects
 * still digests equal. Framing addresses file-set ambiguity, not the set of
 * attributes hashed.
 */
export interface DirectoryDigests {
  framed: string;
  legacy: string;
}

/**
 * Opens a framed directory digest with the domain tag.
 *
 * Exported alongside `compareDirectoryRelativePaths` and
 * `updateFramedDirectoryDigest` so `engine/managed-copy-hash.ts` shares this
 * exact encoding rather than mirroring it. The three must agree byte for byte:
 * a faithful managed copy has to reproduce the canonical `framed` digest that
 * `engine/execute-plan.ts` records as the manifest `contentHash`, and
 * `managed-copy-hash.test.ts` pins that equality.
 */
export function createFramedDirectoryDigest(): Hash {
  const hash = createHash('sha256');
  hash.update(FRAMED_DIRECTORY_DIGEST_DOMAIN);
  return hash;
}

/** Total order over distinct relative paths, by UTF-8 bytes. */
export function compareDirectoryRelativePaths(
  left: string,
  right: string,
): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

/**
 * Contributes one file to a framed directory digest.
 */
export function updateFramedDirectoryDigest(
  hash: Hash,
  relativePath: string,
  content: Buffer,
): void {
  const pathBytes = Buffer.from(relativePath, 'utf8');
  hash.update(`${pathBytes.length}\0`);
  hash.update(pathBytes);
  hash.update(`${content.length}\0`);
  hash.update(content);
}

function updateLegacyDirectoryDigest(
  hash: Hash,
  relativePath: string,
  content: Buffer,
): void {
  hash.update(relativePath);
  hash.update('\0');
  hash.update(content);
  hash.update('\0');
}

interface DirectoryFileRecord {
  relativePath: string;
  content: Buffer;
}

async function collectDirectoryFiles(dirPath: string): Promise<string[]> {
  const root = resolve(dirPath);
  const files: string[] = [];

  try {
    await collectFiles(root, root, files);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new CliError(`Directory does not exist: ${dirPath}`);
    }

    throw new CliError(
      `Failed to compute hash for ${dirPath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      2,
    );
  }

  return files;
}

/**
 * Orders a captured file list for one encoding and folds it into a digest.
 *
 * Each encoding keeps its own ordering: the legacy digest has to stay
 * byte-reproducible to remain recognizable, while the framed digest wants a
 * total order, which `localeCompare` does not provide (distinct Unicode
 * spellings can compare equal, leaving the result dependent on directory
 * enumeration order and the host's ICU data).
 */
function digestDirectoryRecords(
  records: DirectoryFileRecord[],
  encoding: 'framed' | 'legacy',
): string {
  const ordered = [...records].sort(
    encoding === 'framed'
      ? (left, right) =>
          compareDirectoryRelativePaths(left.relativePath, right.relativePath)
      : (left, right) => left.relativePath.localeCompare(right.relativePath),
  );

  const hash =
    encoding === 'framed'
      ? createFramedDirectoryDigest()
      : createHash('sha256');
  for (const record of ordered) {
    if (encoding === 'framed') {
      updateFramedDirectoryDigest(hash, record.relativePath, record.content);
    } else {
      updateLegacyDirectoryDigest(hash, record.relativePath, record.content);
    }
  }

  return hash.digest('hex');
}

/**
 * Both digests of a directory tree, derived from one traversal that reads each
 * file exactly once.
 *
 * The single capture is load-bearing, not an optimization. Computing the two
 * encodings from two separate traversals would let the canonical tree change
 * between them, so the pre-framing bridge in `drift/detector.ts` could pair
 * `framed` from one canonical state with `legacy` from another and accept a
 * provider view that the pre-framing detector rejected. Both digests must
 * describe the same captured file set. The residual per-file race — the tree
 * mutating partway through a single traversal — is the pre-existing bound
 * every filesystem reader in this package shares, recorded on
 * `BL-260909-use-handle-bound-traversal`.
 *
 * Only the bridge needs `legacy`, and it asks only after a comparison has
 * already failed, so buffering the tree here does not touch the hot path:
 * `computeDirectoryHash` still streams file by file.
 */
export async function computeDirectoryDigests(
  dirPath: string,
): Promise<DirectoryDigests> {
  const root = resolve(dirPath);
  const files = await collectDirectoryFiles(dirPath);
  const records: DirectoryFileRecord[] = [];
  for (const file of files) {
    records.push({
      relativePath: relative(root, file),
      content: await readFile(file),
    });
  }

  return {
    framed: digestDirectoryRecords(records, 'framed'),
    legacy: digestDirectoryRecords(records, 'legacy'),
  };
}

/**
 * The framed digest of a directory tree.
 *
 * Streams file by file rather than capturing the tree, because this is the
 * digest every ordinary caller computes. `hash.test.ts` pins that it agrees
 * with `computeDirectoryDigests(...).framed`.
 */
export async function computeDirectoryHash(dirPath: string): Promise<string> {
  const root = resolve(dirPath);
  const files = await collectDirectoryFiles(dirPath);
  files.sort((left, right) =>
    compareDirectoryRelativePaths(relative(root, left), relative(root, right)),
  );

  const hash = createFramedDirectoryDigest();
  for (const file of files) {
    updateFramedDirectoryDigest(
      hash,
      relative(root, file),
      await readFile(file),
    );
  }

  return hash.digest('hex');
}
