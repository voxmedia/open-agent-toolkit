import * as fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { detectStrays } from '@drift/index';
import { CliError } from '@errors/index';
import {
  addEntry,
  createEmptyManifest,
  loadManifest,
  ManifestSchema,
  saveManifest,
} from '@manifest/index';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { scanCanonical } from './scanner';

const { mkdir, mkdtemp, rm, writeFile } = fsp;

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsp>();
  return { ...actual, readdir: vi.fn().mockImplementation(actual.readdir) };
});

describe('edge cases', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('handles empty .agents/ directory gracefully', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-edge-empty-'));
    tempDirs.push(root);

    const entries = await scanCanonical(root, 'project');

    expect(entries).toEqual([]);
  });

  it('handles permission denied on provider dir', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-edge-perm-'));
    tempDirs.push(root);
    const providerDir = join(root, '.claude', 'skills');
    await mkdir(providerDir, { recursive: true });

    const eaccesError = Object.assign(new Error('EACCES: permission denied'), {
      code: 'EACCES',
    });
    const mockedReaddir = vi.mocked(fsp.readdir);
    mockedReaddir.mockRejectedValueOnce(eaccesError);

    await expect(
      detectStrays('claude', providerDir, createEmptyManifest(), []),
    ).rejects.toMatchObject({
      name: 'CliError',
      exitCode: 1,
    });
  });

  it('recovers from corrupt manifest with clear error message', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-edge-manifest-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(manifestPath, '{"bad":', 'utf8');

    await expect(loadManifest(manifestPath)).rejects.toThrow(CliError);
    await expect(loadManifest(manifestPath)).rejects.toThrow(
      /Delete or repair the file and re-run oat sync\./,
    );
  });

  it('handles concurrent manifest read/write safely', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-edge-concurrency-'));
    tempDirs.push(root);
    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');

    const manifests = Array.from({ length: 8 }, (_, index) => {
      const entryName = `skill-${index + 1}`;
      return addEntry(createEmptyManifest(), {
        canonicalPath: `.agents/skills/${entryName}`,
        providerPath: `.claude/skills/${entryName}`,
        provider: 'claude',
        contentType: 'skill',
        strategy: 'symlink',
        contentHash: null,
        lastSynced: '2026-02-14T00:00:00.000Z',
      });
    });

    await Promise.all(
      manifests.map(async (manifest) => saveManifest(manifestPath, manifest)),
    );

    const loaded = await loadManifest(manifestPath);
    expect(() => ManifestSchema.parse(loaded)).not.toThrow();
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0]?.canonicalPath).toMatch(
      /^\.agents\/skills\/skill-/,
    );
  });

  it('handles .agents/skills/ with non-directory entries filtered out', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-edge-nondir-'));
    tempDirs.push(root);
    const skillsDir = join(root, '.agents', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(
      join(skillsDir, 'README.md'),
      '# not a skill dir\n',
      'utf8',
    );
    await mkdir(join(skillsDir, 'actual-skill'), { recursive: true });
    await writeFile(
      join(skillsDir, 'actual-skill', 'SKILL.md'),
      '# skill\n',
      'utf8',
    );

    const entries = await scanCanonical(root, 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'actual-skill',
      type: 'skill',
      isFile: false,
    });
  });
});
