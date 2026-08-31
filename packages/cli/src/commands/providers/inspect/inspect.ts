import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import type {
  ProviderInspectMappingState,
  ProviderInspectResult,
  ProvidersInspectDependencies,
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
  getSyncMappings,
  resolveProviderScopeContext,
  type ProviderScopeContext,
} from '@providers/shared';
import { formatProviderDetails } from '@ui/output';
import { Command } from 'commander';

type ContextualInspectDependencies = ProvidersInspectDependencies & {
  loadSyncConfig?: typeof loadSyncConfig;
  resolveProviderScopeContext?: typeof resolveProviderScopeContext;
};

function entryInMapping(providerPath: string, providerDir: string): boolean {
  const normalizedPath = normalizeToPosixPath(providerPath);
  const normalizedDir = normalizeToPosixPath(providerDir);
  return (
    normalizedPath === normalizedDir ||
    normalizedPath.startsWith(`${normalizedDir}/`)
  );
}

function createDependencies(): ContextualInspectDependencies {
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

async function collectInspectResult(
  providerName: string,
  context: CommandContext,
  dependencies: ContextualInspectDependencies,
): Promise<ProviderInspectResult | null> {
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
  const providerContexts = scopeRoots
    .map(({ providerContext }) => providerContext)
    .filter((value): value is ProviderScopeContext => value !== undefined);
  const adapters = providerContexts[0]
    ? providerContexts[0].registrations.map(({ adapter }) => adapter)
    : dependencies.getAdapters();
  const adapter = adapters.find(
    (candidate) => candidate.name.toLowerCase() === providerName.toLowerCase(),
  );
  if (!adapter) return null;
  const mappings: ProviderInspectMappingState[] = [];
  let detected = false;

  for (const scopeRoot of scopeRoots) {
    if (
      scopeRoot.providerContext
        ? scopeRoot.providerContext.detectedProviders.includes(adapter.name)
        : await adapter.detect(scopeRoot.root)
    ) {
      detected = true;
    }

    const manifestPath = join(scopeRoot.root, '.oat', 'sync', 'manifest.json');
    const manifest = await dependencies.loadManifest(manifestPath);

    for (const mapping of dependencies.getSyncMappings(
      adapter,
      scopeRoot.scope,
    )) {
      const state: ProviderInspectMappingState = {
        scope: scopeRoot.scope,
        contentType: mapping.contentType,
        providerDir: mapping.providerDir,
        managed: 0,
        inSync: 0,
        drifted: 0,
        missing: 0,
      };

      const copyTransform = mapping.transformCanonical
        ? { transformCanonical: mapping.transformCanonical }
        : undefined;

      for (const entry of manifest.entries) {
        if (entry.provider !== adapter.name) {
          continue;
        }
        if (!entryInMapping(entry.providerPath, mapping.providerDir)) {
          continue;
        }

        state.managed += 1;
        const report = await dependencies.detectDrift(
          entry,
          scopeRoot.root,
          copyTransform,
        );
        if (report.state.status === 'in_sync') {
          state.inSync += 1;
          continue;
        }
        if (report.state.status === 'missing') {
          state.missing += 1;
          continue;
        }
        if (report.state.status === 'drifted') {
          state.drifted += 1;
        }
      }

      mappings.push(state);
    }
  }

  const version = adapter.detectVersion ? await adapter.detectVersion() : null;
  return {
    name: adapter.name,
    displayName: adapter.displayName,
    detected,
    defaultStrategy: adapter.defaultStrategy,
    projectMappings: adapter.projectMappings,
    userMappings: adapter.userMappings,
    version,
    mappings,
  };
}

function formatInspect(result: ProviderInspectResult): string {
  const lines = [
    formatProviderDetails(
      {
        name: result.name,
        displayName: result.displayName,
        defaultStrategy: result.defaultStrategy,
        projectMappings: result.projectMappings,
        userMappings: result.userMappings,
        detect: async () => result.detected,
      },
      result.detected,
      result.version ?? undefined,
    ),
  ];

  if (result.mappings.length > 0) {
    lines.push('Mappings:');
    for (const mapping of result.mappings) {
      lines.push(
        `- [${mapping.scope}] ${mapping.contentType} ${mapping.providerDir} managed=${mapping.managed} in_sync=${mapping.inSync} drifted=${mapping.drifted} missing=${mapping.missing}`,
      );
    }
  }

  return lines.join('\n');
}

async function runInspectCommand(
  providerName: string,
  context: CommandContext,
  dependencies: ProvidersInspectDependencies,
): Promise<void> {
  const result = await collectInspectResult(
    providerName,
    context,
    dependencies,
  );
  if (!result) {
    context.logger.error(`Provider "${providerName}" not found.`);
    process.exitCode = 1;
    return;
  }

  if (context.json) {
    context.logger.json(result);
  } else {
    context.logger.info(formatInspect(result));
  }

  process.exitCode = 0;
}

export function createProvidersInspectCommand(
  overrides: Partial<ContextualInspectDependencies> = {},
): Command {
  const dependencies: ContextualInspectDependencies = {
    ...createDependencies(),
    ...overrides,
  };
  if (
    overrides.resolveProviderScopeContext === undefined &&
    overrides.getAdapters !== undefined
  ) {
    dependencies.resolveProviderScopeContext = undefined;
  }

  return withScopeOption(new Command('inspect'))
    .description('Inspect provider details and mapping state')
    .argument('<provider>', 'Provider name')
    .action(
      async (providerName: string, _options: unknown, command: Command) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runInspectCommand(providerName, context, dependencies);
      },
    );
}
