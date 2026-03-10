import type { Code, Paragraph, Root, RootContent } from 'mdast';
import remarkParse from 'remark-parse';
import type { Plugin } from 'unified';
import { unified } from 'unified';

const TAB_MARKER_RE = /^===\s+"(.+)"$/;

interface TabEntry {
  title: string;
  content: RootContent[];
}

function extractTabTitle(node: RootContent): string | null {
  if (node.type !== 'paragraph') return null;
  const paragraph = node as Paragraph;
  const firstChild = paragraph.children[0];
  if (!firstChild || firstChild.type !== 'text') return null;
  const match = TAB_MARKER_RE.exec(firstChild.value);
  return match?.[1] ?? null;
}

function reparseContent(value: string): RootContent[] {
  const tree = unified().use(remarkParse).parse(value);
  return tree.children;
}

function createTabsElement(tabs: TabEntry[]): RootContent {
  return {
    type: 'mdxJsxFlowElement',
    name: 'Tabs',
    attributes: [],
    children: tabs.map((tab) => ({
      type: 'mdxJsxFlowElement',
      name: 'Tab',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'title', value: tab.title },
      ],
      children: tab.content,
    })),
  } as unknown as RootContent;
}

export const remarkTabs: Plugin<[], Root> = () => (tree: Root) => {
  const newChildren: RootContent[] = [];
  let i = 0;

  while (i < tree.children.length) {
    const node = tree.children[i]!;
    const title = extractTabTitle(node);

    if (title === null) {
      newChildren.push(node);
      i++;
      continue;
    }

    // Collect consecutive tabs into a group
    const tabs: TabEntry[] = [];

    while (i < tree.children.length) {
      const current = tree.children[i]!;
      const currentTitle = extractTabTitle(current);

      if (currentTitle === null) break;

      i++; // advance past tab marker

      // Check if next node is an indented code block (tab content)
      const content: RootContent[] = [];
      if (i < tree.children.length && tree.children[i]!.type === 'code') {
        const codeBlock = tree.children[i] as Code;
        // Re-parse the code block value as markdown to restore original structure
        content.push(...reparseContent(codeBlock.value));
        i++;
      }

      tabs.push({ title: currentTitle, content });
    }

    newChildren.push(createTabsElement(tabs));
  }

  tree.children = newChildren;
};
