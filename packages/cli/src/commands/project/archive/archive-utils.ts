import { execFile as execFileCallback } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, posix as path } from 'node:path';
import { promisify } from 'node:util';

import { CliError } from '@errors/cli-error';
import {
  copyDirectory,
  copySingleFile,
  dirExists,
  ensureDir,
  fileExists,
} from '@fs/io';

const execFileAsync = promisify(execFileCallback);

export type ExecFileResult = {
  stdout: string;
  stderr: string;
};

export type ExecFileLike = (
  file: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) => Promise<ExecFileResult>;

export interface EnsureS3ArchiveAccessOptions {
  mode: 'completion' | 'sync';
  s3Uri?: string | null;
  syncOnComplete: boolean;
}

interface EnsureS3ArchiveAccessDependencies {
  execFile?: ExecFileLike;
  env?: NodeJS.ProcessEnv;
}

export interface EnsureS3ArchiveAccessResult {
  ok: boolean;
  warnings: string[];
}

export interface ArchiveProjectOnCompletionOptions {
  repoRoot: string;
  projectPath: string;
  projectName: string;
  projectsRoot: string;
  s3Uri?: string | null;
  s3SyncOnComplete: boolean;
  summaryExportPath?: string | null;
}

interface ArchiveProjectOnCompletionDependencies extends EnsureS3ArchiveAccessDependencies {
  ensureS3ArchiveAccess?: typeof ensureS3ArchiveAccess;
  execFile?: ExecFileLike;
  gitExecFile?: ExecFileLike;
  ensureDir?: typeof ensureDir;
  copyDirectory?: typeof copyDirectory;
  removePath?: (
    target: string,
    options: { recursive: true; force: true },
  ) => Promise<void>;
  copySingleFile?: typeof copySingleFile;
  dirExists?: typeof dirExists;
  fileExists?: typeof fileExists;
  timestamp?: () => string;
}

export interface ArchiveProjectOnCompletionResult {
  archivePath: string;
  s3Path: string | null;
  summaryExportFile: string | null;
  warnings: string[];
}

export const ARCHIVE_SNAPSHOT_METADATA_FILENAME = '.oat-archive-source.json';

export interface ArchiveSnapshotMetadata {
  projectName: string;
  snapshotName: string;
}

function normalizeS3Uri(s3Uri: string): string {
  return s3Uri.trim().replace(/\/+$/, '');
}

function resolveRepoSlug(repoRoot: string): string {
  return basename(repoRoot).trim().replace(/\s+/g, '-');
}

function buildCompletionWarning(message: string): EnsureS3ArchiveAccessResult {
  return {
    ok: false,
    warnings: [message],
  };
}

function buildSyncError(message: string): CliError {
  return new CliError(message);
}

function requiresRemoteAccess(
  options: EnsureS3ArchiveAccessOptions,
): options is EnsureS3ArchiveAccessOptions & { s3Uri: string } {
  return Boolean(
    options.s3Uri &&
    (options.mode === 'sync' || options.syncOnComplete === true),
  );
}

export function buildRepoArchiveS3Uri(s3Uri: string, repoRoot: string): string {
  return `${normalizeS3Uri(s3Uri)}/${resolveRepoSlug(repoRoot)}`;
}

export function buildProjectArchiveS3Uri(
  s3Uri: string,
  repoRoot: string,
  projectKey: string,
): string {
  return `${buildRepoArchiveS3Uri(s3Uri, repoRoot)}/${projectKey}`;
}

function normalizeArchiveDateStamp(timestamp: string): string {
  const isoPrefix = timestamp
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/)
    ?.slice(1);
  if (isoPrefix) {
    return isoPrefix.join('');
  }

  const digits = timestamp.replace(/\D/g, '');
  if (digits.length >= 8) {
    return digits.slice(0, 8);
  }

  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export function buildArchiveSnapshotName(
  projectName: string,
  timestamp: string,
): string {
  return `${normalizeArchiveDateStamp(timestamp)}-${projectName}`;
}

export function parseArchiveSnapshotName(snapshotName: string): {
  projectName: string;
  snapshotName: string;
  dateStamp: string | null;
} {
  const trimmedSnapshot = snapshotName.replace(/\/+$/, '');
  const match = trimmedSnapshot.match(/^(\d{8})-(.+)$/);

  if (!match) {
    return {
      projectName: trimmedSnapshot,
      snapshotName: trimmedSnapshot,
      dateStamp: null,
    };
  }

  const dateStamp = match[1];
  const projectName = match[2];

  if (!dateStamp || !projectName) {
    return {
      projectName: trimmedSnapshot,
      snapshotName: trimmedSnapshot,
      dateStamp: null,
    };
  }

  return {
    projectName,
    snapshotName: trimmedSnapshot,
    dateStamp,
  };
}

export function resolveLocalArchiveProjectPath(
  projectsRoot: string,
  projectName: string,
): string {
  const normalizedProjectsRoot = projectsRoot.replace(/\/+$/, '');
  const projectsBase = path.dirname(normalizedProjectsRoot);
  return path.join(projectsBase, 'archived', projectName);
}

function resolveCompletionArchivePath(
  archiveRepoRoot: string,
  projectsRoot: string,
  projectName: string,
): string {
  return join(
    archiveRepoRoot,
    resolveLocalArchiveProjectPath(projectsRoot, projectName),
  );
}

function resolveGitPath(repoRoot: string, gitPath: string): string {
  const normalizedPath = gitPath.trim();
  return isAbsolute(normalizedPath)
    ? normalizedPath
    : join(repoRoot, normalizedPath);
}

async function resolveArchiveRepoRoot(
  repoRoot: string,
  dependencies: ArchiveProjectOnCompletionDependencies,
): Promise<string> {
  const execFile = dependencies.gitExecFile ?? execFileAsync;

  try {
    const [{ stdout: commonDir }, { stdout: gitDir }] = await Promise.all([
      execFile('git', ['rev-parse', '--git-common-dir'], {
        cwd: repoRoot,
        env: dependencies.env ?? process.env,
      }),
      execFile('git', ['rev-parse', '--git-dir'], {
        cwd: repoRoot,
        env: dependencies.env ?? process.env,
      }),
    ]);

    const resolvedCommonDir = resolveGitPath(repoRoot, commonDir);
    const resolvedGitDir = resolveGitPath(repoRoot, gitDir);

    if (resolvedCommonDir === resolvedGitDir) {
      return repoRoot;
    }

    const primaryRepoRoot = dirname(resolvedCommonDir);
    const directoryExists = dependencies.dirExists ?? dirExists;
    if (await directoryExists(primaryRepoRoot)) {
      return primaryRepoRoot;
    }
  } catch {
    return repoRoot;
  }

  return repoRoot;
}

async function resolveUniqueArchivePath(
  archivePath: string,
  dependencies: ArchiveProjectOnCompletionDependencies,
): Promise<string> {
  const directoryExists = dependencies.dirExists ?? dirExists;
  if (!(await directoryExists(archivePath))) {
    return archivePath;
  }

  const timestamp = dependencies.timestamp?.() ?? new Date().toISOString();
  const suffix = timestamp.replace(/[-:TZ.]/g, '').slice(0, 15);
  return `${archivePath}-${suffix}`;
}

async function writeArchiveSnapshotMetadata(
  archivePath: string,
  metadata: ArchiveSnapshotMetadata,
): Promise<void> {
  await writeFile(
    join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );
}

async function exportProjectSummary(
  archivePath: string,
  snapshotName: string,
  summaryExportPath: string,
  repoRoot: string,
  dependencies: ArchiveProjectOnCompletionDependencies,
): Promise<string | null> {
  const summarySource = join(archivePath, 'summary.md');
  const exists = dependencies.fileExists ?? fileExists;
  if (!(await exists(summarySource))) {
    return null;
  }

  const summaryTarget = join(repoRoot, summaryExportPath, `${snapshotName}.md`);
  const copySummary = dependencies.copySingleFile ?? copySingleFile;
  await copySummary(summarySource, summaryTarget);
  return summaryTarget;
}

export async function archiveProjectOnCompletion(
  options: ArchiveProjectOnCompletionOptions,
  dependencies: ArchiveProjectOnCompletionDependencies = {},
): Promise<ArchiveProjectOnCompletionResult> {
  const makeDir = dependencies.ensureDir ?? ensureDir;
  const copyProjectDirectory = dependencies.copyDirectory ?? copyDirectory;
  const removePath =
    dependencies.removePath ??
    (async (target, removeOptions) => rm(target, removeOptions));
  const ensureAccess =
    dependencies.ensureS3ArchiveAccess ?? ensureS3ArchiveAccess;
  const execFile = dependencies.execFile ?? execFileAsync;
  const timestamp = dependencies.timestamp?.() ?? new Date().toISOString();
  const snapshotName = buildArchiveSnapshotName(options.projectName, timestamp);
  const archiveRepoRoot = await resolveArchiveRepoRoot(
    options.repoRoot,
    dependencies,
  );

  const archiveBasePath = resolveCompletionArchivePath(
    archiveRepoRoot,
    options.projectsRoot,
    options.projectName,
  );
  const archivePath = await resolveUniqueArchivePath(
    archiveBasePath,
    dependencies,
  );

  await makeDir(dirname(archivePath));
  await copyProjectDirectory(options.projectPath, archivePath);
  await writeArchiveSnapshotMetadata(archivePath, {
    projectName: options.projectName,
    snapshotName,
  });
  await removePath(options.projectPath, { recursive: true, force: true });

  const warnings: string[] = [];

  let summaryExportFile: string | null = null;
  if (options.summaryExportPath) {
    try {
      summaryExportFile = await exportProjectSummary(
        archivePath,
        snapshotName,
        options.summaryExportPath,
        options.repoRoot,
        dependencies,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(
        `Summary export to \`${options.summaryExportPath}\` failed: ${message}`,
      );
    }
  }

  let s3Path: string | null = null;
  if (options.s3Uri && options.s3SyncOnComplete) {
    const access = await ensureAccess(
      {
        mode: 'completion',
        s3Uri: options.s3Uri,
        syncOnComplete: options.s3SyncOnComplete,
      },
      {
        execFile,
        env: dependencies.env,
      },
    );
    warnings.push(...access.warnings);

    if (access.ok) {
      s3Path = buildProjectArchiveS3Uri(
        options.s3Uri,
        options.repoRoot,
        snapshotName,
      );

      try {
        await execFile('aws', ['s3', 'sync', archivePath, s3Path], {
          cwd: options.repoRoot,
          env: dependencies.env ?? process.env,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Archive S3 sync to \`${s3Path}\` failed: ${message}`);
        s3Path = null;
      }
    }
  }

  return {
    archivePath,
    s3Path,
    summaryExportFile,
    warnings,
  };
}

export async function ensureS3ArchiveAccess(
  options: EnsureS3ArchiveAccessOptions,
  dependencies: EnsureS3ArchiveAccessDependencies = {},
): Promise<EnsureS3ArchiveAccessResult> {
  if (!requiresRemoteAccess(options)) {
    return { ok: true, warnings: [] };
  }

  const execFile = dependencies.execFile ?? execFileAsync;
  const execOptions = { env: dependencies.env ?? process.env };

  try {
    await execFile('aws', ['--version'], execOptions);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      if (options.mode === 'completion') {
        return buildCompletionWarning(
          'Archive S3 sync is enabled via `archive.s3SyncOnComplete`, but AWS CLI was not found on PATH. Skipping S3 archive sync.',
        );
      }
      throw buildSyncError(
        'AWS CLI is required for `oat project archive sync`, but it was not found on PATH. Install `aws` and retry.',
      );
    }
    throw error;
  }

  try {
    await execFile('aws', ['sts', 'get-caller-identity'], execOptions);
    return { ok: true, warnings: [] };
  } catch {
    if (options.mode === 'completion') {
      return buildCompletionWarning(
        'Archive S3 sync is enabled via `archive.s3SyncOnComplete` and `archive.s3Uri`, but AWS CLI is not configured for access. Skipping S3 archive sync.',
      );
    }
    throw buildSyncError(
      'AWS CLI is required for `oat project archive sync`, but it is not configured for access to `archive.s3Uri`. Configure AWS credentials or profile settings and retry.',
    );
  }
}
