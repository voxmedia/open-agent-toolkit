import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { fileExists } from '@fs/io';
import { Command, Option } from 'commander';
import { convertAdmonitions } from './codemod';
import { injectFrontmatter } from './frontmatter';

interface MigrateOptions {
  docsDir: string;
  config?: string;
  apply: boolean;
}

interface MigrateFileDependencies {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (
    path: string,
    content: string,
    encoding: BufferEncoding,
  ) => Promise<void>;
  readdir: (
    path: string,
    options: { withFileTypes: true; recursive: true },
  ) => Promise<import('node:fs').Dirent[]>;
  fileExists: (path: string) => Promise<boolean>;
}

interface MigrateDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  fileDeps: MigrateFileDependencies;
}

interface FileChange {
  path: string;
  admonitionsConverted: number;
  titleInjected: boolean;
  descriptionSeeded: boolean;
}

function parseMkdocsNavTitles(yamlContent: string): Map<string, string> {
  const titles = new Map<string, string>();
  const lineRe = /^\s*-\s+(?:'([^']+)'|"([^"]+)")\s*:\s*(.+)\s*$/gm;
  for (const match of yamlContent.matchAll(lineRe)) {
    const title = match[1] ?? match[2]!;
    const path = match[3]!.trim().replace(/^['"]|['"]$/g, '');
    titles.set(path, title);
  }
  return titles;
}

async function migrateFiles(
  cwd: string,
  options: MigrateOptions,
  deps: MigrateFileDependencies,
): Promise<FileChange[]> {
  const docsDir = join(cwd, options.docsDir);
  const changes: FileChange[] = [];

  let navTitles = new Map<string, string>();
  if (options.config) {
    const configPath = join(cwd, options.config);
    if (await deps.fileExists(configPath)) {
      const yamlContent = await deps.readFile(configPath, 'utf8');
      navTitles = parseMkdocsNavTitles(yamlContent);
    }
  }

  const entries = await deps.readdir(docsDir, {
    withFileTypes: true,
    recursive: true,
  });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const parentPath = entry.parentPath ?? entry.path;
    const filePath = join(parentPath, entry.name);
    const relativePath = filePath.slice(docsDir.length + 1);
    const content = await deps.readFile(filePath, 'utf8');

    const admonitionResult = convertAdmonitions(content);
    const mkdocsTitle = navTitles.get(relativePath);
    const frontmatterResult = injectFrontmatter(admonitionResult.content, {
      mkdocsTitle,
      fileName: basename(filePath),
    });

    const hasChanges =
      admonitionResult.admonitionsConverted > 0 ||
      frontmatterResult.titleInjected ||
      frontmatterResult.descriptionSeeded;

    if (hasChanges) {
      if (options.apply) {
        await deps.writeFile(filePath, frontmatterResult.content, 'utf8');
      }
      changes.push({
        path: relativePath,
        admonitionsConverted: admonitionResult.admonitionsConverted,
        titleInjected: frontmatterResult.titleInjected,
        descriptionSeeded: frontmatterResult.descriptionSeeded,
      });
    }
  }

  return changes;
}

const DEFAULT_FILE_DEPS: MigrateFileDependencies = {
  readFile,
  writeFile,
  readdir: readdir as MigrateFileDependencies['readdir'],
  fileExists,
};

const DEFAULT_DEPENDENCIES: MigrateDependencies = {
  buildCommandContext,
  fileDeps: DEFAULT_FILE_DEPS,
};

async function runMigrateCommand(
  context: CommandContext,
  options: MigrateOptions,
  dependencies: MigrateDependencies,
): Promise<void> {
  try {
    const changes = await migrateFiles(
      context.cwd,
      options,
      dependencies.fileDeps,
    );

    const mode = options.apply ? 'applied' : 'dry-run';

    if (context.json) {
      context.logger.json({
        status: 'ok',
        mode,
        filesScanned: changes.length,
        changes,
      });
      process.exitCode = 0;
      return;
    }

    if (changes.length === 0) {
      context.logger.info('No files need migration.');
      process.exitCode = 0;
      return;
    }

    context.logger.info(`Migration ${mode}: ${changes.length} file(s) changed`);
    for (const change of changes) {
      const parts: string[] = [];
      if (change.admonitionsConverted > 0) {
        parts.push(`${change.admonitionsConverted} admonition(s)`);
      }
      if (change.titleInjected) {
        parts.push('title injected');
      }
      if (change.descriptionSeeded) {
        parts.push('description seeded');
      }
      context.logger.info(`  ${change.path}: ${parts.join(', ')}`);
    }

    if (!options.apply) {
      context.logger.info('\nRe-run with --apply to write changes.');
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

export function createDocsMigrateCommand(
  overrides: Partial<MigrateDependencies> = {},
): Command {
  const dependencies: MigrateDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('migrate')
    .description(
      'Migrate MkDocs markdown to Fumadocs format (admonitions, frontmatter)',
    )
    .addOption(
      new Option('--docs-dir <path>', 'Documentation source directory').default(
        'docs',
      ),
    )
    .addOption(
      new Option('--config <path>', 'Path to mkdocs.yml for nav title lookup'),
    )
    .option('--apply', 'Apply changes (default: dry-run)', false)
    .action(async (options: MigrateOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runMigrateCommand(context, options, dependencies);
    });
}
