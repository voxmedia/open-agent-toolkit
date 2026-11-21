/*
 * Unit tests for DocsTerminal, DocsDecision, DocsCheck, DocsCompare and
 * DocsAnnotate.
 *
 * Inputs are hand-built element trees declared inline. Their grammar follows
 * the upstream mdxcn registry source and doc comments (terminal, decision,
 * graph-check, graph-compare and annotate) and the upstream grammar table in
 * `lib/docs/grammar.ts`. Their shape follows what Fumadocs hands a component:
 * fenced code arrives inside the real Fumadocs `pre` override (CodeBlock)
 * with Shiki line spans, and a GFM table arrives inside the real Fumadocs
 * `table` override. Captured compile fixtures come in p03-t01.
 */
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DocsAnnotate } from './annotate.js';
import { DocsCheck } from './check.js';
import { DocsCompare } from './compare.js';
import { DocsDecision } from './decision.js';
import { DocsTerminal } from './terminal.js';

const h = createElement;
const FumadocsPre = defaultMdxComponents.pre as (props: object) => ReactNode;
const FumadocsTable = defaultMdxComponents.table as (
  props: object,
) => ReactNode;

function text(html: string) {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

function expectNoHiddenContent(html: string) {
  expect(html).not.toMatch(/opacity:\s*0(?![.\d])/);
  expect(html).not.toMatch(/style="[^"]*transform/);
  expect(html).not.toMatch(/translateY/);
  expect(html).not.toMatch(/data-motion|whileinview|\sinitial=/i);
}

/** A highlighted fence as Fumadocs renders it: `pre > code > span.line`. */
function shikiPre(source: string) {
  const lines = source.split('\n');
  const children: ReactNode[] = [];
  lines.forEach((line, index) => {
    if (index > 0) {
      children.push('\n');
    }
    children.push(
      h(
        'span',
        { className: 'line', key: index },
        h('span', { style: { '--shiki-light': '#24292E' } }, line),
      ),
    );
  });
  return h(
    FumadocsPre,
    {
      className: 'shiki shiki-themes github-light github-dark',
      style: { '--shiki-light-bg': '#fff' },
      tabIndex: 0,
      icon: '<svg viewBox="0 0 24 24"></svg>',
    },
    h('code', null, ...children),
  );
}

describe('DocsTerminal', () => {
  const html = renderToStaticMarkup(
    h(
      DocsTerminal,
      { title: 'Build' },
      shikiPre(
        [
          '# build the docs site',
          '$ pnpm build:docs',
          '✓ 120 pages built',
          'Route (app)  Size',
        ].join('\n'),
      ),
    ),
  );

  it('classifies $ commands, # comments and output from the raw code child', () => {
    expect(html).toContain('[ BUILD ]');
    expect(html).toMatch(
      /data-kind="comment"[^>]*>.*?<span>(?:<!-- -->)?# build the docs site</,
    );
    expect(html).toMatch(
      /data-kind="command"[^>]*><span[^>]*text-graph-accent[^>]*>\$<\/span><span>pnpm build:docs</,
    );
    expect(html).toMatch(/data-kind="ok"[^>]*>.*?✓ 120 pages built/);
    expect(html).toMatch(/data-kind="output"[^>]*>.*?Route \(app\) {2}Size/);
  });

  it('defaults the title to shell', () => {
    expect(
      renderToStaticMarkup(h(DocsTerminal, null, shikiPre('$ ls'))),
    ).toContain('[ SHELL ]');
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});

describe('DocsDecision', () => {
  const html = renderToStaticMarkup(
    h(
      DocsDecision,
      { title: 'Database', status: 'accepted', date: 'Mar 12' },
      h(
        'ul',
        null,
        h(
          'li',
          { key: 1 },
          h('strong', null, 'Postgres'),
          ' — boring, and we already run it',
        ),
        h('li', { key: 2 }, h('em', null, 'Mongo'), ' — no joins we trust'),
        h('li', { key: 3 }, 'SQLite — fine until the second writer'),
      ),
      h('p', null, 'Revisit if writes pass 2k/s.'),
    ),
  );

  it('marks bold as chosen with the accent', () => {
    expect(html).toMatch(
      /text-graph-accent[^>]*>●<\/span><span class="text-graph-accent">Postgres</,
    );
  });

  it('marks italic as rejected and muted', () => {
    expect(html).toMatch(
      /text-graph-muted[^>]*>×<\/span><span class="text-graph-muted">Mongo</,
    );
  });

  it('keeps a plain option open', () => {
    expect(html).toMatch(/>○<\/span><span class="text-fd-foreground">SQLite</);
  });

  it('renders each — reason, the status, the date and what follows', () => {
    const out = text(html);
    expect(html).toMatch(
      /class="[^"]*text-graph-muted[^"]*">boring, and we already run it</,
    );
    expect(out).toContain('no joins we trust');
    expect(out).toContain('fine until the second writer');
    expect(out).toContain('accepted');
    expect(out).toContain('Mar 12');
    expect(out).toContain('Revisit if writes pass 2k/s.');
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});

describe('DocsCheck', () => {
  const box = (checked: boolean) =>
    h('input', { type: 'checkbox', checked, disabled: true, readOnly: true });

  const html = renderToStaticMarkup(
    h(
      DocsCheck,
      { title: 'Release' },
      h(
        'ul',
        { className: 'contains-task-list' },
        h(
          'li',
          { className: 'task-list-item', key: 1 },
          box(true),
          ' freeze tokens — design signed off',
        ),
        h(
          'li',
          { className: 'task-list-item', key: 2 },
          box(false),
          ' ship registry json',
          '\n',
          h(
            'ul',
            { className: 'contains-task-list' },
            h(
              'li',
              { className: 'task-list-item', key: 'a' },
              box(true),
              ' write the schema',
            ),
            h(
              'li',
              { className: 'task-list-item', key: 'b' },
              box(false),
              ' publish',
            ),
          ),
        ),
        h(
          'li',
          { className: 'task-list-item', key: 3 },
          h('p', null, box(true), ' loose item, done'),
        ),
      ),
    ),
  );

  it('draws [x] rows as done and the rest as open', () => {
    expect(html).toMatch(
      /text-graph-accent[^>]*>\[x\]<\/span><span[^>]*><span class="text-fd-foreground">freeze tokens</,
    );
    expect(html).toMatch(
      /text-graph-muted[^>]*>\[ \]<\/span><span[^>]*><span class="text-graph-muted">ship registry json</,
    );
    expect(html).toMatch(
      />\[x\]<\/span><span[^>]*><span[^>]*>loose item, done</,
    );
  });

  it('renders the — note and nested sub-tasks', () => {
    expect(html).toMatch(/text-graph-muted">design signed off</);
    expect(html).toMatch(
      /ship registry json<\/span><ul[^>]*><li[^>]*><span[^>]*>\[x\]<\/span><span[^>]*><span[^>]*>write the schema</,
    );
    expect(text(html)).toContain('[ ]publish');
    expect(text(html)).toContain('3 of 5 done');
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});

describe('DocsCompare', () => {
  const table = (first: string, rows: string[][]) =>
    h(
      FumadocsTable,
      null,
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', null, first),
          h('th', null, 'Solo'),
          h('th', null, 'Studio'),
        ),
      ),
      h(
        'tbody',
        null,
        ...rows.map((cells, index) =>
          h(
            'tr',
            { key: index },
            ...cells.map((cell, cellIndex) =>
              h('td', { key: cellIndex }, cell),
            ),
          ),
        ),
      ),
    );

  const html = renderToStaticMarkup(
    h(
      DocsCompare,
      { title: 'Plans' },
      table('', [
        ['Registry', 'true', 'yes'],
        ['Themes', 'false', 'no'],
        ['Seats', '1', '10'],
      ]),
    ),
  );

  it('turns the table header into option columns', () => {
    expect(html).toMatch(/>Solo<\/span><span[^>]*>Studio</);
    const out = text(html);
    expect(out).toContain('Registry✓✓');
    expect(out).toContain('Themes––');
    expect(out).toContain('Seats110');
  });

  it('draws true as an accented ✓ and false as a faint –', () => {
    expect(html).toMatch(/text-graph-accent[^"]*">✓</);
    expect(html).toMatch(/text-graph-frame[^"]*">–</);
  });

  it('keeps a named first header as the label column header', () => {
    const named = renderToStaticMarkup(
      h(DocsCompare, null, table('Feature', [['Registry', 'yes', 'no']])),
    );
    expect(named).toMatch(
      />Feature<\/span><span[^>]*>Solo<\/span><span[^>]*>Studio</,
    );
    expect(text(named)).toContain('Registry✓–');
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});

describe('DocsAnnotate', () => {
  const html = renderToStaticMarkup(
    h(
      DocsAnnotate,
      { title: 'page.tsx' },
      shikiPre(
        [
          "import { withDocsFigures } from '@open-agent-toolkit/docs-theme'; // (1)",
          '',
          'const components = withDocsFigures(defaultComponents); // (2)',
          'export default components;',
        ].join('\n'),
      ),
      '\n',
      h(
        'ol',
        null,
        h('li', { key: 1 }, 'Server-safe: no client directive.'),
        h(
          'li',
          { key: 2 },
          'Adds the eight ',
          h('code', null, 'Docs*'),
          ' figures.',
        ),
      ),
    ),
  );

  it('pairs // (n) markers in the code with the ordered notes', () => {
    expect(html).toContain('[ PAGE.TSX ]');
    expect(html).toMatch(
      /text-fd-foreground[^>]*><span[^>]*text-graph-accent[^>]*>\[1\]<\/span><span>import \{ withDocsFigures \} from &#x27;@open-agent-toolkit\/docs-theme&#x27;;<\/span>/,
    );
    expect(html).toMatch(
      />\[2\]<\/span><span>const components = withDocsFigures\(defaultComponents\);<\/span>/,
    );
    expect(html).not.toContain('// (1)');
    expect(html).toMatch(
      /text-graph-muted[^>]*><span[^>]*text-transparent[^>]*> <\/span><span>export default components;</,
    );
    expect(html).toMatch(
      />\[1\]<\/span><div[^>]*>Server-safe: no client directive\.</,
    );
    expect(html).toMatch(
      />\[2\]<\/span><div[^>]*>Adds the eight <code>Docs\*<\/code> figures\.</,
    );
  });

  it('falls back to a code title when no title is given', () => {
    expect(
      renderToStaticMarkup(h(DocsAnnotate, null, shikiPre('x // (1)'))),
    ).toContain('[ CODE ]');
  });

  it('renders no hidden content', () => {
    expectNoHiddenContent(html);
  });
});
