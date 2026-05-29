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

const REFERENCE_FILES = [
  'current-state.md',
  'roadmap.md',
  'decision-record.md',
] as const;

const BACKLOG_FILES = [
  'backlog/index.md',
  'backlog/completed.md',
  'backlog/items/.gitkeep',
  'backlog/archived/.gitkeep',
] as const;

const ALL_REPORTED_FILES = [...REFERENCE_FILES, ...BACKLOG_FILES];

async function seedTemplate(
  root: string,
  name: (typeof REFERENCE_FILES)[number],
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
  for (const name of REFERENCE_FILES) {
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

  it('creates reference docs and the backlog scaffold for a fresh root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const referenceRoot = join(root, 'repo', 'reference');
    await seedTemplates(join(assetsRoot, 'templates'));

    const result = await initializeRepoReference({ assetsRoot, referenceRoot });

    expect(result.referenceRoot).toBe(referenceRoot);
    expect(result.created).toEqual(ALL_REPORTED_FILES);
    expect(result.skipped).toEqual([]);

    for (const relativePath of ALL_REPORTED_FILES) {
      await expect(
        access(join(referenceRoot, relativePath)),
      ).resolves.toBeUndefined();
    }
  });

  it('does not overwrite existing reference docs and reports them as skipped', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const referenceRoot = join(root, 'repo', 'reference');
    const sentinel = '# Curated decisions\n';
    await seedTemplates(join(assetsRoot, 'templates'));
    await mkdir(referenceRoot, { recursive: true });
    await writeFile(join(referenceRoot, 'decision-record.md'), sentinel, {
      encoding: 'utf8',
      flag: 'wx',
    });

    const result = await initializeRepoReference({ assetsRoot, referenceRoot });

    await expect(
      readFile(join(referenceRoot, 'decision-record.md'), 'utf8'),
    ).resolves.toBe(sentinel);
    expect(result.skipped).toContain('decision-record.md');
    expect(result.created).not.toContain('decision-record.md');
  });

  it('is idempotent on rerun', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const referenceRoot = join(root, 'repo', 'reference');
    await seedTemplates(join(assetsRoot, 'templates'));

    await initializeRepoReference({ assetsRoot, referenceRoot });
    const second = await initializeRepoReference({ assetsRoot, referenceRoot });

    expect(second.created).toEqual([]);
    expect(second.skipped).toEqual(ALL_REPORTED_FILES);
  });

  it('prefers repo-local templates and falls back to bundled assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const templatesRoot = join(root, '.oat', 'templates');
    const referenceRoot = join(root, 'repo', 'reference');
    await seedTemplates(join(assetsRoot, 'templates'));
    await seedTemplate(
      templatesRoot,
      'current-state.md',
      '# Local Current State\n',
    );

    await initializeRepoReference({ assetsRoot, referenceRoot, templatesRoot });

    await expect(
      readFile(join(referenceRoot, 'current-state.md'), 'utf8'),
    ).resolves.toContain('# Local Current State');
    await expect(
      readFile(join(referenceRoot, 'roadmap.md'), 'utf8'),
    ).resolves.toContain('# roadmap.md');
  });

  it('strips template frontmatter from instantiated reference docs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const referenceRoot = join(root, 'repo', 'reference');
    await seedTemplates(join(assetsRoot, 'templates'));

    await initializeRepoReference({ assetsRoot, referenceRoot });

    const currentState = await readFile(
      join(referenceRoot, 'current-state.md'),
      'utf8',
    );
    expect(currentState).not.toContain('oat_template:');
    expect(currentState).not.toContain('oat_template_name:');
    expect(currentState).toContain('# current-state.md');
  });

  it('throws an actionable error when a template is missing from both sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-pjm-init-'));
    tempDirs.push(root);
    const assetsRoot = join(root, 'assets');
    const templatesRoot = join(root, '.oat', 'templates');
    const referenceRoot = join(root, 'repo', 'reference');
    await seedTemplate(join(assetsRoot, 'templates'), 'current-state.md');
    await seedTemplate(join(assetsRoot, 'templates'), 'roadmap.md');

    await expect(
      initializeRepoReference({ assetsRoot, referenceRoot, templatesRoot }),
    ).rejects.toThrow(
      'Template decision-record.md was not found in repo-local templates or bundled assets.',
    );
  });
});
