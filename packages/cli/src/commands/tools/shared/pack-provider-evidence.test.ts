import { describe, expect, it } from 'vitest';

import type {
  ProviderReachabilityEvidence,
  ToolPackEvidence,
} from './pack-evidence';
import type { ScopedPackInventory } from './pack-inventory';
import {
  applyUserAgentCoverage,
  packAssetsByContentKind,
  unmaterializedAssetsByContentKind,
  withLifecycleProviderEvidence,
} from './pack-provider-evidence';
import type { PackAssetKind } from './types';

function scoped(input: {
  assets?: Array<{
    id: string;
    kind: PackAssetKind;
    status: 'current' | 'missing';
    ownership?: 'managed' | 'seed-if-missing';
  }>;
  diagnostics?: ScopedPackInventory['diagnostics'];
}): ScopedPackInventory {
  return {
    pack: 'research',
    scope: 'user',
    intent: {
      pack: 'research',
      scope: 'user',
      enabled: true,
      source: 'declared',
      configPath: '~/.oat/config.json',
      diagnostics: [],
    },
    completeness: 'complete',
    assets: (input.assets ?? []).map((asset) => ({
      definition: {
        id: asset.id,
        kind: asset.kind,
        destination: `.agents/${asset.kind}s/${asset.id}`,
        scopes: ['user' as const],
        ownership: { user: asset.ownership ?? ('managed' as const) },
      },
      path: `~/.agents/${asset.kind}s/${asset.id}`,
      status: asset.status,
      installedVersion: null,
      bundledVersion: null,
    })),
    diagnostics: input.diagnostics ?? [],
  } as unknown as ScopedPackInventory;
}

function failedProvider(): ProviderReachabilityEvidence {
  return {
    provider: 'codex',
    scope: 'user',
    contentKind: 'agent',
    assets: ['~/.agents/agents/reviewer'],
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
    projection: { state: 'not-applicable', mode: 'materialization-extension' },
    materialization: { state: 'failed', detail: 'permission denied' },
    visibility: { state: 'live', reason: 'codex reads without a refresh' },
    recovery: [],
  };
}

const baseEvidence: ToolPackEvidence = {
  schemaVersion: 1,
  pack: 'research',
  canonical: null,
  scopes: [],
  knownRealizedScopes: ['user'],
  unknownScopes: [],
  realizedPlacement: 'user',
  providers: [],
  diagnostics: [],
};

describe('packAssetsByContentKind', () => {
  it('groups realized managed assets by provider content kind', () => {
    expect(
      packAssetsByContentKind(
        scoped({
          assets: [
            { id: 'analyze', kind: 'skill', status: 'current' },
            { id: 'reviewer', kind: 'agent', status: 'current' },
          ],
        }),
      ),
    ).toEqual({
      skill: ['~/.agents/skills/analyze'],
      agent: ['~/.agents/agents/reviewer'],
    });
  });

  it('excludes canonical-only kinds no provider projects', () => {
    expect(
      packAssetsByContentKind(
        scoped({
          assets: [
            { id: 'plan', kind: 'template', status: 'current' },
            { id: 'capture', kind: 'script', status: 'current' },
            { id: 'state', kind: 'seed', status: 'current' },
          ],
        }),
      ),
    ).toEqual({});
  });

  it('excludes missing assets and assets this scope does not manage', () => {
    expect(
      packAssetsByContentKind(
        scoped({
          assets: [
            { id: 'analyze', kind: 'skill', status: 'missing' },
            {
              id: 'seeded',
              kind: 'skill',
              status: 'current',
              ownership: 'seed-if-missing',
            },
          ],
        }),
      ),
    ).toEqual({});
  });
});

describe('unmaterializedAssetsByContentKind', () => {
  it('reads the pack inventory diagnostic as an agent-scoped absence', () => {
    expect(
      unmaterializedAssetsByContentKind(
        scoped({
          diagnostics: [
            {
              code: 'user-agent-unmaterialized',
              message: 'no materialization',
              paths: ['~/.agents/agents/reviewer'],
            },
          ],
        }),
      ),
    ).toEqual({ agent: ['~/.agents/agents/reviewer'] });
  });

  it('reports nothing for an inventory with no such diagnostic', () => {
    expect(unmaterializedAssetsByContentKind(scoped({}))).toEqual({});
  });
});

describe('withLifecycleProviderEvidence', () => {
  it('surfaces an observed materialization failure as an error diagnostic', () => {
    // Without this re-projection `provider-materialization-failed` has no
    // production emitter: the lifecycle wiring only updates `sync.providers`.
    const projected = withLifecycleProviderEvidence(baseEvidence, [
      failedProvider(),
    ]);

    expect(
      projected?.diagnostics.map(({ code, severity }) => [code, severity]),
    ).toContainEqual(['provider-materialization-failed', 'error']);
    expect(projected?.providers).toHaveLength(1);
  });

  it('leaves evidence untouched when there is no provider evidence', () => {
    expect(withLifecycleProviderEvidence(baseEvidence, [])).toBe(baseEvidence);
    expect(withLifecycleProviderEvidence(null, [failedProvider()])).toBeNull();
  });

  it('preserves the scope verification fields the outcome reads', () => {
    // `evaluatePackLifecycleOutcome` decides verification from these fields,
    // so re-projection must carry them through untouched rather than
    // recomputing them from scope facts the lifecycle item may not carry.
    const projected = withLifecycleProviderEvidence(baseEvidence, [
      failedProvider(),
    ]);

    expect(projected?.knownRealizedScopes).toEqual(
      baseEvidence.knownRealizedScopes,
    );
    expect(projected?.unknownScopes).toEqual(baseEvidence.unknownScopes);
    expect(projected?.pack).toBe(baseEvidence.pack);
    expect(projected?.realizedPlacement).toBe(baseEvidence.realizedPlacement);
  });

  it('replaces previously projected provider diagnostics instead of appending', () => {
    // Update and removal project once before auto-sync and again afterwards.
    const once = withLifecycleProviderEvidence(baseEvidence, [
      failedProvider(),
    ]);
    const twice = withLifecycleProviderEvidence(once, [failedProvider()]);

    expect(
      twice?.diagnostics.filter(
        ({ code }) => code === 'provider-materialization-failed',
      ),
    ).toHaveLength(1);
    expect(twice?.diagnostics).toHaveLength(once?.diagnostics.length ?? 0);
  });

  it('preserves canonical and inventory-derived diagnostics across re-projection', () => {
    const withCanonical: ToolPackEvidence = {
      ...baseEvidence,
      diagnostics: [
        {
          code: 'declared-only',
          severity: 'warning',
          pack: 'research',
          scope: 'user',
          affectedAssets: [],
          source: 'pack-inventory',
          detail: 'declared but not realized',
          recovery: [],
        },
      ],
    };

    const projected = withLifecycleProviderEvidence(withCanonical, [
      failedProvider(),
    ]);

    expect(
      projected?.diagnostics.some(({ code }) => code === 'declared-only'),
    ).toBe(true);
    expect(
      withLifecycleProviderEvidence(projected, [
        failedProvider(),
      ])?.diagnostics.filter(({ code }) => code === 'declared-only'),
    ).toHaveLength(1);
  });

  it('does not throw for an item with neither canonical inventory nor scope facts', () => {
    expect(() =>
      withLifecycleProviderEvidence(
        { ...baseEvidence, canonical: null, scopes: [] },
        [failedProvider()],
      ),
    ).not.toThrow();
  });
});

describe('applyUserAgentCoverage', () => {
  const inventory = {
    pack: 'research',
    placement: 'user',
    scopes: [
      scoped({
        diagnostics: [
          {
            code: 'user-agent-unmaterialized',
            message: 'no materialization',
            paths: ['~/.agents/agents/reviewer'],
          },
        ],
      }),
    ],
    diagnostics: [
      {
        code: 'user-agent-unmaterialized',
        message: 'no materialization',
        paths: ['~/.agents/agents/reviewer'],
      },
    ],
  } as never;

  it('drops the diagnostic when every managed role is materialized', () => {
    const filtered = applyUserAgentCoverage(inventory, 'all');

    expect(filtered.diagnostics).toEqual([]);
    expect(filtered.scopes[0]?.diagnostics).toEqual([]);
  });

  it.each(['bundled', 'none'] as const)(
    'keeps the diagnostic for %s coverage',
    (coverage) => {
      expect(
        applyUserAgentCoverage(inventory, coverage).diagnostics,
      ).toHaveLength(1);
    },
  );
});
