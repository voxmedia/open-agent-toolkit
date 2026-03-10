import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  atomicWriteJson,
  copyDirectory,
  createSymlink,
  dirExists,
  ensureDir,
  fileExists,
} from './io';

describe('fs/io', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
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

    const stat = await lstat(linkDir);
    expect(stat.isSymbolicLink()).toBe(true);
    expect(strategy).toBe('symlink');
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
    const stat = await lstat(linkDir);
    expect(stat.isSymbolicLink()).toBe(true);
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

    const stat = await lstat(nested);
    expect(stat.isDirectory()).toBe(true);
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
