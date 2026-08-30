import { realpathSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

import { resolveEffectiveConfig as defaultResolveEffectiveConfig } from '@config/resolve';
import { CliError } from '@errors/cli-error';

export type ProjectScope = 'shared' | 'local' | 'synced';

export const PROJECT_SCOPES = [
  'shared',
  'local',
  'synced',
] as const satisfies readonly ProjectScope[];
export const SYNCED_REF_NAMESPACE = 'refs/oat/projects';
export const SYNCED_REMOTE = 'origin';

const PROJECT_SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function canonicalizePath(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch (error) {
    if (
      !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
    ) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(
        `Unable to resolve canonical path \`${absolute}\`: ${detail}`,
        2,
      );
    }
    const parent = dirname(absolute);
    if (parent === absolute) {
      return absolute;
    }
    return join(canonicalizePath(parent), basename(absolute));
  }
}

interface EffectiveConfigResult {
  resolved: Record<string, { value: unknown }>;
}

interface ProjectScopeDependencies {
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<EffectiveConfigResult>;
}

const DEFAULT_DEPENDENCIES: ProjectScopeDependencies = {
  resolveEffectiveConfig: defaultResolveEffectiveConfig,
};

export function resolveProjectsParent(
  repoRoot: string,
  projectsRoot: string,
): string {
  const resolvedRoot = isAbsolute(projectsRoot)
    ? canonicalizePath(projectsRoot)
    : resolve(repoRoot, projectsRoot);
  return dirname(resolvedRoot);
}

export function resolveScopeRoot(
  repoRoot: string,
  projectsRoot: string,
  scope: ProjectScope,
): string {
  const resolvedSharedRoot = isAbsolute(projectsRoot)
    ? canonicalizePath(projectsRoot)
    : resolve(repoRoot, projectsRoot);
  return scope === 'shared'
    ? resolvedSharedRoot
    : join(dirname(resolvedSharedRoot), scope);
}

export function resolveProjectScope(
  projectPath: string,
  projectsRoot: string,
  repoRoot: string,
): ProjectScope | null {
  const canonicalProjectPath = canonicalizePath(
    isAbsolute(projectPath) ? projectPath : resolve(repoRoot, projectPath),
  );
  for (const scope of PROJECT_SCOPES) {
    const scopeRoot = canonicalizePath(
      resolveScopeRoot(repoRoot, projectsRoot, scope),
    );
    const projectRelative = relative(scopeRoot, canonicalProjectPath);
    if (
      projectRelative !== '' &&
      projectRelative !== '..' &&
      !projectRelative.startsWith(`..${sep}`) &&
      !isAbsolute(projectRelative)
    ) {
      return scope;
    }
  }
  return null;
}

export function assertValidProjectSlug(
  slug: string,
  exitCode: 1 | 2 = 2,
): void {
  if (slug.startsWith('-') || !PROJECT_SLUG_PATTERN.test(slug)) {
    throw new CliError(
      `Invalid project slug "${slug}". Use letters, numbers, dash, and underscore, and do not start with a dash.`,
      exitCode,
    );
  }
}

export function syncedRefName(slug: string): string {
  assertValidProjectSlug(slug);
  return `${SYNCED_REF_NAMESPACE}/${slug}`;
}

export function syncedRecordPath(scopeRoot: string, slug: string): string {
  assertValidProjectSlug(slug);
  return join(scopeRoot, `${slug}.json`);
}

export async function isSyncedCheckout(projectPath: string): Promise<boolean> {
  try {
    return (await stat(join(projectPath, '.git'))).isFile();
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return false;
    }
    throw error;
  }
}

function parseScope(value: unknown, source: string): ProjectScope | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (PROJECT_SCOPES.includes(value as ProjectScope)) {
    return value as ProjectScope;
  }
  throw new CliError(
    `Invalid project scope from ${source}: "${String(value)}". Expected one of: ${PROJECT_SCOPES.join(', ')}.`,
    2,
  );
}

export async function resolveDefaultScope(
  repoRoot: string,
  env: NodeJS.ProcessEnv,
  dependencies: Partial<ProjectScopeDependencies> = {},
): Promise<ProjectScope> {
  const envScope = parseScope(
    env.OAT_PROJECTS_DEFAULT_SCOPE?.trim(),
    'OAT_PROJECTS_DEFAULT_SCOPE',
  );
  if (envScope) {
    return envScope;
  }

  const deps = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const effective = await deps.resolveEffectiveConfig(
    repoRoot,
    join(homedir(), '.oat'),
    env,
  );
  return (
    parseScope(
      effective.resolved['projects.defaultScope']?.value,
      'projects.defaultScope',
    ) ?? 'synced'
  );
}
