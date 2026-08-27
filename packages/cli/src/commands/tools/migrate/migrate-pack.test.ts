import { join } from 'node:path';

import type { ApplyPackReconcileDependencies } from '@commands/tools/shared/apply-pack-reconcile';
import type { ScopedPackInventory } from '@commands/tools/shared/pack-inventory';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import { describe, expect, it } from 'vitest';

import {
  completeMigrationSourceRemoval,
  executeMigrationDestination,
  planPackMigration,
  type PackMigrationOutcome,
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

function verifiedDestination(): PackMigrationOutcome {
  const preview = migrationPreview();
  return {
    preview,
    status: 'destination-verified',
    destinationInventory: inventory('user'),
  };
}

function sourceRemovalDependencies(options: {
  events: string[];
  failAfter?: number;
}) {
  const removed = new Set<string>();
  let intentCleared = false;
  let removals = 0;
  const currentInventory = () => {
    const statuses = Object.fromEntries(
      getPackDefinition('ideas')
        .assets.filter(
          ({ scopes, ownership }) =>
            scopes.includes('project') && ownership.project === 'managed',
        )
        .map((asset) => [
          asset.id,
          removed.has(join('/project', asset.destination))
            ? 'missing'
            : 'current',
        ]),
    );
    return inventory('project', {
      intent: intentCleared ? 'none' : 'declared',
      statuses,
    });
  };
  return {
    inventory: async () => {
      options.events.push('inventory-source');
      return currentInventory();
    },
    applyDependencies: {
      resolveManagedRoots: async (scopeRoot: string) => ({
        '.agents': {
          name: '.agents' as const,
          logicalRoot: join(scopeRoot, '.agents'),
          realRoot: join(scopeRoot, '.agents'),
          exists: false,
        },
        '.oat': {
          name: '.oat' as const,
          logicalRoot: join(scopeRoot, '.oat'),
          realRoot: join(scopeRoot, '.oat'),
          exists: false,
        },
      }),
      validatePath: async (path: string) => ({
        realManagedRoot: '/project',
        realPath: path,
      }),
      removePath: async (path: string) => {
        removals += 1;
        options.events.push(`remove:${path}`);
        if (options.failAfter === removals) {
          throw new Error('injected source removal failure');
        }
        removed.add(path);
      },
      writeGenerated: async () => {
        throw new Error('source removal must not generate');
      },
      writeIntent: async (operation: { enabled: boolean }) => {
        options.events.push(`intent:${operation.enabled}`);
        intentCleared = !operation.enabled;
      },
      sync: async (input: {
        scope: 'project' | 'user';
        changedCanonicalPaths: readonly string[];
      }) => {
        options.events.push(
          `sync:${input.scope}:${input.changedCanonicalPaths.join(',')}`,
        );
      },
    },
    setFailAfter(value: number | undefined) {
      options.failAfter = value;
      removals = 0;
    },
  };
}

describe('completeMigrationSourceRemoval', () => {
  it.each(['declined', 'non-interactive'] as const)(
    '%s completion retains both scopes without mutation',
    async (confirmation) => {
      const events: string[] = [];
      const dependencies = sourceRemovalDependencies({ events });
      const result = await completeMigrationSourceRemoval(
        verifiedDestination(),
        {
          confirmation,
          sourceRoot: '/project',
          assetsRoot: '/assets',
        },
        dependencies,
      );

      expect(result.status).toBe('retained-both');
      expect(result.recovery).toContain(
        'Re-run interactively: oat tools migrate --pack ideas --from project --to user',
      );
      expect(events).toEqual([]);
    },
  );

  it('removes the source, clears intent after verification, then syncs exact canonical paths', async () => {
    const events: string[] = [];
    const dependencies = sourceRemovalDependencies({ events });
    const result = await completeMigrationSourceRemoval(
      verifiedDestination(),
      {
        confirmation: 'confirmed',
        sourceRoot: '/project',
        assetsRoot: '/assets',
      },
      dependencies,
    );

    expect(result.status).toBe('migrated');
    const intentIndex = events.indexOf('intent:false');
    const lastRemovalIndex = events.reduce(
      (last, event, index) => (event.startsWith('remove:') ? index : last),
      -1,
    );
    const syncEvent = events.find((event) => event.startsWith('sync:'));
    expect(intentIndex).toBeGreaterThan(lastRemovalIndex);
    expect(events.indexOf(syncEvent!)).toBeGreaterThan(intentIndex);
    expect(syncEvent).toContain('sync:project:.agents/skills/oat-idea-new');
    expect(syncEvent).not.toContain('.oat/templates');
    expect(result.sourceInventory).toMatchObject({
      completeness: 'absent',
      intent: { enabled: false },
    });
  });

  it('retains destination and recoverable source intent after partial failure, then retries', async () => {
    const events: string[] = [];
    const dependencies = sourceRemovalDependencies({ events, failAfter: 2 });
    const failed = await completeMigrationSourceRemoval(
      verifiedDestination(),
      {
        confirmation: 'confirmed',
        sourceRoot: '/project',
        assetsRoot: '/assets',
      },
      dependencies,
    );

    expect(failed).toMatchObject({
      status: 'source-removal-failed',
      destinationInventory: { completeness: 'complete' },
      sourceInventory: {
        completeness: 'partial',
        intent: { enabled: true, source: 'declared' },
      },
    });
    expect(failed.recovery).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/re-run interactively/i),
        expect.stringMatching(/remaining source paths/i),
      ]),
    );
    expect(events).not.toContain('intent:false');
    expect(events.some((event) => event.startsWith('sync:'))).toBe(false);

    dependencies.setFailAfter(undefined);
    const retried = await completeMigrationSourceRemoval(
      failed,
      {
        confirmation: 'confirmed',
        sourceRoot: '/project',
        assetsRoot: '/assets',
      },
      dependencies,
    );
    expect(retried.status).toBe('migrated');
  });
});
