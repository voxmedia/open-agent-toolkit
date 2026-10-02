import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { Command, Option } from 'commander';
import YAML from 'yaml';

import { buildDocsNavTree, type DocsNavTree } from './contents';
import { syncFumadocsNavigation } from './fumadocs';

interface DocsNavSyncCommandOptions {
  targetDir?: string;
  framework?: 'mkdocs' | 'fumadocs';
  check?: boolean;
  validateOnly?: boolean;
}

interface SyncDocsNavigationOptions {
  appRoot: string;
  framework?: 'mkdocs' | 'fumadocs';
  check?: boolean;
  validateOnly?: boolean;
}

interface SyncDocsNavigationResult {
  appRoot: string;
  docsRoot: string;
  mkdocsPath?: string;
  nav?: DocsNavTree;
  metadata?: string[];
}

interface DocsNavSyncDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  syncDocsNavigation: (
    options: SyncDocsNavigationOptions,
  ) => Promise<SyncDocsNavigationResult>;
}

const DEFAULT_DEPENDENCIES: DocsNavSyncDependencies = {
  buildCommandContext,
  syncDocsNavigation,
};

function replaceTopLevelYamlSection(
  source: string,
  key: string,
  replacement: string,
): string {
  const lines = source.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.startsWith(`${key}:`));

  if (startIndex < 0) {
    return `${source.trimEnd()}\n\n${replacement.trimEnd()}\n`;
  }

  let endIndex = startIndex + 1;
  while (endIndex < lines.length) {
    const line = lines[endIndex] ?? '';
    if (line.length > 0 && /^\S/.test(line)) {
      break;
    }
    endIndex += 1;
  }

  return [
    ...lines.slice(0, startIndex),
    ...replacement.trimEnd().split('\n'),
    ...lines.slice(endIndex),
  ].join('\n');
}

export async function syncDocsNavigation(
  options: SyncDocsNavigationOptions,
): Promise<SyncDocsNavigationResult> {
  if (options.check && options.validateOnly)
    throw new Error('--check and --validate-only are mutually exclusive');
  if (options.framework === 'fumadocs') {
    return {
      appRoot: options.appRoot,
      ...(await syncFumadocsNavigation(options)),
    };
  }
  if (options.validateOnly)
    throw new Error('--validate-only requires --framework fumadocs');
  const mkdocsPath = join(options.appRoot, 'mkdocs.yml');
  const docsRoot = join(options.appRoot, 'docs');
  const nav = await buildDocsNavTree({ docsRoot });
  const mkdocsSource = await readFile(mkdocsPath, 'utf8');
  const navSection = YAML.stringify({ nav }).trimEnd();
  const updatedMkdocsSource = replaceTopLevelYamlSection(
    mkdocsSource,
    'nav',
    navSection,
  );
  const output = `${updatedMkdocsSource.trimEnd()}\n`;
  if (options.check) {
    if (mkdocsSource !== output)
      throw new Error('MkDocs navigation differs; run oat docs nav sync');
  } else {
    await writeFile(mkdocsPath, output, 'utf8');
  }

  return {
    appRoot: options.appRoot,
    docsRoot,
    mkdocsPath,
    nav,
  };
}

async function runDocsNavSyncCommand(
  context: CommandContext,
  options: DocsNavSyncCommandOptions,
  dependencies: DocsNavSyncDependencies,
): Promise<void> {
  try {
    const targetDir = options.targetDir ?? '.';
    const result = await dependencies.syncDocsNavigation({
      appRoot: resolve(context.cwd, targetDir),
      framework: options.framework,
      check: options.check,
      validateOnly: options.validateOnly,
    });

    if (context.json) {
      context.logger.json({ status: 'ok', ...result });
    } else {
      context.logger.info(
        `${options.check || options.validateOnly ? 'Validated' : 'Synced'} docs navigation in ${targetDir}`,
      );
      if (result.mkdocsPath)
        context.logger.info(`  MkDocs config: ${result.mkdocsPath}`);
      if (result.metadata)
        context.logger.info(
          `  Fumadocs metadata: ${result.metadata.length} files`,
        );
      context.logger.info(`  Docs root: ${result.docsRoot}`);
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

export function createDocsNavSyncCommand(
  overrides: Partial<DocsNavSyncDependencies> = {},
): Command {
  const dependencies: DocsNavSyncDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('sync')
    .description('Regenerate docs navigation from index.md contents')
    .addOption(
      new Option('--target-dir <path>', 'Docs app directory containing docs/'),
    )
    .addOption(
      new Option('--framework <name>', 'Navigation framework')
        .choices(['mkdocs', 'fumadocs'])
        .default('mkdocs'),
    )
    .option('--check', 'Compare generated navigation without writing')
    .option(
      '--validate-only',
      'Validate Fumadocs sources without reading or writing output',
    )
    .action(async (options: DocsNavSyncCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsNavSyncCommand(context, options, dependencies);
    });
}
