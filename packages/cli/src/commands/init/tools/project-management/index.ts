import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { withScopeOption } from '@commands/shared/scope-option';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPack,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  installProjectManagement as defaultInstallProjectManagement,
  type InstallProjectManagementOptions,
  type InstallProjectManagementResult,
} from './install-project-management';

interface InitToolsProjectManagementOptions {
  force?: boolean;
}

interface InitToolsProjectManagementDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (
    scope: 'project' | 'user',
    cwd: string,
    home: string,
  ) => string;
  resolveAssetsRoot: () => Promise<string>;
  installProjectManagement: (
    options: InstallProjectManagementOptions,
  ) => Promise<InstallProjectManagementResult>;
}

const DEFAULT_DEPENDENCIES: InitToolsProjectManagementDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installProjectManagement: defaultInstallProjectManagement,
};

export function createInitToolsProjectManagementCommand(
  overrides: Partial<InitToolsProjectManagementDependencies> = {},
): Command {
  const dependencies: InitToolsProjectManagementDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return withScopeOption(new Command('project-management'))
    .description('Install OAT project-management skills and templates')
    .option('--force', 'Overwrite existing files where applicable')
    .action(
      async (options: InitToolsProjectManagementOptions, command: Command) => {
        let didInstall = false;
        try {
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          const optionScope = (command.optsWithGlobals() as { scope?: string })
            .scope;
          const scope =
            command.getOptionValueSourceWithGlobals('scope') === 'cli' &&
            (optionScope === 'project' || optionScope === 'user')
              ? optionScope
              : context.scope === 'project' || context.scope === 'user'
                ? context.scope
                : 'user';
          const targetRoot =
            scope === 'project'
              ? await dependencies.resolveProjectRoot(context.cwd)
              : dependencies.resolveScopeRoot(
                  'user',
                  context.cwd,
                  context.home,
                );
          const assetsRoot = await dependencies.resolveAssetsRoot();
          const result = await dependencies.installProjectManagement({
            assetsRoot,
            targetRoot,
            force: options.force,
            scope,
          });
          didInstall = true;

          if (context.json) {
            context.logger.json({
              status: 'ok',
              scope,
              targetRoot,
              assetsRoot,
              result,
              adoption: {
                owner: 'repository',
                action: 'oat pjm init',
                changed: false,
              },
            });
          } else {
            context.logger.info('Installed project-management tool pack.');
            context.logger.info(`Target root: ${targetRoot}`);
            context.logger.info(
              `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
            );
            context.logger.info(
              `Templates: copied=${result.copiedTemplates.length}, updated=${result.updatedTemplates.length}, skipped=${result.skippedTemplates.length}`,
            );
            context.logger.info(
              'Repository adoption is unchanged. Run `oat pjm init` in each repository that should use PJM.',
            );
            context.logger.info(`Run: oat sync --scope ${scope}`);
          }
          process.exitCode = 0;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = 1;
        }

        if (didInstall) {
          setInstalledCanonicalPaths(
            command,
            canonicalPathsForPack('project-management'),
          );
        }
      },
    );
}
