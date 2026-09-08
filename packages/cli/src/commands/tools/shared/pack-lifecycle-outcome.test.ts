import { describe, expect, it } from 'vitest';

import type {
  ProviderReachabilityEvidence,
  ToolPackEvidence,
} from './pack-evidence';
import {
  evaluatePackLifecycleOutcome,
  notRunProviderSyncOutcome,
  providerSyncOutcomeFromAutoSync,
  resolveAdditivePackScopeSelection,
} from './pack-lifecycle-outcome';

function evidence(scopes: Array<'project' | 'user'>): ToolPackEvidence {
  return {
    schemaVersion: 1,
    pack: 'ideas',
    canonical: null,
    scopes: [],
    knownRealizedScopes: scopes,
    unknownScopes: [],
    realizedPlacement: scopes.length === 2 ? 'both' : (scopes[0] ?? 'none'),
    providers: [],
    diagnostics: [],
  };
}

describe('pack lifecycle outcome', () => {
  it.each([
    {
      requested: 'project' as const,
      retained: [] as const,
      target: ['project'],
    },
    {
      requested: 'user' as const,
      retained: ['project'] as const,
      target: ['project', 'user'],
    },
    {
      requested: 'both' as const,
      retained: ['user'] as const,
      target: ['project', 'user'],
    },
  ])(
    'resolves additive $requested scope selection',
    ({ requested, retained, target }) => {
      expect(
        resolveAdditivePackScopeSelection({
          pack: 'ideas',
          requested,
          knownRealizedScopes: retained,
          unknownScopes: [],
        }),
      ).toMatchObject({
        requested,
        retainedRealizedScopes: retained,
        targetScopes: target,
      });
    },
  );

  it('fails selection closed when any evaluated scope is unknown', () => {
    expect(() =>
      resolveAdditivePackScopeSelection({
        pack: 'ideas',
        requested: 'user',
        knownRealizedScopes: ['project'],
        unknownScopes: ['user'],
      }),
    ).toThrow(/inventory is unknown at user/);
  });

  it('reports complete only after canonical and final placement verification', () => {
    const selection = resolveAdditivePackScopeSelection({
      pack: 'ideas',
      requested: 'user',
      knownRealizedScopes: [],
      unknownScopes: [],
    });
    expect(
      evaluatePackLifecycleOutcome({
        selection,
        lifecycle: [],
        sync: { scopes: ['user'], status: 'complete', providers: [] },
        finalEvidence: evidence(['user']),
      }),
    ).toMatchObject({
      status: 'complete',
      canonical: { status: 'unchanged' },
      recovery: [],
    });
  });

  it('preserves canonical success as partial when provider sync fails', () => {
    const selection = resolveAdditivePackScopeSelection({
      pack: 'ideas',
      requested: 'user',
      knownRealizedScopes: ['user'],
      unknownScopes: [],
    });
    expect(
      evaluatePackLifecycleOutcome({
        selection,
        lifecycle: [],
        sync: {
          scopes: ['user'],
          status: 'failed',
          providers: [],
          error: 'cursor write failed',
        },
        finalEvidence: evidence(['user']),
      }),
    ).toMatchObject({
      status: 'partial',
      canonical: { status: 'unchanged' },
      recovery: [expect.objectContaining({ code: 'provider-sync-incomplete' })],
    });
  });

  it.each([
    {
      label: 'canonical failure',
      canonicalFailure: 'copy failed',
      finalEvidence: evidence(['user']),
      code: 'canonical-apply-failed',
    },
    {
      label: 'verification failure',
      canonicalFailure: undefined,
      finalEvidence: null,
      code: 'final-inventory-unverified',
    },
  ])(
    'reports failed for $label',
    ({ canonicalFailure, finalEvidence, code }) => {
      const selection = resolveAdditivePackScopeSelection({
        pack: 'ideas',
        requested: 'user',
        knownRealizedScopes: [],
        unknownScopes: [],
      });
      expect(
        evaluatePackLifecycleOutcome({
          selection,
          lifecycle: [],
          sync: { scopes: [], status: 'not-run', providers: [] },
          finalEvidence,
          canonicalFailure,
        }),
      ).toMatchObject({
        status: 'failed',
        recovery: expect.arrayContaining([expect.objectContaining({ code })]),
      });
    },
  );

  it('normalizes auto-sync results without losing failure detail', () => {
    expect(
      providerSyncOutcomeFromAutoSync({
        synced: false,
        scopes: ['project'],
        error: 'provider failed',
      }),
    ).toEqual({
      scopes: ['project'],
      status: 'failed',
      providers: [],
      error: 'provider failed',
    });
  });
});

function reachability(
  overrides: Partial<ProviderReachabilityEvidence> = {},
): ProviderReachabilityEvidence {
  return {
    provider: 'codex',
    scope: 'user',
    contentKind: 'agent',
    assets: ['~/.agents/agents/skeptical-evaluator.md'],
    activation: {
      state: 'active',
      source: 'config-enabled',
      reason: 'Explicitly enabled in sync config',
    },
    capability: {
      support: 'supported',
      projectionModes: ['materialization-extension'],
      reason: 'codex projects user agent content',
    },
    projection: { state: 'projected', mode: 'materialization-extension' },
    materialization: { state: 'materialized', detail: 'materialized' },
    visibility: { state: 'live', reason: 'codex reads without a refresh' },
    recovery: [],
    ...overrides,
  };
}

describe('provider sync outcome evidence', () => {
  it('carries provider evidence into a complete outcome', () => {
    const providers = [reachability()];
    const sync = providerSyncOutcomeFromAutoSync(
      { synced: true, scopes: ['user'], error: null, evidence: [] },
      providers,
    );

    expect(sync.status).toBe('complete');
    expect(sync.providers).toEqual(providers);

    const outcome = evaluatePackLifecycleOutcome({
      selection: resolveAdditivePackScopeSelection({
        pack: 'ideas',
        requested: 'user',
        knownRealizedScopes: ['user'],
        unknownScopes: [],
      }),
      lifecycle: [],
      sync,
      finalEvidence: evidence(['user']),
    });

    expect(outcome.status).toBe('complete');
    expect(outcome.sync.providers).toEqual(providers);
  });

  it('degrades a successful sync to partial when a provider materialization failed', () => {
    const sync = providerSyncOutcomeFromAutoSync(
      { synced: true, scopes: ['user'], error: null, evidence: [] },
      [
        reachability({
          materialization: { state: 'failed', detail: 'permission denied' },
        }),
      ],
    );

    expect(sync.status).toBe('partial');

    const outcome = evaluatePackLifecycleOutcome({
      selection: resolveAdditivePackScopeSelection({
        pack: 'ideas',
        requested: 'user',
        knownRealizedScopes: ['user'],
        unknownScopes: [],
      }),
      lifecycle: [],
      sync,
      finalEvidence: evidence(['user']),
    });

    expect(outcome.status).toBe('partial');
    expect(
      outcome.recovery.some(({ code }) => code === 'provider-sync-incomplete'),
    ).toBe(true);
  });

  it('keeps a warning-severity missing materialization complete at exit code 0', () => {
    // Pinned severity matrix row 4: "Active, supported, no projection exists
    // (never synced or sync skipped)" is a `warning` that turns the pack
    // evidence block `partial` but leaves the install `complete` / exit 0 —
    // "install succeeded; sync advised". Only `failed` degrades the outcome.
    const providers = [
      reachability({
        projection: { state: 'absent', mode: 'materialization-extension' },
        materialization: {
          state: 'missing',
          detail: 'codex has no user agent materialization for 1 asset',
        },
      }),
    ];
    const sync = providerSyncOutcomeFromAutoSync(
      { synced: true, scopes: ['user'], error: null, evidence: [] },
      providers,
    );

    expect(sync.status).toBe('complete');

    const outcome = evaluatePackLifecycleOutcome({
      selection: resolveAdditivePackScopeSelection({
        pack: 'ideas',
        requested: 'user',
        knownRealizedScopes: ['user'],
        unknownScopes: [],
      }),
      lifecycle: [],
      sync,
      finalEvidence: evidence(['user']),
    });

    // `runInitTools` sets exit code 1 for any outcome whose status is not
    // `complete`, so this assertion is the exit-code guarantee.
    expect(outcome.status).toBe('complete');
    expect(
      outcome.recovery.some(({ code }) => code === 'provider-sync-incomplete'),
    ).toBe(false);
  });

  it('keeps info-only provider states complete so a healthy install exits 0', () => {
    const sync = providerSyncOutcomeFromAutoSync(
      { synced: true, scopes: ['user'], error: null, evidence: [] },
      [
        reachability({
          visibility: { state: 'restart-required', reason: 'new session' },
        }),
        reachability({
          provider: 'gemini',
          activation: {
            state: 'inactive',
            source: 'config-disabled',
            reason: 'Explicitly disabled in sync config',
          },
        }),
      ],
    );

    expect(sync.status).toBe('complete');
  });

  it('reports not-run with its reason and still carries evidence', () => {
    const providers = [reachability()];
    const sync = notRunProviderSyncOutcome(providers, 'auto-sync was skipped');

    expect(sync).toMatchObject({
      scopes: [],
      status: 'not-run',
      error: 'auto-sync was skipped',
    });
    expect(sync.providers).toEqual(providers);
  });
});
