import { execFile as execFileCallback } from 'node:child_process';
import { basename, posix as path } from 'node:path';
import { promisify } from 'node:util';

import { CliError } from '@errors/cli-error';

const execFileAsync = promisify(execFileCallback);

type ExecFileResult = {
  stdout: string;
  stderr: string;
};

type ExecFileLike = (
  file: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv },
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
  projectName: string,
): string {
  return `${buildRepoArchiveS3Uri(s3Uri, repoRoot)}/${projectName}`;
}

export function resolveLocalArchiveProjectPath(
  projectsRoot: string,
  projectName: string,
): string {
  const normalizedProjectsRoot = projectsRoot.replace(/\/+$/, '');
  const projectsBase = path.dirname(normalizedProjectsRoot);
  return path.join(projectsBase, 'archived', projectName);
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
  } catch (error) {
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
