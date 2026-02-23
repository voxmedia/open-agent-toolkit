import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { atomicWriteJson, dirExists, fileExists } from '@fs/io';
import { normalizeToPosixPath } from '@fs/paths';

export interface OatConfig {
  version: number;
  worktrees?: { root: string };
  projects?: { root: string };
}

export interface OatLocalConfig {
  version: number;
  activeProject?: string | null;
  lastPausedProject?: string | null;
}

export interface ActiveProjectResolution {
  name: string | null;
  path: string | null;
  status: 'active' | 'missing' | 'unset';
}

const DEFAULT_OAT_CONFIG: OatConfig = { version: 1 };
const DEFAULT_OAT_LOCAL_CONFIG: OatLocalConfig = { version: 1 };

function getConfigPath(repoRoot: string): string {
  return join(repoRoot, '.oat', 'config.json');
}

function getLocalConfigPath(repoRoot: string): string {
  return join(repoRoot, '.oat', 'config.local.json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function trimPathValue(value: string): string {
  return value.replace(/\/+$/, '').replace(/^\.\//, '').trim();
}

function normalizeProjectPath(
  repoRoot: string,
  pathValue: string | null | undefined,
): string | null {
  if (pathValue == null) {
    return null;
  }

  const trimmed = pathValue.trim();
  if (!trimmed) {
    return null;
  }

  if (!isAbsolute(trimmed)) {
    const normalizedRelative = trimPathValue(normalizeToPosixPath(trimmed));
    return normalizedRelative && normalizedRelative !== '.'
      ? normalizedRelative
      : null;
  }

  const repoRootResolved = resolve(repoRoot);
  const absoluteResolved = resolve(trimmed);
  const isInsideRepo =
    absoluteResolved === repoRootResolved ||
    absoluteResolved.startsWith(`${repoRootResolved}${sep}`);

  if (!isInsideRepo) {
    return null;
  }

  const relativePath = normalizeToPosixPath(
    relative(repoRootResolved, absoluteResolved),
  );
  const normalizedRelative = trimPathValue(relativePath);
  return normalizedRelative && normalizedRelative !== '.'
    ? normalizedRelative
    : null;
}

function normalizeOatConfig(parsed: unknown): OatConfig {
  const next: OatConfig = { ...DEFAULT_OAT_CONFIG };
  if (!isRecord(parsed)) {
    return next;
  }

  if (
    isRecord(parsed.worktrees) &&
    typeof parsed.worktrees.root === 'string' &&
    parsed.worktrees.root.trim()
  ) {
    next.worktrees = { root: parsed.worktrees.root.trim() };
  }

  if (
    isRecord(parsed.projects) &&
    typeof parsed.projects.root === 'string' &&
    parsed.projects.root.trim()
  ) {
    next.projects = { root: parsed.projects.root.trim() };
  }

  return next;
}

function normalizeOatLocalConfig(
  repoRoot: string,
  parsed: unknown,
): OatLocalConfig {
  const next: OatLocalConfig = { ...DEFAULT_OAT_LOCAL_CONFIG };
  if (!isRecord(parsed)) {
    return next;
  }

  if ('activeProject' in parsed) {
    const rawValue =
      typeof parsed.activeProject === 'string' || parsed.activeProject === null
        ? parsed.activeProject
        : null;
    next.activeProject = normalizeProjectPath(repoRoot, rawValue);
  }

  if ('lastPausedProject' in parsed) {
    const rawValue =
      typeof parsed.lastPausedProject === 'string' ||
      parsed.lastPausedProject === null
        ? parsed.lastPausedProject
        : null;
    next.lastPausedProject = normalizeProjectPath(repoRoot, rawValue);
  }

  return next;
}

export async function readOatConfig(repoRoot: string): Promise<OatConfig> {
  const configPath = getConfigPath(repoRoot);

  try {
    const raw = await readFile(configPath, 'utf8');
    return normalizeOatConfig(JSON.parse(raw));
  } catch (error) {
    if (isMissingFileError(error)) {
      return { ...DEFAULT_OAT_CONFIG };
    }

    throw error;
  }
}

export async function readOatLocalConfig(
  repoRoot: string,
): Promise<OatLocalConfig> {
  const configPath = getLocalConfigPath(repoRoot);

  try {
    const raw = await readFile(configPath, 'utf8');
    return normalizeOatLocalConfig(repoRoot, JSON.parse(raw));
  } catch (error) {
    if (isMissingFileError(error)) {
      return { ...DEFAULT_OAT_LOCAL_CONFIG };
    }

    throw error;
  }
}

export async function writeOatConfig(
  repoRoot: string,
  config: OatConfig,
): Promise<void> {
  const configPath = getConfigPath(repoRoot);
  const normalized = normalizeOatConfig(config);
  await atomicWriteJson(configPath, normalized);
}

export async function writeOatLocalConfig(
  repoRoot: string,
  config: OatLocalConfig,
): Promise<void> {
  const configPath = getLocalConfigPath(repoRoot);
  const normalized = normalizeOatLocalConfig(repoRoot, config);
  await atomicWriteJson(configPath, normalized);
}

export async function resolveActiveProject(
  repoRoot: string,
): Promise<ActiveProjectResolution> {
  const localConfig = await readOatLocalConfig(repoRoot);
  const projectPath = localConfig.activeProject ?? null;

  if (!projectPath) {
    return { name: null, path: null, status: 'unset' };
  }

  const absoluteProjectPath = join(repoRoot, projectPath);
  const statePath = join(absoluteProjectPath, 'state.md');
  const isValid =
    (await dirExists(absoluteProjectPath)) && (await fileExists(statePath));

  return {
    name: basename(absoluteProjectPath),
    path: projectPath,
    status: isValid ? 'active' : 'missing',
  };
}

export async function setActiveProject(
  repoRoot: string,
  projectRelativePath: string,
): Promise<void> {
  const normalizedPath = normalizeProjectPath(repoRoot, projectRelativePath);
  if (!normalizedPath) {
    throw new Error(
      `Active project path must be repo-relative or inside repo root: ${projectRelativePath}`,
    );
  }

  const localConfig = await readOatLocalConfig(repoRoot);
  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeProject: normalizedPath,
  });
}

export async function clearActiveProject(
  repoRoot: string,
  options?: { lastPaused?: string },
): Promise<void> {
  const localConfig = await readOatLocalConfig(repoRoot);
  const lastPaused =
    options?.lastPaused === undefined
      ? localConfig.lastPausedProject
      : normalizeProjectPath(repoRoot, options.lastPaused);

  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeProject: null,
    lastPausedProject: lastPaused,
  });
}
