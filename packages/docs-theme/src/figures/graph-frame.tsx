/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/graph-frame/graph-frame.tsx`
from registry item `graph-frame` (https://mdxcn.dev/r/graph-frame.json), taken on
2026-11-20 (upstream main 884eba5, committed 2026-11-11). OAT owns this copy;
it does not track upstream.

OAT patches:
- Static server component: the client directive, the motion animation module
  and every animation prop are removed.
- Upstream's frame context (provider, hook and the consumer in `Graph`) is
  removed; React's react-server build has no context API. `GraphFrame` (upstream
  `Graph`) and `GraphBody` take an explicit `frame` prop, default `"box"`.
- The frame root carries `not-prose`, so Fumadocs prose styles stay out.
- The title is uppercased in the markup, so `[ TITLE ]` reads the same
  without CSS.
- Inline `code` in `GraphProse` renders as a code chip, not bold.
- Generic shadcn tokens are rewritten to Fumadocs ones: `text-foreground`
  becomes `text-fd-foreground` and `var(--background)` becomes
  `var(--color-fd-background)`.
- `cn` is a local class joiner (`./cn.ts`), with no tailwind-merge.
  `GraphBody` therefore takes exactly one padding set per frame instead of
  appending a reset that tailwind-merge would have resolved.
- The table item helpers (`Head`, `Row`, `Foot`, `Cell`, `cellsOf`,
  `alignsOf`) and the graph-markdown re-exports are dropped; figures import
  `./graph-markdown.js` directly.

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

import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from './cn.js';

/**
 * How a graph is framed.
 *
 * - `box`: dashed border, corner marks, title on the top edge. The default.
 * - `corners`: corner marks only, title on the top edge.
 * - `rule`: dashed rules above and below, title on the top rule.
 * - `none`: no border and no padding. The title sits above the content.
 */
export type GraphFrameStyle = 'box' | 'corners' | 'rule' | 'none';

export const GRAPH_FRAMES = ['box', 'corners', 'rule', 'none'] as const;

/** An author-supplied frame value, or `box` when it is not a known style. */
export function frameOf(value: unknown): GraphFrameStyle {
  return GRAPH_FRAMES.find((frame) => frame === value) ?? 'box';
}

/**
 * Corner marks and the edge title paint over the dashed line with the
 * surface behind the figure. Set `--graph-surface` on a parent when a graph
 * sits on anything other than the page background.
 */
export function GraphCorners({ mark = '+' }: { mark?: string }) {
  const corner =
    'pointer-events-none absolute z-10 flex size-4 items-center justify-center bg-[var(--graph-surface,var(--color-fd-background))] font-mono text-sm leading-none text-graph-frame select-none';

  return (
    <>
      <span
        aria-hidden='true'
        className={cn(corner, 'top-0 left-0 -translate-x-1/2 -translate-y-1/2')}
      >
        {mark}
      </span>
      <span
        aria-hidden='true'
        className={cn(corner, 'top-0 right-0 translate-x-1/2 -translate-y-1/2')}
      >
        {mark}
      </span>
      <span
        aria-hidden='true'
        className={cn(
          corner,
          'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
        )}
      >
        {mark}
      </span>
      <span
        aria-hidden='true'
        className={cn(
          corner,
          'right-0 bottom-0 translate-x-1/2 translate-y-1/2',
        )}
      >
        {mark}
      </span>
    </>
  );
}

export function GraphTitle({
  placement = 'edge',
  className,
  children,
  ...props
}: Omit<ComponentProps<'figcaption'>, 'children'> & {
  /** `edge` sits on the top border. `inline` sits above the content. */
  placement?: 'edge' | 'inline';
  children: string;
}) {
  return (
    <figcaption
      className={cn(
        'tracking-wide whitespace-nowrap uppercase',
        placement === 'edge'
          ? 'absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 bg-[var(--graph-surface,var(--color-fd-background))] px-2.5'
          : 'mb-4 block truncate',
        className,
      )}
      {...props}
    >
      <span className='graph-title-ink text-graph-accent'>
        {`[ ${children.toUpperCase()} ]`}
      </span>
    </figcaption>
  );
}

// One padding set per frame: `cn` has no tailwind-merge, so a reset placed
// beside the boxed padding would lose on Tailwind's stylesheet order.
const bodyPadding: Record<GraphFrameStyle, string> = {
  box: 'px-5 py-7 sm:px-8 sm:py-8',
  corners: 'px-5 py-7 sm:px-8 sm:py-8',
  rule: 'px-0 py-7 sm:py-8',
  none: 'p-0',
};

export function GraphBody({
  frame = 'box',
  className,
  ...props
}: ComponentProps<'div'> & {
  /** The enclosing frame's style. Pass the same value given to `GraphFrame`. */
  frame?: GraphFrameStyle;
}) {
  return (
    <div className={cn('min-w-0', bodyPadding[frame], className)} {...props} />
  );
}

export function GraphRule({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden='true'
      className={cn('graph-rule w-full', className)}
      {...props}
    />
  );
}

export function GraphRuleY({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden='true'
      className={cn('graph-rule-y self-stretch', className)}
      {...props}
    />
  );
}

export function GraphTrack({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden='true'
      className={cn('flex w-full min-w-0 select-none', className)}
      {...props}
    />
  );
}

export function GraphTick({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn('min-w-0 flex-1 overflow-hidden text-center', className)}
      {...props}
    />
  );
}

/**
 * Markdown children inside a frame — paragraphs, lists, inline code, links.
 * MDX renders `<p>` / `<ul>` / `<code>` here; this keeps them quiet and
 * on the mono grid instead of inheriting the page's prose styles, and capped
 * at 72 characters so a wide page doesn't stretch lines past reading length.
 * Block flow, not flex, so JSX text with an inline link stays on one line.
 * Inline code is a chip, as in the surrounding docs; code inside `pre` is not.
 */
export const graphProseClass = cn(
  'max-w-[72ch] min-w-0 space-y-3 leading-relaxed',
  '[&_p]:m-0 [&_p]:text-pretty',
  '[&_ul]:m-0 [&_ul]:flex [&_ul]:list-none [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:p-0',
  '[&_ol]:m-0 [&_ol]:flex [&_ol]:list-none [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:p-0',
  "[&_li]:relative [&_li]:pl-4 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-graph-muted [&_li]:before:content-['-']",
  '[&_a]:text-fd-foreground [&_a]:underline [&_a]:decoration-graph-frame [&_a]:decoration-dashed [&_a]:underline-offset-[0.2em]',
  '[&_code]:rounded-sm [&_code]:bg-fd-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:text-fd-foreground',
  '[&_pre]:m-0 [&_pre]:whitespace-pre-wrap [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_strong]:font-semibold [&_strong]:text-fd-foreground',
  '[&_em]:text-graph-muted [&_em]:not-italic',
);

export function GraphProse({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn(graphProseClass, className)} {...props} />;
}

/**
 * The figure: a dashed frame with corner marks and a `[ TITLE ]` label. The
 * frame style is an explicit prop; nothing is inherited from a parent.
 */
export function GraphFrame({
  title,
  corner = '+',
  frame = 'box',
  className,
  children,
  ...props
}: ComponentProps<'figure'> & {
  /** Drawn as `[ TITLE ]`. Pass `""` to drop a default title. */
  title?: string;
  corner?: string;
  frame?: GraphFrameStyle;
  children?: ReactNode;
}) {
  const captionId = useId();

  return (
    <figure
      aria-labelledby={title ? captionId : undefined}
      className={cn(
        'not-prose relative w-full min-w-0 font-mono text-sm text-fd-foreground',
        frame === 'box' && 'graph-frame',
        className,
      )}
      data-frame={frame}
      {...props}
    >
      {title ? (
        <GraphTitle
          id={captionId}
          placement={frame === 'none' ? 'inline' : 'edge'}
        >
          {title}
        </GraphTitle>
      ) : null}
      {frame === 'box' || frame === 'corners' ? (
        <GraphCorners mark={corner} />
      ) : null}
      {frame === 'rule' ? (
        <>
          <GraphRule className='absolute inset-x-0 top-0' />
          <GraphRule className='absolute inset-x-0 bottom-0' />
        </>
      ) : null}
      {children}
    </figure>
  );
}
