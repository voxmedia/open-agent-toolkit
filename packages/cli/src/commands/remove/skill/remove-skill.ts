import { lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import {
  DEFAULT_SYNC_CONFIG,
  loadSyncConfig,
  type SyncConfig,
} from '@config/sync-config';
import {
  classifyObsoleteMappingRetirement,
  type RemovalSyncPlanEntry,
} from '@engine/index';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot, resolveScopeRoot, toPosixPath } from '@fs/paths';
import {
  loadManifest,
  type Manifest,
  type ManifestEntry,
  removeEntry,
  saveManifest,
} from '@manifest/index';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { geminiAdapter } from '@providers/gemini';
import {
  type ConfigAwareAdaptersResult,
  getConfigAwareAdapters,
  getSyncMappings,
  type PathMapping,
  type ProviderAdapter,
} from '@providers/shared';
import type { AdoptionSource } from '@providers/shared/adapter.types';
import { getAdoptionSources } from '@providers/shared/adapter.utils';
import type { ConcreteScope, Scope } from '@shared/types';
import { Command } from 'commander';

interface RemoveSkillOptions {
  dryRun?: boolean;
}

interface ProviderView {
  provider: string;
  absolutePath: string;
  relativePath: string;
}

interface ScopePlan {
  scope: ConcreteScope;
  scopeRoot: string;
  manifestPath: string;
  manifest: Manifest;
  canonicalRelativePath: string;
  canonicalAbsolutePath: string;
  managedProviderViews: ProviderView[];
  unmanagedProviderViews: ProviderView[];
  manifestProvidersToRemove: string[];
}

interface JsonScopeResult {
  scope: ConcreteScope;
  canonicalPath: string;
  managedProviderViews: string[];
  unmanagedProviderViews: string[];
}

export interface RemoveSkillDependencies {
  buildCommandContext: (
    options: ReturnType<typeof readGlobalOptions>,
  ) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  saveManifest: (manifestPath: string, manifest: Manifest) => Promise<void>;
  loadSyncConfig: (configPath: string) => Promise<SyncConfig>;
  getAdapters: () => ProviderAdapter[];
  getConfigAwareAdapters: (
    adapters: ProviderAdapter[],
    scopeRoot: string,
    config: SyncConfig,
  ) => Promise<ConfigAwareAdaptersResult>;
  getSyncMappings: (adapter: ProviderAdapter, scope: Scope) => PathMapping[];
  getAdoptionSources: (
    adapter: ProviderAdapter,
    scope: Scope,
  ) => AdoptionSource[];
  classifyObsoleteMappingRetirement: (
    manifestEntry: ManifestEntry,
    scopeRoot: string,
  ) => Promise<RemovalSyncPlanEntry>;
  pathExists: (path: string) => Promise<boolean>;
  pathEntryExists: (path: string) => Promise<boolean>;
  removeDirectory: (path: string) => Promise<void>;
}

export function createDefaultRemoveSkillDependencies(): RemoveSkillDependencies {
  return {
    buildCommandContext,
    async resolveScopeRoot(scope, context) {
      if (scope === 'project') {
        return resolveProjectRoot(context.cwd);
      }
      return resolveScopeRoot(scope, context.cwd, context.home);
    },
    loadManifest,
    saveManifest,
    async loadSyncConfig(configPath) {
      return loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG);
    },
    getAdapters() {
      return [
        claudeAdapter,
        cursorAdapter,
        codexAdapter,
        copilotAdapter,
        geminiAdapter,
      ];
    },
    getConfigAwareAdapters,
    getSyncMappings,
    getAdoptionSources,
    classifyObsoleteMappingRetirement,
    async pathExists(path) {
      return (await fileExists(path)) || (await dirExists(path));
    },
    async pathEntryExists(path) {
      try {
        await lstat(path);
        return true;
      } catch {
        return false;
      }
    },
    async removeDirectory(path) {
      await rm(path, { recursive: true, force: true });
    },
  };
}

function dedupeViews(views: ProviderView[]): ProviderView[] {
  const seen = new Set<string>();
  return views.filter((view) => {
    const key = `${view.provider}::${view.relativePath}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function buildScopePlan(
  scope: ConcreteScope,
  scopeRoot: string,
  skillName: string,
  dependencies: RemoveSkillDependencies,
): Promise<ScopePlan | null> {
  const canonicalRelativePath = `.agents/skills/${skillName}`;
  const canonicalAbsolutePath = join(scopeRoot, '.agents', 'skills', skillName);
  const canonicalExists = await dependencies.pathExists(canonicalAbsolutePath);
  if (!canonicalExists) {
    return null;
  }

  const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
  const configPath = join(scopeRoot, '.oat', 'sync', 'config.json');
  const [manifest, config] = await Promise.all([
    dependencies.loadManifest(manifestPath),
    dependencies.loadSyncConfig(configPath),
  ]);

  const adapters = dependencies.getAdapters();
  const { activeAdapters } = await dependencies.getConfigAwareAdapters(
    adapters,
    scopeRoot,
    config,
  );

  const managedProviderViews: ProviderView[] = [];
  const unmanagedProviderViews: ProviderView[] = [];
  const manifestProvidersToRemove = new Set<string>();

  for (const adapter of activeAdapters) {
    const syncMappings = dependencies
      .getSyncMappings(adapter, scope)
      .filter((mapping) => mapping.contentType === 'skill');

    for (const mapping of syncMappings) {
      const relativePath = join(mapping.providerDir, skillName);
      const absolutePath = join(scopeRoot, relativePath);
      const hasManifestEntry = manifest.entries.some(
        (entry) =>
          entry.canonicalPath === canonicalRelativePath &&
          entry.provider === adapter.name,
      );
      const providerPathExists = await dependencies.pathExists(absolutePath);

      if (hasManifestEntry) {
        manifestProvidersToRemove.add(adapter.name);
        managedProviderViews.push({
          provider: adapter.name,
          absolutePath,
          relativePath,
        });
        continue;
      }

      if (providerPathExists) {
        unmanagedProviderViews.push({
          provider: adapter.name,
          absolutePath,
          relativePath,
        });
      }
    }

    const syncProviderDirs = new Set(
      syncMappings.map((mapping) => mapping.providerDir),
    );
    const localAdoptionSources = dependencies
      .getAdoptionSources(adapter, scope)
      .filter(
        (source) =>
          source.contentType === 'skill' &&
          !syncProviderDirs.has(source.directory),
      );

    for (const source of localAdoptionSources) {
      const relativePath = join(source.directory, skillName);
      const absolutePath = join(scopeRoot, relativePath);
      const legacyManifestEntry = manifest.entries.find(
        (entry) =>
          adapter.name === 'copilot' &&
          entry.canonicalPath === canonicalRelativePath &&
          entry.provider === adapter.name &&
          entry.providerPath === toPosixPath(relativePath),
      );

      if (legacyManifestEntry) {
        manifestProvidersToRemove.add(adapter.name);
        const [retirement, providerPathExists] = await Promise.all([
          dependencies.classifyObsoleteMappingRetirement(
            legacyManifestEntry,
            scopeRoot,
          ),
          dependencies.pathEntryExists(absolutePath),
        ]);
        if (retirement.operation === 'remove') {
          managedProviderViews.push({
            provider: adapter.name,
            absolutePath,
            relativePath,
          });
        } else if (providerPathExists) {
          unmanagedProviderViews.push({
            provider: adapter.name,
            absolutePath,
            relativePath,
          });
        }
      } else if (await dependencies.pathExists(absolutePath)) {
        unmanagedProviderViews.push({
          provider: adapter.name,
          absolutePath,
          relativePath,
        });
      }
    }
  }

  return {
    scope,
    scopeRoot,
    manifestPath,
    manifest,
    canonicalRelativePath,
    canonicalAbsolutePath,
    managedProviderViews: dedupeViews(managedProviderViews),
    unmanagedProviderViews: dedupeViews(unmanagedProviderViews),
    manifestProvidersToRemove: [...manifestProvidersToRemove],
  };
}

function logDryRun(context: CommandContext, plan: ScopePlan): void {
  context.logger.info(
    `[dry-run][${plan.scope}] remove ${plan.canonicalRelativePath}`,
  );

  if (plan.managedProviderViews.length > 0) {
    context.logger.info(`[dry-run][${plan.scope}] managed provider views:`);
    for (const view of plan.managedProviderViews) {
      context.logger.info(`  - ${view.provider}: ${view.relativePath}`);
    }
  }

  if (plan.unmanagedProviderViews.length > 0) {
    context.logger.warn(
      `[dry-run][${plan.scope}] unmanaged provider views (not deleted):`,
    );
    for (const view of plan.unmanagedProviderViews) {
      context.logger.warn(`  - ${view.provider}: ${view.relativePath}`);
    }
  }
}

function toJsonScopeResults(plans: ScopePlan[]): JsonScopeResult[] {
  return plans.map((plan) => ({
    scope: plan.scope,
    canonicalPath: plan.canonicalRelativePath,
    managedProviderViews: plan.managedProviderViews
      .map((view) => view.relativePath)
      .sort(),
    unmanagedProviderViews: plan.unmanagedProviderViews
      .map((view) => view.relativePath)
      .sort(),
  }));
}

async function applyPlan(
  context: CommandContext,
  plan: ScopePlan,
  dependencies: RemoveSkillDependencies,
): Promise<void> {
  await dependencies.removeDirectory(plan.canonicalAbsolutePath);

  for (const view of plan.managedProviderViews) {
    await dependencies.removeDirectory(view.absolutePath);
  }

  let nextManifest = plan.manifest;
  for (const provider of plan.manifestProvidersToRemove) {
    nextManifest = removeEntry(
      nextManifest,
      plan.canonicalRelativePath,
      provider,
    );
  }
  await dependencies.saveManifest(plan.manifestPath, nextManifest);

  context.logger.info(
    `[apply][${plan.scope}] removed ${plan.canonicalRelativePath}`,
  );

  if (plan.unmanagedProviderViews.length > 0) {
    context.logger.warn(
      `[apply][${plan.scope}] unmanaged provider views preserved:`,
    );
    for (const view of plan.unmanagedProviderViews) {
      context.logger.warn(`  - ${view.provider}: ${view.relativePath}`);
    }
  }
}

export async function runRemoveSkill(
  context: CommandContext,
  skillName: string,
  dryRun: boolean,
  dependencies: RemoveSkillDependencies,
): Promise<boolean> {
  const scopes = resolveConcreteScopes(context.scope);
  const plans: ScopePlan[] = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
    const plan = await buildScopePlan(
      scope,
      scopeRoot,
      skillName,
      dependencies,
    );
    if (plan) {
      plans.push(plan);
    }
  }

  if (plans.length === 0) {
    const message = `Skill not found in selected scope(s): ${skillName}`;
    if (context.json) {
      context.logger.json({ status: 'not_found', skill: skillName });
    } else {
      context.logger.warn(message);
    }
    return false;
  }

  if (dryRun) {
    for (const plan of plans) {
      logDryRun(context, plan);
    }
    if (context.json) {
      context.logger.json({
        status: 'dry_run',
        skill: skillName,
        scopes: toJsonScopeResults(plans),
      });
    }
    return true;
  }

  for (const plan of plans) {
    await applyPlan(context, plan, dependencies);
  }

  if (context.json) {
    context.logger.json({
      status: 'removed',
      skill: skillName,
      scopes: toJsonScopeResults(plans),
    });
  }

  return true;
}

export function createRemoveSkillCommand(
  overrides: Partial<RemoveSkillDependencies> = {},
): Command {
  const dependencies: RemoveSkillDependencies = {
    ...createDefaultRemoveSkillDependencies(),
    ...overrides,
  };

  return withScopeOption(new Command('skill'))
    .description('Remove a single installed skill by name')
    .argument('<name>', 'Skill name (e.g., oat-idea-scratchpad)')
    .option('--dry-run', 'Preview removal without applying')
    .action(
      async (
        skillName: string,
        options: RemoveSkillOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );

        try {
          const removed = await runRemoveSkill(
            context,
            skillName,
            options.dryRun ?? false,
            dependencies,
          );
          process.exitCode = removed ? 0 : 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = 2;
        }
      },
    );
}
