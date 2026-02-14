import { join, normalize } from 'node:path';
import { Command } from 'commander';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '../../app/command-context';
import { detectDrift } from '../../drift';
import { resolveProjectRoot, resolveScopeRoot } from '../../fs/paths';
import { loadManifest } from '../../manifest';
import { claudeAdapter } from '../../providers/claude';
import { codexAdapter } from '../../providers/codex';
import { cursorAdapter } from '../../providers/cursor';
import { getSyncMappings } from '../../providers/shared';
import type { Scope } from '../../shared/types';
import { formatProviderDetails } from '../../ui/output';
import type {
  ConcreteScope,
  ProviderInspectMappingState,
  ProviderInspectResult,
  ProvidersInspectDependencies,
} from './providers.types';

function readGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals() as GlobalOptions;
}

function normalizePath(pathValue: string): string {
  return normalize(pathValue).replaceAll('\\', '/');
}

function resolveScopes(scope: Scope): ConcreteScope[] {
  if (scope === 'all') {
    return ['project', 'user'];
  }
  return [scope];
}

function entryInMapping(providerPath: string, providerDir: string): boolean {
  const normalizedPath = normalizePath(providerPath);
  const normalizedDir = normalizePath(providerDir);
  return (
    normalizedPath === normalizedDir ||
    normalizedPath.startsWith(`${normalizedDir}/`)
  );
}

function createDependencies(): ProvidersInspectDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    getAdapters() {
      return [claudeAdapter, cursorAdapter, codexAdapter];
    },
    getSyncMappings,
    loadManifest,
    detectDrift,
  };
}

async function collectInspectResult(
  providerName: string,
  context: CommandContext,
  dependencies: ProvidersInspectDependencies,
): Promise<ProviderInspectResult | null> {
  const adapter = dependencies
    .getAdapters()
    .find(
      (candidate) =>
        candidate.name.toLowerCase() === providerName.toLowerCase(),
    );
  if (!adapter) {
    return null;
  }

  const scopes = resolveScopes(context.scope);
  const scopeRoots = await Promise.all(
    scopes.map(async (scope) => ({
      scope,
      root: await dependencies.resolveScopeRoot(scope, context),
    })),
  );
  const mappings: ProviderInspectMappingState[] = [];
  let detected = false;

  for (const scopeRoot of scopeRoots) {
    if (await adapter.detect(scopeRoot.root)) {
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

      for (const entry of manifest.entries) {
        if (entry.provider !== adapter.name) {
          continue;
        }
        if (!entryInMapping(entry.providerPath, mapping.providerDir)) {
          continue;
        }

        state.managed += 1;
        const report = await dependencies.detectDrift(entry, scopeRoot.root);
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
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
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
  overrides: Partial<ProvidersInspectDependencies> = {},
): Command {
  const dependencies: ProvidersInspectDependencies = {
    ...createDependencies(),
    ...overrides,
  };

  return new Command('inspect')
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
