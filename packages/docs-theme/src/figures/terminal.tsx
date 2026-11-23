/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/terminal/terminal.tsx`
from registry item `terminal` (https://mdxcn.dev/r/terminal.json), taken on
2026-11-20 (upstream main 884eba5, committed 2026-11-11). OAT owns this copy;
it does not track upstream.

OAT patches:
- Static server component: the client directive, the motion animation module
  and every animation prop are removed.
- Rendered inside `GraphFrame` with an explicit `frame` prop (default `"box"`)
  passed to `GraphBody`; nothing reads an inherited frame.
- `text-foreground` is rewritten to `text-fd-foreground`; colors use the mono
  palette tones directly.
- Takes only fence props: `title`, `frame` and `prompt`. The JSX item form, the data
  props, `palette`, `corner` and `className` are dropped.
- Each line carries `data-kind` (command, comment, ok or output).

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
import { frameOf, GraphBody, GraphFrame } from './graph-frame.js';
import { textOf } from './graph-markdown.js';

export type DocsTerminalProps = {
  /** Drawn as `[ TITLE ]` on the frame. Default `shell`. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /** The prompt glyph that marks a command line. Default `$`. */
  prompt?: string;
  /** The raw fence body, as one code block. */
  children?: ReactNode;
};

type LineKind = 'command' | 'comment' | 'ok' | 'output';

type Line = { kind: LineKind; text: string };

function parse(source: string, prompt: string): Line[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  while (lines.length > 0 && lines[0]?.trim() === '') {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
    lines.pop();
  }

  return lines.map((raw) => {
    const text = raw.replace(/\s+$/, '');

    if (text.startsWith(`${prompt} `) || text === prompt) {
      return { kind: 'command', text: text.slice(prompt.length).trimStart() };
    }

    if (text.startsWith('#')) {
      return { kind: 'comment', text };
    }

    if (/^[✓✔√]/.test(text)) {
      return { kind: 'ok', text };
    }

    return { kind: 'output', text };
  });
}

const lineTone: Record<LineKind, string> = {
  command: 'text-fd-foreground',
  comment: 'text-graph-muted',
  ok: 'text-graph-accent',
  output: 'text-graph-muted',
};

/**
 * A shell session, from a `docs-terminal` fence. The body stays raw:
 *
 * ```text
 * # build the docs
 * $ pnpm build:docs
 * ✓ 120 pages built
 * ```
 *
 * `$ cmd` is a command, `# …` a comment, a `✓` line a passing check, and
 * the rest is output.
 */
export function DocsTerminal({
  title,
  frame,
  prompt,
  children,
}: DocsTerminalProps) {
  const style = frameOf(frame);
  const mark = typeof prompt === 'string' && prompt !== '' ? prompt : '$';
  const lines = parse(textOf(children), mark);

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : 'shell'}
    >
      <GraphBody className='overflow-x-auto overflow-y-hidden' frame={style}>
        <pre className='m-0 flex min-w-max flex-col gap-0.5 leading-relaxed whitespace-pre'>
          {lines.map((line, index) => (
            <code
              className={cn(
                'grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2',
                lineTone[line.kind],
              )}
              data-kind={line.kind}
              key={index}
            >
              <span
                aria-hidden='true'
                className={cn(
                  'text-center select-none',
                  line.kind === 'command'
                    ? 'text-graph-accent'
                    : 'text-transparent',
                )}
              >
                {line.kind === 'command' ? mark : ' '}
              </span>
              <span>{line.text || ' '}</span>
            </code>
          ))}
        </pre>
      </GraphBody>
    </GraphFrame>
  );
}
