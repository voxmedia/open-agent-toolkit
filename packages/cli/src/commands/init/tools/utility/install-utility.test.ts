import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installUtility } from './install-utility';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-utility-'));
  tempDirs.push(dir);
  return dir;
}

async function seedAssets(assetsRoot: string): Promise<void> {
  await mkdir(join(assetsRoot, 'skills', 'oat-review-provide'), {
    recursive: true,
  });
  await mkdir(join(assetsRoot, 'skills', 'other-skill'), { recursive: true });
  await writeFile(
    join(assetsRoot, 'skills', 'oat-review-provide', 'SKILL.md'),
    '# oat-review-provide\n',
    'utf8',
  );
  await writeFile(
    join(assetsRoot, 'skills', 'other-skill', 'SKILL.md'),
    '# other-skill\n',
    'utf8',
  );
}

describe('installUtility', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('copies oat-review-provide at project scope', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'project-target');
    await seedAssets(assetsRoot);

    const result = await installUtility({
      assetsRoot,
      targetRoot,
      skills: ['oat-review-provide'],
    });

    expect(result.copiedSkills).toEqual(['oat-review-provide']);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'oat-review-provide', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('oat-review-provide');
  });

  it('copies oat-review-provide at user scope', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const userRoot = join(root, 'user-target');
    await seedAssets(assetsRoot);

    const result = await installUtility({
      assetsRoot,
      targetRoot: userRoot,
      skills: ['oat-review-provide'],
    });

    expect(result.copiedSkills).toEqual(['oat-review-provide']);
    await expect(
      readFile(
        join(userRoot, '.agents', 'skills', 'oat-review-provide', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('oat-review-provide');
  });

  it('skips on idempotent re-run', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installUtility({
      assetsRoot,
      targetRoot,
      skills: ['oat-review-provide'],
    });
    const second = await installUtility({
      assetsRoot,
      targetRoot,
      skills: ['oat-review-provide'],
    });

    expect(second.copiedSkills).toEqual([]);
    expect(second.updatedSkills).toEqual([]);
    expect(second.skippedSkills).toEqual(['oat-review-provide']);
  });

  it('installs only selected skills from skills array', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installUtility({
      assetsRoot,
      targetRoot,
      skills: ['other-skill'],
    });

    expect(result.copiedSkills).toEqual(['other-skill']);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'other-skill', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('other-skill');
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'oat-review-provide', 'SKILL.md'),
        'utf8',
      ),
    ).rejects.toThrow();
  });

  it('overwrites existing skills when force=true', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installUtility({
      assetsRoot,
      targetRoot,
      skills: ['oat-review-provide'],
    });

    const installedSkillPath = join(
      targetRoot,
      '.agents',
      'skills',
      'oat-review-provide',
      'SKILL.md',
    );
    await writeFile(installedSkillPath, '# changed\n', 'utf8');

    const result = await installUtility({
      assetsRoot,
      targetRoot,
      skills: ['oat-review-provide'],
      force: true,
    });

    expect(result.copiedSkills).toEqual([]);
    expect(result.updatedSkills).toEqual(['oat-review-provide']);
    expect(result.skippedSkills).toEqual([]);
    await expect(readFile(installedSkillPath, 'utf8')).resolves.toContain(
      'oat-review-provide',
    );
  });
});
