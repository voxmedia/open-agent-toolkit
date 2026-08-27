import { join } from 'node:path';

import type { ApplyPackReconcileDependencies } from '@commands/tools/shared/apply-pack-reconcile';
import type { ScopedPackInventory } from '@commands/tools/shared/pack-inventory';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import { describe, expect, it } from 'vitest';

import {
  executeMigrationDestination,
  planPackMigration,
  type PackMigrationPreview,
} from './migrate-pack';

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

function migrationPreview(): PackMigrationPreview {
  return planPackMigration({
    pack: 'ideas',
    from: 'project',
    to: 'user',
    sourceRoot: '/project',
    destinationRoot: '/user',
    assetsRoot: '/assets',
    sourceInventory: inventory('project'),
    destinationInventory: inventory('user', { intent: 'none' }),
  });
}

function destinationDependencies(options: {
  copyFailure?: boolean;
  verificationFailure?: boolean;
  events: string[];
}): ApplyPackReconcileDependencies {
  let intentWritten = false;
  return {
    resolveManagedRoots: async (scopeRoot) => ({
      '.agents': {
        name: '.agents',
        logicalRoot: join(scopeRoot, '.agents'),
        realRoot: join(scopeRoot, '.agents'),
        exists: false,
      },
      '.oat': {
        name: '.oat',
        logicalRoot: join(scopeRoot, '.oat'),
        realRoot: join(scopeRoot, '.oat'),
        exists: false,
      },
    }),
    validatePath: async (path) => ({
      realManagedRoot: '/user',
      realPath: path,
    }),
    copyDirectory: async () => {
      options.events.push('copy');
      if (options.copyFailure) throw new Error('injected copy failure');
    },
    copyFile: async () => {
      options.events.push('copy');
      if (options.copyFailure) throw new Error('injected copy failure');
    },
    chmodPath: async () => {
      options.events.push('chmod');
    },
    removePath: async () => {
      throw new Error('destination execution must not remove');
    },
    writeGenerated: async () => {
      options.events.push('generate');
    },
    writeIntent: async () => {
      options.events.push('intent');
      intentWritten = true;
    },
    inventory: async () => {
      options.events.push('inventory');
      if (options.verificationFailure) {
        return inventory('user', { intent: 'none' });
      }
      return inventory('user', {
        intent: intentWritten ? 'declared' : 'inferred-legacy',
      });
    },
  };
}

describe('executeMigrationDestination', () => {
  it('leaves source and destination intent untouched when a copy fails', async () => {
    const events: string[] = [];
    await expect(
      executeMigrationDestination(migrationPreview(), '/user', {
        applyDependencies: destinationDependencies({
          copyFailure: true,
          events,
        }),
      }),
    ).rejects.toThrow(/injected copy failure/);

    expect(events).toEqual(['copy']);
    expect(events).not.toContain('intent');
    expect(events).not.toContain('source');
  });

  it('does not persist destination intent when re-inventory is incomplete', async () => {
    const events: string[] = [];
    await expect(
      executeMigrationDestination(migrationPreview(), '/user', {
        applyDependencies: destinationDependencies({
          verificationFailure: true,
          events,
        }),
      }),
    ).rejects.toThrow(/expected complete but found absent/i);

    expect(events).toContain('inventory');
    expect(events).not.toContain('intent');
    expect(events).not.toContain('source');
  });

  it('persists destination intent only after complete filesystem verification', async () => {
    const events: string[] = [];
    const result = await executeMigrationDestination(
      migrationPreview(),
      '/user',
      {
        applyDependencies: destinationDependencies({ events }),
      },
    );

    expect(result).toMatchObject({ status: 'destination-verified' });
    expect(result.destinationInventory).toMatchObject({
      completeness: 'complete',
      intent: { enabled: true, source: 'declared' },
    });
    expect(events.slice(-3)).toEqual(['inventory', 'intent', 'inventory']);
    expect(events).not.toContain('source');
  });
});
