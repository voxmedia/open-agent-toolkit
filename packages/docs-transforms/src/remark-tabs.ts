import type { Code, Paragraph, Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';

import { reparseMarkdown } from './reparse.js';

/**
 * Virtual columns an indented code block strips from each line of tab
 * content. A tab advances to the next multiple of this width, but it is one
 * source character, so authored columns come from `prefixLength`.
 */
const INDENTED_CODE_WIDTH = 4;

/**
 * Source characters the indented-code prefix consumed on one line: spaces
 * and tabs up to `INDENTED_CODE_WIDTH` virtual columns, measured from the
 * code block's start column. Known limitation: a tab character split across
 * a container prefix (list item or blockquote) is not modeled.
 */
function prefixLength(line: string): number {
  let columns = 0;
  let length = 0;
  while (columns < INDENTED_CODE_WIDTH && length < line.length) {
    const char = line[length];
    if (char === ' ') columns += 1;
    else if (char === '\t')
      columns += INDENTED_CODE_WIDTH - (columns % INDENTED_CODE_WIDTH);
    else break;
    length += 1;
  }
  return length;
}

/**
 * Authored start column of each line of an indented code block's value,
 * read from the source the block was parsed from. Nested tabs compose: their
 * source is the outer tab's value, which the outer origin relocates later.
 */
function lineColumnsOf(
  codeBlock: Code,
  source: string | undefined,
): number[] | undefined {
  const start = codeBlock.position?.start;
  if (!start || source === undefined) return undefined;
  const lines = source.split('\n');
  return codeBlock.value
    .split('\n')
    .map(
      (_, index) =>
        start.column +
        prefixLength(
          (lines[start.line - 1 + index] ?? '').slice(start.column - 1),
        ),
    );
}

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
        const blockStart = codeBlock.position?.start;
        // Re-parse the code block value as markdown to restore original
        // structure. Each value line is relocated by the characters its own
        // indented-code prefix consumed, so tab content reports authored
        // lines and columns for space, tab and mixed indentation. Without
        // the source, space indentation is assumed.
        content.push(
          ...reparseMarkdown(
            codeBlock.value,
            blockStart
              ? {
                  line: blockStart.line,
                  column: blockStart.column + INDENTED_CODE_WIDTH,
                  lineColumns: lineColumnsOf(codeBlock, source),
                }
              : undefined,
            transformChildren,
          ),
        );
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
