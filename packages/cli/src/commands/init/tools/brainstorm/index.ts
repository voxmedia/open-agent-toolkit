import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { resolvePackDefaultScope } from '@commands/init/tools/shared/skill-manifest';
import {
  confirmAction,
  type PromptContext,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPack,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  installBrainstorm as defaultInstallBrainstorm,
  type InstallBrainstormOptions,
  type InstallBrainstormResult,
} from './install-brainstorm';

interface InitToolsBrainstormOptions {
  force?: boolean;
}

type InstallScope = 'project' | 'user';

interface InitToolsBrainstormDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: InstallScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  installBrainstorm: (
    options: InstallBrainstormOptions,
  ) => Promise<InstallBrainstormResult>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

const DEFAULT_DEPENDENCIES: InitToolsBrainstormDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installBrainstorm: defaultInstallBrainstorm,
  confirmAction,
};

function resolveInstallScope(context: CommandContext): InstallScope {
  // Honor explicit --scope when provided. Otherwise consult
  // PACK_METADATA defaultScope ('user' for brainstorm).
  if (context.scope === 'project') return 'project';
  if (context.scope === 'user') return 'user';
  return resolvePackDefaultScope('brainstorm');
}

function getCountSummary(result: InstallBrainstormResult): {
  skills: string;
} {
  return {
    skills: `copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  };
}

function reportSuccess(
  context: CommandContext,
  scope: InstallScope,
  targetRoot: string,
  assetsRoot: string,
  result: InstallBrainstormResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      scope,
      targetRoot,
      assetsRoot,
      result,
    });
    return;
  }

  const counts = getCountSummary(result);
  context.logger.info('Installed brainstorm tool pack.');
  context.logger.info(`Scope: ${scope}`);
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(`Skills: ${counts.skills}`);
  context.logger.info(`Run: oat sync --scope ${scope}`);
}

async function runInitToolsBrainstorm(
  context: CommandContext,
  options: InitToolsBrainstormOptions,
  dependencies: InitToolsBrainstormDependencies,
): Promise<boolean> {
  try {
    const scope = resolveInstallScope(context);
    const targetRoot =
      scope === 'project'
        ? await dependencies.resolveProjectRoot(context.cwd)
        : dependencies.resolveScopeRoot('user', context.cwd, context.home);

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        `Force overwrite existing brainstorm assets in ${scope} scope?`,
        { interactive: context.interactive },
      );
      if (!confirmed) {
        if (!context.json) {
          context.logger.info('Cancelled: no files were overwritten.');
        }
        process.exitCode = 0;
        return false;
      }
    }

    const assetsRoot = await dependencies.resolveAssetsRoot();
    const result = await dependencies.installBrainstorm({
      assetsRoot,
      targetRoot,
      force: options.force,
    });

    reportSuccess(context, scope, targetRoot, assetsRoot, result);
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

export function createInitToolsBrainstormCommand(
  overrides: Partial<InitToolsBrainstormDependencies> = {},
): Command {
  const dependencies: InitToolsBrainstormDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('brainstorm')
    .description(
      'Install OAT brainstorm skill (always-on entry point with visual companion)',
    )
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsBrainstormOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const didInstall = await runInitToolsBrainstorm(
        context,
        options,
        dependencies,
      );
      if (didInstall) {
        setInstalledCanonicalPaths(
          command,
          canonicalPathsForPack('brainstorm'),
        );
      }
    });
}
