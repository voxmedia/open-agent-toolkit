import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { inventoryPack, inventoryScopedPack } from './pack-inventory';
import { getPackDefinition } from './pack-manifest';
import type { PackAssetDefinition, PackName } from './types';

const tempDirs: string[] = [];

async function makeRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function writeAsset(
  root: string,
  path: string,
  asset: PackAssetDefinition,
  content = 'current\n',
): Promise<void> {
  const target = join(root, path);
  if (asset.kind === 'skill') {
    await mkdir(target, { recursive: true });
    await writeFile(
      join(target, 'SKILL.md'),
      `---\nname: ${asset.id}\nversion: 1.0.0\n---\n${content}`,
    );
    return;
  }
  if (asset.kind === 'directory') {
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'index.md'), content);
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  const fileContent =
    asset.kind === 'agent'
      ? `---\nname: ${asset.id}\nversion: 1.0.0\n---\n${content}`
      : content;
  await writeFile(target, fileContent);
}

async function materializeManagedPack(
  pack: PackName,
  scope: 'project' | 'user',
  assetsRoot: string,
  scopeRoot: string,
): Promise<void> {
  for (const asset of getPackDefinition(pack).assets) {
    if (asset.source) await writeAsset(assetsRoot, asset.source, asset);
    if (asset.ownership[scope] === 'managed') {
      await writeAsset(scopeRoot, asset.destination, asset);
    }
  }
}

describe('pack inventory', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('distinguishes absent, partial, and complete managed state', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    for (const asset of getPackDefinition('core').assets) {
      if (asset.source) await writeAsset(assetsRoot, asset.source, asset);
    }

    await expect(
      inventoryScopedPack({
        pack: 'core',
        scope: 'user',
        scopeRoot,
        assetsRoot,
      }),
    ).resolves.toMatchObject({ completeness: 'absent' });

    const [first, ...rest] = getPackDefinition('core').assets;
    await writeAsset(scopeRoot, first!.destination, first!);
    await expect(
      inventoryScopedPack({
        pack: 'core',
        scope: 'user',
        scopeRoot,
        assetsRoot,
      }),
    ).resolves.toMatchObject({ completeness: 'partial' });

    for (const asset of rest) {
      await writeAsset(scopeRoot, asset.destination, asset);
    }
    await expect(
      inventoryScopedPack({
        pack: 'core',
        scope: 'user',
        scopeRoot,
        assetsRoot,
      }),
    ).resolves.toMatchObject({ completeness: 'complete' });
  });

  it('ignores seed-if-missing assets when computing completeness', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    await materializeManagedPack('ideas', 'user', assetsRoot, scopeRoot);
    for (const asset of getPackDefinition('ideas').assets) {
      if (asset.kind === 'seed') {
        await rm(join(scopeRoot, asset.destination), { force: true });
      }
    }

    const inventory = await inventoryScopedPack({
      pack: 'ideas',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(inventory.completeness).toBe('complete');
    expect(
      inventory.assets.filter(({ definition }) => definition.kind === 'seed'),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'missing' })]),
    );

    const staticTemplate = getPackDefinition('ideas').assets.find(
      ({ kind }) => kind === 'template',
    )!;
    await writeFile(join(scopeRoot, staticTemplate.destination), 'drifted\n');
    const drifted = await inventoryScopedPack({
      pack: 'ideas',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(
      drifted.assets.find(
        ({ definition }) => definition.id === staticTemplate.id,
      ),
    ).toMatchObject({ status: 'outdated' });
  });

  it('compares skill and agent versions plus static file and tree digests', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    await materializeManagedPack('research', 'user', assetsRoot, scopeRoot);
    const agent = getPackDefinition('research').assets.find(
      ({ kind }) => kind === 'agent',
    )!;
    await writeFile(
      join(scopeRoot, agent.destination),
      '---\nname: agent\nversion: 0.9.0\n---\n',
    );
    const research = await inventoryScopedPack({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(
      research.assets.find(({ definition }) => definition.id === agent.id),
    ).toMatchObject({ status: 'outdated', installedVersion: '0.9.0' });

    await materializeManagedPack('core', 'user', assetsRoot, scopeRoot);
    const docs = getPackDefinition('core').assets.find(
      ({ kind }) => kind === 'directory',
    )!;
    await writeFile(join(scopeRoot, docs.destination, 'index.md'), 'drifted\n');
    const core = await inventoryScopedPack({
      pack: 'core',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(
      core.assets.find(({ definition }) => definition.id === docs.id),
    ).toMatchObject({ status: 'outdated' });
  });

  it('reports duplicate project and user placement with canonical paths', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const projectRoot = await makeRoot('oat-project-');
    const userRoot = await makeRoot('oat-user-');
    await materializeManagedPack(
      'brainstorm',
      'project',
      assetsRoot,
      projectRoot,
    );
    await materializeManagedPack('brainstorm', 'user', assetsRoot, userRoot);

    const inventory = await inventoryPack({
      pack: 'brainstorm',
      assetsRoot,
      projectRoot,
      userRoot,
    });
    expect(inventory.placement).toBe('both');
    expect(inventory.diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate-scope',
        paths: expect.arrayContaining([
          join(projectRoot, '.agents', 'skills', 'oat-brainstorm'),
          join(userRoot, '.agents', 'skills', 'oat-brainstorm'),
        ]),
      }),
    ]);
  });

  it('rejects a canonical asset path that escapes through a nested symlink', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    const outsideRoot = await makeRoot('oat-outside-');
    await materializeManagedPack('brainstorm', 'user', assetsRoot, outsideRoot);
    await mkdir(join(scopeRoot, '.agents'), { recursive: true });
    await symlink(outsideRoot, join(scopeRoot, '.agents', 'skills'), 'dir');

    await expect(
      inventoryScopedPack({
        pack: 'brainstorm',
        scope: 'user',
        scopeRoot,
        assetsRoot,
      }),
    ).rejects.toThrow(/managed path.*repoint/i);
  });
});
