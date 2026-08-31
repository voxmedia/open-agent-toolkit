import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveAssetsRoot } from '@fs/assets';
import { afterEach, describe, expect, it } from 'vitest';

import { inventoryScopedPack } from './pack-inventory';
import {
  reconcilePackLifecycle,
  reconcilePackLifecycles,
} from './pack-lifecycle';
import { getPackDefinition } from './pack-manifest';
import { serializePackReconcilePlan } from './pack-reconcile';
import {
  readScopedPackIntent,
  writeScopedPackIntent,
} from './scoped-pack-intent';
import type { PackDefinition, PackName } from './types';

const roots: string[] = [];

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

describe('production pack lifecycle', () => {
  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots.length = 0;
  });

  it('installs complete docs and project-management packs before declaring intent', async () => {
    const scopeRoot = await temporaryRoot('oat-lifecycle-user-');
    const projectRoot = await temporaryRoot('oat-lifecycle-project-');
    const assetsRoot = await resolveAssetsRoot();

    const results = await reconcilePackLifecycles([
      { pack: 'docs', scope: 'user', scopeRoot, assetsRoot, action: 'install' },
      {
        pack: 'docs',
        scope: 'project',
        scopeRoot: projectRoot,
        assetsRoot,
        action: 'install',
      },
      {
        pack: 'project-management',
        scope: 'user',
        scopeRoot,
        assetsRoot,
        action: 'install',
      },
    ]);

    expect(results.map(({ apply }) => apply?.inventory.completeness)).toEqual([
      'complete',
      'complete',
      'complete',
    ]);
    await expect(
      exists(join(scopeRoot, '.oat', 'templates', 'docs-app-mkdocs')),
    ).resolves.toBe(true);
    await expect(
      exists(join(scopeRoot, '.oat', 'templates', 'docs-app-fuma')),
    ).resolves.toBe(true);
    for (const pack of ['docs', 'project-management'] as const) {
      await expect(
        readScopedPackIntent({ pack, scope: 'user', scopeRoot }),
      ).resolves.toMatchObject({ enabled: true, source: 'declared' });
    }
    await expect(
      readScopedPackIntent({
        pack: 'docs',
        scope: 'project',
        scopeRoot: projectRoot,
      }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared' });

    await writeScopedPackIntent({
      pack: 'docs',
      scope: 'user',
      scopeRoot,
      enabled: false,
    });
    await expect(
      readScopedPackIntent({ pack: 'docs', scope: 'user', scopeRoot }),
    ).resolves.toMatchObject({ enabled: true, source: 'inferred-legacy' });
    const adopted = await reconcilePackLifecycle({
      pack: 'docs',
      scope: 'user',
      scopeRoot,
      assetsRoot,
      action: 'update',
    });
    expect(adopted.plan.operations).toContainEqual(
      expect.objectContaining({ kind: 'write-intent', enabled: true }),
    );
    await expect(
      readScopedPackIntent({ pack: 'docs', scope: 'user', scopeRoot }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared' });
  });

  it('uses one exact plan for dry-run and apply across managed directories', async () => {
    const scopeRoot = await temporaryRoot('oat-lifecycle-dry-');
    const assetsRoot = await resolveAssetsRoot();
    const request = {
      pack: 'core' as const,
      scope: 'user' as const,
      scopeRoot,
      assetsRoot,
      action: 'update' as const,
    };

    const dryRun = await reconcilePackLifecycle(request, { dryRun: true });
    expect(dryRun.plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'copy-dir',
          assetId: 'directory:docs',
        }),
      ]),
    );
    await expect(exists(join(scopeRoot, '.oat', 'docs'))).resolves.toBe(false);

    const applied = await reconcilePackLifecycle(request);
    expect(serializePackReconcilePlan(applied.plan)).toBe(
      serializePackReconcilePlan(dryRun.plan),
    );
    expect(applied.apply?.inventory.completeness).toBe('complete');
  });

  it.each(['docs', 'workflows'] as const)(
    'is idempotent across repeated %s install and update for every executable asset',
    async (pack) => {
      const scopeRoot = await temporaryRoot(`oat-lifecycle-${pack}-`);
      const assetsRoot = await resolveAssetsRoot();
      const installRequest = {
        pack,
        scope: 'user' as const,
        scopeRoot,
        assetsRoot,
        action: 'install' as const,
      };

      const installed = await reconcilePackLifecycle(installRequest);
      expect(installed.apply?.inventory.intent).toMatchObject({
        enabled: true,
        source: 'declared',
      });
      const executableAssets = getPackDefinition(pack).assets.filter(
        ({ executable, scopes }) => executable && scopes.includes('user'),
      );
      expect(executableAssets.length).toBeGreaterThan(0);
      for (const asset of executableAssets) {
        await expect(
          stat(join(scopeRoot, asset.destination)).then(
            ({ mode }) => mode & 0o777,
          ),
        ).resolves.toBe(0o755);
        expect(
          installed.apply?.inventory.assets.find(
            ({ definition }) => definition.id === asset.id,
          )?.status,
        ).toBe('current');
      }

      const repeatedInstall = await reconcilePackLifecycle(installRequest);
      expect(repeatedInstall.plan.operations).toEqual([]);

      const updateRequest = { ...installRequest, action: 'update' as const };
      const dryRun = await reconcilePackLifecycle(updateRequest, {
        dryRun: true,
      });
      expect(dryRun.plan.operations).toEqual([]);
      const repeatedUpdate = await reconcilePackLifecycle(updateRequest);
      expect(repeatedUpdate.plan.operations).toEqual([]);
    },
  );

  it('rejects a later nested symlink before any pack write or intent mutation', async () => {
    const scopeRoot = await temporaryRoot('oat-lifecycle-preflight-');
    const outsideRoot = await temporaryRoot('oat-lifecycle-outside-');
    const assetsRoot = await resolveAssetsRoot();
    await mkdir(join(scopeRoot, '.agents', 'skills'), { recursive: true });
    await writeFile(join(outsideRoot, 'sentinel'), 'outside\n');
    await symlink(
      outsideRoot,
      join(scopeRoot, '.agents', 'skills', 'oat-pjm-decision'),
      'dir',
    );

    await expect(
      reconcilePackLifecycles([
        {
          pack: 'docs',
          scope: 'user',
          scopeRoot,
          assetsRoot,
          action: 'install',
        },
        {
          pack: 'project-management',
          scope: 'user',
          scopeRoot,
          assetsRoot,
          action: 'install',
        },
      ]),
    ).rejects.toThrow(/managed path.*repoint/i);

    await expect(
      exists(join(scopeRoot, '.agents', 'skills', 'authoring-docs')),
    ).resolves.toBe(false);
    await expect(exists(join(scopeRoot, '.oat', 'config.json'))).resolves.toBe(
      false,
    );
    await expect(readFile(join(outsideRoot, 'sentinel'), 'utf8')).resolves.toBe(
      'outside\n',
    );
  });

  it('reconciles selected dependency assets and leases idempotently across install and removal', async () => {
    const scopeRoot = await temporaryRoot('oat-lifecycle-dependency-');
    const assetsRoot = await resolveAssetsRoot();
    const research: PackDefinition = {
      ...getPackDefinition('research'),
      dependencies: [
        {
          pack: 'utility',
          scope: 'same',
          assets: [
            'skill:oat-dispatch-subagents',
            'skill:subagent-orchestration',
          ],
        },
      ],
    };
    const getDefinition = (pack: PackName) =>
      pack === 'research' ? research : getPackDefinition(pack);
    const dependencies = { getDefinition };
    const request = {
      pack: 'research' as const,
      scope: 'user' as const,
      scopeRoot,
      assetsRoot,
      action: 'install' as const,
    };

    const installed = await reconcilePackLifecycles([request], {
      dependencies,
    });
    expect(installed.map(({ request: { pack } }) => pack)).toEqual([
      'utility',
      'research',
    ]);
    await expect(
      readScopedPackIntent({ pack: 'utility', scope: 'user', scopeRoot }),
    ).resolves.toMatchObject({
      direct: false,
      requiredBy: ['research'],
      state: 'transitive',
    });
    expect(
      installed[0]?.apply?.inventory.assets
        .filter(({ definition }) =>
          [
            'skill:oat-dispatch-subagents',
            'skill:subagent-orchestration',
          ].includes(definition.id),
        )
        .map(({ status }) => status),
    ).toEqual(['current', 'current']);

    const repeated = await reconcilePackLifecycles([request], {
      dependencies,
    });
    expect(repeated.flatMap(({ plan }) => plan.operations)).toEqual([]);

    const removed = await reconcilePackLifecycles(
      [{ ...request, action: 'remove' }],
      { dependencies },
    );
    expect(removed.map(({ request: { pack } }) => pack)).toEqual([
      'research',
      'utility',
    ]);
    await expect(
      readScopedPackIntent({ pack: 'utility', scope: 'user', scopeRoot }),
    ).resolves.toMatchObject({
      enabled: false,
      direct: false,
      requiredBy: [],
      state: 'absent',
    });
  });

  it('releases the final dependency leases against the post-batch state', async () => {
    const scopeRoot = await temporaryRoot('oat-lifecycle-batch-release-');
    const assetsRoot = await resolveAssetsRoot();
    const selected = [
      'skill:oat-dispatch-subagents',
      'skill:subagent-orchestration',
    ];
    const consumers = ['research', 'brainstorm'] as const;
    const getDefinition = (pack: PackName): PackDefinition => {
      if (consumers.includes(pack as (typeof consumers)[number])) {
        return {
          ...getPackDefinition(pack),
          dependencies: [{ pack: 'utility', scope: 'same', assets: selected }],
        };
      }
      return getPackDefinition(pack);
    };
    const requests = consumers.map((pack) => ({
      pack,
      scope: 'user' as const,
      scopeRoot,
      assetsRoot,
      action: 'install' as const,
    }));
    await reconcilePackLifecycles(requests, {
      dependencies: { getDefinition },
    });

    await reconcilePackLifecycles(
      requests.map((request) => ({ ...request, action: 'remove' as const })),
      { dependencies: { getDefinition } },
    );

    const utility = await inventoryScopedPack({
      pack: 'utility',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(utility).toMatchObject({
      completeness: 'absent',
      intent: {
        direct: false,
        requiredBy: [],
        state: 'absent',
      },
    });
    for (const assetId of selected) {
      const asset = getPackDefinition('utility').assets.find(
        ({ id }) => id === assetId,
      );
      expect(asset).toBeDefined();
      await expect(exists(join(scopeRoot, asset!.destination))).resolves.toBe(
        false,
      );
    }
  });

  it('converges mixed dependency transfer batches independent of root request order', async () => {
    const assetsRoot = await resolveAssetsRoot();
    const selected = [
      'skill:oat-dispatch-subagents',
      'skill:subagent-orchestration',
    ];
    const brainstorm: PackDefinition = {
      ...getPackDefinition('brainstorm'),
      dependencies: [{ pack: 'utility', scope: 'same', assets: selected }],
    };
    const getDefinition = (pack: PackName) =>
      pack === 'brainstorm' ? brainstorm : getPackDefinition(pack);

    const run = async (installFirst: boolean) => {
      const scopeRoot = await temporaryRoot('oat-lifecycle-mixed-');
      const base = {
        scope: 'user' as const,
        scopeRoot,
        assetsRoot,
      };
      await reconcilePackLifecycles(
        [{ ...base, pack: 'research', action: 'install' }],
        { dependencies: { getDefinition } },
      );
      const removeResearch = {
        ...base,
        pack: 'research' as const,
        action: 'remove' as const,
      };
      const installBrainstorm = {
        ...base,
        pack: 'brainstorm' as const,
        action: 'install' as const,
      };
      await reconcilePackLifecycles(
        installFirst
          ? [installBrainstorm, removeResearch]
          : [removeResearch, installBrainstorm],
        { dependencies: { getDefinition } },
      );

      const [utility, research, installedBrainstorm] = await Promise.all([
        inventoryScopedPack({ ...base, pack: 'utility' }),
        inventoryScopedPack({ ...base, pack: 'research' }),
        inventoryScopedPack({ ...base, pack: 'brainstorm' }),
      ]);
      return {
        utility: {
          completeness: utility.completeness,
          direct: utility.intent.direct,
          requiredBy: utility.intent.requiredBy,
          selectedStatuses: utility.assets
            .filter(({ definition }) => selected.includes(definition.id))
            .map(({ status }) => status),
        },
        research: {
          completeness: research.completeness,
          direct: research.intent.direct,
        },
        brainstorm: {
          completeness: installedBrainstorm.completeness,
          direct: installedBrainstorm.intent.direct,
        },
      };
    };

    const removeThenInstall = await run(false);
    const installThenRemove = await run(true);
    expect(removeThenInstall).toEqual(installThenRemove);
    expect(removeThenInstall).toEqual({
      utility: {
        completeness: 'partial',
        direct: false,
        requiredBy: ['brainstorm'],
        selectedStatuses: ['current', 'current'],
      },
      research: { completeness: 'absent', direct: false },
      brainstorm: { completeness: 'complete', direct: true },
    });
  });
});
