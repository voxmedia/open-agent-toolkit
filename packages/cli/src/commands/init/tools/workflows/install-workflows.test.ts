import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  installWorkflows,
  WORKFLOW_AGENTS,
  WORKFLOW_SCRIPTS,
  WORKFLOW_SKILLS,
  WORKFLOW_TEMPLATES,
} from './install-workflows';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-workflows-'));
  tempDirs.push(dir);
  return dir;
}

async function seedAssets(
  assetsRoot: string,
  withScripts = true,
): Promise<void> {
  await mkdir(join(assetsRoot, 'skills'), { recursive: true });
  await mkdir(join(assetsRoot, 'agents'), { recursive: true });
  await mkdir(join(assetsRoot, 'templates'), { recursive: true });
  await mkdir(join(assetsRoot, 'scripts'), { recursive: true });

  for (const skill of WORKFLOW_SKILLS) {
    const dir = join(assetsRoot, 'skills', skill);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'SKILL.md'),
      `---\nname: ${skill}\nversion: 1.0.0\n---\n`,
      'utf8',
    );
  }

  for (const agent of WORKFLOW_AGENTS) {
    await writeFile(join(assetsRoot, 'agents', agent), `# ${agent}\n`, 'utf8');
  }

  for (const template of WORKFLOW_TEMPLATES) {
    await writeFile(
      join(assetsRoot, 'templates', template),
      `# ${template}\n`,
      'utf8',
    );
  }

  if (withScripts) {
    for (const script of WORKFLOW_SCRIPTS) {
      const scriptPath = join(assetsRoot, 'scripts', script);
      await writeFile(scriptPath, '#!/bin/sh\necho seeded\n', 'utf8');
      await chmod(scriptPath, 0o755);
    }
  }
}

describe('installWorkflows', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('copies all workflow skills, 2 agents, 6 templates, and 3 scripts on fresh install', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.copiedSkills).toHaveLength(WORKFLOW_SKILLS.length);
    expect(result.outdatedSkills).toEqual([]);
    expect(result.copiedAgents).toHaveLength(2);
    expect(result.copiedTemplates).toHaveLength(6);
    expect(result.copiedScripts).toHaveLength(3);
    expect(result.projectsRootInitialized).toBe(true);
  });

  it('preserves script chmod 0o755', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installWorkflows({ assetsRoot, targetRoot });

    const scriptStat = await stat(
      join(targetRoot, '.oat', 'scripts', 'generate-oat-state.sh'),
    );
    expect(scriptStat.mode & 0o111).not.toBe(0);
  });

  it('writes project-root defaults when absent and does not overwrite when present', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const first = await installWorkflows({ assetsRoot, targetRoot });
    expect(first.projectsRootInitialized).toBe(true);
    expect(first.projectsRootConfigInitialized).toBe(true);
    await expect(
      readFile(join(targetRoot, '.oat', 'projects-root'), 'utf8'),
    ).resolves.toContain('.oat/projects/shared');
    await expect(
      readFile(join(targetRoot, '.oat', 'config.json'), 'utf8'),
    ).resolves.toContain('"projects"');
    await expect(
      readFile(join(targetRoot, '.oat', 'config.json'), 'utf8'),
    ).resolves.toContain('.oat/projects/shared');

    await writeFile(
      join(targetRoot, '.oat', 'projects-root'),
      '.oat/projects/custom\n',
      'utf8',
    );
    await writeFile(
      join(targetRoot, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { root: '.oat/projects/custom-config' } })}\n`,
      'utf8',
    );
    const second = await installWorkflows({
      assetsRoot,
      targetRoot,
      force: true,
    });
    expect(second.projectsRootInitialized).toBe(false);
    expect(second.projectsRootConfigInitialized).toBe(false);
    await expect(
      readFile(join(targetRoot, '.oat', 'projects-root'), 'utf8'),
    ).resolves.toContain('.oat/projects/custom');
    await expect(
      readFile(join(targetRoot, '.oat', 'config.json'), 'utf8'),
    ).resolves.toContain('.oat/projects/custom-config');
  });

  it('scaffolds projects directories with .gitkeep files on fresh install', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.projectsDirsScaffolded).toBe(true);
    const sharedStat = await stat(
      join(targetRoot, '.oat', 'projects', 'shared'),
    );
    expect(sharedStat.isDirectory()).toBe(true);
    await expect(
      readFile(
        join(targetRoot, '.oat', 'projects', 'local', '.gitkeep'),
        'utf8',
      ),
    ).resolves.toBe('');
    await expect(
      readFile(
        join(targetRoot, '.oat', 'projects', 'archived', '.gitkeep'),
        'utf8',
      ),
    ).resolves.toBe('');
  });

  it('scaffolds projects directories under custom projects.root', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    // Pre-configure a custom projects root
    await mkdir(join(targetRoot, '.oat'), { recursive: true });
    await writeFile(
      join(targetRoot, '.oat', 'projects-root'),
      '.oat/custom-projects/shared\n',
      'utf8',
    );
    await writeFile(
      join(targetRoot, '.oat', 'config.json'),
      JSON.stringify({
        version: 1,
        projects: { root: '.oat/custom-projects/shared' },
      }),
      'utf8',
    );

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.projectsDirsScaffolded).toBe(true);
    expect(result.resolvedProjectsRoot).toBe('.oat/custom-projects/shared');
    // Shared dir should be under the custom root
    const sharedStat = await stat(
      join(targetRoot, '.oat', 'custom-projects', 'shared'),
    );
    expect(sharedStat.isDirectory()).toBe(true);
    // Sibling dirs should also be under the custom root
    await expect(
      readFile(
        join(targetRoot, '.oat', 'custom-projects', 'local', '.gitkeep'),
        'utf8',
      ),
    ).resolves.toBe('');
    await expect(
      readFile(
        join(targetRoot, '.oat', 'custom-projects', 'archived', '.gitkeep'),
        'utf8',
      ),
    ).resolves.toBe('');
    // Default location should NOT exist
    await expect(
      stat(join(targetRoot, '.oat', 'projects', 'shared')),
    ).rejects.toThrow();
  });

  it('does not re-scaffold projects dirs when shared already exists', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installWorkflows({ assetsRoot, targetRoot });
    const second = await installWorkflows({ assetsRoot, targetRoot });

    expect(second.projectsDirsScaffolded).toBe(false);
  });

  it('gracefully skips missing source scripts', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot, false);

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.copiedScripts).toEqual([]);
    expect(result.skippedScripts).toHaveLength(3);
  });

  it('skips all items on idempotent re-run', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installWorkflows({ assetsRoot, targetRoot });
    const second = await installWorkflows({ assetsRoot, targetRoot });

    expect(second.copiedSkills).toEqual([]);
    expect(second.copiedAgents).toEqual([]);
    expect(second.copiedTemplates).toEqual([]);
    expect(second.copiedScripts).toEqual([]);
    expect(second.skippedSkills).toHaveLength(WORKFLOW_SKILLS.length);
    expect(second.outdatedSkills).toEqual([]);
    expect(second.skippedAgents).toHaveLength(2);
    expect(second.skippedTemplates).toHaveLength(6);
    expect(second.skippedScripts).toHaveLength(3);
  });

  it('overwrites with force=true, tracking updated arrays', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    await installWorkflows({ assetsRoot, targetRoot });
    await writeFile(
      join(targetRoot, '.agents', 'skills', 'oat-project-new', 'SKILL.md'),
      'modified\n',
      'utf8',
    );

    const result = await installWorkflows({
      assetsRoot,
      targetRoot,
      force: true,
    });

    expect(result.updatedSkills).toHaveLength(WORKFLOW_SKILLS.length);
    expect(result.outdatedSkills).toEqual([]);
    expect(result.updatedAgents).toHaveLength(2);
    expect(result.updatedTemplates).toHaveLength(6);
    expect(result.updatedScripts).toHaveLength(3);
  });

  it('tracks outdated skills without overwriting when not forced', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);
    await installWorkflows({ assetsRoot, targetRoot });

    await writeFile(
      join(assetsRoot, 'skills', 'oat-project-new', 'SKILL.md'),
      '---\nname: oat-project-new\nversion: 1.1.0\n---\n',
      'utf8',
    );

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.outdatedSkills).toEqual([
      { name: 'oat-project-new', installed: '1.0.0', bundled: '1.1.0' },
    ]);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'oat-project-new', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('version: 1.0.0');
  });

  it('preserves null version fields for unversioned outdated skills', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);
    await installWorkflows({ assetsRoot, targetRoot });

    await writeFile(
      join(targetRoot, '.agents', 'skills', 'oat-project-new', 'SKILL.md'),
      '---\nname: oat-project-new\n---\n',
      'utf8',
    );
    await writeFile(
      join(assetsRoot, 'skills', 'oat-project-new', 'SKILL.md'),
      '---\nname: oat-project-new\nversion: 1.1.0\n---\n',
      'utf8',
    );

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.outdatedSkills).toEqual([
      { name: 'oat-project-new', installed: null, bundled: '1.1.0' },
    ]);
  });
});
