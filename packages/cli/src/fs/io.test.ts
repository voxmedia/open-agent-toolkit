import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const collectionCreationRace = vi.hoisted(() => ({
  beforePathBasedCreation: undefined as undefined | (() => Promise<void>),
  pathBasedCreationCalls: 0,
}));
const collectionRemovalRace = vi.hoisted(() => ({
  afterIdentityRead: undefined as undefined | (() => Promise<void>),
  pathBasedRemovalCalls: 0,
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    symlink: async (...args: Parameters<typeof actual.symlink>) => {
      const [, linkPath] = args;
      if (
        collectionCreationRace.beforePathBasedCreation &&
        typeof linkPath === 'string' &&
        linkPath.endsWith('/.claude/skills')
      ) {
        collectionCreationRace.pathBasedCreationCalls += 1;
        await collectionCreationRace.beforePathBasedCreation();
      }
      return actual.symlink(...args);
    },
    readlink: async (...args: Parameters<typeof actual.readlink>) => {
      const linkText = await actual.readlink(...args);
      const [linkPath] = args;
      if (
        collectionRemovalRace.afterIdentityRead &&
        typeof linkPath === 'string' &&
        linkPath.endsWith('/.claude/skills')
      ) {
        const afterIdentityRead = collectionRemovalRace.afterIdentityRead;
        collectionRemovalRace.afterIdentityRead = undefined;
        await afterIdentityRead();
      }
      return linkText;
    },
    unlink: async (...args: Parameters<typeof actual.unlink>) => {
      const [linkPath] = args;
      if (
        typeof linkPath === 'string' &&
        linkPath.endsWith('/.claude/skills')
      ) {
        collectionRemovalRace.pathBasedRemovalCalls += 1;
      }
      return actual.unlink(...args);
    },
  };
});

import {
  atomicWriteJson,
  copyDirectory,
  copyDirectoryNoClobber,
  createCollectionSymlinkNoClobber,
  createSymlink,
  dirExists,
  ensureDir,
  fileExists,
  removeCollectionSymlinkIfUnchanged,
} from './io';

describe('fs/io', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    collectionCreationRace.beforePathBasedCreation = undefined;
    collectionCreationRace.pathBasedCreationCalls = 0;
    collectionRemovalRace.afterIdentityRead = undefined;
    collectionRemovalRace.pathBasedRemovalCalls = 0;
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('createSymlink creates a directory symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const linkDir = join(root, 'target', 'link');
    await mkdir(srcDir, { recursive: true });

    const strategy = await createSymlink(srcDir, linkDir);

    const linkStat = await lstat(linkDir);
    expect(linkStat.isSymbolicLink()).toBe(true);
    expect(strategy).toBe('symlink');
  });

  it('fails closed when no securely guarded collection-link primitive is available', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });

    const parent = await lstat(root);
    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(parent.dev),
          inode: String(parent.ino),
        },
      }),
    ).rejects.toMatchObject({ code: 'E_COLLECTION_LINK_UNSAFE' });

    await expect(lstat(provider)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(lstat(dirname(provider))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('never reaches path-based final creation when ancestry could swap after validation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    const outside = await mkdtemp(join(tmpdir(), 'oat-io-outside-'));
    tempDirs.push(root, outside);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    const parent = await lstat(dirname(provider));
    collectionCreationRace.beforePathBasedCreation = async () => {
      await rm(dirname(provider), { recursive: true, force: true });
      await symlink(outside, dirname(provider), 'dir');
    };

    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(parent.dev),
          inode: String(parent.ino),
        },
      }),
    ).rejects.toMatchObject({ code: 'E_COLLECTION_LINK_UNSAFE' });

    expect(collectionCreationRace.pathBasedCreationCalls).toBe(0);
    await expect(lstat(join(outside, 'skills'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves an EEXIST collection destination without fallback or removal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await writeFile(provider, 'foreign', 'utf8');
    const parent = await lstat(dirname(provider));

    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(parent.dev),
          inode: String(parent.ino),
        },
      }),
    ).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(readFile(provider, 'utf8')).resolves.toBe('foreign');
  });

  it('refuses stale collection ancestry without creating through a replacement link', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    const outside = await mkdtemp(join(tmpdir(), 'oat-io-outside-'));
    tempDirs.push(root, outside);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    const expectedParent = await lstat(dirname(provider));
    await rm(dirname(provider), { recursive: true, force: true });
    await symlink(outside, dirname(provider), 'dir');

    await expect(
      createCollectionSymlinkNoClobber(canonical, provider, {
        scopeRoot: root,
        expectedParent: {
          device: String(expectedParent.dev),
          inode: String(expectedParent.ino),
        },
      }),
    ).rejects.toThrow(/ancestry/i);
    await expect(lstat(join(outside, 'skills'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves an unchanged collection link when guarded removal is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await symlink(canonical, provider, 'dir');
    const createdStat = await lstat(provider);
    const created = {
      linkText: await readlink(provider),
      device: String(createdStat.dev),
      inode: String(createdStat.ino),
    };

    await expect(
      removeCollectionSymlinkIfUnchanged(provider, created),
    ).resolves.toBe(false);
    expect((await lstat(provider)).isSymbolicLink()).toBe(true);
    expect(collectionRemovalRace.pathBasedRemovalCalls).toBe(0);
  });

  it('preserves a replacement swapped after the final identity read', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const canonical = join(root, '.agents', 'skills');
    const provider = join(root, '.claude', 'skills');
    await mkdir(canonical, { recursive: true });
    await mkdir(dirname(provider), { recursive: true });
    await symlink(canonical, provider, 'dir');
    const createdStat = await lstat(provider);
    const created = {
      linkText: await readlink(provider),
      device: String(createdStat.dev),
      inode: String(createdStat.ino),
    };
    collectionRemovalRace.afterIdentityRead = async () => {
      await rm(provider);
      await writeFile(provider, 'user replacement', 'utf8');
    };

    await expect(
      removeCollectionSymlinkIfUnchanged(provider, created),
    ).resolves.toBe(false);

    expect(collectionRemovalRace.pathBasedRemovalCalls).toBe(0);
    await expect(readFile(provider, 'utf8')).resolves.toBe('user replacement');
  });

  it('createSymlink uses relative target when given absolute paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'canonical', 'agents');
    const linkDir = join(root, 'provider', 'agents', 'link');
    await mkdir(srcDir, { recursive: true });

    await createSymlink(srcDir, linkDir);

    const linkTarget = await readlink(linkDir);
    expect(isAbsolute(linkTarget)).toBe(false);
    // Verify the symlink still resolves correctly
    const linkStat = await lstat(linkDir);
    expect(linkStat.isSymbolicLink()).toBe(true);
  });

  it('createSymlink creates a file symlink with relative target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcFile = join(root, 'canonical', 'agent.md');
    const linkFile = join(root, 'provider', 'agent.md');
    await mkdir(join(root, 'canonical'), { recursive: true });
    await writeFile(srcFile, 'content', 'utf8');

    await createSymlink(srcFile, linkFile, undefined, true);

    const linkTarget = await readlink(linkFile);
    expect(isAbsolute(linkTarget)).toBe(false);
    // Verify the symlink resolves and content is readable
    expect(await readFile(linkFile, 'utf8')).toBe('content');
  });

  it('createSymlink with copy fallback copies directory when symlink fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const linkDir = join(root, 'link');

    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, 'a.txt'), 'copied', 'utf8');
    await writeFile(linkDir, 'existing-file', 'utf8');

    const onFallback = vi.fn();
    const strategy = await createSymlink(srcDir, linkDir, onFallback);

    const entries = await readdir(linkDir);
    expect(entries).toContain('a.txt');
    expect(await readFile(join(linkDir, 'a.txt'), 'utf8')).toBe('copied');
    expect(strategy).toBe('copy');
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('copyDirectory recursively copies all files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const destDir = join(root, 'dest');
    await mkdir(join(srcDir, 'nested'), { recursive: true });
    await writeFile(join(srcDir, 'root.txt'), 'root', 'utf8');
    await writeFile(join(srcDir, 'nested', 'child.txt'), 'child', 'utf8');

    await copyDirectory(srcDir, destDir);

    expect(await readFile(join(destDir, 'root.txt'), 'utf8')).toBe('root');
    expect(await readFile(join(destDir, 'nested', 'child.txt'), 'utf8')).toBe(
      'child',
    );
  });

  it('copyDirectory filters entries by source-relative path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const destDir = join(root, 'dest');
    await mkdir(join(srcDir, 'reviews'), { recursive: true });
    await writeFile(join(srcDir, '.git'), 'gitdir: elsewhere\n', 'utf8');
    await writeFile(join(srcDir, 'state.md'), 'state', 'utf8');
    await writeFile(join(srcDir, 'reviews', 'review.md'), 'review', 'utf8');

    await copyDirectory(
      srcDir,
      destDir,
      (_source, relativePath) =>
        relativePath !== '.git' && relativePath !== 'reviews',
    );

    expect(await readFile(join(destDir, 'state.md'), 'utf8')).toBe('state');
    await expect(readFile(join(destDir, '.git'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(join(destDir, 'reviews', 'review.md'), 'utf8'),
    ).rejects.toThrow();
  });

  it('copyDirectory preserves executable mode on nested files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const srcDir = join(root, 'src');
    const destDir = join(root, 'dest');
    await mkdir(join(srcDir, 'scripts'), { recursive: true });
    await writeFile(join(srcDir, 'plain.md'), 'plain', 'utf8');
    await writeFile(
      join(srcDir, 'scripts', 'run.sh'),
      '#!/bin/sh\necho run\n',
      'utf8',
    );
    await chmod(join(srcDir, 'scripts', 'run.sh'), 0o755);

    await copyDirectory(srcDir, destDir);

    const scriptStat = await stat(join(destDir, 'scripts', 'run.sh'));
    expect(scriptStat.mode & 0o111).not.toBe(0);
  });

  it.each(['file', 'directory'] as const)(
    'copyDirectoryNoClobber preserves a colliding nested %s created after the destination root',
    async (collisionKind) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
      tempDirs.push(root);
      const srcDir = join(root, 'src');
      const destDir = join(root, 'dest');
      const collisionName =
        collisionKind === 'file' ? 'SKILL.md' : 'references';
      const destinationCollision = join(destDir, collisionName);
      const userBytes = `user-owned-${collisionKind}`;
      await mkdir(join(srcDir, 'references'), { recursive: true });
      await writeFile(join(srcDir, 'SKILL.md'), 'canonical skill', 'utf8');
      await writeFile(
        join(srcDir, 'references', 'guide.md'),
        'canonical guide',
        'utf8',
      );

      let hookCalls = 0;
      await expect(
        copyDirectoryNoClobber(srcDir, destDir, undefined, {
          afterDestinationRootCreated: async (createdRoot) => {
            hookCalls += 1;
            expect(createdRoot).toBe(destDir);
            if (collisionKind === 'file') {
              await writeFile(destinationCollision, userBytes, 'utf8');
            } else {
              await mkdir(destinationCollision);
              await writeFile(
                join(destinationCollision, 'user-owned.md'),
                userBytes,
                'utf8',
              );
            }
          },
        }),
      ).rejects.toMatchObject({ code: 'EEXIST' });

      expect(hookCalls).toBe(1);
      if (collisionKind === 'file') {
        await expect(readFile(destinationCollision, 'utf8')).resolves.toBe(
          userBytes,
        );
      } else {
        await expect(
          readFile(join(destinationCollision, 'user-owned.md'), 'utf8'),
        ).resolves.toBe(userBytes);
        await expect(
          readFile(join(destinationCollision, 'guide.md'), 'utf8'),
        ).rejects.toMatchObject({ code: 'ENOENT' });
      }
    },
  );

  it('atomicWriteJson writes to temp then renames', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const output = join(root, 'data', 'output.json');

    await atomicWriteJson(output, { ok: true, count: 1 });

    const parsed = JSON.parse(await readFile(output, 'utf8'));
    expect(parsed).toEqual({ ok: true, count: 1 });
    await expect(readFile(`${output}.tmp`, 'utf8')).rejects.toThrow();
  });

  it('ensureDir creates directory recursively', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const nested = join(root, 'a', 'b', 'c');

    await ensureDir(nested);

    const dirStat = await lstat(nested);
    expect(dirStat.isDirectory()).toBe(true);
  });

  it('fileExists returns true for existing files and false when missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const file = join(root, 'exists.txt');
    const dir = join(root, 'dir');
    await writeFile(file, 'present', 'utf8');
    await mkdir(dir, { recursive: true });

    await expect(fileExists(file)).resolves.toBe(true);
    await expect(fileExists(join(root, 'missing.txt'))).resolves.toBe(false);
    await expect(fileExists(dir)).resolves.toBe(false);
  });

  it('dirExists returns true for existing directories and false when missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-io-'));
    tempDirs.push(root);
    const dir = join(root, 'exists-dir');
    const file = join(root, 'file.txt');
    await mkdir(dir, { recursive: true });
    await writeFile(file, 'present', 'utf8');

    await expect(dirExists(dir)).resolves.toBe(true);
    await expect(dirExists(join(root, 'missing-dir'))).resolves.toBe(false);
    await expect(dirExists(file)).resolves.toBe(false);
  });
});
