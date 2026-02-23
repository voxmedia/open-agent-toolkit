import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  copyDirWithStatus,
  copyDirWithVersionCheck,
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

  it('copyDirWithVersionCheck returns copied for new installs', async () => {
    const root = await makeTempDir();
    const sourceDir = join(root, 'source-skill');
    const destinationDir = join(root, 'destination-skill');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(sourceDir, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 1.0.0\n---\n',
      'utf8',
    );

    await expect(
      copyDirWithVersionCheck(sourceDir, destinationDir, false),
    ).resolves.toEqual({ status: 'copied' });
  });

  it('copyDirWithVersionCheck returns updated for force updates', async () => {
    const root = await makeTempDir();
    const sourceDir = join(root, 'source-skill');
    const destinationDir = join(root, 'destination-skill');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(destinationDir, { recursive: true });
    await writeFile(
      join(sourceDir, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 1.0.0\n---\n',
      'utf8',
    );
    await writeFile(
      join(destinationDir, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 0.9.0\n---\n',
      'utf8',
    );
    await writeFile(join(destinationDir, 'payload.txt'), 'mutated\n', 'utf8');

    await expect(
      copyDirWithVersionCheck(sourceDir, destinationDir, true),
    ).resolves.toEqual({ status: 'updated' });
    await expect(pathExists(join(destinationDir, 'payload.txt'))).resolves.toBe(
      false,
    );
  });

  it('copyDirWithVersionCheck returns outdated when bundled is newer', async () => {
    const root = await makeTempDir();
    const sourceDir = join(root, 'source-skill');
    const destinationDir = join(root, 'destination-skill');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(destinationDir, { recursive: true });
    await writeFile(
      join(sourceDir, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 1.2.0\n---\n',
      'utf8',
    );
    await writeFile(
      join(destinationDir, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 1.1.0\n---\n',
      'utf8',
    );
    await writeFile(join(destinationDir, 'payload.txt'), 'mutated\n', 'utf8');

    await expect(
      copyDirWithVersionCheck(sourceDir, destinationDir, false),
    ).resolves.toEqual({
      status: 'outdated',
      installedVersion: '1.1.0',
      bundledVersion: '1.2.0',
    });
    await expect(
      readFile(join(destinationDir, 'payload.txt'), 'utf8'),
    ).resolves.toBe('mutated\n');
  });

  it('copyDirWithVersionCheck returns skipped when versions are current or newer', async () => {
    const root = await makeTempDir();
    const sourceDir = join(root, 'source-skill');
    const destinationDirCurrent = join(root, 'destination-skill-current');
    const destinationDirNewer = join(root, 'destination-skill-newer');

    await mkdir(sourceDir, { recursive: true });
    await mkdir(destinationDirCurrent, { recursive: true });
    await mkdir(destinationDirNewer, { recursive: true });

    await writeFile(
      join(sourceDir, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 1.2.0\n---\n',
      'utf8',
    );
    await writeFile(
      join(destinationDirCurrent, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 1.2.0\n---\n',
      'utf8',
    );
    await writeFile(
      join(destinationDirNewer, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 2.0.0\n---\n',
      'utf8',
    );

    await expect(
      copyDirWithVersionCheck(sourceDir, destinationDirCurrent, false),
    ).resolves.toEqual({ status: 'skipped' });
    await expect(
      copyDirWithVersionCheck(sourceDir, destinationDirNewer, false),
    ).resolves.toEqual({ status: 'skipped' });
  });

  it('copyDirWithVersionCheck treats missing version as 0.0.0', async () => {
    const root = await makeTempDir();
    const sourceDir = join(root, 'source-skill');
    const destinationDir = join(root, 'destination-skill');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(destinationDir, { recursive: true });
    await writeFile(
      join(sourceDir, 'SKILL.md'),
      '---\nname: oat-demo\n---\n',
      'utf8',
    );
    await writeFile(
      join(destinationDir, 'SKILL.md'),
      '---\nname: oat-demo\nversion: 1.0.0\n---\n',
      'utf8',
    );

    await expect(
      copyDirWithVersionCheck(sourceDir, destinationDir, false),
    ).resolves.toEqual({ status: 'skipped' });
    await expect(
      copyDirWithVersionCheck(destinationDir, sourceDir, false),
    ).resolves.toEqual({
      status: 'outdated',
      installedVersion: null,
      bundledVersion: '1.0.0',
    });
  });
});
