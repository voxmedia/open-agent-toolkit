import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initializeRepoReference } from './init';

const TEMPLATE_NAMES = [
  'current-state.md',
  'roadmap.md',
  'repo-agents.md',
  'pjm-agents.md',
  'reference-agents.md',
] as const;

const EXPECTED_FILES = [
  'AGENTS.md',
  'pjm/AGENTS.md',
  'pjm/current-state.md',
  'pjm/roadmap.md',
  'reference/AGENTS.md',
  'pjm/backlog/index.md',
  'pjm/backlog/completed.md',
  'pjm/backlog/items/.gitkeep',
  'pjm/backlog/archived/.gitkeep',
  'reference/decisions/index.md',
] as const;

async function seedTemplate(
  root: string,
  name: (typeof TEMPLATE_NAMES)[number],
  body = `# ${name}\n`,
): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, name),
    [
      '---',
      'oat_template: true',
      `oat_template_name: ${name.replace('.md', '')}`,
      '---',
      '',
      body,
    ].join('\n'),
    'utf8',
  );
}

async function seedTemplates(root: string): Promise<void> {
  for (const name of TEMPLATE_NAMES) {
    await seedTemplate(root, name);
  }
}

describe('initializeRepoReference', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('creates the canonical two-layer PJM scaffold for a fresh root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    const result = await initializeRepoReference({ assetsRoot, repoRoot });

    expect(result.repoRoot).toBe(repoRoot);
    expect(result.created).toEqual(EXPECTED_FILES);
    expect(result.skipped).toEqual([]);

    for (const relativePath of EXPECTED_FILES) {
      await expect(
        access(join(repoRoot, relativePath)),
      ).resolves.toBeUndefined();
    }
    await expect(
      access(join(repoRoot, 'reference', 'decision-record.md')),
    ).rejects.toThrow();
    await expect(
      access(join(repoRoot, 'reference', 'backlog')),
    ).rejects.toThrow();
  });

  it('does not overwrite existing canonical docs and reports them as skipped', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    const sentinel = '# Curated roadmap\n';
    await seedTemplates(join(assetsRoot, 'templates'));
    await mkdir(join(repoRoot, 'pjm'), { recursive: true });
    await writeFile(join(repoRoot, 'pjm', 'roadmap.md'), sentinel, {
      encoding: 'utf8',
      flag: 'wx',
    });

    const result = await initializeRepoReference({ assetsRoot, repoRoot });

    await expect(
      readFile(join(repoRoot, 'pjm', 'roadmap.md'), 'utf8'),
    ).resolves.toBe(sentinel);
    expect(result.skipped).toContain('pjm/roadmap.md');
    expect(result.created).not.toContain('pjm/roadmap.md');
  });

  it('is idempotent on rerun', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    await initializeRepoReference({ assetsRoot, repoRoot });
    const second = await initializeRepoReference({ assetsRoot, repoRoot });

    expect(second.created).toEqual([]);
    expect(second.skipped).toEqual(EXPECTED_FILES);
  });

  it('prefers repo-local templates and falls back to bundled assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const templatesRoot = join(root, '.oat', 'templates');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));
    await seedTemplate(
      templatesRoot,
      'current-state.md',
      '# Local Current State\n',
    );

    await initializeRepoReference({ assetsRoot, repoRoot, templatesRoot });

    await expect(
      readFile(join(repoRoot, 'pjm', 'current-state.md'), 'utf8'),
    ).resolves.toContain('# Local Current State');
    await expect(
      readFile(join(repoRoot, 'pjm', 'roadmap.md'), 'utf8'),
    ).resolves.toContain('# roadmap.md');
  });

  it('strips template frontmatter from instantiated docs and AGENTS guides', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const repoRoot = join(root, 'repo');
    await seedTemplates(join(assetsRoot, 'templates'));

    await initializeRepoReference({ assetsRoot, repoRoot });

    for (const relativePath of [
      'AGENTS.md',
      'pjm/current-state.md',
      'reference/AGENTS.md',
    ]) {
      const content = await readFile(join(repoRoot, relativePath), 'utf8');
      expect(content).not.toContain('oat_template:');
      expect(content).not.toContain('oat_template_name:');
      expect(content.startsWith('# ')).toBe(true);
    }
  });

  it('throws an actionable error when a template is missing from both sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const templatesRoot = join(root, '.oat', 'templates');
    const repoRoot = join(root, 'repo');
    await seedTemplate(join(assetsRoot, 'templates'), 'current-state.md');
    await seedTemplate(join(assetsRoot, 'templates'), 'roadmap.md');
    await seedTemplate(join(assetsRoot, 'templates'), 'repo-agents.md');
    await seedTemplate(join(assetsRoot, 'templates'), 'pjm-agents.md');

    await expect(
      initializeRepoReference({ assetsRoot, repoRoot, templatesRoot }),
    ).rejects.toThrow(
      'Template reference-agents.md was not found in repo-local templates or bundled assets.',
    );
  });
});
