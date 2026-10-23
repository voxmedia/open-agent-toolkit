import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Link, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';

import { remarkLinks } from './remark-links.js';

interface LinkResult {
  url: string;
  text: string;
}

async function transformLinks(
  markdown: string,
  filePath = '/repo/docs/index.md',
): Promise<LinkResult[]> {
  const processor = unified().use(remarkParse).use(remarkLinks);
  const tree = processor.parse(markdown);
  const result = (await processor.run(tree, {
    path: filePath,
  } as never)) as Root;
  const links: LinkResult[] = [];
  visit(result, 'link', (node: Link) => {
    let text = '';
    for (const child of node.children) {
      if (child.type === 'text') text += child.value;
      else if (child.type === 'inlineCode') text += child.value;
    }
    links.push({ url: node.url, text });
  });
  return links;
}

function urls(links: LinkResult[]): string[] {
  return links.map((l) => l.url);
}

describe('remarkLinks — URL rewriting', () => {
  it.each(['md', 'mdx'])(
    'uses real source files and pinned loader slugs for a same-name .%s page and index',
    async (extension) => {
      const root = await mkdtemp(join(tmpdir(), 'oat-link-collision-'));
      const docs = join(root, 'docs');
      try {
        await mkdir(join(docs, 'contributing'), { recursive: true });
        for (const page of [
          'index.md',
          'guide.md',
          `contributing.${extension}`,
          'contributing/index.md',
          'contributing/docs-toolchain.md',
        ]) {
          await writeFile(join(docs, page), `# ${page}\n`);
        }
        const rootLinks = async () => [
          ...urls(
            await transformLinks(
              '[Guide](guide.md?v=1#guide)',
              join(docs, 'index.md'),
            ),
          ),
          ...urls(
            await transformLinks(
              '[Home](index.md?v=1#home)',
              join(docs, 'guide.md'),
            ),
          ),
        ];
        expect(await rootLinks()).toEqual([
          './guide/?v=1#guide',
          '../?v=1#home',
        ]);
        // This file is outside the content root and never enters the loader.
        await writeFile(
          join(root, `docs.${extension}`),
          '# Unrelated app file\n',
        );
        expect(await rootLinks()).toEqual([
          './guide/?v=1#guide',
          '../?v=1#home',
        ]);
        // Independent oracle: the actually installed core16.10.2 loader, not a
        // second implementation of its collision-slug rules.
        const require = createRequire(
          new URL('../../docs-config/package.json', import.meta.url),
        );
        const { loader } = await import(
          pathToFileURL(require.resolve('fumadocs-core/source')).href
        );
        const source = loader({
          baseUrl: '/',
          source: {
            files: [
              { type: 'page', path: 'index.md', data: { title: 'Home' } },
              { type: 'page', path: 'guide.md', data: { title: 'Guide' } },
              {
                type: 'page',
                path: `contributing.${extension}`,
                data: { title: 'Contract' },
              },
              {
                type: 'page',
                path: 'contributing/index.md',
                data: { title: 'Guides' },
              },
            ],
          },
        });
        expect(
          source
            .getPages()
            .map((page: { path: string; url: string }) => [page.path, page.url])
            .sort(),
        ).toEqual([
          [`contributing.${extension}`, '/contributing'],
          ['contributing/index.md', '/contributing/index'],
          ['guide.md', '/guide'],
          ['index.md', '/'],
        ]);
        for (const [from, href, expected] of [
          [
            'index.md',
            'contributing/index.md?v=1#guides',
            './contributing/index/?v=1#guides',
          ],
          [
            'contributing/index.md',
            `../contributing.${extension}?v=1#contract`,
            '../?v=1#contract',
          ],
          ['contributing/index.md', 'docs-toolchain.md', '../docs-toolchain/'],
          [`contributing.${extension}`, 'contributing/index.md', './index/'],
          [
            'contributing/docs-toolchain.md',
            `../contributing.${extension}`,
            '../',
          ],
          ['contributing/docs-toolchain.md', 'index.md', '../index/'],
        ]) {
          expect(
            urls(await transformLinks(`[Guide](${href})`, join(docs, from))),
          ).toEqual([expected]);
        }
        await rm(join(docs, `contributing.${extension}`));
        expect(
          urls(
            await transformLinks(
              '[Guides](contributing/index.md)',
              join(docs, 'index.md'),
            ),
          ),
        ).toEqual(['./contributing/']);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it('strips .md extension and appends trailing slash on relative links', async () => {
    const links = await transformLinks('[Quickstart](quickstart.md)');
    expect(urls(links)).toEqual(['./quickstart/']);
  });

  it('converts dir/index.md to dir path with trailing slash', async () => {
    const links = await transformLinks('[CLI](cli/index.md)');
    expect(urls(links)).toEqual(['./cli/']);
  });

  it('handles parent-relative index links with trailing slash', async () => {
    const links = await transformLinks(
      '[Back](../reference/index.md)',
      '/repo/docs/guide/concepts.md',
    );
    expect(urls(links)).toEqual(['../../reference/']);
  });

  it('preserves anchor fragments and inserts slash before them', async () => {
    const links = await transformLinks('[Section](quickstart.md#setup)');
    expect(urls(links)).toEqual(['./quickstart/#setup']);
  });

  it('preserves query strings and inserts slash before them', async () => {
    const links = await transformLinks('[Section](quickstart.md?v=1)');
    expect(urls(links)).toEqual(['./quickstart/?v=1']);
  });

  it('preserves pure anchor links unchanged', async () => {
    const links = await transformLinks('[Top](#top)');
    expect(urls(links)).toEqual(['#top']);
  });

  it('ignores absolute URLs', async () => {
    const links = await transformLinks('[Docs](https://example.com/page.md)');
    expect(urls(links)).toEqual(['https://example.com/page.md']);
  });

  it('ignores protocol-relative mailto links', async () => {
    const links = await transformLinks('[Mail](mailto:dev@example.com)');
    expect(urls(links)).toEqual(['mailto:dev@example.com']);
  });

  it('rewrites bare index.md to ./', async () => {
    const links = await transformLinks('[Home](index.md)');
    expect(urls(links)).toEqual(['./']);
  });

  it('appends trailing slash to bare self-link `.`', async () => {
    const links = await transformLinks('[Here](.)');
    expect(urls(links)).toEqual(['./']);
  });

  it('handles nested paths without index', async () => {
    const links = await transformLinks('[Design](cli/design-principles.md)');
    expect(urls(links)).toEqual(['./cli/design-principles/']);
  });

  it('adds extra ../ for deep parent-relative links with trailing slash', async () => {
    const links = await transformLinks(
      '[Contract](../../reference/docs-index-contract.md)',
      '/repo/docs/guide/documentation/index.md',
    );
    expect(urls(links)).toEqual(['../../reference/docs-index-contract/']);
  });

  it('rewrites source-relative links for non-index pages with trailing slash', async () => {
    const links = await transformLinks(
      '[Docs Commands](documentation/commands.md)',
      '/repo/docs/guide/cli-reference.md',
    );
    expect(urls(links)).toEqual(['../documentation/commands/']);
  });

  it('leaves asset links with extensions unchanged', async () => {
    const links = await transformLinks('[Image](logo.png)');
    expect(urls(links)).toEqual(['logo.png']);
  });

  it('leaves nested parent-relative asset links unchanged', async () => {
    const links = await transformLinks(
      '[Diagram](../images/diagram.png)',
      '/repo/docs/guide/concepts.md',
    );
    expect(urls(links)).toEqual(['../images/diagram.png']);
  });

  it('leaves same-folder svg asset unchanged', async () => {
    const links = await transformLinks('[Asset](./asset.svg)');
    expect(urls(links)).toEqual(['./asset.svg']);
  });

  it('does not double-up trailing slash on URLs already ending in /', async () => {
    const links = await transformLinks('[Home](./)');
    expect(urls(links)).toEqual(['./']);
  });

  it('handles multiple links in one document', async () => {
    const md = `- [A](a.md)
- [B](b/index.md)
- [C](https://example.com)`;
    const links = await transformLinks(md);
    expect(urls(links)).toEqual(['./a/', './b/', 'https://example.com']);
  });
});

describe('remarkLinks — display text cleanup', () => {
  it('strips .md from inline code display text', async () => {
    const links = await transformLinks('[`quickstart.md`](quickstart.md)');
    expect(links).toEqual([{ url: './quickstart/', text: 'quickstart' }]);
  });

  it('strips .md and /index from inline code display text', async () => {
    const links = await transformLinks('[`cli/index.md`](cli/index.md)');
    expect(links).toEqual([{ url: './cli/', text: 'cli' }]);
  });

  it('preserves human-readable display text unchanged', async () => {
    const links = await transformLinks('[Quickstart](quickstart.md)');
    expect(links[0].text).toBe('Quickstart');
  });

  it('strips .mdx from inline code display text', async () => {
    const links = await transformLinks('[`quickstart.mdx`](quickstart.mdx)');
    expect(links).toEqual([{ url: './quickstart/', text: 'quickstart' }]);
  });

  it('does not touch inline code that is not a .md path', async () => {
    const links = await transformLinks('[`config.json`](config.md)');
    expect(links[0].text).toBe('config.json');
  });

  it('handles nested path in inline code', async () => {
    const links = await transformLinks(
      '[`cli/provider-interop/index.md`](cli/provider-interop/index.md)',
    );
    expect(links).toEqual([
      { url: './cli/provider-interop/', text: 'cli/provider-interop' },
    ]);
  });
});
