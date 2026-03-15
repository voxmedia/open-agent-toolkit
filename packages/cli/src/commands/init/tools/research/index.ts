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
  installResearch as defaultInstallResearch,
  type InstallResearchOptions,
  type InstallResearchResult,
  RESEARCH_SKILLS,
} from './install-research';

interface InitToolsResearchOptions {
  force?: boolean;
}

type ResearchScope = 'project' | 'user';

interface InitToolsResearchDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: ResearchScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  installResearch: (
    options: InstallResearchOptions,
  ) => Promise<InstallResearchResult>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

const DEFAULT_DEPENDENCIES: InitToolsResearchDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  installResearch: defaultInstallResearch,
  selectManyWithAbort,
  confirmAction,
};

function resolveScope(context: CommandContext): ResearchScope {
  return context.scope === 'user' ? 'user' : 'project';
}

function reportSuccess(
  context: CommandContext,
  scope: ResearchScope,
  targetRoot: string,
  assetsRoot: string,
  selectedSkills: string[],
  result: InstallResearchResult,
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

  context.logger.info('Installed research tool pack.');
  context.logger.info(`Scope: ${scope}`);
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(
    `Selected skills: ${selectedSkills.join(', ') || '(none)'}`,
  );
  context.logger.info(
    `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  );
  context.logger.info(
    `Agents: copied=${result.copiedAgents.length}, updated=${result.updatedAgents.length}, skipped=${result.skippedAgents.length}`,
  );
  context.logger.info(`Run: oat sync --scope ${scope}`);
}

async function runInitToolsResearch(
  context: CommandContext,
  options: InitToolsResearchOptions,
  dependencies: InitToolsResearchDependencies,
): Promise<void> {
  try {
    const scope = resolveScope(context);
    const targetRoot =
      scope === 'project'
        ? await dependencies.resolveProjectRoot(context.cwd)
        : dependencies.resolveScopeRoot('user', context.cwd, context.home);

    const selectedSkills = context.interactive
      ? await dependencies.selectManyWithAbort(
          'Select research skills to install',
          RESEARCH_SKILLS.map((skill) => ({
            label: skill,
            value: skill,
            checked: true,
          })),
          { interactive: context.interactive },
        )
      : [...RESEARCH_SKILLS];

    if (selectedSkills === null) {
      if (!context.json) {
        context.logger.info('Cancelled: no research skills installed.');
      }
      process.exitCode = 0;
      return;
    }

    if (selectedSkills.length === 0) {
      if (!context.json) {
        context.logger.info('No research skills selected.');
      }
      process.exitCode = 0;
      return;
    }

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        `Force overwrite existing research assets in ${scope} scope?`,
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
    const result = await dependencies.installResearch({
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

export function createInitToolsResearchCommand(
  overrides: Partial<InitToolsResearchDependencies> = {},
): Command {
  const dependencies: InitToolsResearchDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('research')
    .description('Install OAT research skills')
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsResearchOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runInitToolsResearch(context, options, dependencies);
    });
}
