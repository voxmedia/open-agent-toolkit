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

interface DocsNavSyncCommandOptions {
  targetDir?: string;
}

interface SyncDocsNavigationOptions {
  appRoot: string;
}

interface SyncDocsNavigationResult {
  appRoot: string;
  docsRoot: string;
  mkdocsPath: string;
  nav: DocsNavTree;
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
  await writeFile(mkdocsPath, `${updatedMkdocsSource.trimEnd()}\n`, 'utf8');

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
    });

    if (context.json) {
      context.logger.json({
        status: 'ok',
        appRoot: result.appRoot,
        docsRoot: result.docsRoot,
        mkdocsPath: result.mkdocsPath,
        nav: result.nav,
      });
    } else {
      context.logger.info(`Synced docs navigation in ${targetDir}`);
      context.logger.info(`  MkDocs config: ${result.mkdocsPath}`);
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
      new Option(
        '--target-dir <path>',
        'Docs app directory containing mkdocs.yml',
      ),
    )
    .action(async (options: DocsNavSyncCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsNavSyncCommand(context, options, dependencies);
    });
}
