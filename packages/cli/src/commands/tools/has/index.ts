import { buildCommandContext } from '@app/command-context';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import { scanTools } from '@commands/tools/shared/scan-tools';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  type PackAvailabilityDependencies,
  PACK_NAMES,
  isPackName,
  resolvePackAvailability,
} from './has-pack';

const defaultDependencies: PackAvailabilityDependencies = {
  scanTools,
  resolveScopeRoot: async (scope, cwd, home) => {
    if (scope === 'project') {
      return resolveProjectRoot(cwd);
    }
    return resolveScopeRoot(scope, cwd, home);
  },
  resolveAssetsRoot,
};

export function createToolsHasCommand(
  dependencies: PackAvailabilityDependencies = defaultDependencies,
): Command {
  return withScopeOption(new Command('has'))
    .description('Check whether a bundled tool pack is available')
    .argument('<pack>', 'Bundled tool pack name')
    .action(async (pack: string, _options, command) => {
      const context = buildCommandContext(readGlobalOptions(command));

      if (!isPackName(pack)) {
        const message = `Invalid pack '${pack}'. Expected one of: ${PACK_NAMES.join(', ')}.`;
        if (context.json) {
          context.logger.json({ status: 'error', message });
        } else {
          context.logger.error(message);
        }
        process.exitCode = 1;
        return;
      }

      try {
        const availability = await resolvePackAvailability(
          pack,
          resolveConcreteScopes(context.scope),
          context,
          dependencies,
        );

        if (context.json) {
          context.logger.json(availability);
        } else {
          context.logger.info(String(availability.available));
        }
        process.exitCode = 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) {
          context.logger.json({ status: 'error', message });
        } else {
          context.logger.error(message);
        }
        process.exitCode = 2;
      }
    });
}
