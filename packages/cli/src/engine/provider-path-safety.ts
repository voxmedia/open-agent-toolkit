import { lstat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function displayRelativePath(scopeRoot: string, path: string): string {
  const relativePath = relative(scopeRoot, path);
  return relativePath || '.';
}

export async function assertSafeProviderMutationPath(
  scopeRoot: string,
  providerPath: string,
): Promise<void> {
  const resolvedRoot = resolve(scopeRoot);
  const resolvedProviderPath = resolve(providerPath);
  const relativeProviderPath = relative(resolvedRoot, resolvedProviderPath);

  if (relativeProviderPath === '') {
    throw new Error('Provider destination must not equal the sync scope root.');
  }

  if (
    relativeProviderPath === '..' ||
    relativeProviderPath.startsWith(`..${sep}`) ||
    isAbsolute(relativeProviderPath)
  ) {
    throw new Error(
      `Provider destination is outside the sync scope: ${providerPath}`,
    );
  }

  const relativeParentPath = dirname(relativeProviderPath);
  const parentSegments =
    relativeParentPath === '.'
      ? []
      : relativeParentPath.split(sep).filter(Boolean);
  const ancestry = [resolvedRoot];
  let currentPath = resolvedRoot;

  for (const segment of parentSegments) {
    currentPath = resolve(currentPath, segment);
    ancestry.push(currentPath);
  }

  for (const ancestor of ancestry) {
    let stat: Awaited<ReturnType<typeof lstat>>;
    try {
      stat = await lstat(ancestor);
    } catch (error) {
      if (isMissingPathError(error)) {
        return;
      }
      throw error;
    }

    const displayedPath = displayRelativePath(resolvedRoot, ancestor);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Unsafe provider parent "${displayedPath}": symbolic links are not allowed in provider ancestry.`,
      );
    }
    if (!stat.isDirectory()) {
      throw new Error(
        `Unsafe provider parent "${displayedPath}": provider ancestry is not a directory.`,
      );
    }
  }
}

function isNestedPath(parent: string, candidate: string): boolean {
  const relativePath = relative(resolve(parent), resolve(candidate));
  return (
    relativePath === '' ||
    (!isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`))
  );
}

export async function assertSafeProviderCollectionPath(
  scopeRoot: string,
  canonicalDir: string,
  providerDir: string,
): Promise<void> {
  if (
    isNestedPath(canonicalDir, providerDir) ||
    isNestedPath(providerDir, canonicalDir)
  ) {
    throw new Error(
      'Canonical and provider collection paths must not be nested.',
    );
  }

  await assertSafeProviderMutationPath(scopeRoot, canonicalDir);
  await assertSafeProviderMutationPath(scopeRoot, providerDir);
}
