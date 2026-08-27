import { join } from 'node:path';

import type { ScopedPackInventory } from '@commands/tools/shared/pack-inventory';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import { describe, expect, it } from 'vitest';

import { planPackMigration } from './migrate-pack';

function inventory(
  scope: 'project' | 'user',
  options: {
    intent?: 'declared' | 'inferred-legacy' | 'none';
    statuses?: Record<
      string,
      'missing' | 'current' | 'outdated' | 'newer' | 'present'
    >;
    legacyFalseConflict?: boolean;
  } = {},
): ScopedPackInventory {
  const definition = getPackDefinition('ideas');
  const source = options.intent ?? 'declared';
  const assets = definition.assets
    .filter(({ scopes }) => scopes.includes(scope))
    .map((asset) => ({
      definition: asset,
      path: join(`/${scope}`, asset.destination),
      status:
        options.statuses?.[asset.id] ??
        (source === 'none'
          ? 'missing'
          : asset.ownership[scope] === 'managed'
            ? 'current'
            : 'present'),
      installedVersion: null,
      bundledVersion: null,
    }));
  const managed = assets.filter(
    ({ definition: asset }) => asset.ownership[scope] === 'managed',
  );
  const present = managed.filter(({ status }) => status !== 'missing').length;
  return {
    pack: 'ideas',
    scope,
    intent: {
      pack: 'ideas',
      scope,
      enabled: source !== 'none',
      source,
      configPath: join(`/${scope}`, '.oat/config.json'),
      diagnostics: options.legacyFalseConflict
        ? [
            {
              code: 'legacy-false-conflict',
              message: 'legacy false conflicts with managed assets',
              paths: [join(`/${scope}`, definition.assets[0]!.destination)],
            },
          ]
        : [],
    },
    completeness:
      present === 0
        ? 'absent'
        : present === managed.length
          ? 'complete'
          : 'partial',
    assets,
    diagnostics: [],
  };
}

describe('planPackMigration', () => {
  it('rejects a same-scope move and a source without intent or legacy placement', () => {
    const project = inventory('project');
    expect(() =>
      planPackMigration({
        pack: 'ideas',
        from: 'project',
        to: 'project',
        sourceRoot: '/project',
        destinationRoot: '/project',
        assetsRoot: '/assets',
        sourceInventory: project,
        destinationInventory: project,
      }),
    ).toThrow(/must differ/i);

    expect(() =>
      planPackMigration({
        pack: 'ideas',
        from: 'project',
        to: 'user',
        sourceRoot: '/project',
        destinationRoot: '/user',
        assetsRoot: '/assets',
        sourceInventory: inventory('project', { intent: 'none' }),
        destinationInventory: inventory('user', { intent: 'none' }),
      }),
    ).toThrow(/not installed/i);
  });

  it.each(['declared', 'inferred-legacy'] as const)(
    'accepts %s source intent and produces a stable preview',
    (intent) => {
      const input = {
        pack: 'ideas' as const,
        from: 'project' as const,
        to: 'user' as const,
        sourceRoot: '/project',
        destinationRoot: '/user',
        assetsRoot: '/assets',
        sourceInventory: inventory('project', { intent }),
        destinationInventory: inventory('user', { intent: 'none' }),
      };

      const first = planPackMigration(input);
      const second = planPackMigration(input);
      expect(first).toEqual(second);
      expect(first).toMatchObject({
        pack: 'ideas',
        from: 'project',
        to: 'user',
        sourceIntent: intent,
        status: 'ready',
      });
      expect(first.additions.length).toBeGreaterThan(0);
      expect(first.removals.length).toBeGreaterThan(0);
      expect(first.destinationPlan).toMatchObject({
        pack: 'ideas',
        scope: 'user',
        action: 'migrate-destination',
      });
    },
  );

  it('reports duplicates and retained destination overrides without scheduling their replacement', () => {
    const destination = inventory('user', {
      intent: 'none',
      statuses: {
        'skill:oat-idea-new': 'current',
        'seed:ideas-backlog': 'present',
      },
    });
    const preview = planPackMigration({
      pack: 'ideas',
      from: 'project',
      to: 'user',
      sourceRoot: '/project',
      destinationRoot: '/user',
      assetsRoot: '/assets',
      sourceInventory: inventory('project'),
      destinationInventory: destination,
    });

    expect(preview.duplicates).toContainEqual(
      expect.objectContaining({ assetId: 'skill:oat-idea-new' }),
    );
    expect(preview.retained).toContainEqual(
      expect.objectContaining({ assetId: 'seed:ideas-backlog' }),
    );
    expect(preview.destinationPlan.operations).not.toContainEqual(
      expect.objectContaining({ assetId: 'seed:ideas-backlog' }),
    );
  });

  it('blocks newer destination conflicts and legacy-false conflicts before mutation', () => {
    expect(() =>
      planPackMigration({
        pack: 'ideas',
        from: 'project',
        to: 'user',
        sourceRoot: '/project',
        destinationRoot: '/user',
        assetsRoot: '/assets',
        sourceInventory: inventory('project'),
        destinationInventory: inventory('user', {
          intent: 'none',
          statuses: { 'skill:oat-idea-new': 'newer' },
        }),
      }),
    ).toThrow(/destination conflict.*oat-idea-new/i);

    expect(() =>
      planPackMigration({
        pack: 'ideas',
        from: 'project',
        to: 'user',
        sourceRoot: '/project',
        destinationRoot: '/user',
        assetsRoot: '/assets',
        sourceInventory: inventory('project'),
        destinationInventory: inventory('user', {
          intent: 'inferred-legacy',
          legacyFalseConflict: true,
        }),
      }),
    ).toThrow(/legacy false/i);
  });
});
