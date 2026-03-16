import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
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
): Promise<void> {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
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
      await runInitToolsCore(context, options, dependencies);
    });
}
