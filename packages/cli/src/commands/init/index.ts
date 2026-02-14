import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Command } from 'commander';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '../../app/command-context';
import { type DriftReport, detectStrays } from '../../drift';
import {
  type CanonicalEntry,
  installHook,
  isHookInstalled,
  scanCanonical,
  uninstallHook,
} from '../../engine';
import { resolveProjectRoot, resolveScopeRoot } from '../../fs/paths';
import {
  createEmptyManifest,
  loadManifest,
  saveManifest,
} from '../../manifest/manager';
import type { Manifest } from '../../manifest/manifest.types';
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
import { adoptStrayToCanonical } from '../shared/adopt-stray';

const ADOPT_REMEDIATION =
  'Run "oat init" interactively to adopt stray entries.';
const HOOK_PROMPT = 'Install optional pre-commit hook for drift warnings?';
const HOOK_GUIDANCE =
  'Run "oat init --hook" to install optional pre-commit hook.';

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
  uninstallHook: (projectRoot: string) => Promise<void>;
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

async function ensureCanonicalDirectories(
  scopeRoot: string,
  scope: ConcreteScope,
): Promise<void> {
  await mkdir(join(scopeRoot, '.agents', 'skills'), { recursive: true });
  if (scope === 'project') {
    await mkdir(join(scopeRoot, '.agents', 'agents'), { recursive: true });
  }
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
  return adoptStrayToCanonical(scopeRoot, stray, manifest);
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
    isHookInstalled,
    installHook,
    uninstallHook,
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

  if (hookFlag === false) {
    if (installed) {
      await dependencies.uninstallHook(projectRoot);
      context.logger.success('Removed optional pre-commit hook.');
    }
    return false;
  }

  if (installed && hookFlag === undefined) {
    return true;
  }

  let shouldInstall = false;
  if (hookFlag === true) {
    shouldInstall = true;
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
