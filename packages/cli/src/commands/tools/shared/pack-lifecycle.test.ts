import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveAssetsRoot } from '@fs/assets';
import { afterEach, describe, expect, it } from 'vitest';

import {
  reconcilePackLifecycle,
  reconcilePackLifecycles,
} from './pack-lifecycle';
import { serializePackReconcilePlan } from './pack-reconcile';
import {
  readScopedPackIntent,
  writeScopedPackIntent,
} from './scoped-pack-intent';

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
});
