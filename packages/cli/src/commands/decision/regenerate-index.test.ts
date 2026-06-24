import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const readdirMode = vi.hoisted(() => ({ reverseDecisionsRoot: false }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    readdir: async (...args: any[]) => {
      const result = await actual.readdir(...(args as [any, any]));
      const [target] = args;

      if (
        readdirMode.reverseDecisionsRoot &&
        typeof target === 'string' &&
        target.endsWith('/decisions') &&
        Array.isArray(result)
      ) {
        return [...result].reverse();
      }

      return result;
    },
  };
});

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

import { initializeDecisionRecords } from './init';
import { regenerateDecisionIndex } from './regenerate-index';

async function writeDecisionRecord(
  decisionsRoot: string,
  fileName: string,
  frontmatter: Record<string, string>,
): Promise<void> {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  await writeFile(
    join(decisionsRoot, fileName),
    `---\n${yaml}\n---\n\n## Context\n\nPreserved body.\n`,
    'utf8',
  );
}

describe('regenerateDecisionIndex', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    readdirMode.reverseDecisionsRoot = false;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('renders the locked columns and an empty row', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-index-'));
    const decisionsRoot = join(root, 'decisions');
    tempDirs.push(root);
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);

    await regenerateDecisionIndex(decisionsRoot);

    const index = await readFile(join(decisionsRoot, 'index.md'), 'utf8');
    expect(index).toContain('| ID | Date | Status | Title | Legacy |');
    expect(index).toContain('| _No decisions yet_ | - | - | - | - |');
  });

  it('sorts by date descending and id ascending while rendering legacy ids', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-index-'));
    const decisionsRoot = join(root, 'decisions');
    tempDirs.push(root);
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);

    await writeDecisionRecord(decisionsRoot, 'zeta.md', {
      id: 'DR-260623-zeta',
      title: '"Zeta"',
      date: '2026-06-23',
      status: 'accepted',
      legacy_id: 'ADR-002',
    });
    await writeDecisionRecord(decisionsRoot, 'alpha.md', {
      id: 'DR-260623-alpha',
      title: '"Alpha"',
      date: '2026-06-23',
      status: 'proposed',
    });
    await writeDecisionRecord(decisionsRoot, 'older.md', {
      id: 'DR-260622-older',
      title: '"Older"',
      date: '2026-06-22',
      status: 'superseded',
      legacy_id: 'DR-001',
    });

    await regenerateDecisionIndex(decisionsRoot);

    const index = await readFile(join(decisionsRoot, 'index.md'), 'utf8');
    expect(index).toContain(
      [
        '| DR-260623-alpha | 2026-06-23 | proposed | Alpha | - |',
        '| DR-260623-zeta | 2026-06-23 | accepted | Zeta | ADR-002 |',
        '| DR-260622-older | 2026-06-22 | superseded | Older | DR-001 |',
      ].join('\n'),
    );
  });

  it('is byte-identical when readdir returns entries in a different order', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-index-'));
    const decisionsRoot = join(root, 'decisions');
    tempDirs.push(root);
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await writeDecisionRecord(decisionsRoot, 'zeta.md', {
      id: 'DR-260623-zeta',
      title: '"Zeta"',
      date: '2026-06-23',
      status: 'accepted',
    });
    await writeDecisionRecord(decisionsRoot, 'alpha.md', {
      id: 'DR-260623-alpha',
      title: '"Alpha"',
      date: '2026-06-23',
      status: 'accepted',
    });

    await regenerateDecisionIndex(decisionsRoot);
    const normal = await readFile(join(decisionsRoot, 'index.md'), 'utf8');

    readdirMode.reverseDecisionsRoot = true;
    await regenerateDecisionIndex(decisionsRoot);
    const reversed = await readFile(join(decisionsRoot, 'index.md'), 'utf8');

    expect(reversed).toBe(normal);
  });

  it('leaves the file bytes unchanged when a formatter re-pads the managed table', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-index-'));
    const decisionsRoot = join(root, 'decisions');
    tempDirs.push(root);
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await writeDecisionRecord(decisionsRoot, 'alpha.md', {
      id: 'DR-260623-alpha',
      title: '"Alpha"',
      date: '2026-06-23',
      status: 'accepted',
    });

    await regenerateDecisionIndex(decisionsRoot);
    const indexPath = join(decisionsRoot, 'index.md');
    const generated = await readFile(indexPath, 'utf8');

    // Simulate an external formatter re-padding each managed table cell to a
    // wider, aligned column width without changing logical content.
    const reformatted = generated
      .replace(
        '| ID | Date | Status | Title | Legacy |',
        '| ID            | Date       | Status   | Title | Legacy |',
      )
      .replace(
        '| --- | --- | --- | --- | --- |',
        '| ------------- | ---------- | -------- | ----- | ------ |',
      )
      .replace(
        '| DR-260623-alpha | 2026-06-23 | accepted | Alpha | - |',
        '| DR-260623-alpha | 2026-06-23 | accepted | Alpha | -      |',
      );
    expect(reformatted).not.toBe(generated);
    await writeFile(indexPath, reformatted, 'utf8');

    await regenerateDecisionIndex(decisionsRoot);

    const afterRegen = await readFile(indexPath, 'utf8');
    expect(afterRegen).toBe(reformatted);
  });

  it('rewrites the managed block to canonical form when a record is added', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-index-'));
    const decisionsRoot = join(root, 'decisions');
    tempDirs.push(root);
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await writeDecisionRecord(decisionsRoot, 'alpha.md', {
      id: 'DR-260623-alpha',
      title: '"Alpha"',
      date: '2026-06-23',
      status: 'accepted',
    });

    await regenerateDecisionIndex(decisionsRoot);
    const indexPath = join(decisionsRoot, 'index.md');
    const beforeAdd = await readFile(indexPath, 'utf8');

    await writeDecisionRecord(decisionsRoot, 'beta.md', {
      id: 'DR-260623-beta',
      title: '"Beta"',
      date: '2026-06-23',
      status: 'proposed',
    });

    await regenerateDecisionIndex(decisionsRoot);

    const afterAdd = await readFile(indexPath, 'utf8');
    expect(afterAdd).not.toBe(beforeAdd);
    expect(afterAdd).toContain(
      '| DR-260623-beta | 2026-06-23 | proposed | Beta | - |',
    );
  });

  it('rewrites the managed block to canonical form when a record is removed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-index-'));
    const decisionsRoot = join(root, 'decisions');
    tempDirs.push(root);
    await mkdir(decisionsRoot, { recursive: true });
    await initializeDecisionRecords(decisionsRoot);
    await writeDecisionRecord(decisionsRoot, 'alpha.md', {
      id: 'DR-260623-alpha',
      title: '"Alpha"',
      date: '2026-06-23',
      status: 'accepted',
    });
    await writeDecisionRecord(decisionsRoot, 'beta.md', {
      id: 'DR-260623-beta',
      title: '"Beta"',
      date: '2026-06-23',
      status: 'proposed',
    });

    await regenerateDecisionIndex(decisionsRoot);
    const indexPath = join(decisionsRoot, 'index.md');
    const beforeRemove = await readFile(indexPath, 'utf8');

    await rm(join(decisionsRoot, 'beta.md'));

    await regenerateDecisionIndex(decisionsRoot);

    const afterRemove = await readFile(indexPath, 'utf8');
    expect(afterRemove).not.toBe(beforeRemove);
    expect(afterRemove).not.toContain('DR-260623-beta');
  });

  it('throws an actionable error when managed markers are missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-decision-index-'));
    const decisionsRoot = join(root, 'decisions');
    tempDirs.push(root);
    await mkdir(decisionsRoot, { recursive: true });
    await writeFile(join(decisionsRoot, 'index.md'), '# Decisions\n', 'utf8');

    await expect(regenerateDecisionIndex(decisionsRoot)).rejects.toThrow(
      'Managed decision index markers missing',
    );
  });
});
