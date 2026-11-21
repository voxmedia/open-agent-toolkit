/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/graph-tree/graph-tree.tsx`
from registry item `graph-tree` (https://mdxcn.dev/r/graph-tree.json), taken on
2026-11-20 (upstream main 884eba5, committed 2026-11-11). OAT owns this copy;
it does not track upstream.

OAT patches:
- Static server component: the client directive, the motion animation module
  and every animation prop are removed.
- Rendered inside `GraphFrame` with an explicit `frame` prop (default `"box"`)
  passed to `GraphBody`; nothing reads an inherited frame.
- Takes only fence props: `title` and `frame`. The JSX item form, the data
  props, `palette` and `className` are dropped.
- `text-foreground` is rewritten to `text-fd-foreground`.
- Row indents use `whitespace-pre`; upstream `whitespace-nowrap` collapsed
  the indent under a last-child folder.
- Non-accent rows recede with the `opacity-40` class instead of an inline
  opacity style.

Copyright (c) 2026 Keshav Bagaade

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { type ReactElement, type ReactNode } from 'react';

import { cn } from './cn.js';
import { frameOf, GraphBody, GraphFrame } from './graph-frame.js';
import {
  childrenOf,
  hasHost,
  itemText,
  listItems,
  nestedList,
} from './graph-markdown.js';

type TreeNode = {
  label: string;
  meta?: string;
  accent?: boolean;
  children?: TreeNode[];
};

export type DocsTreeProps = {
  /** Drawn as `[ TITLE ]` on the frame. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /** Markdown: a nested list. `name — note` adds a note; bold accents. */
  children?: ReactNode;
};

function nodesFromList(items: ReactElement[]): TreeNode[] {
  return items.map((item) => {
    const kids = nodesFromList(nestedList(item));
    const text = itemText(item);
    const [name, extra] = text.split(/\s+[—–]\s+/);
    return {
      label: name || text,
      meta: extra,
      accent: hasHost(childrenOf(item), ['strong', 'b']),
      children: kids.length > 0 ? kids : undefined,
    };
  });
}

type FlatRow = {
  key: string;
  branch: string;
  label: string;
  meta?: string;
  accent?: boolean;
};

function flatten(
  nodes: TreeNode[],
  prefix = '',
  trail = 'root',
  isRoot = true,
): FlatRow[] {
  const singleRoot = isRoot && nodes.length === 1;

  return nodes.flatMap((node, index) => {
    const last = index === nodes.length - 1;
    const branch = singleRoot ? '' : prefix + (last ? '└─ ' : '├─ ');
    const key = `${trail}/${node.label}-${index}`;
    const childPrefix = singleRoot ? '' : prefix + (last ? '   ' : '│  ');
    const row: FlatRow = {
      key,
      branch,
      label: node.label,
      meta: node.meta,
      accent: node.accent,
    };
    const kids = node.children
      ? flatten(node.children, childPrefix, key, false)
      : [];
    return [row, ...kids];
  });
}

/**
 * A file or ownership tree, from a `docs-tree` fence:
 *
 * ```md
 * - .oat/ideas/
 *   - backlog.md — aggregated list of all ideas
 *   - {idea-name}/
 *     - discovery.md — brainstorming document
 * ```
 *
 * `— note` is drawn right-aligned. Bold nodes take the accent and the rest
 * recede.
 */
export function DocsTree({ title, frame, children }: DocsTreeProps) {
  const style = frameOf(frame);
  const rows = flatten(nodesFromList(listItems(children)));
  const hasAccent = rows.some((row) => row.accent);

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : undefined}
    >
      <GraphBody className='overflow-x-auto overflow-y-hidden' frame={style}>
        <ul className='flex min-w-max flex-col gap-1' role='list'>
          {rows.map((row) => (
            <li
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6',
                hasAccent && !row.accent && 'opacity-40',
              )}
              key={row.key}
            >
              <span className='whitespace-pre'>
                <span
                  aria-hidden='true'
                  className='text-graph-frame select-none'
                >
                  {row.branch}
                </span>
                <span
                  className={
                    row.accent ? 'text-graph-accent' : 'text-fd-foreground'
                  }
                >
                  {row.label}
                </span>
              </span>
              {row.meta ? (
                <span className='text-graph-muted tabular-nums'>
                  {row.meta}
                </span>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
        <span className='sr-only'>Tree with {rows.length} nodes</span>
      </GraphBody>
    </GraphFrame>
  );
}
