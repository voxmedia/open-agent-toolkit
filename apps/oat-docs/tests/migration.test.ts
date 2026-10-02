import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  validateSourceRoutes,
  validateSourceTargets,
  validateTopicMap,
  validateHostedReadmes,
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

test('live skill topic paths reject stale file and directory owners without project inputs', async () => {
  const root = await fixture();
  const skill = join(root, 'SKILL.md');
  const table = (path: string) =>
    `# Docs\n\n| Topic Area | Docs Path | Key Content |\n| --- | --- | --- |\n| Research | \`${path}\` | Research guide |\n`;
  await writeFile(skill, table('skills/research.md#compare-options'));
  assert.equal(await validateTopicMap(root, skill), 1);
  await writeFile(skill, table('workflows/skills/research.md'));
  await assert.rejects(validateTopicMap(root, skill), /unresolved source link/);
  await writeFile(skill, table('workflows/skills/'));
  await assert.rejects(validateTopicMap(root, skill), /unresolved source link/);
  await writeFile(skill, table('skills/research.md#absent'));
  await assert.rejects(
    validateTopicMap(root, skill),
    /unresolved source fragment/,
  );
  await writeFile(skill, table('skills/'));
  await assert.rejects(validateTopicMap(root, skill), /unresolved source link/);
  await writeFile(join(root, 'skills/index.md'), '# Skills\n');
  assert.equal(await validateTopicMap(root, skill), 1);
});

test('hosted README links resolve leaf, landing and real fragments from source only', async () => {
  const root = await fixture();
  const readme = join(root, 'README.md');
  await writeFile(join(root, 'skills/index.md'), '# Skills\n');
  await writeFile(
    readme,
    '[Home](https://voxmedia.github.io/open-agent-toolkit/)\n[Skills](https://voxmedia.github.io/open-agent-toolkit/skills/)\n[Research][research]\n[research]: https://voxmedia.github.io/open-agent-toolkit/skills/research#compare-options\n<https://voxmedia.github.io/open-agent-toolkit/skills/research>\n```md\n[Example](https://voxmedia.github.io/open-agent-toolkit/absent)\n```\n`[Example](https://voxmedia.github.io/open-agent-toolkit/absent)`\n[External](https://example.com/absent)\n',
  );
  const results = await validateHostedReadmes(root, [readme]);
  assert.deepEqual(
    results.map((row) => row.target),
    [
      join(root, 'index.md'),
      join(root, 'skills/index.md'),
      `${join(root, 'skills/research.md')}#compare-options`,
      join(root, 'skills/research.md'),
    ],
  );
});

test('hosted README stale routes and fragments reject while canonical links pass', async () => {
  const root = await fixture();
  const readme = join(root, 'README.md');
  await writeFile(
    readme,
    '[Research](https://voxmedia.github.io/open-agent-toolkit/workflows/skills/research)',
  );
  await assert.rejects(
    validateHostedReadmes(root, [readme]),
    /unresolved.*hosted route/,
  );
  await writeFile(
    readme,
    '[Research](https://voxmedia.github.io/open-agent-toolkit/skills/research#absent)',
  );
  await assert.rejects(
    validateHostedReadmes(root, [readme]),
    /unresolved source fragment/,
  );
  await writeFile(
    readme,
    '[Research](https://voxmedia.github.io/open-agent-toolkit/skills/research#compare-options)',
  );
  assert.equal((await validateHostedReadmes(root, [readme])).length, 1);
});

test('relative inline-code guide citations reject retired owners and accept the real target', async () => {
  const root = await fixture();
  const page = join(root, 'index.md');
  await writeFile(page, '# Home\n\nSee `./workflows/skills/research.md`.\n');
  await assert.rejects(
    validateSourceRoutes(root),
    /unresolved source link \.\/workflows\/skills\/research\.md/,
  );
  await writeFile(page, '# Home\n\nSee `` ./skills/research.md ``.\n');
  await validateSourceRoutes(root);
  await writeFile(
    join(root, 'skills/research.md'),
    '# Research\n\nSee `../index.md#home`.\n',
  );
  await validateSourceRoutes(root);
});

test('relative inline-code fragments are checked against the actual source heading', async () => {
  const root = await fixture();
  const page = join(root, 'index.md');
  await writeFile(page, '# Home\n\nSee `./skills/research.md#absent`.\n');
  await assert.rejects(
    validateSourceRoutes(root),
    /unresolved source fragment \.\/skills\/research\.md#absent/,
  );
  await writeFile(
    page,
    '# Home\n\nSee `./skills/research.md#compare-options`.\n',
  );
  await validateSourceRoutes(root);
});

test('inline-code route validation ignores fenced examples, placeholders, command prose and bare artifacts', async () => {
  const root = await fixture();
  await writeFile(
    join(root, 'index.md'),
    '# Home\n\n`project-log.md` and `node ./absent.md` are not guide pointers.\n`./<page>.md`, `../{owner}.md` and `./*.md` are templates.\n```md\nSee `./absent.md`.\n```\n~~~md\nSee `../absent.md`.\n~~~\n',
  );
  await validateSourceRoutes(root);
});
