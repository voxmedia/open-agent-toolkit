import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';

import {
  appRoot,
  repoRoot,
  runNavigation,
  validateSourceRoutes,
} from '@docs-tools/validate';

const roots: string[] = [];
after(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-docs-loader-'));
  roots.push(root);
  for (const [path, title, body] of [
    [
      'index.md',
      'Home',
      '## Contents\n- [Skills](skills/index.md)\n- [Workflows](workflows/index.md)',
    ],
    [
      'skills/index.md',
      'Skills',
      '## Contents\n- [Research](research.md)\n- [After Research](a-last.md)\n- [Project family](../workflows/projects.md#projects)',
    ],
    ['skills/research.md', 'Research', '# Research'],
    ['skills/a-last.md', 'After Research', '# After Research'],
    [
      'workflows/index.md',
      'Workflows',
      '## Contents\n- [Workflows](index.md)\n- [Projects](projects.md)',
    ],
    ['workflows/projects.md', 'Projects', '# Projects'],
  ]) {
    const target = join(root, 'docs', path!);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(
      target,
      `---\ntitle: ${title}\ndescription: Test page\n---\n\n${body}\n`,
    );
  }
  return root;
}

async function consumeRenderedFixture(
  root: string,
  probe: string,
): Promise<void> {
  await symlink(join(appRoot, 'node_modules'), join(root, 'node_modules'));
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(join(root, 'next.config.mjs'), 'export default {};\n');
  await writeFile(
    join(root, 'source.config.ts'),
    "import { defineDocs, defineConfig } from 'fumadocs-mdx/config';\nexport const docs = defineDocs({ dir: './docs' });\nexport default defineConfig({ mdxOptions: { remarkImageOptions: { useImport: false } } });\n",
  );
  const generated = spawnSync(
    join(appRoot, 'node_modules/.bin/fumadocs-mdx'),
    [],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(generated.status, 0, generated.stdout + generated.stderr);
  const probePath = join(root, 'probe.mjs');
  await writeFile(
    probePath,
    `import assert from 'node:assert/strict';\nimport { register } from 'node:module';\nimport { loader } from 'fumadocs-core/source';\nimport { flattenTree } from 'fumadocs-core/page-tree';\nregister('fumadocs-mdx/node/loader', import.meta.url);\nconst { docs } = await import('./.source/server.ts');\nconst loaded = loader({ baseUrl: '/', source: docs.toFumadocsSource() });\n${probe}\n`,
  );
  const consumed = spawnSync(process.execPath, ['--import', 'tsx', probePath], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: join(appRoot, 'tsconfig.docs-tools.json'),
    },
  });
  assert.equal(consumed.status, 0, consumed.stdout + consumed.stderr);
}

test('parsed fragment validation agrees with installed MDX linked, Setext, explicit and colliding headings, not phantom syntax', async () => {
  const root = await fixture();
  await writeFile(
    join(root, 'docs/skills/logo.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
  );
  await writeFile(
    join(root, 'docs/skills/research.md'),
    '---\ntitle: Research\n---\n# Research\n\n## [Guide](https://example.com)\n\nSetext Heading\n--------------\n\n## Clash\n\n## Clash-1\n\n## Clash\n\n## Final [#explicit-id]\n\n## `Code` and *Emphasis*\n\n## Picture ![Ignored alt](logo.svg)\n\n## explicit-id\n\n## Custom [#clash]\n\n## Clash\n',
  );
  await consumeRenderedFixture(
    root,
    "assert.deepEqual(loaded.getPage(['skills', 'research']).data.toc.map(item => item.url), ['#research', '#guide', '#setext-heading', '#clash', '#clash-1', '#clash-2', '#explicit-id', '#code-and-emphasis', '#picture-', '#explicit-id', '#clash', '#clash-3']);",
  );
  const valid =
    '---\ntitle: Skills\n---\n## Contents\n- [Research](research.md)\n- [After Research](a-last.md)\n- [Linked](research.md#guide)\n- [Setext](research.md#setext-heading)\n- [Collision](research.md#clash-2)\n- [Explicit](research.md#explicit-id)\n- [Code emphasis](research.md#code-and-emphasis)\n- [Image](research.md#picture-)\n- [Custom collision](research.md#clash-3)\n';
  await writeFile(join(root, 'docs/skills/index.md'), valid);
  runNavigation(root);
  await validateSourceRoutes(join(root, 'docs'));
  await writeFile(
    join(root, 'docs/skills/index.md'),
    valid.replace('#explicit-id)', '#explicit-id-1)'),
  );
  assert.throws(() => runNavigation(root), /Missing fragment "explicit-id-1"/);
  await assert.rejects(
    validateSourceRoutes(join(root, 'docs')),
    /unresolved source fragment research\.md#explicit-id-1/,
  );
  await writeFile(
    join(root, 'docs/skills/index.md'),
    valid.replace('#guide)', '#guidehttpsexamplecom)'),
  );
  assert.throws(
    () => runNavigation(root),
    /Missing fragment "guidehttpsexamplecom"/,
  );
  await assert.rejects(
    validateSourceRoutes(join(root, 'docs')),
    /unresolved source fragment research\.md#guidehttpsexamplecom/,
  );
  await writeFile(
    join(root, 'docs/skills/index.md'),
    valid.replace('#guide)', '#%E0%A4%A)'),
  );
  assert.throws(
    () => runNavigation(root),
    /Malformed fragment.*%E0%A4%A.*skills\/index\.md/,
  );
  await assert.rejects(
    validateSourceRoutes(join(root, 'docs')),
    /Malformed fragment.*%E0%A4%A.*skills\/index\.md/,
  );
});

test('same-stem source projection is rejected before writes because the installed native loader duplicates the folder', async () => {
  const root = await fixture();
  await mkdir(join(root, 'docs/topic'));
  await writeFile(
    join(root, 'docs/topic.md'),
    '---\ntitle: Topic\n---\n# Topic\n',
  );
  await writeFile(
    join(root, 'docs/topic/index.md'),
    '---\ntitle: Topic Folder\n---\n## Contents\n- [Child](child.md)\n',
  );
  await writeFile(
    join(root, 'docs/topic/child.md'),
    '---\ntitle: Child\n---\n# Child\n',
  );
  await writeFile(
    join(root, 'docs/index.md'),
    '---\ntitle: Home\n---\n## Contents\n- [Skills](skills/index.md)\n- [Workflows](workflows/index.md)\n- [Topic](topic.md)\n- [Topic Folder](topic/index.md)\n',
  );
  await writeFile(
    join(root, 'docs/meta.json'),
    '{"pages":["index","skills","workflows","topic","topic"]}',
  );
  await writeFile(join(root, 'docs/topic/meta.json'), '{"pages":["child"]}');
  await consumeRenderedFixture(
    root,
    "const flat = flattenTree(loaded.pageTree.children); assert.equal(flat.filter(item => item.url === '/topic/child').length, 2); assert.equal(flat.filter(item => item.url === '/topic').length, 0); assert.ok(loaded.getPage(['topic']));",
  );
  await rm(join(root, 'docs/meta.json'));
  await rm(join(root, 'docs/topic/meta.json'));
  assert.throws(
    () => runNavigation(root, null),
    /Ambiguous native.*topic.*rename/i,
  );
  assert.equal(
    (await readdir(join(root, 'docs'))).includes('meta.json'),
    false,
  );
  assert.equal((await readdir(root)).includes('.oat-fumadocs-nav.json'), false);
});

test('fresh source validation has no metadata, MDX or export dependency and rejects invalid sources independently', async () => {
  const root = await fixture();
  runNavigation(root);
  await validateSourceRoutes(join(root, 'docs'));
  assert.deepEqual(await readdir(root), ['docs']);
  assert.equal(
    (await readdir(join(root, 'docs'))).includes('meta.json'),
    false,
  );
  await writeFile(
    join(root, '.oat-fumadocs-nav.json'),
    'invalid generated output',
  );
  runNavigation(root);
  await writeFile(
    join(root, 'docs/skills/research.md'),
    '---\ntitle: Renamed\n---\n# Research\n',
  );
  assert.throws(() => runNavigation(root), /does not match frontmatter/);
});

test('body link and anchor validation checks source targets, excluding fenced examples', async () => {
  const root = await fixture();
  await writeFile(
    join(root, 'docs/skills/research.md'),
    '# Research\n[Broken](missing.md)\n',
  );
  await assert.rejects(
    validateSourceRoutes(join(root, 'docs')),
    /unresolved source link missing.md/,
  );
  await writeFile(
    join(root, 'docs/skills/research.md'),
    '# Research\n[Broken](../workflows/projects.md#missing)\n',
  );
  await assert.rejects(
    validateSourceRoutes(join(root, 'docs')),
    /unresolved source fragment/,
  );
  await writeFile(
    join(root, 'docs/skills/research.md'),
    '# Research\n```md\n[Example](missing.md)\n```\n',
  );
  await validateSourceRoutes(join(root, 'docs'));
});

test('generated inputs pass installed MDX and loader consumers with canonical ownership, breadcrumbs and neighbours', async () => {
  const root = await fixture();
  runNavigation(root, null);
  assert.equal((await readdir(join(root, 'docs'))).includes('meta.json'), true);
  await symlink(join(appRoot, 'node_modules'), join(root, 'node_modules'));
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(join(root, 'next.config.mjs'), 'export default {};\n');
  await writeFile(
    join(root, 'source.config.ts'),
    "import { defineDocs, defineConfig } from 'fumadocs-mdx/config';\nexport const docs = defineDocs({ dir: './docs' });\nexport default defineConfig();\n",
  );
  const generated = spawnSync(
    join(appRoot, 'node_modules/.bin/fumadocs-mdx'),
    [],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(generated.status, 0, generated.stdout + generated.stderr);
  const probe = `
    import assert from 'node:assert/strict';
    import { register } from 'node:module';
    import { loader } from 'fumadocs-core/source';
    import { flattenTree, findNeighbour } from 'fumadocs-core/page-tree';
    import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb';
    register('fumadocs-mdx/node/loader', import.meta.url);
    const { docs } = await import('./.source/server.ts');
    const loaded = loader({ baseUrl: '/', source: docs.toFumadocsSource() });
    const tree = loaded.pageTree;
    assert.deepEqual(tree.children.map(node => node.name), ['Home', 'Skills', 'Workflows']);
    const flat = flattenTree(tree.children);
    assert.equal(flat.filter(node => node.url === '/').length, 1);
    assert.equal(flat.filter(node => node.url === '/workflows').length, 1);
    const workflow = tree.children[2];
    assert.deepEqual(tree.children[1].children.map(node => node.name), ['Research', 'After Research']);
    assert.equal(workflow.index.url, '/workflows');
    assert.equal(workflow.children[0].url, '/workflows/projects');
    assert.deepEqual(getBreadcrumbItems('/workflows/projects', tree, { includePage: true }).map(item => item.name), ['Workflows', 'Projects']);
    assert.equal(findNeighbour(tree, '/workflows/projects').previous.url, '/workflows');
    assert.equal(findNeighbour(tree, '/skills/research').next.url, '/skills/a-last');
    assert.equal(findNeighbour(tree, '/skills/a-last').next.url, '/workflows');
    assert.equal(findNeighbour(tree, '/workflows').previous.url, '/skills/a-last');
    assert.equal(loaded.getPage(['skills', 'research']).data.title, 'Research');
    assert.equal(loaded.getPage(['skills', 'research']).data.toc[0].url, '#research');
    process.stdout.write(JSON.stringify({ order: tree.children.map(node => node.name), traversal: flat.map(node => node.url), previous: findNeighbour(tree, '/workflows/projects').previous.url }));
  `;
  const probePath = join(root, 'probe.mjs');
  await writeFile(probePath, probe);
  const consumed = spawnSync(process.execPath, ['--import', 'tsx', probePath], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: join(appRoot, 'tsconfig.docs-tools.json'),
    },
  });
  assert.equal(consumed.status, 0, consumed.stdout + consumed.stderr);
  assert.match(consumed.stdout, /"previous":"\/workflows"/);
  assert.equal((await readdir(root)).includes('out'), false);
});

test('real source validation uses the branch CLI rather than installed output', async () => {
  assert.equal(resolve(repoRoot, 'apps/oat-docs'), appRoot);
  runNavigation(appRoot);
  await validateSourceRoutes(join(appRoot, 'docs'));
  assert.equal(
    (await readFile(join(appRoot, 'package.json'), 'utf8')).includes(
      'cli:source',
    ),
    true,
  );
});
