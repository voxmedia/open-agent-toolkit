import { describe, expect, it } from 'vitest';

import {
  hasScopedPackRealizationEvidence,
  packScopeFactsFromInventory,
  projectPackEvidence,
  unavailablePackScopeFacts,
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
