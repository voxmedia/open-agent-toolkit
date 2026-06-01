import { execFile as execFileCallback } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { join, posix as path } from 'node:path';
import { promisify } from 'node:util';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { type OatConfig, readOatConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';

import {
  ARCHIVE_SNAPSHOT_METADATA_FILENAME,
  S3_ARCHIVE_SYNC_EXCLUDES,
  buildAwsEnv,
  buildProjectArchiveS3Uri,
  buildRepoArchiveS3Uri,
  ensureS3ArchiveAccess,
  type ExecFileLike,
  parseArchiveSnapshotName,
  resolveLocalArchiveProjectPath,
  resolvePrimaryRepoRoot,
} from './archive-utils';

const execFileAsync = promisify(execFileCallback);

export interface ArchiveSyncOptions {
  dryRun?: boolean;
  force?: boolean;
  profile?: string;
  region?: string;
}

export interface ProjectArchiveCommandDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  ensureS3ArchiveAccess: typeof ensureS3ArchiveAccess;
  buildRepoArchiveS3Uri: typeof buildRepoArchiveS3Uri;
  buildProjectArchiveS3Uri: typeof buildProjectArchiveS3Uri;
  resolveLocalArchiveProjectPath: typeof resolveLocalArchiveProjectPath;
  resolvePrimaryRepoRoot: typeof resolvePrimaryRepoRoot;
  execFile: ExecFileLike;
  removeDirectory: typeof rm;
  processEnv: NodeJS.ProcessEnv;
}

export function defaultProjectArchiveCommandDependencies(): ProjectArchiveCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    readOatConfig,
    resolveProjectsRoot,
    ensureS3ArchiveAccess,
    buildRepoArchiveS3Uri,
    buildProjectArchiveS3Uri,
    resolveLocalArchiveProjectPath,
    resolvePrimaryRepoRoot,
    execFile: execFileAsync,
    removeDirectory: rm,
    processEnv: process.env,
  };
}

export function resolveLocalArchiveRoot(projectsRoot: string): string {
  return path.join(path.dirname(projectsRoot.replace(/\/+$/, '')), 'archived');
}

export function resolveSyncAwsEnv(
  processEnv: NodeJS.ProcessEnv,
  options: ArchiveSyncOptions,
  config: OatConfig,
): {
  env: NodeJS.ProcessEnv;
  awsProfile: string | undefined;
  awsRegion: string | undefined;
} {
  const flagProfile =
    typeof options.profile === 'string' && options.profile.trim().length > 0
      ? options.profile.trim()
      : undefined;
  const flagRegion =
    typeof options.region === 'string' && options.region.trim().length > 0
      ? options.region.trim()
      : undefined;

  const configProfile = config.archive?.awsProfile;
  const configRegion = config.archive?.awsRegion;

  const awsProfile = flagProfile ?? configProfile ?? undefined;
  const awsRegion = flagRegion ?? configRegion ?? undefined;

  const env = buildAwsEnv(processEnv, {
    awsProfile,
    awsRegion,
  });

  return { env, awsProfile, awsRegion };
}

export function buildArchiveSyncArgs(
  source: string,
  target: string,
  options: ArchiveSyncOptions,
): string[] {
  const args = ['s3', 'sync', source, target];

  for (const pattern of S3_ARCHIVE_SYNC_EXCLUDES) {
    args.push('--exclude', pattern);
  }

  if (options.dryRun) {
    args.push('--dryrun');
  }

  return args;
}

export async function runArchiveSync(
  repoRoot: string,
  source: string,
  target: string,
  options: ArchiveSyncOptions,
  awsEnv: NodeJS.ProcessEnv,
  dependencies: ProjectArchiveCommandDependencies,
): Promise<void> {
  await dependencies.execFile(
    'aws',
    buildArchiveSyncArgs(source, target, options),
    {
      cwd: repoRoot,
      env: awsEnv,
    },
  );
}

export interface ArchiveSnapshotEntry {
  dateStamp: string | null;
  projectName: string;
  snapshotName: string;
  source: string;
  target: string;
}

export async function listArchiveSnapshots(
  repoRoot: string,
  projectsRoot: string,
  s3Uri: string,
  awsEnv: NodeJS.ProcessEnv,
  dependencies: ProjectArchiveCommandDependencies,
): Promise<ArchiveSnapshotEntry[]> {
  const remoteRepoRoot = await dependencies.resolvePrimaryRepoRoot(repoRoot, {
    gitExecFile: dependencies.execFile,
    env: awsEnv,
  });
  const repoPrefix = `${dependencies.buildRepoArchiveS3Uri(
    s3Uri,
    remoteRepoRoot,
  )}/`;
  const { stdout } = await dependencies.execFile(
    'aws',
    ['s3', 'ls', repoPrefix],
    {
      cwd: repoRoot,
      env: awsEnv,
    },
  );

  return stdout
    .split('\n')
    .map((line) => line.match(/PRE\s+(.+?)\/?\s*$/)?.[1] ?? null)
    .filter((snapshotName): snapshotName is string => Boolean(snapshotName))
    .map((snapshotName) => {
      const parsed = parseArchiveSnapshotName(snapshotName);
      return {
        ...parsed,
        source: dependencies.buildProjectArchiveS3Uri(
          s3Uri,
          remoteRepoRoot,
          snapshotName,
        ),
        target: dependencies.resolveLocalArchiveProjectPath(
          projectsRoot,
          parsed.projectName,
        ),
      };
    });
}

export function compareSnapshotEntries(
  left: ArchiveSnapshotEntry,
  right: ArchiveSnapshotEntry,
): number {
  if (left.dateStamp && right.dateStamp && left.dateStamp !== right.dateStamp) {
    return left.dateStamp.localeCompare(right.dateStamp);
  }

  if (left.dateStamp && !right.dateStamp) {
    return 1;
  }

  if (!left.dateStamp && right.dateStamp) {
    return -1;
  }

  return left.snapshotName.localeCompare(right.snapshotName);
}

export function selectLatestSnapshots(
  snapshots: ArchiveSnapshotEntry[],
): ArchiveSnapshotEntry[] {
  const latestByProject = new Map<string, ArchiveSnapshotEntry>();

  for (const snapshot of snapshots) {
    const current = latestByProject.get(snapshot.projectName);
    if (!current || compareSnapshotEntries(snapshot, current) > 0) {
      latestByProject.set(snapshot.projectName, snapshot);
    }
  }

  return [...latestByProject.values()];
}

export async function readLocalSnapshotName(
  repoRoot: string,
  target: string,
): Promise<string | null> {
  try {
    const content = await readFile(
      join(repoRoot, target, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
      'utf8',
    );
    const parsed = JSON.parse(content) as { snapshotName?: unknown };
    return typeof parsed.snapshotName === 'string' ? parsed.snapshotName : null;
  } catch {
    return null;
  }
}

export async function syncArchiveSnapshot(
  repoRoot: string,
  snapshot: ArchiveSnapshotEntry,
  options: ArchiveSyncOptions,
  awsEnv: NodeJS.ProcessEnv,
  dependencies: ProjectArchiveCommandDependencies,
): Promise<boolean> {
  const currentSnapshotName = await readLocalSnapshotName(
    repoRoot,
    snapshot.target,
  );

  if (!options.force && currentSnapshotName === snapshot.snapshotName) {
    return false;
  }

  if (!options.dryRun) {
    await dependencies.removeDirectory(join(repoRoot, snapshot.target), {
      recursive: true,
      force: true,
    });
  }

  await runArchiveSync(
    repoRoot,
    snapshot.source,
    snapshot.target,
    options,
    awsEnv,
    dependencies,
  );
  return true;
}

export async function runArchiveSyncCommand(
  dependencies: ProjectArchiveCommandDependencies,
  projectName: string | undefined,
  options: ArchiveSyncOptions,
  context: CommandContext,
  commandLabel = 'oat repo archive sync',
): Promise<void> {
  try {
    if (options.force && !projectName) {
      throw new CliError(
        `\`--force\` requires a project name for \`${commandLabel}\`.`,
      );
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const config = await dependencies.readOatConfig(repoRoot);
    const s3Uri = config.archive?.s3Uri;

    if (!s3Uri) {
      throw new CliError(
        'Archive sync requires `archive.s3Uri` to be configured. Set it with `oat config set archive.s3Uri <s3://...>` and retry.',
      );
    }

    const {
      env: awsEnv,
      awsProfile,
      awsRegion,
    } = resolveSyncAwsEnv(dependencies.processEnv, options, config);

    await dependencies.ensureS3ArchiveAccess(
      {
        mode: 'sync',
        s3Uri,
        syncOnComplete: config.archive?.s3SyncOnComplete ?? false,
        awsProfile,
        awsRegion,
      },
      { env: awsEnv },
    );

    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    const snapshots = await listArchiveSnapshots(
      repoRoot,
      projectsRoot,
      s3Uri,
      awsEnv,
      dependencies,
    );

    const targets = projectName
      ? snapshots.filter(
          (snapshot) =>
            snapshot.projectName === projectName ||
            snapshot.snapshotName === projectName,
        )
      : selectLatestSnapshots(snapshots);

    if (projectName && targets.length === 0) {
      throw new CliError(
        `No archived snapshot found in S3 for project \`${projectName}\`.`,
      );
    }

    const latestTarget = projectName
      ? targets.reduce<ArchiveSnapshotEntry | null>((latest, snapshot) => {
          if (!latest) {
            return snapshot;
          }
          return compareSnapshotEntries(snapshot, latest) > 0
            ? snapshot
            : latest;
        }, null)
      : null;
    const snapshotsToSync = projectName
      ? latestTarget
        ? [latestTarget]
        : []
      : targets;

    const appliedTargets: string[] = [];
    const appliedSources: string[] = [];

    for (const snapshot of snapshotsToSync) {
      if (!snapshot) {
        continue;
      }
      const synced = await syncArchiveSnapshot(
        repoRoot,
        snapshot,
        options,
        awsEnv,
        dependencies,
      );
      if (synced) {
        appliedTargets.push(snapshot.target);
        appliedSources.push(snapshot.source);
      }
    }

    const subject = projectName
      ? `archived project \`${projectName}\``
      : 'archived projects';
    const targetSummary =
      appliedTargets.length > 0
        ? appliedTargets.join(', ')
        : resolveLocalArchiveRoot(projectsRoot);
    const sourceSummary =
      appliedSources.length > 0
        ? appliedSources.join(', ')
        : dependencies.buildRepoArchiveS3Uri(
            s3Uri,
            await dependencies.resolvePrimaryRepoRoot(repoRoot, {
              gitExecFile: dependencies.execFile,
              env: awsEnv,
            }),
          );

    if (context.json) {
      context.logger.json({
        status: 'ok',
        mode: options.dryRun ? 'dry-run' : 'apply',
        projectName: projectName ?? null,
        sources: appliedSources,
        targets: appliedTargets,
        skipped: appliedTargets.length === 0,
        force: options.force ?? false,
      });
    } else if (options.dryRun) {
      context.logger.info(
        `Dry-run: would sync ${subject} from ${sourceSummary} to ${targetSummary}.`,
      );
    } else if (appliedTargets.length === 0) {
      context.logger.info(
        `Skipped ${subject}; local archive is already using the latest remote snapshot.`,
      );
    } else {
      context.logger.info(
        `Synced ${subject} from ${sourceSummary} to ${targetSummary}.`,
      );
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}
