import { basename, isAbsolute, join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readSyncedRecord } from '@commands/project/sync/record';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  resolveProjectScope,
  resolveScopeRoot,
  syncedRecordPath,
  type ProjectScope,
} from '@commands/shared/project-scope';
import {
  readOatConfig,
  readOatLocalConfig,
  type OatConfig,
  type OatLocalConfig,
} from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';

import {
  archiveProjectOnCompletion,
  assertDurableArchiveProjectTarget,
  buildArchiveSnapshotName,
  buildProjectArchiveS3Uri,
  resolveArchiveProjectTarget,
  resolvePrimaryRepoRoot,
  verifySelectedProjectRecapForArchive,
  type ArchiveProjectTarget,
  type ArchiveProjectOnCompletionOptions,
  type ArchiveProjectOnCompletionResult,
  type ArchiveProjectRecapExportV1,
} from './archive-utils';

export interface ArchivePushOptions {
  dryRun?: boolean;
  projectRecapRun?: string;
  commit?: boolean;
}

export interface ProjectArchivePushCommandDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  resolvePrimaryRepoRoot: typeof resolvePrimaryRepoRoot;
  resolveArchiveProjectTarget: typeof resolveArchiveProjectTarget;
  readSyncedRecord: typeof readSyncedRecord;
  verifySelectedProjectRecapForArchive: typeof verifySelectedProjectRecapForArchive;
  archiveProjectOnCompletion: (
    options: ArchiveProjectOnCompletionOptions,
  ) => Promise<ArchiveProjectOnCompletionResult>;
  processEnv: NodeJS.ProcessEnv;
  timestamp: () => string;
}

interface ResolvedArchiveTarget {
  projectName: string;
  projectPath: string;
}

interface ArchivePushReport {
  status: 'ok';
  mode: 'apply' | 'dry-run';
  projectName: string;
  projectPath: string;
  archivePath: string;
  s3Path: string | null;
  summaryExportFile: string | null;
  projectRecapExport?: ArchiveProjectRecapExportV1;
  warnings: string[];
  lifecycleCommit: string | null;
  recapExportPaths: string[];
  snapshotId: string;
}

export function defaultProjectArchivePushCommandDependencies(): ProjectArchivePushCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    readOatConfig,
    readOatLocalConfig,
    resolveProjectsRoot,
    resolvePrimaryRepoRoot,
    resolveArchiveProjectTarget,
    readSyncedRecord,
    verifySelectedProjectRecapForArchive,
    archiveProjectOnCompletion,
    processEnv: process.env,
    timestamp: () => new Date().toISOString(),
  };
}

function resolveRepoAbsolutePath(repoRoot: string, targetPath: string): string {
  return isAbsolute(targetPath) ? targetPath : join(repoRoot, targetPath);
}

async function resolveArchiveTarget(
  dependencies: ProjectArchivePushCommandDependencies,
  repoRoot: string,
  projectPathArg: string | undefined,
): Promise<ResolvedArchiveTarget> {
  const rawProjectPath = projectPathArg?.trim();
  const projectPath =
    rawProjectPath && rawProjectPath.length > 0
      ? rawProjectPath
      : (await dependencies.readOatLocalConfig(repoRoot)).activeProject?.trim();

  if (!projectPath) {
    throw new CliError(
      'No project path provided and no active project is configured. Pass a project path or set `activeProject`.',
    );
  }

  const absoluteProjectPath = resolveRepoAbsolutePath(repoRoot, projectPath);
  const projectName = basename(absoluteProjectPath);

  if (!projectName) {
    throw new CliError(
      `Unable to determine project name from \`${projectPath}\`.`,
    );
  }

  return {
    projectName,
    projectPath: absoluteProjectPath,
  };
}

function buildArchiveOptions(
  repoRoot: string,
  config: OatConfig,
  projectsRoot: string,
  target: ResolvedArchiveTarget,
  options: ArchivePushOptions,
): ArchiveProjectOnCompletionOptions {
  return {
    repoRoot,
    projectPath: target.projectPath,
    projectName: target.projectName,
    projectsRoot,
    s3Uri: config.archive?.s3Uri,
    s3SyncOnComplete: config.archive?.s3SyncOnComplete ?? false,
    summaryExportPath: config.archive?.summaryExportPath,
    projectRecapRun: options.projectRecapRun,
    awsProfile: config.archive?.awsProfile,
    awsRegion: config.archive?.awsRegion,
    ...(options.commit === false ? { commit: false } : {}),
  };
}

async function buildDryRunReport(
  dependencies: ProjectArchivePushCommandDependencies,
  repoRoot: string,
  config: OatConfig,
  target: ResolvedArchiveTarget,
  archiveTarget: ArchiveProjectTarget,
  snapshotName: string,
  projectScope: ProjectScope | null,
): Promise<ArchivePushReport> {
  const remoteRepoRoot = await dependencies.resolvePrimaryRepoRoot(repoRoot);
  const s3Path =
    config.archive?.s3Uri && config.archive.s3SyncOnComplete === true
      ? buildProjectArchiveS3Uri(
          config.archive.s3Uri,
          remoteRepoRoot,
          snapshotName,
        )
      : null;
  const summaryExportFile = config.archive?.summaryExportPath
    ? join(repoRoot, config.archive.summaryExportPath, `${snapshotName}.md`)
    : null;

  return {
    status: 'ok',
    mode: 'dry-run',
    projectName: target.projectName,
    projectPath: target.projectPath,
    archivePath: archiveTarget.archivePath,
    s3Path,
    summaryExportFile,
    warnings: [],
    lifecycleCommit: null,
    recapExportPaths: [],
    snapshotId:
      projectScope === 'synced'
        ? snapshotName
        : basename(archiveTarget.archivePath),
  };
}

function emitArchivePushText(
  report: ArchivePushReport,
  summaryExportPath: string | undefined,
  logger: CommandContext['logger'],
): void {
  for (const warning of report.warnings) {
    logger.warn(warning);
  }

  if (report.mode === 'dry-run') {
    logger.info(
      `Dry-run: would archive project \`${report.projectName}\` from \`${report.projectPath}\` to \`${report.archivePath}\`.`,
    );
    if (report.s3Path) {
      logger.info(`S3 archive: ${report.s3Path}`);
    }
    if (summaryExportPath) {
      logger.info(`Summary export path: ${summaryExportPath}`);
    }
    return;
  }

  logger.info(
    `Archived project \`${report.projectName}\` to \`${report.archivePath}\`.`,
  );
  if (report.s3Path) {
    logger.info(`S3 archive: ${report.s3Path}`);
  }
  if (report.summaryExportFile) {
    logger.info(`Summary export: ${report.summaryExportFile}`);
  }
  if (report.projectRecapExport) {
    logger.info(
      `Project recap export: ${report.projectRecapExport.exportRoot}`,
    );
  }
}

function emitArchivePushReport(
  report: ArchivePushReport,
  summaryExportPath: string | undefined,
  context: CommandContext,
): void {
  if (context.json) {
    context.logger.json(report);
    return;
  }

  emitArchivePushText(report, summaryExportPath, context.logger);
}

export async function runArchivePushCommand(
  dependencies: ProjectArchivePushCommandDependencies,
  projectPathArg: string | undefined,
  options: ArchivePushOptions,
  context: CommandContext,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const config = await dependencies.readOatConfig(repoRoot);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    const target = await resolveArchiveTarget(
      dependencies,
      repoRoot,
      projectPathArg,
    );
    const projectScope = resolveProjectScope(
      target.projectPath,
      resolveScopeRoot(repoRoot, projectsRoot, 'shared'),
      repoRoot,
    );
    const defaultSnapshotName = buildArchiveSnapshotName(
      target.projectName,
      dependencies.timestamp(),
    );
    const syncedRecord =
      projectScope === 'synced'
        ? await dependencies.readSyncedRecord(
            syncedRecordPath(
              resolveScopeRoot(repoRoot, projectsRoot, 'synced'),
              target.projectName,
            ),
          )
        : null;
    const snapshotName = syncedRecord?.archiveSnapshot ?? defaultSnapshotName;
    const archiveTarget = await dependencies.resolveArchiveProjectTarget(
      {
        repoRoot,
        projectsRoot,
        projectName: target.projectName,
        ...(syncedRecord?.archiveSnapshot
          ? {
              archiveSnapshot: syncedRecord.archiveSnapshot,
              archiveScope: projectScope ?? undefined,
            }
          : {}),
      },
      {
        env: dependencies.processEnv,
        timestamp: dependencies.timestamp,
      },
    );
    assertDurableArchiveProjectTarget(archiveTarget);
    if (options.projectRecapRun?.trim()) {
      await dependencies.verifySelectedProjectRecapForArchive(
        target.projectPath,
        options.projectRecapRun.trim(),
      );
    }
    const dryRun = options.dryRun === true || context.dryRun;

    if (dryRun) {
      const report = await buildDryRunReport(
        dependencies,
        repoRoot,
        config,
        target,
        archiveTarget,
        snapshotName,
        projectScope,
      );
      emitArchivePushReport(report, config.archive?.summaryExportPath, context);
      process.exitCode = 0;
      return;
    }

    const result = await dependencies.archiveProjectOnCompletion(
      buildArchiveOptions(repoRoot, config, projectsRoot, target, options),
    );
    const report: ArchivePushReport = {
      status: 'ok',
      mode: 'apply',
      projectName: target.projectName,
      projectPath: target.projectPath,
      archivePath: result.archivePath,
      s3Path: result.s3Path,
      summaryExportFile: result.summaryExportFile,
      ...(result.projectRecapExport
        ? { projectRecapExport: result.projectRecapExport }
        : {}),
      warnings: result.warnings,
      lifecycleCommit: result.lifecycleCommit,
      recapExportPaths: result.recapExportPaths,
      snapshotId: result.snapshotId,
    };

    emitArchivePushReport(report, config.archive?.summaryExportPath, context);
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
