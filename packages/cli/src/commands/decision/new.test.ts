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

import { initializeDecisionRecords } from './init';
import { createDecisionRecord } from './new';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function seedDecisionTemplate(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, 'decision.md'),
    [
      '---',
      'oat_template: true',
      'oat_template_name: decision',
      '---',
      '',
      '# {title}',
      '',
      '## Context',
      '',
      '{context}',
      '',
      '## Decision',
      '',
      '{decision}',
      '',
      '## Consequences',
      '',
      '{consequences}',
      '',
    ].join('\n'),
    'utf8',
  );
}

describe('createDecisionRecord', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('writes a record from the stripped template and regenerates the index', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-new-'));
    tempDirs.push(root);
    const decisionsRoot = join(root, '.oat', 'repo', 'reference', 'decisions');
    const templatesRoot = join(root, '.oat', 'templates');
    const assetsRoot = join(root, 'assets');
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await seedDecisionTemplate(templatesRoot);

    const result = await createDecisionRecord({
      decisionsRoot,
      assetsRoot,
      templatesRoot,
      title: 'Adopt PJM Split',
      status: 'accepted',
      context: 'Shared monoliths collide across worktrees.',
      createdAt: '2026-06-22T10:30:00Z',
    });

    expect(result.id).toBe('dr-260622-adopt-pjm-split');
    const record = await readFile(result.filePath, 'utf8');
    expect(record).toContain('id: dr-260622-adopt-pjm-split');
    expect(record).toContain('date: 2026-06-22');
    expect(record).toContain('status: accepted');
    expect(record).toContain('title: Adopt PJM Split');
    expect(record).not.toContain('oat_template:');
    expect(record).toContain('# Adopt PJM Split');
    expect(record).toContain('Shared monoliths collide across worktrees.');

    const index = await readFile(join(decisionsRoot, 'index.md'), 'utf8');
    expect(index).toContain(
      '| dr-260622-adopt-pjm-split | 2026-06-22 | accepted | Adopt PJM Split | - |',
    );
  });

  it('uses bundled templates when a repo-local template is not present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-new-'));
    tempDirs.push(root);
    const decisionsRoot = join(root, 'decisions');
    const assetsRoot = join(root, 'assets');
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await seedDecisionTemplate(join(assetsRoot, 'templates'));

    const result = await createDecisionRecord({
      decisionsRoot,
      assetsRoot,
      title: 'Bundled Template',
      createdAt: '2026-06-22T10:30:00Z',
    });

    await expect(readFile(result.filePath, 'utf8')).resolves.toContain(
      '# Bundled Template',
    );
  });

  it('fails on a same-day same-slug collision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-new-'));
    tempDirs.push(root);
    const decisionsRoot = join(root, 'decisions');
    const templatesRoot = join(root, '.oat', 'templates');
    const assetsRoot = join(root, 'assets');
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await seedDecisionTemplate(templatesRoot);

    await createDecisionRecord({
      decisionsRoot,
      assetsRoot,
      templatesRoot,
      title: 'Collision',
      createdAt: '2026-06-22T10:30:00Z',
    });

    await expect(
      createDecisionRecord({
        decisionsRoot,
        assetsRoot,
        templatesRoot,
        title: 'Collision',
        createdAt: '2026-06-22T11:30:00Z',
      }),
    ).rejects.toThrow(
      'Decision record dr-260622-collision already exists. Use a more specific title to disambiguate.',
    );
  });

  it('fails before writing when the decision index scaffold is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-new-'));
    tempDirs.push(root);
    const decisionsRoot = join(root, 'decisions');
    const templatesRoot = join(root, '.oat', 'templates');
    const assetsRoot = join(root, 'assets');
    await mkdir(decisionsRoot, { recursive: true });
    await seedDecisionTemplate(templatesRoot);

    await expect(
      createDecisionRecord({
        decisionsRoot,
        assetsRoot,
        templatesRoot,
        title: 'No Index',
        createdAt: '2026-06-22T10:30:00Z',
      }),
    ).rejects.toThrow('Run `oat decision init`');

    await expect(
      pathExists(join(decisionsRoot, 'dr-260622-no-index.md')),
    ).resolves.toBe(false);
  });

  it('rolls back the new record when index regeneration fails after writing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-new-'));
    tempDirs.push(root);
    const decisionsRoot = join(root, 'decisions');
    const templatesRoot = join(root, '.oat', 'templates');
    const assetsRoot = join(root, 'assets');
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await seedDecisionTemplate(templatesRoot);
    await writeFile(
      join(decisionsRoot, 'bad.md'),
      ['---', 'title: [unterminated', '---', '', '# Bad'].join('\n'),
      'utf8',
    );

    await expect(
      createDecisionRecord({
        decisionsRoot,
        assetsRoot,
        templatesRoot,
        title: 'Rollback',
        createdAt: '2026-06-22T10:30:00Z',
      }),
    ).rejects.toThrow();

    await expect(
      pathExists(join(decisionsRoot, 'dr-260622-rollback.md')),
    ).resolves.toBe(false);
    await expect(pathExists(join(decisionsRoot, 'bad.md'))).resolves.toBe(true);
  });
});
