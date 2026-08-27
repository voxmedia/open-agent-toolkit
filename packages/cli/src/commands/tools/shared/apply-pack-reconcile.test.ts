import type { ResolvedManagedRoot } from '@fs/paths';
import { describe, expect, it, vi } from 'vitest';

import { applyPackReconcilePlan } from './apply-pack-reconcile';
import type { ScopedPackInventory } from './pack-inventory';
import type { PackReconcilePlan } from './pack-reconcile';

const roots = {
  '.agents': {
    name: '.agents',
    logicalRoot: '/scope/.agents',
    realRoot: '/scope/.agents',
    exists: true,
  },
  '.oat': {
    name: '.oat',
    logicalRoot: '/scope/.oat',
    realRoot: '/scope/.oat',
    exists: true,
  },
} satisfies Record<'.agents' | '.oat', ResolvedManagedRoot>;

function inventory(
  completeness: 'complete' | 'partial' | 'absent',
): ScopedPackInventory {
  return {
    pack: 'brainstorm',
    scope: 'user',
    intent: {
      pack: 'brainstorm',
      scope: 'user',
      enabled: false,
      source: 'none',
      configPath: '/scope/.oat/config.json',
      diagnostics: [],
    },
    completeness,
    assets: [],
    diagnostics: [],
  };
}

function plan(): PackReconcilePlan {
  return {
    pack: 'brainstorm',
    scope: 'user',
    action: 'install',
    expectedCompleteness: 'complete',
    changedCanonicalPaths: ['.agents/skills/oat-brainstorm'],
    operations: [
      {
        kind: 'copy-dir',
        assetId: 'skill:oat-brainstorm',
        source: '/assets/skills/oat-brainstorm',
        destination: '/scope/.agents/skills/oat-brainstorm',
        force: true,
      },
      {
        kind: 'write-intent',
        pack: 'brainstorm',
        scope: 'user',
        enabled: true,
      },
    ],
  };
}

describe('applyPackReconcilePlan', () => {
  it('validates, applies, verifies, persists intent, then syncs exact paths', async () => {
    const order: string[] = [];
    const result = await applyPackReconcilePlan(plan(), '/scope', {
      resolveManagedRoots: async () => roots,
      validatePath: async (path) => {
        order.push(`validate:${path}`);
        return { realManagedRoot: '/scope/.agents', realPath: path };
      },
      copyDirectory: async () => {
        order.push('copy');
      },
      writeGenerated: vi.fn(),
      inventory: async () => {
        order.push('inventory');
        return inventory('complete');
      },
      writeIntent: async () => {
        order.push('intent');
      },
      sync: async ({ changedCanonicalPaths }) => {
        order.push(`sync:${changedCanonicalPaths.join(',')}`);
      },
    });

    expect(order).toEqual([
      'validate:/scope/.agents/skills/oat-brainstorm',
      'copy',
      'inventory',
      'intent',
      'inventory',
      'sync:.agents/skills/oat-brainstorm',
    ]);
    expect(result.synced).toBe(true);
  });

  it('rejects any path before mutating or clearing intent', async () => {
    const copy = vi.fn();
    const writeIntent = vi.fn();
    await expect(
      applyPackReconcilePlan(plan(), '/scope', {
        resolveManagedRoots: async () => roots,
        validatePath: async () => {
          throw new Error('escape');
        },
        copyDirectory: copy,
        writeGenerated: vi.fn(),
        inventory: async () => inventory('complete'),
        writeIntent,
      }),
    ).rejects.toThrow('escape');
    expect(copy).not.toHaveBeenCalled();
    expect(writeIntent).not.toHaveBeenCalled();
  });

  it('does not write intent when post-apply completeness verification fails', async () => {
    const writeIntent = vi.fn();
    await expect(
      applyPackReconcilePlan(plan(), '/scope', {
        resolveManagedRoots: async () => roots,
        validatePath: async (path) => ({
          realManagedRoot: '/scope/.agents',
          realPath: path,
        }),
        copyDirectory: vi.fn(),
        writeGenerated: vi.fn(),
        inventory: async () => inventory('partial'),
        writeIntent,
      }),
    ).rejects.toThrow('expected complete but found partial');
    expect(writeIntent).not.toHaveBeenCalled();
  });

  it('does not write intent when a complete pack still has managed drift', async () => {
    const writeIntent = vi.fn();
    const drifted = inventory('complete');
    drifted.assets.push({
      definition: {
        id: 'skill:oat-brainstorm',
        kind: 'skill',
        source: 'skills/oat-brainstorm',
        destination: '.agents/skills/oat-brainstorm',
        scopes: ['user'],
        ownership: { user: 'managed' },
      },
      path: '/scope/.agents/skills/oat-brainstorm',
      status: 'outdated',
      installedVersion: '1.0.0',
      bundledVersion: '2.0.0',
    });
    await expect(
      applyPackReconcilePlan(plan(), '/scope', {
        resolveManagedRoots: async () => roots,
        validatePath: async (path) => ({
          realManagedRoot: '/scope/.agents',
          realPath: path,
        }),
        copyDirectory: vi.fn(),
        writeGenerated: vi.fn(),
        inventory: async () => drifted,
        writeIntent,
      }),
    ).rejects.toThrow(/drifted managed assets.*oat-brainstorm/i);
    expect(writeIntent).not.toHaveBeenCalled();
  });

  it('returns final inventory after intent persistence', async () => {
    let intentWritten = false;
    const result = await applyPackReconcilePlan(plan(), '/scope', {
      resolveManagedRoots: async () => roots,
      validatePath: async (path) => ({
        realManagedRoot: '/scope/.agents',
        realPath: path,
      }),
      copyDirectory: vi.fn(),
      writeGenerated: vi.fn(),
      inventory: async () => ({
        ...inventory('complete'),
        intent: {
          ...inventory('complete').intent,
          enabled: intentWritten,
          source: intentWritten ? 'declared' : 'none',
        },
      }),
      writeIntent: async () => {
        intentWritten = true;
      },
    });

    expect(result.inventory.intent).toMatchObject({
      enabled: true,
      source: 'declared',
    });
  });

  it('is an identical no-op when the plan has no operations', async () => {
    const noOp = { ...plan(), operations: [], changedCanonicalPaths: [] };
    const result = await applyPackReconcilePlan(noOp, '/scope', {
      resolveManagedRoots: async () => roots,
      writeGenerated: vi.fn(),
      inventory: async () => inventory('complete'),
      writeIntent: vi.fn(),
    });
    expect(result).toMatchObject({ applied: [], synced: false });
  });
});
