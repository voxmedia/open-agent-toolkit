/*!
Vendored from mdxcn (https://github.com/shadcn-labs/mdxcn), MIT licensed.

Upstream source: `registry/default/mdx/mdx.tsx`
from registry item `mdx` (https://mdxcn.dev/r/mdx.json), taken on
2026-11-20 (upstream main 884eba5, committed 2026-11-11). OAT owns this copy;
it does not track upstream.

OAT patches:
- Only the host-tag marking (`markHost`, `isMarked`) is adapted, into
  `withDocsFigures`, which replaces upstream `withMdxcn`.
- None of the alert, quote, terminal or footnote upgrades are included;
  callouts stay on GitHub alert syntax.
- `withDocsFigures` adds the eight `Docs*` figure components to the map.

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

import { createElement, type ElementType, type ReactNode } from 'react';

import { DocsAnnotate } from './annotate.js';
import { DocsCheck } from './check.js';
import { DocsCompare } from './compare.js';
import { DocsDecision } from './decision.js';
import { GRAPH_HOST_TAGS } from './graph-markdown.js';
import { DocsSteps } from './steps.js';
import { DocsTerminal } from './terminal.js';
import { DocsTimeline } from './timeline.js';
import { DocsTree } from './tree.js';

export { DocsAnnotate } from './annotate.js';
export type { DocsAnnotateProps } from './annotate.js';
export { DocsCheck } from './check.js';
export type { DocsCheckProps } from './check.js';
export { DocsCompare } from './compare.js';
export type { DocsCompareProps } from './compare.js';
export { DocsDecision } from './decision.js';
export type { DocsDecisionProps } from './decision.js';
export { DocsSteps } from './steps.js';
export type { DocsStepsProps } from './steps.js';
export { DocsTerminal } from './terminal.js';
export type { DocsTerminalProps } from './terminal.js';
export { DocsTimeline } from './timeline.js';
export type { DocsTimelineProps } from './timeline.js';
export { DocsTree } from './tree.js';
export type { DocsTreeProps } from './tree.js';

/** The MDX component names the `docs-*` fences render to. */
export const DOCS_FIGURE_COMPONENTS = [
  'DocsSteps',
  'DocsTree',
  'DocsTimeline',
  'DocsTerminal',
  'DocsDecision',
  'DocsCheck',
  'DocsCompare',
  'DocsAnnotate',
] as const;

export type DocsFigureName = (typeof DOCS_FIGURE_COMPONENTS)[number];

const DOCS_FIGURES = {
  DocsSteps,
  DocsTree,
  DocsTimeline,
  DocsTerminal,
  DocsDecision,
  DocsCheck,
  DocsCompare,
  DocsAnnotate,
} satisfies Record<DocsFigureName, unknown>;

export type DocsFigureComponents = typeof DOCS_FIGURES;

type AnyProps = { children?: ReactNode; [key: string]: unknown };

/** `li: ListItem` still reads as an `li` to the parent figure. */
function markHost(tag: string, Component: ElementType<AnyProps>) {
  function Host(props: AnyProps) {
    return createElement(Component, { ...props, 'data-graph-host': tag });
  }
  Host.graphHost = tag;
  Host.displayName = `Host(${tag})`;
  return Host;
}

function isMarked(value: unknown) {
  return (
    typeof value === 'function' &&
    typeof (value as { graphHost?: unknown }).graphHost === 'string'
  );
}

/**
 * Add the eight figure components to an MDX component map. Any host tag the
 * map overrides (`p`, `li`, `pre`, `table`, `a`, …) is marked, so figures
 * still recognize their Markdown children. A `Docs*` entry already in the
 * map is kept.
 *
 * ```tsx
 * <MDX
 *   components={withDocsFigures({ ...defaultComponents, Mermaid, Tab, Tabs })}
 * />
 * ```
 */
export function withDocsFigures<T extends Record<string, unknown>>(
  components: T,
): T & DocsFigureComponents {
  const out: Record<string, unknown> = { ...DOCS_FIGURES, ...components };

  for (const tag of GRAPH_HOST_TAGS) {
    const value = components[tag];
    if (value != null && !isMarked(value)) {
      out[tag] = markHost(tag, value as ElementType<AnyProps>);
    }
  }

  return out as T & DocsFigureComponents;
}
