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

import { installDocs } from '@commands/init/tools/docs/install-docs';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
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

  it('copies all workflow skills, agents, templates, and scripts on fresh install', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.copiedSkills).toHaveLength(WORKFLOW_SKILLS.length);
    expect(result.copiedSkills).toContain('oat-explainer-kit');
    expect(WORKFLOW_SKILLS).toContain('oat-project-retro');
    expect(WORKFLOW_SKILLS).toContain('oat-project-retro-file');
    expect(result.outdatedSkills).toEqual([]);
    expect(result.copiedAgents).toHaveLength(WORKFLOW_AGENTS.length);
    expect(result.copiedTemplates).toHaveLength(WORKFLOW_TEMPLATES.length);
    expect(result.copiedScripts).toHaveLength(3);
    expect(result.projectsRootInitialized).toBe(true);
    await expect(
      readFile(
        join(targetRoot, '.agents', 'skills', 'oat-explainer-kit', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toContain('name: oat-explainer-kit');
    expect(WORKFLOW_TEMPLATES).toContain('project-log.md');
    expect(WORKFLOW_TEMPLATES).toContain('project-retro.md');
    await expect(
      readFile(join(targetRoot, '.oat', 'templates', 'project-log.md'), 'utf8'),
    ).resolves.toBe('# project-log.md\n');
  });

  it('installs all four asset classes at user scope without project scaffolding', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'home');
    await seedAssets(assetsRoot);

    const result = await installWorkflows({
      assetsRoot,
      targetRoot,
      scope: 'user',
    });

    expect(result.copiedSkills).toHaveLength(WORKFLOW_SKILLS.length);
    expect(result.copiedAgents).toHaveLength(WORKFLOW_AGENTS.length);
    expect(result.copiedTemplates).toHaveLength(WORKFLOW_TEMPLATES.length);
    expect(result.copiedScripts).toHaveLength(WORKFLOW_SCRIPTS.length);
    await expect(
      stat(
        join(targetRoot, '.agents', 'skills', WORKFLOW_SKILLS[0], 'SKILL.md'),
      ),
    ).resolves.toBeDefined();
    await expect(
      stat(join(targetRoot, '.agents', 'agents', WORKFLOW_AGENTS[0])),
    ).resolves.toBeDefined();
    await expect(
      stat(join(targetRoot, '.oat', 'templates', WORKFLOW_TEMPLATES[0])),
    ).resolves.toBeDefined();
    const scriptPath = join(targetRoot, '.oat', 'scripts', WORKFLOW_SCRIPTS[0]);
    await expect(stat(scriptPath)).resolves.toBeDefined();
    expect((await stat(scriptPath)).mode & 0o111).not.toBe(0);

    expect(result.projectsRootInitialized).toBe(false);
    expect(result.projectsRootConfigInitialized).toBe(false);
    expect(result.projectsDirsScaffolded).toBe(false);
    expect(result.resolvedProjectsRoot).toBe('');
    await expect(
      stat(join(targetRoot, '.oat', 'projects-root')),
    ).rejects.toThrow();
    await expect(
      stat(join(targetRoot, '.oat', 'config.json')),
    ).rejects.toThrow();
    await expect(stat(join(targetRoot, '.oat', 'projects'))).rejects.toThrow();
    await expect(
      inventoryScopedPack({
        pack: 'workflows',
        scope: 'user',
        scopeRoot: targetRoot,
        assetsRoot,
      }),
    ).resolves.toMatchObject({ completeness: 'complete' });
  });

  it.each(['docs-first', 'workflows-first'] as const)(
    'retains the shared tracking script when installed %s',
    async (order) => {
      const root = await makeTempDir();
      const assetsRoot = join(root, 'assets');
      const targetRoot = join(root, 'home');
      await seedAssets(assetsRoot);

      if (order === 'docs-first') {
        const docs = await installDocs({ assetsRoot, targetRoot, skills: [] });
        const workflows = await installWorkflows({
          assetsRoot,
          targetRoot,
          scope: 'user',
        });
        expect(docs.copiedScripts).toEqual(['resolve-tracking.sh']);
        expect(workflows.skippedScripts).toContain('resolve-tracking.sh');
      } else {
        const workflows = await installWorkflows({
          assetsRoot,
          targetRoot,
          scope: 'user',
        });
        const docs = await installDocs({ assetsRoot, targetRoot, skills: [] });
        expect(workflows.copiedScripts).toContain('resolve-tracking.sh');
        expect(docs.skippedScripts).toEqual(['resolve-tracking.sh']);
      }

      await expect(
        readFile(
          join(targetRoot, '.oat', 'scripts', 'resolve-tracking.sh'),
          'utf8',
        ),
      ).resolves.toBe('#!/bin/sh\necho seeded\n');
    },
  );

  it('makes mode-normalized scripts inside installed skills executable', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const skill = WORKFLOW_SKILLS[0];
    const nestedScriptsDir = join(assetsRoot, 'skills', skill, 'scripts');
    await mkdir(nestedScriptsDir, { recursive: true });
    const nestedScript = join(nestedScriptsDir, 'bootstrap-group.sh');
    await writeFile(nestedScript, '#!/usr/bin/env bash\necho ok\n', 'utf8');
    await chmod(nestedScript, 0o644);
    expect((await stat(nestedScript)).mode & 0o111).toBe(0);

    await installWorkflows({ assetsRoot, targetRoot });

    const installedStat = await stat(
      join(
        targetRoot,
        '.agents',
        'skills',
        skill,
        'scripts',
        'bootstrap-group.sh',
      ),
    );
    expect(installedStat.mode & 0o111).not.toBe(0);
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

  it('preserves defaultScope while backfilling the projects root', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);
    await mkdir(join(targetRoot, '.oat'), { recursive: true });
    await writeFile(
      join(targetRoot, '.oat', 'config.json'),
      `${JSON.stringify({ version: 1, projects: { defaultScope: 'local' } })}\n`,
      'utf8',
    );

    await installWorkflows({ assetsRoot, targetRoot });

    await expect(
      readFile(join(targetRoot, '.oat', 'config.json'), 'utf8'),
    ).resolves.toContain('"defaultScope": "local"');
    await expect(
      readFile(join(targetRoot, '.oat', 'config.json'), 'utf8'),
    ).resolves.toContain('"root": ".oat/projects/shared"');
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

  it('fails forward when a required source script is missing', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot, false);

    await expect(installWorkflows({ assetsRoot, targetRoot })).rejects.toThrow(
      /required workflow script source is missing/i,
    );
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
    expect(second.skippedAgents).toHaveLength(WORKFLOW_AGENTS.length);
    expect(second.skippedTemplates).toHaveLength(WORKFLOW_TEMPLATES.length);
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

    expect(result.updatedSkills).toEqual(['oat-project-new']);
    expect(result.skippedSkills).toHaveLength(WORKFLOW_SKILLS.length - 1);
    expect(result.outdatedSkills).toEqual([]);
    expect(result.updatedAgents).toEqual([]);
    expect(result.updatedTemplates).toEqual([]);
    expect(result.updatedScripts).toEqual([]);
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
