import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import {
  defaultProjectArchivePushCommandDependencies,
  runArchivePushCommand,
  type ArchivePushOptions,
  type ProjectArchivePushCommandDependencies,
} from './push-runner';
import {
  defaultProjectArchiveCommandDependencies,
  runArchiveSyncCommand,
  type ArchiveSyncOptions,
  type ProjectArchiveCommandDependencies,
} from './sync-runner';

export type {
  ArchiveSyncOptions,
  ProjectArchiveCommandDependencies,
} from './sync-runner';
export type {
  ArchivePushOptions,
  ProjectArchivePushCommandDependencies,
} from './push-runner';

type ProjectArchiveDependencies = ProjectArchiveCommandDependencies &
  ProjectArchivePushCommandDependencies;

const PROJECT_ARCHIVE_SYNC_DEPRECATION_NOTICE =
  'oat project archive sync is deprecated; use oat repo archive sync';

export function createProjectArchiveCommand(
  overrides: Partial<ProjectArchiveDependencies> = {},
): Command {
  const dependencies = {
    ...defaultProjectArchiveCommandDependencies(),
    ...defaultProjectArchivePushCommandDependencies(),
    ...overrides,
  };

  return new Command('archive')
    .description('Manage archived project data')
    .argument('[project-path]', 'Project path to archive')
    .option('--dry-run', 'Preview archive without moving files or syncing S3')
    .addHelpText(
      'afterAll',
      '\nPull archived project data with `oat repo archive sync [project-name]`; `oat project archive sync` is deprecated.',
    )
    .action(
      async (
        projectPath: string | undefined,
        options: ArchivePushOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );

        await runArchivePushCommand(
          dependencies,
          projectPath,
          options,
          context,
        );
      },
    )
    .addCommand(
      new Command('sync')
        .description(
          '[deprecated] Sync archived project data from S3 into the local archive',
        )
        .argument('[project-name]', 'Archived project name to sync')
        .option('--dry-run', 'Preview archive sync without downloading')
        .option(
          '--force',
          'Replace the named local archive before syncing it from S3',
        )
        .option('--profile <profile>', 'AWS profile override for this sync')
        .option('--region <region>', 'AWS region override for this sync')
        .action(
          async (
            projectName: string | undefined,
            options: ArchiveSyncOptions,
            command: Command,
          ) => {
            process.stderr.write(
              `${PROJECT_ARCHIVE_SYNC_DEPRECATION_NOTICE}\n`,
            );
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            const syncOptions = {
              ...options,
              dryRun: options.dryRun ?? context.dryRun,
            };

            await runArchiveSyncCommand(
              dependencies,
              projectName,
              syncOptions,
              context,
              'oat project archive sync',
            );
          },
        ),
    );
}
