import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readlink,
  rename,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { Command } from 'commander';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '../../app/command-context';
import { type DriftReport, detectStrays } from '../../drift';
import { type CanonicalEntry, scanCanonical } from '../../engine';
import { createSymlink, ensureDir } from '../../fs/io';
import { resolveProjectRoot, resolveScopeRoot } from '../../fs/paths';
import { computeDirectoryHash } from '../../manifest/hash';
import {
  addEntry,
  createEmptyManifest,
  loadManifest,
  saveManifest,
} from '../../manifest/manager';
import type { Manifest, ManifestEntry } from '../../manifest/manifest.types';
import { claudeAdapter } from '../../providers/claude';
import { codexAdapter } from '../../providers/codex';
import { cursorAdapter } from '../../providers/cursor';
import {
  getActiveAdapters,
  getSyncMappings,
  type PathMapping,
} from '../../providers/shared';
import {
  confirmAction,
  type PromptContext,
  type SelectChoice,
  selectWithAbort,
} from '../../shared/prompts';
import type { ConcreteScope, Scope } from '../../shared/types';
import { readGlobalOptions, resolveConcreteScopes } from '../shared';

const ADOPT_REMEDIATION =
  'Run "oat init" interactively to adopt stray entries.';
const HOOK_PROMPT = 'Install optional pre-commit hook for drift warnings?';
const HOOK_GUIDANCE =
  'Run "oat init --hook" to install optional pre-commit hook.';
const HOOK_MARKER_START = '# >>> oat pre-commit hook >>>';
const HOOK_MARKER_END = '# <<< oat pre-commit hook <<<';

interface InitOptions extends GlobalOptions {
  hook?: boolean;
}

export interface InitStrayCandidate {
  provider: string;
  report: DriftReport;
  mapping: PathMapping;
}

interface InitDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  ensureCanonicalDirs: (
    scopeRoot: string,
    scope: ConcreteScope,
  ) => Promise<void>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  saveManifest: (manifestPath: string, manifest: Manifest) => Promise<void>;
  scanCanonical: (
    scopeRoot: string,
    scope: ConcreteScope,
  ) => Promise<CanonicalEntry[]>;
  collectStrays: (
    scopeRoot: string,
    scope: ConcreteScope,
    manifest: Manifest,
    canonicalEntries: CanonicalEntry[],
  ) => Promise<InitStrayCandidate[]>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  adoptStray: (
    scopeRoot: string,
    stray: InitStrayCandidate,
    manifest: Manifest,
  ) => Promise<Manifest>;
  isHookInstalled: (projectRoot: string) => Promise<boolean>;
  installHook: (projectRoot: string) => Promise<void>;
}

interface InitScopeSummary {
  scope: ConcreteScope;
  straysFound: number;
  straysAdopted: number;
}

interface InitJsonPayload {
  scope: Scope;
  directoriesCreated: number;
  straysFound: number;
  straysAdopted: number;
  hookInstalled: boolean | null;
  scopes: InitScopeSummary[];
}

type AdoptionSelection = 'adopt' | 'skip' | 'skip_all';

function normalizePath(pathValue: string): string {
  return pathValue.replaceAll('\\', '/');
}

async function ensureCanonicalDirectories(
  scopeRoot: string,
  scope: ConcreteScope,
): Promise<void> {
  await mkdir(join(scopeRoot, '.agents', 'skills'), { recursive: true });
  if (scope === 'project') {
    await mkdir(join(scopeRoot, '.agents', 'agents'), { recursive: true });
  }
}

function createHookSnippet(options: { includeShebang?: boolean } = {}): string {
  const lines = [
    HOOK_MARKER_START,
    'if command -v oat >/dev/null 2>&1; then',
    '  if ! oat status >/dev/null 2>&1; then',
    `    echo "oat: provider views are out of sync - run 'oat sync --apply' to fix" >&2`,
    '  fi',
    'fi',
    HOOK_MARKER_END,
  ];

  if (!options.includeShebang) {
    return lines.join('\n');
  }

  return ['#!/bin/sh', '', ...lines].join('\n');
}

async function resolveHooksDirectory(
  projectRoot: string,
  options: { createIfMissing?: boolean } = {},
): Promise<string> {
  const hooksDir = join(projectRoot, '.git', 'hooks');
  const shouldCreate = options.createIfMissing ?? false;

  try {
    const hooksStat = await lstat(hooksDir);
    if (!hooksStat.isSymbolicLink()) {
      return hooksDir;
    }

    const symlinkTarget = await readlink(hooksDir);
    const resolvedTarget = resolve(dirname(hooksDir), symlinkTarget);
    if (shouldCreate) {
      await ensureDir(resolvedTarget);
    }
    return resolvedTarget;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      if (shouldCreate) {
        await ensureDir(hooksDir);
      }
      return hooksDir;
    }
    throw error;
  }
}

async function isHookInstalledDefault(projectRoot: string): Promise<boolean> {
  const hooksDir = await resolveHooksDirectory(projectRoot);
  const hookPath = join(hooksDir, 'pre-commit');
  try {
    const content = await readFile(hookPath, 'utf8');
    return content.includes(HOOK_MARKER_START);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

async function installHookDefault(projectRoot: string): Promise<void> {
  const hooksDir = await resolveHooksDirectory(projectRoot, {
    createIfMissing: true,
  });
  const hookPath = join(hooksDir, 'pre-commit');

  let current = '';
  try {
    current = await readFile(hookPath, 'utf8');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  if (current.includes(HOOK_MARKER_START)) {
    await chmod(hookPath, 0o755);
    return;
  }

  const includeShebang = current.trim().length === 0;
  const snippet = createHookSnippet({ includeShebang });
  await ensureDir(dirname(hookPath));
  const next =
    current.trim().length > 0
      ? `${current.trimEnd()}\n\n${snippet}\n`
      : `${snippet}\n`;
  await writeFile(hookPath, next, 'utf8');
  await chmod(hookPath, 0o755);
}

async function collectStraysDefault(
  scopeRoot: string,
  scope: ConcreteScope,
  manifest: Manifest,
  canonicalEntries: CanonicalEntry[],
): Promise<InitStrayCandidate[]> {
  const adapters = [claudeAdapter, cursorAdapter, codexAdapter];
  const activeAdapters = await getActiveAdapters(adapters, scopeRoot);
  const candidates: InitStrayCandidate[] = [];

  for (const adapter of activeAdapters) {
    const mappings = getSyncMappings(adapter, scope);
    for (const mapping of mappings) {
      const providerDir = join(scopeRoot, mapping.providerDir);
      const strays = await detectStrays(
        adapter.name,
        providerDir,
        manifest,
        canonicalEntries,
      );
      for (const report of strays) {
        if (report.state.status !== 'stray') {
          continue;
        }
        candidates.push({
          provider: adapter.name,
          report,
          mapping,
        });
      }
    }
  }

  return candidates;
}

async function adoptStrayDefault(
  scopeRoot: string,
  stray: InitStrayCandidate,
  manifest: Manifest,
): Promise<Manifest> {
  const providerAbsolutePath = resolve(scopeRoot, stray.report.providerPath);
  const entryName = basename(stray.report.providerPath);
  const canonicalAbsolutePath = resolve(
    scopeRoot,
    stray.mapping.canonicalDir,
    entryName,
  );

  await ensureDir(dirname(canonicalAbsolutePath));
  await rename(providerAbsolutePath, canonicalAbsolutePath);
  const strategy = await createSymlink(
    canonicalAbsolutePath,
    providerAbsolutePath,
  );

  const canonicalPath = normalizePath(
    relative(scopeRoot, canonicalAbsolutePath),
  );
  const providerPath = normalizePath(relative(scopeRoot, providerAbsolutePath));
  const manifestEntry: ManifestEntry = {
    canonicalPath,
    providerPath,
    provider: stray.provider,
    contentType: stray.mapping.contentType,
    strategy,
    contentHash:
      strategy === 'copy'
        ? await computeDirectoryHash(canonicalAbsolutePath)
        : null,
    lastSynced: new Date().toISOString(),
  };

  return addEntry(manifest, manifestEntry);
}

function createDependencies(): InitDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    ensureCanonicalDirs: ensureCanonicalDirectories,
    loadManifest,
    saveManifest,
    scanCanonical,
    collectStrays: collectStraysDefault,
    confirmAction,
    selectWithAbort,
    adoptStray: adoptStrayDefault,
    isHookInstalled: isHookInstalledDefault,
    installHook: installHookDefault,
  };
}

async function maybeHandleHook(
  context: CommandContext,
  dependencies: InitDependencies,
  projectRoot: string | null,
  hookFlag: boolean | undefined,
): Promise<boolean | null> {
  if (!projectRoot) {
    return null;
  }

  const installed = await dependencies.isHookInstalled(projectRoot);

  if (installed && hookFlag === undefined) {
    return true;
  }

  let shouldInstall = false;
  if (hookFlag === true) {
    shouldInstall = true;
  } else if (hookFlag === false) {
    shouldInstall = false;
  } else if (context.interactive) {
    shouldInstall = await dependencies.confirmAction(HOOK_PROMPT, {
      interactive: context.interactive,
    });
  } else {
    context.logger.info(HOOK_GUIDANCE);
    return installed;
  }

  if (shouldInstall && !installed) {
    await dependencies.installHook(projectRoot);
    context.logger.success('Installed optional pre-commit hook.');
    return true;
  }

  return installed || shouldInstall;
}

async function runInitCommand(
  context: CommandContext,
  dependencies: InitDependencies,
  hookFlag: boolean | undefined,
): Promise<void> {
  const scopes = resolveConcreteScopes(context.scope);
  let projectRoot: string | null = null;
  const scopeSummaries: InitScopeSummary[] = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    if (scope === 'project') {
      projectRoot = scopeRoot;
    }

    await dependencies.ensureCanonicalDirs(scopeRoot, scope);

    const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
    let manifest = await dependencies.loadManifest(manifestPath);
    if (!manifest.entries) {
      manifest = createEmptyManifest();
    }

    const canonicalEntries = await dependencies.scanCanonical(scopeRoot, scope);
    const strays = await dependencies.collectStrays(
      scopeRoot,
      scope,
      manifest,
      canonicalEntries,
    );
    let straysAdopted = 0;

    if (!context.interactive && strays.length > 0) {
      context.logger.warn(ADOPT_REMEDIATION);
    }

    if (context.interactive) {
      let skipRemaining = false;
      for (const stray of strays) {
        if (skipRemaining) {
          break;
        }

        const selection = await dependencies.selectWithAbort<AdoptionSelection>(
          `Handle stray ${stray.report.providerPath} from ${stray.provider}`,
          [
            { label: 'Adopt', value: 'adopt' },
            { label: 'Skip', value: 'skip' },
            { label: 'Skip all remaining', value: 'skip_all' },
          ],
          { interactive: context.interactive },
        );

        if (selection === 'skip_all') {
          skipRemaining = true;
          continue;
        }
        if (selection !== 'adopt') {
          continue;
        }

        manifest = await dependencies.adoptStray(scopeRoot, stray, manifest);
        straysAdopted += 1;
      }
    }

    await dependencies.saveManifest(manifestPath, manifest);
    scopeSummaries.push({
      scope,
      straysFound: strays.length,
      straysAdopted,
    });
  }

  const hookInstalled = await maybeHandleHook(
    context,
    dependencies,
    projectRoot,
    hookFlag,
  );
  if (context.json) {
    const payload: InitJsonPayload = {
      scope: context.scope,
      directoriesCreated: scopeSummaries.length,
      straysFound: scopeSummaries.reduce(
        (total, summary) => total + summary.straysFound,
        0,
      ),
      straysAdopted: scopeSummaries.reduce(
        (total, summary) => total + summary.straysAdopted,
        0,
      ),
      hookInstalled,
      scopes: scopeSummaries,
    };
    context.logger.json(payload);
  }

  process.exitCode = 0;
}

export function createInitCommand(
  overrides: Partial<InitDependencies> = {},
): Command {
  const dependencies: InitDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('init')
    .description('Initialize canonical directories and manifest')
    .option('--hook', 'Install optional pre-commit hook')
    .option('--no-hook', 'Skip optional pre-commit hook install')
    .action(async (_options, command: Command) => {
      const options = readGlobalOptions(command) as InitOptions;
      const context = dependencies.buildCommandContext(options);
      await runInitCommand(context, dependencies, options.hook);
    });
}
