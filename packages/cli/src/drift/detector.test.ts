import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeDirectoryHash } from '@manifest/hash';
import type { ManifestEntry } from '@manifest/manifest.types';
import { afterEach, describe, expect, it } from 'vitest';
import { detectDrift } from './detector';

function createManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    canonicalPath: '.agents/skills/skill-one',
    providerPath: '.claude/skills/skill-one',
    provider: 'claude',
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    lastSynced: new Date().toISOString(),
    ...overrides,
  };
}

async function seedSkill(root: string, relativePath: string): Promise<void> {
  const skillDir = join(root, relativePath);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# skill\n', 'utf8');
}

describe('detectDrift', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('returns missing when provider path absent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({ status: 'missing' });
  });

  it('returns in_sync when symlink target matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'skill-one'),
      join(root, '.claude', 'skills', 'skill-one'),
      'dir',
    );

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('returns drifted:broken when symlink target does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'missing-skill'),
      join(root, '.claude', 'skills', 'skill-one'),
      'dir',
    );

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'broken',
    });
  });

  it('returns drifted:replaced when provider path is not a symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await mkdir(join(root, '.claude', 'skills', 'skill-one'), {
      recursive: true,
    });

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'replaced',
    });
  });

  it('returns drifted:replaced when symlink target differs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await seedSkill(root, '.agents/skills/other-skill');
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'other-skill'),
      join(root, '.claude', 'skills', 'skill-one'),
      'dir',
    );

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'replaced',
    });
  });

  it('returns in_sync when copy hash matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await seedSkill(root, '.claude/skills/skill-one');
    const providerHash = await computeDirectoryHash(
      join(root, '.claude', 'skills', 'skill-one'),
    );
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: providerHash,
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('returns drifted:modified when copy hash differs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await seedSkill(root, '.claude/skills/skill-one');
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: 'deadbeef',
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'modified',
    });
  });
});
