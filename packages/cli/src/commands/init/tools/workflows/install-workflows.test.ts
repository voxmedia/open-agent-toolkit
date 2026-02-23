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
import { installWorkflows } from './install-workflows';

const WORKFLOW_SKILLS = [
  'oat-project-clear-active',
  'oat-project-complete',
  'oat-project-design',
  'oat-project-discover',
  'oat-project-implement',
  'oat-project-import-plan',
  'oat-project-new',
  'oat-project-open',
  'oat-project-plan',
  'oat-project-plan-writing',
  'oat-project-pr-final',
  'oat-project-pr-progress',
  'oat-project-progress',
  'oat-project-promote-spec-driven',
  'oat-project-quick-start',
  'oat-project-review-provide',
  'oat-project-review-receive',
  'oat-project-review-receive-remote',
  'oat-project-spec',
  'oat-repo-knowledge-index',
  'oat-worktree-bootstrap',
] as const;

const WORKFLOW_AGENTS = ['oat-codebase-mapper.md', 'oat-reviewer.md'] as const;
const WORKFLOW_TEMPLATES = [
  'state.md',
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
] as const;
const WORKFLOW_SCRIPTS = [
  'generate-oat-state.sh',
  'generate-thin-index.sh',
] as const;

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
    await writeFile(join(dir, 'SKILL.md'), `# ${skill}\n`, 'utf8');
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

  it('copies all 21 skills, 2 agents, 6 templates, and 2 scripts on fresh install', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot);

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.copiedSkills).toHaveLength(21);
    expect(result.copiedAgents).toHaveLength(2);
    expect(result.copiedTemplates).toHaveLength(6);
    expect(result.copiedScripts).toHaveLength(2);
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

  it('gracefully skips missing source scripts', async () => {
    const root = await makeTempDir();
    const assetsRoot = join(root, 'assets');
    const targetRoot = join(root, 'target');
    await seedAssets(assetsRoot, false);

    const result = await installWorkflows({ assetsRoot, targetRoot });

    expect(result.copiedScripts).toEqual([]);
    expect(result.skippedScripts).toHaveLength(2);
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
    expect(second.skippedSkills).toHaveLength(21);
    expect(second.skippedAgents).toHaveLength(2);
    expect(second.skippedTemplates).toHaveLength(6);
    expect(second.skippedScripts).toHaveLength(2);
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

    expect(result.updatedSkills).toHaveLength(21);
    expect(result.updatedAgents).toHaveLength(2);
    expect(result.updatedTemplates).toHaveLength(6);
    expect(result.updatedScripts).toHaveLength(2);
  });
});
