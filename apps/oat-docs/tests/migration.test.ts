import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  validateSourceRoutes,
  validateSourceTargets,
} from '@docs-tools/validate';

const roots: string[] = [];
after(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-docs-source-migration-'));
  roots.push(root);
  await mkdir(join(root, 'skills'));
  await writeFile(
    join(root, 'index.md'),
    '# Home\n\n[Research](skills/research.md#compare-options)\n',
  );
  await writeFile(
    join(root, 'skills/research.md'),
    '# Research\n\n## Compare options\n',
  );
  return root;
}

test('consumer targets resolve from live source paths without generated output or project artifacts', async () => {
  const root = await fixture();
  await validateSourceTargets(root, [
    {
      source: join(root, 'index.md'),
      href: 'skills/research.md#compare-options',
    },
    { source: join(root, 'skills/research.md'), href: '../index.md#home' },
  ]);
  await validateSourceRoutes(root);
});

test('a stale pre-move consumer target is rejected while the canonical target passes', async () => {
  const root = await fixture();
  await assert.rejects(
    validateSourceTargets(root, [
      { source: join(root, 'index.md'), href: 'workflows/skills/research.md' },
    ]),
    /unresolved source link workflows\/skills\/research\.md/,
  );
  await validateSourceTargets(root, [
    { source: join(root, 'index.md'), href: 'skills/research.md' },
  ]);
});

test('a moved-page fragment is checked against its actual target heading', async () => {
  const root = await fixture();
  await assert.rejects(
    validateSourceTargets(root, [
      {
        source: join(root, 'index.md'),
        href: 'skills/research.md#missing-heading',
      },
    ]),
    /unresolved source fragment skills\/research\.md#missing-heading/,
  );
  await validateSourceTargets(root, [
    {
      source: join(root, 'index.md'),
      href: 'skills/research.md#compare-options',
    },
  ]);
});
