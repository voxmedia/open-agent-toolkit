import { execFile } from 'node:child_process';

import { buildCommandContext } from '@app/command-context';
import {
  consumeInitToolsRunMetadata,
  createInitToolsCommand,
  type InitToolsDependencies,
} from '@commands/init/tools';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  type AutoSyncDependencies,
  autoSync,
} from '@commands/tools/shared/auto-sync';
import { getInstalledCanonicalPaths as getInstallSyncCanonicalPaths } from '@commands/tools/shared/install-sync-context';
import type { Command } from 'commander';

const defaultSyncDependencies: AutoSyncDependencies = {
  runSync: async ({ scope, cwd, installedCanonicalPaths }) => {
    const syncArgs = [
      ...process.execArgv,
      process.argv[1]!,
      'sync',
      '--scope',
      scope,
    ];
    for (const canonicalPath of installedCanonicalPaths ?? []) {
      syncArgs.push('--install-canonical', canonicalPath);
    }

    await new Promise<void>((resolve, reject) => {
      execFile(process.execPath, syncArgs, { cwd }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  },
};

export function createToolsInstallCommand(
  syncDependencies: AutoSyncDependencies = defaultSyncDependencies,
  initOverrides: Partial<InitToolsDependencies> = {},
  createBaseCommand?: () => Command,
): Command {
  const cmd =
    createBaseCommand === undefined
      ? createInitToolsCommand(initOverrides)
      : createBaseCommand();
  cmd.name('install');
  cmd.option('--no-sync', 'Skip auto-sync after install');

  cmd.hook('postAction', async (thisCommand, actionCommand) => {
    if (process.exitCode !== 0 && process.exitCode !== undefined) return;

    const opts = thisCommand.opts();
    if (opts.sync === false) return;

    const globalOptions = readGlobalOptions(actionCommand);
    const buildContext =
      initOverrides.buildCommandContext ?? buildCommandContext;
    const context = buildContext(globalOptions);
    const metadata = consumeInitToolsRunMetadata();
    const scopes =
      metadata === null
        ? resolveConcreteScopes(context.scope)
        : metadata.affectedScopes;
    const installedCanonicalPaths = getInstallSyncCanonicalPaths(actionCommand);

    await autoSync(
      scopes,
      context.cwd,
      context.home,
      context.logger,
      syncDependencies,
      { installedCanonicalPaths },
    );
  });

  return cmd;
}
