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
 * Outcome of one scope's provider-context resolution.
 *
 * A caller that only needs the context can keep using
 * {@link resolveScopeProviderContext}, which collapses `failed` to `null`.
 * A diagnostic that exists to explain why a provider view is missing needs the
 * failure itself: silently dropping the scope tells that user "no providers
 * configured" when the truth is "your sync config could not be read".
 *
 * There is no separate `absent` case on purpose. `loadSyncConfig` answers
 * `ENOENT` with the defaults rather than throwing, so an absent config
 * resolves normally and only a config that is present-but-unreadable — invalid
 * JSON, schema-invalid, `EACCES`, a directory — reaches `failed`.
 */
export type ScopeProviderContextOutcome =
  | { status: 'resolved'; context: ProviderScopeContext }
  | { status: 'failed'; error: unknown };

/**
 * Resolves the config-aware provider context for one scope, keeping the
 * failure.
 *
 * Never throws: provider reachability is additive evidence on a lifecycle or
 * inventory result, so a sync config that cannot be read must not fail an
 * install that already succeeded. The error is returned instead of swallowed so
 * a caller that can report it honestly is able to.
 */
export async function resolveScopeProviderContextOutcome(input: {
  scope: ConcreteScope;
  scopeRoot: string;
  dependencies?: ProviderContextDependencies;
}): Promise<ScopeProviderContextOutcome> {
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
    return {
      status: 'resolved',
      context: await resolve({
        scope: input.scope,
        scopeRoot: input.scopeRoot,
        config,
      }),
    };
  } catch (error) {
    return { status: 'failed', error };
  }
}

/**
 * Resolves the config-aware provider context for one scope.
 *
 * Returns `null` rather than throwing: provider reachability is additive
 * evidence on a lifecycle or inventory result, so a missing or unreadable
 * sync config must degrade to "no provider evidence" instead of failing an
 * install that already succeeded. Callers that need to tell a failure apart
 * from a legitimately empty result use
 * {@link resolveScopeProviderContextOutcome} instead.
 */
export async function resolveScopeProviderContext(input: {
  scope: ConcreteScope;
  scopeRoot: string;
  dependencies?: ProviderContextDependencies;
}): Promise<ProviderScopeContext | null> {
  const outcome = await resolveScopeProviderContextOutcome(input);
  return outcome.status === 'resolved' ? outcome.context : null;
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
