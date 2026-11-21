/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/decision/decision.tsx`
from registry item `decision` (https://mdxcn.dev/r/decision.json), taken on
2026-11-20 (upstream main 884eba5, committed 2026-11-11). OAT owns this copy;
it does not track upstream.

OAT patches:
- Static server component: the client directive, the motion animation module
  and every animation prop are removed.
- Rendered inside `GraphFrame` with an explicit `frame` prop (default `"box"`)
  passed to `GraphBody`; nothing reads an inherited frame.
- `text-foreground` is rewritten to `text-fd-foreground`; colors use the mono
  palette tones directly.
- Takes only fence props: `title`, `frame`, `status` and `date`. The JSX item form, the data
  props, `palette`, `corner` and `className` are dropped.

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

import type { ReactNode } from 'react';

import { cn } from './cn.js';
import {
  frameOf,
  GraphBody,
  GraphFrame,
  GraphProse,
  GraphRule,
} from './graph-frame.js';
import {
  childrenOf,
  elementsOf,
  hasHost,
  isHost,
  itemText,
  listItems,
  splitDash,
} from './graph-markdown.js';

type OptionState = 'chosen' | 'open' | 'rejected';

type DecisionOption = {
  label: string;
  reason?: string;
  state: OptionState;
};

export type DocsDecisionProps = {
  /** Drawn as `[ TITLE ]` on the frame. Default `decision`. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /** proposed, accepted, superseded — any word. First row, left. */
  status?: string;
  /** Muted, first row, right. */
  date?: string;
  /** Markdown: a list of options, then paragraphs for what follows. */
  children?: ReactNode;
};

const glyph: Record<OptionState, string> = {
  chosen: '●',
  open: '○',
  rejected: '×',
};

const tone: Record<OptionState, string> = {
  chosen: 'text-graph-accent',
  open: 'text-fd-foreground',
  rejected: 'text-graph-muted',
};

function optionsOf(children: ReactNode): DecisionOption[] {
  return listItems(children).map((item) => {
    const content = childrenOf(item);
    const { label, rest } = splitDash(itemText(item));
    const chosen = hasHost(content, ['strong', 'b']);
    const rejected = !chosen && hasHost(content, ['em', 'i']);
    return {
      label,
      reason: rest || undefined,
      state: chosen ? 'chosen' : rejected ? 'rejected' : 'open',
    };
  });
}

/**
 * One decision, the options next to it, and what follows, from a
 * `docs-decision` fence:
 *
 * ```md
 * - **Postgres** — boring, and we already run it
 * - *Mongo* — no joins we trust
 * - SQLite — fine until the second writer
 *
 * Revisit if writes pass 2k/s.
 * ```
 *
 * Bold is chosen, italic is rejected, plain stays open.
 */
export function DocsDecision({
  title,
  frame,
  status,
  date,
  children,
}: DocsDecisionProps) {
  const style = frameOf(frame);
  const options = optionsOf(children);
  const after = elementsOf(children).filter(
    (element) => !isHost(element, ['ul', 'ol']),
  );
  const chosen = options.find((option) => option.state === 'chosen');
  const statusText = typeof status === 'string' ? status : undefined;
  const dateText = typeof date === 'string' ? date : undefined;

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : 'decision'}
    >
      <GraphBody className='flex flex-col gap-4' frame={style}>
        {statusText || dateText ? (
          <>
            <div className='flex items-baseline justify-between gap-4'>
              <span className='text-fd-foreground'>{statusText ?? ''}</span>
              {dateText ? (
                <span className='text-graph-muted tabular-nums'>
                  {dateText}
                </span>
              ) : null}
            </div>
            <GraphRule />
          </>
        ) : null}
        <ul className='flex flex-col gap-2' role='list'>
          {options.map((option, index) => (
            <li
              className='grid grid-cols-[1.25rem_minmax(0,11rem)_minmax(0,1fr)] items-baseline gap-x-3 max-sm:grid-cols-[1.25rem_minmax(0,1fr)]'
              key={index}
            >
              <span
                aria-hidden='true'
                className={cn(
                  'text-center select-none',
                  option.state === 'open'
                    ? 'text-graph-muted'
                    : tone[option.state],
                )}
              >
                {glyph[option.state]}
              </span>
              <span className={tone[option.state]}>{option.label}</span>
              {option.reason ? (
                <span className='text-graph-muted max-sm:col-start-2'>
                  {option.reason}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {after.length > 0 ? (
          <>
            <GraphRule />
            <GraphProse className='text-fd-foreground/80'>{after}</GraphProse>
          </>
        ) : null}
        {chosen ? (
          <span className='sr-only'>
            Chose {chosen.label} over {options.length - 1} other options.
          </span>
        ) : null}
      </GraphBody>
    </GraphFrame>
  );
}
