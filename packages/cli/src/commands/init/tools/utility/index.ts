import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  confirmAction,
  type MultiSelectChoice,
  type PromptContext,
  selectManyWithAbort,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';
import {
  installUtility as defaultInstallUtility,
  type InstallUtilityOptions,
  type InstallUtilityResult,
  UTILITY_SKILLS,
} from './install-utility';

interface InitToolsUtilityOptions {
  force?: boolean;
}

type UtilityScope = 'project' | 'user';

interface InitToolsUtilityDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: UtilityScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  installUtility: (
    options: InstallUtilityOptions,
  ) => Promise<InstallUtilityResult>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

const DEFAULT_DEPENDENCIES: InitToolsUtilityDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installUtility: defaultInstallUtility,
  selectManyWithAbort,
  confirmAction,
};

function resolveScope(context: CommandContext): UtilityScope {
  return context.scope === 'user' ? 'user' : 'project';
}

function reportSuccess(
  context: CommandContext,
  scope: UtilityScope,
  targetRoot: string,
  assetsRoot: string,
  selectedSkills: string[],
  result: InstallUtilityResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      scope,
      targetRoot,
      assetsRoot,
      selectedSkills,
      result,
    });
    return;
  }

  context.logger.info('Installed utility tool pack.');
  context.logger.info(`Scope: ${scope}`);
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(
    `Selected skills: ${selectedSkills.join(', ') || '(none)'}`,
  );
  context.logger.info(
    `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  );
  context.logger.info(`Run: oat sync --scope ${scope} --apply`);
}

async function runInitToolsUtility(
  context: CommandContext,
  options: InitToolsUtilityOptions,
  dependencies: InitToolsUtilityDependencies,
): Promise<void> {
  try {
    const scope = resolveScope(context);
    const targetRoot =
      scope === 'project'
        ? await dependencies.resolveProjectRoot(context.cwd)
        : dependencies.resolveScopeRoot('user', context.cwd, context.home);

    const selectedSkills = context.interactive
      ? await dependencies.selectManyWithAbort(
          'Select utility skills to install',
          UTILITY_SKILLS.map((skill) => ({
            label: skill,
            value: skill,
            checked: true,
          })),
          { interactive: context.interactive },
        )
      : [...UTILITY_SKILLS];

    if (selectedSkills === null) {
      if (!context.json) {
        context.logger.info('Cancelled: no utility skills installed.');
      }
      process.exitCode = 0;
      return;
    }

    if (selectedSkills.length === 0) {
      if (!context.json) {
        context.logger.info('No utility skills selected.');
      }
      process.exitCode = 0;
      return;
    }

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        `Force overwrite existing utility assets in ${scope} scope?`,
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
    const result = await dependencies.installUtility({
      assetsRoot,
      targetRoot,
      skills: selectedSkills,
      force: options.force,
    });

    reportSuccess(
      context,
      scope,
      targetRoot,
      assetsRoot,
      selectedSkills,
      result,
    );
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

export function createInitToolsUtilityCommand(
  overrides: Partial<InitToolsUtilityDependencies> = {},
): Command {
  const dependencies: InitToolsUtilityDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('utility')
    .description('Install OAT utility skills')
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsUtilityOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runInitToolsUtility(context, options, dependencies);
    });
}
