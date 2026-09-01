import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import type {
  ProviderListItem,
  ProviderListSummary,
  ProviderContentInspection,
  ProviderScopeInspection,
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
  type ProviderContentCapability,
  type ProviderScopeContext,
} from '@providers/shared';
import type { ContentType } from '@shared/types';
import { Command } from 'commander';

type ContextualListDependencies = ProvidersListDependencies & {
  loadSyncConfig?: typeof loadSyncConfig;
  resolveProviderScopeContext?: typeof resolveProviderScopeContext;
};

interface CollectionAliasSummary {
  managed: number;
  oatCreated: number;
  adoptedExact: number;
}

type ProviderListItemWithCollections = ProviderListItem & {
  collectionAliases: CollectionAliasSummary;
};

function formatSummary(item: ProviderListItemWithCollections): string {
  const contentTypes =
    item.contentTypes.length > 0 ? item.contentTypes.join('|') : 'none';
  const scopeEvidence = item.scopes
    .map(
      (scope) =>
        `${scope.scope}:activation=${scope.activation.state};${scope.content
          .map(
            (content) =>
              `${content.contentKind}=${content.capability}/${content.projectionModes.join('|')}/${content.materialization}/${content.visibility}`,
          )
          .join('+')}`,
    )
    .join(',');
  return [
    item.detected ? 'detected' : 'not detected',
    `strategy=${item.defaultStrategy}`,
    `content_types=${contentTypes}`,
    `managed=${item.summary.managed}`,
    `in_sync=${item.summary.inSync}`,
    `drifted=${item.summary.drifted}`,
    `missing=${item.summary.missing}`,
    `collections=${item.collectionAliases.managed}`,
    `collection_ownership=oat-created:${item.collectionAliases.oatCreated}|adopted-exact:${item.collectionAliases.adoptedExact}`,
    `evidence=${scopeEvidence || 'not-resolved'}`,
  ].join(', ');
}

function formatList(items: ProviderListItemWithCollections[]): string {
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

function deriveContentInspection(
  capability: ProviderContentCapability,
  summary: ProviderListSummary | undefined,
): ProviderContentInspection {
  const nativeRead = capability.projectionModes.includes('native-read');
  const materialization: ProviderContentInspection['materialization'] =
    capability.support === 'unsupported'
      ? 'unsupported'
      : nativeRead &&
          !capability.projectionModes.includes('entry-sync') &&
          !capability.projectionModes.includes('materialization-extension')
        ? 'not-required'
        : (summary?.missing ?? 0) > 0
          ? 'missing'
          : (summary?.managed ?? 0) > 0 && summary?.inSync === summary?.managed
            ? 'current'
            : 'unknown';
  return {
    contentKind: capability.contentKind,
    capability: capability.support,
    projectionModes: capability.projectionModes,
    nativeRead,
    materialization,
    visibility:
      capability.support === 'unsupported' ? 'unsupported' : 'not-reported',
  };
}

function fallbackCapabilities(
  mappings: readonly PathMapping[],
  scope: ProviderScopeInspection['scope'],
): ProviderContentCapability[] {
  const seen = new Set<string>();
  return mappings.flatMap((mapping) => {
    if (seen.has(mapping.contentType)) return [];
    seen.add(mapping.contentType);
    return [
      {
        scope,
        contentKind: mapping.contentType,
        support: 'supported',
        projectionModes: [mapping.nativeRead ? 'native-read' : 'entry-sync'],
        nativeRoleSurface: mapping.contentType === 'agent',
        collectionAlias: 'unsupported',
        catalogRefresh: { state: 'unknown', reason: 'not resolved' },
      },
    ];
  });
}

async function collectProviderList(
  context: CommandContext,
  dependencies: ContextualListDependencies,
): Promise<ProviderListItemWithCollections[]> {
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

  const items: ProviderListItemWithCollections[] = [];
  const providerContexts = scopeRoots
    .map(({ providerContext }) => providerContext)
    .filter((value): value is ProviderScopeContext => value !== undefined);
  const adapters = providerContexts[0]
    ? providerContexts[0].registrations.map(({ adapter }) => adapter)
    : dependencies.getAdapters();
  for (const adapter of adapters) {
    const summary = createEmptySummary();
    const collectionAliases: CollectionAliasSummary = {
      managed: 0,
      oatCreated: 0,
      adoptedExact: 0,
    };
    const contentTypes = new Set<ContentType>();
    const contentSummaryByScope = new Map<string, ProviderListSummary>();
    for (const scope of scopes) {
      const mappings =
        scope === 'project' ? adapter.projectMappings : adapter.userMappings;
      for (const mapping of mappings) {
        contentTypes.add(mapping.contentType);
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

      for (const collection of manifest.collections ?? []) {
        if (collection.provider !== adapter.name) {
          continue;
        }
        collectionAliases.managed += 1;
        if (collection.ownership === 'oat-created') {
          collectionAliases.oatCreated += 1;
        } else {
          collectionAliases.adoptedExact += 1;
        }
      }

      for (const entry of manifest.entries) {
        if (entry.provider !== adapter.name) {
          continue;
        }

        summary.managed += 1;
        const scopeMappings =
          scopeRoot.scope === 'project'
            ? adapter.projectMappings
            : adapter.userMappings;
        const matchedMapping = scopeMappings.find((mapping) => {
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
        const contentSummaryKey = `${scopeRoot.scope}:${entry.contentType}`;
        const contentSummary =
          contentSummaryByScope.get(contentSummaryKey) ?? createEmptySummary();
        contentSummary.managed += 1;
        contentSummaryByScope.set(contentSummaryKey, contentSummary);
        if (report.state.status === 'in_sync') {
          summary.inSync += 1;
          contentSummary.inSync += 1;
          continue;
        }
        if (report.state.status === 'missing') {
          summary.missing += 1;
          contentSummary.missing += 1;
          continue;
        }
        if (report.state.status === 'drifted') {
          summary.drifted += 1;
          contentSummary.drifted += 1;
        }
      }
    }

    const providerScopes: ProviderScopeInspection[] = scopeRoots.map(
      (scopeRoot) => {
        const registration = scopeRoot.providerContext?.registrations.find(
          ({ adapter: candidate }) => candidate.name === adapter.name,
        );
        const capabilities =
          registration?.capabilities.filter(
            ({ scope }) => scope === scopeRoot.scope,
          ) ??
          fallbackCapabilities(
            scopeRoot.scope === 'project'
              ? adapter.projectMappings
              : adapter.userMappings,
            scopeRoot.scope,
          );
        const activation = scopeRoot.providerContext?.activation.find(
          ({ provider }) => provider === adapter.name,
        );
        const detectedAtScope = scopeRoot.providerContext
          ? scopeRoot.providerContext.detectedProviders.includes(adapter.name)
          : detected;
        return {
          scope: scopeRoot.scope,
          activation: activation ?? {
            state: detectedAtScope ? 'active' : 'unknown',
            source: detectedAtScope ? 'detection-fallback' : 'not-resolved',
            reason: detectedAtScope
              ? 'Provider detected without resolved configuration authority'
              : 'Provider activation was not resolved',
          },
          content: capabilities.map((capability) =>
            deriveContentInspection(
              capability,
              contentSummaryByScope.get(
                `${scopeRoot.scope}:${capability.contentKind}`,
              ),
            ),
          ),
        };
      },
    );

    items.push({
      name: adapter.name,
      displayName: adapter.displayName,
      detected,
      defaultStrategy: adapter.defaultStrategy,
      contentTypes: [...contentTypes].sort(),
      summary,
      collectionAliases,
      scopes: providerScopes,
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
