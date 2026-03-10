import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncLocalPaths } from './sync';

describe('oat local sync', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-local-sync-'));
    tempDirs.push(dir);
    return dir;
  }

  it('should copy localPaths to worktree with direction=to', async () => {
    const source = await createDir();
    const target = await createDir();

    // Create source content
    await mkdir(join(source, '.oat', 'ideas'), { recursive: true });
    await writeFile(
      join(source, '.oat', 'ideas', 'test.md'),
      'idea content',
      'utf8',
    );

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/ideas'],
      direction: 'to',
      force: false,
    });

    expect(result.copied).toBe(1);
    expect(result.skipped).toBe(0);
    const content = await readFile(
      join(target, '.oat', 'ideas', 'test.md'),
      'utf8',
    );
    expect(content).toBe('idea content');
  });

  it('should copy localPaths from worktree with direction=from', async () => {
    const source = await createDir();
    const target = await createDir();

    // Create content in target (the worktree)
    await mkdir(join(target, '.oat', 'ideas'), { recursive: true });
    await writeFile(
      join(target, '.oat', 'ideas', 'test.md'),
      'worktree content',
      'utf8',
    );

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/ideas'],
      direction: 'from',
      force: false,
    });

    expect(result.copied).toBe(1);
    const content = await readFile(
      join(source, '.oat', 'ideas', 'test.md'),
      'utf8',
    );
    expect(content).toBe('worktree content');
  });

  it('should skip existing paths without force', async () => {
    const source = await createDir();
    const target = await createDir();

    await mkdir(join(source, '.oat', 'ideas'), { recursive: true });
    await writeFile(join(source, '.oat', 'ideas', 'test.md'), 'source', 'utf8');
    // Pre-create in target
    await mkdir(join(target, '.oat', 'ideas'), { recursive: true });
    await writeFile(
      join(target, '.oat', 'ideas', 'test.md'),
      'existing',
      'utf8',
    );

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/ideas'],
      direction: 'to',
      force: false,
    });

    expect(result.skipped).toBe(1);
    expect(result.copied).toBe(0);
    // Original content preserved
    const content = await readFile(
      join(target, '.oat', 'ideas', 'test.md'),
      'utf8',
    );
    expect(content).toBe('existing');
  });

  it('should overwrite existing paths with force', async () => {
    const source = await createDir();
    const target = await createDir();

    await mkdir(join(source, '.oat', 'ideas'), { recursive: true });
    await writeFile(
      join(source, '.oat', 'ideas', 'test.md'),
      'new content',
      'utf8',
    );
    await mkdir(join(target, '.oat', 'ideas'), { recursive: true });
    await writeFile(
      join(target, '.oat', 'ideas', 'test.md'),
      'old content',
      'utf8',
    );

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/ideas'],
      direction: 'to',
      force: true,
    });

    expect(result.copied).toBe(1);
    const content = await readFile(
      join(target, '.oat', 'ideas', 'test.md'),
      'utf8',
    );
    expect(content).toBe('new content');
  });

  it('should skip paths that do not exist in source', async () => {
    const source = await createDir();
    const target = await createDir();

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/nonexistent'],
      direction: 'to',
      force: false,
    });

    expect(result.missing).toBe(1);
    expect(result.copied).toBe(0);
  });

  it('should handle multiple paths', async () => {
    const source = await createDir();
    const target = await createDir();

    await mkdir(join(source, '.oat', 'ideas'), { recursive: true });
    await writeFile(join(source, '.oat', 'ideas', 'a.md'), 'a', 'utf8');
    await mkdir(join(source, '.oat', 'projects', 'local'), { recursive: true });
    await writeFile(
      join(source, '.oat', 'projects', 'local', 'b.md'),
      'b',
      'utf8',
    );

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/ideas', '.oat/projects/local'],
      direction: 'to',
      force: false,
    });

    expect(result.copied).toBe(2);
    expect(result.entries).toHaveLength(2);
  });

  it('should expand glob patterns to matching directories', async () => {
    const source = await createDir();
    const target = await createDir();

    // Create multiple project review dirs
    await mkdir(
      join(source, '.oat', 'projects', 'shared', 'alpha', 'reviews'),
      {
        recursive: true,
      },
    );
    await writeFile(
      join(source, '.oat', 'projects', 'shared', 'alpha', 'reviews', 'r.md'),
      'alpha review',
      'utf8',
    );
    await mkdir(join(source, '.oat', 'projects', 'shared', 'beta', 'reviews'), {
      recursive: true,
    });
    await writeFile(
      join(source, '.oat', 'projects', 'shared', 'beta', 'reviews', 'r.md'),
      'beta review',
      'utf8',
    );

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/projects/**/reviews'],
      direction: 'to',
      force: false,
    });

    expect(result.copied).toBe(2);
    const alphaContent = await readFile(
      join(target, '.oat', 'projects', 'shared', 'alpha', 'reviews', 'r.md'),
      'utf8',
    );
    expect(alphaContent).toBe('alpha review');
    const betaContent = await readFile(
      join(target, '.oat', 'projects', 'shared', 'beta', 'reviews', 'r.md'),
      'utf8',
    );
    expect(betaContent).toBe('beta review');
  });

  it('should report missing when glob matches nothing', async () => {
    const source = await createDir();
    const target = await createDir();

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: ['.oat/projects/**/nonexistent'],
      direction: 'to',
      force: false,
    });

    expect(result.missing).toBe(1);
    expect(result.copied).toBe(0);
  });
});
