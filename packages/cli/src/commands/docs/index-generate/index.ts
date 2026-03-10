import { writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatConfig, writeOatConfig } from '@config/oat-config';
import { Command, Option } from 'commander';

import { generateIndex, renderIndex } from './generator';

interface IndexGenerateOptions {
  docsDir: string;
  output?: string;
}

interface IndexGenerateFileDependencies {
  generateIndex: (
    docsDir: string,
  ) => Promise<import('./generator').IndexEntry[]>;
  renderIndex: (entries: import('./generator').IndexEntry[]) => string;
  writeFile: (
    path: string,
    content: string,
    encoding: BufferEncoding,
  ) => Promise<void>;
  readOatConfig: (
    repoRoot: string,
  ) => Promise<import('@config/oat-config').OatConfig>;
  writeOatConfig: (
    repoRoot: string,
    config: import('@config/oat-config').OatConfig,
  ) => Promise<void>;
}

interface IndexGenerateDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  fileDeps: IndexGenerateFileDependencies;
}

const DEFAULT_FILE_DEPS: IndexGenerateFileDependencies = {
  generateIndex,
  renderIndex,
  writeFile,
  readOatConfig,
  writeOatConfig,
};

const DEFAULT_DEPENDENCIES: IndexGenerateDependencies = {
  buildCommandContext,
  fileDeps: DEFAULT_FILE_DEPS,
};

async function runIndexGenerate(
  context: CommandContext,
  options: IndexGenerateOptions,
  deps: IndexGenerateFileDependencies,
): Promise<void> {
  const docsDir = join(context.cwd, options.docsDir);
  const outputPath = options.output
    ? join(context.cwd, options.output)
    : join(context.cwd, 'index.md');

  const entries = await deps.generateIndex(docsDir);
  const content = deps.renderIndex(entries);

  await deps.writeFile(outputPath, content, 'utf8');

  const config = await deps.readOatConfig(context.cwd);
  config.documentation = {
    ...config.documentation,
    index: relative(context.cwd, outputPath) || 'index.md',
  };
  await deps.writeOatConfig(context.cwd, config);

  if (context.json) {
    context.logger.json({
      status: 'ok',
      entriesGenerated: entries.length,
      outputPath,
    });
    return;
  }

  context.logger.info(
    `Generated index with ${entries.length} entries → ${outputPath}`,
  );
}

async function runIndexGenerateCommand(
  context: CommandContext,
  options: IndexGenerateOptions,
  dependencies: IndexGenerateDependencies,
): Promise<void> {
  try {
    await runIndexGenerate(context, options, dependencies.fileDeps);
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

export function createDocsGenerateIndexCommand(
  overrides: Partial<IndexGenerateDependencies> = {},
): Command {
  const dependencies: IndexGenerateDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('generate-index')
    .description('Generate a docs index from markdown files')
    .addOption(
      new Option('--docs-dir <path>', 'Documentation source directory').default(
        'docs',
      ),
    )
    .addOption(
      new Option('--output <path>', 'Output file path (default: index.md)'),
    )
    .action(async (options: IndexGenerateOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runIndexGenerateCommand(context, options, dependencies);
    });
}
