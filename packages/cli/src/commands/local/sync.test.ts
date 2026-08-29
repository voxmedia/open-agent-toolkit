import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fileExists } from '@fs/io';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

  it('skips a local path rooted at a linked worktree git file', async () => {
    const source = await createDir();
    const target = await createDir();
    const localPath = '.oat/projects/synced/example';

    await mkdir(join(source, localPath), { recursive: true });
    await writeFile(
      join(source, localPath, '.git'),
      'gitdir: /tmp/example.git/worktrees/example\n',
      'utf8',
    );
    await writeFile(join(source, localPath, 'state.md'), 'state', 'utf8');

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: [localPath],
      direction: 'to',
      force: false,
    });

    expect(result.entries).toEqual([
      { path: localPath, status: 'skipped', reason: 'nested-worktree' },
    ]);
    expect(await fileExists(join(target, localPath))).toBe(false);
  });

  it('skips a local path rooted at a nested repository git directory', async () => {
    const source = await createDir();
    const target = await createDir();
    const localPath = '.oat/projects/synced/example';

    await mkdir(join(source, localPath, '.git'), { recursive: true });
    await writeFile(join(source, localPath, 'state.md'), 'state', 'utf8');

    const result = await syncLocalPaths({
      sourceRoot: source,
      targetRoot: target,
      localPaths: [localPath],
      direction: 'to',
      force: false,
    });

    expect(result.entries).toEqual([
      { path: localPath, status: 'skipped', reason: 'nested-worktree' },
    ]);
    expect(await fileExists(join(target, localPath))).toBe(false);
  });

  it.each(['file', 'directory'] as const)(
    'preserves a destination rooted at a nested-worktree git %s under force',
    async (markerKind) => {
      const source = await createDir();
      const target = await createDir();
      const localPath = '.oat/projects/synced/example';
      const sourcePath = join(source, localPath);
      const destinationPath = join(target, localPath);

      await mkdir(sourcePath, { recursive: true });
      await writeFile(join(sourcePath, 'state.md'), 'replacement', 'utf8');
      await mkdir(destinationPath, { recursive: true });
      await writeFile(join(destinationPath, 'state.md'), 'preserve', 'utf8');
      if (markerKind === 'file') {
        await writeFile(
          join(destinationPath, '.git'),
          'gitdir: /tmp/example.git/worktrees/example\n',
          'utf8',
        );
      } else {
        await mkdir(join(destinationPath, '.git'), { recursive: true });
        await writeFile(
          join(destinationPath, '.git', 'config'),
          '[core]\n',
          'utf8',
        );
      }

      const result = await syncLocalPaths({
        sourceRoot: source,
        targetRoot: target,
        localPaths: [localPath],
        direction: 'to',
        force: true,
      });

      expect(result.entries).toEqual([
        { path: localPath, status: 'skipped', reason: 'nested-worktree' },
      ]);
      await expect(
        readFile(join(destinationPath, 'state.md'), 'utf8'),
      ).resolves.toBe('preserve');
      await expect(
        readFile(
          markerKind === 'file'
            ? join(destinationPath, '.git')
            : join(destinationPath, '.git', 'config'),
          'utf8',
        ),
      ).resolves.toContain(markerKind === 'file' ? 'gitdir:' : '[core]');
    },
  );

  it.each([
    { direction: 'to' as const, destinationExists: false, force: false },
    { direction: 'to' as const, destinationExists: true, force: true },
    { direction: 'from' as const, destinationExists: false, force: false },
    { direction: 'from' as const, destinationExists: true, force: true },
  ])(
    'refuses an ancestor entry overlapping a nested worktree direction=$direction destinationExists=$destinationExists force=$force',
    async ({ direction, destinationExists, force }) => {
      const sourceRoot = await createDir();
      const targetRoot = await createDir();
      const fromRoot = direction === 'to' ? sourceRoot : targetRoot;
      const toRoot = direction === 'to' ? targetRoot : sourceRoot;
      const localPath = '.oat/projects';
      const sourceEntry = join(fromRoot, localPath);
      const destinationEntry = join(toRoot, localPath);
      const protectedSide = destinationExists ? destinationEntry : sourceEntry;
      const nestedCheckout = join(protectedSide, 'synced', 'protected');

      await mkdir(sourceEntry, { recursive: true });
      await writeFile(join(sourceEntry, 'source.md'), 'source\n', 'utf8');
      if (destinationExists) {
        await mkdir(destinationEntry, { recursive: true });
        await writeFile(
          join(destinationEntry, 'existing.md'),
          'existing\n',
          'utf8',
        );
      }
      await mkdir(nestedCheckout, { recursive: true });
      await writeFile(
        join(nestedCheckout, '.git'),
        'gitdir: /tmp/repo.git/worktrees/protected\n',
        'utf8',
      );
      await writeFile(
        join(nestedCheckout, 'unsaved.txt'),
        'do not delete\n',
        'utf8',
      );

      const result = await syncLocalPaths({
        sourceRoot,
        targetRoot,
        localPaths: [localPath],
        direction,
        force,
      });

      expect(result.entries).toEqual([
        { path: localPath, status: 'skipped', reason: 'nested-worktree' },
      ]);
      await expect(
        readFile(join(nestedCheckout, 'unsaved.txt'), 'utf8'),
      ).resolves.toBe('do not delete\n');
      if (destinationExists) {
        await expect(
          readFile(join(destinationEntry, 'existing.md'), 'utf8'),
        ).resolves.toBe('existing\n');
      } else {
        expect(await fileExists(destinationEntry)).toBe(false);
      }
    },
  );

  it.each([
    { direction: 'to' as const, damagedMarker: 'missing' as const },
    { direction: 'from' as const, damagedMarker: 'renamed' as const },
  ])(
    'protects a registered nested worktree with a $damagedMarker marker during direction=$direction',
    async ({ direction, damagedMarker }) => {
      const repoRoot = await createDir();
      const peerRoot = await createDir();
      execFileSync('git', ['init', '-q'], { cwd: repoRoot });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], {
        cwd: repoRoot,
      });
      execFileSync('git', ['config', 'user.name', 'Test User'], {
        cwd: repoRoot,
      });
      await writeFile(join(repoRoot, 'seed.txt'), 'seed\n');
      execFileSync('git', ['add', 'seed.txt'], { cwd: repoRoot });
      execFileSync('git', ['commit', '-q', '-m', 'seed'], { cwd: repoRoot });
      const localPath = '.local-state';
      const nestedCheckout = join(repoRoot, localPath, 'nested-worktree');
      execFileSync(
        'git',
        ['worktree', 'add', '-q', '-b', 'nested-worktree', nestedCheckout],
        { cwd: repoRoot },
      );
      await writeFile(join(nestedCheckout, 'unsaved.txt'), 'do not delete\n');
      const marker = join(nestedCheckout, '.git');
      if (damagedMarker === 'missing') {
        await rm(marker);
      } else {
        await rename(marker, join(nestedCheckout, '.git-corrupt'));
      }
      const registryBefore = execFileSync(
        'git',
        ['worktree', 'list', '--porcelain'],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      if (direction === 'from') {
        await mkdir(join(peerRoot, localPath), { recursive: true });
        await writeFile(join(peerRoot, localPath, 'replacement.txt'), 'new\n');
      }

      const result = await syncLocalPaths({
        repoRoot,
        sourceRoot: repoRoot,
        targetRoot: peerRoot,
        localPaths: [localPath],
        direction,
        force: true,
      });

      expect(result.entries).toEqual([
        { path: localPath, status: 'skipped', reason: 'nested-worktree' },
      ]);
      await expect(
        readFile(join(nestedCheckout, 'unsaved.txt'), 'utf8'),
      ).resolves.toBe('do not delete\n');
      expect(
        execFileSync('git', ['worktree', 'list', '--porcelain'], {
          cwd: repoRoot,
          encoding: 'utf8',
        }),
      ).toBe(registryBefore);
    },
  );

  it('copies a configured local path between linked worktrees nested under the main checkout', async () => {
    const repoRoot = await createDir();
    execFileSync('git', ['init', '-q'], { cwd: repoRoot });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: repoRoot,
    });
    execFileSync('git', ['config', 'user.name', 'Test User'], {
      cwd: repoRoot,
    });
    await writeFile(join(repoRoot, 'seed.txt'), 'seed\n');
    execFileSync('git', ['add', 'seed.txt'], { cwd: repoRoot });
    execFileSync('git', ['commit', '-q', '-m', 'seed'], { cwd: repoRoot });

    const sourceRoot = join(repoRoot, '.worktrees', 'source');
    const targetRoot = join(repoRoot, '.worktrees', 'target');
    execFileSync(
      'git',
      ['worktree', 'add', '-q', '-b', 'local-sync-source', sourceRoot],
      { cwd: repoRoot },
    );
    execFileSync(
      'git',
      ['worktree', 'add', '-q', '-b', 'local-sync-target', targetRoot],
      { cwd: repoRoot },
    );
    const localPath = '.local-state';
    await mkdir(join(sourceRoot, localPath), { recursive: true });
    await writeFile(
      join(sourceRoot, localPath, 'settings.json'),
      '{"source":true}\n',
    );

    const result = await syncLocalPaths({
      repoRoot: sourceRoot,
      sourceRoot,
      targetRoot,
      localPaths: [localPath],
      direction: 'to',
      force: false,
    });

    expect(result.entries).toEqual([{ path: localPath, status: 'copied' }]);
    await expect(
      readFile(join(targetRoot, localPath, 'settings.json'), 'utf8'),
    ).resolves.toBe('{"source":true}\n');
  });

  it.each([
    {
      label: 'query failure',
      result: { code: 128, stdout: '', stderr: 'registry unavailable' },
    },
    {
      label: 'malformed output',
      result: { code: 0, stdout: 'HEAD deadbeef', stderr: '' },
    },
  ])('fails closed before copying on $label', async ({ result }) => {
    const sourceRoot = await createDir();
    const targetRoot = await createDir();
    await mkdir(join(sourceRoot, '.local-state'), { recursive: true });
    await writeFile(join(sourceRoot, '.local-state', 'sentinel'), 'preserve\n');

    await expect(
      syncLocalPaths({
        repoRoot: sourceRoot,
        sourceRoot,
        targetRoot,
        localPaths: ['.local-state'],
        direction: 'to',
        force: true,
        gitRunner: { run: vi.fn(async () => result) },
      }),
    ).rejects.toThrow();
    expect(await fileExists(join(targetRoot, '.local-state'))).toBe(false);
    await expect(
      readFile(join(sourceRoot, '.local-state', 'sentinel'), 'utf8'),
    ).resolves.toBe('preserve\n');
  });
});
