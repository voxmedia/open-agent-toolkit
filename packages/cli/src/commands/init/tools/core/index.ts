import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPack,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  CORE_SKILLS,
  installCore as defaultInstallCore,
  type InstallCoreOptions,
  type InstallCoreResult,
} from './install-core';

interface InitToolsCoreOptions {
  force?: boolean;
}

interface InitToolsCoreDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: 'project' | 'user',
    cwd: string,
    home: string,
  ) => string;
  resolveAssetsRoot: () => Promise<string>;
  installCore: (options: InstallCoreOptions) => Promise<InstallCoreResult>;
}

const DEFAULT_DEPENDENCIES: InitToolsCoreDependencies = {
  buildCommandContext,
  resolveScopeRoot,
  resolveAssetsRoot,
  installCore: defaultInstallCore,
};

function reportSuccess(
  context: CommandContext,
  targetRoot: string,
  result: InstallCoreResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      scope: 'user',
      targetRoot,
      result,
    });
    return;
  }

  context.logger.info('Installed core tool pack.');
  context.logger.info('Scope: user');
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(
    `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  );
  context.logger.info(`Docs: ${result.docsStatus}`);
  context.logger.info('Run: oat sync --scope user');
}

async function runInitToolsCore(
  context: CommandContext,
  options: InitToolsCoreOptions,
  dependencies: InitToolsCoreDependencies,
): Promise<boolean> {
  try {
    // Core pack always installs at user scope
    const targetRoot = dependencies.resolveScopeRoot(
      'user',
      context.cwd,
      context.home,
    );

    const assetsRoot = await dependencies.resolveAssetsRoot();
    const result = await dependencies.installCore({
      assetsRoot,
      targetRoot,
      force: options.force,
    });

    reportSuccess(context, targetRoot, result);
    process.exitCode = 0;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
    return false;
  }
}

export { CORE_SKILLS };

export function createInitToolsCoreCommand(
  overrides: Partial<InitToolsCoreDependencies> = {},
): Command {
  const dependencies: InitToolsCoreDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('core')
    .description('Install OAT core skills (diagnostics, docs)')
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsCoreOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );

      // Core always installs at user scope. If the caller explicitly passed a
      // conflicting --scope on an ancestor (init or tools install), reject it
      // rather than silently ignoring it. A matching --scope user, or no
      // explicit --scope, proceeds unchanged.
      if (command.getOptionValueSourceWithGlobals('scope') === 'cli') {
        const opts = command.optsWithGlobals() as { scope?: string };
        if (opts.scope !== 'user') {
          const msg =
            'the core pack always installs at user scope; remove --scope or pass --scope user';
          if (context.json) {
            context.logger.json({ status: 'error', message: msg });
          } else {
            context.logger.error(msg);
          }
          process.exitCode = 1;
          return;
        }
      }

      const didInstall = await runInitToolsCore(context, options, dependencies);
      if (didInstall) {
        setInstalledCanonicalPaths(command, canonicalPathsForPack('core'));
      }
    });
}
