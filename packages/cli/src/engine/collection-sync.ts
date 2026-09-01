import { createHash } from 'node:crypto';
import { lstat, readdir, readlink, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import type {
  CollectionIdentityProof,
  CollectionPathIdentity,
} from './engine.types';
import { assertSafeProviderCollectionPath } from './provider-path-safety';

interface CollectionIdentityInput {
  root: string;
  canonicalDir: string;
  providerDir: string;
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function pathIdentity(
  stat: Awaited<ReturnType<typeof lstat>>,
): CollectionPathIdentity | undefined {
  const type = stat.isDirectory()
    ? 'directory'
    : stat.isSymbolicLink()
      ? 'symlink'
      : undefined;
  if (type === undefined) {
    return undefined;
  }

  return {
    device: String(stat.dev),
    inode: String(stat.ino),
    type,
    modifiedAtNanoseconds: String(
      'mtimeNs' in stat ? stat.mtimeNs : Math.round(stat.mtimeMs * 1_000_000),
    ),
  };
}

function pathInside(parent: string, candidate: string): boolean {
  const relativePath = relative(resolve(parent), resolve(candidate));
  return (
    relativePath === '' ||
    (!isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`))
  );
}

async function entrySetDigest(directory: string): Promise<string> {
  const hash = createHash('sha256');

  async function visit(current: string): Promise<void> {
    const names = (await readdir(current)).sort();
    for (const name of names) {
      const path = resolve(current, name);
      const relativePath = relative(directory, path).replaceAll('\\', '/');
      const stat = await lstat(path);
      if (stat.isDirectory()) {
        hash.update(`directory\0${relativePath}\0`);
        await visit(path);
      } else if (stat.isFile()) {
        hash.update(`file\0${relativePath}\0${stat.size}\0${stat.mtimeMs}\0`);
      } else if (stat.isSymbolicLink()) {
        hash.update(`symlink\0${relativePath}\0${await readlink(path)}\0`);
      } else {
        hash.update(`other\0${relativePath}\0`);
      }
    }
  }

  await visit(directory);
  return hash.digest('hex');
}

async function nearestExistingParent(
  root: string,
  path: string,
): Promise<CollectionPathIdentity | undefined> {
  let candidate = dirname(path);
  while (pathInside(root, candidate)) {
    try {
      const identity = pathIdentity(await lstat(candidate));
      return identity?.type === 'directory' ? identity : undefined;
    } catch (error) {
      if (!isMissingPathError(error)) {
        return undefined;
      }
    }

    if (resolve(candidate) === resolve(root)) {
      break;
    }
    candidate = dirname(candidate);
  }
  return undefined;
}

export async function proveCollectionIdentity({
  root,
  canonicalDir,
  providerDir,
}: CollectionIdentityInput): Promise<CollectionIdentityProof> {
  const checkedAt = new Date().toISOString();

  try {
    await assertSafeProviderCollectionPath(root, canonicalDir, providerDir);
  } catch {
    return { status: 'ineligible', reason: 'unsafe-ancestry', checkedAt };
  }

  let canonicalStat: Awaited<ReturnType<typeof lstat>>;
  try {
    canonicalStat = await lstat(canonicalDir);
  } catch {
    return { status: 'ineligible', reason: 'identity-unavailable', checkedAt };
  }
  const canonicalDirectory = pathIdentity(canonicalStat);
  if (canonicalDirectory?.type !== 'directory') {
    return {
      status: 'ineligible',
      reason: 'identity-unavailable',
      observedIdentity: canonicalDirectory,
      checkedAt,
    };
  }

  let providerStat: Awaited<ReturnType<typeof lstat>>;
  try {
    providerStat = await lstat(providerDir);
  } catch (error) {
    if (isMissingPathError(error)) {
      const providerParent = await nearestExistingParent(root, providerDir);
      if (providerParent !== undefined) {
        return {
          status: 'absent',
          canonicalDirectory,
          providerParent,
          checkedAt,
        };
      }
    }
    return { status: 'ineligible', reason: 'identity-unavailable', checkedAt };
  }

  const observedIdentity = pathIdentity(providerStat);
  if (!providerStat.isSymbolicLink()) {
    return {
      status: 'ineligible',
      reason: providerStat.isDirectory()
        ? 'real-directory'
        : 'identity-unavailable',
      observedIdentity,
      checkedAt,
    };
  }

  let linkText: string;
  let resolvedTarget: string;
  let realTarget: string;
  let canonicalTarget: string;
  try {
    linkText = await readlink(providerDir);
    resolvedTarget = resolve(dirname(providerDir), linkText);
    realTarget = await realpath(providerDir);
    canonicalTarget = await realpath(canonicalDir);
  } catch {
    return {
      status: 'ineligible',
      reason: 'broken-link',
      observedIdentity,
      checkedAt,
    };
  }

  if (realTarget !== canonicalTarget) {
    return {
      status: 'ineligible',
      reason: 'foreign-target',
      observedIdentity,
      checkedAt,
    };
  }

  try {
    const canonicalDigest = await entrySetDigest(canonicalDir);
    const providerDigest = await entrySetDigest(providerDir);
    if (canonicalDigest !== providerDigest) {
      return {
        status: 'ineligible',
        reason: 'divergent-entries',
        observedIdentity,
        checkedAt,
      };
    }

    return {
      status: 'exact-link',
      providerLink: observedIdentity as CollectionPathIdentity,
      canonicalDirectory,
      linkTextKind: isAbsolute(linkText) ? 'absolute' : 'relative',
      resolvedTarget,
      entrySetDigest: canonicalDigest,
      checkedAt,
    };
  } catch {
    return {
      status: 'ineligible',
      reason: 'identity-unavailable',
      observedIdentity,
      checkedAt,
    };
  }
}
