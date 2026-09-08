import { describe, expect, it } from 'vitest';

import {
  hasScopedPackRealizationEvidence,
  packScopeFactsFromInventory,
  projectPackEvidence,
  providerDiagnostics,
  unavailablePackScopeFacts,
  type ProviderReachabilityEvidence,
} from './pack-evidence';
import type { ScopedPackInventory } from './pack-inventory';

function scoped(input: {
  scope: 'project' | 'user';
  enabled?: boolean;
  statuses?: Array<'missing' | 'current' | 'outdated' | 'newer'>;
}): ScopedPackInventory {
  const statuses = input.statuses ?? ['missing'];
  return {
    pack: 'brainstorm',
    scope: input.scope,
    intent: {
      pack: 'brainstorm',
      scope: input.scope,
      enabled: input.enabled ?? false,
      source: input.enabled ? 'declared' : 'none',
      configPath: '/scope/.oat/config.json',
      diagnostics: [],
    },
    completeness: statuses.every((status) => status === 'missing')
      ? 'absent'
      : statuses.some((status) => status === 'missing')
        ? 'partial'
        : 'complete',
    assets: statuses.map((status, index) => ({
      definition: {
        id: `asset-${index}`,
        kind: 'skill',
        destination: `.agents/skills/asset-${index}`,
        scopes: [input.scope],
        ownership: { [input.scope]: 'managed' },
      },
      path: `/scope/asset-${index}`,
      status,
      installedVersion: null,
      bundledVersion: null,
    })),
    diagnostics: [],
  };
}

describe('pack evidence', () => {
  it('does not treat declared-only intent as realized placement', () => {
    const project = scoped({ scope: 'project', enabled: true });
    expect(hasScopedPackRealizationEvidence(project)).toBe(false);
    const evidence = projectPackEvidence({
      canonical: {
        pack: 'brainstorm',
        placement: 'project',
        scopes: [project],
        diagnostics: [],
      },
      scopes: [packScopeFactsFromInventory(project)],
    });
    expect(evidence).toMatchObject({
      knownRealizedScopes: [],
      unknownScopes: [],
      realizedPlacement: 'none',
      diagnostics: [expect.objectContaining({ code: 'declared-only' })],
    });
  });

  it.each([
    { statuses: ['current'] as const, health: 'current' },
    { statuses: ['outdated'] as const, health: 'drifted' },
    { statuses: ['newer'] as const, health: 'newer' },
    { statuses: ['current', 'missing'] as const, health: 'current' },
    { statuses: ['current', 'outdated'] as const, health: 'mixed' },
  ])(
    'projects $health health without changing completeness',
    ({ statuses, health }) => {
      const inventory = scoped({ scope: 'user', statuses: [...statuses] });
      expect(packScopeFactsFromInventory(inventory)).toMatchObject({
        completeness: inventory.completeness,
        health,
        realization: 'present',
      });
    },
  );

  it('reports duplicate verified scopes separately from legacy placement', () => {
    const project = scoped({ scope: 'project', statuses: ['current'] });
    const user = scoped({ scope: 'user', statuses: ['current'] });
    const canonical = {
      pack: 'brainstorm' as const,
      placement: 'both' as const,
      scopes: [project, user],
      diagnostics: [],
    };
    expect(
      projectPackEvidence({
        canonical,
        scopes: canonical.scopes.map(packScopeFactsFromInventory),
      }),
    ).toMatchObject({
      knownRealizedScopes: ['project', 'user'],
      realizedPlacement: 'both',
      diagnostics: [expect.objectContaining({ code: 'duplicate-placement' })],
    });
  });

  it('fails placement closed when one scope inventory is unavailable', () => {
    const project = scoped({ scope: 'project', statuses: ['current'] });
    const userIntent = scoped({ scope: 'user', enabled: true }).intent;
    const evidence = projectPackEvidence({
      canonical: {
        pack: 'brainstorm',
        placement: 'project',
        scopes: [project],
        diagnostics: [],
      },
      scopes: [
        packScopeFactsFromInventory(project),
        unavailablePackScopeFacts({
          scope: 'user',
          intent: userIntent,
          reason: 'permission denied',
        }),
      ],
    });
    expect(evidence).toMatchObject({
      knownRealizedScopes: ['project'],
      unknownScopes: ['user'],
      realizedPlacement: 'unknown',
      diagnostics: [expect.objectContaining({ code: 'inventory-unavailable' })],
    });
  });

  it('emits none only after every evaluated scope is verified absent', () => {
    const project = scoped({ scope: 'project' });
    const user = scoped({ scope: 'user' });
    expect(
      projectPackEvidence({
        canonical: {
          pack: 'brainstorm',
          placement: 'unavailable',
          scopes: [project, user],
          diagnostics: [],
        },
        scopes: [project, user].map(packScopeFactsFromInventory),
      }).realizedPlacement,
    ).toBe('none');
  });

  it('ignores present shared assets as realization evidence', () => {
    const inventory = scoped({ scope: 'user', statuses: ['current'] });
    inventory.assets[0]!.definition.sharedOwner = 'shared';
    expect(hasScopedPackRealizationEvidence(inventory)).toBe(false);
  });
});

function providerEvidence(
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
      reason: 'codex projects user agent content via materialization-extension',
    },
    projection: { state: 'projected', mode: 'materialization-extension' },
    materialization: { state: 'materialized', detail: 'materialized' },
    visibility: { state: 'live', reason: 'codex reads without a refresh' },
    recovery: [],
    ...overrides,
  };
}

describe('providerDiagnostics', () => {
  it('emits provider-inactive for a config-disabled provider', () => {
    const diagnostics = providerDiagnostics({
      pack: 'research',
      mode: 'inventory',
      providers: [
        providerEvidence({
          activation: {
            state: 'inactive',
            source: 'config-disabled',
            reason: 'Explicitly disabled in sync config',
          },
        }),
      ],
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'provider-inactive',
      severity: 'info',
      provider: 'codex',
      scope: 'user',
      contentKind: 'agent',
    });
  });

  it('does not report a provider that was never detected or configured', () => {
    expect(
      providerDiagnostics({
        pack: 'research',
        mode: 'inventory',
        providers: [
          providerEvidence({
            activation: {
              state: 'inactive',
              source: 'undetected-unset',
              reason: 'Not detected and no explicit provider setting',
            },
          }),
        ],
      }),
    ).toEqual([]);
  });

  it('emits provider-unsupported carrying the registry reason', () => {
    const diagnostics = providerDiagnostics({
      pack: 'research',
      mode: 'inventory',
      providers: [
        providerEvidence({
          capability: {
            support: 'unsupported',
            projectionModes: ['unsupported'],
            reason: 'Codex has no user rule projection',
          },
        }),
      ],
    });

    expect(diagnostics[0]).toMatchObject({
      code: 'provider-unsupported',
      severity: 'info',
      detail: 'Codex has no user rule projection',
    });
  });

  it('names the provider and the affected assets on a missing materialization', () => {
    const diagnostics = providerDiagnostics({
      pack: 'research',
      mode: 'inventory',
      providers: [
        providerEvidence({
          projection: { state: 'absent', mode: 'materialization-extension' },
          materialization: {
            state: 'missing',
            detail: 'codex has no user agent materialization for 1 asset',
          },
        }),
      ],
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'provider-materialization-missing',
      severity: 'warning',
      provider: 'codex',
      affectedAssets: ['~/.agents/agents/skeptical-evaluator.md'],
    });
  });

  it('emits refresh and restart codes from catalog state', () => {
    const refresh = providerDiagnostics({
      pack: 'research',
      mode: 'inventory',
      providers: [
        providerEvidence({
          visibility: {
            state: 'manual-refresh',
            reason: 'refresh the catalog',
          },
        }),
      ],
    });
    const restart = providerDiagnostics({
      pack: 'research',
      mode: 'inventory',
      providers: [
        providerEvidence({
          visibility: { state: 'restart-required', reason: 'start a session' },
        }),
      ],
    });

    expect(refresh[0]).toMatchObject({
      code: 'refresh-required',
      severity: 'info',
    });
    expect(restart[0]).toMatchObject({
      code: 'restart-required',
      severity: 'info',
    });
  });

  it('suppresses a materialization failure on a read-only inventory surface', () => {
    const providers = [
      providerEvidence({
        materialization: { state: 'failed', detail: 'permission denied' },
      }),
    ];

    expect(
      providerDiagnostics({ pack: 'research', mode: 'inventory', providers }),
    ).toEqual([]);
    expect(
      providerDiagnostics({
        pack: 'research',
        mode: 'lifecycle',
        providers,
      })[0],
    ).toMatchObject({
      code: 'provider-materialization-failed',
      severity: 'error',
    });
  });

  it('merges provider diagnostics into projected pack evidence', () => {
    const evidence = projectPackEvidence({
      canonical: null,
      scopes: [packScopeFactsFromInventory(scoped({ scope: 'user' }))],
      providers: [
        providerEvidence({
          activation: {
            state: 'inactive',
            source: 'config-disabled',
            reason: 'Explicitly disabled in sync config',
          },
        }),
      ],
      providerMode: 'inventory',
    });

    expect(evidence.providers).toHaveLength(1);
    expect(
      evidence.diagnostics.some(({ code }) => code === 'provider-inactive'),
    ).toBe(true);
  });
});
