import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, realpath, rename, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

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
  const checkedPath = validateSafeRelativePath(relativePath);
  if (!checkedPath.valid) {
    throw new Error(`Unsafe output path: ${checkedPath.errors[0].message}`);
  }

  const canonicalRoot = await realpath(root);
  const targetPath = resolve(canonicalRoot, checkedPath.normalizedPath);
  const canonicalParent = await realpath(dirname(targetPath));
  if (
    !isWithin(canonicalRoot, targetPath) ||
    !isWithin(canonicalRoot, canonicalParent)
  ) {
    throw new Error('Atomic write target escapes its configured root.');
  }

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

  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const temporaryPath = join(
    canonicalParent,
    `.${relative(canonicalParent, targetPath)}.tmp-${randomUUID()}`,
  );
  let handle;

  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(serialized, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await handle?.close().catch(() => {});
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }

  return targetPath;
}

function isWithin(root, target) {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}
