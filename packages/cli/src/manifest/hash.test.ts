import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliError } from '@errors/index';
import { afterEach, describe, expect, it } from 'vitest';
import {
  computeContentHash,
  computeDirectoryHash,
  computeFileHash,
} from './hash';

describe('computeDirectoryHash', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('produces deterministic SHA-256 for a directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-'));
    tempDirs.push(dir);
    await mkdir(join(dir, 'nested'), { recursive: true });
    await writeFile(join(dir, 'a.txt'), 'alpha', 'utf8');
    await writeFile(join(dir, 'nested', 'b.txt'), 'beta', 'utf8');

    const first = await computeDirectoryHash(dir);
    const second = await computeDirectoryHash(dir);

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
  });

  it('hash changes when file content changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-'));
    tempDirs.push(dir);
    await writeFile(join(dir, 'value.txt'), 'one', 'utf8');

    const before = await computeDirectoryHash(dir);
    await writeFile(join(dir, 'value.txt'), 'two', 'utf8');
    const after = await computeDirectoryHash(dir);

    expect(before).not.toBe(after);
  });

  it('hash is stable regardless of filesystem readdir order', async () => {
    const dirA = await mkdtemp(join(tmpdir(), 'oat-hash-a-'));
    const dirB = await mkdtemp(join(tmpdir(), 'oat-hash-b-'));
    tempDirs.push(dirA, dirB);

    await mkdir(join(dirA, 'nested'), { recursive: true });
    await mkdir(join(dirB, 'nested'), { recursive: true });

    await writeFile(join(dirA, 'z.txt'), 'zeta', 'utf8');
    await writeFile(join(dirA, 'nested', 'a.txt'), 'alpha', 'utf8');

    await writeFile(join(dirB, 'nested', 'a.txt'), 'alpha', 'utf8');
    await writeFile(join(dirB, 'z.txt'), 'zeta', 'utf8');

    const hashA = await computeDirectoryHash(dirA);
    const hashB = await computeDirectoryHash(dirB);

    expect(hashA).toBe(hashB);
  });

  it('throws CliError when directory does not exist', async () => {
    const missing = join(tmpdir(), 'oat-hash-missing-does-not-exist');

    await expect(computeDirectoryHash(missing)).rejects.toBeInstanceOf(
      CliError,
    );
  });
});

describe('computeFileHash', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('produces deterministic SHA-256 for a file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-file-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'agent.md');
    await writeFile(filePath, '# My Agent\n', 'utf8');

    const first = await computeFileHash(filePath);
    const second = await computeFileHash(filePath);

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
  });

  it('hash changes when file content changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-file-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'agent.md');
    await writeFile(filePath, 'version one', 'utf8');

    const before = await computeFileHash(filePath);
    await writeFile(filePath, 'version two', 'utf8');
    const after = await computeFileHash(filePath);

    expect(before).not.toBe(after);
  });

  it('throws CliError when file does not exist', async () => {
    const missing = join(tmpdir(), 'oat-hash-file-missing-does-not-exist.md');

    await expect(computeFileHash(missing)).rejects.toBeInstanceOf(CliError);
  });
});

describe('computeContentHash', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('dispatches to computeFileHash for file entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-content-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'agent.md');
    await writeFile(filePath, '# Agent\n', 'utf8');

    const contentHash = await computeContentHash(filePath, true);
    const fileHash = await computeFileHash(filePath);

    expect(contentHash).toBe(fileHash);
  });

  it('dispatches to computeDirectoryHash for directory entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-hash-content-'));
    tempDirs.push(dir);
    await writeFile(join(dir, 'file.txt'), 'content', 'utf8');

    const contentHash = await computeContentHash(dir, false);
    const dirHash = await computeDirectoryHash(dir);

    expect(contentHash).toBe(dirHash);
  });
});
