/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/graph-timeline/graph-timeline.tsx`
from registry item `graph-timeline` (https://mdxcn.dev/r/graph-timeline.json), taken on
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
- Colors use the mono palette tones directly (accent for now, muted for
  next); row keys use the item index.

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

import { type ReactNode } from 'react';

import { cn } from './cn.js';
import { frameOf, GraphBody, GraphFrame, GraphProse } from './graph-frame.js';
import {
  hasHost,
  itemParts,
  listItems,
  splitDash,
  splitLabel,
  textOf,
} from './graph-markdown.js';

type TimelineState = 'done' | 'now' | 'next';

type TimelineEvent = {
  date: string;
  label: string;
  state: TimelineState;
  /** Muted, under the label. `— note` in a list item, or its body blocks. */
  note?: ReactNode;
};

export type DocsTimelineProps = {
  /** Drawn as `[ TITLE ]` on the frame. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /** Markdown: a list of `label: text` items. */
  children?: ReactNode;
};

const mark: Record<TimelineState, string> = {
  done: '●',
  now: '●',
  next: '○',
};

function eventsOf(children: ReactNode): TimelineEvent[] {
  return listItems(children).map((item) => {
    const { head, body } = itemParts(item);
    const text = textOf(head).replace(/\s+/g, ' ').trim();
    const { label: date, rest } = splitLabel(text);
    const { label, rest: aside } = splitDash(rest || date);
    const now = hasHost(head, ['strong', 'b']);
    const next = !now && hasHost(head, ['em', 'i']);
    return {
      date,
      label,
      note: body.length > 0 ? body : aside || undefined,
      state: now ? 'now' : next ? 'next' : 'done',
    };
  });
}

/**
 * Dated or ordered events, from a `docs-timeline` fence:
 *
 * ```md
 * - seed: captured in `scratchpad.md`
 * - **brainstorming: actively being explored**
 * - *summarized: finalized with a summary document*
 * ```
 *
 * Plain is done, bold is now, italic is next.
 */
export function DocsTimeline({ title, frame, children }: DocsTimelineProps) {
  const style = frameOf(frame);
  const events = eventsOf(children);

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : undefined}
    >
      <GraphBody frame={style}>
        <ol className='flex flex-col' role='list'>
          {events.map((event, index) => {
            const last = index === events.length - 1;
            const live = event.state === 'now';
            const next = event.state === 'next';

            return (
              <li className='flex flex-col' key={index}>
                <div className='grid grid-cols-[1.25rem_7rem_minmax(0,1fr)] items-baseline gap-x-4'>
                  <span
                    aria-hidden='true'
                    className={cn(
                      'text-center leading-none select-none',
                      live && 'text-graph-accent',
                      event.state === 'done' && 'text-fd-foreground',
                      next && 'text-graph-muted',
                    )}
                  >
                    {mark[event.state]}
                  </span>
                  <span
                    className={cn(
                      'tabular-nums',
                      next ? 'text-graph-muted' : 'text-fd-foreground',
                    )}
                  >
                    {event.date}
                  </span>
                  <span className='flex min-w-0 flex-col gap-1'>
                    <span
                      className={cn(
                        live && 'text-graph-accent',
                        event.state === 'done' && 'text-fd-foreground',
                        next && 'text-graph-muted',
                      )}
                    >
                      {event.label}
                    </span>
                    {event.note ? (
                      <GraphProse className='text-graph-muted'>
                        {event.note}
                      </GraphProse>
                    ) : null}
                  </span>
                </div>
                {last ? null : (
                  <div
                    aria-hidden='true'
                    className='grid grid-cols-[1.25rem_7rem_minmax(0,1fr)] gap-x-4 py-1 select-none'
                  >
                    <span className='text-center text-graph-frame'>│</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </GraphBody>
    </GraphFrame>
  );
}
