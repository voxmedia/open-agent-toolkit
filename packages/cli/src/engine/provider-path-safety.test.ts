import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  assertSafeProviderCollectionPath,
  assertSafeProviderMutationPath,
} from './provider-path-safety';

describe('assertSafeProviderMutationPath', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  async function createRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-provider-path-safety-'));
    tempDirs.push(root);
    return root;
  }

  it('rejects a provider destination that lexically escapes the scope root', async () => {
    const root = await createRoot();

    await expect(
      assertSafeProviderMutationPath(root, join(dirname(root), 'outside')),
    ).rejects.toThrow(/outside the sync scope/i);
  });

  it('rejects a provider destination equal to the scope root', async () => {
    const root = await createRoot();

    await expect(assertSafeProviderMutationPath(root, root)).rejects.toThrow(
      /must not equal the sync scope root/i,
    );
  });

  it('rejects a symlinked provider parent without following it', async () => {
    const root = await createRoot();
    const external = await createRoot();
    await mkdir(join(root, '.claude'), { recursive: true });
    await symlink(external, join(root, '.claude', 'skills'), 'dir');

    await expect(
      assertSafeProviderMutationPath(
        root,
        join(root, '.claude', 'skills', 'skill-one'),
      ),
    ).rejects.toThrow(/symbolic link/i);
  });

  it('rejects a non-directory provider parent', async () => {
    const root = await createRoot();
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude', 'skills'), 'not a directory', 'utf8');

    await expect(
      assertSafeProviderMutationPath(
        root,
        join(root, '.claude', 'skills', 'skill-one'),
      ),
    ).rejects.toThrow(/not a directory/i);
  });

  it('accepts partially missing provider ancestry', async () => {
    const root = await createRoot();
    await mkdir(join(root, '.claude'), { recursive: true });

    await expect(
      assertSafeProviderMutationPath(
        root,
        join(root, '.claude', 'skills', 'nested', 'skill-one'),
      ),
    ).resolves.toBeUndefined();
  });

  it('accepts ordinary provider directories', async () => {
    const root = await createRoot();
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });

    await expect(
      assertSafeProviderMutationPath(
        root,
        join(root, '.claude', 'skills', 'skill-one'),
      ),
    ).resolves.toBeUndefined();
  });

  it('allows an existing symlink at the final managed destination', async () => {
    const root = await createRoot();
    const canonical = join(root, '.agents', 'skills', 'skill-one');
    const provider = join(root, '.claude', 'skills', 'skill-one');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await symlink(canonical, provider, 'dir');

    await expect(
      assertSafeProviderMutationPath(root, provider),
    ).resolves.toBeUndefined();
  });

  it('allows a final collection symlink but rejects nested collection paths', async () => {
    const root = await createRoot();
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await symlink(canonical, provider, 'dir');

    await expect(
      assertSafeProviderCollectionPath(root, canonical, provider),
    ).resolves.toBeUndefined();
    await expect(
      assertSafeProviderCollectionPath(
        root,
        canonical,
        join(canonical, 'provider'),
      ),
    ).rejects.toThrow(/must not be nested/i);
  });
});
