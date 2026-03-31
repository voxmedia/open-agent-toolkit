import { execFile as execFileCallback } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join, posix as path } from 'node:path';
import { promisify } from 'node:util';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { type OatConfig, readOatConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  buildProjectArchiveS3Uri,
  buildRepoArchiveS3Uri,
  ensureS3ArchiveAccess,
  type ExecFileLike,
  resolveLocalArchiveProjectPath,
} from './archive-utils';

const execFileAsync = promisify(execFileCallback);

interface ArchiveSyncOptions {
  dryRun?: boolean;
  force?: boolean;
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
  execFile: ExecFileLike;
  removeDirectory: typeof rm;
  processEnv: NodeJS.ProcessEnv;
}

function defaultDependencies(): ProjectArchiveCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    readOatConfig,
    resolveProjectsRoot,
    ensureS3ArchiveAccess,
    buildRepoArchiveS3Uri,
    buildProjectArchiveS3Uri,
    resolveLocalArchiveProjectPath,
    execFile: execFileAsync,
    removeDirectory: rm,
    processEnv: process.env,
  };
}

function resolveLocalArchiveRoot(projectsRoot: string): string {
  return path.join(path.dirname(projectsRoot.replace(/\/+$/, '')), 'archived');
}

function getArchiveSyncTargets(
  repoRoot: string,
  projectsRoot: string,
  s3Uri: string,
  projectName?: string,
): { source: string; target: string } {
  if (projectName) {
    return {
      source: buildProjectArchiveS3Uri(s3Uri, repoRoot, projectName),
      target: resolveLocalArchiveProjectPath(projectsRoot, projectName),
    };
  }

  return {
    source: buildRepoArchiveS3Uri(s3Uri, repoRoot),
    target: resolveLocalArchiveRoot(projectsRoot),
  };
}

function buildArchiveSyncArgs(
  source: string,
  target: string,
  options: ArchiveSyncOptions,
): string[] {
  const args = ['s3', 'sync', source, target];

  if (options.dryRun) {
    args.push('--dryrun');
  }

  return args;
}

async function runArchiveSync(
  repoRoot: string,
  source: string,
  target: string,
  options: ArchiveSyncOptions,
  dependencies: ProjectArchiveCommandDependencies,
): Promise<void> {
  await dependencies.execFile(
    'aws',
    buildArchiveSyncArgs(source, target, options),
    {
      cwd: repoRoot,
      env: dependencies.processEnv,
    },
  );
}

export function createProjectArchiveCommand(
  overrides: Partial<ProjectArchiveCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultDependencies(),
    ...overrides,
  };

  return new Command('archive')
    .description('Manage archived project data')
    .addCommand(
      new Command('sync')
        .description(
          'Sync archived project data from S3 into the local archive',
        )
        .argument('[project-name]', 'Archived project name to sync')
        .option('--dry-run', 'Preview archive sync without downloading')
        .option(
          '--force',
          'Replace the named local archive before syncing it from S3',
        )
        .action(
          async (
            projectName: string | undefined,
            options: ArchiveSyncOptions,
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );

            try {
              if (options.force && !projectName) {
                throw new CliError(
                  '`--force` requires a project name for `oat project archive sync`.',
                );
              }

              const repoRoot = await dependencies.resolveProjectRoot(
                context.cwd,
              );
              const config = await dependencies.readOatConfig(repoRoot);
              const s3Uri = config.archive?.s3Uri;

              if (!s3Uri) {
                throw new CliError(
                  'Archive sync requires `archive.s3Uri` to be configured. Set it with `oat config set archive.s3Uri <s3://...>` and retry.',
                );
              }

              await dependencies.ensureS3ArchiveAccess({
                mode: 'sync',
                s3Uri,
                syncOnComplete: config.archive?.s3SyncOnComplete ?? false,
              });

              const projectsRoot = await dependencies.resolveProjectsRoot(
                repoRoot,
                dependencies.processEnv,
              );
              const { source, target } = getArchiveSyncTargets(
                repoRoot,
                projectsRoot,
                s3Uri,
                projectName,
              );

              if (options.force && projectName) {
                await dependencies.removeDirectory(join(repoRoot, target), {
                  recursive: true,
                  force: true,
                });
              }

              await runArchiveSync(
                repoRoot,
                source,
                target,
                options,
                dependencies,
              );

              const subject = projectName
                ? `archived project \`${projectName}\``
                : 'archived projects';

              if (context.json) {
                context.logger.json({
                  status: 'ok',
                  mode: options.dryRun ? 'dry-run' : 'apply',
                  projectName: projectName ?? null,
                  source,
                  target,
                  force: options.force ?? false,
                });
              } else if (options.dryRun) {
                context.logger.info(
                  `Dry-run: would sync ${subject} from ${source} to ${target}.`,
                );
              } else {
                context.logger.info(
                  `Synced ${subject} from ${source} to ${target}.`,
                );
              }

              process.exitCode = 0;
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              if (context.json) {
                context.logger.json({ status: 'error', message });
              } else {
                context.logger.error(message);
              }
              process.exitCode = error instanceof CliError ? error.exitCode : 1;
            }
          },
        ),
    );
}
