import { execFile as execFileCallback } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  posix as path,
  relative,
  resolve,
  sep,
} from 'node:path';
import { promisify } from 'node:util';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  readSyncedRecord,
  type SyncedProjectRecord,
  writeSyncedRecord,
} from '@commands/project/sync/record';
import {
  buildSyncTarget,
  commitRecordChange,
  preflightSyncedCheckout,
  removeSyncedCheckout,
  retireSyncedRef,
  type SyncedRefRetirementReceipt,
} from '@commands/project/sync/ref-sync';
import { probeSyncedTerminalRefs } from '@commands/project/sync/resolve-target';
import {
  canonicalizePath,
  type ProjectScope,
  resolveProjectScope,
  resolveScopeRoot,
  syncedRecordPath,
} from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';
import {
  copyDirectory,
  copySingleFile,
  dirExists,
  ensureDir,
  fileExists,
} from '@fs/io';
import { decodeHTMLAttribute } from 'entities/decode';

import { loadExplainerPackageCoverage } from './explainer-package-coverage';

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
  /**
   * AWS profile to apply for this archive op (typically resolved from
   * `archive.awsProfile` config or a `--profile` flag). When non-empty, this
   * value clobbers any `AWS_PROFILE` already present in the parent env: an
   * explicit OAT-archive-scoped profile is treated as deliberate intent and
   * wins over ambient shell state. An empty/unset value leaves the parent env
   * untouched.
   */
  awsProfile?: string | null;
  /**
   * AWS region to apply for this archive op. Same clobber-on-explicit-value
   * semantics as `awsProfile`.
   */
  awsRegion?: string | null;
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
  projectRecapRun?: string | null;
  /**
   * Config-only AWS profile (`archive.awsProfile`). The completion path has no
   * flag override. When non-empty, this value clobbers any parent-env
   * `AWS_PROFILE` — repo-scoped archive config is treated as deliberate intent
   * and wins over ambient shell state.
   */
  awsProfile?: string | null;
  /**
   * Config-only AWS region (`archive.awsRegion`). Same clobber-on-explicit-value
   * semantics as `awsProfile`.
   */
  awsRegion?: string | null;
  commit?: boolean;
}

export interface ResolvePrimaryRepoRootDependencies {
  gitExecFile?: ExecFileLike;
  dirExists?: typeof dirExists;
  env?: NodeJS.ProcessEnv;
}

export interface ResolveArchiveProjectTargetOptions {
  repoRoot: string;
  projectsRoot: string;
  projectName: string;
  archiveSnapshot?: string;
  archiveScope?: ProjectScope;
}

export interface ResolveArchiveProjectTargetDependencies extends ResolvePrimaryRepoRootDependencies {
  timestamp?: () => string;
}

export interface ArchiveProjectTarget {
  archiveProjectPath: string;
  archiveRepoRoot: string;
  archivePath: string;
  archivePathIsGitignored: boolean;
  primaryRepoRoot: string | null;
  primaryRepoRootAvailable: boolean;
  localOnlyWarning: string | null;
}

interface ArchiveProjectOnCompletionDependencies
  extends
    EnsureS3ArchiveAccessDependencies,
    ResolvePrimaryRepoRootDependencies {
  ensureS3ArchiveAccess?: typeof ensureS3ArchiveAccess;
  execFile?: ExecFileLike;
  ensureDir?: typeof ensureDir;
  copyDirectory?: typeof copyDirectory;
  removePath?: (
    target: string,
    options: { recursive: true; force: true },
  ) => Promise<void>;
  copySingleFile?: typeof copySingleFile;
  fileExists?: typeof fileExists;
  renamePath?: typeof rename;
  timestamp?: () => string;
  gitRunner?: GitRunner;
  readSyncedRecord?: typeof readSyncedRecord;
  writeSyncedRecord?: typeof writeSyncedRecord;
  preflightSyncedCheckout?: typeof preflightSyncedCheckout;
  removeSyncedCheckout?: typeof removeSyncedCheckout;
  retireSyncedRef?: typeof retireSyncedRef;
  commitRecordChange?: typeof commitRecordChange;
  removeSyncedRecord?: (recordPath: string) => Promise<void>;
  afterLifecycleCommit?: () => Promise<void>;
  probeSyncedTerminalRefs?: typeof probeSyncedTerminalRefs;
}

export interface ArchiveProjectRecapExportV1 {
  sourceRunRoot: string;
  exportRoot: string;
  runId: string;
  page: {
    sourceRelativePath: string;
    originalSha256: string;
    exportedSha256: string;
  };
  verifiedArtifactCount: number;
}

interface AttemptProjectRecapExport {
  export: ArchiveProjectRecapExportV1;
  createdByAttempt: boolean;
  identity?: { dev: number; ino: number; birthtimeMs: number };
}

export interface ArchiveProjectOnCompletionResult {
  archivePath: string;
  s3Path: string | null;
  /** Absolute filesystem path; normalize only when rendering repository links. */
  summaryExportFile: string | null;
  projectRecapExport: ArchiveProjectRecapExportV1 | null;
  warnings: string[];
  lifecycleCommit: string | null;
  recapExportPaths: string[];
  snapshotId: string;
  terminalReceipt: SyncedRefRetirementReceipt | null;
  recordRetired: boolean;
}

export const ARCHIVE_SNAPSHOT_METADATA_FILENAME = '.oat-archive-source.json';

/**
 * Directories excluded from S3 archive sync. These contain process artifacts
 * (reviews, PR descriptions) rather than project deliverables.
 */
export const S3_ARCHIVE_SYNC_EXCLUDES = ['reviews/*', 'pr/*'];

export interface ArchiveSnapshotMetadata {
  projectName: string;
  snapshotName: string;
  scope: ProjectScope;
  sourceRefSha?: string;
}

interface RecordlessSyncedArchiveIdentity {
  archivePath: string;
  metadata: ArchiveSnapshotMetadata & { sourceRefSha: string };
}

export interface ExactArchiveProjectRoot {
  canonicalProjectPath: string;
  projectScope: ProjectScope;
}

export function assertExactArchiveProjectRoot(
  options: Pick<
    ArchiveProjectOnCompletionOptions,
    'repoRoot' | 'projectsRoot' | 'projectPath' | 'projectName'
  >,
): ExactArchiveProjectRoot {
  const projectScope = resolveProjectScope(
    options.projectPath,
    resolveScopeRoot(options.repoRoot, options.projectsRoot, 'shared'),
    options.repoRoot,
  );
  if (!projectScope) {
    throw new CliError(
      `Project path \`${options.projectPath}\` is outside the configured shared, local, and synced scope roots; refusing to archive without an originating scope.`,
      1,
    );
  }
  const scopeRoot = canonicalizePath(
    resolveScopeRoot(options.repoRoot, options.projectsRoot, projectScope),
  );
  const projectPath = canonicalizePath(options.projectPath);
  if (
    dirname(projectPath) !== scopeRoot ||
    basename(projectPath) !== options.projectName
  ) {
    throw new CliError(
      `Project path \`${options.projectPath}\` must identify the exact direct child \`${options.projectName}\` of the configured ${projectScope} project root; refusing to archive a descendant or mismatched project.`,
      1,
    );
  }
  return { canonicalProjectPath: projectPath, projectScope };
}

function normalizeS3Uri(s3Uri: string): string {
  return s3Uri.trim().replace(/\/+$/, '');
}

/**
 * Build the env passed to every `aws` spawn in this module.
 *
 * Clobber-on-explicit-value merge: a non-empty value in `opts` overwrites the
 * parent env entry. The merge treats an explicitly supplied profile/region as
 * deliberate OAT-archive-scoped intent that wins over ambient shell state —
 * setting `archive.awsProfile` (or passing `--profile`) means "use this for
 * archive ops, regardless of what AWS_PROFILE is in the shell." Empty or
 * whitespace-only values in `opts` are treated as unset and leave the parent
 * env entry alone, so the AWS CLI's own resolution chain (incl. shell
 * AWS_PROFILE) takes over when neither config nor flag has spoken.
 *
 * Exported as a package-internal helper so the archive sync command (which
 * also spawns `aws`) can produce the same env shape without duplicating this
 * logic. This symbol is **not** part of the public package surface — keep
 * usage limited to files inside `commands/project/archive/`.
 */
export function buildAwsEnv(
  parentEnv: NodeJS.ProcessEnv,
  opts: { awsProfile?: string | null; awsRegion?: string | null },
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...parentEnv };

  const profile =
    typeof opts.awsProfile === 'string' ? opts.awsProfile.trim() : '';
  if (profile.length > 0) {
    env.AWS_PROFILE = profile;
  }

  const region =
    typeof opts.awsRegion === 'string' ? opts.awsRegion.trim() : '';
  if (region.length > 0) {
    env.AWS_REGION = region;
  }

  return env;
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
  return `${normalizeS3Uri(s3Uri)}/${resolveRepoSlug(repoRoot)}/projects`;
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

function normalizePathForConfig(pathValue: string): string {
  return pathValue.replaceAll('\\', '/');
}

function isInsidePath(parentPath: string, childPath: string): boolean {
  const relativePath = relative(parentPath, childPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith(`..${sep}`) &&
      relativePath !== '..' &&
      !isAbsolute(relativePath))
  );
}

function resolveArchiveProjectPath(
  repoRoot: string,
  projectsRoot: string,
  projectName: string,
): string {
  const archiveProjectPath = resolveLocalArchiveProjectPath(
    projectsRoot,
    projectName,
  );
  if (!isAbsolute(archiveProjectPath)) {
    return archiveProjectPath;
  }

  const resolvedRepoRoot = resolve(repoRoot);
  const resolvedArchiveProjectPath = resolve(archiveProjectPath);
  if (!isInsidePath(resolvedRepoRoot, resolvedArchiveProjectPath)) {
    return resolvedArchiveProjectPath;
  }

  return normalizePathForConfig(
    relative(resolvedRepoRoot, resolvedArchiveProjectPath),
  );
}

function resolveCompletionArchivePath(
  archiveRepoRoot: string,
  archiveProjectPath: string,
): string {
  return isAbsolute(archiveProjectPath)
    ? archiveProjectPath
    : join(archiveRepoRoot, archiveProjectPath);
}

function resolveGitPath(repoRoot: string, gitPath: string): string {
  const normalizedPath = gitPath.trim();
  return isAbsolute(normalizedPath)
    ? normalizedPath
    : join(repoRoot, normalizedPath);
}

function isExitCode(error: unknown, code: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Number(error.code) === code
  );
}

interface PrimaryRepoRootResolution {
  repoRoot: string;
  available: boolean;
}

// archiveProjectPath must be the contents-level probe path
// (.oat/projects/archived/<projectName>), not the archive directory itself
// (.oat/projects/archived). A `.oat/projects/archived/**` gitignore pattern
// leaves the directory visible in the tree while ignoring every file placed
// inside — a directory-level check reports "not ignored" and produces the
// inverse of the intended durability decision. Keep the probe inside the
// directory; the `oat-project-complete` skill documents the same invariant.
async function isGitignoredArchivePath(
  repoRoot: string,
  archiveProjectPath: string,
  dependencies: ArchiveProjectOnCompletionDependencies,
): Promise<boolean> {
  const execFile = dependencies.gitExecFile ?? execFileAsync;

  try {
    await execFile(
      'git',
      ['check-ignore', '--quiet', '--no-index', archiveProjectPath],
      {
        cwd: repoRoot,
        env: dependencies.env ?? process.env,
      },
    );
    return true;
  } catch (error) {
    if (isExitCode(error, 1)) {
      return false;
    }
    throw error;
  }
}

async function resolvePrimaryRepoRootResolution(
  repoRoot: string,
  dependencies: ResolvePrimaryRepoRootDependencies = {},
): Promise<PrimaryRepoRootResolution> {
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
      return { repoRoot, available: true };
    }

    const primaryRepoRoot = dirname(resolvedCommonDir);
    const directoryExists = dependencies.dirExists ?? dirExists;
    if (await directoryExists(primaryRepoRoot)) {
      return { repoRoot: primaryRepoRoot, available: true };
    }

    return { repoRoot: primaryRepoRoot, available: false };
  } catch {
    return { repoRoot, available: false };
  }
}

export async function resolvePrimaryRepoRoot(
  repoRoot: string,
  dependencies: ResolvePrimaryRepoRootDependencies = {},
): Promise<string> {
  const resolution = await resolvePrimaryRepoRootResolution(
    repoRoot,
    dependencies,
  );
  return resolution.available ? resolution.repoRoot : repoRoot;
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

async function archiveMatchesSnapshot(
  archivePath: string,
  projectName: string,
  snapshotName: string,
  archiveScope: ProjectScope,
  dependencies: ResolveArchiveProjectTargetDependencies,
): Promise<boolean> {
  const directoryExists = dependencies.dirExists ?? dirExists;
  if (!(await directoryExists(archivePath))) {
    return false;
  }
  try {
    const metadata = JSON.parse(
      await readFile(
        join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        'utf8',
      ),
    ) as unknown;
    return (
      isRecord(metadata) &&
      metadata.projectName === projectName &&
      metadata.snapshotName === snapshotName &&
      metadata.scope === archiveScope
    );
  } catch {
    return false;
  }
}

async function resolvePersistedArchivePath(
  archiveBasePath: string,
  projectName: string,
  snapshotName: string,
  archiveScope: ProjectScope,
  dependencies: ResolveArchiveProjectTargetDependencies,
): Promise<string> {
  const archiveRoot = dirname(archiveBasePath);
  const candidates = [archiveBasePath];
  try {
    const entries = await readdir(archiveRoot, { withFileTypes: true });
    candidates.push(
      ...entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(archiveRoot, entry.name))
        .filter((candidate) => candidate !== archiveBasePath)
        .sort(),
    );
  } catch {
    // The archive root can be absent before the first successful copy.
  }
  const matches: string[] = [];
  for (const candidate of candidates) {
    if (
      await archiveMatchesSnapshot(
        candidate,
        projectName,
        snapshotName,
        archiveScope,
        dependencies,
      )
    ) {
      matches.push(candidate);
    }
  }
  if (matches.length > 1) {
    throw new CliError(
      `Persisted archive snapshot \`${snapshotName}\` resolves to multiple local archives; refusing an ambiguous retry.`,
    );
  }
  return matches[0] ?? join(archiveRoot, snapshotName);
}

function buildLocalOnlyArchiveWarning(
  projectName: string,
  archiveProjectPath: string,
  primaryRepoRoot: string | null,
): string {
  const primaryMessage = primaryRepoRoot
    ? `the primary checkout \`${primaryRepoRoot}\` is unavailable`
    : 'the primary checkout could not be resolved';
  return `Refusing to archive project \`${projectName}\` because \`${archiveProjectPath}\` is gitignored in this worktree and ${primaryMessage}. Run \`oat project archive\` from the primary checkout or restore that checkout before retrying.`;
}

export async function resolveArchiveProjectTarget(
  options: ResolveArchiveProjectTargetOptions,
  dependencies: ResolveArchiveProjectTargetDependencies = {},
): Promise<ArchiveProjectTarget> {
  const archiveProjectPath = resolveArchiveProjectPath(
    options.repoRoot,
    options.projectsRoot,
    options.projectName,
  );
  let archivePathIsGitignored = false;
  let archiveRepoRoot = options.repoRoot;
  let primaryRepoRoot: string | null = null;
  let primaryRepoRootAvailable = true;
  let localOnlyWarning: string | null = null;

  try {
    archivePathIsGitignored = await isGitignoredArchivePath(
      options.repoRoot,
      archiveProjectPath,
      dependencies,
    );
  } catch {
    archivePathIsGitignored = false;
  }

  if (archivePathIsGitignored) {
    const primaryResolution = await resolvePrimaryRepoRootResolution(
      options.repoRoot,
      dependencies,
    );
    primaryRepoRoot = primaryResolution.repoRoot;
    primaryRepoRootAvailable = primaryResolution.available;

    if (primaryResolution.available) {
      archiveRepoRoot = primaryResolution.repoRoot;
    } else {
      localOnlyWarning = buildLocalOnlyArchiveWarning(
        options.projectName,
        archiveProjectPath,
        primaryRepoRoot,
      );
    }
  }

  const archiveBasePath = resolveCompletionArchivePath(
    archiveRepoRoot,
    archiveProjectPath,
  );
  let archivePath: string;
  if (options.archiveSnapshot) {
    if (!options.archiveScope) {
      throw new CliError(
        `Persisted archive snapshot \`${options.archiveSnapshot}\` is missing its originating project scope; refusing an unscoped retry.`,
      );
    }
    archivePath = await resolvePersistedArchivePath(
      archiveBasePath,
      options.projectName,
      options.archiveSnapshot,
      options.archiveScope,
      dependencies,
    );
  } else {
    archivePath = await resolveUniqueArchivePath(archiveBasePath, {
      dirExists: dependencies.dirExists,
      timestamp: dependencies.timestamp,
    });
  }

  return {
    archiveProjectPath,
    archiveRepoRoot,
    archivePath,
    archivePathIsGitignored,
    primaryRepoRoot,
    primaryRepoRootAvailable,
    localOnlyWarning,
  };
}

export function assertDurableArchiveProjectTarget(
  target: ArchiveProjectTarget,
): void {
  if (target.localOnlyWarning) {
    throw new CliError(target.localOnlyWarning);
  }
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

async function verifyArchiveSnapshotMetadata(
  archivePath: string,
  expected: ArchiveSnapshotMetadata,
): Promise<void> {
  let actual: unknown;
  try {
    actual = JSON.parse(
      await readFile(
        join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        'utf8',
      ),
    );
  } catch {
    throw new CliError(
      `Existing archive \`${archivePath}\` cannot be verified for retry; restore or remove it before retrying.`,
    );
  }
  if (
    !isRecord(actual) ||
    actual.projectName !== expected.projectName ||
    actual.snapshotName !== expected.snapshotName ||
    actual.scope !== expected.scope ||
    actual.sourceRefSha !== expected.sourceRefSha
  ) {
    throw new CliError(
      `Existing archive \`${archivePath}\` does not match persisted snapshot \`${expected.snapshotName}\`; refusing to overwrite it.`,
    );
  }
}

async function resolveRecordlessSyncedArchiveIdentity(
  options: Pick<
    ArchiveProjectOnCompletionOptions,
    'repoRoot' | 'projectsRoot' | 'projectName'
  >,
  target: ReturnType<typeof buildSyncTarget>,
  git: GitRunner,
  dependencies: ArchiveProjectOnCompletionDependencies,
): Promise<RecordlessSyncedArchiveIdentity> {
  const tentativeTarget = await resolveArchiveProjectTarget(
    options,
    dependencies,
  );
  assertDurableArchiveProjectTarget(tentativeTarget);
  const archiveRoot = dirname(tentativeTarget.archivePath);
  const candidates: RecordlessSyncedArchiveIdentity[] = [];
  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(archiveRoot, { withFileTypes: true });
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const archivePath = join(archiveRoot, entry.name);
    let metadata: unknown;
    try {
      metadata = JSON.parse(
        await readFile(
          join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
          'utf8',
        ),
      );
    } catch {
      continue;
    }
    if (
      isRecord(metadata) &&
      metadata.projectName === options.projectName &&
      metadata.scope === 'synced' &&
      typeof metadata.snapshotName === 'string' &&
      typeof metadata.sourceRefSha === 'string' &&
      /^[0-9a-f]{40}$/.test(metadata.sourceRefSha)
    ) {
      candidates.push({
        archivePath,
        metadata: {
          projectName: options.projectName,
          snapshotName: metadata.snapshotName,
          scope: 'synced',
          sourceRefSha: metadata.sourceRefSha,
        },
      });
    }
  }
  if (candidates.length === 0) {
    throw new CliError(
      `Synced project ${options.projectName} has no active record and no persisted synced archive identity; refusing to create a replacement active record or a new snapshot.`,
      2,
    );
  }
  const probe = dependencies.probeSyncedTerminalRefs ?? probeSyncedTerminalRefs;
  const matches: RecordlessSyncedArchiveIdentity[] = [];
  for (const candidate of candidates) {
    const terminal = await probe(target, candidate.metadata.sourceRefSha, git);
    if (
      terminal.completedSha === candidate.metadata.sourceRefSha &&
      (terminal.activeSha === null ||
        terminal.activeSha === candidate.metadata.sourceRefSha)
    ) {
      matches.push(candidate);
    }
  }
  if (matches.length !== 1) {
    throw new CliError(
      matches.length === 0
        ? `Synced project ${options.projectName} has no active record, but no persisted archive identity matches its authoritative completed ref; refusing terminal retry before export or S3 mutation.`
        : `Synced project ${options.projectName} has no active record and multiple persisted archives match its authoritative completed ref; refusing an ambiguous terminal retry.`,
      2,
    );
  }
  return matches[0]!;
}

async function exportProjectSummary(
  archivePath: string,
  snapshotName: string,
  summaryExportPath: string,
  repoRoot: string,
  dependencies: ArchiveProjectOnCompletionDependencies,
  recapExport: ArchiveProjectRecapExportV1 | null,
): Promise<string | null> {
  const summarySource = join(archivePath, 'summary.md');
  const exists = dependencies.fileExists ?? fileExists;
  if (!(await exists(summarySource))) {
    return null;
  }

  const summaryTarget = join(repoRoot, summaryExportPath, `${snapshotName}.md`);
  const copySummary = dependencies.copySingleFile ?? copySingleFile;
  const sourceContents = await readFile(summarySource);
  let expectedContents = sourceContents;
  if (recapExport) {
    const pageLink = relative(dirname(summaryTarget), recapExport.exportRoot)
      .split(sep)
      .join('/');
    const receipt = `Recap: [View the recap](${pageLink})\n\nRun: \`${recapExport.runId}\`  \nOriginal page SHA-256: \`${recapExport.page.originalSha256}\`  \nExported page SHA-256: \`${recapExport.page.exportedSha256}\`\n`;
    const text = sourceContents.toString('utf8');
    const outcome =
      /(^## Explainer Outcome[^\n]*\n)([\s\S]*?)(?=^## |$(?![\s\S]))/m;
    const rewriteLinks = (body: string) =>
      body.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (markdownLink, label: string, href: string) =>
          /(?:explainers\/|project-recaps\/)/.test(href)
            ? `[${label}](${pageLink})`
            : markdownLink,
      );
    expectedContents = Buffer.from(
      outcome.test(text)
        ? text.replace(
            outcome,
            (_match, heading: string, body: string) =>
              `${heading}${rewriteLinks(body).trimEnd()}\n\n${receipt}\n`,
          )
        : `${text.trimEnd()}\n\n## Explainer Outcome\n\n${receipt}`,
    );
  }
  if (await pathExists(summaryTarget)) {
    const targetContents = await readFile(summaryTarget);
    if (!expectedContents.equals(targetContents)) {
      throw new CliError(
        `Existing summary export \`${summaryTarget}\` does not match persisted snapshot \`${snapshotName}\`; refusing to overwrite it.`,
      );
    }
    return summaryTarget;
  }
  await copySummary(summarySource, summaryTarget);
  if (recapExport) await writeFile(summaryTarget, expectedContents);
  if (!expectedContents.equals(await readFile(summaryTarget))) {
    throw new CliError(
      `Summary export \`${summaryTarget}\` failed byte verification.`,
    );
  }
  return summaryTarget;
}

interface ProjectRecapManifest {
  schemaVersion: 'explainer-kit.manifest/v2' | 'explainer-kit.manifest/v1';
  runId: string;
  slug: string;
  createdAt: string;
  mode: 'interactive' | 'unattended';
  recipe: {
    id: string;
    version: string;
  };
  source: {
    factBasePath: string;
    factBaseHash: string;
    inputHashes: Record<string, string>;
  };
  theme: {
    path: string;
    hash: string;
  };
  artifacts: Array<{
    id: string;
    type: 'hub' | 'diagram' | 'explainer' | 'deck' | 'catalog';
    contentPath: string;
    renderedPath?: string;
    status: 'built' | 'failed';
    hash: string;
  }>;
  immutableHashes: Record<string, string>;
  buildRecord?: { path: 'build-record.json'; hash: string };
  outcome:
    | 'built'
    | 'built-needs-review'
    | 'built-durable'
    | 'failed'
    | 'incomplete';
  warnings: string[];
}

interface ExactRunPackageCoverage {
  permissibleRunPackagePaths: (manifest: ProjectRecapManifest) => string[];
  enforceRunPackageInventory: (
    runRoot: string,
    manifest: ProjectRecapManifest,
    options?: { removeUnexpected?: boolean },
  ) => Promise<string[]>;
}

async function parseProjectRecapManifest(
  contents: string,
): Promise<ProjectRecapManifest> {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new CliError('Selected project recap has an invalid manifest.json.');
  }

  if (
    !isProjectRecapManifestV2(value) &&
    !isLegacyProjectRecapManifest(value)
  ) {
    throw new CliError(
      'Selected project recap manifest does not match the explainer-kit manifest contract.',
    );
  }

  return value;
}

// Compatibility is derived from the captured July v1 packages. Their manifest
// and build record receive durability attestations after immutable recording.
function isLegacyProjectRecapManifest(
  value: unknown,
): value is ProjectRecapManifest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 'explainer-kit.manifest/v1' ||
    !isNonEmptyString(value.runId) ||
    !isNonEmptyString(value.slug) ||
    !isDateTime(value.createdAt) ||
    !isRecord(value.recipe) ||
    value.recipe.id !== 'project-recap' ||
    !isRecord(value.source) ||
    !isSafeRelativePath(value.source.factBasePath) ||
    !isSha256(value.source.factBaseHash) ||
    !isHashMap(value.source.inputHashes) ||
    !isRecord(value.theme) ||
    value.theme.path !== 'theme.resolved.json' ||
    !isSha256(value.theme.hash) ||
    !isRecord(value.buildRecord) ||
    value.buildRecord.path !== 'build-record.json' ||
    !isSha256(value.buildRecord.hash) ||
    !isHashMap(value.immutableHashes) ||
    !Array.isArray(value.source.authorResultPaths) ||
    !value.source.authorResultPaths.every(isSafeRelativePath) ||
    !Array.isArray(value.artifacts) ||
    value.artifacts.length !== 1 ||
    !['built', 'built-needs-review', 'built-durable'].includes(
      String(value.outcome),
    )
  )
    return false;
  return value.artifacts.every(
    (artifact: unknown) =>
      isRecord(artifact) &&
      isNonEmptyString(artifact.id) &&
      artifact.status === 'built' &&
      isSafeRelativePath(artifact.contentPath) &&
      isSafeRelativePath(artifact.renderedPath) &&
      artifact.renderedPath.startsWith('site/') &&
      artifact.mediaType === 'text/html' &&
      isSha256(artifact.hash),
  );
}

function isProjectRecapManifestV2(
  value: unknown,
): value is ProjectRecapManifest &
  Record<string, unknown> & {
    source: ProjectRecapManifest['source'] & Record<string, unknown>;
    theme: ProjectRecapManifest['theme'] & Record<string, unknown>;
  } {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'runId',
      'slug',
      'recipe',
      'createdAt',
      'mode',
      'source',
      'theme',
      'artifacts',
      'immutableHashes',
      'outcome',
      'warnings',
    ]) ||
    value.schemaVersion !== 'explainer-kit.manifest/v2' ||
    !isNonEmptyString(value.runId) ||
    typeof value.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ||
    !isDateTime(value.createdAt) ||
    !['interactive', 'unattended'].includes(String(value.mode)) ||
    !isRecord(value.recipe) ||
    !hasExactKeys(value.recipe, ['id', 'version']) ||
    !isNonEmptyString(value.recipe.id) ||
    !isNonEmptyString(value.recipe.version) ||
    !isRecord(value.source) ||
    !hasExactKeys(value.source, [
      'factBasePath',
      'factBaseHash',
      'inputHashes',
    ]) ||
    !isSafeRelativePath(value.source.factBasePath) ||
    !isSha256(value.source.factBaseHash) ||
    !isHashMap(value.source.inputHashes) ||
    !isRecord(value.theme) ||
    !hasExactKeys(value.theme, ['path', 'hash']) ||
    value.theme.path !== 'theme.resolved.json' ||
    !isSha256(value.theme.hash) ||
    !Array.isArray(value.artifacts) ||
    !value.artifacts.every(isManifestArtifact) ||
    new Set(value.artifacts.map((artifact) => JSON.stringify(artifact)))
      .size !== value.artifacts.length ||
    !isHashMap(value.immutableHashes) ||
    !['built', 'built-needs-review', 'failed', 'incomplete'].includes(
      String(value.outcome),
    ) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every(isNonEmptyString)
  ) {
    return false;
  }
  return true;
}

function isManifestArtifact(
  value: unknown,
): value is ProjectRecapManifest['artifacts'][number] {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['id', 'type', 'contentPath', 'hash', 'status']) ||
    !isNonEmptyString(value.id) ||
    !['hub', 'diagram', 'explainer', 'deck', 'catalog'].includes(
      String(value.type),
    ) ||
    !isSafeRelativePath(value.contentPath) ||
    !isSha256(value.hash) ||
    !['built', 'failed'].includes(String(value.status))
  ) {
    return false;
  }
  return true;
}

function isHashMap(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([relativePath, hash]) =>
        isSafeRelativePath(relativePath) && isSha256(hash),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: string[],
  optional: string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => key in value) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isSafeRelativePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !isAbsolute(value) &&
    !value.includes('\\') &&
    value.split('/').every((segment) => segment !== '' && segment !== '..')
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

function assertInsideExplainers(
  explainersRoot: string,
  selectedRunRoot: string,
): void {
  if (
    selectedRunRoot === explainersRoot ||
    !isInsidePath(explainersRoot, selectedRunRoot)
  ) {
    throw new CliError(
      'Selected project recap run must be inside the project `explainers/` directory.',
    );
  }
}

async function resolveSelectedProjectRecapRun(
  projectPath: string,
  projectRecapRun: string,
): Promise<string> {
  const explainersRoot = resolve(projectPath, 'explainers');
  const selectedRunRoot = resolve(projectPath, projectRecapRun);
  assertInsideExplainers(explainersRoot, selectedRunRoot);

  const [realExplainersRoot, realSelectedRunRoot] = await Promise.all([
    realpath(explainersRoot),
    realpath(selectedRunRoot),
  ]);
  assertInsideExplainers(realExplainersRoot, realSelectedRunRoot);
  return selectedRunRoot;
}

function parseExpectedSha256(value: string, relativePath: string): string {
  const match = value.match(/^sha256:([a-f0-9]{64})$/);
  if (!match?.[1]) {
    throw new CliError(
      `Selected project recap manifest has an invalid hash for \`${relativePath}\`.`,
    );
  }
  return match[1];
}

async function verifyProjectRecapImmutableHashes(
  stagedRoot: string,
  manifest: ProjectRecapManifest,
): Promise<number> {
  const entries = Object.entries(manifest.immutableHashes);
  const realStagedRoot = await realpath(stagedRoot);

  for (const [relativePath, expectedHash] of entries) {
    const artifactPath = resolve(stagedRoot, relativePath);
    if (
      artifactPath === stagedRoot ||
      !isInsidePath(stagedRoot, artifactPath)
    ) {
      throw new CliError(
        `Selected project recap manifest path \`${relativePath}\` escapes the recap package.`,
      );
    }

    const realArtifactPath = await realpath(artifactPath);
    if (!isInsidePath(realStagedRoot, realArtifactPath)) {
      throw new CliError(
        `Selected project recap manifest path \`${relativePath}\` escapes the recap package.`,
      );
    }

    const actualHash = createHash('sha256')
      .update(await readFile(realArtifactPath))
      .digest('hex');
    if (actualHash !== parseExpectedSha256(expectedHash, relativePath)) {
      throw new CliError(
        `Selected project recap hash verification failed for \`${relativePath}\`.`,
      );
    }
  }

  return entries.length;
}

async function verifyRecapInventory(
  root: string,
  files: string[],
): Promise<void> {
  const allowed = new Set(files);
  const directories = new Set<string>();
  for (const file of files) {
    let parent = dirname(file);
    while (parent !== '.') {
      directories.add(parent);
      parent = dirname(parent);
    }
  }
  const present = new Set<string>();
  async function inspect(current = ''): Promise<void> {
    for (const entry of await readdir(join(root, current), {
      withFileTypes: true,
    })) {
      const entryPath = current ? `${current}/${entry.name}` : entry.name;
      if (entry.isDirectory() && directories.has(entryPath))
        await inspect(entryPath);
      else if (entry.isFile() && allowed.has(entryPath)) present.add(entryPath);
      else
        throw new CliError(
          'Selected project recap package inventory is invalid.',
        );
    }
  }
  await inspect();
  if (files.some((file) => !present.has(file)))
    throw new CliError('Selected project recap package inventory is invalid.');
}

async function loadVerifiedProjectRecap(
  projectPath: string,
  projectRecapRun: string,
): Promise<{
  sourceRunRoot: string;
  manifestContents: string;
  manifest: ProjectRecapManifest;
  verifiedArtifactCount: number;
  packagePaths: string[];
}> {
  const sourceRunRoot = await resolveSelectedProjectRecapRun(
    projectPath,
    projectRecapRun,
  );
  const manifestContents = await readFile(
    join(sourceRunRoot, 'manifest.json'),
    'utf8',
  );
  const manifest = await parseProjectRecapManifest(manifestContents);
  if (manifest.recipe.id !== 'project-recap') {
    throw new CliError(
      'Selected project recap manifest recipe must be exactly `project-recap`.',
    );
  }
  if (
    ![
      'built',
      'built-needs-review',
      ...(manifest.schemaVersion === 'explainer-kit.manifest/v1'
        ? ['built-durable']
        : []),
    ].includes(manifest.outcome) ||
    manifest.artifacts.some((artifact) => artifact.status !== 'built')
  ) {
    throw new CliError(
      'Selected project recap must have a satisfied outcome and built artifacts.',
    );
  }
  const verifiedArtifactCount = await verifyProjectRecapImmutableHashes(
    sourceRunRoot,
    manifest,
  );
  if (manifest.schemaVersion === 'explainer-kit.manifest/v1') {
    const raw = JSON.parse(manifestContents) as {
      source: { authorResultPaths: string[] };
    };
    // July v1 hashes fact-base/theme canonical JSON identities separately
    // from immutableHashes' exact file-byte digests (captured writer contract).
    const canonicalize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(canonicalize);
      if (isRecord(value))
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonicalize(value[key])]),
        );
      return value;
    };
    const canonicalFileHash = async (file: string) =>
      sha256(
        JSON.stringify(
          canonicalize(
            JSON.parse(await readFile(join(sourceRunRoot, file), 'utf8')),
          ),
        ),
      );
    const required = [
      'run-request.json',
      'source/fact-base.json',
      'source/fact-base.md',
      'source/content-approval.json',
      'theme.resolved.json',
      ...raw.source.authorResultPaths,
      ...manifest.artifacts.flatMap((artifact) => [
        artifact.contentPath,
        artifact.renderedPath!,
      ]),
    ];
    if (
      required.some((file) => !(file in manifest.immutableHashes)) ||
      manifest.source.factBaseHash !==
        (await canonicalFileHash(manifest.source.factBasePath)) ||
      manifest.theme.hash !== (await canonicalFileHash(manifest.theme.path)) ||
      manifest.artifacts.some(
        (artifact) =>
          artifact.hash !== manifest.immutableHashes[artifact.renderedPath!],
      )
    ) {
      throw new CliError(
        'Selected legacy recap has incomplete immutable package hashes.',
      );
    }
    const packagePaths = [
      ...Object.keys(manifest.immutableHashes),
      'manifest.json',
      'build-record.json',
    ].sort();
    await verifyRecapInventory(sourceRunRoot, packagePaths);
    const record = JSON.parse(
      await readFile(join(sourceRunRoot, 'build-record.json'), 'utf8'),
    ) as { runId: string; outcome: string; schemaVersion: string };
    if (
      record.schemaVersion !== 'explainer-kit.build-record/v1' ||
      record.runId !== manifest.runId ||
      record.outcome !== manifest.outcome
    )
      throw new CliError(
        'Legacy recap build record identity does not match its manifest.',
      );
    return {
      sourceRunRoot,
      manifestContents,
      manifest,
      verifiedArtifactCount,
      packagePaths,
    };
  }
  const packageCoverage = await loadExplainerPackageCoverage();
  const missingCoverage = packageCoverage
    .requiredImmutablePackagePaths(manifest)
    .filter((relativePath) => !(relativePath in manifest.immutableHashes));
  if (missingCoverage.length > 0) {
    throw new CliError(
      `Selected project recap manifest immutable hashes do not cover the complete v2 package: ${missingCoverage.join(', ')}.`,
    );
  }
  try {
    await packageCoverage.validateImmutablePackageEvidence(manifest);
  } catch (error) {
    throw new CliError(
      `Selected project recap package evidence contract is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    manifest.source.factBaseHash !==
      manifest.immutableHashes[manifest.source.factBasePath] ||
    manifest.theme.hash !== manifest.immutableHashes[manifest.theme.path] ||
    manifest.artifacts.some(
      (artifact) =>
        artifact.hash !== manifest.immutableHashes[artifact.contentPath],
    )
  ) {
    throw new CliError(
      'Selected project recap artifact hashes do not match the immutable package.',
    );
  }
  const exactCoverage = packageCoverage as typeof packageCoverage &
    ExactRunPackageCoverage;
  if (
    typeof exactCoverage.permissibleRunPackagePaths !== 'function' ||
    typeof exactCoverage.enforceRunPackageInventory !== 'function'
  ) {
    throw new CliError(
      'Bundled explainer package coverage does not provide the exact run inventory.',
    );
  }
  try {
    await exactCoverage.enforceRunPackageInventory(sourceRunRoot, manifest);
  } catch {
    throw new CliError('Selected project recap package inventory is invalid.');
  }
  return {
    sourceRunRoot,
    manifestContents,
    manifest,
    verifiedArtifactCount,
    packagePaths: exactCoverage.permissibleRunPackagePaths(manifest),
  };
}

export async function verifySelectedProjectRecapForArchive(
  projectPath: string,
  projectRecapRun: string,
): Promise<void> {
  await loadVerifiedProjectRecap(projectPath, projectRecapRun);
}

function sha256(bytes: string | Buffer): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function transformRecapPage(
  html: string,
  sourcePage: string,
  sourceRunRoot: string,
  stagedRoot: string,
  exportPage: string,
  options: ArchiveProjectOnCompletionOptions,
): Promise<string> {
  const external = (url: string) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
  const resolveAssetPath = async (
    url: string,
    base: string,
  ): Promise<string> => {
    const assetPath = resolve(
      dirname(base),
      decodeURIComponent(url.split(/[?#]/)[0]!),
    );
    if (
      !isInsidePath(sourceRunRoot, assetPath) ||
      !isInsidePath(await realpath(sourceRunRoot), await realpath(assetPath))
    )
      throw new CliError(`Recap asset escapes its verified package: ${url}`);
    return assetPath;
  };
  const asset = async (url: string, base: string): Promise<string> => {
    if (external(url) || url.startsWith('#')) return url;
    const assetPath = await resolveAssetPath(url, base);
    const bytes = await readFile(
      join(stagedRoot, relative(sourceRunRoot, assetPath)),
    );
    const mime: Record<string, string> = {
      png: 'image/png',
      svg: 'image/svg+xml',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      woff: 'font/woff',
      woff2: 'font/woff2',
    };
    const type =
      mime[assetPath.split('.').pop() ?? ''] ?? 'application/octet-stream';
    return `data:${type};base64,${bytes.toString('base64')}`;
  };
  const replaceAsync = async (
    text: string,
    pattern: RegExp,
    callback: (match: RegExpExecArray) => Promise<string>,
  ) => {
    const matches = [...text.matchAll(pattern)];
    const replacements = await Promise.all(matches.map(callback));
    for (let index = matches.length - 1; index >= 0; index--) {
      const match = matches[index]!;
      text =
        text.slice(0, match.index) +
        replacements[index] +
        text.slice(match.index! + match[0].length);
    }
    return text;
  };
  const decodeCssUrl = (url: string) =>
    url.replace(
      /\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\n\r\f])?|\r\n|[\n\r\f]|([\s\S]))/gi,
      (_match, hex: string | undefined, escaped: string | undefined) => {
        if (hex === undefined) return escaped ?? '';
        const codePoint = Number.parseInt(hex, 16);
        return String.fromCodePoint(
          codePoint === 0 ||
            codePoint > 0x10ffff ||
            (codePoint >= 0xd800 && codePoint <= 0xdfff)
            ? 0xfffd
            : codePoint,
        );
      },
    );
  const quoteCssUrl = (url: string) =>
    `"${url.replace(/["\\<\p{Cc}]/gu, (character) =>
      character === '"' || character === '\\'
        ? `\\${character}`
        : `\\${character.charCodeAt(0).toString(16)} `,
    )}"`;
  const css = async (text: string, base: string) =>
    replaceAsync(
      text,
      // Consume CSS comments/strings before recognizing a resource URL. Text in
      // those bodies can describe markup or url(...) without referencing an asset.
      /\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|(?<![\w-])url\(\s*(?:"((?:\\[\s\S]|[^"\\])+)"|'((?:\\[\s\S]|[^'\\])+)'|((?:\\[\s\S]|[^)'"\\\s])+))\s*\)/gi,
      async (match) => {
        const url = match[1] ?? match[2] ?? match[3];
        return url === undefined
          ? match[0]
          : `url(${quoteCssUrl(await asset(decodeCssUrl(url), base))})`;
      },
    );
  // Match complete attributes, including unrelated quoted values. Looking only
  // for href/src would also find those strings inside title/data attributes.
  const attributePattern =
    /\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;
  const attributeValue = (match: RegExpExecArray) => {
    const value = match[2] ?? match[3] ?? match[4];
    return value === undefined ? undefined : decodeHTMLAttribute(value);
  };
  const emitAttribute = (name: string, value: string, quote = '"') =>
    ` ${name}=${quote}${value
      .replaceAll('&', '&amp;')
      .replaceAll(quote, quote === '"' ? '&quot;' : '&#39;')}${quote}`;
  const attributes = (tag: string) =>
    new Map(
      [...tag.matchAll(attributePattern)].map((match) => [
        match[1]!.toLowerCase(),
        attributeValue(match),
      ]),
    );
  const markup =
    /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\?[^>]*>|<[a-z][a-z0-9:-]*(?=[\s/>])(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  const rawText =
    /^(script|style|textarea|title|xmp|iframe|noembed|noframes|plaintext)$/;
  const fragmentTargets = new Set<string>();
  let targetMatch: RegExpExecArray | null;
  // Use the same markup/attribute readers for forward targets. Descriptions of
  // markup inside comments, attribute values, and raw-text bodies are not targets.
  while ((targetMatch = markup.exec(html))) {
    const name = /^<([a-z][a-z0-9:-]*)/i
      .exec(targetMatch[0])?.[1]
      ?.toLowerCase();
    if (!name) continue;
    const values = attributes(targetMatch[0]);
    for (const attribute of ['id', 'name']) {
      const value = values.get(attribute);
      if (value !== undefined) fragmentTargets.add(value);
    }
    if (rawText.test(name)) {
      const closing = new RegExp(`</${name}\\s*>`, 'gi');
      closing.lastIndex = markup.lastIndex;
      const end = name === 'plaintext' ? null : closing.exec(html);
      markup.lastIndex = end ? closing.lastIndex : html.length;
    }
  }
  const rewriteAttributes = async (tag: string, removeScriptSource = false) =>
    replaceAsync(tag, attributePattern, async (match) => {
      const name = match[1]!.toLowerCase();
      const url = attributeValue(match);
      if (url === undefined) return match[0];
      if (name === 'style') {
        const value = await css(url, sourcePage);
        if (value === url) return match[0];
        const quote = match[3] !== undefined ? "'" : '"';
        return emitAttribute(match[1]!, value, quote);
      }
      if (name !== 'href' && name !== 'src') return match[0];
      if (name === 'src' && removeScriptSource) return '';
      if (external(url)) return match[0];
      if (name === 'src') {
        const quote = match[3] !== undefined ? "'" : '"';
        return emitAttribute('src', await asset(url, sourcePage), quote);
      }
      const [pathname, fragment] = url.split('#');
      if (!pathname) {
        if (fragment && !fragmentTargets.has(fragment)) return '';
        return match[0];
      }
      const original = resolve(
        dirname(sourcePage),
        decodeURIComponent(pathname.split('?')[0]!),
      );
      if (original === sourcePage) {
        if (!fragment || !fragmentTargets.has(fragment)) return '';
        return emitAttribute('href', `#${fragment}`);
      }
      let target = original;
      if (
        original === resolve(options.projectPath, 'summary.md') &&
        options.summaryExportPath
      )
        target = resolve(
          options.repoRoot,
          options.summaryExportPath,
          `${basename(exportPage, '.html')}.md`,
        );
      const referenceRoot = resolve(options.repoRoot, '.oat/repo/reference');
      const preserved =
        isInsidePath(referenceRoot, target) &&
        !isInsidePath(resolve(referenceRoot, 'project-recaps'), target) &&
        (await fileExists(target));
      // This provisional link is removed from attempt-owned output if completion
      // cannot verify the summary export; an adopted page is never rewritten.
      const pendingSummary =
        original === resolve(options.projectPath, 'summary.md') &&
        Boolean(options.summaryExportPath) &&
        (await fileExists(original));
      if (!preserved && !pendingSummary) return '';
      if (fragment) {
        const contents = await readFile(preserved ? target : original, 'utf8');
        const anchors = [...contents.matchAll(/^#+\s+(.+)$/gm)].map((heading) =>
          heading[1]!
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-'),
        );
        if (
          !anchors.includes(fragment) &&
          !contents.includes(`id="${fragment}"`)
        )
          return '';
      }
      return emitAttribute(
        'href',
        `${relative(dirname(exportPage), target).split(sep).join('/')}${fragment ? `#${fragment}` : ''}`,
      );
    });

  // Walk markup once. Comments and raw-text elements are opaque to attribute
  // rewriting; generated script/style bodies are never fed back into the walk.
  let output = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  markup.lastIndex = 0;
  while ((match = markup.exec(html))) {
    output += html.slice(cursor, match.index);
    const tag = match[0];
    const name = /^<([a-z][a-z0-9:-]*)/i.exec(tag)?.[1]?.toLowerCase();
    cursor = markup.lastIndex;
    if (!name) {
      output += tag;
      continue;
    }
    const values = attributes(tag);
    if (name === 'link' && values.get('rel')?.toLowerCase() === 'stylesheet') {
      const url = values.get('href');
      if (url !== undefined && !external(url)) {
        const file = await resolveAssetPath(url, sourcePage);
        output += `<style>${await css(await readFile(join(stagedRoot, relative(sourceRunRoot, file)), 'utf8'), file)}</style>`;
        continue;
      }
    }
    if (rawText.test(name)) {
      const closing = new RegExp(`</${name}\\s*>`, 'gi');
      closing.lastIndex = cursor;
      const end = name === 'plaintext' ? null : closing.exec(html);
      let body = html.slice(cursor, end?.index ?? html.length);
      let inlineScript = false;
      const url = values.get('src');
      if (
        name === 'script' &&
        end &&
        !body.trim() &&
        url !== undefined &&
        !external(url)
      ) {
        const file = await resolveAssetPath(url, sourcePage);
        body = (
          await readFile(
            join(stagedRoot, relative(sourceRunRoot, file)),
            'utf8',
          )
        ).replace(/<\/script/gi, '<\\/script');
        inlineScript = true;
      } else if (name === 'style') {
        body = await css(body, sourcePage);
      }
      output +=
        (await rewriteAttributes(tag, inlineScript)) + body + (end?.[0] ?? '');
      cursor = end ? closing.lastIndex : html.length;
      markup.lastIndex = cursor;
    } else {
      output += await rewriteAttributes(tag);
    }
  }
  return output + html.slice(cursor);
}

async function cleanupOwnedRecapPath(
  target: string,
  identity: { dev: number; ino: number; birthtimeMs: number },
  removePath: NonNullable<ArchiveProjectOnCompletionDependencies['removePath']>,
  renamePath: typeof rename,
  expectedHash?: string,
): Promise<void> {
  if (!(await pathExists(target))) return;
  // Claim into a private, exclusively created namespace before inspecting bytes.
  // Other writers retain the original public pathname; deletion uses only our claim.
  const claimRoot = await mkdtemp(
    join(dirname(target), '.recap-cleanup-claim-'),
  );
  const claimedPath = join(claimRoot, basename(target));
  try {
    await renamePath(target, claimedPath);
  } catch (error) {
    await rm(claimRoot, { recursive: true, force: true });
    if (isRecord(error) && error.code === 'ENOENT') return;
    throw error;
  }
  const stat = await lstat(claimedPath);
  const owned =
    stat.dev === identity.dev &&
    stat.ino === identity.ino &&
    stat.birthtimeMs === identity.birthtimeMs &&
    (expectedHash === undefined
      ? stat.isDirectory()
      : stat.isFile() && sha256(await readFile(claimedPath)) === expectedHash);
  if (owned) {
    await removePath(claimedPath, { recursive: true, force: true });
    await rm(claimRoot, { recursive: true, force: true });
    return;
  }
  if (stat.isFile()) {
    try {
      // link is an atomic no-clobber restoration, even if a third writer arrives.
      await link(claimedPath, target);
    } catch (error) {
      throw new CliError(
        `Recap cleanup preserved foreign content at ${claimedPath}; refusing to overwrite ${target}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await rm(claimedPath);
    await rm(claimRoot, { recursive: true, force: true });
    return;
  }
  // Node has no portable atomic no-clobber rename for a directory. Keep its
  // bytes in the diagnostic claim rather than overwriting any new public path.
  throw new CliError(
    `Recap cleanup preserved a foreign replacement at ${claimedPath}; safe no-clobber directory restoration is unavailable for ${target}.`,
  );
}

async function removeAttemptRecapExport(
  attempt: AttemptProjectRecapExport | null,
  removePath: NonNullable<ArchiveProjectOnCompletionDependencies['removePath']>,
  renamePath: typeof rename,
): Promise<void> {
  if (!attempt?.createdByAttempt || !attempt.identity) return;
  await cleanupOwnedRecapPath(
    attempt.export.exportRoot,
    attempt.identity,
    removePath,
    renamePath,
    attempt.export.page.exportedSha256,
  );
}

async function exportSelectedProjectRecap(
  options: ArchiveProjectOnCompletionOptions,
  snapshotName: string,
  dependencies: ArchiveProjectOnCompletionDependencies,
): Promise<AttemptProjectRecapExport | null> {
  const selectedRun = options.projectRecapRun?.trim();
  if (!selectedRun) return null;
  const verified = await loadVerifiedProjectRecap(
    options.projectPath,
    selectedRun,
  );
  if (verified.manifest.artifacts.length !== 1)
    throw new CliError(
      'Selected project recap must declare exactly one rendered HTML page.',
    );
  const pagePath =
    verified.manifest.artifacts[0]!.renderedPath ??
    verified.manifest.artifacts[0]!.contentPath;
  if (!pagePath.startsWith('site/') || !pagePath.endsWith('.html'))
    throw new CliError(
      'Selected project recap must declare a rendered HTML page.',
    );
  const exportRoot = join(
    options.repoRoot,
    '.oat/repo/reference/project-recaps',
    `${snapshotName}.html`,
  );
  const temporaryRoot = `${exportRoot}.tmp-${randomUUID()}`;
  const makeDir = dependencies.ensureDir ?? ensureDir;
  const copyFile = dependencies.copySingleFile ?? copySingleFile;
  const removePath =
    dependencies.removePath ??
    (async (target, removeOptions) => rm(target, removeOptions));
  await makeDir(dirname(exportRoot));
  await mkdir(temporaryRoot);
  const temporaryIdentity = await lstat(temporaryRoot);
  try {
    // Stage and re-verify the complete source, even though only its page is exported.
    for (const file of verified.packagePaths) {
      await makeDir(dirname(join(temporaryRoot, file)));
      await copyFile(
        join(verified.sourceRunRoot, file),
        join(temporaryRoot, file),
      );
    }
    if (
      (await readFile(join(temporaryRoot, 'manifest.json'), 'utf8')) !==
      verified.manifestContents
    )
      throw new CliError(
        'Selected recap manifest changed while staging the export.',
      );
    await verifyProjectRecapImmutableHashes(temporaryRoot, verified.manifest);
    await verifyRecapInventory(temporaryRoot, verified.packagePaths);
    const original = await readFile(join(temporaryRoot, pagePath));
    const transformed = await transformRecapPage(
      original.toString('utf8'),
      join(verified.sourceRunRoot, pagePath),
      verified.sourceRunRoot,
      temporaryRoot,
      exportRoot,
      options,
    );
    const report: ArchiveProjectRecapExportV1 = {
      sourceRunRoot: verified.sourceRunRoot,
      exportRoot,
      runId: verified.manifest.runId,
      page: {
        sourceRelativePath: pagePath,
        originalSha256: sha256(original),
        exportedSha256: sha256(transformed),
      },
      verifiedArtifactCount: verified.verifiedArtifactCount,
    };
    if (await pathExists(exportRoot)) {
      const stat = await lstat(exportRoot);
      if (stat.isFile()) {
        const existingHash = sha256(await readFile(exportRoot));
        if (
          existingHash !== report.page.exportedSha256 &&
          options.summaryExportPath
        ) {
          // A warning-only completion may have published this verified package
          // without its unavailable summary link. Preserve that page on retry,
          // including when the summary destination has since been repaired.
          const withoutSummary = await transformRecapPage(
            original.toString('utf8'),
            join(verified.sourceRunRoot, pagePath),
            verified.sourceRunRoot,
            temporaryRoot,
            exportRoot,
            { ...options, summaryExportPath: null },
          );
          if (sha256(withoutSummary) === existingHash)
            report.page.exportedSha256 = existingHash;
        }
        if (existingHash === report.page.exportedSha256)
          return { export: report, createdByAttempt: false };
      }
      throw new CliError(
        `Existing project recap export ${exportRoot} already exists and does not match persisted snapshot ${snapshotName}.`,
      );
    }
    const temporaryPage = join(temporaryRoot, 'export.html');
    await writeFile(temporaryPage, transformed, { flag: 'wx' });
    // A hard-link promotion is atomic and refuses an intervening writer, unlike rename.
    await link(temporaryPage, exportRoot);
    const identity = await lstat(temporaryPage);
    return {
      export: report,
      createdByAttempt: true,
      identity: {
        dev: identity.dev,
        ino: identity.ino,
        birthtimeMs: identity.birthtimeMs,
      },
    };
  } finally {
    await cleanupOwnedRecapPath(
      temporaryRoot,
      temporaryIdentity,
      removePath,
      dependencies.renamePath ?? rename,
    );
  }
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
  const syncedRoot = resolveScopeRoot(
    options.repoRoot,
    options.projectsRoot,
    'synced',
  );
  const recordPath = syncedRecordPath(syncedRoot, options.projectName);
  const readRecord = dependencies.readSyncedRecord ?? readSyncedRecord;
  const writeRecord = dependencies.writeSyncedRecord ?? writeSyncedRecord;
  const { canonicalProjectPath, projectScope } =
    assertExactArchiveProjectRoot(options);
  const isSynced = projectScope === 'synced';
  const record = isSynced ? await readRecord(recordPath) : null;
  const syncTarget = isSynced
    ? buildSyncTarget(
        options.repoRoot,
        options.projectsRoot,
        options.projectName,
      )
    : null;
  let activeRecord: SyncedProjectRecord | null = record;
  const git = dependencies.gitRunner ?? defaultGitRunner;
  const recordlessIdentity =
    syncTarget && !activeRecord
      ? await resolveRecordlessSyncedArchiveIdentity(
          options,
          syncTarget,
          git,
          dependencies,
        )
      : null;
  let sourceRefSha: string | undefined;

  if (syncTarget) {
    if (recordlessIdentity) {
      sourceRefSha = recordlessIdentity.metadata.sourceRefSha;
    } else {
      const preflight = await (
        dependencies.preflightSyncedCheckout ?? preflightSyncedCheckout
      )(syncTarget, git);
      const isBoundTerminalRetry = Boolean(
        preflight.sha &&
        activeRecord?.archiveSourceRefSha === preflight.sha &&
        preflight.status === 'unpushed',
      );
      if (
        preflight.status !== 'clean' &&
        !(
          preflight.status === 'absent' &&
          (activeRecord?.status === 'complete' ||
            Boolean(activeRecord?.archiveSourceRefSha))
        ) &&
        !isBoundTerminalRetry
      ) {
        const recoveryCommand =
          preflight.status === 'absent'
            ? `oat project pull ${options.projectName}`
            : `oat project push ${options.projectName}`;
        throw new CliError(
          `Synced project ${options.projectName} is ${preflight.status}; run ${recoveryCommand} before archiving.`,
          1,
        );
      }
      sourceRefSha =
        preflight.sha ??
        activeRecord?.archiveSourceRefSha ??
        (
          await git.run(['rev-parse', syncTarget.ref], {
            cwd: options.repoRoot,
          })
        ).stdout;
    }
    if (!/^[0-9a-f]{40}$/.test(sourceRefSha)) {
      throw new CliError(
        `Unable to bind archive retry identity for ${options.projectName} to ${syncTarget.ref}.`,
        2,
      );
    }
    if (
      activeRecord?.archiveSourceRefSha &&
      activeRecord.archiveSourceRefSha !== sourceRefSha
    ) {
      throw new CliError(
        `Archive retry for ${options.projectName} is bound to source ref ${activeRecord.archiveSourceRefSha}, but ${syncTarget.ref} is now ${sourceRefSha}. Restore the retained ref to the recorded commit to finish this archive transaction, or preserve the existing snapshot and start a separately reviewed recovery; refusing to accept stale archive content.`,
        1,
      );
    }
  }

  const archiveTarget = await resolveArchiveProjectTarget(
    {
      repoRoot: options.repoRoot,
      projectsRoot: options.projectsRoot,
      projectName: options.projectName,
      ...((activeRecord?.archiveSnapshot ??
      recordlessIdentity?.metadata.snapshotName)
        ? {
            archiveSnapshot:
              activeRecord?.archiveSnapshot ??
              recordlessIdentity?.metadata.snapshotName,
            archiveScope: projectScope,
          }
        : {}),
    },
    dependencies,
  );
  assertDurableArchiveProjectTarget(archiveTarget);
  // Reassert the identity immediately before the first durable mutation. The
  // archive transaction must never bind a descendant source to a sibling
  // record/ref that merely shares its basename.
  if (
    assertExactArchiveProjectRoot(options).canonicalProjectPath !==
    canonicalProjectPath
  ) {
    throw new CliError(
      `Project path \`${options.projectPath}\` changed identity during archive preflight; refusing to mutate archive state.`,
      1,
    );
  }
  if (
    syncTarget &&
    canonicalProjectPath !== canonicalizePath(syncTarget.projectPath)
  ) {
    throw new CliError(
      `Synced archive identity for ${options.projectName} does not match its canonical checkout, record, and ref.`,
      1,
    );
  }
  const archivePath = archiveTarget.archivePath;
  const exportIdentity = syncTarget
    ? (activeRecord?.archiveSnapshot ??
      recordlessIdentity?.metadata.snapshotName ??
      snapshotName)
    : snapshotName;
  const snapshotId = syncTarget ? exportIdentity : basename(archivePath);

  const shouldPersistArchiveSnapshot = Boolean(
    syncTarget &&
    activeRecord &&
    (!activeRecord.archiveSnapshot || !activeRecord.archiveSourceRefSha),
  );
  if (shouldPersistArchiveSnapshot && activeRecord) {
    activeRecord = {
      ...activeRecord,
      archiveSnapshot: exportIdentity,
      archiveSourceRefSha: sourceRefSha,
    };
    await writeRecord(recordPath, activeRecord);
  }

  const archiveExists = await (dependencies.dirExists ?? dirExists)(
    archivePath,
  );
  if (archiveExists) {
    await verifyArchiveSnapshotMetadata(archivePath, {
      projectName: options.projectName,
      snapshotName: exportIdentity,
      scope: projectScope,
      ...(sourceRefSha ? { sourceRefSha } : {}),
    });
  }
  const projectSourcePath = (await pathExists(options.projectPath))
    ? options.projectPath
    : archivePath;
  let attemptedProjectRecapExport = await exportSelectedProjectRecap(
    { ...options, projectPath: projectSourcePath },
    exportIdentity,
    dependencies,
  );
  let projectRecapExport = attemptedProjectRecapExport?.export ?? null;

  if (!archiveExists) {
    try {
      await makeDir(dirname(archivePath));
      await copyProjectDirectory(
        options.projectPath,
        archivePath,
        (_sourcePath, relativePath) =>
          relativePath !== 'reviews' &&
          (!syncTarget || relativePath !== '.git'),
      );
      await writeArchiveSnapshotMetadata(archivePath, {
        projectName: options.projectName,
        snapshotName: exportIdentity,
        scope: projectScope,
        ...(sourceRefSha ? { sourceRefSha } : {}),
      });
    } catch (error) {
      await removePath(archivePath, { recursive: true, force: true });
      await removeAttemptRecapExport(
        attemptedProjectRecapExport,
        removePath,
        dependencies.renamePath ?? rename,
      );
      throw error;
    }
  }

  try {
    if (projectRecapExport && options.projectRecapRun) {
      const archivedRecap = await loadVerifiedProjectRecap(
        archivePath,
        options.projectRecapRun,
      );
      const archivedPage = projectRecapExport.page.sourceRelativePath;
      if (
        archivedRecap.manifest.runId !== projectRecapExport.runId ||
        sha256(
          await readFile(join(archivedRecap.sourceRunRoot, archivedPage)),
        ) !== projectRecapExport.page.originalSha256
      ) {
        throw new CliError(
          'Archived recap identity differs from the verified exported page.',
        );
      }
    }
    if (!syncTarget) {
      await removePath(options.projectPath, { recursive: true, force: true });
    }
  } catch (error) {
    await removeAttemptRecapExport(
      attemptedProjectRecapExport,
      removePath,
      dependencies.renamePath ?? rename,
    );
    throw error;
  }

  const warnings: string[] = [];

  let summaryExportFile: string | null = null;
  if (options.summaryExportPath) {
    try {
      summaryExportFile = await exportProjectSummary(
        archivePath,
        exportIdentity,
        options.summaryExportPath,
        options.repoRoot,
        dependencies,
        projectRecapExport,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const summaryFailure = `Summary export to \`${options.summaryExportPath}\` failed: ${message}`;
      if (syncTarget) {
        await removeAttemptRecapExport(
          attemptedProjectRecapExport,
          removePath,
          dependencies.renamePath ?? rename,
        );
        throw new CliError(summaryFailure, 1);
      }
      warnings.push(summaryFailure);
      if (attemptedProjectRecapExport) {
        // Rebuild only through the existing identity/hash-aware cleanup and
        // no-clobber publisher. Adopted or foreign linked output is preserved
        // and refused if it differs from the required link-free page.
        try {
          await removeAttemptRecapExport(
            attemptedProjectRecapExport,
            removePath,
            dependencies.renamePath ?? rename,
          );
          attemptedProjectRecapExport = await exportSelectedProjectRecap(
            { ...options, projectPath: archivePath, summaryExportPath: null },
            exportIdentity,
            dependencies,
          );
          projectRecapExport = attemptedProjectRecapExport?.export ?? null;
        } catch (repairError) {
          const repairMessage =
            repairError instanceof Error
              ? repairError.message
              : String(repairError);
          throw new CliError(
            `${summaryFailure}\nRecap repair without the summary link failed: ${repairMessage}\nRepair the summary destination \`${options.summaryExportPath}\` and retry archive completion.`,
            repairError instanceof CliError ? repairError.exitCode : 2,
          );
        }
      }
    }
  }

  let s3Path: string | null = null;
  if (options.s3Uri && options.s3SyncOnComplete) {
    const access = await ensureAccess(
      {
        mode: 'completion',
        s3Uri: options.s3Uri,
        syncOnComplete: options.s3SyncOnComplete,
        awsProfile: options.awsProfile,
        awsRegion: options.awsRegion,
      },
      {
        execFile,
        env: dependencies.env,
      },
    );
    warnings.push(...access.warnings);

    if (syncTarget && !access.ok) {
      throw new CliError(
        `Synced archive durability for ${options.projectName} requires the configured S3 upload to succeed before terminal cleanup. ${access.warnings.join(' ') || 'Archive S3 access could not be verified.'}`,
        1,
      );
    }

    if (access.ok) {
      const remoteRepoRoot = await resolvePrimaryRepoRoot(
        options.repoRoot,
        dependencies,
      );
      s3Path = buildProjectArchiveS3Uri(
        options.s3Uri,
        remoteRepoRoot,
        exportIdentity,
      );

      try {
        const syncArgs = ['s3', 'sync', archivePath, s3Path];
        for (const pattern of S3_ARCHIVE_SYNC_EXCLUDES) {
          syncArgs.push('--exclude', pattern);
        }
        await execFile('aws', syncArgs, {
          cwd: options.repoRoot,
          env: buildAwsEnv(dependencies.env ?? process.env, {
            awsProfile: options.awsProfile,
            awsRegion: options.awsRegion,
          }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (syncTarget) {
          throw new CliError(
            `Synced archive durability for ${options.projectName} requires the configured S3 upload to succeed before terminal cleanup: ${message}`,
            1,
          );
        }
        warnings.push(`Archive S3 sync to \`${s3Path}\` failed: ${message}`);
        s3Path = null;
      }
    }
  }

  let lifecycleCommit: string | null = null;
  let recapExportPaths: string[] = [];
  let terminalReceipt: SyncedRefRetirementReceipt | null = null;
  let recordRetired = false;
  if (syncTarget) {
    if (!sourceRefSha) {
      throw new CliError(
        `Synced project ${options.projectName} has no verified source SHA for terminal sealing.`,
        2,
      );
    }
    terminalReceipt = await (dependencies.retireSyncedRef ?? retireSyncedRef)(
      syncTarget,
      sourceRefSha,
      git,
    );
    if (
      terminalReceipt.state !== 'completed-only' &&
      terminalReceipt.state !== 'matching-aliases'
    ) {
      throw new CliError(
        `Synced project ${options.projectName} did not reach a verified terminal ref state.`,
        2,
      );
    }
    const removed = await (
      dependencies.removeSyncedCheckout ?? removeSyncedCheckout
    )(syncTarget, git, { force: true });
    if (removed.status !== 'removed' && removed.status !== 'absent') {
      throw new CliError(
        `Synced checkout became ${removed.status} during archive; run oat project push ${options.projectName} and retry.`,
        1,
      );
    }
    if (projectRecapExport) {
      recapExportPaths = [projectRecapExport.exportRoot];
    }
    await (dependencies.removeSyncedRecord
      ? dependencies.removeSyncedRecord(recordPath)
      : removePath(recordPath, { recursive: true, force: true }));
    recordRetired = true;
    if (options.commit !== false) {
      const pathspecs = [
        recordPath,
        ...(summaryExportFile ? [summaryExportFile] : []),
        ...recapExportPaths,
      ];
      const lifecycleStatus = await git.run(
        [
          'status',
          '--porcelain=v1',
          '--untracked-files=all',
          '--',
          ...pathspecs.map((pathspec) =>
            relative(
              canonicalizePath(resolve(options.repoRoot)),
              canonicalizePath(resolve(pathspec)),
            ),
          ),
        ],
        { cwd: options.repoRoot },
      );
      const committed =
        lifecycleStatus.stdout === ''
          ? null
          : await (dependencies.commitRecordChange ?? commitRecordChange)(
              options.repoRoot,
              pathspecs,
              `chore(oat): complete synced project ${options.projectName}`,
              git,
              {
                summaryExportPath: options.summaryExportPath,
                projectRoots: syncTarget,
                recapExportRoot: projectRecapExport?.exportRoot,
              },
            );
      lifecycleCommit =
        committed?.sha ??
        (await recoverSyncedLifecycleCommit(
          options.repoRoot,
          pathspecs,
          options.projectName,
          `chore(oat): complete synced project ${options.projectName}`,
          git,
        ));
      await dependencies.afterLifecycleCommit?.();
    }
  }

  return {
    archivePath,
    s3Path,
    summaryExportFile,
    projectRecapExport,
    warnings,
    lifecycleCommit,
    recapExportPaths,
    snapshotId,
    terminalReceipt,
    recordRetired,
  };
}

async function recoverSyncedLifecycleCommit(
  repoRoot: string,
  pathspecs: string[],
  projectName: string,
  expectedSubject: string,
  git: GitRunner,
): Promise<string> {
  const [recordPathspec] = pathspecs;
  if (!recordPathspec) {
    throw new CliError(
      `Unable to recover the prior lifecycle commit for ${projectName}: no lifecycle paths were supplied.`,
      2,
    );
  }
  const recordPath = relative(resolve(repoRoot), resolve(recordPathspec))
    .split(sep)
    .join('/');
  const normalizedPathspecs = pathspecs
    .map((pathspec) => relative(resolve(repoRoot), resolve(pathspec)))
    .map((pathspec) => pathspec.split(sep).join('/'))
    .sort();
  const candidate = (
    await git.run(['log', '-1', '--format=%H', '--', recordPath], {
      cwd: repoRoot,
    })
  ).stdout;
  if (!/^[0-9a-f]{40}$/.test(candidate)) {
    throw new CliError(
      `Unable to recover the prior lifecycle commit for ${projectName}.`,
      2,
    );
  }

  const subject = (
    await git.run(['show', '-s', '--format=%s', candidate], { cwd: repoRoot })
  ).stdout;
  const ancestor = await git.run(
    ['merge-base', '--is-ancestor', candidate, 'HEAD'],
    { cwd: repoRoot, allowFailure: true },
  );
  const changedPaths = (
    await git.run(
      ['diff-tree', '--no-commit-id', '--name-only', '-r', candidate],
      { cwd: repoRoot },
    )
  ).stdout
    .split('\n')
    .filter(Boolean)
    .sort();
  const contentsMatch = await git.run(
    ['diff', '--quiet', candidate, '--', ...normalizedPathspecs],
    { cwd: repoRoot, allowFailure: true },
  );
  const committedRecord = await git.run(
    ['show', `${candidate}:${recordPath}`],
    {
      cwd: repoRoot,
      allowFailure: true,
    },
  );

  if (
    subject !== expectedSubject ||
    ancestor.code !== 0 ||
    contentsMatch.code !== 0 ||
    JSON.stringify(changedPaths) !== JSON.stringify(normalizedPathspecs) ||
    committedRecord.code === 0
  ) {
    throw new CliError(
      `Unable to recover lifecycle commit ${candidate} for ${projectName}: subject, path set, record deletion, contents, or branch relationship did not match the completed archive transaction.`,
      2,
    );
  }

  return candidate;
}

export async function ensureS3ArchiveAccess(
  options: EnsureS3ArchiveAccessOptions,
  dependencies: EnsureS3ArchiveAccessDependencies = {},
): Promise<EnsureS3ArchiveAccessResult> {
  if (!requiresRemoteAccess(options)) {
    return { ok: true, warnings: [] };
  }

  const execFile = dependencies.execFile ?? execFileAsync;
  const execOptions = {
    env: buildAwsEnv(dependencies.env ?? process.env, {
      awsProfile: options.awsProfile,
      awsRegion: options.awsRegion,
    }),
  };

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
        'AWS CLI is required for `oat repo archive sync`, but it was not found on PATH. Install `aws` and retry.',
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
      'AWS CLI is required for `oat repo archive sync`, but it is not configured for access to `archive.s3Uri`. Configure AWS credentials or profile settings and retry.',
    );
  }
}
