/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/graph-compare/graph-compare.tsx`
from registry item `graph-compare` (https://mdxcn.dev/r/graph-compare.json), taken on
2026-11-20 (upstream main 884eba5, committed 2026-11-11). OAT owns this copy;
it does not track upstream.

OAT patches:
- Static server component: the client directive, the motion animation module
  and every animation prop are removed.
- Rendered inside `GraphFrame` with an explicit `frame` prop (default `"box"`)
  passed to `GraphBody`; nothing reads an inherited frame.
- `text-foreground` is rewritten to `text-fd-foreground`; colors use the mono
  palette tones directly.
- Takes only fence props: `title`, `frame` and `accent`. The JSX item form, the data
  props, `palette`, `corner` and `className` are dropped.
- The first table column is always the row-label column. A named first
  header is drawn above the labels; upstream made it an option column and
  shifted every value by one.
- A last bold or `Total` row stays as a row instead of being dropped as a
  footer.
- Dimmed cells use the `opacity-40` class instead of an inline opacity style.

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
import { frameOf, GraphBody, GraphFrame } from './graph-frame.js';
import { tableOf } from './graph-markdown.js';

type CompareCell = string | boolean;

type CompareRow = {
  label: string;
  values: CompareCell[];
};

export type DocsCompareProps = {
  /** Drawn as `[ TITLE ]` on the frame. */
  title?: string;
  /** `box` (default), `corners`, `rule` or `none`. */
  frame?: string;
  /** Column name to highlight. Other columns recede. */
  accent?: string;
  /** Markdown: a GFM table. The first column holds the row labels. */
  children?: ReactNode;
};

function compareCell(token: string): CompareCell {
  const value = token.trim();
  const key = value.toLowerCase();
  if (key === 'true' || key === 'yes' || value === '✓' || key === 'x') {
    return true;
  }
  if (
    key === 'false' ||
    key === 'no' ||
    value === '–' ||
    value === '-' ||
    value === '—'
  ) {
    return false;
  }
  return value;
}

function cellText(value: CompareCell) {
  if (typeof value === 'boolean') {
    return value ? '✓' : '–';
  }
  return value;
}

/** A blank, `—` or `-` first header leaves the label column unnamed. */
function labelHeaderOf(header: string | undefined) {
  return header === undefined || ['', '—', '-'].includes(header) ? '' : header;
}

/**
 * Options side by side, from a `docs-compare` fence:
 *
 * ```md
 * |          | Solo | Studio |
 * | -------- | ---- | ------ |
 * | Registry | yes  | yes    |
 * | Themes   | no   | yes    |
 * ```
 *
 * `yes`/`true`/`✓` draw ✓, `no`/`false`/`–` draw –, and any other text
 * stays as written.
 */
export function DocsCompare({
  title,
  frame,
  accent: accentProp,
  children,
}: DocsCompareProps) {
  const style = frameOf(frame);
  const accent = typeof accentProp === 'string' ? accentProp : undefined;
  const table = tableOf(children);
  const labelHeader = labelHeaderOf(table?.headers[0]);
  const columns = table?.headers.slice(1) ?? [];
  const rows: CompareRow[] = table
    ? [...table.rows, ...(table.footer ? [table.footer] : [])].map((row) => ({
        label: row[0] ?? '',
        values: row.slice(1).map(compareCell),
      }))
    : [];
  const template = `minmax(7rem,1fr) repeat(${columns.length}, minmax(4rem, 7rem))`;

  return (
    <GraphFrame
      frame={style}
      title={typeof title === 'string' ? title : undefined}
    >
      <GraphBody className='overflow-x-auto overflow-y-hidden' frame={style}>
        <div className='flex flex-col gap-3'>
          <div
            className='grid items-end gap-x-4'
            style={{ gridTemplateColumns: template }}
          >
            <span className='text-graph-muted'>{labelHeader}</span>
            {columns.map((column, index) => (
              <span
                className={cn(
                  'text-right',
                  accent && column === accent
                    ? 'text-graph-accent'
                    : 'text-graph-muted',
                )}
                key={index}
              >
                {column}
              </span>
            ))}
          </div>
          <ul className='flex flex-col gap-2' role='list'>
            {rows.map((row, rowIndex) => (
              <li
                className='grid items-baseline gap-x-4'
                key={rowIndex}
                style={{ gridTemplateColumns: template }}
              >
                <span className='min-w-0 wrap-break-word text-fd-foreground'>
                  {row.label}
                </span>
                {columns.map((column, index) => {
                  const value = row.values[index];
                  const focused = Boolean(accent) && column === accent;
                  const dim = Boolean(accent) && !focused;
                  const mark = typeof value === 'boolean';
                  const on = value === true;

                  return (
                    <span
                      className={cn(
                        'text-right',
                        !mark && 'tabular-nums',
                        on && !dim && 'text-graph-accent',
                        on && dim && 'text-fd-foreground',
                        mark && !on && 'text-graph-frame',
                        !mark && focused && 'text-fd-foreground',
                        !mark && dim && 'text-graph-muted',
                        dim && !on && 'opacity-40',
                      )}
                      key={index}
                    >
                      {value == null ? '' : cellText(value)}
                    </span>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      </GraphBody>
    </GraphFrame>
  );
}
