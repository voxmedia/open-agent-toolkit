import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installProjectManagement } from './install-project-management';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-project-management-'));
  tempDirs.push(dir);
  return dir;
}

async function seedAssets(assetsRoot: string): Promise<void> {
  for (const skill of [
    'oat-pjm-add-backlog-item',
    'oat-pjm-update-repo-reference',
    'oat-pjm-review-backlog',
  ]) {
    await mkdir(join(assetsRoot, 'skills', skill), { recursive: true });
    await writeFile(
      join(assetsRoot, 'skills', skill, 'SKILL.md'),
      `---\nname: ${skill}\nversion: 1.0.0\n---\n`,
      'utf8',
    );
  }

  await mkdir(join(assetsRoot, 'templates'), { recursive: true });
  await writeFile(
    join(assetsRoot, 'templates', 'backlog-item.md'),
    '# backlog item\n',
    'utf8',
  );
  await writeFile(
    join(assetsRoot, 'templates', 'roadmap.md'),
    '# roadmap\n',
    'utf8',
  );
}

describe('installProjectManagement', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('copies all project-management skills and templates', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installProjectManagement({ assetsRoot, targetRoot });

    expect(result.copiedSkills).toEqual([
      'oat-pjm-add-backlog-item',
      'oat-pjm-update-repo-reference',
      'oat-pjm-review-backlog',
    ]);
    expect(result.copiedTemplates).toEqual(['backlog-item.md', 'roadmap.md']);
    expect(result.outdatedSkills).toEqual([]);
    await expect(
      readFile(
        join(
          targetRoot,
          '.agents',
          'skills',
          'oat-pjm-review-backlog',
          'SKILL.md',
        ),
        'utf8',
      ),
    ).resolves.toContain('oat-pjm-review-backlog');
    await expect(
      readFile(
        join(targetRoot, '.oat', 'templates', 'backlog-item.md'),
        'utf8',
      ),
    ).resolves.toContain('backlog item');
  });

  it('skips matching installs on idempotent re-run', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installProjectManagement({ assetsRoot, targetRoot });
    const result = await installProjectManagement({ assetsRoot, targetRoot });

    expect(result.copiedSkills).toEqual([]);
    expect(result.updatedSkills).toEqual([]);
    expect(result.skippedSkills).toEqual([
      'oat-pjm-add-backlog-item',
      'oat-pjm-update-repo-reference',
      'oat-pjm-review-backlog',
    ]);
    expect(result.copiedTemplates).toEqual([]);
    expect(result.updatedTemplates).toEqual([]);
    expect(result.skippedTemplates).toEqual(['backlog-item.md', 'roadmap.md']);
  });

  it('overwrites existing assets when force=true', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installProjectManagement({ assetsRoot, targetRoot });
    await writeFile(
      join(
        targetRoot,
        '.agents',
        'skills',
        'oat-pjm-add-backlog-item',
        'SKILL.md',
      ),
      '# changed\n',
      'utf8',
    );
    await writeFile(
      join(targetRoot, '.oat', 'templates', 'roadmap.md'),
      '# changed\n',
      'utf8',
    );

    const result = await installProjectManagement({
      assetsRoot,
      targetRoot,
      force: true,
    });

    expect(result.updatedSkills).toEqual([
      'oat-pjm-add-backlog-item',
      'oat-pjm-update-repo-reference',
      'oat-pjm-review-backlog',
    ]);
    expect(result.updatedTemplates).toEqual(['backlog-item.md', 'roadmap.md']);
    await expect(
      readFile(
        join(
          targetRoot,
          '.agents',
          'skills',
          'oat-pjm-add-backlog-item',
          'SKILL.md',
        ),
        'utf8',
      ),
    ).resolves.toContain('oat-pjm-add-backlog-item');
    await expect(
      readFile(join(targetRoot, '.oat', 'templates', 'roadmap.md'), 'utf8'),
    ).resolves.toContain('roadmap');
  });

  it('tracks outdated skills when bundled versions are newer', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installProjectManagement({ assetsRoot, targetRoot });
    await writeFile(
      join(assetsRoot, 'skills', 'oat-pjm-add-backlog-item', 'SKILL.md'),
      '---\nname: oat-pjm-add-backlog-item\nversion: 1.1.0\n---\n',
      'utf8',
    );

    const result = await installProjectManagement({ assetsRoot, targetRoot });

    expect(result.outdatedSkills).toEqual([
      {
        name: 'oat-pjm-add-backlog-item',
        installed: '1.0.0',
        bundled: '1.1.0',
      },
    ]);
  });
});
