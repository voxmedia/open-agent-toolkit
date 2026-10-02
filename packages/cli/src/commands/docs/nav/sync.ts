import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatConfig } from '@config/oat-config';
import { fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command, Option } from 'commander';
import YAML from 'yaml';

import { buildDocsNavTree, type DocsNavTree } from './contents';
import { syncFumadocsNavigation, type FumadocsMetaFile } from './fumadocs';

export type DocsNavFramework = 'fumadocs' | 'mkdocs';

interface DocsNavSyncCommandOptions {
  targetDir?: string;
  check?: boolean;
}

interface SyncDocsNavigationOptions {
  appRoot: string;
  /**
   * `documentation.tooling` from `.oat/config.json` when the app is the
   * configured docs root. Used only when no framework marker file is found.
   */
  configuredTooling?: string | null;
  /** Compute the navigation and compare it with the files; write nothing. */
  check?: boolean;
}

interface MkDocsNavigationResult {
  framework: 'mkdocs';
  appRoot: string;
  docsRoot: string;
  mkdocsPath: string;
  nav: DocsNavTree;
  /** `['mkdocs.yml']` when its `nav:` block differed before this run. */
  stale: string[];
}

interface FumadocsNavigationResult {
  framework: 'fumadocs';
  appRoot: string;
  docsRoot: string;
  metaFiles: FumadocsMetaFile[];
  written: string[];
  stale: string[];
  unlisted: string[];
}

type SyncDocsNavigationResult =
  | MkDocsNavigationResult
  | FumadocsNavigationResult;

interface DocsNavSyncDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveConfiguredTooling: (
    cwd: string,
    appRoot: string,
  ) => Promise<string | null>;
  syncDocsNavigation: (
    options: SyncDocsNavigationOptions,
  ) => Promise<SyncDocsNavigationResult>;
}

const MKDOCS_MARKERS = ['mkdocs.yml'];
const FUMADOCS_MARKERS = [
  'source.config.ts',
  'source.config.mts',
  'source.config.js',
  'source.config.mjs',
];

async function hasAnyMarker(
  appRoot: string,
  markers: readonly string[],
): Promise<boolean> {
  for (const marker of markers) {
    if (await fileExists(join(appRoot, marker))) {
      return true;
    }
  }
  return false;
}

/**
 * Detect the docs framework from the app's own files: `mkdocs.yml` keeps the
 * MkDocs path (checked first, so existing MkDocs apps behave as before) and a
 * Fumadocs `source.config.*` selects `meta.json` output. Without either
 * marker, a configured `documentation.tooling` decides.
 */
export async function detectDocsNavFramework(
  appRoot: string,
  configuredTooling?: string | null,
): Promise<DocsNavFramework> {
  if (await hasAnyMarker(appRoot, MKDOCS_MARKERS)) {
    return 'mkdocs';
  }
  if (await hasAnyMarker(appRoot, FUMADOCS_MARKERS)) {
    return 'fumadocs';
  }
  const tooling = configuredTooling?.trim().toLowerCase();
  if (tooling === 'mkdocs' || tooling === 'fumadocs') {
    return tooling;
  }
  throw new Error(
    `Could not detect the docs framework in ${appRoot}: expected mkdocs.yml (MkDocs) ` +
      'or source.config.ts (Fumadocs).',
  );
}

async function resolveConfiguredTooling(
  cwd: string,
  appRoot: string,
): Promise<string | null> {
  try {
    const repoRoot = await resolveProjectRoot(cwd);
    const config = await readOatConfig(repoRoot);
    const root = config.documentation?.root?.trim();
    if (!root || resolve(repoRoot, root) !== appRoot) {
      return null;
    }
    return config.documentation?.tooling?.trim() || null;
  } catch {
    return null;
  }
}

const DEFAULT_DEPENDENCIES: DocsNavSyncDependencies = {
  buildCommandContext,
  resolveConfiguredTooling,
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
  const docsRoot = join(options.appRoot, 'docs');
  const framework = await detectDocsNavFramework(
    options.appRoot,
    options.configuredTooling,
  );

  if (framework === 'fumadocs') {
    const result = await syncFumadocsNavigation({
      docsRoot,
      check: options.check,
    });
    return {
      framework,
      appRoot: options.appRoot,
      docsRoot,
      ...result,
    };
  }

  const mkdocsPath = join(options.appRoot, 'mkdocs.yml');
  const nav = await buildDocsNavTree({ docsRoot });
  const mkdocsSource = await readFile(mkdocsPath, 'utf8');
  const navSection = YAML.stringify({ nav }).trimEnd();
  const updatedMkdocsSource = replaceTopLevelYamlSection(
    mkdocsSource,
    'nav',
    navSection,
  );
  const nextMkdocsSource = `${updatedMkdocsSource.trimEnd()}\n`;
  if (!options.check) {
    await writeFile(mkdocsPath, nextMkdocsSource, 'utf8');
  }

  return {
    framework,
    appRoot: options.appRoot,
    docsRoot,
    mkdocsPath,
    nav,
    stale: nextMkdocsSource === mkdocsSource ? [] : ['mkdocs.yml'],
  };
}

function reportFumadocsResult(
  context: CommandContext,
  targetDir: string,
  result: FumadocsNavigationResult,
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      framework: result.framework,
      appRoot: result.appRoot,
      docsRoot: result.docsRoot,
      metaFiles: result.metaFiles,
      written: result.written,
      unlisted: result.unlisted,
    });
    return;
  }

  context.logger.info(`Synced docs navigation in ${targetDir}`);
  context.logger.info('  Framework: Fumadocs (meta.json)');
  context.logger.info(`  Docs root: ${result.docsRoot}`);
  if (result.written.length === 0) {
    context.logger.info('  No meta.json changes');
  } else {
    context.logger.info(`  Wrote ${result.written.length} meta.json file(s):`);
    for (const path of result.written) {
      context.logger.info(`    ${path}`);
    }
  }
  if (result.unlisted.length > 0) {
    context.logger.warn(
      `  ${result.unlisted.length} path(s) are not listed in any index.md Contents map ` +
        'and stay out of the navigation:',
    );
    for (const path of result.unlisted) {
      context.logger.warn(`    ${path}`);
    }
  }
}

/**
 * `--check`: report drift without writing. Fails (exit 1) when any generated
 * navigation file would change or, for Fumadocs, any page or folder is
 * unlisted, since strict navigation hides it from the sidebar.
 */
function reportCheckResult(
  context: CommandContext,
  targetDir: string,
  result: SyncDocsNavigationResult,
): boolean {
  const unlisted = result.framework === 'fumadocs' ? result.unlisted : [];
  const current = result.stale.length === 0 && unlisted.length === 0;

  if (context.json) {
    context.logger.json({
      status: current ? 'ok' : 'drift',
      check: true,
      framework: result.framework,
      appRoot: result.appRoot,
      docsRoot: result.docsRoot,
      stale: result.stale,
      unlisted,
    });
    return current;
  }

  if (current) {
    context.logger.info(`Docs navigation is up to date in ${targetDir}`);
    return current;
  }

  context.logger.error(`Docs navigation is out of date in ${targetDir}`);
  if (result.stale.length > 0) {
    context.logger.error(
      `  ${result.stale.length} generated file(s) differ from the index.md Contents maps:`,
    );
    for (const path of result.stale) {
      context.logger.error(`    ${path}`);
    }
  }
  if (unlisted.length > 0) {
    context.logger.error(
      `  ${unlisted.length} path(s) are not listed in any index.md Contents map ` +
        'and would be hidden from the sidebar:',
    );
    for (const path of unlisted) {
      context.logger.error(`    ${path}`);
    }
  }
  context.logger.error(
    `  List every page in its directory's ## Contents, then run \`oat docs nav sync --target-dir ${targetDir}\`.`,
  );
  return current;
}

async function runDocsNavSyncCommand(
  context: CommandContext,
  options: DocsNavSyncCommandOptions,
  dependencies: DocsNavSyncDependencies,
): Promise<void> {
  try {
    const targetDir = options.targetDir ?? '.';
    const appRoot = resolve(context.cwd, targetDir);
    const result = await dependencies.syncDocsNavigation({
      appRoot,
      configuredTooling: await dependencies.resolveConfiguredTooling(
        context.cwd,
        appRoot,
      ),
      check: options.check === true,
    });

    if (options.check) {
      process.exitCode = reportCheckResult(context, targetDir, result) ? 0 : 1;
      return;
    }

    if (result.framework === 'fumadocs') {
      reportFumadocsResult(context, targetDir, result);
    } else if (context.json) {
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
    .description(
      'Regenerate docs navigation from index.md contents: mkdocs.yml nav (MkDocs) or strict meta.json files (Fumadocs)',
    )
    .addOption(
      new Option(
        '--target-dir <path>',
        'Docs app directory containing mkdocs.yml or source.config.ts',
      ),
    )
    .addOption(
      new Option(
        '--check',
        'Write nothing; exit 1 if any navigation file is stale or any page is unlisted',
      ),
    )
    .action(async (options: DocsNavSyncCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsNavSyncCommand(context, options, dependencies);
    });
}
