/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/annotate/annotate.tsx`
from registry item `annotate` (https://mdxcn.dev/r/annotate.json), taken on
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

import type { ReactElement, ReactNode } from 'react';

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
  isHost,
  itemParts,
  listItems,
  textOf,
} from './graph-markdown.js';

export type DocsAnnotateProps = {
  /** Drawn as `[ TITLE ]` on the frame. Defaults to the code language, or `code`. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /**
   * Markdown: a fenced block with `// (1)` markers, then an ordered list. The
   * first item explains (1), the second (2).
   */
  children?: ReactNode;
};

type CodeLine = { text: string; mark?: number };

/** `// (1)`, `# (2)`, `/* (3) *\/`, `<!-- (4) -->`, `{/* (5) *\/}` at line end. */
const MARKER =
  /\s*(?:\/\/|#|--|;|%|\/\*|<!--|\{\/\*)\s*\((\d{1,2})\)\s*(?:\*\/\}|\*\/|-->)?\s*$/;

function linesOfCode(source: string): CodeLine[] {
  const lines = source.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');

  return lines.map((line) => {
    const match = line.match(MARKER);
    if (!match || match.index == null) {
      return { text: line };
    }
    return { text: line.slice(0, match.index), mark: Number(match[1]) };
  });
}

/**
 * The fence language from a `language-*` class on the code element. Fumadocs'
 * highlighter does not add one by default, so give the fence a `title`.
 */
function languageOf(pre: ReactElement | undefined) {
  const code = pre
    ? elementsOf(childrenOf(pre)).find((element) => isHost(element, 'code'))
    : undefined;
  const className = (code?.props as { className?: unknown } | undefined)
    ?.className;
  const match =
    typeof className === 'string' ? className.match(/language-(\S+)/) : null;
  return match?.[1];
}

/**
 * Code with numbered notes, from a `docs-annotate` fence (four backticks
 * outside, so the inner fence survives):
 *
 * ````md
 * ```tsx
 * import { withDocsFigures } from '@open-agent-toolkit/docs-theme'; // (1)
 * ```
 *
 * 1. Adds the eight figure components.
 * ````
 *
 * Marked lines stay bright. The rest recede.
 */
export function DocsAnnotate({ title, frame, children }: DocsAnnotateProps) {
  const style = frameOf(frame);
  const elements = elementsOf(children);
  const pre = elements.find((element) => isHost(element, 'pre'));
  const lines = linesOfCode(textOf(pre));
  const notes = listItems(
    elements.filter((element) => isHost(element, ['ol', 'ul'])),
  ).map((note) => {
    const { head, body } = itemParts(note);
    return body.length > 0 ? [head, ...body] : head;
  });
  const marked = new Set(lines.flatMap((line) => line.mark ?? []));
  const width = Math.max(
    1,
    ...[...marked, notes.length].map(String).map((n) => n.length),
  );
  const tag = (index: number) => `[${String(index).padStart(width, ' ')}]`;

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : (languageOf(pre) ?? 'code')}
    >
      <GraphBody className='flex flex-col gap-5' frame={style}>
        <div className='overflow-x-auto overflow-y-hidden'>
          <pre className='m-0 flex min-w-max flex-col gap-0.5 leading-relaxed whitespace-pre'>
            {lines.map((line, index) => (
              <code
                className={cn(
                  'grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3',
                  line.mark ? 'text-fd-foreground' : 'text-graph-muted',
                )}
                key={index}
              >
                <span
                  aria-hidden='true'
                  className={cn(
                    'tabular-nums select-none',
                    line.mark ? 'text-graph-accent' : 'text-transparent',
                  )}
                >
                  {line.mark ? tag(line.mark) : ' '}
                </span>
                <span>{line.text || ' '}</span>
              </code>
            ))}
          </pre>
        </div>
        {notes.length > 0 ? (
          <>
            <GraphRule />
            <ol className='flex flex-col gap-3' role='list'>
              {notes.map((note, index) => (
                <li
                  className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-3'
                  key={index}
                >
                  <span
                    aria-hidden='true'
                    className={cn(
                      'tabular-nums select-none',
                      marked.has(index + 1)
                        ? 'text-graph-accent'
                        : 'text-graph-muted',
                    )}
                  >
                    {tag(index + 1)}
                  </span>
                  <GraphProse className='text-fd-foreground'>{note}</GraphProse>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </GraphBody>
    </GraphFrame>
  );
}
