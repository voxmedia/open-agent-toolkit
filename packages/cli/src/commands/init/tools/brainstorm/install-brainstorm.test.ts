import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { BRAINSTORM_SKILLS, installBrainstorm } from './install-brainstorm';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-brainstorm-'));
  tempDirs.push(dir);
  return dir;
}

async function seedAssets(assetsRoot: string): Promise<void> {
  const skillsRoot = join(assetsRoot, 'skills');
  await mkdir(skillsRoot, { recursive: true });

  for (const skill of BRAINSTORM_SKILLS) {
    const skillDir = join(skillsRoot, skill);
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---\nname: ${skill}\nversion: 1.0.0\n---\n`,
      'utf8',
    );

    // Visual-companion bundle ships under the skill directory and copies
    // along with it.
    const scriptsDir = join(skillDir, 'scripts');
    await mkdir(scriptsDir, { recursive: true });
    await writeFile(
      join(scriptsDir, 'server.cjs'),
      'seed:server.cjs\n',
      'utf8',
    );
    await writeFile(
      join(scriptsDir, 'start-server.sh'),
      '#!/usr/bin/env bash\nseed\n',
      'utf8',
    );

    const referencesDir = join(skillDir, 'references');
    await mkdir(referencesDir, { recursive: true });
    await writeFile(
      join(referencesDir, 'visual-companion.md'),
      'seed:visual-companion\n',
      'utf8',
    );
  }
}

async function read(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

describe('installBrainstorm', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('copies oat-brainstorm skill assets (including scripts/ and references/) to the target root on fresh install', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    await seedAssets(assetsRoot);

    const result = await installBrainstorm({
      assetsRoot,
      targetRoot: join(workspaceRoot, 'target'),
    });

    expect(result.copiedSkills).toEqual(['oat-brainstorm']);
    expect(result.skippedSkills).toEqual([]);
    expect(result.outdatedSkills).toEqual([]);

    const skillRoot = join(
      workspaceRoot,
      'target',
      '.agents',
      'skills',
      'oat-brainstorm',
    );
    await expect(read(join(skillRoot, 'SKILL.md'))).resolves.toContain(
      'name: oat-brainstorm',
    );
    await expect(
      read(join(skillRoot, 'scripts', 'server.cjs')),
    ).resolves.toContain('seed:server.cjs');
    await expect(
      read(join(skillRoot, 'scripts', 'start-server.sh')),
    ).resolves.toContain('seed');
    await expect(
      read(join(skillRoot, 'references', 'visual-companion.md')),
    ).resolves.toContain('seed:visual-companion');
  });

  it('skips already-current skill assets without force', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    const targetRoot = join(workspaceRoot, 'target');
    await seedAssets(assetsRoot);

    await installBrainstorm({ assetsRoot, targetRoot });
    const second = await installBrainstorm({ assetsRoot, targetRoot });

    expect(second.copiedSkills).toEqual([]);
    expect(second.updatedSkills).toEqual([]);
    expect(second.skippedSkills).toEqual(['oat-brainstorm']);
    expect(second.outdatedSkills).toEqual([]);
  });

  it('overwrites existing items when force=true, tracking in updatedSkills', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    const targetRoot = join(workspaceRoot, 'target');
    await seedAssets(assetsRoot);

    await installBrainstorm({ assetsRoot, targetRoot });
    await writeFile(
      join(targetRoot, '.agents', 'skills', 'oat-brainstorm', 'SKILL.md'),
      'modified\n',
      'utf8',
    );

    const result = await installBrainstorm({
      assetsRoot,
      targetRoot,
      force: true,
    });

    expect(result.copiedSkills).toEqual([]);
    expect(result.updatedSkills).toEqual(['oat-brainstorm']);
    expect(result.outdatedSkills).toEqual([]);

    await expect(
      read(join(targetRoot, '.agents', 'skills', 'oat-brainstorm', 'SKILL.md')),
    ).resolves.toContain('name: oat-brainstorm');
  });

  it('tracks outdated skill when bundled version is newer', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    const targetRoot = join(workspaceRoot, 'target');
    await seedAssets(assetsRoot);
    await installBrainstorm({ assetsRoot, targetRoot });

    await writeFile(
      join(assetsRoot, 'skills', 'oat-brainstorm', 'SKILL.md'),
      `---\nname: oat-brainstorm\nversion: 1.1.0\n---\n`,
      'utf8',
    );

    const result = await installBrainstorm({ assetsRoot, targetRoot });

    expect(result.outdatedSkills).toEqual([
      { name: 'oat-brainstorm', installed: '1.0.0', bundled: '1.1.0' },
    ]);
    await expect(
      read(join(targetRoot, '.agents', 'skills', 'oat-brainstorm', 'SKILL.md')),
    ).resolves.toContain('version: 1.0.0');
  });
});
