import { describe, expect, it } from 'vitest';

import type { ScopedPackInventory } from './pack-inventory';
import { getPackDefinition } from './pack-manifest';
import {
  planPackReconcile,
  resolveSharedOwnerRetentions,
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
      direct: enabled,
      requiredBy: [],
      state: enabled ? 'direct' : 'absent',
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

  it('retains a shared path owned by another installed pack while verifying selected removal', async () => {
    const scoped: ScopedPackInventory = {
      ...inventory('workflows', 'project', {}, true),
      assets: inventory('workflows', 'project', {}, true).assets.map((asset) =>
        asset.definition.destination === '.oat/scripts/resolve-tracking.sh'
          ? { ...asset, status: 'current' }
          : asset,
      ),
    };
    const retainedAssets = await resolveSharedOwnerRetentions({
      packs: ['workflows'],
      scope: 'project',
      scopeRoot: '/scope',
      hasOwnershipEvidence: async (pack) => pack === 'docs',
    });
    const plan = planPackReconcile({
      pack: 'workflows',
      scope: 'project',
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'remove',
      inventory: scoped,
      retainedAssets,
    });

    expect(retainedAssets).toEqual([
      expect.objectContaining({
        assetId: 'script:resolve-tracking.sh',
        retainedBy: ['docs'],
      }),
    ]);
    expect(plan.operations).not.toContainEqual(
      expect.objectContaining({ assetId: 'script:resolve-tracking.sh' }),
    );
    expect(plan.retainedAssets).toEqual(retainedAssets);
    expect(plan.expectedCompleteness).toBe('partial');
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

  it('plans only selected dependency assets and persists the lease separately', () => {
    const scoped = inventory('workflows', 'user');
    const plan = planPackReconcile({
      pack: 'workflows',
      scope: 'user',
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'install',
      inventory: scoped,
      assetIds: ['skill:oat-project-new'],
      dependency: { requiredBy: 'research', lease: 'acquire' },
    });

    expect(plan.operations).toEqual([
      expect.objectContaining({
        kind: 'copy-dir',
        assetId: 'skill:oat-project-new',
      }),
      {
        kind: 'write-lease',
        pack: 'workflows',
        scope: 'user',
        requiredBy: 'research',
        enabled: true,
      },
    ]);
    expect(plan.selectedAssetIds).toEqual(['skill:oat-project-new']);
    expect(plan.expectedCompleteness).toBeNull();
    expect(plan.expectedAssetStatus).toBe('current');
  });

  it('retains dependency assets until direct intent and every other lease are absent', () => {
    const scoped = inventory(
      'workflows',
      'user',
      { 'skill:oat-project-new': 'current' },
      false,
    );
    scoped.intent = {
      ...scoped.intent,
      enabled: true,
      requiredBy: ['brainstorm', 'research'],
      state: 'transitive',
      source: 'declared',
    };
    const retained = planPackReconcile({
      pack: 'workflows',
      scope: 'user',
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'remove',
      inventory: scoped,
      assetIds: ['skill:oat-project-new'],
      dependency: { requiredBy: 'research', lease: 'release' },
    });
    expect(retained.operations).toEqual([
      {
        kind: 'write-lease',
        pack: 'workflows',
        scope: 'user',
        requiredBy: 'research',
        enabled: false,
      },
    ]);
    expect(retained.expectedAssetStatus).toBe('current');

    scoped.intent.requiredBy = ['research'];
    const removed = planPackReconcile({
      pack: 'workflows',
      scope: 'user',
      scopeRoot: '/scope',
      assetsRoot: '/assets',
      action: 'remove',
      inventory: scoped,
      assetIds: ['skill:oat-project-new'],
      dependency: { requiredBy: 'research', lease: 'release' },
    });
    expect(removed.operations).toEqual([
      expect.objectContaining({
        kind: 'remove-dir',
        assetId: 'skill:oat-project-new',
      }),
      expect.objectContaining({ kind: 'write-lease', enabled: false }),
    ]);
    expect(removed.expectedAssetStatus).toBe('missing');
  });
});
