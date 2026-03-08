import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  confirmAction,
  type PromptContext,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';
import {
  installIdeas as defaultInstallIdeas,
  type InstallIdeasOptions,
  type InstallIdeasResult,
} from './install-ideas';

interface InitToolsIdeasOptions {
  force?: boolean;
}

type InstallScope = 'project' | 'user';

interface InitToolsIdeasDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: InstallScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  installIdeas: (options: InstallIdeasOptions) => Promise<InstallIdeasResult>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

const DEFAULT_DEPENDENCIES: InitToolsIdeasDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installIdeas: defaultInstallIdeas,
  confirmAction,
};

function resolveInstallScope(context: CommandContext): InstallScope {
  return context.scope === 'user' ? 'user' : 'project';
}

function getCountSummary(result: InstallIdeasResult): {
  skills: string;
  infra: string;
  templates: string;
} {
  return {
    skills: `copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
    infra: `copied=${result.copiedInfraFiles.length}, updated=${result.updatedInfraFiles.length}, skipped=${result.skippedInfraFiles.length}`,
    templates: `copied=${result.copiedTemplates.length}, updated=${result.updatedTemplates.length}, skipped=${result.skippedTemplates.length}`,
  };
}

function reportSuccess(
  context: CommandContext,
  scope: InstallScope,
  targetRoot: string,
  assetsRoot: string,
  result: InstallIdeasResult,
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
  context.logger.info('Installed ideas tool pack.');
  context.logger.info(`Scope: ${scope}`);
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(`Skills: ${counts.skills}`);
  context.logger.info(`Infra files: ${counts.infra}`);
  context.logger.info(`Runtime templates: ${counts.templates}`);
  context.logger.info(`Run: oat sync --scope ${scope}`);
}

async function runInitToolsIdeas(
  context: CommandContext,
  options: InitToolsIdeasOptions,
  dependencies: InitToolsIdeasDependencies,
): Promise<void> {
  try {
    const scope = resolveInstallScope(context);
    const targetRoot =
      scope === 'project'
        ? await dependencies.resolveProjectRoot(context.cwd)
        : dependencies.resolveScopeRoot('user', context.cwd, context.home);

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        `Force overwrite existing ideas assets in ${scope} scope?`,
        { interactive: context.interactive },
      );
      if (!confirmed) {
        if (!context.json) {
          context.logger.info('Cancelled: no files were overwritten.');
        }
        process.exitCode = 0;
        return;
      }
    }

    const assetsRoot = await dependencies.resolveAssetsRoot();
    const result = await dependencies.installIdeas({
      assetsRoot,
      targetRoot,
      force: options.force,
    });

    reportSuccess(context, scope, targetRoot, assetsRoot, result);
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

export function createInitToolsIdeasCommand(
  overrides: Partial<InitToolsIdeasDependencies> = {},
): Command {
  const dependencies: InitToolsIdeasDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('ideas')
    .description('Install OAT ideas skills, templates, and idea workflow files')
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsIdeasOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runInitToolsIdeas(context, options, dependencies);
    });
}
