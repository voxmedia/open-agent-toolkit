import { join } from 'node:path';
import { Command } from 'commander';
import {
  buildCommandContext,
  type CommandContext,
} from '../../app/command-context';
import { DEFAULT_SYNC_CONFIG, loadSyncConfig } from '../../config';
import { computeSyncPlan, executeSyncPlan, scanCanonical } from '../../engine';
import { resolveProjectRoot, resolveScopeRoot } from '../../fs/paths';
import { loadManifest } from '../../manifest';
import { claudeAdapter } from '../../providers/claude';
import { codexAdapter } from '../../providers/codex';
import { cursorAdapter } from '../../providers/cursor';
import { getActiveAdapters } from '../../providers/shared';
import { formatSyncPlan } from '../../ui/output';
import { readGlobalOptions, resolveConcreteScopes } from '../shared';
import { runSyncApply } from './apply';
import { runSyncDryRun } from './dry-run';
import type { ScopeSyncPlan, SyncCommandDependencies } from './sync.types';

function defaultDependencies(): SyncCommandDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    loadManifest,
    async loadSyncConfig(configPath) {
      const config = await loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
      return config;
    },
    scanCanonical,
    getAdapters() {
      return [claudeAdapter, cursorAdapter, codexAdapter];
    },
    getActiveAdapters,
    computeSyncPlan,
    executeSyncPlan,
    formatSyncPlan,
  };
}

async function computePlans(
  context: CommandContext,
  dependencies: SyncCommandDependencies,
): Promise<ScopeSyncPlan[]> {
  const scopePlans: ScopeSyncPlan[] = [];

  for (const scope of resolveConcreteScopes(context.scope)) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
    const configPath = join(scopeRoot, '.oat', 'sync', 'config.json');
    const [manifest, config, canonical] = await Promise.all([
      dependencies.loadManifest(manifestPath),
      dependencies.loadSyncConfig(configPath),
      dependencies.scanCanonical(scopeRoot, scope),
    ]);
    const adapters = dependencies.getAdapters();
    const activeAdapters = await dependencies.getActiveAdapters(
      adapters,
      scopeRoot,
    );
    const plan = await dependencies.computeSyncPlan({
      canonical,
      adapters: activeAdapters,
      manifest,
      scope,
      config,
      scopeRoot,
    });

    scopePlans.push({
      scope,
      scopeRoot,
      manifestPath,
      manifest,
      plan,
    });
  }

  return scopePlans;
}

async function runSyncCommand(
  context: CommandContext,
  dependencies: SyncCommandDependencies,
): Promise<void> {
  const scopePlans = await computePlans(context, dependencies);

  if (context.apply) {
    await runSyncApply(context, scopePlans, dependencies);
    return;
  }

  runSyncDryRun(context, scopePlans, dependencies);
}

export function createSyncCommand(
  overrides: Partial<SyncCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultDependencies(),
    ...overrides,
  } as SyncCommandDependencies;

  return new Command('sync')
    .description('Sync canonical content to provider views')
    .option('--apply', 'Apply sync changes (default is dry-run)')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runSyncCommand(context, dependencies);
    });
}
