import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export function validatePortablePath(candidate, { allowAbsolute = true } = {}) {
  const path = typeof candidate === 'string' ? candidate : '';
  if (
    !path ||
    (!allowAbsolute && isAbsolute(path)) ||
    path.includes('\0') ||
    path.includes('\\') ||
    path.split('/').includes('..')
  ) {
    return invalid(
      path,
      'unsafe-path',
      allowAbsolute
        ? 'Path must use POSIX separators and contain no NUL or traversal segments.'
        : 'Path must be a non-empty relative POSIX path without traversal.',
    );
  }

  return {
    valid: true,
    normalizedPath: `${isAbsolute(path) ? '/' : ''}${path
      .split('/')
      .filter(Boolean)
      .join('/')}`,
    errors: [],
  };
}

export function validateSafeRelativePath(candidate) {
  return validatePortablePath(candidate, { allowAbsolute: false });
}

export async function resolveRootConfinedPath(root, candidate) {
  const lexical = validateSafeRelativePath(candidate);
  if (!lexical.valid) {
    return invalid(
      typeof candidate === 'string' ? candidate : '',
      'path-traversal',
      lexical.errors[0].message,
    );
  }
  const path = lexical.normalizedPath;

  let realRoot;
  try {
    realRoot = await realpath(resolve(root));
  } catch {
    return invalid(
      path,
      'root-not-found',
      'The configured root does not exist.',
    );
  }

  const lexicalTarget = resolve(realRoot, path);
  if (!isWithin(realRoot, lexicalTarget)) {
    return invalid(path, 'path-traversal', 'Path escapes the configured root.');
  }

  let realTarget;
  try {
    realTarget = await realpath(lexicalTarget);
  } catch {
    return invalid(path, 'path-not-found', 'The resolved path does not exist.');
  }

  if (!isWithin(realRoot, realTarget)) {
    return invalid(
      path,
      'symlink-escape',
      'The resolved path escapes the configured root through a symlink.',
    );
  }

  return {
    valid: true,
    normalizedPath: path.split('/').filter(Boolean).join('/'),
    absolutePath: realTarget,
    errors: [],
  };
}

function isWithin(root, target) {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}

function invalid(path, code, message) {
  return {
    valid: false,
    errors: [{ path, code, message }],
  };
}
