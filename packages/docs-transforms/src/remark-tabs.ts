import type { Code, Paragraph, Root, RootContent } from 'mdast';
import remarkGfm from 'remark-gfm';
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

function reparseContent(value: string, block?: Code): RootContent[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(value);
  transformChildren(tree, value);
  // Reparsed tab content still reports authored physical source locations.
  const relocate = (node: {
    position?: Code['position'];
    children?: unknown[];
  }): void => {
    if (node.position && block?.position) {
      for (const point of [node.position.start, node.position.end]) {
        point.line += block.position.start.line - 1;
        point.column += block.position.start.column - 1;
        // Deindentation changes offsets; line/column remain authoritative.
        delete point.offset;
      }
    }
    node.children?.forEach((child) => relocate(child as typeof node));
  };
  tree.children.forEach(relocate);
  return tree.children;
}

function createTabsElement(
  tabs: TabEntry[],
  position?: Code['position'],
): RootContent {
  return {
    type: 'mdxJsxFlowElement',
    name: 'Tabs',
    position,
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

function transformChildren(
  tree: { children: RootContent[] },
  source?: string,
): void {
  const newChildren: RootContent[] = [];
  let i = 0;

  while (i < tree.children.length) {
    const node = tree.children[i]!;
    const title = extractTabTitle(node);

    if (title === null) {
      if ('children' in node) {
        transformChildren(
          node as unknown as { children: RootContent[] },
          source,
        );
      }
      newChildren.push(node);
      i++;
      continue;
    }

    // Collect consecutive tabs into a group
    const tabs: TabEntry[] = [];
    const start = node.position?.start;

    while (i < tree.children.length) {
      const current = tree.children[i]!;
      const currentTitle = extractTabTitle(current);

      if (currentTitle === null) break;

      i++; // advance past tab marker

      // Check if next node is an indented code block (tab content)
      const content: RootContent[] = [];
      if (
        i < tree.children.length &&
        tree.children[i]!.type === 'code' &&
        (tree.children[i] as Code).lang == null &&
        !/^ {0,3}(`{3,}|~{3,})/.test(
          source?.slice(tree.children[i]!.position?.start.offset ?? 0) ?? '',
        )
      ) {
        const codeBlock = tree.children[i] as Code;
        // Re-parse the code block value as markdown to restore original structure
        content.push(...reparseContent(codeBlock.value, codeBlock));
        i++;
      }

      tabs.push({ title: currentTitle, content });
    }

    const end = tree.children[i - 1]?.position?.end;
    newChildren.push(
      createTabsElement(
        tabs,
        start && end ? { start: { ...start }, end: { ...end } } : undefined,
      ),
    );
  }

  tree.children = newChildren;
}

export const remarkTabs: Plugin<[], Root> = () => (tree, file) => {
  transformChildren(tree, file.value ? String(file.value) : undefined);
};
