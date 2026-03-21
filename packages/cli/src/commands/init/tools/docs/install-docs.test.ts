import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installDocs } from './install-docs';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-docs-pack-'));
  tempDirs.push(dir);
  return dir;
}

async function seedAssets(assetsRoot: string): Promise<void> {
  await mkdir(join(assetsRoot, 'skills', 'oat-docs-analyze'), {
    recursive: true,
  });
  await mkdir(join(assetsRoot, 'skills', 'oat-docs-apply'), {
    recursive: true,
  });
  await mkdir(join(assetsRoot, 'scripts'), { recursive: true });
  await writeFile(
    join(assetsRoot, 'skills', 'oat-docs-analyze', 'SKILL.md'),
    '---\nname: oat-docs-analyze\nversion: 1.0.0\n---\n',
    'utf8',
  );
  await writeFile(
    join(assetsRoot, 'skills', 'oat-docs-apply', 'SKILL.md'),
    '---\nname: oat-docs-apply\nversion: 1.0.0\n---\n',
    'utf8',
  );
  await writeFile(
    join(assetsRoot, 'scripts', 'resolve-tracking.sh'),
    '#!/bin/sh\necho tracking\n',
    'utf8',
  );
}

describe('installDocs', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('copies selected docs skills at project scope', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'project-target');
    await seedAssets(assetsRoot);

    const result = await installDocs({
      assetsRoot,
      targetRoot,
      skills: ['oat-docs-analyze'],
    });

    expect(result.copiedSkills).toEqual(['oat-docs-analyze']);
    expect(result.copiedScripts).toEqual(['resolve-tracking.sh']);
    expect(result.outdatedSkills).toEqual([]);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'oat-docs-analyze', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('oat-docs-analyze');
  });

  it('copies selected docs skills at user scope', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'user-target');
    await seedAssets(assetsRoot);

    const result = await installDocs({
      assetsRoot,
      targetRoot,
      skills: ['oat-docs-apply'],
    });

    expect(result.copiedSkills).toEqual(['oat-docs-apply']);
    expect(result.copiedScripts).toEqual(['resolve-tracking.sh']);
    expect(result.outdatedSkills).toEqual([]);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'oat-docs-apply', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('oat-docs-apply');
  });

  it('tracks outdated docs skills when bundled version is newer', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);
    await installDocs({
      assetsRoot,
      targetRoot,
      skills: ['oat-docs-analyze'],
    });

    await writeFile(
      join(assetsRoot, 'skills', 'oat-docs-analyze', 'SKILL.md'),
      '---\nname: oat-docs-analyze\nversion: 1.1.0\n---\n',
      'utf8',
    );

    const result = await installDocs({
      assetsRoot,
      targetRoot,
      skills: ['oat-docs-analyze'],
    });

    expect(result.copiedSkills).toEqual([]);
    expect(result.updatedSkills).toEqual([]);
    expect(result.skippedSkills).toEqual([]);
    expect(result.skippedScripts).toEqual(['resolve-tracking.sh']);
    expect(result.outdatedSkills).toEqual([
      { name: 'oat-docs-analyze', installed: '1.0.0', bundled: '1.1.0' },
    ]);
  });
});
