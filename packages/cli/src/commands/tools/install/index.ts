import { execFile } from 'node:child_process';
import { buildCommandContext } from '@app/command-context';
import { createInitToolsCommand } from '@commands/init/tools';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  type AutoSyncDependencies,
  autoSync,
} from '@commands/tools/shared/auto-sync';
import type { Command } from 'commander';

const defaultSyncDependencies: AutoSyncDependencies = {
  runSync: async ({ scope, cwd }) => {
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        [
          ...process.execArgv,
          process.argv[1]!,
          'sync',
          '--apply',
          '--scope',
          scope,
        ],
        { cwd },
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    });
  },
};

export function createToolsInstallCommand(
  syncDependencies: AutoSyncDependencies = defaultSyncDependencies,
): Command {
  const cmd = createInitToolsCommand();
  cmd.name('install');
  cmd.option('--no-sync', 'Skip auto-sync after install');

  cmd.hook('postAction', async (thisCommand, actionCommand) => {
    if (process.exitCode !== 0 && process.exitCode !== undefined) return;

    const opts = thisCommand.opts();
    if (opts.sync === false) return;

    const globalOptions = readGlobalOptions(actionCommand);
    const context = buildCommandContext(globalOptions);
    const scopes = resolveConcreteScopes(context.scope);

    await autoSync(
      scopes,
      context.cwd,
      context.home,
      context.logger,
      syncDependencies,
    );
  });

  return cmd;
}
