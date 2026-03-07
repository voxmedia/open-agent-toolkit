import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { scanTools } from '@commands/tools/shared/scan-tools';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';
import { type ListToolsDependencies, runListTools } from './list-tools';

const defaultDependencies: ListToolsDependencies = {
  scanTools,
  resolveScopeRoot: async (scope, cwd, home) => {
    if (scope === 'project') return resolveProjectRoot(cwd);
    return resolveScopeRoot(scope, cwd, home);
  },
  resolveAssetsRoot,
};

export function createToolsListCommand(
  dependencies: ListToolsDependencies = defaultDependencies,
): Command {
  return new Command('list')
    .description('List installed tools with version and status')
    .action(async (_opts, command) => {
      const globalOptions = readGlobalOptions(command);
      const context = buildCommandContext(globalOptions);
      await runListTools(context, dependencies);
    });
}
