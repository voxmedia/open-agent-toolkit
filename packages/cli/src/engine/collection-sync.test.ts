import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { proveCollectionIdentity } from './collection-sync';

describe('proveCollectionIdentity', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots.length = 0;
  });

  async function fixture(): Promise<{
    root: string;
    canonicalDir: string;
    providerDir: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-collection-proof-'));
    roots.push(root);
    const canonicalDir = join(root, '.agents', 'skills');
    const providerDir = join(root, '.claude', 'skills');
    await mkdir(join(canonicalDir, 'example'), { recursive: true });
    await writeFile(
      join(canonicalDir, 'example', 'SKILL.md'),
      '# Example\n',
      'utf8',
    );
    await mkdir(dirname(providerDir), { recursive: true });
    return { root, canonicalDir, providerDir };
  }

  it('proves an absent provider collection without mutating it', async () => {
    const paths = await fixture();

    const proof = await proveCollectionIdentity(paths);

    expect(proof).toMatchObject({ status: 'absent' });
  });

  it.each([
    { kind: 'relative', target: join('..', '.agents', 'skills') },
    { kind: 'absolute', target: 'absolute' },
  ] as const)(
    'proves an exact $kind collection alias',
    async ({ kind, target }) => {
      const paths = await fixture();
      await symlink(
        kind === 'absolute' ? paths.canonicalDir : target,
        paths.providerDir,
        'dir',
      );

      const proof = await proveCollectionIdentity(paths);

      expect(proof).toMatchObject({
        status: 'exact-link',
        linkTextKind: kind,
        resolvedTarget: paths.canonicalDir,
      });
    },
  );

  it('falls back for a real provider directory without changing it', async () => {
    const paths = await fixture();
    await mkdir(join(paths.providerDir, 'foreign'), { recursive: true });

    const proof = await proveCollectionIdentity(paths);

    expect(proof).toMatchObject({
      status: 'ineligible',
      reason: 'real-directory',
    });
  });

  it.each([
    {
      name: 'broken',
      setup: async (providerDir: string) =>
        symlink('missing', providerDir, 'dir'),
    },
    {
      name: 'cyclic',
      setup: async (providerDir: string) => {
        await symlink('skills', providerDir, 'dir');
      },
    },
  ])('fails closed for a $name alias', async ({ setup }) => {
    const paths = await fixture();
    await setup(paths.providerDir);

    const proof = await proveCollectionIdentity(paths);

    expect(proof).toMatchObject({
      status: 'ineligible',
      reason: 'broken-link',
    });
  });

  it('fails closed for a foreign alias', async () => {
    const paths = await fixture();
    const foreign = join(paths.root, 'foreign');
    await mkdir(foreign);
    await symlink(foreign, paths.providerDir, 'dir');

    const proof = await proveCollectionIdentity(paths);

    expect(proof).toMatchObject({
      status: 'ineligible',
      reason: 'foreign-target',
    });
  });

  it('fails closed when collection paths are nested', async () => {
    const paths = await fixture();

    const proof = await proveCollectionIdentity({
      root: paths.root,
      canonicalDir: paths.canonicalDir,
      providerDir: join(paths.canonicalDir, 'provider'),
    });

    expect(proof).toMatchObject({
      status: 'ineligible',
      reason: 'unsafe-ancestry',
    });
  });

  it('fails closed for symlinked provider ancestry', async () => {
    const paths = await fixture();
    const external = join(paths.root, 'external');
    await mkdir(external);
    await rm(dirname(paths.providerDir), { recursive: true });
    await symlink(external, dirname(paths.providerDir), 'dir');

    const proof = await proveCollectionIdentity(paths);

    expect(proof).toMatchObject({
      status: 'ineligible',
      reason: 'unsafe-ancestry',
    });
  });

  it('fails closed when canonical identity is unavailable', async () => {
    const paths = await fixture();
    await rm(paths.canonicalDir, { recursive: true });

    const proof = await proveCollectionIdentity(paths);

    expect(proof).toMatchObject({
      status: 'ineligible',
      reason: 'identity-unavailable',
    });
  });
});
