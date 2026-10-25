import { readFile, realpath, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

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
import {
  compareFumadocsMembership,
  compareMkDocsMembership,
  type NavMembershipIssue,
} from './membership';

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
  nonReaderPaths?: readonly string[];
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

/** The repository's `documentation` block, when it names a root. */
interface ConfiguredDocumentation {
  /** Absolute configured app or content root. */
  root: string;
  /** Repository-relative root as configured. */
  configuredRoot: string;
  tooling: string | null;
  navOwner?: 'nav-sync' | 'hand-authored';
  nonReaderPaths: string[];
}

interface HandAuthoredNavigationResult {
  framework: DocsNavFramework;
  appRoot: string;
  docsRoot: string;
  issues: NavMembershipIssue[];
  unlisted: string[];
}

interface DocsNavSyncDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveConfiguredDocumentation: (
    cwd: string,
  ) => Promise<ConfiguredDocumentation | null>;
  syncDocsNavigation: (
    options: SyncDocsNavigationOptions,
  ) => Promise<SyncDocsNavigationResult>;
  checkHandAuthoredNavigation: (
    options: SyncDocsNavigationOptions,
  ) => Promise<HandAuthoredNavigationResult>;
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

async function resolveConfiguredDocumentation(
  cwd: string,
): Promise<ConfiguredDocumentation | null> {
  let repoRoot: string;
  try {
    repoRoot = await resolveProjectRoot(cwd);
  } catch {
    return null;
  } // Explicit app targets also work outside a configured repository.
  const documentation = (await readOatConfig(repoRoot)).documentation;
  const configuredRoot = documentation?.root?.trim();
  if (!configuredRoot) return null;
  return {
    root: resolve(repoRoot, configuredRoot),
    configuredRoot,
    tooling: documentation?.tooling?.trim() || null,
    navOwner: documentation?.navOwner,
    nonReaderPaths: documentation?.nonReaderPaths ?? [],
  };
}

/**
 * Read-only comparison for `navOwner: hand-authored`: the same
 * membership-and-order semantics as the `oat docs check` navigation rule,
 * never strict generator output.
 */
export async function checkHandAuthoredNavigation(
  options: SyncDocsNavigationOptions,
): Promise<HandAuthoredNavigationResult> {
  const docsRoot = join(options.appRoot, 'docs');
  const framework = await detectDocsNavFramework(
    options.appRoot,
    options.configuredTooling,
  );
  if (framework === 'mkdocs')
    return {
      framework,
      appRoot: options.appRoot,
      docsRoot,
      issues: await compareMkDocsMembership({
        appRoot: options.appRoot,
        docsRoot,
        nonReaderPaths: options.nonReaderPaths,
      }),
      unlisted: [],
    };
  const generated = await syncFumadocsNavigation({
    docsRoot,
    check: true,
    nonReaderPaths: options.nonReaderPaths,
  });
  return {
    framework,
    appRoot: options.appRoot,
    docsRoot,
    issues: await compareFumadocsMembership(docsRoot, generated.metaFiles),
    unlisted: generated.unlisted,
  };
}

const DEFAULT_DEPENDENCIES: DocsNavSyncDependencies = {
  buildCommandContext,
  resolveConfiguredDocumentation,
  syncDocsNavigation,
  checkHandAuthoredNavigation,
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
      nonReaderPaths: options.nonReaderPaths,
    });
    return {
      framework,
      appRoot: options.appRoot,
      docsRoot,
      ...result,
    };
  }

  const mkdocsPath = join(options.appRoot, 'mkdocs.yml');
  const nav = await buildDocsNavTree({
    docsRoot,
    nonReaderPaths: options.nonReaderPaths,
  });
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
  warnings: string[],
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
      ...(warnings.length ? { warnings } : {}),
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
  for (const warning of warnings) context.logger.warn(warning);
}

/**
 * `--check`: report drift without writing. Fails (exit 1) when any generated
 * navigation file is missing or would change or, for Fumadocs, any page or
 * folder is unlisted, since strict navigation hides it from the sidebar.
 */
function reportCheckResult(
  context: CommandContext,
  targetDir: string,
  result: SyncDocsNavigationResult,
  missing: string[],
  warnings: string[],
): boolean {
  const unlisted = result.framework === 'fumadocs' ? result.unlisted : [];
  const current = result.stale.length === 0 && unlisted.length === 0;
  const differing = result.stale.filter((path) => !missing.includes(path));

  if (context.json) {
    context.logger.json({
      status: current ? 'ok' : 'drift',
      check: true,
      framework: result.framework,
      appRoot: result.appRoot,
      docsRoot: result.docsRoot,
      stale: result.stale,
      missing,
      unlisted,
      ...(warnings.length ? { warnings } : {}),
    });
    return current;
  }

  for (const warning of warnings) context.logger.warn(warning);
  if (current) {
    context.logger.info(`Docs navigation is up to date in ${targetDir}`);
    return current;
  }

  context.logger.error(`Docs navigation is out of date in ${targetDir}`);
  if (missing.length > 0) {
    context.logger.error(`  ${missing.length} generated file(s) are missing:`);
    for (const path of missing) context.logger.error(`    ${path}`);
  }
  if (differing.length > 0) {
    context.logger.error(
      `  ${differing.length} generated file(s) differ from the index.md Contents maps:`,
    );
    for (const path of differing) context.logger.error(`    ${path}`);
  }
  if (unlisted.length > 0) {
    context.logger.error(
      `  ${unlisted.length} path(s) are not listed in any index.md Contents map ` +
        'and would be hidden from the sidebar:',
    );
    for (const path of unlisted) {
      context.logger.error(`    ${path}`);
    }
    context.logger.error(
      `  List every page in its directory's ## Contents, then run \`oat docs nav sync --target-dir ${targetDir}\`.`,
    );
  } else {
    context.logger.error(
      `  Run \`oat docs nav sync --target-dir ${targetDir}\` to regenerate the navigation.`,
    );
  }
  return current;
}

function reportHandAuthoredCheck(
  context: CommandContext,
  targetDir: string,
  result: HandAuthoredNavigationResult,
): boolean {
  const current = result.issues.length === 0 && result.unlisted.length === 0;
  if (context.json) {
    context.logger.json({
      status: current ? 'ok' : 'drift',
      check: true,
      navOwner: 'hand-authored',
      framework: result.framework,
      appRoot: result.appRoot,
      docsRoot: result.docsRoot,
      stale: [...new Set(result.issues.map((issue) => issue.path))].sort(),
      missing: [],
      unlisted: result.unlisted,
      issues: result.issues,
    });
    return current;
  }
  if (current) {
    context.logger.info(
      `Hand-authored docs navigation matches the index.md Contents maps in ${targetDir} (membership and order).`,
    );
    return current;
  }
  context.logger.error(
    `Hand-authored docs navigation differs from the index.md Contents maps in ${targetDir}:`,
  );
  for (const issue of result.issues)
    context.logger.error(
      `  ${issue.path}${issue.line === undefined ? '' : `:${issue.line}`} ${issue.message}`,
    );
  if (result.unlisted.length > 0) {
    context.logger.error(
      `  ${result.unlisted.length} path(s) are not listed in any index.md Contents map:`,
    );
    for (const path of result.unlisted) context.logger.error(`    ${path}`);
  }
  context.logger.error(
    '  Edit the hand-authored navigation or the Contents maps; nav sync does not regenerate hand-authored navigation.',
  );
  return current;
}

const MARKDOWN_NOT_APPLICABLE =
  'oat docs nav sync is not applicable to Markdown docs (documentation.tooling: markdown): the index.md Contents maps are the navigation and nothing is generated. Use oat docs check to validate them.';

async function runDocsNavSyncCommand(
  context: CommandContext,
  options: DocsNavSyncCommandOptions,
  dependencies: DocsNavSyncDependencies,
): Promise<void> {
  try {
    const configured = await dependencies.resolveConfiguredDocumentation(
      context.cwd,
    );
    // Like `oat docs check`, an omitted target is the configured root.
    const targetDir =
      options.targetDir ??
      (configured ? relative(context.cwd, configured.root) || '.' : '.');
    const appRoot = resolve(context.cwd, targetDir);
    // Compare filesystem identity so a symlinked alias of the configured
    // app keeps its ownership and exclusions.
    const canonical = async (path: string) =>
      realpath(path).catch(() => resolve(path));
    const documentation =
      configured &&
      (await canonical(configured.root)) === (await canonical(appRoot))
        ? configured
        : null;
    if (documentation?.tooling?.toLowerCase() === 'markdown')
      throw new Error(MARKDOWN_NOT_APPLICABLE);
    const navOwner = documentation?.navOwner;
    const syncOptions: SyncDocsNavigationOptions = {
      appRoot,
      configuredTooling: documentation?.tooling ?? null,
      check: options.check === true,
      nonReaderPaths: documentation?.nonReaderPaths ?? [],
    };

    if (navOwner === 'hand-authored') {
      if (!options.check)
        throw new Error(
          `documentation.navOwner is hand-authored, so oat docs nav sync will not overwrite the navigation in ${targetDir}. ` +
            'Edit meta.json (Fumadocs) or the mkdocs.yml nav (MkDocs) directly and run oat docs check, ' +
            'or compare it with `oat docs nav sync --check`. To hand navigation to nav sync, first run ' +
            '`oat config set documentation.navOwner nav-sync`.',
        );
      const result =
        await dependencies.checkHandAuthoredNavigation(syncOptions);
      process.exitCode = reportHandAuthoredCheck(context, targetDir, result)
        ? 0
        : 1;
      return;
    }

    const warnings =
      navOwner === undefined
        ? [
            options.check
              ? `No documentation.navOwner is declared for ${targetDir}, so this check compares with strict nav sync output. Declare ownership with \`oat config set documentation.navOwner nav-sync\`, or \`hand-authored\` for a membership-and-order comparison.`
              : `No documentation.navOwner is declared for ${targetDir}, so nav sync regenerated the navigation as its owner. Declare ownership with \`oat config set documentation.navOwner nav-sync\`, or \`hand-authored\` to protect hand-written navigation from regeneration.`,
          ]
        : [];
    const result = await dependencies.syncDocsNavigation(syncOptions);

    if (options.check) {
      const missing: string[] = [];
      if (result.framework === 'fumadocs')
        for (const path of result.stale)
          if (!(await fileExists(join(result.docsRoot, path))))
            missing.push(path);
      process.exitCode = reportCheckResult(
        context,
        targetDir,
        result,
        missing,
        warnings,
      )
        ? 0
        : 1;
      return;
    }

    if (result.framework === 'fumadocs') {
      reportFumadocsResult(context, targetDir, result, warnings);
    } else if (context.json) {
      context.logger.json({
        status: 'ok',
        appRoot: result.appRoot,
        docsRoot: result.docsRoot,
        mkdocsPath: result.mkdocsPath,
        nav: result.nav,
        ...(warnings.length ? { warnings } : {}),
      });
    } else {
      context.logger.info(`Synced docs navigation in ${targetDir}`);
      context.logger.info(`  MkDocs config: ${result.mkdocsPath}`);
      context.logger.info(`  Docs root: ${result.docsRoot}`);
      for (const warning of warnings) context.logger.warn(warning);
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
        'Docs app directory containing mkdocs.yml or source.config.ts (default: documentation.root, else the current directory)',
      ),
    )
    .addOption(
      new Option(
        '--check',
        'Write nothing; exit 1 if any navigation file is missing or stale or any page is unlisted (hand-authored navigation: membership and order only)',
      ),
    )
    .action(async (options: DocsNavSyncCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsNavSyncCommand(context, options, dependencies);
    });
}
