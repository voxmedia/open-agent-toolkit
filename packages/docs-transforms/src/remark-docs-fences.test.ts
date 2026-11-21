import type { Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';

import { DOCS_FENCES, remarkDocsFences } from './remark-docs-fences.js';

interface JsxAttribute {
  type: string;
  name: string;
  value: string | null;
}

interface JsxNode {
  type: string;
  name: string;
  attributes: JsxAttribute[];
  children: Record<string, unknown>[];
  position?: { start: { line: number; column: number } };
}

async function transform(markdown: string): Promise<Root> {
  const processor = unified().use(remarkParse).use(remarkDocsFences);
  return processor.run(processor.parse(markdown), {
    path: '/repo/docs/index.md',
    value: markdown,
  });
}

function nodes<T = Record<string, unknown>>(tree: Root, type: string): T[] {
  const found: T[] = [];
  visit(tree, (node) => {
    if (node.type === type) found.push(node as unknown as T);
  });
  return found;
}

function figures(tree: Root): JsxNode[] {
  return nodes<JsxNode>(tree, 'mdxJsxFlowElement');
}

function fence(lang: string, body: string[], meta = ''): string {
  return [`\`\`\`${lang}${meta ? ` ${meta}` : ''}`, ...body, '```'].join('\n');
}

const EXPECTED_COMPONENTS: Record<string, string> = {
  'docs-steps': 'DocsSteps',
  'docs-tree': 'DocsTree',
  'docs-timeline': 'DocsTimeline',
  'docs-terminal': 'DocsTerminal',
  'docs-decision': 'DocsDecision',
  'docs-check': 'DocsCheck',
  'docs-compare': 'DocsCompare',
  'docs-annotate': 'DocsAnnotate',
};

describe('DOCS_FENCES', () => {
  it('maps exactly the eight fence names to their components', () => {
    expect(
      Object.fromEntries(
        Object.entries(DOCS_FENCES).map(([name, entry]) => [
          name,
          entry.component,
        ]),
      ),
    ).toEqual(EXPECTED_COMPONENTS);
  });

  it('uses raw bodies only for docs-terminal', () => {
    expect(
      Object.entries(DOCS_FENCES)
        .filter(([, entry]) => entry.body === 'raw')
        .map(([name]) => name),
    ).toEqual(['docs-terminal']);
  });
});

describe('remarkDocsFences', () => {
  it.each(Object.entries(EXPECTED_COMPONENTS))(
    'turns a %s fence into a %s element',
    async (lang, component) => {
      const tree = await transform(fence(lang, ['- one', '- two']));
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({
        type: 'mdxJsxFlowElement',
        name: component,
        attributes: [],
      });
    },
  );

  it('emits no className, because the figure frame carries not-prose', async () => {
    const tree = await transform(fence('docs-tree', ['- a/'], 'title="T"'));
    expect(figures(tree)[0]!.attributes.map((a) => a.name)).toEqual(['title']);
  });

  it('parses double-quoted, single-quoted, bare values and flags', async () => {
    const tree = await transform(
      fence(
        'docs-steps',
        ['1. **One**'],
        `title="a b" label='a' size=sm compact`,
      ),
    );
    expect(figures(tree)[0]!.attributes).toEqual([
      { type: 'mdxJsxAttribute', name: 'title', value: 'a b' },
      { type: 'mdxJsxAttribute', name: 'label', value: 'a' },
      { type: 'mdxJsxAttribute', name: 'size', value: 'sm' },
      // A null-valued MDX JSX attribute is the `<X compact />` shorthand,
      // which the component receives as `compact={true}`.
      { type: 'mdxJsxAttribute', name: 'compact', value: null },
    ]);
  });

  it('reparses markdown bodies with positions starting one line below the fence', async () => {
    const markdown = [
      '# Page',
      '',
      fence('docs-timeline', ['- Plain', '- **Now**', '- *Next*']),
    ].join('\n');
    const tree = await transform(markdown);
    const [figure] = figures(tree);

    expect(figure!.position?.start).toMatchObject({ line: 3, column: 1 });
    expect(figure!.children).toMatchObject([
      {
        type: 'list',
        position: {
          start: { line: 4, column: 1 },
          end: { line: 6, column: 9 },
        },
      },
    ]);
    expect(nodes(tree, 'strong')).toHaveLength(1);
    expect(nodes(tree, 'emphasis')).toHaveLength(1);
    expect(
      nodes<{ position: { start: { line: number } } }>(tree, 'emphasis')[0]!
        .position.start.line,
    ).toBe(6);
  });

  it('parses GFM inside markdown bodies', async () => {
    const tree = await transform(
      fence('docs-check', ['- [x] Done', '- [ ] Open']),
    );
    expect(
      nodes<{ checked: boolean | null }>(tree, 'listItem').map(
        (n) => n.checked,
      ),
    ).toEqual([true, false]);
  });

  it('keeps a docs-terminal body as a single code child', async () => {
    const body = ['$ pnpm install', '# install dependencies', 'done'];
    const tree = await transform(
      fence('docs-terminal', body, 'title="Install"'),
    );
    const [figure] = figures(tree);

    expect(figure).toMatchObject({
      name: 'DocsTerminal',
      attributes: [{ name: 'title', value: 'Install' }],
    });
    expect(figure!.children).toHaveLength(1);
    expect(figure!.children[0]).toMatchObject({
      type: 'code',
      lang: null,
      value: body.join('\n'),
    });
    expect(nodes(tree, 'heading')).toHaveLength(0);
  });

  it('keeps an inner code fence of a four-backtick docs-annotate body', async () => {
    const tree = await transform(
      [
        '````docs-annotate',
        '```ts',
        'const a = 1; // (1)',
        '```',
        '',
        '1. The value.',
        '````',
      ].join('\n'),
    );
    const [figure] = figures(tree);
    expect(figure!.name).toBe('DocsAnnotate');
    expect(figure!.children).toMatchObject([
      { type: 'code', lang: 'ts', value: 'const a = 1; // (1)' },
      { type: 'list', ordered: true },
    ]);
  });

  it('fails an unknown docs-* fence, naming the fence, its line and the known list', async () => {
    const markdown = ['# Page', '', fence('docs-nope', ['- x'])].join('\n');
    const error = await transform(markdown).then(
      () => undefined,
      (reason: unknown) => reason as { reason: string; line?: number },
    );

    expect(error).toBeDefined();
    expect(error!.reason).toContain('`docs-nope`');
    expect(error!.reason).toContain('line 3');
    for (const name of Object.keys(EXPECTED_COMPONENTS)) {
      expect(error!.reason).toContain(name);
    }
    expect(error!.line).toBe(3);
  });

  it('passes ts, mermaid and bare fences through unchanged', async () => {
    const markdown = [
      fence('ts', ['const a = 1;']),
      '',
      fence('mermaid', ['flowchart LR']),
      '',
      fence('', ['plain']),
      '',
      fence('docs', ['not a figure']),
    ].join('\n');
    const before = unified().use(remarkParse).parse(markdown);
    const tree = await transform(markdown);

    expect(tree).toEqual(before);
    expect(figures(tree)).toHaveLength(0);
  });

  it('transforms docs-* fences nested in lists and blockquotes', async () => {
    const markdown = [
      '- Item',
      '',
      '  ```docs-tree',
      '  - src/',
      '  ```',
      '',
      '> Quote',
      '>',
      '> ```docs-steps',
      '> 1. **Go**',
      '> ```',
    ].join('\n');
    const tree = await transform(markdown);
    const found = figures(tree);

    expect(found.map((n) => n.name)).toEqual(['DocsTree', 'DocsSteps']);
    expect(nodes(tree, 'code')).toHaveLength(0);
    // The list-item fence body is authored at line 4, column 3.
    expect(found[0]!.children[0]).toMatchObject({
      position: { start: { line: 4, column: 3 } },
    });
  });
});
