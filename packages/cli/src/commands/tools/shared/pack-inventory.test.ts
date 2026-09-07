import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  attributeSharedOwnerDiagnostics,
  inventoryPack,
  inventoryScopedPack,
} from './pack-inventory';
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

async function writeVersionedAsset(
  root: string,
  path: string,
  asset: PackAssetDefinition,
  version: string | null,
  content: string,
): Promise<void> {
  const target = join(root, path);
  const frontmatter = `---\nname: ${asset.id}\n${version === null ? '' : `version: ${version}\n`}---\n${content}`;
  if (asset.kind === 'skill') {
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'SKILL.md'), frontmatter);
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, frontmatter);
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

  it('distinguishes bundled seed defaults from retained overrides', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-project-');
    const seed = getPackDefinition('ideas').assets.find(
      ({ kind, source }) => kind === 'seed' && source,
    )!;
    await writeAsset(assetsRoot, seed.source!, seed, 'bundled default\n');

    const absent = await inventoryScopedPack({
      pack: 'ideas',
      scope: 'project',
      scopeRoot,
      assetsRoot,
    });
    expect(
      absent.assets.find(({ definition }) => definition.id === seed.id),
    ).toMatchObject({ status: 'missing' });

    await writeAsset(scopeRoot, seed.destination, seed, 'bundled default\n');
    const identical = await inventoryScopedPack({
      pack: 'ideas',
      scope: 'project',
      scopeRoot,
      assetsRoot,
    });
    expect(
      identical.assets.find(({ definition }) => definition.id === seed.id),
    ).toMatchObject({ status: 'current' });

    const retainedContent = 'owner override\n';
    await writeFile(join(scopeRoot, seed.destination), retainedContent);
    const retained = await inventoryScopedPack({
      pack: 'ideas',
      scope: 'project',
      scopeRoot,
      assetsRoot,
    });
    expect(
      retained.assets.find(({ definition }) => definition.id === seed.id),
    ).toMatchObject({ status: 'present' });
    await expect(
      readFile(join(scopeRoot, seed.destination), 'utf8'),
    ).resolves.toBe(retainedContent);
  });

  it('preserves generation-aware inventory for generated seeds', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-project-');
    await materializeManagedPack('workflows', 'project', assetsRoot, scopeRoot);
    await mkdir(join(scopeRoot, '.oat', 'projects', 'local'), {
      recursive: true,
    });
    await mkdir(join(scopeRoot, '.oat', 'projects', 'archived'), {
      recursive: true,
    });
    await writeFile(
      join(scopeRoot, '.oat', 'projects-root'),
      '.oat/projects/custom\n',
    );
    await writeFile(
      join(scopeRoot, '.oat', 'config.json'),
      JSON.stringify({ projects: { root: '.oat/projects/shared' } }),
    );
    await writeFile(
      join(scopeRoot, '.oat', 'projects', 'local', '.gitkeep'),
      '',
    );
    await writeFile(
      join(scopeRoot, '.oat', 'projects', 'archived', '.gitkeep'),
      '',
    );

    const inventory = await inventoryScopedPack({
      pack: 'workflows',
      scope: 'project',
      scopeRoot,
      assetsRoot,
    });
    const generated = new Map(
      inventory.assets
        .filter(({ definition }) => definition.generation)
        .map(({ definition, status }) => [definition.generation, status]),
    );
    expect(generated).toMatchObject(
      new Map([
        ['projects-root-default', 'present'],
        ['projects-config-default', 'present'],
        ['empty-file', 'present'],
      ]),
    );

    await writeFile(join(scopeRoot, '.oat', 'config.json'), '{}');
    const invalidConfig = await inventoryScopedPack({
      pack: 'workflows',
      scope: 'project',
      scopeRoot,
      assetsRoot,
    });
    expect(
      invalidConfig.assets.find(
        ({ definition }) => definition.generation === 'projects-config-default',
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

  it.each(['skill', 'agent'] as const)(
    'reports same-version %s content drift',
    async (kind) => {
      const assetsRoot = await makeRoot('oat-assets-');
      const scopeRoot = await makeRoot('oat-user-');
      const asset = getPackDefinition('research').assets.find(
        (candidate) => candidate.kind === kind,
      )!;
      await materializeManagedPack('research', 'user', assetsRoot, scopeRoot);
      await writeVersionedAsset(
        scopeRoot,
        asset.destination,
        asset,
        '1.0.0',
        'locally modified\n',
      );

      const inventory = await inventoryScopedPack({
        pack: 'research',
        scope: 'user',
        scopeRoot,
        assetsRoot,
      });
      expect(
        inventory.assets.find(({ definition }) => definition.id === asset.id),
      ).toMatchObject({
        status: 'outdated',
        installedVersion: '1.0.0',
        bundledVersion: '1.0.0',
      });
    },
  );

  it.each([
    {
      label: 'absent installed metadata',
      installedVersion: null,
      bundledVersion: '1.0.0',
      installedContent: 'same\n',
      bundledContent: 'same\n',
      status: 'outdated',
    },
    {
      label: 'malformed installed metadata',
      installedVersion: 'invalid',
      bundledVersion: '1.0.0',
      installedContent: 'same\n',
      bundledContent: 'same\n',
      status: 'outdated',
    },
    {
      label: 'older installed version',
      installedVersion: '0.9.0',
      bundledVersion: '1.0.0',
      installedContent: 'same\n',
      bundledContent: 'same\n',
      status: 'outdated',
    },
    {
      label: 'newer installed version',
      installedVersion: '1.1.0',
      bundledVersion: '1.0.0',
      installedContent: 'locally changed\n',
      bundledContent: 'same\n',
      status: 'newer',
    },
    {
      label: 'malformed bundled metadata',
      installedVersion: '1.0.0',
      bundledVersion: 'invalid',
      installedContent: 'same\n',
      bundledContent: 'same\n',
      status: 'newer',
    },
    {
      label: 'equal version and canonical content',
      installedVersion: '1.0.0',
      bundledVersion: '1.0.0',
      installedContent: 'same\n',
      bundledContent: 'same\n',
      status: 'current',
    },
    {
      label: 'equal version with content drift',
      installedVersion: '1.0.0',
      bundledVersion: '1.0.0',
      installedContent: 'locally changed\n',
      bundledContent: 'same\n',
      status: 'outdated',
    },
  ])(
    'preserves version precedence for $label',
    async ({
      installedVersion,
      bundledVersion,
      installedContent,
      bundledContent,
      status,
    }) => {
      const assetsRoot = await makeRoot('oat-assets-');
      const scopeRoot = await makeRoot('oat-user-');
      const skill = getPackDefinition('research').assets.find(
        ({ kind }) => kind === 'skill',
      )!;
      for (const asset of getPackDefinition('research').assets) {
        if (asset.source) await writeAsset(assetsRoot, asset.source, asset);
      }
      await writeVersionedAsset(
        assetsRoot,
        skill.source!,
        skill,
        bundledVersion,
        bundledContent,
      );
      await writeVersionedAsset(
        scopeRoot,
        skill.destination,
        skill,
        installedVersion,
        installedContent,
      );

      const inventory = await inventoryScopedPack({
        pack: 'research',
        scope: 'user',
        scopeRoot,
        assetsRoot,
      });
      expect(
        inventory.assets.find(({ definition }) => definition.id === skill.id),
      ).toMatchObject({ status, installedVersion, bundledVersion });
    },
  );

  it('ignores installed skill files outside the bundled materialization', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    await materializeManagedPack('research', 'user', assetsRoot, scopeRoot);
    const skill = getPackDefinition('research').assets.find(
      ({ kind }) => kind === 'skill',
    )!;
    await writeFile(join(scopeRoot, skill.destination, 'LOCAL.md'), 'notes\n');

    const inventory = await inventoryScopedPack({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(
      inventory.assets.find(({ definition }) => definition.id === skill.id),
    ).toMatchObject({ status: 'current' });
  });

  it('ignores materialized script mode normalization but detects content drift', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    await materializeManagedPack('research', 'user', assetsRoot, scopeRoot);
    const skill = getPackDefinition('research').assets.find(
      ({ kind }) => kind === 'skill',
    )!;
    const bundledScript = join(assetsRoot, skill.source!, 'scripts', 'run.sh');
    const installedScript = join(
      scopeRoot,
      skill.destination,
      'scripts',
      'run.sh',
    );
    await mkdir(dirname(bundledScript), { recursive: true });
    await mkdir(dirname(installedScript), { recursive: true });
    await writeFile(bundledScript, '#!/bin/sh\necho current\n');
    await writeFile(installedScript, '#!/bin/sh\necho current\n');
    await chmod(bundledScript, 0o644);
    await chmod(installedScript, 0o755);

    const current = await inventoryScopedPack({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(
      current.assets.find(({ definition }) => definition.id === skill.id),
    ).toMatchObject({ status: 'current' });

    await writeFile(installedScript, '#!/bin/sh\necho modified\n');
    const drifted = await inventoryScopedPack({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });
    expect(
      drifted.assets.find(({ definition }) => definition.id === skill.id),
    ).toMatchObject({ status: 'outdated' });
  });

  it('names user-scope canonical agents that reach no provider view', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    await materializeManagedPack('research', 'user', assetsRoot, scopeRoot);

    const inventory = await inventoryScopedPack({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      assetsRoot,
      managedRoleMaterialization: true,
    });

    // The pack is complete by asset presence, so the unreachable agent surface
    // is only visible because it is diagnosed explicitly.
    expect(inventory.completeness).toBe('complete');
    const diagnostic = inventory.diagnostics.find(
      ({ code }) => code === 'user-agent-unmaterialized',
    );
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.paths).toEqual([
      join(scopeRoot, '.agents', 'agents', 'skeptical-evaluator.md'),
    ]);
    expect(diagnostic!.message).toContain(
      'manifest-declared user-materializable agents',
    );
  });

  it('reports every present user agent when no native materialization extension is active', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const userRoot = await makeRoot('oat-user-');
    await materializeManagedPack('workflows', 'user', assetsRoot, userRoot);

    const inventory = await inventoryScopedPack({
      pack: 'workflows',
      scope: 'user',
      scopeRoot: userRoot,
      assetsRoot,
    });
    const diagnostic = inventory.diagnostics.find(
      ({ code }) => code === 'user-agent-unmaterialized',
    );
    expect(diagnostic!.paths).toEqual([
      join(userRoot, '.agents', 'agents', 'oat-codebase-mapper.md'),
      join(userRoot, '.agents', 'agents', 'oat-phase-implementer.md'),
      join(userRoot, '.agents', 'agents', 'oat-reviewer.md'),
    ]);
  });

  it('excludes bundled managed roles only when native materialization is active and always excludes project scope', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const userRoot = await makeRoot('oat-user-');
    const projectRoot = await makeRoot('oat-project-');
    await materializeManagedPack('workflows', 'user', assetsRoot, userRoot);
    await materializeManagedPack(
      'workflows',
      'project',
      assetsRoot,
      projectRoot,
    );

    const user = await inventoryScopedPack({
      pack: 'workflows',
      scope: 'user',
      scopeRoot: userRoot,
      assetsRoot,
      managedRoleMaterialization: true,
    });
    const diagnostic = user.diagnostics.find(
      ({ code }) => code === 'user-agent-unmaterialized',
    );
    // `oat-phase-implementer.md` and `oat-reviewer.md` are materialized from
    // the bundle at user scope, so only the third agent is unreachable.
    expect(diagnostic!.paths).toEqual([
      join(userRoot, '.agents', 'agents', 'oat-codebase-mapper.md'),
    ]);

    const project = await inventoryScopedPack({
      pack: 'workflows',
      scope: 'project',
      scopeRoot: projectRoot,
      assetsRoot,
    });
    expect(
      project.diagnostics.some(
        ({ code }) => code === 'user-agent-unmaterialized',
      ),
    ).toBe(false);
  });

  it('does not diagnose user-scope agents that are not installed', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const scopeRoot = await makeRoot('oat-user-');
    for (const asset of getPackDefinition('research').assets) {
      if (asset.source) await writeAsset(assetsRoot, asset.source, asset);
    }

    const inventory = await inventoryScopedPack({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      assetsRoot,
    });

    expect(inventory.completeness).toBe('absent');
    expect(
      inventory.diagnostics.some(
        ({ code }) => code === 'user-agent-unmaterialized',
      ),
    ).toBe(false);
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

  it.each([
    {
      label: 'manifest order',
      order: ['docs', 'workflows'] as const,
    },
    {
      label: 'reverse order',
      order: ['workflows', 'docs'] as const,
    },
  ])(
    'attributes a shared asset once with both applicable owners in $label',
    async ({ order }) => {
      const assetsRoot = await makeRoot('oat-assets-');
      const userRoot = await makeRoot('oat-user-');
      await materializeManagedPack('docs', 'user', assetsRoot, userRoot);
      await materializeManagedPack('workflows', 'user', assetsRoot, userRoot);

      const attributed = attributeSharedOwnerDiagnostics(
        await Promise.all(
          order.map((pack) => inventoryPack({ pack, assetsRoot, userRoot })),
        ),
      );
      const sharedDiagnostics = attributed.flatMap(({ scopes }) =>
        scopes.flatMap(({ diagnostics }) =>
          diagnostics.filter(({ code }) => code === 'shared-owner-observation'),
        ),
      );
      expect(sharedDiagnostics).toHaveLength(1);
      expect(sharedDiagnostics[0]?.message).toContain('docs, workflows');
      expect(
        attributed.find(({ pack }) => pack === 'docs')?.diagnostics,
      ).not.toContainEqual(sharedDiagnostics[0]);
    },
  );

  it.each([
    { removed: 'docs' as const, retained: 'workflows' as const },
    { removed: 'workflows' as const, retained: 'docs' as const },
  ])(
    'attributes a retained shared asset to $retained without inferring $removed placement',
    async ({ removed, retained }) => {
      const assetsRoot = await makeRoot('oat-assets-');
      const userRoot = await makeRoot('oat-user-');
      await materializeManagedPack(removed, 'user', assetsRoot, userRoot);
      await materializeManagedPack(retained, 'user', assetsRoot, userRoot);
      for (const asset of getPackDefinition(removed).assets) {
        if (
          asset.scopes.includes('user') &&
          asset.ownership.user === 'managed' &&
          asset.sharedOwner === undefined
        ) {
          await rm(join(userRoot, asset.destination), {
            recursive: true,
            force: true,
          });
        }
      }

      const attributed = attributeSharedOwnerDiagnostics(
        await Promise.all(
          [removed, retained].map((pack) =>
            inventoryPack({ pack, assetsRoot, userRoot }),
          ),
        ),
      );
      const removedInventory = attributed.find(({ pack }) => pack === removed);
      const retainedInventory = attributed.find(
        ({ pack }) => pack === retained,
      );
      expect(removedInventory?.placement).toBe('unavailable');
      expect(removedInventory?.diagnostics).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'shared-owner-observation' }),
        ]),
      );
      const retainedDiagnostics = retainedInventory?.scopes.flatMap(
        ({ diagnostics }) => diagnostics,
      );
      expect(retainedDiagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'shared-owner-observation',
            message: expect.stringContaining(retained),
          }),
        ]),
      );
      expect(retainedDiagnostics?.[0]?.message).not.toContain(`${removed},`);
    },
  );

  it('suppresses a shared asset observation when neither owner is installed or intended', async () => {
    const assetsRoot = await makeRoot('oat-assets-');
    const userRoot = await makeRoot('oat-user-');
    const shared = getPackDefinition('docs').assets.find(
      ({ sharedOwner }) => sharedOwner === 'resolve-tracking',
    )!;
    await writeAsset(assetsRoot, shared.source!, shared);
    await writeAsset(userRoot, shared.destination, shared);

    const attributed = attributeSharedOwnerDiagnostics(
      await Promise.all(
        (['docs', 'workflows'] as const).map((pack) =>
          inventoryPack({ pack, assetsRoot, userRoot }),
        ),
      ),
    );

    expect(
      attributed.every(({ placement }) => placement === 'unavailable'),
    ).toBe(true);
    expect(attributed.flatMap(({ diagnostics }) => diagnostics)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'shared-owner-observation' }),
      ]),
    );
  });
});
