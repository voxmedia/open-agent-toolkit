import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, realpath, rename, rm } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import {
  validatePortablePath,
  validateSafeRelativePath,
} from './safe-paths.mjs';

export function normalizeSlug(candidate) {
  if (
    typeof candidate !== 'string' ||
    candidate.includes('/') ||
    candidate.includes('\\') ||
    candidate.includes('\0') ||
    candidate === '.' ||
    candidate === '..'
  ) {
    throw new Error('Slug must be text, not a path or traversal value.');
  }

  const slug = candidate
    .normalize('NFKD')
    .replaceAll(/\p{Mark}/gu, '')
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error('Slug must contain at least one letter or number.');
  }
  return slug;
}

export async function createConfinedRunRoot(outputRoot, slug) {
  const checkedRoot = validatePortablePath(outputRoot);
  if (!checkedRoot.valid) {
    throw new Error(`Unsafe output root: ${checkedRoot.errors[0].message}`);
  }

  const normalizedSlug = normalizeSlug(slug);
  const requestedRoot = resolve(checkedRoot.normalizedPath);
  await mkdir(requestedRoot, { recursive: true });
  const canonicalRoot = await realpath(requestedRoot);
  const runRoot = join(canonicalRoot, normalizedSlug);

  if (!isWithin(canonicalRoot, runRoot)) {
    throw new Error('Normalized run root escapes the output root.');
  }

  try {
    const existing = await lstat(runRoot);
    if (existing.isSymbolicLink()) {
      throw new Error('Run root cannot be a symlink.');
    }
    if (!existing.isDirectory()) {
      throw new Error('Run root exists and is not a directory.');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    await mkdir(runRoot);
  }

  const canonicalRunRoot = await realpath(runRoot);
  if (!isWithin(canonicalRoot, canonicalRunRoot)) {
    throw new Error('Run root escapes the output root through a symlink.');
  }

  return {
    outputRoot: canonicalRoot,
    runRoot: canonicalRunRoot,
    slug: normalizedSlug,
  };
}

export async function writeJsonAtomic(root, relativePath, value) {
  return writeFileAtomic(
    root,
    relativePath,
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

export async function writeTextAtomic(root, relativePath, value) {
  if (typeof value !== 'string') {
    throw new TypeError('Atomic text writes require a string value.');
  }
  return writeFileAtomic(root, relativePath, value);
}

export async function writeFileAtomic(root, relativePath, value) {
  const checkedPath = validateSafeRelativePath(relativePath);
  if (!checkedPath.valid) {
    throw new Error(`Unsafe output path: ${checkedPath.errors[0].message}`);
  }

  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(
      'Atomic write root must be a real directory, not a symlink.',
    );
  }
  const canonicalRoot = await realpath(root);
  const targetPath = resolve(canonicalRoot, checkedPath.normalizedPath);
  if (!isWithin(canonicalRoot, targetPath)) {
    throw new Error('Atomic write target escapes its configured root.');
  }
  const canonicalParent = await createConfinedDirectories(
    canonicalRoot,
    dirname(checkedPath.normalizedPath),
  );

  try {
    const target = await lstat(targetPath);
    if (target.isSymbolicLink()) {
      throw new Error('Atomic write target cannot be a symlink.');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const temporaryPath = join(
    canonicalParent,
    `.${basename(targetPath)}.tmp-${randomUUID()}`,
  );
  let handle;

  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(value);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await assertConfinedDirectory(canonicalRoot, canonicalParent);
    await rejectSymlinkTarget(targetPath);
    await rename(temporaryPath, targetPath);
    const directoryHandle = await open(canonicalParent, 'r');
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  } catch (error) {
    await handle?.close().catch(() => {});
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }

  return targetPath;
}

async function createConfinedDirectories(canonicalRoot, relativeDirectory) {
  const segments =
    relativeDirectory === '.' ? [] : relativeDirectory.split(/[\\/]/);
  let current = canonicalRoot;
  for (const segment of segments) {
    current = join(current, segment);
    try {
      const existing = await lstat(current);
      if (existing.isSymbolicLink()) {
        throw new Error(
          `Atomic write ancestor cannot be a symlink: ${segment}.`,
        );
      }
      if (!existing.isDirectory()) {
        throw new Error(
          `Atomic write ancestor is not a directory: ${segment}.`,
        );
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      try {
        await mkdir(current, { mode: 0o700 });
      } catch (mkdirError) {
        if (mkdirError?.code !== 'EEXIST') throw mkdirError;
      }
      const created = await lstat(current);
      if (created.isSymbolicLink() || !created.isDirectory()) {
        throw new Error(`Atomic write ancestor is unsafe: ${segment}.`, {
          cause: error,
        });
      }
    }
    await assertConfinedDirectory(canonicalRoot, current);
  }
  return current;
}

async function assertConfinedDirectory(canonicalRoot, directory) {
  const stat = await lstat(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error('Atomic write ancestor must be a real directory.');
  }
  const canonicalDirectory = await realpath(directory);
  if (!isWithin(canonicalRoot, canonicalDirectory)) {
    throw new Error('Atomic write ancestor escapes its configured root.');
  }
}

async function rejectSymlinkTarget(targetPath) {
  try {
    if ((await lstat(targetPath)).isSymbolicLink()) {
      throw new Error('Atomic write target cannot be a symlink.');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function isWithin(root, target) {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}
