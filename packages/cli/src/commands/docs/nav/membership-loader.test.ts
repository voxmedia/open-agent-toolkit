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
import { dirname, extname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { syncFumadocsNavigation } from './fumadocs';
import { compareFumadocsMembership } from './membership';

/**
 * The hand-authored membership comparison against the real page-tree loader
 * of the fumadocs-core the docs app installs (16.10.2): a Contents page is
 * reported missing exactly when the loaded sidebar tree neither contains it
 * nor links to its URL.
 */
const docsAppPackageJson = fileURLToPath(
  new URL('../../../../../../apps/oat-docs/package.json', import.meta.url),
);

interface PageTreeNode {
  type: string;
  $ref?: string;
  url?: string;
  index?: PageTreeNode;
  children?: PageTreeNode[];
}

type FumadocsLoader = (options: {
  baseUrl: string;
  source: { files: Array<Record<string, unknown>> };
}) => { pageTree: PageTreeNode };

const URL_TO_PAGE: Record<string, string> = {
  '/': 'index.md',
  '/guide': 'guide.md',
  '/section': 'section/index.md',
  '/section/leaf': 'section/leaf.md',
};
const ALL_PAGES = Object.values(URL_TO_PAGE).sort();

async function loaderVisiblePages(docsRoot: string): Promise<Set<string>> {
  const require = createRequire(docsAppPackageJson);
  const { loader } = (await import(
    pathToFileURL(require.resolve('fumadocs-core/source')).href
  )) as { loader: FumadocsLoader };
  const files: Array<Record<string, unknown>> = [];
  const walkDir = async (dir: string): Promise<void> => {
    for (const entry of await readdir(join(docsRoot, dir), {
      withFileTypes: true,
    })) {
      const path = posix.join(dir, entry.name);
      if (entry.isDirectory()) await walkDir(path);
      else if (entry.name === 'meta.json')
        files.push({
          type: 'meta',
          path,
          data: JSON.parse(await readFile(join(docsRoot, path), 'utf8')),
        });
      else if (extname(path) === '.md')
        files.push({ type: 'page', path, data: { title: path } });
    }
  };
  await walkDir('.');
  const visible = new Set<string>();
  const visit = (node: PageTreeNode): void => {
    if (node.type === 'page') {
      if (node.$ref) visible.add(node.$ref);
      else if (node.url && URL_TO_PAGE[node.url])
        visible.add(URL_TO_PAGE[node.url]!);
    }
    if (node.index) visit(node.index);
    for (const child of node.children ?? []) visit(child);
  };
  // The sidebar renders the root node's children, never a root index.
  for (const child of loader({ baseUrl: '/', source: { files } }).pageTree
    .children ?? [])
    visit(child);
  return visible;
}

async function membershipMissingPages(docsRoot: string): Promise<string[]> {
  const { metaFiles } = await syncFumadocsNavigation({
    docsRoot,
    check: true,
  });
  const issues = await compareFumadocsMembership(docsRoot, metaFiles);
  expect(issues.filter((issue) => issue.kind !== 'missing')).toEqual([]);
  return issues
    .map((issue) => {
      const [, kind, name] = issue.message.match(
        /^Missing reader (page|folder): "([^"]+)"/,
      )!;
      expect(kind).toBe('page');
      return `${posix.join(posix.dirname(issue.path), name!)}.md`;
    })
    .sort();
}

const contents = (title: string, links: string[]): string =>
  `# ${title}\n\n## Contents\n\n${links.map((link) => `- ${link} - entry`).join('\n')}\n`;

async function writeDocs(
  roots: string[],
  metas: Record<string, unknown>,
): Promise<string> {
  const docsRoot = await mkdtemp(join(tmpdir(), 'oat-membership-loader-'));
  roots.push(docsRoot);
  const files: Record<string, string> = {
    'index.md': contents('Home', [
      '[Guide](guide.md)',
      '[Section](section/index.md)',
    ]),
    'guide.md': '# Guide\n',
    'section/index.md': contents('Section', ['[Leaf](leaf.md)']),
    'section/leaf.md': '# Leaf\n',
  };
  for (const [path, data] of Object.entries(metas))
    files[path] = `${JSON.stringify(data, null, 2)}\n`;
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(docsRoot, path)), { recursive: true });
    await writeFile(join(docsRoot, path), text);
  }
  return docsRoot;
}

describe('hand-authored membership against the installed Fumadocs loader', () => {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(
      roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  const listedRoot = { pages: ['index', 'guide', 'section'] };
  it.each([
    // The loader drops the docs root's own index, so a root pagesIndex does
    // not put the landing page in the sidebar; listing or linking it does.
    [
      'root pagesIndex',
      { 'meta.json': { pagesIndex: 'index', pages: ['guide', 'section'] } },
      ['index.md'],
    ],
    ['root lists index', { 'meta.json': listedRoot }, []],
    // pagesIndex reserves index.md for the root folder index, which the loader
    // drops, so rest entries do not bring it back.
    [
      'root pagesIndex with rest',
      { 'meta.json': { pagesIndex: 'index', pages: ['...'] } },
      ['index.md'],
    ],
    [
      'root pagesIndex with reverse rest',
      { 'meta.json': { pagesIndex: 'index', pages: ['z...a'] } },
      ['index.md'],
    ],
    ['root rest', { 'meta.json': { pages: ['...'] } }, []],
    [
      'root pagesIndex listing index with rest',
      { 'meta.json': { pagesIndex: 'index', pages: ['index', '...'] } },
      [],
    ],
    [
      'root links home',
      { 'meta.json': { pages: ['[Home](/)', 'guide', 'section'] } },
      [],
    ],
    // Root folders (root: true or a named root) get no implicit index.
    [
      'root: true without index',
      {
        'meta.json': listedRoot,
        'section/meta.json': { root: true, pages: ['leaf'] },
      },
      ['section/index.md'],
    ],
    [
      'named root without index',
      {
        'meta.json': listedRoot,
        'section/meta.json': { root: 'Section docs', pages: ['leaf'] },
      },
      ['section/index.md'],
    ],
    [
      'root: true with pagesIndex',
      {
        'meta.json': listedRoot,
        'section/meta.json': {
          root: true,
          pagesIndex: 'index',
          pages: ['leaf'],
        },
      },
      [],
    ],
    [
      'root: true listing index',
      {
        'meta.json': listedRoot,
        'section/meta.json': { root: true, pages: ['index', 'leaf'] },
      },
      [],
    ],
    [
      'nested link pagesIndex',
      {
        'meta.json': listedRoot,
        'section/meta.json': {
          pagesIndex: '[Overview](/section)',
          pages: ['leaf'],
        },
      },
      [],
    ],
    // Extraction inlines a folder's index and children.
    [
      'extracted folder',
      { 'meta.json': { pages: ['index', 'guide', '...section'] } },
      [],
    ],
  ] as const)('%s', async (_name, metas, missing) => {
    const docsRoot = await writeDocs(roots, metas);
    // The literal expectation matches the loaded tree, and so does membership.
    const visible = await loaderVisiblePages(docsRoot);
    expect(ALL_PAGES.filter((page) => !visible.has(page))).toEqual(missing);
    expect(await membershipMissingPages(docsRoot)).toEqual(missing);
  });

  it.each(['leaf.md', 'leaf'])(
    'keeps pagesIndex %s a page distinct from a same-named folder',
    async (pagesIndex) => {
      const docsRoot = await mkdtemp(join(tmpdir(), 'oat-membership-loader-'));
      roots.push(docsRoot);
      const files: Record<string, string> = {
        'index.md': contents('Home', ['[Section](section/index.md)']),
        'section/index.md': contents('Section', [
          '[Leaf page](leaf.md)',
          '[Leaf section](leaf/index.md)',
        ]),
        'section/leaf.md': '# Leaf page\n',
        'section/leaf/index.md': contents('Leaf section', ['[Deep](deep.md)']),
        'section/leaf/deep.md': '# Deep\n',
        'meta.json': `${JSON.stringify({ pages: ['index', 'section'] })}\n`,
        // leaf.md is the section index; "leaf" names the same-named folder.
        'section/meta.json': `${JSON.stringify({ pagesIndex, pages: ['index', 'leaf'] })}\n`,
      };
      for (const [path, text] of Object.entries(files)) {
        await mkdir(dirname(join(docsRoot, path)), { recursive: true });
        await writeFile(join(docsRoot, path), text);
      }
      const visible = await loaderVisiblePages(docsRoot);
      for (const page of [
        'index.md',
        'section/index.md',
        'section/leaf.md',
        'section/leaf/index.md',
        'section/leaf/deep.md',
      ])
        expect(visible).toContain(page);
      const { metaFiles } = await syncFumadocsNavigation({
        docsRoot,
        check: true,
      });
      expect(await compareFumadocsMembership(docsRoot, metaFiles)).toEqual([]);
    },
  );

  it('reports a page extraction as a missing target and the page as unreachable', async () => {
    const docsRoot = await writeDocs(roots, {
      'meta.json': { pages: ['index', '...guide', 'section'] },
    });
    expect(await loaderVisiblePages(docsRoot)).not.toContain('guide.md');
    const { metaFiles } = await syncFumadocsNavigation({
      docsRoot,
      check: true,
    });
    expect(
      (await compareFumadocsMembership(docsRoot, metaFiles)).map(
        ({ kind, line, message }) => [kind, line, message],
      ),
    ).toEqual([
      [
        'dangling',
        4,
        'Missing target: pages entry "...guide" extracts no folder; "..." inlines a folder\'s pages, so list a page by its name instead.',
      ],
      [
        'missing',
        2,
        'Missing reader page: "guide" is listed in index.md Contents but no meta.json pages entry reaches it; add it to pages or remove it from Contents.',
      ],
    ]);
  });
});
