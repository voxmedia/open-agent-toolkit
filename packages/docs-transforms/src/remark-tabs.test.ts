import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

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
});
