/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/graph-check/graph-check.tsx`
from registry item `graph-check` (https://mdxcn.dev/r/graph-check.json), taken on
2026-11-20 (upstream main 884eba5, committed 2026-11-11). OAT owns this copy;
it does not track upstream.

OAT patches:
- Static server component: the client directive, the motion animation module
  and every animation prop are removed.
- Rendered inside `GraphFrame` with an explicit `frame` prop (default `"box"`)
  passed to `GraphBody`; nothing reads an inherited frame.
- `text-foreground` is rewritten to `text-fd-foreground`; colors use the mono
  palette tones directly.
- Takes only fence props: `title` and `frame`. The JSX item form, the data
  props, `palette`, `corner` and `className` are dropped.
- The GFM checkbox is also found inside a loose item's paragraph, so a
  loose task list keeps its done state.

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

import { isValidElement, type ReactElement, type ReactNode } from 'react';

import { cn } from './cn.js';
import { frameOf, GraphBody, GraphFrame } from './graph-frame.js';
import {
  childNodes,
  childrenOf,
  isHost,
  itemParts,
  itemText,
  listItems,
  splitDash,
} from './graph-markdown.js';

type CheckItem = {
  label: string;
  done: boolean;
  note?: string;
  /** Sub-tasks. A nested list in Markdown. */
  items?: CheckItem[];
};

export type DocsCheckProps = {
  /** Drawn as `[ TITLE ]` on the frame. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /** Markdown: a GFM task list. A nested list holds sub-tasks. */
  children?: ReactNode;
};

function isCheckbox(node: ReactNode): node is ReactElement {
  return (
    isValidElement(node) &&
    isHost(node, 'input') &&
    (node.props as { type?: string }).type === 'checkbox'
  );
}

/** The GFM checkbox of an item: a direct child, or in a loose item's paragraph. */
function boxOf(item: ReactElement): ReactElement | undefined {
  const nodes = childNodes(childrenOf(item));
  const direct = nodes.find(isCheckbox);
  if (direct) {
    return direct;
  }
  const paragraph = nodes.find(
    (node): node is ReactElement => isValidElement(node) && isHost(node, 'p'),
  );
  return paragraph
    ? childNodes(childrenOf(paragraph)).find(isCheckbox)
    : undefined;
}

function checksOf(children: ReactNode): CheckItem[] {
  return listItems(children).map((item) => {
    const box = boxOf(item);
    const text = itemText(item);
    const done =
      /^\s*\[x\]/i.test(text) ||
      Boolean(box && (box.props as { checked?: boolean }).checked);
    const { label, rest } = splitDash(text.replace(/^\s*\[[xX ]\]\s*/, ''));
    const nested = itemParts(item).lists.flatMap((list) => checksOf(list));
    return {
      label,
      done,
      note: rest || undefined,
      items: nested.length > 0 ? nested : undefined,
    };
  });
}

function flatten(items: CheckItem[]): CheckItem[] {
  return items.flatMap((entry) => [entry, ...flatten(entry.items ?? [])]);
}

function CheckRow({ entry }: { entry: CheckItem }) {
  return (
    <li className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-3'>
      <span
        aria-hidden='true'
        className={cn(
          'select-none',
          entry.done ? 'text-graph-accent' : 'text-graph-muted',
        )}
      >
        {entry.done ? '[x]' : '[ ]'}
      </span>
      <span className='flex min-w-0 flex-col gap-1'>
        <span
          className={entry.done ? 'text-fd-foreground' : 'text-graph-muted'}
        >
          {entry.label}
        </span>
        {entry.note ? (
          <span className='text-graph-muted'>{entry.note}</span>
        ) : null}
        {entry.items?.length ? (
          <ul className='mt-1 flex flex-col gap-2' role='list'>
            {entry.items.map((child, index) => (
              <CheckRow entry={child} key={index} />
            ))}
          </ul>
        ) : null}
      </span>
    </li>
  );
}

/**
 * A to-do list, from a `docs-check` fence:
 *
 * ```md
 * - [x] freeze tokens — design signed off
 * - [ ] ship registry json
 *   - [x] write the schema
 *   - [ ] publish
 * ```
 *
 * `[x]` is done, `— note` goes under the item, and a nested list holds
 * sub-tasks.
 */
export function DocsCheck({ title, frame, children }: DocsCheckProps) {
  const style = frameOf(frame);
  const items = checksOf(children);
  const flat = flatten(items);

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : undefined}
    >
      <GraphBody frame={style}>
        <ul className='flex flex-col gap-2' role='list'>
          {items.map((entry, index) => (
            <CheckRow entry={entry} key={index} />
          ))}
        </ul>
        <span className='sr-only'>
          {flat.filter((entry) => entry.done).length} of {flat.length} done
        </span>
      </GraphBody>
    </GraphFrame>
  );
}
