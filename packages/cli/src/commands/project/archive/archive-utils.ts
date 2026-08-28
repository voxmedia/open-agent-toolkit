import { execFile as execFileCallback } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
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
} from '@commands/project/sync/ref-sync';
import {
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

import { loadExplainerPackageCoverage } from './explainer-package-coverage';
import {
  type ExplainerSourceBacklinks,
  loadExplainerSourceBacklinks,
} from './explainer-source-backlinks';
import { loadExplainerTerminalEvidence } from './explainer-terminal-evidence';

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
  commitRecordChange?: typeof commitRecordChange;
}

export interface ArchiveProjectRecapExportV1 {
  sourceRunRoot: string;
  exportRoot: string;
  manifest: {
    relativePath: 'manifest.json';
    verifiedArtifactCount: number;
  };
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
    actual.snapshotName !== expected.snapshotName
  ) {
    throw new CliError(
      `Existing archive \`${archivePath}\` does not match persisted snapshot \`${expected.snapshotName}\`; refusing to overwrite it.`,
    );
  }
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
  if (await pathExists(summaryTarget)) {
    const [sourceContents, targetContents] = await Promise.all([
      readFile(summarySource),
      readFile(summaryTarget),
    ]);
    if (!sourceContents.equals(targetContents)) {
      throw new CliError(
        `Existing summary export \`${summaryTarget}\` does not match persisted snapshot \`${snapshotName}\`; refusing to overwrite it.`,
      );
    }
    return summaryTarget;
  }
  await copySummary(summarySource, summaryTarget);
  return summaryTarget;
}

interface ProjectRecapManifest {
  schemaVersion: 'explainer-kit.manifest/v1';
  runId: string;
  slug: string;
  recipe: {
    id: string;
    version: string;
  };
  source: {
    factBasePath: string;
    factBaseHash: string;
    inputHashes: Record<string, string>;
    authorResultPaths?: string[];
    backlinks?: Array<{
      sourceId: string;
      url: string;
    }>;
  };
  theme: {
    path: string;
    hash: string;
  };
  artifacts: Array<{
    id: string;
    contentPath: string;
    renderedPath?: string;
    status: 'built' | 'failed' | 'skipped';
    hash?: string;
  }>;
  immutableHashes: Record<string, string>;
  outcome:
    | 'built-durable'
    | 'built-not-durable'
    | 'built-needs-review'
    | 'failed'
    | 'incomplete';
}

interface ExactRunPackageCoverage {
  permissibleRunPackagePaths: (
    manifest: ProjectRecapManifest,
    options?: { includeTerminalEvidence?: boolean },
  ) => string[];
  enforceRunPackageInventory: (
    runRoot: string,
    manifest: ProjectRecapManifest,
    options?: {
      includeTerminalEvidence?: boolean;
      removeUnexpected?: boolean;
    },
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

  const sourceBacklinks = await loadExplainerSourceBacklinks();
  if (!isProjectRecapManifestV1(value, sourceBacklinks)) {
    throw new CliError(
      'Selected project recap manifest does not match the explainer-kit manifest contract.',
    );
  }

  return value;
}

function isProjectRecapManifestV1(
  value: unknown,
  sourceBacklinks: ExplainerSourceBacklinks,
): value is ProjectRecapManifest &
  Record<string, unknown> & {
    source: ProjectRecapManifest['source'] & Record<string, unknown>;
    theme: ProjectRecapManifest['theme'] & Record<string, unknown>;
  } {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        'schemaVersion',
        'runId',
        'slug',
        'recipe',
        'createdAt',
        'source',
        'theme',
        'artifacts',
        'immutableHashes',
        'outcome',
        'buildRecord',
        'warnings',
      ],
      ['publishReceipt'],
    ) ||
    value.schemaVersion !== 'explainer-kit.manifest/v1' ||
    !isNonEmptyString(value.runId) ||
    typeof value.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ||
    !isDateTime(value.createdAt) ||
    !isRecord(value.recipe) ||
    !hasExactKeys(value.recipe, ['id', 'version']) ||
    !isNonEmptyString(value.recipe.id) ||
    !isNonEmptyString(value.recipe.version) ||
    !isRecord(value.source) ||
    !hasExactKeys(
      value.source,
      ['factBasePath', 'factBaseHash', 'inputHashes'],
      ['sourceRevision', 'authorResultPaths', 'backlinks'],
    ) ||
    !isSafeRelativePath(value.source.factBasePath) ||
    !isSha256(value.source.factBaseHash) ||
    !isHashMap(value.source.inputHashes) ||
    (value.source.authorResultPaths !== undefined &&
      !isUniqueSafePathArray(value.source.authorResultPaths)) ||
    (value.source.backlinks !== undefined &&
      !isCanonicalSourceBacklinks(value.source.backlinks, sourceBacklinks)) ||
    (value.source.sourceRevision !== undefined &&
      !isNonEmptyString(value.source.sourceRevision)) ||
    !isRecord(value.theme) ||
    !hasExactKeys(value.theme, ['path', 'hash', 'derived']) ||
    value.theme.path !== 'theme.resolved.json' ||
    !isSha256(value.theme.hash) ||
    typeof value.theme.derived !== 'boolean' ||
    !Array.isArray(value.artifacts) ||
    !value.artifacts.every(isManifestArtifact) ||
    new Set(value.artifacts.map((artifact) => JSON.stringify(artifact)))
      .size !== value.artifacts.length ||
    !isHashMap(value.immutableHashes) ||
    ![
      'built-durable',
      'built-not-durable',
      'built-needs-review',
      'failed',
      'incomplete',
    ].includes(String(value.outcome)) ||
    !isPathHashRecord(value.buildRecord, 'build-record.json') ||
    (value.publishReceipt !== undefined &&
      !isPathHashRecord(value.publishReceipt, 'publish-receipt.json')) ||
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
    !hasExactKeys(
      value,
      ['id', 'type', 'contentPath', 'status', 'rebuildable'],
      [
        'renderedPath',
        'mediaType',
        'hash',
        'rebuild',
        'durableEvidence',
        'failure',
      ],
    ) ||
    !isNonEmptyString(value.id) ||
    !['hub', 'diagram', 'explainer', 'deck', 'catalog'].includes(
      String(value.type),
    ) ||
    !isSafeRelativePath(value.contentPath) ||
    !['built', 'failed', 'skipped'].includes(String(value.status)) ||
    typeof value.rebuildable !== 'boolean' ||
    (value.renderedPath !== undefined &&
      (!isSafeRelativePath(value.renderedPath) ||
        !value.renderedPath.startsWith('site/'))) ||
    (value.mediaType !== undefined && !isNonEmptyString(value.mediaType)) ||
    (value.hash !== undefined && !isSha256(value.hash)) ||
    (value.status === 'built' && !isSha256(value.hash)) ||
    (value.rebuildable === true && !isRebuildRecord(value.rebuild)) ||
    (value.rebuild !== undefined && !isRebuildRecord(value.rebuild)) ||
    (value.durableEvidence !== undefined &&
      (!Array.isArray(value.durableEvidence) ||
        !value.durableEvidence.every(isDurableEvidence))) ||
    (value.failure !== undefined && !isFailureRecord(value.failure))
  ) {
    return false;
  }
  return true;
}

function isRebuildRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['argv', 'cwd', 'inputHashes']) &&
    Array.isArray(value.argv) &&
    value.argv.length > 0 &&
    value.argv.every((argument) => typeof argument === 'string') &&
    isNonEmptyString(value.cwd) &&
    isHashMap(value.inputHashes)
  );
}

function isDurableEvidence(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(
      value,
      ['kind', 'ref', 'paths', 'attestedAt'],
      ['supersedes'],
    ) &&
    ['commit', 'publish'].includes(String(value.kind)) &&
    isNonEmptyString(value.ref) &&
    isUniqueSafePathArray(value.paths) &&
    isDateTime(value.attestedAt) &&
    (value.supersedes === undefined ||
      (isRecord(value.supersedes) &&
        hasExactKeys(value.supersedes, ['ref', 'paths']) &&
        isNonEmptyString(value.supersedes.ref) &&
        isUniqueSafePathArray(value.supersedes.paths)))
  );
}

function isFailureRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['code', 'message', 'recovery']) &&
    isNonEmptyString(value.code) &&
    isNonEmptyString(value.message) &&
    Array.isArray(value.recovery) &&
    value.recovery.length > 0 &&
    value.recovery.every(isNonEmptyString)
  );
}

function isPathHashRecord(value: unknown, expectedPath: string): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['path', 'hash']) &&
    value.path === expectedPath &&
    isSha256(value.hash)
  );
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

function isCanonicalSourceBacklinks(
  value: unknown,
  sourceBacklinks: ExplainerSourceBacklinks,
): value is NonNullable<ProjectRecapManifest['source']['backlinks']> {
  if (!Array.isArray(value)) {
    return false;
  }
  const identities = new Set<string>();
  for (const backlink of value) {
    if (
      !isRecord(backlink) ||
      !hasExactKeys(backlink, ['sourceId', 'url']) ||
      !isNonEmptyString(backlink.sourceId) ||
      typeof backlink.url !== 'string'
    ) {
      return false;
    }
    try {
      sourceBacklinks.parseCanonicalGithubBlobUrl(backlink.url);
    } catch {
      return false;
    }
    const identity = `${backlink.sourceId}\0${backlink.url}`;
    if (identities.has(identity)) {
      return false;
    }
    identities.add(identity);
  }
  return true;
}

function isUniqueSafePathArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isSafeRelativePath) &&
    new Set(value).size === value.length
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

async function readVerifiedRunMode(
  runRoot: string,
): Promise<'interactive' | 'unattended'> {
  let request: unknown;
  try {
    request = JSON.parse(
      await readFile(join(runRoot, 'run-request.json'), 'utf8'),
    );
  } catch {
    throw new CliError(
      'Hash-verified project recap run-request.json must contain valid JSON.',
    );
  }
  if (
    !isRecord(request) ||
    (request.mode !== 'interactive' && request.mode !== 'unattended')
  ) {
    throw new CliError(
      'Hash-verified project recap run-request.json must declare interactive or unattended mode.',
    );
  }
  return request.mode;
}

async function verifyProjectRecapTerminalEvidence(
  runRoot: string,
  manifest: ProjectRecapManifest,
  expected?: { bytes: Uint8Array; hash: string },
): Promise<{ bytes: Buffer; hash: string } | null> {
  if (!['built-needs-review', 'failed'].includes(manifest.outcome)) {
    return null;
  }
  try {
    const terminalEvidence = await loadExplainerTerminalEvidence();
    const verified = await terminalEvidence.readTerminalEvidenceFile(runRoot, {
      manifest,
      ...(expected && {
        expectedBytes: expected.bytes,
        expectedHash: expected.hash,
      }),
    });
    return { bytes: verified.bytes, hash: verified.hash };
  } catch {
    throw new CliError(
      'Selected project recap requires valid confined terminal evidence before archival.',
    );
  }
}

async function loadVerifiedProjectRecap(
  projectPath: string,
  projectRecapRun: string,
): Promise<{
  sourceRunRoot: string;
  manifestContents: string;
  manifest: ProjectRecapManifest;
  verifiedArtifactCount: number;
  terminalEvidence: { bytes: Buffer; hash: string } | null;
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
  const verifiedArtifactCount = await verifyProjectRecapImmutableHashes(
    sourceRunRoot,
    manifest,
  );
  const runMode = await readVerifiedRunMode(sourceRunRoot);
  const packageCoverage = await loadExplainerPackageCoverage();
  const missingCoverage = packageCoverage
    .requiredImmutablePackagePaths(manifest, { runMode })
    .filter((relativePath) => !(relativePath in manifest.immutableHashes));
  const missingLegacyCoverage = missingCoverage.filter((relativePath) =>
    ['run-request.json', 'source/content-approval.json'].includes(relativePath),
  );
  if (missingLegacyCoverage.length > 0) {
    throw new CliError(
      `Selected project recap uses a legacy manifest missing immutable coverage for ${missingLegacyCoverage.join(', ')}; regenerate the recap package before archival.`,
    );
  }
  if (
    missingCoverage.some(
      (relativePath) =>
        relativePath.startsWith('qa/browser/') ||
        relativePath.startsWith('qa/visual-review/'),
    )
  ) {
    throw new CliError(
      'Selected project recap manifest has an incomplete visual-review evidence chain.',
    );
  }
  if (missingCoverage.length > 0) {
    throw new CliError(
      `Selected project recap manifest immutable hashes do not cover the complete v2 package: ${missingCoverage.join(', ')}.`,
    );
  }
  try {
    await packageCoverage.validateImmutablePackageEvidence(manifest, {
      runMode,
      read: (relativePath) => readFile(join(sourceRunRoot, relativePath)),
    });
  } catch (error) {
    throw new CliError(
      `Selected project recap browser evidence contract is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    manifest.artifacts.some(
      (artifact) =>
        artifact.status === 'built' &&
        typeof artifact.renderedPath === 'string' &&
        artifact.hash !== manifest.immutableHashes[artifact.renderedPath],
    )
  ) {
    throw new CliError(
      'Selected project recap artifact hashes do not match the immutable package.',
    );
  }
  const terminalEvidence = await verifyProjectRecapTerminalEvidence(
    sourceRunRoot,
    manifest,
  );
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
    await exactCoverage.enforceRunPackageInventory(sourceRunRoot, manifest, {
      includeTerminalEvidence: terminalEvidence !== null,
    });
  } catch {
    throw new CliError('Selected project recap package inventory is invalid.');
  }
  return {
    sourceRunRoot,
    manifestContents,
    manifest,
    verifiedArtifactCount,
    terminalEvidence,
    packagePaths: exactCoverage.permissibleRunPackagePaths(manifest, {
      includeTerminalEvidence: terminalEvidence !== null,
    }),
  };
}

export async function verifySelectedProjectRecapForArchive(
  projectPath: string,
  projectRecapRun: string,
): Promise<void> {
  await loadVerifiedProjectRecap(projectPath, projectRecapRun);
}

async function exportSelectedProjectRecap(
  options: ArchiveProjectOnCompletionOptions,
  snapshotName: string,
  dependencies: ArchiveProjectOnCompletionDependencies,
): Promise<ArchiveProjectRecapExportV1 | null> {
  const selectedRun = options.projectRecapRun?.trim();
  if (!selectedRun) {
    return null;
  }

  const verified = await loadVerifiedProjectRecap(
    options.projectPath,
    selectedRun,
  );
  const {
    sourceRunRoot,
    manifestContents: sourceManifestContents,
    terminalEvidence: sourceTerminalEvidence,
    packagePaths,
  } = verified;

  const exportRoot = join(
    options.repoRoot,
    '.oat',
    'repo',
    'reference',
    'project-recaps',
    snapshotName,
  );
  if (await pathExists(exportRoot)) {
    let exportedManifestContents: string;
    try {
      exportedManifestContents = await readFile(
        join(exportRoot, 'manifest.json'),
        'utf8',
      );
    } catch {
      throw new CliError(
        `Project recap export destination \`${exportRoot}\` already exists and cannot be verified for retry.`,
      );
    }
    if (exportedManifestContents !== sourceManifestContents) {
      throw new CliError(
        `Existing project recap export \`${exportRoot}\` does not match persisted snapshot \`${snapshotName}\`.`,
      );
    }
    const exportedManifest = await parseProjectRecapManifest(
      exportedManifestContents,
    );
    const verifiedArtifactCount = await verifyProjectRecapImmutableHashes(
      exportRoot,
      exportedManifest,
    );
    await verifyProjectRecapTerminalEvidence(
      exportRoot,
      exportedManifest,
      sourceTerminalEvidence ?? undefined,
    );
    const exactCoverage = (await loadExplainerPackageCoverage()) as Awaited<
      ReturnType<typeof loadExplainerPackageCoverage>
    > &
      ExactRunPackageCoverage;
    try {
      await exactCoverage.enforceRunPackageInventory(
        exportRoot,
        exportedManifest,
        { includeTerminalEvidence: sourceTerminalEvidence !== null },
      );
    } catch {
      throw new CliError(
        `Existing project recap export \`${exportRoot}\` has invalid content.`,
      );
    }
    return {
      sourceRunRoot,
      exportRoot,
      manifest: {
        relativePath: 'manifest.json',
        verifiedArtifactCount,
      },
    };
  }

  const temporaryRoot = `${exportRoot}.tmp-${randomUUID()}`;
  const makeDir = dependencies.ensureDir ?? ensureDir;
  const copyFile = dependencies.copySingleFile ?? copySingleFile;
  const removePath =
    dependencies.removePath ??
    (async (target, removeOptions) => rm(target, removeOptions));
  const renamePath = dependencies.renamePath ?? rename;

  await makeDir(dirname(exportRoot));
  try {
    for (const relativePath of packagePaths) {
      const destination = join(temporaryRoot, relativePath);
      await makeDir(dirname(destination));
      await copyFile(join(sourceRunRoot, relativePath), destination);
    }
    const stagedManifestContents = await readFile(
      join(temporaryRoot, 'manifest.json'),
      'utf8',
    );
    if (stagedManifestContents !== sourceManifestContents) {
      throw new CliError(
        'Selected project recap manifest changed while staging the export.',
      );
    }
    const stagedManifest = await parseProjectRecapManifest(
      stagedManifestContents,
    );
    const verifiedArtifactCount = await verifyProjectRecapImmutableHashes(
      temporaryRoot,
      stagedManifest,
    );
    const stagedTerminalEvidence = await verifyProjectRecapTerminalEvidence(
      temporaryRoot,
      stagedManifest,
      sourceTerminalEvidence ?? undefined,
    );
    const exactCoverage = (await loadExplainerPackageCoverage()) as Awaited<
      ReturnType<typeof loadExplainerPackageCoverage>
    > &
      ExactRunPackageCoverage;
    try {
      await exactCoverage.enforceRunPackageInventory(
        temporaryRoot,
        stagedManifest,
        {
          includeTerminalEvidence: stagedTerminalEvidence !== null,
        },
      );
    } catch {
      throw new CliError('Staged project recap package inventory is invalid.');
    }
    await renamePath(temporaryRoot, exportRoot);

    return {
      sourceRunRoot,
      exportRoot,
      manifest: {
        relativePath: 'manifest.json',
        verifiedArtifactCount,
      },
    };
  } catch (error) {
    await removePath(temporaryRoot, { recursive: true, force: true });
    throw error;
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
  const projectScope = resolveProjectScope(
    options.projectPath,
    options.projectsRoot,
  );
  if (!projectScope) {
    throw new CliError(
      `Project path \`${options.projectPath}\` is outside the configured shared, local, and synced scope roots; refusing to archive without an originating scope.`,
      2,
    );
  }
  const isSynced = projectScope === 'synced';
  const record = isSynced ? await readRecord(recordPath) : null;
  const syncTarget = isSynced
    ? buildSyncTarget(
        options.repoRoot,
        options.projectsRoot,
        options.projectName,
      )
    : null;
  const git = dependencies.gitRunner ?? defaultGitRunner;
  let activeRecord: SyncedProjectRecord | null = record;

  if (syncTarget) {
    if (!activeRecord) {
      throw new CliError(
        `Synced project ${options.projectName} is missing its discovery record; restore the record or run oat project pull ${options.projectName} from a clean checkout to adopt the project before archiving.`,
        2,
      );
    }
    const preflight = await (
      dependencies.preflightSyncedCheckout ?? preflightSyncedCheckout
    )(syncTarget, git);
    if (
      preflight.status !== 'clean' &&
      !(preflight.status === 'absent' && activeRecord.status === 'complete')
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
  }

  const archiveTarget = await resolveArchiveProjectTarget(
    {
      repoRoot: options.repoRoot,
      projectsRoot: options.projectsRoot,
      projectName: options.projectName,
      ...(activeRecord?.archiveSnapshot
        ? {
            archiveSnapshot: activeRecord.archiveSnapshot,
            archiveScope: projectScope,
          }
        : {}),
    },
    dependencies,
  );
  assertDurableArchiveProjectTarget(archiveTarget);
  const archivePath = archiveTarget.archivePath;
  const exportIdentity = syncTarget
    ? (activeRecord?.archiveSnapshot ?? snapshotName)
    : snapshotName;
  const snapshotId = syncTarget ? exportIdentity : basename(archivePath);

  const shouldPersistArchiveSnapshot = Boolean(
    syncTarget && activeRecord && !activeRecord.archiveSnapshot,
  );
  if (shouldPersistArchiveSnapshot && activeRecord) {
    activeRecord = { ...activeRecord, archiveSnapshot: exportIdentity };
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
    });
  }
  const projectSourcePath = (await pathExists(options.projectPath))
    ? options.projectPath
    : archivePath;
  const projectRecapExport = await exportSelectedProjectRecap(
    { ...options, projectPath: projectSourcePath },
    exportIdentity,
    dependencies,
  );

  try {
    if (!archiveExists) {
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
      });
    }
    if (!syncTarget) {
      await removePath(options.projectPath, { recursive: true, force: true });
    }
  } catch (error) {
    if (projectRecapExport) {
      await removePath(projectRecapExport.exportRoot, {
        recursive: true,
        force: true,
      });
    }
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
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (syncTarget) {
        throw new CliError(
          `Summary export to \`${options.summaryExportPath}\` failed: ${message}`,
          1,
        );
      }
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
        awsProfile: options.awsProfile,
        awsRegion: options.awsRegion,
      },
      {
        execFile,
        env: dependencies.env,
      },
    );
    warnings.push(...access.warnings);

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
        warnings.push(`Archive S3 sync to \`${s3Path}\` failed: ${message}`);
        s3Path = null;
      }
    }
  }

  let lifecycleCommit: string | null = null;
  let recapExportPaths: string[] = [];
  if (syncTarget) {
    if (!activeRecord) {
      throw new CliError(
        `Synced project ${options.projectName} is missing its discovery record.`,
        2,
      );
    }
    if (projectRecapExport) {
      recapExportPaths = (
        await listArchiveExportFiles(projectRecapExport.exportRoot)
      ).filter(
        (filePath) =>
          basename(filePath) !== 'manifest.json' &&
          basename(filePath) !== 'build-record.json',
      );
    }
    activeRecord = {
      ...activeRecord,
      status: 'complete',
      completedAt: activeRecord.completedAt ?? timestamp,
    };
    await writeRecord(recordPath, activeRecord);
    if (options.commit !== false) {
      const pathspecs = [
        recordPath,
        ...(summaryExportFile ? [summaryExportFile] : []),
        ...recapExportPaths,
      ];
      const committed = await (
        dependencies.commitRecordChange ?? commitRecordChange
      )(
        options.repoRoot,
        pathspecs,
        `chore(oat): complete synced project ${options.projectName}`,
        git,
        {
          summaryExportPath: options.summaryExportPath,
          additionalAllowlistedPaths: recapExportPaths,
        },
      );
      lifecycleCommit =
        committed?.sha ??
        (await recoverSyncedLifecycleCommit(
          options.repoRoot,
          pathspecs,
          activeRecord,
          `chore(oat): complete synced project ${options.projectName}`,
          git,
        ));
    }
    const removed = await (
      dependencies.removeSyncedCheckout ?? removeSyncedCheckout
    )(syncTarget, git);
    if (removed.status !== 'removed' && removed.status !== 'absent') {
      throw new CliError(
        `Synced checkout became ${removed.status} during archive; run oat project push ${options.projectName} and retry.`,
        1,
      );
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
  };
}

async function recoverSyncedLifecycleCommit(
  repoRoot: string,
  pathspecs: string[],
  record: SyncedProjectRecord,
  expectedSubject: string,
  git: GitRunner,
): Promise<string> {
  const [recordPathspec] = pathspecs;
  if (!recordPathspec) {
    throw new CliError(
      `Unable to recover the prior lifecycle commit for ${record.slug}: no lifecycle paths were supplied.`,
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
      `Unable to recover the prior lifecycle commit for ${record.slug}.`,
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
    { cwd: repoRoot },
  );
  let parsedRecord: unknown;
  try {
    parsedRecord = JSON.parse(committedRecord.stdout);
  } catch {
    parsedRecord = null;
  }

  if (
    subject !== expectedSubject ||
    ancestor.code !== 0 ||
    contentsMatch.code !== 0 ||
    JSON.stringify(changedPaths) !== JSON.stringify(normalizedPathspecs) ||
    JSON.stringify(parsedRecord) !== JSON.stringify(record)
  ) {
    throw new CliError(
      `Unable to recover lifecycle commit ${candidate} for ${record.slug}: subject, path set, contents, or branch relationship did not match the completed archive transaction.`,
      2,
    );
  }

  return candidate;
}

async function listArchiveExportFiles(
  root: string,
  current = root,
): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(current, entry.name);
      return entry.isDirectory()
        ? listArchiveExportFiles(root, entryPath)
        : [entryPath];
    }),
  );
  return files.flat().sort();
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
