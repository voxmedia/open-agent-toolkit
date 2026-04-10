import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { atomicWriteJson, dirExists, fileExists } from '@fs/io';
import { normalizeToPosixPath } from '@fs/paths';

export interface OatDocumentationConfig {
  root?: string;
  tooling?: string;
  config?: string;
  index?: string;
  requireForProjectCompletion?: boolean;
}

export interface OatGitConfig {
  defaultBranch?: string;
}

export interface OatArchiveConfig {
  s3Uri?: string;
  s3SyncOnComplete?: boolean;
  summaryExportPath?: string;
}

export type WorkflowHillCheckpointDefault = 'every' | 'final';
export type WorkflowPostImplementSequence =
  | 'wait'
  | 'summary'
  | 'pr'
  | 'docs-pr';
export type WorkflowReviewExecutionModel =
  | 'subagent'
  | 'inline'
  | 'fresh-session';

export interface OatWorkflowConfig {
  hillCheckpointDefault?: WorkflowHillCheckpointDefault;
  archiveOnComplete?: boolean;
  createPrOnComplete?: boolean;
  postImplementSequence?: WorkflowPostImplementSequence;
  reviewExecutionModel?: WorkflowReviewExecutionModel;
  autoNarrowReReviewScope?: boolean;
}

const VALID_HILL_CHECKPOINT_DEFAULTS: readonly WorkflowHillCheckpointDefault[] =
  ['every', 'final'];
const VALID_POST_IMPLEMENT_SEQUENCES: readonly WorkflowPostImplementSequence[] =
  ['wait', 'summary', 'pr', 'docs-pr'];
const VALID_REVIEW_EXECUTION_MODELS: readonly WorkflowReviewExecutionModel[] = [
  'subagent',
  'inline',
  'fresh-session',
];

function normalizeWorkflowConfig(
  parsed: unknown,
): OatWorkflowConfig | undefined {
  if (!isRecord(parsed)) {
    return undefined;
  }

  const next: OatWorkflowConfig = {};

  if (
    typeof parsed.hillCheckpointDefault === 'string' &&
    (VALID_HILL_CHECKPOINT_DEFAULTS as readonly string[]).includes(
      parsed.hillCheckpointDefault,
    )
  ) {
    next.hillCheckpointDefault =
      parsed.hillCheckpointDefault as WorkflowHillCheckpointDefault;
  }

  if (typeof parsed.archiveOnComplete === 'boolean') {
    next.archiveOnComplete = parsed.archiveOnComplete;
  }

  if (typeof parsed.createPrOnComplete === 'boolean') {
    next.createPrOnComplete = parsed.createPrOnComplete;
  }

  if (
    typeof parsed.postImplementSequence === 'string' &&
    (VALID_POST_IMPLEMENT_SEQUENCES as readonly string[]).includes(
      parsed.postImplementSequence,
    )
  ) {
    next.postImplementSequence =
      parsed.postImplementSequence as WorkflowPostImplementSequence;
  }

  if (
    typeof parsed.reviewExecutionModel === 'string' &&
    (VALID_REVIEW_EXECUTION_MODELS as readonly string[]).includes(
      parsed.reviewExecutionModel,
    )
  ) {
    next.reviewExecutionModel =
      parsed.reviewExecutionModel as WorkflowReviewExecutionModel;
  }

  if (typeof parsed.autoNarrowReReviewScope === 'boolean') {
    next.autoNarrowReReviewScope = parsed.autoNarrowReReviewScope;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export type OatToolsConfig = Partial<
  Record<
    | 'core'
    | 'ideas'
    | 'docs'
    | 'workflows'
    | 'utility'
    | 'project-management'
    | 'research',
    boolean
  >
>;

export interface OatConfig {
  version: number;
  worktrees?: { root: string };
  projects?: { root: string };
  git?: OatGitConfig;
  archive?: OatArchiveConfig;
  tools?: OatToolsConfig;
  documentation?: OatDocumentationConfig;
  localPaths?: string[];
  autoReviewAtCheckpoints?: boolean;
  workflow?: OatWorkflowConfig;
}

export interface OatLocalConfig {
  version: number;
  activeProject?: string | null;
  lastPausedProject?: string | null;
  activeIdea?: string | null;
  workflow?: OatWorkflowConfig;
}

export interface UserConfig {
  version: number;
  activeIdea?: string | null;
  workflow?: OatWorkflowConfig;
}

export interface ActiveProjectResolution {
  name: string | null;
  path: string | null;
  status: 'active' | 'missing' | 'unset';
}

const DEFAULT_OAT_CONFIG: OatConfig = { version: 1 };
const DEFAULT_OAT_LOCAL_CONFIG: OatLocalConfig = { version: 1 };
const DEFAULT_USER_CONFIG: UserConfig = { version: 1 };

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

  if (isRecord(parsed.git)) {
    const git: OatGitConfig = {};
    if (
      typeof parsed.git.defaultBranch === 'string' &&
      parsed.git.defaultBranch.trim()
    ) {
      git.defaultBranch = parsed.git.defaultBranch.trim();
    }
    if (Object.keys(git).length > 0) {
      next.git = git;
    }
  }

  if (isRecord(parsed.archive)) {
    const archive: OatArchiveConfig = {};
    if (
      typeof parsed.archive.s3Uri === 'string' &&
      parsed.archive.s3Uri.trim()
    ) {
      archive.s3Uri = parsed.archive.s3Uri.trim().replace(/\/+$/, '');
    }
    if (typeof parsed.archive.s3SyncOnComplete === 'boolean') {
      archive.s3SyncOnComplete = parsed.archive.s3SyncOnComplete;
    }
    if (
      typeof parsed.archive.summaryExportPath === 'string' &&
      parsed.archive.summaryExportPath.trim()
    ) {
      archive.summaryExportPath = normalizeToPosixPath(
        parsed.archive.summaryExportPath.trim().replace(/\/+$/, ''),
      );
    }
    if (Object.keys(archive).length > 0) {
      next.archive = archive;
    }
  }

  if (isRecord(parsed.tools)) {
    const validPacks = [
      'core',
      'ideas',
      'docs',
      'workflows',
      'utility',
      'project-management',
      'research',
    ] as const;
    const tools: OatToolsConfig = {};

    for (const pack of validPacks) {
      if (typeof parsed.tools[pack] === 'boolean') {
        tools[pack] = parsed.tools[pack];
      }
    }

    if (Object.keys(tools).length > 0) {
      next.tools = tools;
    }
  }

  if (isRecord(parsed.documentation)) {
    const doc: OatDocumentationConfig = {};
    if (
      typeof parsed.documentation.root === 'string' &&
      parsed.documentation.root.trim()
    ) {
      doc.root = parsed.documentation.root.trim();
    }
    if (
      typeof parsed.documentation.tooling === 'string' &&
      parsed.documentation.tooling.trim()
    ) {
      doc.tooling = parsed.documentation.tooling.trim();
    }
    if (
      typeof parsed.documentation.config === 'string' &&
      parsed.documentation.config.trim()
    ) {
      doc.config = parsed.documentation.config.trim();
    }
    if (
      typeof parsed.documentation.index === 'string' &&
      parsed.documentation.index.trim()
    ) {
      doc.index = parsed.documentation.index.trim();
    }
    if (typeof parsed.documentation.requireForProjectCompletion === 'boolean') {
      doc.requireForProjectCompletion =
        parsed.documentation.requireForProjectCompletion;
    }
    if (Object.keys(doc).length > 0) {
      next.documentation = doc;
    }
  }

  if (Array.isArray(parsed.localPaths)) {
    const filtered = parsed.localPaths.filter(
      (v): v is string => typeof v === 'string' && v.trim() !== '',
    );
    if (filtered.length > 0) {
      next.localPaths = [...new Set(filtered)].sort();
    }
  }

  if (typeof parsed.autoReviewAtCheckpoints === 'boolean') {
    next.autoReviewAtCheckpoints = parsed.autoReviewAtCheckpoints;
  }

  const workflow = normalizeWorkflowConfig(parsed.workflow);
  if (workflow) {
    next.workflow = workflow;
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

  if ('activeIdea' in parsed) {
    next.activeIdea =
      typeof parsed.activeIdea === 'string' && parsed.activeIdea.trim()
        ? parsed.activeIdea.trim()
        : null;
  }

  const workflow = normalizeWorkflowConfig(parsed.workflow);
  if (workflow) {
    next.workflow = workflow;
  }

  return next;
}

export function resolveLocalPaths(config: OatConfig): string[] {
  return config.localPaths ?? [];
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

function getUserConfigPath(userConfigDir: string): string {
  return join(userConfigDir, 'config.json');
}

function normalizeUserConfig(parsed: unknown): UserConfig {
  const next: UserConfig = { ...DEFAULT_USER_CONFIG };
  if (!isRecord(parsed)) {
    return next;
  }

  if ('activeIdea' in parsed) {
    next.activeIdea =
      typeof parsed.activeIdea === 'string' && parsed.activeIdea.trim()
        ? parsed.activeIdea.trim()
        : null;
  }

  const workflow = normalizeWorkflowConfig(parsed.workflow);
  if (workflow) {
    next.workflow = workflow;
  }

  return next;
}

export async function readUserConfig(
  userConfigDir: string,
): Promise<UserConfig> {
  const configPath = getUserConfigPath(userConfigDir);

  try {
    const raw = await readFile(configPath, 'utf8');
    return normalizeUserConfig(JSON.parse(raw));
  } catch (error) {
    if (isMissingFileError(error)) {
      return { ...DEFAULT_USER_CONFIG };
    }

    throw error;
  }
}

export async function writeUserConfig(
  userConfigDir: string,
  config: UserConfig,
): Promise<void> {
  const configPath = getUserConfigPath(userConfigDir);
  const normalized = normalizeUserConfig(config);
  await atomicWriteJson(configPath, normalized);
}

export async function resolveActiveIdea(
  repoRoot: string,
  userConfigDir: string,
): Promise<string | null> {
  const localConfig = await readOatLocalConfig(repoRoot);
  if (localConfig.activeIdea) {
    return localConfig.activeIdea;
  }

  const userConfig = await readUserConfig(userConfigDir);
  return userConfig.activeIdea ?? null;
}

export async function setActiveIdea(
  repoRoot: string,
  ideaPath: string,
): Promise<void> {
  const localConfig = await readOatLocalConfig(repoRoot);
  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeIdea: ideaPath.trim(),
  });
}

export async function clearActiveIdea(repoRoot: string): Promise<void> {
  const localConfig = await readOatLocalConfig(repoRoot);
  await writeOatLocalConfig(repoRoot, {
    ...localConfig,
    activeIdea: null,
  });
}

export function detectDefaultBranch(repoRoot: string): string {
  try {
    const branch = execSync(
      'gh repo view --json defaultBranchRef --jq .defaultBranchRef.name',
      {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 10_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    ).trim();
    if (branch) return branch;
  } catch {
    // gh not available or not authenticated — fall through
  }

  try {
    const ref = execSync('git rev-parse --abbrev-ref origin/HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (ref.startsWith('origin/')) return ref.replace('origin/', '');
  } catch {
    // origin/HEAD not set — fall through
  }

  return 'main';
}
