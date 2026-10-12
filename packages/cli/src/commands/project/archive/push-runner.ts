import { basename, isAbsolute, join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { readSyncedRecord } from '@commands/project/sync/record';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
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
  ArchiveIdentityError,
  archiveProjectOnCompletion,
  assertExactArchiveProjectRoot,
  assertDurableArchiveProjectTarget,
  buildProjectArchiveS3Uri,
  evaluateArchiveRetryIdentity,
  newGenerationReplayWarning,
  resolveArchiveProjectTarget,
  resolvePrimaryRepoRoot,
  verifySelectedProjectRecapForArchive,
  type ArchiveRetryIdentity,
  type ArchiveProjectOnCompletionOptions,
  type ArchiveProjectOnCompletionResult,
  type ArchiveProjectRecapExportV1,
} from './archive-utils';

export interface ArchivePushOptions {
  dryRun?: boolean;
  projectRecapRun?: string;
  commit?: boolean;
  /** `--new-generation <reason>`. */
  newGeneration?: string;
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
  assertExactArchiveProjectRoot: typeof assertExactArchiveProjectRoot;
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
  completedRef: string | null;
  verifiedSourceSha: string | null;
  activeAliasDisposition: 'retained' | 'removed' | null;
  recordRetired: boolean;
  generation?: number;
  predecessorSnapshot?: string | null;
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
    assertExactArchiveProjectRoot,
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
    ...(options.newGeneration !== undefined
      ? { newGenerationReason: options.newGeneration }
      : {}),
  };
}

async function buildDryRunReport(
  dependencies: ProjectArchivePushCommandDependencies,
  repoRoot: string,
  config: OatConfig,
  target: ResolvedArchiveTarget,
  identity: ArchiveRetryIdentity,
  projectScope: ProjectScope | null,
  newGenerationReason?: string,
): Promise<ArchivePushReport> {
  // Every reported destination comes from the shared retry-identity
  // evaluator, so an identical retry previews the persisted snapshot it would
  // reuse rather than a new identity derived from today's date.
  const snapshotName = identity.snapshotName;
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
    archivePath: identity.archivePath,
    s3Path,
    summaryExportFile,
    warnings: [
      newGenerationReplayWarning(identity, newGenerationReason),
    ].filter((warning): warning is string => warning !== null),
    lifecycleCommit: null,
    recapExportPaths: [],
    snapshotId:
      projectScope === 'synced' ? snapshotName : basename(identity.archivePath),
    completedRef: null,
    verifiedSourceSha: null,
    activeAliasDisposition: null,
    recordRetired: false,
    generation: identity.generation,
    predecessorSnapshot: identity.predecessor,
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
    if (report.predecessorSnapshot) {
      logger.info(
        `Generation ${report.generation} after \`${report.predecessorSnapshot}\`.`,
      );
    }
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
  if (report.predecessorSnapshot) {
    logger.info(
      `Generation ${report.generation} after \`${report.predecessorSnapshot}\`.`,
    );
  }
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
    logger.info(
      `Recap run: ${report.projectRecapExport.runId}; original ${report.projectRecapExport.page.originalSha256}; exported ${report.projectRecapExport.page.exportedSha256}; verified ${report.projectRecapExport.verifiedArtifactCount} immutable files.`,
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
    const { projectScope } = dependencies.assertExactArchiveProjectRoot({
      repoRoot,
      projectPath: target.projectPath,
      projectName: target.projectName,
      projectsRoot,
    });
    const syncedRecord =
      projectScope === 'synced'
        ? await dependencies.readSyncedRecord(
            syncedRecordPath(
              resolveScopeRoot(repoRoot, projectsRoot, 'synced'),
              target.projectName,
            ),
          )
        : null;
    const identity = await evaluateArchiveRetryIdentity(
      {
        repoRoot,
        projectsRoot,
        projectName: target.projectName,
        projectPath: target.projectPath,
        scope: projectScope,
        timestamp: dependencies.timestamp(),
        ...(syncedRecord?.archiveSnapshot
          ? { persistedSnapshot: syncedRecord.archiveSnapshot }
          : {}),
        ...(syncedRecord?.archiveSourceRefSha
          ? { sourceRefSha: syncedRecord.archiveSourceRefSha }
          : {}),
        ...(options.newGeneration !== undefined
          ? { newGeneration: { reason: options.newGeneration } }
          : {}),
      },
      {
        resolveArchiveProjectTarget: dependencies.resolveArchiveProjectTarget,
        env: dependencies.processEnv,
        timestamp: dependencies.timestamp,
      },
    );
    assertDurableArchiveProjectTarget(identity.target);
    const dryRun = options.dryRun === true || context.dryRun;
    const recordlessSyncedApply =
      projectScope === 'synced' && syncedRecord === null && !dryRun;
    if (options.projectRecapRun?.trim() && !recordlessSyncedApply) {
      await dependencies.verifySelectedProjectRecapForArchive(
        target.projectPath,
        options.projectRecapRun.trim(),
      );
    }

    if (dryRun) {
      const report = await buildDryRunReport(
        dependencies,
        repoRoot,
        config,
        target,
        identity,
        projectScope,
        options.newGeneration,
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
      completedRef: result.terminalReceipt?.completedRef ?? null,
      verifiedSourceSha: result.terminalReceipt?.verifiedSha ?? null,
      activeAliasDisposition: result.terminalReceipt
        ? result.terminalReceipt.activeAliasRetained
          ? 'retained'
          : 'removed'
        : null,
      recordRetired: result.recordRetired,
      ...(result.generation !== undefined
        ? {
            generation: result.generation,
            predecessorSnapshot: result.predecessorSnapshot ?? null,
          }
        : {}),
    };

    emitArchivePushReport(report, config.archive?.summaryExportPath, context);
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({
        status: 'error',
        ...(error instanceof ArchiveIdentityError ? { code: error.code } : {}),
        message,
      });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}
