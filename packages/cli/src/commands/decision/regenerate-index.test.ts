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
