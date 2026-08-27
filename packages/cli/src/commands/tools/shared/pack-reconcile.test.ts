import { describe, expect, it } from 'vitest';

import type { ScopedPackInventory } from './pack-inventory';
import { getPackDefinition } from './pack-manifest';
import {
  planPackReconcile,
  serializePackReconcilePlan,
} from './pack-reconcile';

function inventory(
  pack: 'workflows' | 'ideas',
  scope: 'project' | 'user',
  statuses: Record<string, 'missing' | 'current' | 'outdated'> = {},
  enabled = false,
): ScopedPackInventory {
  return {
    pack,
    scope,
    intent: {
      pack,
      scope,
      enabled,
      source: enabled ? 'declared' : 'none',
      configPath: '/scope/.oat/config.json',
      diagnostics: [],
    },
    completeness: 'partial',
    assets: getPackDefinition(pack)
      .assets.filter(({ scopes }) => scopes.includes(scope))
      .map((definition) => ({
        definition,
        path: `/scope/${definition.destination}`,
        status: statuses[definition.id] ?? 'missing',
        installedVersion: null,
        bundledVersion: null,
      })),
    diagnostics: [],
  };
}

describe('planPackReconcile', () => {
  it('plans managed files, chmod, seed-if-missing, canonical paths, then intent', () => {
    const scoped = inventory('workflows', 'project');
    const plan = planPackReconcile({
      pack: 'workflows',
      scope: 'project',
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'install',
      inventory: scoped,
    });

    expect(plan.operations.at(-1)).toEqual({
      kind: 'write-intent',
      pack: 'workflows',
      scope: 'project',
      enabled: true,
    });
    expect(plan.operations.some(({ kind }) => kind === 'write-generated')).toBe(
      true,
    );
    expect(plan.operations.some(({ kind }) => kind === 'chmod')).toBe(true);
    expect(plan.changedCanonicalPaths).toEqual(
      getPackDefinition('workflows')
        .assets.filter(
          ({ kind, scopes }) =>
            scopes.includes('project') &&
            (kind === 'skill' || kind === 'agent'),
        )
        .map(({ destination }) => destination),
    );
  });

  it('excludes existing project seeds and repository template overrides', () => {
    const statuses = Object.fromEntries(
      getPackDefinition('ideas').assets.map(({ id }) => [id, 'current']),
    );
    const plan = planPackReconcile({
      pack: 'ideas',
      scope: 'project',
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'update',
      inventory: inventory('ideas', 'project', statuses, true),
    });

    expect(plan.operations).toEqual([]);
  });

  it('removes only present managed assets and writes intent last', () => {
    const plan = planPackReconcile({
      pack: 'ideas',
      scope: 'user',
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'remove',
      inventory: inventory(
        'ideas',
        'user',
        { 'skill:oat-idea-new': 'current' },
        true,
      ),
    });

    expect(plan.operations).toEqual([
      {
        kind: 'remove-dir',
        assetId: 'skill:oat-idea-new',
        path: '/scope/.agents/skills/oat-idea-new',
      },
      {
        kind: 'write-intent',
        pack: 'ideas',
        scope: 'user',
        enabled: false,
      },
    ]);
    expect(plan.expectedCompleteness).toBe('absent');
  });

  it('serializes the same stable plan for dry-run output', () => {
    const input = {
      pack: 'ideas' as const,
      scope: 'user' as const,
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'install' as const,
      inventory: inventory('ideas', 'user'),
    };
    expect(serializePackReconcilePlan(planPackReconcile(input))).toBe(
      serializePackReconcilePlan(planPackReconcile(input)),
    );
  });
});
