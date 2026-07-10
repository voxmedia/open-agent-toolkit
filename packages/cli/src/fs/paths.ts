import { access, realpath } from 'node:fs/promises';
import { dirname, posix, resolve, sep } from 'node:path';

import { CliError } from '@errors/index';
import type { Scope } from '@shared/types';

type ConcreteScope = Exclude<Scope, 'all'>;

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
