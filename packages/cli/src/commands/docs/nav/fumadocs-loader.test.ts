import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { toFumadocsPageItem } from './fumadocs';
import { syncDocsNavigation } from './sync';

/**
 * Checks generated `meta.json` against the real page-tree loader from the
 * fumadocs-core the docs app installs (16.10.2), not against a model of it:
 * every page nav sync does not report as unlisted must be in the tree.
 */
const docsAppPackageJson = fileURLToPath(
  new URL('../../../../../../apps/oat-docs/package.json', import.meta.url),
);

interface PageTreeNode {
  type: string;
  $ref?: string;
  index?: PageTreeNode;
  children?: PageTreeNode[];
  name?: string;
  url?: string;
}

type FumadocsLoader = (options: {
  baseUrl: string;
  source: { files: Array<Record<string, unknown>> };
}) => { pageTree: PageTreeNode; getPages(): { path: string; url: string }[] };

async function importFumadocsLoader(): Promise<FumadocsLoader> {
  const require = createRequire(docsAppPackageJson);
  const module = (await import(
    pathToFileURL(require.resolve('fumadocs-core/source')).href
  )) as { loader: FumadocsLoader };
  return module.loader;
}

async function listFiles(root: string, dir = '.'): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const path = posix.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

async function sourceFiles(
  docsRoot: string,
): Promise<Array<Record<string, unknown>>> {
  const files: Array<Record<string, unknown>> = [];
  for (const path of await listFiles(docsRoot)) {
    if (path.endsWith('meta.json')) {
      files.push({
        type: 'meta',
        path,
        data: JSON.parse(await readFile(join(docsRoot, path), 'utf8')),
      });
    } else if (['.md', '.mdx'].includes(extname(path))) {
      files.push({ type: 'page', path, data: { title: path } });
    }
  }
  return files;
}

/** Docs-relative paths of every page the real loader puts in the tree. */
async function pagesInLoadedTree(docsRoot: string): Promise<string[]> {
  return pagesInTreeOf(await sourceFiles(docsRoot));
}

async function pagesInTreeOf(
  files: Array<Record<string, unknown>>,
): Promise<string[]> {
  const loader = await importFumadocsLoader();
  const pages: string[] = [];
  const walk = (node: PageTreeNode): void => {
    if (node.type === 'page' && node.$ref) pages.push(node.$ref);
    if (node.index?.$ref) pages.push(node.index.$ref);
    for (const child of node.children ?? []) walk(child);
  };
  walk(loader({ baseUrl: '/', source: { files } }).pageTree);
  return pages.sort();
}

async function writeApp(
  root: string,
  sectionMeta: Record<string, unknown> | null,
): Promise<string> {
  const appRoot = join(root, 'app');
  const docsRoot = join(appRoot, 'docs');
  await mkdir(join(docsRoot, 'section'), { recursive: true });
  await writeFile(join(appRoot, 'source.config.ts'), 'export {};\n', 'utf8');
  await writeFile(
    join(docsRoot, 'index.md'),
    '# Home\n\n## Contents\n\n- [Section](section/index.md) - section\n',
    'utf8',
  );
  await writeFile(
    join(docsRoot, 'section', 'index.md'),
    '# Section\n\n## Contents\n\n- [Leaf](leaf.md) - leaf\n',
    'utf8',
  );
  await writeFile(join(docsRoot, 'section', 'leaf.md'), '# Leaf\n', 'utf8');
  if (sectionMeta) {
    await writeFile(
      join(docsRoot, 'section', 'meta.json'),
      `${JSON.stringify(sectionMeta)}\n`,
      'utf8',
    );
  }
  return appRoot;
}

const ALL_PAGES = ['index.md', 'section/index.md', 'section/leaf.md'];

describe('generated meta.json against the installed Fumadocs loader', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots.length = 0;
  });

  async function scratch(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-fuma-loader-'));
    roots.push(root);
    return root;
  }

  it('keeps a same-name page and folder index reachable at their installed-loader URLs', async () => {
    // Reproduces the p05 contributing.md + contributing/index.md scaffold,
    // using fumadocs-core 16.10.2's real file-reference and slug behavior.
    const appRoot = await writeApp(await scratch(), null);
    const docsRoot = join(appRoot, 'docs');
    await mkdir(join(docsRoot, 'other'));
    await writeFile(join(docsRoot, 'section.md'), '# Authoring contract\n');
    await writeFile(join(docsRoot, 'widget.mdx'), '# Widget\n');
    await writeFile(join(docsRoot, 'hidden.md'), '# Unlisted control\n');
    await writeFile(
      join(docsRoot, 'index.md'),
      '# Home\n\n## Contents\n- [Section](section/index.md)\n- [Other](other/index.md)\n- [Widget](widget.mdx)\n',
    );
    await writeFile(
      join(docsRoot, 'section/index.md'),
      '# Section\n\n## Contents\n- [Authoring contract](../section.md#contract)\n- [Leaf](leaf.md)\n',
    );
    await writeFile(
      join(docsRoot, 'other/index.md'),
      '# Other\n\n## Contents\n- [Section landing](../section/index.md)\n- [Elsewhere contract](../section.md#contract)\n',
    );
    const result = await syncDocsNavigation({ appRoot });
    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.unlisted).toEqual(['hidden.md']);
    const expected = [
      ...ALL_PAGES,
      'section.md',
      'other/index.md',
      'widget.mdx',
    ].sort();
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual(expected);
    const sectionMeta = JSON.parse(
      await readFile(join(docsRoot, 'section/meta.json'), 'utf8'),
    );
    expect(sectionMeta.pages).toEqual(['../section.md', 'leaf']);
    const otherMeta = JSON.parse(
      await readFile(join(docsRoot, 'other/meta.json'), 'utf8'),
    );
    expect
      .soft(otherMeta.pages)
      .toEqual([
        '[Section landing](/section/index)',
        '[Elsewhere contract](/section#contract)',
      ]);
    const loader = await importFumadocsLoader();
    // Consume actual synchronized files. The installed loader globally dedups
    // source references, but an unrelated authored URL must remain a link.
    const tree = loader({
      baseUrl: '/',
      source: { files: await sourceFiles(docsRoot) },
    }).pageTree;
    expect
      .soft(tree.children?.find((node) => node.name === 'Other'))
      .toMatchObject({
        children: [
          { type: 'page', name: 'Section landing', url: '/section/index' },
          {
            type: 'page',
            name: 'Elsewhere contract',
            url: '/section#contract',
          },
        ],
      });
    expect(
      tree.children?.find((node) => node.name === 'Section'),
    ).toMatchObject({
      children: [
        { type: 'page', $ref: 'section.md', url: '/section' },
        { type: 'page', $ref: 'section/leaf.md', url: '/section/leaf' },
      ],
    });
    const loaded = loader({
      baseUrl: '/',
      source: {
        files: [
          { type: 'page', path: 'section.md', data: { title: 'Contract' } },
          { type: 'page', path: 'section/index.md', data: { title: 'Guides' } },
        ],
      },
    });
    expect(
      loaded
        .getPages()
        .map((page) => [page.path, page.url])
        .sort(),
    ).toEqual([
      ['section.md', '/section'],
      ['section/index.md', '/section/index'],
    ]);
    const check = await syncDocsNavigation({ appRoot, check: true });
    if (check.framework !== 'fumadocs') throw new Error('unreachable');
    expect(check.stale).toEqual([]);
    expect(check.unlisted).toEqual(['hidden.md']);
    // A URL link alone never claims an unlisted source page as reachable.
    await writeFile(
      join(docsRoot, 'section/index.md'),
      '# Section\n\n## Contents\n- [Leaf](leaf.md)\n',
    );
    const removed = await syncDocsNavigation({ appRoot });
    if (removed.framework !== 'fumadocs') throw new Error('unreachable');
    expect(removed.unlisted).toEqual(['hidden.md', 'section.md']);
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual(
      expected.filter((path) => path !== 'section.md'),
    );
  });

  it('keeps an ordinary folder landing page implicit and in the tree', async () => {
    const appRoot = await writeApp(await scratch(), null);
    const docsRoot = join(appRoot, 'docs');

    const result = await syncDocsNavigation({ appRoot });

    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.unlisted).toEqual([]);
    const sectionMeta = JSON.parse(
      await readFile(join(docsRoot, 'section', 'meta.json'), 'utf8'),
    ) as { pages: string[] };
    expect(sectionMeta.pages).toEqual(['leaf']);
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual(ALL_PAGES);

    const check = await syncDocsNavigation({ appRoot, check: true });
    if (check.framework !== 'fumadocs') throw new Error('unreachable');
    expect(check.stale).toEqual([]);
    expect(check.unlisted).toEqual([]);
  });

  it('keeps an index-only leaf with same-page anchor Contents as its landing page alone', async () => {
    const appRoot = await writeApp(await scratch(), null);
    const docsRoot = join(appRoot, 'docs');
    await rm(join(docsRoot, 'section', 'leaf.md'));
    await writeFile(
      join(docsRoot, 'section', 'index.md'),
      '# Section\n\n## Contents\n\n- [Setup](#setup) - setup\n- [Usage](#usage) - usage\n\n## Setup\n\n## Usage\n',
      'utf8',
    );

    const result = await syncDocsNavigation({ appRoot });

    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.unlisted).toEqual([]);
    const sectionMeta = JSON.parse(
      await readFile(join(docsRoot, 'section', 'meta.json'), 'utf8'),
    ) as { pages: string[] };
    expect(sectionMeta.pages).toEqual([]);
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual([
      'index.md',
      'section/index.md',
    ]);
  });

  it('lists a root: true folder landing page explicitly so the loader keeps it', async () => {
    const appRoot = await writeApp(await scratch(), { root: true });
    const docsRoot = join(appRoot, 'docs');

    const result = await syncDocsNavigation({ appRoot });

    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.unlisted).toEqual([]);
    await expect(
      readFile(join(docsRoot, 'section', 'meta.json'), 'utf8').then(
        (text) => JSON.parse(text) as unknown,
      ),
    ).resolves.toEqual({
      root: true,
      title: 'Section',
      pages: ['index', 'leaf'],
    });
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual(ALL_PAGES);

    const check = await syncDocsNavigation({ appRoot, check: true });
    if (check.framework !== 'fumadocs') throw new Error('unreachable');
    expect(check.stale).toEqual([]);
    expect(check.unlisted).toEqual([]);
  });

  it('renders ordered separators and retains a named root landing page', async () => {
    const appRoot = await writeApp(await scratch(), {
      root: ' Named section ',
    });
    const docsRoot = join(appRoot, 'docs');
    await writeFile(
      join(docsRoot, 'section', 'index.md'),
      '# Section\n\n## Contents\n### Landing only\n- [Self](index.md)\n### [Literal] group\n- [Leaf](leaf.md)\n',
    );
    const result = await syncDocsNavigation({ appRoot });
    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.unlisted).toEqual([]);
    const meta = JSON.parse(
      await readFile(join(docsRoot, 'section', 'meta.json'), 'utf8'),
    );
    expect(meta).toEqual({
      root: ' Named section ',
      title: 'Section',
      pages: ['index', '--- [Literal] group---', 'leaf'],
    });
    const require = createRequire(docsAppPackageJson);
    const { loader } = await import(
      pathToFileURL(require.resolve('fumadocs-core/source')).href
    );
    const tree = loader({
      baseUrl: '/',
      source: {
        files: [
          { type: 'meta', path: 'meta.json', data: { pages: ['section'] } },
          { type: 'meta', path: 'section/meta.json', data: meta },
          {
            type: 'page',
            path: 'section/index.md',
            data: { title: 'Section' },
          },
          { type: 'page', path: 'section/leaf.md', data: { title: 'Leaf' } },
        ],
      },
    }).pageTree;
    expect(
      tree.children[0].children.map((node: { type: string; name: string }) => [
        node.type,
        node.name,
      ]),
    ).toEqual([
      ['page', 'Section'],
      ['separator', ' [Literal] group'],
      ['page', 'Leaf'],
    ]);
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual(ALL_PAGES);
  });

  it('--check flags a root: true folder whose meta.json drops the landing page', async () => {
    // What an earlier nav sync wrote: the loader hides section/index.md.
    const appRoot = await writeApp(await scratch(), {
      root: true,
      title: 'Section',
      pages: ['leaf'],
    });
    const docsRoot = join(appRoot, 'docs');
    await syncDocsNavigation({ appRoot });
    await writeFile(
      join(docsRoot, 'section', 'meta.json'),
      `${JSON.stringify({ root: true, title: 'Section', pages: ['leaf'] })}\n`,
      'utf8',
    );
    await expect(pagesInLoadedTree(docsRoot)).resolves.not.toContain(
      'section/index.md',
    );

    const check = await syncDocsNavigation({ appRoot, check: true });

    if (check.framework !== 'fumadocs') throw new Error('unreachable');
    expect(check.stale).toEqual(['section/meta.json']);
  });

  it('escapes directive-like page and folder names so the loader keeps them', async () => {
    const appRoot = join(await scratch(), 'app');
    const docsRoot = join(appRoot, 'docs');
    await mkdir(join(docsRoot, '!drafts'), { recursive: true });
    await writeFile(join(appRoot, 'source.config.ts'), 'export {};\n', 'utf8');
    await writeFile(
      join(docsRoot, 'index.md'),
      [
        '# Home',
        '',
        '## Contents',
        '',
        '- [Hidden](!hidden.md) - exclusion prefix',
        '- [Reversed](z...a.md) - reversed rest entry',
        '- [Divider](---.md) - separator',
        '- [Plain](plain.md) - ordinary name',
        '- [Drafts](!drafts/index.md) - folder with an exclusion prefix',
        '',
      ].join('\n'),
      'utf8',
    );
    for (const name of ['!hidden', 'z...a', '---', 'plain']) {
      await writeFile(join(docsRoot, `${name}.md`), `# ${name}\n`, 'utf8');
    }
    await writeFile(
      join(docsRoot, '!drafts', 'index.md'),
      '# Drafts\n\n## Contents\n\n- [Draft](draft.md) - draft\n',
      'utf8',
    );
    await writeFile(join(docsRoot, '!drafts', 'draft.md'), '# Draft\n', 'utf8');

    const result = await syncDocsNavigation({ appRoot });

    if (result.framework !== 'fumadocs') throw new Error('unreachable');
    expect(result.unlisted).toEqual([]);
    const rootMeta = JSON.parse(
      await readFile(join(docsRoot, 'meta.json'), 'utf8'),
    ) as { pages: string[] };
    expect(rootMeta.pages).toEqual([
      'index',
      './!hidden',
      './z...a',
      './---',
      'plain',
      './!drafts',
    ]);
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual(
      [
        '!drafts/draft.md',
        '!drafts/index.md',
        '!hidden.md',
        '---.md',
        'index.md',
        'plain.md',
        'z...a.md',
      ].sort(),
    );

    const check = await syncDocsNavigation({ appRoot, check: true });
    if (check.framework !== 'fumadocs') throw new Error('unreachable');
    expect(check.stale).toEqual([]);
    expect(check.unlisted).toEqual([]);
  });

  it('--check flags an unescaped directive-like entry the loader drops', async () => {
    const appRoot = join(await scratch(), 'app');
    const docsRoot = join(appRoot, 'docs');
    await mkdir(docsRoot, { recursive: true });
    await writeFile(join(appRoot, 'source.config.ts'), 'export {};\n', 'utf8');
    await writeFile(
      join(docsRoot, 'index.md'),
      '# Home\n\n## Contents\n\n- [Hidden](!hidden.md) - hidden\n',
      'utf8',
    );
    await writeFile(join(docsRoot, '!hidden.md'), '# Hidden\n', 'utf8');
    // What an unescaped nav sync wrote: the loader reads `!hidden` as an
    // exclusion and drops the page.
    await writeFile(
      join(docsRoot, 'meta.json'),
      `${JSON.stringify({ title: 'Home', pages: ['index', '!hidden'] })}\n`,
      'utf8',
    );
    await expect(pagesInLoadedTree(docsRoot)).resolves.toEqual(['index.md']);

    const check = await syncDocsNavigation({ appRoot, check: true });

    if (check.framework !== 'fumadocs') throw new Error('unreachable');
    expect(check.stale).toEqual(['meta.json']);
    expect(check.unlisted).toEqual([]);
  });

  it('writes every loader directive form as a local path the loader resolves', async () => {
    // Each name is one the fumadocs-core 16.10.2 builder would otherwise read
    // as a rest, extract, exclude, separator, or link directive.
    const names = [
      '...',
      'z...a',
      '...folder',
      '!hidden',
      '---',
      '---Group---',
      '[a](b)',
      'external:[a](b)',
    ];
    const files: Array<Record<string, unknown>> = [
      {
        type: 'meta',
        path: 'meta.json',
        data: { pages: ['index', ...names.map(toFumadocsPageItem)] },
      },
      { type: 'page', path: 'index.md', data: { title: 'index' } },
      ...names.map((name) => ({
        type: 'page',
        path: `${name}.md`,
        data: { title: name },
      })),
    ];

    for (const name of names) {
      expect(toFumadocsPageItem(name)).toBe(`./${name}`);
    }
    for (const name of [
      'plain',
      'index',
      '(group)',
      'a...b',
      'x!',
      '.hidden',
    ]) {
      expect(toFumadocsPageItem(name)).toBe(name);
    }
    await expect(pagesInTreeOf(files)).resolves.toEqual(
      ['index.md', ...names.map((name) => `${name}.md`)].sort(),
    );
  });
});
