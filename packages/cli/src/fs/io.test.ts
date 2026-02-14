import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { atomicWriteJson, copyDirectory, createSymlink, ensureDir } from './io';

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
});
