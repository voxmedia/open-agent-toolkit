import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { readSyncedRecord } from '@commands/project/sync/record';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  assertValidProjectSlug,
  canonicalizePath,
  PROJECT_SCOPES,
  resolveProjectScope,
  resolveScopeRoot,
  syncedRecordPath,
  type ProjectScope,
} from '@commands/shared/project-scope';
import { resolveActiveProject } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { fileExists } from '@fs/io';

export interface NamedProject {
  /** The project's name: its folder name, unique across scopes by creation. */
  name: string;
  /** Canonical absolute project folder. */
  absolutePath: string;
  /** Repository-relative POSIX path, or the absolute path outside the repo. */
  projectPath: string;
  scope: ProjectScope;
}

function displayPath(repoRoot: string, absolutePath: string): string {
  const relativePath = relative(canonicalizePath(repoRoot), absolutePath);
  return relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
    ? absolutePath
    : relativePath.split(sep).join('/');
}

function pullInstruction(name: string): string {
  return `Project ${name} is a synced project that is not pulled into this checkout. Run \`oat project pull ${name}\` first.`;
}

/**
 * Resolve a project given by name or by path in this checkout, the way
 * `oat project open` reads its argument: an absolute path or one containing
 * `/` is a path; anything else is a name looked up in the shared, local and
 * synced scope roots. A name found in more than one scope is ambiguous and
 * needs a path. A synced project known only by its pointer is not pulled
 * here, so it is refused with the pull instruction rather than read.
 */
export async function resolveNamedProject(
  repoRoot: string,
  input: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NamedProject> {
  const projectsRoot = await resolveProjectsRoot(repoRoot, env);
  const explicit = isAbsolute(input) || input.includes('/');

  if (explicit) {
    const absolutePath = canonicalizePath(resolve(repoRoot, input));
    const scope = resolveProjectScope(absolutePath, projectsRoot, repoRoot);
    if (!scope) {
      throw new CliError(
        `Project path is outside the shared, local and synced scope roots: ${input}`,
        1,
      );
    }
    const name = basename(absolutePath);
    if (await fileExists(join(absolutePath, 'state.md'))) {
      return {
        name,
        absolutePath,
        projectPath: displayPath(repoRoot, absolutePath),
        scope,
      };
    }
    if (
      scope === 'synced' &&
      (await readSyncedRecord(
        syncedRecordPath(
          resolveScopeRoot(repoRoot, projectsRoot, 'synced'),
          name,
        ),
      )) !== null
    ) {
      throw new CliError(pullInstruction(name), 1);
    }
    throw new CliError(`Project not found: ${input}`, 1);
  }

  assertValidProjectSlug(input, 1);
  const present: NamedProject[] = [];
  const unpulled: ProjectScope[] = [];
  for (const scope of PROJECT_SCOPES) {
    const scopeRoot = resolveScopeRoot(repoRoot, projectsRoot, scope);
    const absolutePath = canonicalizePath(join(scopeRoot, input));
    if (await fileExists(join(absolutePath, 'state.md'))) {
      present.push({
        name: input,
        absolutePath,
        projectPath: displayPath(repoRoot, absolutePath),
        scope,
      });
    } else if (
      scope === 'synced' &&
      (await readSyncedRecord(syncedRecordPath(scopeRoot, input))) !== null
    ) {
      unpulled.push(scope);
    }
  }
  const scopes = [...present.map((project) => project.scope), ...unpulled];
  if (scopes.length > 1) {
    throw new CliError(
      `Project name "${input}" is ambiguous across scopes: ${scopes.join(', ')}. Pass an explicit project path.`,
      1,
    );
  }
  const [found] = present;
  if (found) {
    return found;
  }
  if (unpulled.length > 0) {
    throw new CliError(pullInstruction(input), 1);
  }
  throw new CliError(`Project not found: ${input}`, 1);
}

/**
 * The project a command names with `--project <name-or-path>`, or the active
 * project when it names none.
 */
export async function resolveProjectOrActive(
  repoRoot: string,
  input: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NamedProject> {
  if (input) {
    return resolveNamedProject(repoRoot, input, env);
  }
  const active = await resolveActiveProject(repoRoot);
  if (!active.path) {
    throw new CliError(
      'No active project is set. Pass --project <name-or-path>.',
      1,
    );
  }
  return resolveNamedProject(
    repoRoot,
    isAbsolute(active.path) ? active.path : join(repoRoot, active.path),
    env,
  );
}
