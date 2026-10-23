import { readFileSync } from 'node:fs';

import type { Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';

import { defaultTransforms } from './index.js';

async function transform(markdown: string): Promise<Root> {
  const processor = unified().use(remarkParse).use(defaultTransforms);
  return processor.run(processor.parse(markdown), {
    path: '/repo/docs/index.md',
  });
}

function nodes(tree: Root, type: string) {
  const found: Record<string, unknown>[] = [];
  visit(tree, (node) => {
    if (node.type === type)
      found.push(node as unknown as Record<string, unknown>);
  });
  return found;
}

describe('composed Markdown transforms', () => {
  it('rewrites links exposed by tabs and retains GFM tables and tasks', async () => {
    const tree = await transform(
      [
        '=== "Details"',
        '',
        '    [Guide](guide.md)',
        '',
        '    | Name | Value |',
        '    | --- | --- |',
        '    | One | Two |',
        '',
        '    - [x] Done',
      ].join('\n'),
    );
    expect(nodes(tree, 'link')).toMatchObject([{ url: './guide/' }]);
    expect(nodes(tree, 'table')).toHaveLength(1);
    expect(nodes(tree, 'listItem')).toMatchObject([{ checked: true }]);
  });

  it('recursively transforms nested tabs while leaving fenced syntax literal', async () => {
    const tree = await transform(
      [
        '=== "Outer"',
        '',
        '    === "Inner"',
        '',
        '        [Nested](nested/index.md)',
        '',
        '        ```text',
        '        === "Literal"',
        '',
        '            [Source](source.md)',
        '        ```',
      ].join('\n'),
    );
    expect(
      nodes(tree, 'mdxJsxFlowElement').filter((n) => n.name === 'Tabs'),
    ).toHaveLength(2);
    expect(nodes(tree, 'link')).toMatchObject([{ url: './nested/' }]);
    expect(nodes(tree, 'code')).toMatchObject([
      { lang: 'text', value: '=== "Literal"\n\n    [Source](source.md)' },
    ]);
  });

  it('does not consume a fenced example following an empty marker', async () => {
    const tree = await transform(
      '=== "Empty"\n\n```text\n[Keep](keep.md)\n```',
    );
    expect(nodes(tree, 'code')).toMatchObject([{ value: '[Keep](keep.md)' }]);
  });

  it('preserves real flagship Syntax examples and composes its nested Rendered tabs', async () => {
    // Provenance: actual tracked flagship authoring page, not recreated syntax.
    const markdown = readFileSync(
      new URL(
        '../../../apps/oat-docs/docs/contributing/markdown-features.md',
        import.meta.url,
      ),
      'utf8',
    );
    const tree = await transform(markdown);
    expect(
      nodes(tree, 'code').some(
        (n) => n.lang === 'text' && String(n.value).includes('=== "pnpm"'),
      ),
    ).toBe(true);
    expect(
      nodes(tree, 'mdxJsxFlowElement').some(
        (n) =>
          n.name === 'Tab' && JSON.stringify(n.attributes).includes('pnpm'),
      ),
    ).toBe(true);
  });

  it('emits Mermaid JSX with real newlines intact and literal label escapes converted', async () => {
    const chart = 'flowchart LR\n  A[Read\\ndocs] --> B[Done]';
    const tree = await transform(
      [
        '=== "Diagram"',
        '',
        '    ```mermaid',
        ...chart.split('\n').map((line) => `    ${line}`),
        '    ```',
        '',
        '```text',
        '```mermaid',
        'example',
        '```',
      ].join('\n'),
    );
    expect(
      nodes(tree, 'mdxJsxFlowElement').filter((n) => n.name === 'Mermaid'),
    ).toMatchObject([
      {
        attributes: [
          {
            name: 'chart',
            value: 'flowchart LR\n  A[Read<br/>docs] --> B[Done]',
          },
        ],
        data: { _mdxExplicitJsx: true },
      },
    ]);
    expect(nodes(tree, 'code').some((n) => n.lang === 'text')).toBe(true);
  });
});
