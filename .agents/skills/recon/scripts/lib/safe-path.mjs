import { lstat, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

function contains(root, candidate) {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === '' ||
    (!fromRoot.startsWith(`..${sep}`) &&
      fromRoot !== '..' &&
      !isAbsolute(fromRoot))
  );
}

async function assertNoSymlinkComponents(root, candidate, allowMissing) {
  const rootIdentity = await assertCanonicalRoot(root);
  const resolvedRoot = rootIdentity.path;
  const resolvedCandidate = resolve(candidate);
  if (!contains(resolvedRoot, resolvedCandidate)) {
    throw Object.assign(new Error('Path escapes its managed root'), {
      code: 'PATH_ESCAPE',
    });
  }
  const parts = relative(resolvedRoot, resolvedCandidate)
    .split(sep)
    .filter(Boolean);
  let current = resolvedRoot;
  for (const part of parts) {
    current = resolve(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) {
        throw Object.assign(
          new Error(`Symlink component is forbidden: ${current}`),
          {
            code: 'SYMLINK_ESCAPE',
          },
        );
      }
    } catch (error) {
      if (error?.code === 'ENOENT' && allowMissing) break;
      throw error;
    }
  }
  const realRoot = rootIdentity.path;
  let existing = resolvedCandidate;
  while (true) {
    try {
      existing = await realpath(existing);
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT' || !allowMissing) throw error;
      const parent = dirname(existing);
      if (parent === existing) throw error;
      existing = parent;
    }
  }
  if (!contains(realRoot, existing)) {
    throw Object.assign(new Error('Resolved path escapes its managed root'), {
      code: 'SYMLINK_ESCAPE',
    });
  }
  return resolvedCandidate;
}

export async function assertCanonicalRoot(root) {
  if (typeof root !== 'string' || !isAbsolute(root)) {
    throw Object.assign(new Error('Managed root must be an absolute path'), {
      code: 'NON_CANONICAL_ROOT',
    });
  }
  const resolvedRoot = resolve(root);
  const stat = await lstat(resolvedRoot);
  if (stat.isSymbolicLink()) {
    throw Object.assign(new Error('Managed root cannot be a symlink alias'), {
      code: 'SYMLINK_ESCAPE',
    });
  }
  const canonicalRoot = await realpath(resolvedRoot);
  if (canonicalRoot !== resolvedRoot) {
    throw Object.assign(
      new Error('Managed root must be its canonical realpath'),
      {
        code: 'NON_CANONICAL_ROOT',
      },
    );
  }
  return Object.freeze({
    path: canonicalRoot,
    device: stat.dev,
    inode: stat.ino,
  });
}

export async function assertUnchangedRoot(identity) {
  const current = await assertCanonicalRoot(identity?.path);
  if (
    current.device !== identity?.device ||
    current.inode !== identity?.inode
  ) {
    throw Object.assign(
      new Error('Managed root identity changed after validation'),
      {
        code: 'ROOT_IDENTITY_CHANGED',
      },
    );
  }
  return current;
}

export function isContainedPath(root, candidate) {
  return contains(resolve(root), resolve(candidate));
}

export async function assertSafeExistingPath(root, candidate) {
  return assertNoSymlinkComponents(root, candidate, false);
}

export async function assertSafeOutputPath(root, candidate) {
  return assertNoSymlinkComponents(root, candidate, true);
}
