import { access, realpath } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';

import { CliError } from '@errors/index';
import type { Scope } from '@shared/types';

type ConcreteScope = Exclude<Scope, 'all'>;
export type ManagedRootName = '.agents' | '.oat';

export interface ResolvedManagedRoot {
  name: ManagedRootName;
  logicalRoot: string;
  realRoot: string;
  exists: boolean;
}

export async function resolveProjectRoot(cwd: string): Promise<string> {
  let current = resolve(cwd);

  while (true) {
    try {
      await access(resolve(current, '.git'));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  throw new CliError(`Unable to resolve project root from ${cwd}`, 2);
}

export function resolveScopeRoot(
  scope: ConcreteScope,
  cwd: string,
  home: string,
): string {
  if (scope === 'user') {
    return resolve(home);
  }

  return resolve(cwd);
}

export function toPosixPath(pathValue: string): string {
  return pathValue.replaceAll('\\', '/');
}

export function normalizeToPosixPath(pathValue: string): string {
  return posix.normalize(toPosixPath(pathValue));
}

export function validatePathWithinScope(
  candidatePath: string,
  scopeRoot: string,
): string {
  const resolvedScopeRoot = resolve(scopeRoot);
  const resolvedCandidatePath = resolve(candidatePath);
  const isInside =
    resolvedCandidatePath === resolvedScopeRoot ||
    resolvedCandidatePath.startsWith(`${resolvedScopeRoot}${sep}`);

  if (!isInside) {
    throw new CliError(
      `Path ${candidatePath} is outside scope root ${scopeRoot}`,
    );
  }

  return resolvedCandidatePath;
}

export async function validateRealPathWithinScope(
  candidatePath: string,
  scopeRoot: string,
): Promise<{ realScopeRoot: string; realPath: string }> {
  const resolvedCandidatePath = validatePathWithinScope(
    candidatePath,
    scopeRoot,
  );

  let realScopeRoot: string;
  let realCandidatePath: string;
  try {
    [realScopeRoot, realCandidatePath] = await Promise.all([
      realpath(resolve(scopeRoot)),
      realpath(resolvedCandidatePath),
    ]);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new CliError(
      `Unable to resolve real path for ${candidatePath} within scope root ${scopeRoot}${detail}`,
    );
  }

  validatePathWithinScope(realCandidatePath, realScopeRoot);
  return { realScopeRoot, realPath: realCandidatePath };
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

async function resolveManagedRoot(
  scopeRoot: string,
  name: ManagedRootName,
): Promise<ResolvedManagedRoot> {
  const logicalRoot = validatePathWithinScope(join(scopeRoot, name), scopeRoot);
  try {
    return {
      name,
      logicalRoot,
      realRoot: await realpath(logicalRoot),
      exists: true,
    };
  } catch (error) {
    if (!isMissingFileError(error)) {
      const detail = error instanceof Error ? `: ${error.message}` : '';
      throw new CliError(
        `Unable to resolve managed root ${logicalRoot}${detail}`,
      );
    }
  }

  let realScopeRoot: string;
  try {
    realScopeRoot = await realpath(resolve(scopeRoot));
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new CliError(
      `Unable to resolve scope root ${scopeRoot} for managed paths${detail}`,
    );
  }
  return {
    name,
    logicalRoot,
    realRoot: join(realScopeRoot, name),
    exists: false,
  };
}

export async function resolveManagedScopeRoots(
  scopeRoot: string,
): Promise<Record<ManagedRootName, ResolvedManagedRoot>> {
  const [agents, oat] = await Promise.all([
    resolveManagedRoot(scopeRoot, '.agents'),
    resolveManagedRoot(scopeRoot, '.oat'),
  ]);
  return { '.agents': agents, '.oat': oat };
}

export async function validateManagedPath(
  candidatePath: string,
  managedRoot: ResolvedManagedRoot,
): Promise<{ realManagedRoot: string; realPath: string }> {
  const logicalPath = validatePathWithinScope(
    candidatePath,
    managedRoot.logicalRoot,
  );
  const relativePath = relative(managedRoot.logicalRoot, logicalPath);

  if (!managedRoot.exists) {
    return {
      realManagedRoot: managedRoot.realRoot,
      realPath: join(managedRoot.realRoot, relativePath),
    };
  }

  let nearestExisting = logicalPath;
  let realAncestor: string | null = null;
  while (realAncestor === null) {
    try {
      realAncestor = await realpath(nearestExisting);
    } catch (error) {
      if (!isMissingFileError(error)) {
        const detail = error instanceof Error ? `: ${error.message}` : '';
        throw new CliError(
          `Unable to validate managed path ${candidatePath}${detail}`,
        );
      }
      const parent = dirname(nearestExisting);
      if (parent === nearestExisting) {
        throw new CliError(
          `Unable to find an existing ancestor for managed path ${candidatePath}`,
        );
      }
      nearestExisting = parent;
    }
  }

  try {
    validatePathWithinScope(realAncestor, managedRoot.realRoot);
  } catch {
    throw new CliError(
      `Managed path ${candidatePath} escapes resolved root ${managedRoot.realRoot} through ${nearestExisting}. Remove or repoint the nested symlink, then retry.`,
    );
  }

  const realCandidate = join(
    realAncestor,
    relative(nearestExisting, logicalPath),
  );
  try {
    validatePathWithinScope(realCandidate, managedRoot.realRoot);
  } catch {
    throw new CliError(
      `Managed path ${candidatePath} resolves outside ${managedRoot.realRoot}. Remove or repoint the nested symlink, then retry.`,
    );
  }
  return { realManagedRoot: managedRoot.realRoot, realPath: realCandidate };
}
