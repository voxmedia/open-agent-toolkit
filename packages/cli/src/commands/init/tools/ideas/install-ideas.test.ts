import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installIdeas } from './install-ideas';

const IDEA_SKILLS = [
  'oat-idea-new',
  'oat-idea-ideate',
  'oat-idea-summarize',
  'oat-idea-scratchpad',
] as const;

const INFRA_FILES = [
  { src: 'ideas-backlog.md', dest: '.oat/ideas/backlog.md' },
  { src: 'ideas-scratchpad.md', dest: '.oat/ideas/scratchpad.md' },
] as const;

const RUNTIME_TEMPLATES = [
  { src: 'idea-discovery.md', dest: '.oat/templates/ideas/idea-discovery.md' },
  { src: 'idea-summary.md', dest: '.oat/templates/ideas/idea-summary.md' },
] as const;

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'oat-ideas-'));
  tempDirs.push(dir);
  return dir;
}

async function seedAssets(assetsRoot: string): Promise<void> {
  const skillsRoot = join(assetsRoot, 'skills');
  const ideasTemplatesRoot = join(assetsRoot, 'templates', 'ideas');
  await mkdir(skillsRoot, { recursive: true });
  await mkdir(ideasTemplatesRoot, { recursive: true });

  for (const skill of IDEA_SKILLS) {
    const skillDir = join(skillsRoot, skill);
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), `# ${skill}\n`, 'utf8');
  }

  for (const file of INFRA_FILES) {
    await writeFile(
      join(ideasTemplatesRoot, file.src),
      `seed:${file.src}\n`,
      'utf8',
    );
  }

  for (const file of RUNTIME_TEMPLATES) {
    await writeFile(
      join(ideasTemplatesRoot, file.src),
      `seed:${file.src}\n`,
      'utf8',
    );
  }
}

async function read(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

describe('installIdeas', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('copies all 4 skills, 2 infra files, and 2 runtime templates on fresh install', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    await seedAssets(assetsRoot);

    const result = await installIdeas({
      assetsRoot,
      targetRoot: join(workspaceRoot, 'target'),
    });

    expect(result.copiedSkills).toHaveLength(4);
    expect(result.copiedInfraFiles).toHaveLength(2);
    expect(result.copiedTemplates).toHaveLength(2);
    expect(result.updatedSkills).toEqual([]);
    expect(result.skippedSkills).toEqual([]);

    for (const skill of IDEA_SKILLS) {
      await expect(
        read(
          join(workspaceRoot, 'target', '.agents', 'skills', skill, 'SKILL.md'),
        ),
      ).resolves.toContain(skill);
    }

    for (const file of INFRA_FILES) {
      await expect(
        read(join(workspaceRoot, 'target', file.dest)),
      ).resolves.toContain(`seed:${file.src}`);
    }

    for (const file of RUNTIME_TEMPLATES) {
      await expect(
        read(join(workspaceRoot, 'target', file.dest)),
      ).resolves.toContain(`seed:${file.src}`);
    }
  });

  it('skips all items on idempotent re-run', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    const targetRoot = join(workspaceRoot, 'target');
    await seedAssets(assetsRoot);

    await installIdeas({ assetsRoot, targetRoot });
    const second = await installIdeas({ assetsRoot, targetRoot });

    expect(second.copiedSkills).toEqual([]);
    expect(second.copiedInfraFiles).toEqual([]);
    expect(second.copiedTemplates).toEqual([]);
    expect(second.updatedSkills).toEqual([]);
    expect(second.updatedInfraFiles).toEqual([]);
    expect(second.updatedTemplates).toEqual([]);
    expect(second.skippedSkills).toHaveLength(4);
    expect(second.skippedInfraFiles).toHaveLength(2);
    expect(second.skippedTemplates).toHaveLength(2);
  });

  it('copies only absent items on partial state', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    const targetRoot = join(workspaceRoot, 'target');
    await seedAssets(assetsRoot);

    await mkdir(join(targetRoot, '.agents', 'skills', 'oat-idea-new'), {
      recursive: true,
    });
    await writeFile(
      join(targetRoot, '.agents', 'skills', 'oat-idea-new', 'SKILL.md'),
      'existing\n',
      'utf8',
    );

    const result = await installIdeas({ assetsRoot, targetRoot });

    expect(result.skippedSkills).toEqual(['oat-idea-new']);
    expect(result.copiedSkills).toHaveLength(3);
    expect(result.copiedInfraFiles).toHaveLength(2);
    expect(result.copiedTemplates).toHaveLength(2);
  });

  it('overwrites existing items when force=true, tracking in updated arrays', async () => {
    const workspaceRoot = await makeTempDir();
    const assetsRoot = join(workspaceRoot, 'assets');
    const targetRoot = join(workspaceRoot, 'target');
    await seedAssets(assetsRoot);

    await installIdeas({ assetsRoot, targetRoot });

    await writeFile(
      join(targetRoot, '.agents', 'skills', 'oat-idea-new', 'SKILL.md'),
      'modified\n',
      'utf8',
    );

    const result = await installIdeas({ assetsRoot, targetRoot, force: true });

    expect(result.copiedSkills).toEqual([]);
    expect(result.copiedInfraFiles).toEqual([]);
    expect(result.copiedTemplates).toEqual([]);
    expect(result.updatedSkills).toHaveLength(4);
    expect(result.updatedInfraFiles).toHaveLength(2);
    expect(result.updatedTemplates).toHaveLength(2);

    await expect(
      read(join(targetRoot, '.agents', 'skills', 'oat-idea-new', 'SKILL.md')),
    ).resolves.toContain('# oat-idea-new');
  });
});
