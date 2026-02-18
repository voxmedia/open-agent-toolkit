import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  copyDirWithStatus,
  copyFileWithStatus,
  pathExists,
} from './copy-helpers';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-copy-helpers-'));
  tempDirs.push(dir);
  return dir;
}

describe('copy-helpers', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('pathExists returns false for missing path and true for existing file/dir', async () => {
    const root = await makeTempDir();
    const existingDir = join(root, 'existing-dir');
    const existingFile = join(root, 'existing-file.txt');
    const missing = join(root, 'missing');

    await mkdir(existingDir, { recursive: true });
    await writeFile(existingFile, 'hello\n', 'utf8');

    await expect(pathExists(missing)).resolves.toBe(false);
    await expect(pathExists(existingDir)).resolves.toBe(true);
    await expect(pathExists(existingFile)).resolves.toBe(true);
  });

  it('copyDirWithStatus returns copied, skipped, and updated', async () => {
    const root = await makeTempDir();
    const sourceDir = join(root, 'source-dir');
    const destinationDir = join(root, 'destination-dir');
    const sourceFile = join(sourceDir, 'payload.txt');
    const destinationFile = join(destinationDir, 'payload.txt');

    await mkdir(sourceDir, { recursive: true });
    await writeFile(sourceFile, 'from-source\n', 'utf8');

    await expect(
      copyDirWithStatus(sourceDir, destinationDir, false),
    ).resolves.toBe('copied');
    await expect(readFile(destinationFile, 'utf8')).resolves.toContain(
      'from-source',
    );

    await expect(
      copyDirWithStatus(sourceDir, destinationDir, false),
    ).resolves.toBe('skipped');

    await writeFile(destinationFile, 'mutated\n', 'utf8');
    await expect(
      copyDirWithStatus(sourceDir, destinationDir, true),
    ).resolves.toBe('updated');
    await expect(readFile(destinationFile, 'utf8')).resolves.toContain(
      'from-source',
    );
  });

  it('copyFileWithStatus returns copied, skipped, and updated', async () => {
    const root = await makeTempDir();
    const sourceFile = join(root, 'source.txt');
    const destinationFile = join(root, 'nested', 'destination.txt');

    await writeFile(sourceFile, 'from-source\n', 'utf8');

    await expect(
      copyFileWithStatus(sourceFile, destinationFile, false),
    ).resolves.toBe('copied');
    await expect(readFile(destinationFile, 'utf8')).resolves.toContain(
      'from-source',
    );

    await expect(
      copyFileWithStatus(sourceFile, destinationFile, false),
    ).resolves.toBe('skipped');

    await writeFile(destinationFile, 'mutated\n', 'utf8');
    await expect(
      copyFileWithStatus(sourceFile, destinationFile, true),
    ).resolves.toBe('updated');
    await expect(readFile(destinationFile, 'utf8')).resolves.toContain(
      'from-source',
    );
  });
});
