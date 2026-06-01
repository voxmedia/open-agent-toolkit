import {
  defaultProjectArchiveCommandDependencies,
  runArchiveSyncCommand,
  type ArchiveSyncOptions,
  type ProjectArchiveCommandDependencies,
} from '@commands/project/archive/sync-runner';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

export function createRepoArchiveCommand(
  overrides: Partial<ProjectArchiveCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultProjectArchiveCommandDependencies(),
    ...overrides,
  };

  return new Command('archive')
    .description('Manage repository archive data')
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
        .option('--profile <profile>', 'AWS profile override for this sync')
        .option('--region <region>', 'AWS region override for this sync')
        .action(
          async (
            projectName: string | undefined,
            options: ArchiveSyncOptions,
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );

            await runArchiveSyncCommand(
              dependencies,
              projectName,
              options,
              context,
            );
          },
        ),
    );
}
