import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readOatConfig } from '@config/oat-config';
import { afterEach, describe, expect, it } from 'vitest';

import { addLocalPaths, removeLocalPaths } from './manage';

describe('oat local add/remove', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(localPaths?: string[]): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-local-manage-'));
    tempDirs.push(root);
    await mkdir(join(root, '.oat'), { recursive: true });
    const config: Record<string, unknown> = { version: 1 };
    if (localPaths) {
      config.localPaths = localPaths;
    }
    await writeFile(
      join(root, '.oat', 'config.json'),
      JSON.stringify(config, null, 2),
      'utf8',
    );
    return root;
  }

  it('should add paths to localPaths in config', async () => {
    const repoRoot = await createRepoRoot();

    const result = await addLocalPaths(repoRoot, [
      '.oat/ideas',
      '.oat/projects/local',
    ]);

    expect(result.added).toEqual(['.oat/ideas', '.oat/projects/local']);
    const config = await readOatConfig(repoRoot);
    expect(config.localPaths).toEqual(['.oat/ideas', '.oat/projects/local']);
  });

  it('should deduplicate when adding existing paths', async () => {
    const repoRoot = await createRepoRoot(['.oat/ideas']);

    const result = await addLocalPaths(repoRoot, [
      '.oat/ideas',
      '.oat/projects/local',
    ]);

    expect(result.added).toEqual(['.oat/projects/local']);
    expect(result.alreadyPresent).toEqual(['.oat/ideas']);
    const config = await readOatConfig(repoRoot);
    expect(config.localPaths).toEqual(['.oat/ideas', '.oat/projects/local']);
  });

  it('should remove paths from localPaths in config', async () => {
    const repoRoot = await createRepoRoot([
      '.oat/ideas',
      '.oat/projects/local',
    ]);

    const result = await removeLocalPaths(repoRoot, ['.oat/ideas']);

    expect(result.removed).toEqual(['.oat/ideas']);
    const config = await readOatConfig(repoRoot);
    expect(config.localPaths).toEqual(['.oat/projects/local']);
  });

  it('should report not-found when removing absent paths', async () => {
    const repoRoot = await createRepoRoot(['.oat/ideas']);

    const result = await removeLocalPaths(repoRoot, ['.oat/nonexistent']);

    expect(result.notFound).toEqual(['.oat/nonexistent']);
    expect(result.removed).toEqual([]);
    const config = await readOatConfig(repoRoot);
    expect(config.localPaths).toEqual(['.oat/ideas']);
  });

  it('should remove localPaths key when list becomes empty', async () => {
    const repoRoot = await createRepoRoot(['.oat/ideas']);

    await removeLocalPaths(repoRoot, ['.oat/ideas']);

    const config = await readOatConfig(repoRoot);
    expect(config.localPaths).toBeUndefined();
  });

  it('should reject absolute paths', async () => {
    const repoRoot = await createRepoRoot();

    const result = await addLocalPaths(repoRoot, ['/tmp/foo', '.oat/ideas']);

    expect(result.rejected).toEqual([
      { path: '/tmp/foo', reason: 'absolute path' },
    ]);
    expect(result.added).toEqual(['.oat/ideas']);
  });

  it('should reject parent-relative paths', async () => {
    const repoRoot = await createRepoRoot();

    const result = await addLocalPaths(repoRoot, [
      '../other-repo',
      '.oat/../..',
      '.oat/ideas',
    ]);

    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0]).toEqual({
      path: '../other-repo',
      reason: 'parent-relative path',
    });
    expect(result.rejected[1]).toEqual({
      path: '.oat/../..',
      reason: 'parent-relative path',
    });
    expect(result.added).toEqual(['.oat/ideas']);
  });

  it('should reject empty paths', async () => {
    const repoRoot = await createRepoRoot();

    const result = await addLocalPaths(repoRoot, ['', '  ', '.oat/ideas']);

    expect(result.rejected).toEqual([
      { path: '', reason: 'empty path' },
      { path: '  ', reason: 'empty path' },
    ]);
    expect(result.added).toEqual(['.oat/ideas']);
  });
});
