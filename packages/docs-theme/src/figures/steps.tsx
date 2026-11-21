/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/steps/steps.tsx`
from registry item `steps` (https://mdxcn.dev/r/steps.json), taken on
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
- Bold or italic marks the step state only when it is in the step title, not
  in the body.
- A loose step keeps every block after its title (lists and code included),
  not only paragraphs; a tight step keeps its nested lists.

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
import { frameOf, GraphBody, GraphFrame, GraphProse } from './graph-frame.js';
import {
  childNodes,
  childrenOf,
  hasHost,
  isHost,
  listItems,
  splitDash,
  textOf,
} from './graph-markdown.js';

type StepState = 'done' | 'now' | 'next';

type Step = {
  title: string;
  body?: ReactNode;
  state: StepState;
};

export type DocsStepsProps = {
  /** Drawn as `[ TITLE ]` on the frame. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /** Markdown: an ordered or unordered list, one item per step. */
  children?: ReactNode;
};

function isList(node: ReactNode) {
  return isValidElement(node) && isHost(node, ['ul', 'ol']);
}

/** Bold in the step title is the current step, italic is next. */
function stateOf(head: ReactNode): StepState {
  if (hasHost(head, ['strong', 'b'])) {
    return 'now';
  }
  return hasHost(head, ['em', 'i']) ? 'next' : 'done';
}

/**
 * A loose item (blank lines between) takes its first paragraph as the title
 * and every block after it as the body. A tight item reads `Title — body`.
 */
function stepsOf(children: ReactNode): Step[] {
  return listItems(children).map((item) => {
    const nodes = childNodes(childrenOf(item));
    const first = nodes.findIndex(
      (node) => isValidElement(node) && isHost(node, 'p'),
    );

    if (first === -1) {
      const head = nodes.filter((node) => !isList(node));
      const lists = nodes.filter(isList);
      const { label, rest } = splitDash(
        textOf(head).replace(/\s+/g, ' ').trim(),
      );
      const body = [rest || null, ...lists].filter(Boolean);
      return {
        title: label,
        body: body.length > 0 ? body : undefined,
        state: stateOf(head),
      };
    }

    const head = childrenOf(nodes[first] as ReactElement);
    const body = nodes.slice(first + 1).filter((node) => isValidElement(node));
    return {
      title: textOf(head).replace(/\s+/g, ' ').trim(),
      body: body.length > 0 ? body : undefined,
      state: stateOf(head),
    };
  });
}

/**
 * A numbered procedure, from a `docs-steps` fence:
 *
 * ```md
 * 1. Copy the source
 *
 *    Run the CLI.
 *
 * 2. **Register it**
 *
 *    Export it from `mdx-components.tsx`.
 *
 * 3. *Write*
 *
 *    Use it between paragraphs.
 * ```
 *
 * Bold is the current step, italic is next.
 */
export function DocsSteps({ title, frame, children }: DocsStepsProps) {
  const style = frameOf(frame);
  const steps = stepsOf(children);
  const digits = String(steps.length).length;

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : undefined}
    >
      <GraphBody frame={style}>
        <ol className='flex flex-col' role='list'>
          {steps.map((step, index) => {
            const last = index === steps.length - 1;
            const live = step.state === 'now';
            const next = step.state === 'next';
            const number = String(index + 1).padStart(Math.max(2, digits), '0');

            return (
              <li className='flex flex-col' key={index}>
                <div className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-3'>
                  <span
                    aria-hidden='true'
                    className={cn(
                      'tabular-nums select-none',
                      live && 'text-graph-accent',
                      next && 'text-graph-frame',
                      !live && !next && 'text-graph-muted',
                    )}
                  >
                    {number}
                  </span>
                  <div className='flex min-w-0 flex-col gap-2'>
                    {step.title ? (
                      <p
                        className={cn(
                          'text-pretty',
                          live && 'text-graph-accent',
                          next && 'text-graph-muted',
                          !live && !next && 'text-fd-foreground',
                        )}
                      >
                        {step.title}
                      </p>
                    ) : null}
                    {step.body ? (
                      <GraphProse
                        className={
                          next ? 'text-graph-muted' : 'text-fd-foreground/80'
                        }
                      >
                        {step.body}
                      </GraphProse>
                    ) : null}
                  </div>
                </div>
                {last ? null : (
                  <div
                    aria-hidden='true'
                    className='grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 py-2 select-none'
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
