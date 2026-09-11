import { lstat, readdir, realpath, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';

export const PACKAGE_COVERAGE_VERSION = 'explainer-kit.package-coverage/v3';

export function requiredImmutablePackagePaths(manifest) {
  if (!isObject(manifest)) {
    throw new TypeError(
      'Manifest package coverage requires a manifest object.',
    );
  }
  return [
    ...new Set([
      'theme.resolved.json',
      'source/fact-base.json',
      'source/fact-base.md',
      'source/ledger.json',
      'qa/result.json',
      ...(manifest.artifacts ?? []).map(({ contentPath }) => contentPath),
    ]),
  ];
}

export function permissibleRunPackagePaths(manifest) {
  if (!isObject(manifest) || !isObject(manifest.immutableHashes)) {
    throw new TypeError(
      'Run package inventory requires a manifest with immutable hashes.',
    );
  }
  const paths = new Set([
    ...Object.keys(manifest.immutableHashes),
    'manifest.json',
  ]);
  for (const path of paths) assertInventoryPath(path);
  return [...paths].sort();
}

export function validateImmutablePackageEvidence(manifest) {
  const missing = requiredImmutablePackagePaths(manifest).filter(
    (path) => !(path in (manifest?.immutableHashes ?? {})),
  );
  if (missing.length > 0) {
    throw new Error(
      `Manifest immutable hashes do not cover the canonical package: ${missing.join(', ')}.`,
    );
  }
}

export async function enforceRunPackageInventory(
  runRoot,
  manifest,
  { removeUnexpected = false } = {},
) {
  if (typeof runRoot !== 'string' || runRoot.length === 0) {
    throw new TypeError('Run package inventory requires a run root.');
  }
  const rootStats = await lstat(runRoot);
  const canonicalRoot = await realpath(runRoot);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error('Run package inventory root is not a real directory.');
  }

  const allowedFiles = new Set(permissibleRunPackagePaths(manifest));
  const allowedDirectories = new Set();
  for (const path of allowedFiles) {
    let parent = dirname(path);
    while (parent !== '.') {
      allowedDirectories.add(parent);
      parent = dirname(parent);
    }
  }

  const presentFiles = new Set();
  let unexpected = false;
  async function inspect(relativeRoot = '') {
    const entries = await readdir(join(canonicalRoot, relativeRoot));
    for (const entry of entries) {
      const relativePath = relativeRoot ? `${relativeRoot}/${entry}` : entry;
      const absolutePath = join(canonicalRoot, relativePath);
      const stats = await lstat(absolutePath);
      const allowed =
        (stats.isDirectory() && allowedDirectories.has(relativePath)) ||
        (stats.isFile() && allowedFiles.has(relativePath));
      if (stats.isSymbolicLink() || !allowed) {
        unexpected = true;
        if (removeUnexpected) {
          await rm(absolutePath, { recursive: true, force: true });
        }
        continue;
      }
      if (stats.isDirectory()) {
        await inspect(relativePath);
      } else {
        presentFiles.add(relativePath);
      }
    }
  }
  await inspect();

  const missing = [...allowedFiles].some((path) => !presentFiles.has(path));
  if (unexpected || missing) {
    throw new Error(
      'Run package inventory does not match the exact permissible tree.',
    );
  }
  return [...presentFiles].sort();
}

function assertInventoryPath(path) {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.includes('\\') ||
    isAbsolute(path) ||
    path
      .split('/')
      .some(
        (segment) => segment === '' || segment === '.' || segment === '..',
      ) ||
    relative('.', path).startsWith(`..${sep}`)
  ) {
    throw new TypeError(
      'Run package inventory paths must be normalized relative paths.',
    );
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
