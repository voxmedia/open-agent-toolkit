import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installResearch } from './install-research';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-research-'));
  tempDirs.push(dir);
  return dir;
}

async function seedAssets(assetsRoot: string): Promise<void> {
  await mkdir(join(assetsRoot, 'skills', 'analyze'), { recursive: true });
  await mkdir(join(assetsRoot, 'skills', 'deep-research'), { recursive: true });
  await mkdir(join(assetsRoot, 'agents'), { recursive: true });
  await writeFile(
    join(assetsRoot, 'skills', 'analyze', 'SKILL.md'),
    '---\nname: analyze\nversion: 1.0.0\n---\n',
    'utf8',
  );
  await writeFile(
    join(assetsRoot, 'skills', 'deep-research', 'SKILL.md'),
    '---\nname: deep-research\nversion: 1.0.0\n---\n',
    'utf8',
  );
  await writeFile(
    join(assetsRoot, 'agents', 'skeptical-evaluator.md'),
    '---\nname: skeptical-evaluator\nversion: 1.0.0\n---\n',
    'utf8',
  );
}

describe('installResearch', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('copies selected skills and agents', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['analyze'],
    });

    expect(result.copiedSkills).toEqual(['analyze']);
    expect(result.copiedAgents).toEqual(['skeptical-evaluator.md']);
    expect(result.outdatedSkills).toEqual([]);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'analyze', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('analyze');
    await expect(
      readFile(
        join(targetRoot, '.agents', 'agents', 'skeptical-evaluator.md'),
        'utf8',
      ),
    ).resolves.toContain('skeptical-evaluator');
  });

  it('skips on idempotent re-run', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['analyze'],
    });
    const second = await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['analyze'],
    });

    expect(second.copiedSkills).toEqual([]);
    expect(second.updatedSkills).toEqual([]);
    expect(second.skippedSkills).toEqual(['analyze']);
    expect(second.skippedAgents).toEqual(['skeptical-evaluator.md']);
    expect(second.outdatedSkills).toEqual([]);
  });

  it('installs only selected skills from skills array', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['deep-research'],
    });

    expect(result.copiedSkills).toEqual(['deep-research']);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'deep-research', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('deep-research');
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'analyze', 'SKILL.md'),
        'utf8',
      ),
    ).rejects.toThrow();
  });

  it('overwrites existing skills when force=true', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['analyze'],
    });

    const installedSkillPath = join(
      targetRoot,
      '.agents',
      'skills',
      'analyze',
      'SKILL.md',
    );
    await writeFile(installedSkillPath, '# changed\n', 'utf8');

    const result = await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['analyze'],
      force: true,
    });

    expect(result.copiedSkills).toEqual([]);
    expect(result.updatedSkills).toEqual(['analyze']);
    expect(result.skippedSkills).toEqual([]);
    expect(result.outdatedSkills).toEqual([]);
    await expect(readFile(installedSkillPath, 'utf8')).resolves.toContain(
      'analyze',
    );
  });

  it('tracks outdated research skills when bundled version is newer', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);
    await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['analyze'],
    });

    await writeFile(
      join(assetsRoot, 'skills', 'analyze', 'SKILL.md'),
      '---\nname: analyze\nversion: 1.1.0\n---\n',
      'utf8',
    );

    const result = await installResearch({
      assetsRoot,
      targetRoot,
      skills: ['analyze'],
    });

    expect(result.copiedSkills).toEqual([]);
    expect(result.updatedSkills).toEqual([]);
    expect(result.skippedSkills).toEqual([]);
    expect(result.outdatedSkills).toEqual([
      { name: 'analyze', installed: '1.0.0', bundled: '1.1.0' },
    ]);
  });
});
