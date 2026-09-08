import { join } from 'node:path';

import { DEFAULT_SYNC_CONFIG, loadSyncConfig } from '@config/index';
import type { SyncConfig } from '@config/sync-config';
import {
  resolveProviderScopeContext,
  userAgentMaterializationCoverage,
  type ProviderScopeContext,
  type UserAgentMaterializationCoverage,
} from '@providers/shared/registry';
import type { ConcreteScope } from '@shared/types';

export interface ProviderContextDependencies {
  loadSyncConfig?: (configPath: string) => Promise<SyncConfig>;
  resolveProviderScopeContext?: (input: {
    scope: ConcreteScope;
    scopeRoot: string;
    config: SyncConfig;
  }) => Promise<ProviderScopeContext>;
}

/**
 * Resolves the config-aware provider context for one scope.
 *
 * Returns `null` rather than throwing: provider reachability is additive
 * evidence on a lifecycle or inventory result, so a missing or unreadable
 * sync config must degrade to "no provider evidence" instead of failing an
 * install that already succeeded.
 */
export async function resolveScopeProviderContext(input: {
  scope: ConcreteScope;
  scopeRoot: string;
  dependencies?: ProviderContextDependencies;
}): Promise<ProviderScopeContext | null> {
  const load =
    input.dependencies?.loadSyncConfig ??
    ((configPath: string) => loadSyncConfig(configPath, DEFAULT_SYNC_CONFIG));
  const resolve =
    input.dependencies?.resolveProviderScopeContext ??
    resolveProviderScopeContext;
  try {
    const config = await load(
      join(input.scopeRoot, '.oat', 'sync', 'config.json'),
    );
    return await resolve({
      scope: input.scope,
      scopeRoot: input.scopeRoot,
      config,
    });
  } catch {
    return null;
  }
}

/** Resolves provider contexts for every scope with a known root. */
export async function resolveProviderScopeContexts(input: {
  scopeRoots: Readonly<Partial<Record<ConcreteScope, string>>>;
  dependencies?: ProviderContextDependencies;
}): Promise<ProviderScopeContext[]> {
  const entries = (
    Object.entries(input.scopeRoots) as [ConcreteScope, string | undefined][]
  ).filter((entry): entry is [ConcreteScope, string] => Boolean(entry[1]));
  const contexts = await Promise.all(
    entries.map(([scope, scopeRoot]) =>
      resolveScopeProviderContext({
        scope,
        scopeRoot,
        ...(input.dependencies ? { dependencies: input.dependencies } : {}),
      }),
    ),
  );
  return contexts.filter(
    (context): context is ProviderScopeContext => context !== null,
  );
}

export interface PackProviderSurface {
  contexts: ProviderScopeContext[];
  /**
   * Whether an active provider supplies managed user-scope agent roles.
   * Derived from registry capability and sync config only, never from the
   * presence of a provider directory.
   */
  userAgentCoverage: UserAgentMaterializationCoverage;
}

/**
 * Resolves the provider surface every pack inventory renderer needs.
 *
 * `list`, `info`, `status`, and `doctor` all report the same packs, so they
 * must agree on whether user-scope managed roles are materialized. Sharing
 * this resolution is what keeps `list`/`info` from reporting unmaterialized
 * user agents that `status`/`doctor` correctly suppress.
 */
export async function resolvePackProviderSurface(input: {
  scopeRoots: Readonly<Partial<Record<ConcreteScope, string>>>;
  dependencies?: ProviderContextDependencies;
}): Promise<PackProviderSurface> {
  const contexts = await resolveProviderScopeContexts(input);
  const userContext = contexts.find(({ scope }) => scope === 'user');
  return {
    contexts,
    userAgentCoverage: userContext
      ? userAgentMaterializationCoverage({
          registrations: userContext.registrations,
          activeProviders: userContext.activeProviders,
        })
      : 'none',
  };
}
