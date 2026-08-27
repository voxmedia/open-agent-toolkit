import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import {
  dirname,
  isAbsolute,
  join,
  normalize,
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
    ? normalize(projectsRoot)
    : resolve(repoRoot, projectsRoot);
  return dirname(resolvedRoot);
}

export function resolveScopeRoot(
  repoRoot: string,
  projectsRoot: string,
  scope: ProjectScope,
): string {
  return join(resolveProjectsParent(repoRoot, projectsRoot), scope);
}

export function resolveProjectScope(
  projectPath: string,
  projectsRoot: string,
): ProjectScope | null {
  if (isAbsolute(projectsRoot)) {
    const projectsParent = dirname(normalize(projectsRoot));
    for (const scope of PROJECT_SCOPES) {
      const scopeRoot = join(projectsParent, scope);
      const projectRelative = relative(scopeRoot, normalize(projectPath));
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

  const parentParts = dirname(normalize(projectsRoot))
    .split(sep)
    .filter((part) => part !== '' && part !== '.');
  const projectParts = normalize(projectPath)
    .split(sep)
    .filter((part) => part !== '' && part !== '.');

  for (let index = 0; index < projectParts.length; index += 1) {
    const parentMatches = parentParts.every(
      (part, offset) => projectParts[index + offset] === part,
    );
    if (!parentMatches) {
      continue;
    }

    const scope = projectParts[index + parentParts.length];
    const hasProjectName = projectParts.length > index + parentParts.length + 1;
    if (hasProjectName && PROJECT_SCOPES.includes(scope as ProjectScope)) {
      return scope as ProjectScope;
    }
  }

  return null;
}

function assertValidSlug(slug: string): void {
  if (slug.startsWith('-') || !PROJECT_SLUG_PATTERN.test(slug)) {
    throw new CliError(
      `Invalid project slug "${slug}". Use letters, numbers, dash, and underscore, and do not start with a dash.`,
      2,
    );
  }
}

export function syncedRefName(slug: string): string {
  assertValidSlug(slug);
  return `${SYNCED_REF_NAMESPACE}/${slug}`;
}

export function syncedRecordPath(scopeRoot: string, slug: string): string {
  assertValidSlug(slug);
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
