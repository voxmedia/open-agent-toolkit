import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command } from 'commander';

import {
  generateThinIndex as defaultGenerateThinIndex,
  type GenerateThinIndexOptions,
  type GenerateThinIndexResult,
} from './thin-index';

interface IndexInitDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  generateThinIndex: (
    options: GenerateThinIndexOptions,
  ) => Promise<GenerateThinIndexResult>;
}

const DEFAULT_DEPENDENCIES: IndexInitDependencies = {
  buildCommandContext,
  generateThinIndex: defaultGenerateThinIndex,
};

async function runIndexInit(
  context: CommandContext,
  headSha: string | undefined,
  mergeBaseSha: string | undefined,
  dependencies: IndexInitDependencies,
): Promise<void> {
  try {
    const result = await dependencies.generateThinIndex({
      repoRoot: context.cwd,
      headSha,
      mergeBaseSha,
    });

    if (context.json) {
      context.logger.json({
        status: 'ok',
        outputPath: result.outputPath,
        repoName: result.repoName,
        packageManager: result.packageManager,
        entryPointCount: result.entryPointCount,
      });
    } else {
      context.logger.info(`Generated ${result.outputPath} (thin index)`);
      context.logger.info(`  Repo: ${result.repoName}`);
      context.logger.info(`  Package Manager: ${result.packageManager}`);
      context.logger.info(`  Entry Points: ${result.entryPointCount} detected`);
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

export function createIndexInitCommand(
  overrides: Partial<IndexInitDependencies> = {},
): Command {
  const dependencies: IndexInitDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('init')
    .description('Generate a thin project-index.md for quick repo orientation')
    .option('--head-sha <sha>', 'Override HEAD SHA')
    .option('--merge-base-sha <sha>', 'Override merge-base SHA')
    .action(
      async (
        options: { headSha?: string; mergeBaseSha?: string },
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runIndexInit(
          context,
          options.headSha,
          options.mergeBaseSha,
          dependencies,
        );
      },
    );
}

export function createIndexCommand(): Command {
  return new Command('index')
    .description('OAT index generation commands')
    .addCommand(createIndexInitCommand());
}
