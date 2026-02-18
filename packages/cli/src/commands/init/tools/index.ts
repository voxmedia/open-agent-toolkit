import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  type MultiSelectChoice,
  type PromptContext,
  type SelectChoice,
  selectManyWithAbort,
  selectWithAbort,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import { Command } from 'commander';
import { createInitToolsIdeasCommand } from './ideas';
import {
  installIdeas as defaultInstallIdeas,
  type InstallIdeasOptions,
  type InstallIdeasResult,
} from './ideas/install-ideas';
import { createInitToolsUtilityCommand } from './utility';
import {
  installUtility as defaultInstallUtility,
  type InstallUtilityOptions,
  type InstallUtilityResult,
  UTILITY_SKILLS,
} from './utility/install-utility';
import { createInitToolsWorkflowsCommand } from './workflows';
import {
  installWorkflows as defaultInstallWorkflows,
  type InstallWorkflowsOptions,
  type InstallWorkflowsResult,
} from './workflows/install-workflows';

type InstallScope = 'project' | 'user';
type ToolPack = 'ideas' | 'workflows' | 'utility';

interface InitToolsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: InstallScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  installIdeas: (options: InstallIdeasOptions) => Promise<InstallIdeasResult>;
  installWorkflows: (
    options: InstallWorkflowsOptions,
  ) => Promise<InstallWorkflowsResult>;
  installUtility: (
    options: InstallUtilityOptions,
  ) => Promise<InstallUtilityResult>;
}

const PACK_CHOICES: MultiSelectChoice<ToolPack>[] = [
  { label: 'Ideas [project|user]', value: 'ideas', checked: true },
  { label: 'Workflows [project]', value: 'workflows', checked: true },
  { label: 'Utility [project|user]', value: 'utility', checked: true },
];

const DEFAULT_DEPENDENCIES: InitToolsDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  selectManyWithAbort,
  selectWithAbort,
  installIdeas: defaultInstallIdeas,
  installWorkflows: defaultInstallWorkflows,
  installUtility: defaultInstallUtility,
};

function isUserEligibleSelection(selections: ToolPack[]): boolean {
  return selections.includes('ideas') || selections.includes('utility');
}

async function resolveUserEligibleScope(
  context: CommandContext,
  selections: ToolPack[],
  dependencies: InitToolsDependencies,
): Promise<InstallScope> {
  if (!isUserEligibleSelection(selections)) {
    return 'project';
  }

  if (context.scope === 'project') {
    return 'project';
  }

  if (context.scope === 'user') {
    return 'user';
  }

  if (!context.interactive) {
    return 'project';
  }

  const selected = await dependencies.selectWithAbort(
    'Install user-eligible packs in project scope or user scope?',
    [
      { label: 'Project scope', value: 'project' },
      { label: 'User scope', value: 'user' },
    ],
    { interactive: context.interactive },
  );

  return selected ?? 'project';
}

function reportSuccess(
  context: CommandContext,
  selectedPacks: ToolPack[],
  utilityScope: InstallScope,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      selectedPacks,
      utilityScope,
    });
    return;
  }

  context.logger.info(`Installed tool packs: ${selectedPacks.join(', ')}`);
  context.logger.info(`User-eligible pack scope: ${utilityScope}`);
  context.logger.info('Run: oat sync --scope project --apply');
  if (utilityScope === 'user') {
    context.logger.info('Also run: oat sync --scope user --apply');
  }
}

async function runInitTools(
  context: CommandContext,
  dependencies: InitToolsDependencies,
): Promise<void> {
  try {
    const selectedPacks: ToolPack[] = context.interactive
      ? ((await dependencies.selectManyWithAbort(
          'Select tool packs to install',
          PACK_CHOICES,
          { interactive: context.interactive },
        )) ?? [])
      : ['ideas', 'workflows', 'utility'];

    if (selectedPacks.length === 0) {
      if (!context.json) {
        context.logger.info('No tool packs selected.');
      }
      process.exitCode = 0;
      return;
    }

    const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userRoot = dependencies.resolveScopeRoot(
      'user',
      context.cwd,
      context.home,
    );
    const userEligibleScope = await resolveUserEligibleScope(
      context,
      selectedPacks,
      dependencies,
    );

    const userEligibleRoot =
      userEligibleScope === 'user' ? userRoot : projectRoot;
    const assetsRoot = await dependencies.resolveAssetsRoot();

    if (selectedPacks.includes('ideas')) {
      await dependencies.installIdeas({
        assetsRoot,
        targetRoot: userEligibleRoot,
      });
    }

    if (selectedPacks.includes('workflows')) {
      await dependencies.installWorkflows({
        assetsRoot,
        targetRoot: projectRoot,
      });
    }

    if (selectedPacks.includes('utility')) {
      await dependencies.installUtility({
        assetsRoot,
        targetRoot: userEligibleRoot,
        skills: [...UTILITY_SKILLS],
      });
    }

    reportSuccess(context, selectedPacks, userEligibleScope);
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

export function createInitToolsCommand(
  overrides: Partial<InitToolsDependencies> = {},
): Command {
  const dependencies: InitToolsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('tools')
    .description('Install OAT tool packs (ideas, workflows, utility)')
    .addCommand(createInitToolsIdeasCommand())
    .addCommand(createInitToolsWorkflowsCommand())
    .addCommand(createInitToolsUtilityCommand())
    .action(async (_options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runInitTools(context, dependencies);
    });
}
