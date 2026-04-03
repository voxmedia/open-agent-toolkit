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
  it('strips .md extension from relative links', async () => {
    const links = await transformLinks('[Quickstart](quickstart.md)');
    expect(urls(links)).toEqual(['./quickstart']);
  });

  it('converts dir/index.md to dir path', async () => {
    const links = await transformLinks('[CLI](cli/index.md)');
    expect(urls(links)).toEqual(['./cli']);
  });

  it('handles parent-relative index links with trailing-slash adjustment', async () => {
    const links = await transformLinks(
      '[Back](../reference/index.md)',
      '/repo/docs/guide/concepts.md',
    );
    expect(urls(links)).toEqual(['../../reference']);
  });

  it('preserves anchor fragments', async () => {
    const links = await transformLinks('[Section](quickstart.md#setup)');
    expect(urls(links)).toEqual(['./quickstart#setup']);
  });

  it('preserves pure anchor links', async () => {
    const links = await transformLinks('[Top](#top)');
    expect(urls(links)).toEqual(['#top']);
  });

  it('ignores absolute URLs', async () => {
    const links = await transformLinks('[Docs](https://example.com/page.md)');
    expect(urls(links)).toEqual(['https://example.com/page.md']);
  });

  it('handles bare index.md', async () => {
    const links = await transformLinks('[Home](index.md)');
    expect(urls(links)).toEqual(['.']);
  });

  it('handles nested paths without index', async () => {
    const links = await transformLinks('[Design](cli/design-principles.md)');
    expect(urls(links)).toEqual(['./cli/design-principles']);
  });

  it('adds extra ../ for deep parent-relative links (trailing-slash compensation)', async () => {
    const links = await transformLinks(
      '[Contract](../../reference/docs-index-contract.md)',
      '/repo/docs/guide/documentation/index.md',
    );
    expect(urls(links)).toEqual(['../../reference/docs-index-contract']);
  });

  it('rewrites source-relative links for non-index pages', async () => {
    const links = await transformLinks(
      '[Docs Commands](documentation/commands.md)',
      '/repo/docs/guide/cli-reference.md',
    );
    expect(urls(links)).toEqual(['../documentation/commands']);
  });

  it('leaves non-.md links unchanged', async () => {
    const links = await transformLinks('[Image](logo.png)');
    expect(urls(links)).toEqual(['logo.png']);
  });

  it('handles multiple links in one document', async () => {
    const md = `- [A](a.md)
- [B](b/index.md)
- [C](https://example.com)`;
    const links = await transformLinks(md);
    expect(urls(links)).toEqual(['./a', './b', 'https://example.com']);
  });
});

describe('remarkLinks — display text cleanup', () => {
  it('strips .md from inline code display text', async () => {
    const links = await transformLinks('[`quickstart.md`](quickstart.md)');
    expect(links).toEqual([{ url: './quickstart', text: 'quickstart' }]);
  });

  it('strips .md and /index from inline code display text', async () => {
    const links = await transformLinks('[`cli/index.md`](cli/index.md)');
    expect(links).toEqual([{ url: './cli', text: 'cli' }]);
  });

  it('preserves human-readable display text unchanged', async () => {
    const links = await transformLinks('[Quickstart](quickstart.md)');
    expect(links[0].text).toBe('Quickstart');
  });

  it('strips .mdx from inline code display text', async () => {
    const links = await transformLinks('[`quickstart.mdx`](quickstart.mdx)');
    expect(links).toEqual([{ url: './quickstart', text: 'quickstart' }]);
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
      { url: './cli/provider-interop', text: 'cli/provider-interop' },
    ]);
  });
});
