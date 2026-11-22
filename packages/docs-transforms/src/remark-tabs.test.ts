import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { remarkDocsFences } from './remark-docs-fences.js';
import { remarkTabs } from './remark-tabs.js';

interface MdxJsxAttribute {
  type: string;
  name: string;
  value: string;
}

interface JsxNode {
  type: string;
  name: string;
  attributes: MdxJsxAttribute[];
  children: JsxNode[];
}

async function transformTabs(markdown: string) {
  const processor = unified().use(remarkParse).use(remarkTabs);
  const tree = processor.parse(markdown);
  const result = await processor.run(tree);
  return result;
}

function findNodes(tree: unknown, type: string): JsxNode[] {
  const results: JsxNode[] = [];
  function walk(node: Record<string, unknown>) {
    if (node.type === type) {
      results.push(node as unknown as JsxNode);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child as Record<string, unknown>);
      }
    }
  }
  walk(tree as Record<string, unknown>);
  return results;
}

describe('remarkTabs', () => {
  it('should transform a single tab group into Tabs/Tab JSX nodes', async () => {
    const md = [
      '=== "Tab 1"',
      '',
      '    Content for tab 1',
      '',
      '=== "Tab 2"',
      '',
      '    Content for tab 2',
    ].join('\n');

    const tree = await transformTabs(md);
    const tabsNodes = findNodes(tree, 'mdxJsxFlowElement').filter(
      (n) => n.name === 'Tabs',
    );

    expect(tabsNodes).toHaveLength(1);

    const tabs = tabsNodes[0]!;
    const tabChildren = tabs.children.filter(
      (c) => c.type === 'mdxJsxFlowElement' && c.name === 'Tab',
    );
    expect(tabChildren).toHaveLength(2);
    expect(tabChildren[0]!.attributes).toContainEqual(
      expect.objectContaining({ name: 'title', value: 'Tab 1' }),
    );
    expect(tabChildren[1]!.attributes).toContainEqual(
      expect.objectContaining({ name: 'title', value: 'Tab 2' }),
    );
  });

  it('should handle multiple tab groups in one file', async () => {
    const md = [
      '=== "Group1 Tab A"',
      '',
      '    Content A',
      '',
      '=== "Group1 Tab B"',
      '',
      '    Content B',
      '',
      'Some regular paragraph separating groups.',
      '',
      '=== "Group2 Tab X"',
      '',
      '    Content X',
      '',
      '=== "Group2 Tab Y"',
      '',
      '    Content Y',
    ].join('\n');

    const tree = await transformTabs(md);
    const tabsNodes = findNodes(tree, 'mdxJsxFlowElement').filter(
      (n) => n.name === 'Tabs',
    );

    expect(tabsNodes).toHaveLength(2);
  });

  it('should handle tab with code block content', async () => {
    const md = [
      '=== "Python"',
      '',
      '        def hello():',
      '            print("hello")',
      '',
      '=== "JavaScript"',
      '',
      '        function hello() {',
      '            console.log("hello");',
      '        }',
    ].join('\n');

    const tree = await transformTabs(md);
    const tabsNodes = findNodes(tree, 'mdxJsxFlowElement').filter(
      (n) => n.name === 'Tabs',
    );

    expect(tabsNodes).toHaveLength(1);
    const tabChildren = tabsNodes[0]!.children.filter(
      (c) => c.type === 'mdxJsxFlowElement' && c.name === 'Tab',
    );
    expect(tabChildren).toHaveLength(2);
    expect(tabChildren[0]!.attributes).toContainEqual(
      expect.objectContaining({ name: 'title', value: 'Python' }),
    );
    expect(tabChildren[1]!.attributes).toContainEqual(
      expect.objectContaining({ name: 'title', value: 'JavaScript' }),
    );
  });

  it('should handle tab with multiple paragraphs', async () => {
    const md = [
      '=== "Details"',
      '',
      '    First paragraph of content.',
      '',
      '    Second paragraph of content.',
      '',
      '=== "Summary"',
      '',
      '    Just one paragraph.',
    ].join('\n');

    const tree = await transformTabs(md);
    const tabsNodes = findNodes(tree, 'mdxJsxFlowElement').filter(
      (n) => n.name === 'Tabs',
    );

    expect(tabsNodes).toHaveLength(1);
    const tabChildren = tabsNodes[0]!.children.filter(
      (c) => c.type === 'mdxJsxFlowElement' && c.name === 'Tab',
    );
    expect(tabChildren).toHaveLength(2);
  });

  it('should handle adjacent tab groups separated by non-tab content', async () => {
    const md = [
      '=== "First"',
      '',
      '    Content first',
      '',
      'This is a regular paragraph.',
      '',
      '=== "Second"',
      '',
      '    Content second',
    ].join('\n');

    const tree = await transformTabs(md);
    const tabsNodes = findNodes(tree, 'mdxJsxFlowElement').filter(
      (n) => n.name === 'Tabs',
    );

    // These should be two separate Tabs groups since separated by non-tab content
    expect(tabsNodes).toHaveLength(2);
  });

  it('should handle empty tab (title only, no content)', async () => {
    const md = [
      '=== "Empty Tab"',
      '',
      '=== "Has Content"',
      '',
      '    Some content here',
    ].join('\n');

    const tree = await transformTabs(md);
    const tabsNodes = findNodes(tree, 'mdxJsxFlowElement').filter(
      (n) => n.name === 'Tabs',
    );

    expect(tabsNodes).toHaveLength(1);
    const tabChildren = tabsNodes[0]!.children.filter(
      (c) => c.type === 'mdxJsxFlowElement' && c.name === 'Tab',
    );
    expect(tabChildren).toHaveLength(2);
    expect(tabChildren[0]!.attributes).toContainEqual(
      expect.objectContaining({ name: 'title', value: 'Empty Tab' }),
    );
  });

  it('should not modify files without tab syntax', async () => {
    const md = [
      '# Regular Heading',
      '',
      'Just a normal paragraph.',
      '',
      '- list item 1',
      '- list item 2',
    ].join('\n');

    const tree = await transformTabs(md);
    const tabsNodes = findNodes(tree, 'mdxJsxFlowElement').filter(
      (n) => n.name === 'Tabs',
    );

    expect(tabsNodes).toHaveLength(0);
  });

  it('reports authored positions for content under one and two tab levels', async () => {
    const md = [
      '# Page',
      '',
      '=== "Outer"',
      '',
      '    === "Inner"',
      '',
      '        - item **bold**',
      '',
      '    Outer text',
    ].join('\n');

    const tree = await transformTabs(md);
    const position = (type: string) =>
      (
        findNodes(tree, type)[0] as unknown as {
          position: {
            start: { line: number; column: number; offset?: number };
          };
        }
      ).position.start;

    // Lines and columns are the authored ones under both one and two tab
    // levels: each tab body starts four columns in from its code block, and
    // nested tabs compose because the inner block is relocated first.
    // Two levels of tab indentation: authored at line 7, column 9.
    expect(position('listItem')).toEqual({ line: 7, column: 9 });
    expect(position('strong')).toEqual({ line: 7, column: 16 });
    // One level: authored at line 9, column 5.
    expect(
      findNodes(tree, 'paragraph')
        .map(
          (n) =>
            (n as unknown as { position: { start: unknown } }).position.start,
        )
        .at(-1),
    ).toEqual({ line: 9, column: 5 });
  });

  it('reports the authored column for an unknown docs fence inside a tab', async () => {
    const md = [
      '=== "Outer"',
      '',
      '    === "Inner"',
      '',
      '        ```docs-nope',
      '        - x',
      '        ```',
    ].join('\n');
    const processor = unified()
      .use(remarkParse)
      .use(remarkTabs)
      .use(remarkDocsFences);
    const error = await processor.run(processor.parse(md)).then(
      () => undefined,
      (reason: unknown) => reason as { line?: number; column?: number },
    );

    // The fence is authored at line 5, column 9, two tab levels deep.
    expect(error).toMatchObject({ line: 5, column: 9 });
  });
});
