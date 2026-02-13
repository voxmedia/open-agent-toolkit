import { access } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { CliError } from '../errors';
import type { Scope } from '../shared/types';

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

  throw new CliError(`Unable to resolve project root from ${cwd}`);
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
