import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { CanonicalEntry } from '@engine/scanner';
import { createEmptyManifest } from '@manifest/manager';
import { afterEach, describe, expect, it } from 'vitest';
import { detectStrays, inferScopeRoot } from './strays';

async function seedProviderEntry(
  providerDir: string,
  name: string,
): Promise<void> {
  await mkdir(join(providerDir, name), { recursive: true });
  await writeFile(join(providerDir, name, 'SKILL.md'), '# provider\n', 'utf8');
}

describe('detectStrays', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('returns stray for provider entry not in manifest or canonical', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-strays-'));
    tempDirs.push(root);
    const providerDir = join(root, '.claude', 'skills');
    await seedProviderEntry(providerDir, 'stray-skill');

    const reports = await detectStrays(
      'claude',
      providerDir,
      createEmptyManifest(),
      [],
    );

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      canonical: null,
      provider: 'claude',
      providerPath: '.claude/skills/stray-skill',
      state: { status: 'stray' },
    });
  });

  it('does not flag manifest-tracked entries as strays', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-strays-'));
    tempDirs.push(root);
    const providerDir = join(root, '.claude', 'skills');
    await seedProviderEntry(providerDir, 'tracked-skill');

    const manifest = {
      ...createEmptyManifest(),
      entries: [
        {
          canonicalPath: '.agents/skills/tracked-skill',
          providerPath: '.claude/skills/tracked-skill',
          provider: 'claude',
          contentType: 'skill' as const,
          strategy: 'symlink' as const,
          contentHash: null,
          lastSynced: new Date().toISOString(),
        },
      ],
    };

    const reports = await detectStrays('claude', providerDir, manifest, []);

    expect(reports).toEqual([]);
  });

  it('does not flag manifest-tracked entries when providerDir is passed as relative path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-strays-'));
    tempDirs.push(root);
    const providerDirAbsolute = join(root, '.claude', 'skills');
    await seedProviderEntry(providerDirAbsolute, 'tracked-skill');
    const providerDirRelative = relative(process.cwd(), providerDirAbsolute);

    const manifest = {
      ...createEmptyManifest(),
      entries: [
        {
          canonicalPath: '.agents/skills/tracked-skill',
          providerPath: '.claude/skills/tracked-skill',
          provider: 'claude',
          contentType: 'skill' as const,
          strategy: 'symlink' as const,
          contentHash: null,
          lastSynced: new Date().toISOString(),
        },
      ],
    };

    const reports = await detectStrays(
      'claude',
      providerDirRelative,
      manifest,
      [],
    );

    expect(reports).toEqual([]);
  });

  it('does not flag canonical entries as strays', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-strays-'));
    tempDirs.push(root);
    const providerDir = join(root, '.claude', 'skills');
    await seedProviderEntry(providerDir, 'canonical-skill');

    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'canonical-skill',
        type: 'skill',
        canonicalPath: join(root, '.agents', 'skills', 'canonical-skill'),
      },
    ];

    const reports = await detectStrays(
      'claude',
      providerDir,
      createEmptyManifest(),
      canonicalEntries,
    );

    expect(reports).toEqual([]);
  });

  it('returns empty array when provider dir is empty', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-strays-'));
    tempDirs.push(root);
    const providerDir = join(root, '.claude', 'skills');
    await mkdir(providerDir, { recursive: true });

    const reports = await detectStrays(
      'claude',
      providerDir,
      createEmptyManifest(),
      [],
    );

    expect(reports).toEqual([]);
  });

  it('returns empty array when provider dir does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-strays-'));
    tempDirs.push(root);
    const missingProviderDir = join(root, '.claude', 'skills');

    const reports = await detectStrays(
      'claude',
      missingProviderDir,
      createEmptyManifest(),
      [],
    );

    expect(reports).toEqual([]);
  });

  it('treats unknown content directories as unmanaged and does not suppress by canonical name', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-strays-'));
    tempDirs.push(root);
    const providerDir = join(root, '.claude', 'snippets');
    await seedProviderEntry(providerDir, 'canonical-skill');

    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'canonical-skill',
        type: 'skill',
        canonicalPath: join(root, '.agents', 'skills', 'canonical-skill'),
      },
    ];

    const reports = await detectStrays(
      'claude',
      providerDir,
      createEmptyManifest(),
      canonicalEntries,
    );

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      canonical: null,
      provider: 'claude',
      providerPath: '.claude/snippets/canonical-skill',
      state: { status: 'stray' },
    });
  });

  it('inferScopeRoot resolves innermost provider root for nested dot directories', () => {
    const providerDir = '/tmp/work/.nested/.claude/skills';
    expect(inferScopeRoot(providerDir)).toBe('/tmp/work/.nested');
  });

  it('inferScopeRoot falls back to two-level parent when no provider root marker exists', () => {
    const providerDir = '/tmp/work/providers/skills';
    expect(inferScopeRoot(providerDir)).toBe('/tmp/work');
  });
});
