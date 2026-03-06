import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

interface DocsApplyDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
}

const DEFAULT_DEPENDENCIES: DocsApplyDependencies = {
  buildCommandContext,
};

function buildApplyGuidance() {
  return {
    status: 'ok' as const,
    command: 'oat docs apply',
    skill: 'oat-docs-apply',
    artifactDirectory: '.oat/repo/analysis',
    message: 'Docs apply currently runs through the oat-docs-apply skill.',
    nextSteps: [
      'Confirm a recent docs analysis artifact exists in .oat/repo/analysis/.',
      'Run oat-docs-apply to review recommendations and approve changes.',
      'Use the generated branch and PR flow from the apply skill.',
    ],
  };
}

async function runDocsApplyCommand(context: CommandContext): Promise<void> {
  const guidance = buildApplyGuidance();

  if (context.json) {
    context.logger.json(guidance);
  } else {
    context.logger.info(guidance.message);
    context.logger.info('  Skill: oat-docs-apply');
    context.logger.info('  Requires: latest docs analysis artifact');
    context.logger.info('  Artifact dir: .oat/repo/analysis');
  }

  process.exitCode = 0;
}

export function createDocsApplyCommand(
  overrides: Partial<DocsApplyDependencies> = {},
): Command {
  const dependencies: DocsApplyDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('apply')
    .description('Run the docs apply workflow')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsApplyCommand(context);
    });
}
