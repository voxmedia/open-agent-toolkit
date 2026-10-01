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
}

type FumadocsLoader = (options: {
  baseUrl: string;
  source: { files: Array<Record<string, unknown>> };
}) => { pageTree: PageTreeNode };

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

/** Docs-relative paths of every page the real loader puts in the tree. */
async function pagesInLoadedTree(docsRoot: string): Promise<string[]> {
  const loader = await importFumadocsLoader();
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
});
