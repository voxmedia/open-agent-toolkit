import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

interface DocsAnalyzeDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
}

const DEFAULT_DEPENDENCIES: DocsAnalyzeDependencies = {
  buildCommandContext,
};

function buildAnalyzeGuidance() {
  return {
    status: 'ok' as const,
    command: 'oat docs analyze',
    skill: 'oat-docs-analyze',
    artifactDirectory: '.oat/repo/analysis',
    message: 'Docs analysis currently runs through the oat-docs-analyze skill.',
    nextSteps: [
      'Run oat-docs-analyze to generate a docs analysis artifact.',
      'Review the generated artifact in .oat/repo/analysis/.',
      'Use oat docs apply after analysis is available.',
    ],
  };
}

async function runDocsAnalyzeCommand(context: CommandContext): Promise<void> {
  const guidance = buildAnalyzeGuidance();

  if (context.json) {
    context.logger.json(guidance);
  } else {
    context.logger.info(guidance.message);
    context.logger.info('  Skill: oat-docs-analyze');
    context.logger.info('  Artifact dir: .oat/repo/analysis');
    context.logger.info('  Next: run oat docs apply after reviewing findings.');
  }

  process.exitCode = 0;
}

export function createDocsAnalyzeCommand(
  overrides: Partial<DocsAnalyzeDependencies> = {},
): Command {
  const dependencies: DocsAnalyzeDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('analyze')
    .description('Run the docs analysis workflow')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsAnalyzeCommand(context);
    });
}
