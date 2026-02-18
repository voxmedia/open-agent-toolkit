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
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';
import {
  installWorkflows as defaultInstallWorkflows,
  type InstallWorkflowsOptions,
  type InstallWorkflowsResult,
} from './install-workflows';

interface InitToolsWorkflowsOptions {
  force?: boolean;
}

interface InitToolsWorkflowsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  installWorkflows: (
    options: InstallWorkflowsOptions,
  ) => Promise<InstallWorkflowsResult>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

const PROJECT_SCOPE_ONLY_MESSAGE =
  'oat init tools workflows currently supports only --scope project.';

const DEFAULT_DEPENDENCIES: InitToolsWorkflowsDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveAssetsRoot,
  installWorkflows: defaultInstallWorkflows,
  confirmAction,
};

function reportSuccess(
  context: CommandContext,
  targetRoot: string,
  assetsRoot: string,
  result: InstallWorkflowsResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      scope: 'project',
      targetRoot,
      assetsRoot,
      result,
    });
    return;
  }

  context.logger.info('Installed workflows tool pack.');
  context.logger.info(`Target root: ${targetRoot}`);
  context.logger.info(
    `Skills: copied=${result.copiedSkills.length}, updated=${result.updatedSkills.length}, skipped=${result.skippedSkills.length}`,
  );
  context.logger.info(
    `Agents: copied=${result.copiedAgents.length}, updated=${result.updatedAgents.length}, skipped=${result.skippedAgents.length}`,
  );
  context.logger.info(
    `Templates: copied=${result.copiedTemplates.length}, updated=${result.updatedTemplates.length}, skipped=${result.skippedTemplates.length}`,
  );
  context.logger.info(
    `Scripts: copied=${result.copiedScripts.length}, updated=${result.updatedScripts.length}, skipped=${result.skippedScripts.length}`,
  );
  context.logger.info(
    `Projects root initialized: ${result.projectsRootInitialized ? 'yes' : 'no'}`,
  );
  context.logger.info('Run: oat sync --scope project --apply');
}

async function runInitToolsWorkflows(
  context: CommandContext,
  options: InitToolsWorkflowsOptions,
  dependencies: InitToolsWorkflowsDependencies,
): Promise<void> {
  try {
    if (context.scope === 'user') {
      throw new Error(PROJECT_SCOPE_ONLY_MESSAGE);
    }

    const targetRoot = await dependencies.resolveProjectRoot(context.cwd);

    if (options.force && context.interactive) {
      const confirmed = await dependencies.confirmAction(
        'Force overwrite existing workflows assets in project scope?',
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
    const result = await dependencies.installWorkflows({
      assetsRoot,
      targetRoot,
      force: options.force,
    });

    reportSuccess(context, targetRoot, assetsRoot, result);
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

export function createInitToolsWorkflowsCommand(
  overrides: Partial<InitToolsWorkflowsDependencies> = {},
): Command {
  const dependencies: InitToolsWorkflowsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('workflows')
    .description('Install OAT workflows skills, agents, templates, and scripts')
    .option('--force', 'Overwrite existing files where applicable')
    .action(async (options: InitToolsWorkflowsOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runInitToolsWorkflows(context, options, dependencies);
    });
}
