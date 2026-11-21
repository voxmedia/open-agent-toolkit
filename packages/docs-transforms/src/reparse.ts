import type { Root, RootContent } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

/** Authored location of the reparsed value's first line and column. */
export interface ReparseOrigin {
  line: number;
  column: number;
}

interface PositionedNode {
  position?: RootContent['position'];
  children?: unknown[];
}

/**
 * Parse `value` as GFM Markdown and relocate every node position so it
 * reports the authored physical location, given that the value's line 1,
 * column 1 sits at `origin`. `afterParse` runs on the parsed tree before
 * relocation, so nodes it produces are relocated too.
 *
 * Internal to docs-transforms; not exported from the package index.
 */
export function reparseMarkdown(
  value: string,
  origin: ReparseOrigin | undefined,
  afterParse?: (tree: Root, value: string) => void,
): RootContent[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(value);
  afterParse?.(tree, value);
  if (origin) {
    const relocate = (node: PositionedNode): void => {
      if (node.position) {
        for (const point of [node.position.start, node.position.end]) {
          point.line += origin.line - 1;
          point.column += origin.column - 1;
          // Deindentation changes offsets; line/column remain authoritative.
          delete point.offset;
        }
      }
      node.children?.forEach((child) => relocate(child as PositionedNode));
    };
    tree.children.forEach(relocate);
  }
  return tree.children;
}
