/*
 * Unit tests for DocsSteps, DocsTree and DocsTimeline.
 *
 * Inputs are hand-built element trees declared inline. They are modeled on
 * upstream mdxcn examples (the Steps and GraphTree doc comments, the grammar
 * table in mdxcn `lib/docs/grammar.ts`) and on the spike's converted
 * `workflows/ideas/lifecycle.md` page, in the shape MDX gives reparsed
 * Markdown: host-tag elements separated by newline strings. Captured compile
 * fixtures come in p03-t01.
 */
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DocsSteps } from './steps.js';
import { DocsTimeline } from './timeline.js';
import { DocsTree } from './tree.js';

const h = createElement;

function render(
  Component: (props: { title?: string; children?: ReactNode }) => ReactNode,
  title: string,
  children: ReactNode,
) {
  return renderToStaticMarkup(h(Component, { title }, children));
}

function text(html: string) {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&');
}

function expectNoHiddenContent(html: string) {
  expect(html).not.toMatch(/opacity:\s*0(?![.\d])/);
  expect(html).not.toMatch(/style="[^"]*transform/);
  expect(html).not.toMatch(/translateY/);
  expect(html).not.toMatch(/data-motion|whileinview|\sinitial=/i);
}

/** `docs-steps title="Ideas flow"` from the spike lifecycle page (loose list). */
const stepsInput = h(
  'ol',
  null,
  '\n',
  h(
    'li',
    { key: 1 },
    '\n',
    h('p', null, 'Quick capture'),
    '\n',
    h(
      'p',
      null,
      h('code', null, 'oat-idea-scratchpad'),
      ' reviews or captures idea seeds.',
    ),
    '\n',
  ),
  '\n',
  h(
    'li',
    { key: 2 },
    h('p', null, 'Start brainstorming'),
    h(
      'p',
      null,
      h('code', null, 'oat-idea-new'),
      ' scaffolds the directory, then invokes ',
      h('code', null, 'oat-idea-ideate'),
      '.',
    ),
  ),
  h(
    'li',
    { key: 3 },
    h('p', null, h('strong', null, 'Resume brainstorming')),
    h(
      'p',
      null,
      h('code', null, 'oat-idea-ideate'),
      ' runs as many sessions as you need over time.',
    ),
  ),
  h(
    'li',
    { key: 4 },
    h('p', null, h('em', null, 'Finalize')),
    h(
      'p',
      null,
      h('code', null, 'oat-idea-summarize'),
      ' generates the summary and updates the backlog.',
    ),
  ),
);

/** `docs-tree title="Project level"` from the spike lifecycle page. */
const treeInput = h(
  'ul',
  null,
  h(
    'li',
    { key: 'root' },
    '.oat/ideas/',
    '\n',
    h(
      'ul',
      null,
      h('li', { key: 'b' }, 'backlog.md — aggregated list of all ideas'),
      h('li', { key: 's' }, 'scratchpad.md — quick-capture pad for idea seeds'),
      h(
        'li',
        { key: 'i' },
        '{idea-name}/',
        '\n',
        h(
          'ul',
          null,
          h('li', { key: 'd' }, 'discovery.md — brainstorming document'),
          h('li', { key: 'm' }, 'summary.md — generated when finalized'),
        ),
      ),
    ),
  ),
);

/** `docs-timeline title="Idea states"` from the spike lifecycle page. */
const timelineInput = h(
  'ul',
  null,
  h(
    'li',
    { key: 'seed' },
    'seed: captured in ',
    h('code', null, 'scratchpad.md'),
  ),
  h(
    'li',
    { key: 'brainstorming' },
    h('strong', null, 'brainstorming: actively being explored'),
  ),
  h(
    'li',
    { key: 'summarized' },
    h('em', null, 'summarized: finalized with a summary document'),
  ),
);

describe('DocsSteps', () => {
  const html = render(DocsSteps, 'Ideas flow', stepsInput);

  it('numbers each step and renders its title and body', () => {
    expect(html).toContain('[ IDEAS FLOW ]');
    const out = text(html);
    for (const [number, title, body] of [
      ['01', 'Quick capture', 'oat-idea-scratchpad reviews or captures'],
      ['02', 'Start brainstorming', 'oat-idea-new scaffolds the directory'],
      ['03', 'Resume brainstorming', 'oat-idea-ideate runs as many sessions'],
      ['04', 'Finalize', 'oat-idea-summarize generates the summary'],
    ] as const) {
      expect(out).toContain(`${number}${title}${body}`);
    }
  });

  it('keeps inline code in step bodies as code', () => {
    expect(html).toContain('<code>oat-idea-scratchpad</code>');
  });

  it('marks bold as now and italic as next', () => {
    expect(html).toMatch(
      /class="[^"]*text-graph-accent[^"]*">Resume brainstorming</,
    );
    expect(html).toMatch(/class="[^"]*text-graph-muted[^"]*">Finalize</);
    expect(html).toMatch(/class="[^"]*text-fd-foreground[^"]*">Quick capture</);
  });

  it('keeps every block of a step body, not only paragraphs', () => {
    const withList = render(
      DocsSteps,
      'Install',
      h(
        'ol',
        null,
        h(
          'li',
          { key: 1 },
          h('p', null, 'Install'),
          h('p', null, 'Pick one:'),
          h('ul', null, h('li', null, 'pnpm add x')),
        ),
      ),
    );
    expect(text(withList)).toContain('pnpm add x');
  });

  it('accepts unordered lists and tight items with a — body', () => {
    const tight = render(
      DocsSteps,
      'Tight',
      h('ul', null, h('li', { key: 1 }, 'Copy — run the CLI')),
    );
    expect(text(tight)).toContain('01Copyrun the CLI');
  });

  it('reads a tight step state from its title, not its — body', () => {
    const tight = render(
      DocsSteps,
      'Tight',
      h(
        'ul',
        null,
        h('li', { key: 1 }, 'Copy — run the ', h('strong', null, 'CLI')),
        h('li', { key: 2 }, 'Wire — then ', h('em', null, 'export')),
        h('li', { key: 3 }, h('strong', null, 'Register'), ' — export it'),
        h('li', { key: 4 }, h('em', null, 'Write'), ' — use it'),
      ),
    );
    expect(tight).toMatch(/class="[^"]*text-fd-foreground[^"]*">Copy</);
    expect(tight).toMatch(/class="[^"]*text-fd-foreground[^"]*">Wire</);
    expect(tight).toMatch(/class="[^"]*text-graph-accent[^"]*">Register</);
    expect(tight).toMatch(/class="[^"]*text-graph-muted[^"]*">Write</);
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});

describe('DocsTree', () => {
  const html = render(DocsTree, 'Project level', treeInput);

  it('draws nesting with branch glyphs', () => {
    expect(html).toContain('[ PROJECT LEVEL ]');
    expect(html).toContain('>.oat/ideas/<');
    expect(html).toContain('>├─ </span>');
    expect(html).toContain('>└─ </span>');
  });

  it('preserves the indent under a last-child folder', () => {
    expect(html).toMatch(
      /<span class="whitespace-pre"><span[^>]*>   ├─ <\/span><span[^>]*>discovery\.md</,
    );
    expect(html).toMatch(/>   └─ <\/span><span[^>]*>summary\.md</);
  });

  it('right-aligns the — note in its own column', () => {
    expect(html).toMatch(
      /grid-cols-\[minmax\(0,1fr\)_auto\][^>]*>.*?scratchpad\.md<\/span><\/span><span class="[^"]*text-graph-muted[^"]*">quick-capture pad for idea seeds<\/span>/,
    );
    expect(text(html)).not.toContain('scratchpad.md —');
  });

  it('keeps every dash segment of a note after the name', () => {
    const noted = render(
      DocsTree,
      'Notes',
      h('ul', null, h('li', { key: 1 }, 'api — server – v2 only')),
    );
    expect(noted).toMatch(/>api</);
    expect(noted).toMatch(
      /class="[^"]*text-graph-muted[^"]*">server — v2 only</,
    );
  });

  it('accents bold nodes and dims the rest without hiding them', () => {
    const accented = render(
      DocsTree,
      'Accent',
      h(
        'ul',
        null,
        h('li', { key: 1 }, h('strong', null, 'api')),
        h('li', { key: 2 }, 'web'),
      ),
    );
    expect(accented).toMatch(/class="text-graph-accent">api</);
    expect(accented).toContain('opacity-40');
    expectNoHiddenContent(accented);
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});

describe('DocsTimeline', () => {
  const html = render(DocsTimeline, 'Idea states', timelineInput);

  it('splits each item into a label and its text', () => {
    expect(html).toContain('[ IDEA STATES ]');
    const out = text(html);
    expect(out).toContain('seedcaptured in scratchpad.md');
    expect(out).toContain('brainstormingactively being explored');
    expect(out).toContain('summarizedfinalized with a summary document');
  });

  it('draws plain as done, bold as now and italic as next', () => {
    expect(html).toMatch(
      /class="[^"]*text-fd-foreground[^"]*">●<\/span><span[^>]*>seed</,
    );
    expect(html).toMatch(
      /class="[^"]*text-graph-accent[^"]*">●<\/span><span[^>]*>brainstorming</,
    );
    expect(html).toMatch(
      /class="[^"]*text-graph-accent[^"]*">actively being explored</,
    );
    expect(html).toMatch(
      /class="[^"]*text-graph-muted[^"]*">○<\/span><span[^>]*>summarized</,
    );
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});
