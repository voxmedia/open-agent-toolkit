import type { Root } from 'mdast';
import { describe, expect, it, vi } from 'vitest';

import { reparseMarkdown } from './reparse.js';

interface PositionedNode {
  type: string;
  position?: {
    start: { line: number; column: number; offset?: number };
    end: { line: number; column: number; offset?: number };
  };
  children?: PositionedNode[];
  checked?: boolean | null;
}

function walk(nodes: PositionedNode[], fn: (node: PositionedNode) => void) {
  for (const node of nodes) {
    fn(node);
    if (node.children) walk(node.children, fn);
  }
}

describe('reparseMarkdown', () => {
  it('parses GFM tables and task lists', () => {
    const children = reparseMarkdown(
      '| A | B |\n| --- | --- |\n| 1 | 2 |\n\n- [x] Done\n- [ ] Open',
      { line: 1, column: 1 },
    ) as unknown as PositionedNode[];

    expect(children.map((node) => node.type)).toEqual(['table', 'list']);
    const items: PositionedNode[] = [];
    walk(children, (node) => {
      if (node.type === 'listItem') items.push(node);
    });
    expect(items.map((item) => item.checked)).toEqual([true, false]);
  });

  it('offsets every position by the origin and removes offsets', () => {
    const children = reparseMarkdown('# Title\n\n- **one**\n- two', {
      line: 10,
      column: 5,
    }) as unknown as PositionedNode[];

    expect(children[0]!.position).toEqual({
      start: { line: 10, column: 5 },
      end: { line: 10, column: 12 },
    });
    expect(children[1]!.position?.start).toEqual({ line: 12, column: 5 });

    let visited = 0;
    walk(children, (node) => {
      if (!node.position) return;
      visited++;
      expect(node.position.start.offset).toBeUndefined();
      expect(node.position.end.offset).toBeUndefined();
      expect(node.position.start.line).toBeGreaterThanOrEqual(10);
      expect(node.position.start.column).toBeGreaterThanOrEqual(5);
    });
    // Root children, list items, paragraphs, strong and text nodes.
    expect(visited).toBeGreaterThan(5);
  });

  it('leaves positions untouched when no origin is known', () => {
    const children = reparseMarkdown('text', undefined);
    expect(children[0]!.position).toEqual({
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 5, offset: 4 },
    });
  });

  it('calls afterParse with the parsed tree before relocation', () => {
    const afterParse = vi.fn((tree: Root, value: string) => {
      expect(value).toBe('para');
      // Positions are still the parser's own, relative to `value`.
      expect(tree.children[0]!.position?.start).toEqual({
        line: 1,
        column: 1,
        offset: 0,
      });
      tree.children.push({
        type: 'thematicBreak',
        position: {
          start: { line: 2, column: 1 },
          end: { line: 2, column: 4 },
        },
      });
    });

    const children = reparseMarkdown(
      'para',
      { line: 3, column: 2 },
      afterParse,
    );

    expect(afterParse).toHaveBeenCalledTimes(1);
    expect(children.map((node) => node.type)).toEqual([
      'paragraph',
      'thematicBreak',
    ]);
    // Nodes added by the hook are relocated with the rest of the tree.
    expect(children[1]!.position?.start).toEqual({ line: 4, column: 2 });
  });
});
