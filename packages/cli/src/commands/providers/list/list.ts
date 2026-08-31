import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import type {
  ProviderListItem,
  ProviderListSummary,
  ProvidersListDependencies,
} from '@commands/providers/providers.types';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import { DEFAULT_SYNC_CONFIG, loadSyncConfig } from '@config/index';
import { detectDrift } from '@drift/index';
import {
  normalizeToPosixPath,
  resolveProjectRoot,
  resolveScopeRoot,
} from '@fs/paths';
import { loadManifest } from '@manifest/index';
import {
  getProviderRegistrations,
  resolveProviderScopeContext,
  getSyncMappings,
  type PathMapping,
  type ProviderScopeContext,
} from '@providers/shared';
import type { ContentType } from '@shared/types';
import { Command } from 'commander';

type ContextualListDependencies = ProvidersListDependencies & {
  loadSyncConfig?: typeof loadSyncConfig;
  resolveProviderScopeContext?: typeof resolveProviderScopeContext;
};

function formatSummary(item: ProviderListItem): string {
  const contentTypes =
    item.contentTypes.length > 0 ? item.contentTypes.join('|') : 'none';
  return [
    item.detected ? 'detected' : 'not detected',
    `strategy=${item.defaultStrategy}`,
    `content_types=${contentTypes}`,
    `managed=${item.summary.managed}`,
    `in_sync=${item.summary.inSync}`,
    `drifted=${item.summary.drifted}`,
    `missing=${item.summary.missing}`,
  ].join(', ');
}

function formatList(items: ProviderListItem[]): string {
  if (items.length === 0) {
    return 'No provider adapters registered.';
  }

  const nameWidth = Math.max(
    'Provider'.length,
    ...items.map((item) => item.name.length),
  );
  const statusWidth = Math.max(
    'Status'.length,
    ...items.map(
      (item) => (item.detected ? 'detected' : 'not detected').length,
    ),
  );

  const header = [
    'Provider'.padEnd(nameWidth),
    'Status'.padEnd(statusWidth),
    'Summary',
  ].join('  ');
  const divider = [
    '-'.repeat(nameWidth),
    '-'.repeat(statusWidth),
    '-------',
  ].join('  ');

  const rows = items.map((item) => {
    const status = item.detected ? 'detected' : 'not detected';
    return [
      item.name.padEnd(nameWidth),
      status.padEnd(statusWidth),
      formatSummary(item),
    ].join('  ');
  });

  return [header, divider, ...rows].join('\n');
}

function createDependencies(): ContextualListDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    getAdapters() {
      return getProviderRegistrations().map(({ adapter }) => adapter);
    },
    getSyncMappings,
    loadManifest,
    detectDrift,
    async loadSyncConfig(configPath) {
      return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
    },
    resolveProviderScopeContext,
  };
}

function createEmptySummary(): ProviderListSummary {
  return {
    managed: 0,
    inSync: 0,
    drifted: 0,
    missing: 0,
  };
}

async function collectProviderList(
  context: CommandContext,
  dependencies: ContextualListDependencies,
): Promise<ProviderListItem[]> {
  const scopes = resolveConcreteScopes(context.scope);
  const scopeRoots = await Promise.all(
    scopes.map(async (scope) => {
      const root = await dependencies.resolveScopeRoot(scope, context);
      const config = dependencies.loadSyncConfig
        ? await dependencies.loadSyncConfig(
            join(root, '.oat', 'sync', 'config.json'),
          )
        : undefined;
      const providerContext =
        config && dependencies.resolveProviderScopeContext
          ? await dependencies.resolveProviderScopeContext({
              scope,
              scopeRoot: root,
              config,
            })
          : undefined;
      return { scope, root, providerContext };
    }),
  );
  const manifestsByRoot = new Map<
    string,
    Awaited<ReturnType<typeof loadManifest>>
  >();

  for (const scopeRoot of scopeRoots) {
    const manifestPath = join(scopeRoot.root, '.oat', 'sync', 'manifest.json');
    manifestsByRoot.set(
      scopeRoot.root,
      await dependencies.loadManifest(manifestPath),
    );
  }

  const items: ProviderListItem[] = [];
  const providerContexts = scopeRoots
    .map(({ providerContext }) => providerContext)
    .filter((value): value is ProviderScopeContext => value !== undefined);
  const adapters = providerContexts[0]
    ? providerContexts[0].registrations.map(({ adapter }) => adapter)
    : dependencies.getAdapters();
  for (const adapter of adapters) {
    const summary = createEmptySummary();
    const contentTypes = new Set<ContentType>();
    const allMappings: PathMapping[] = [];
    for (const scope of scopes) {
      for (const mapping of dependencies.getSyncMappings(adapter, scope)) {
        contentTypes.add(mapping.contentType);
        allMappings.push(mapping);
      }
    }
    let detected = false;

    for (const scopeRoot of scopeRoots) {
      if (
        scopeRoot.providerContext
          ? scopeRoot.providerContext.detectedProviders.includes(adapter.name)
          : await adapter.detect(scopeRoot.root)
      ) {
        detected = true;
      }

      const manifest = manifestsByRoot.get(scopeRoot.root);
      if (!manifest) {
        continue;
      }

      for (const entry of manifest.entries) {
        if (entry.provider !== adapter.name) {
          continue;
        }

        summary.managed += 1;
        const matchedMapping = allMappings.find((mapping) => {
          const normalizedEntry = normalizeToPosixPath(entry.providerPath);
          const normalizedDir = normalizeToPosixPath(mapping.providerDir);
          return (
            mapping.contentType === entry.contentType &&
            (normalizedEntry === normalizedDir ||
              normalizedEntry.startsWith(`${normalizedDir}/`))
          );
        });
        const copyTransform = matchedMapping?.transformCanonical
          ? { transformCanonical: matchedMapping.transformCanonical }
          : undefined;
        const report = await dependencies.detectDrift(
          entry,
          scopeRoot.root,
          copyTransform,
        );
        if (report.state.status === 'in_sync') {
          summary.inSync += 1;
          continue;
        }
        if (report.state.status === 'missing') {
          summary.missing += 1;
          continue;
        }
        if (report.state.status === 'drifted') {
          summary.drifted += 1;
        }
      }
    }

    items.push({
      name: adapter.name,
      displayName: adapter.displayName,
      detected,
      defaultStrategy: adapter.defaultStrategy,
      contentTypes: [...contentTypes].sort(),
      summary,
    });
  }

  return items;
}

async function runListCommand(
  context: CommandContext,
  dependencies: ProvidersListDependencies,
): Promise<void> {
  const items = await collectProviderList(context, dependencies);

  if (context.json) {
    context.logger.json(items);
  } else {
    context.logger.info(formatList(items));
  }

  process.exitCode = 0;
}

export function createProvidersListCommand(
  overrides: Partial<ContextualListDependencies> = {},
): Command {
  const dependencies: ContextualListDependencies = {
    ...createDependencies(),
    ...overrides,
  };
  if (
    overrides.resolveProviderScopeContext === undefined &&
    overrides.getAdapters !== undefined
  ) {
    dependencies.resolveProviderScopeContext = undefined;
  }

  return withScopeOption(new Command('list'))
    .description('List provider adapters and sync summary')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runListCommand(context, dependencies);
    });
}
