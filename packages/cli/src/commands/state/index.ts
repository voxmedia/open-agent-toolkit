import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import {
  generateStateDashboard as defaultGenerateStateDashboard,
  type GenerateStateOptions,
  type GenerateStateResult,
} from './generate';

interface StateRefreshDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  generateStateDashboard: (
    options: GenerateStateOptions,
  ) => Promise<GenerateStateResult>;
}

const DEFAULT_DEPENDENCIES: StateRefreshDependencies = {
  buildCommandContext,
  generateStateDashboard: defaultGenerateStateDashboard,
};

async function runStateRefresh(
  context: CommandContext,
  dependencies: StateRefreshDependencies,
): Promise<void> {
  try {
    const result = await dependencies.generateStateDashboard({
      repoRoot: context.cwd,
    });

    if (context.json) {
      context.logger.json({
        status: 'ok',
        dashboardPath: result.dashboardPath,
        projectName: result.projectName,
        projectStatus: result.projectStatus,
        stalenessStatus: result.stalenessStatus,
        recommendedStep: result.recommendedStep,
        recommendedReason: result.recommendedReason,
      });
    } else {
      context.logger.info(`Dashboard generated: ${result.dashboardPath}`);
      context.logger.info(
        `Recommended: ${result.recommendedStep} — ${result.recommendedReason}`,
      );
    }
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

export function createStateRefreshCommand(
  overrides: Partial<StateRefreshDependencies> = {},
): Command {
  const dependencies: StateRefreshDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('refresh')
    .description('Regenerate the OAT repo state dashboard (.oat/state.md)')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runStateRefresh(context, dependencies);
    });
}

export function createStateCommand(): Command {
  return new Command('state')
    .description('OAT repo state commands')
    .addCommand(createStateRefreshCommand());
}
