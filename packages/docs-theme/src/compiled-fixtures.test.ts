/*
 * Replays real Fumadocs compile output through the live scaffold component
 * map, so the figures are tested against what a docs app actually hands them.
 *
 * Fixture provenance: `figures/__fixtures__/all-fences.compiled.js` is the
 * captured function-body output of `figures/__fixtures__/all-fences.md`,
 * compiled by `@mdx-js/mdx` with fumadocs-mdx's `applyMdxPreset` over the
 * shared docs-config remark chain (rehypeCode included). Its header records
 * the compiler versions and the exact capture command. Nothing here is
 * hand-built: the test runs the captured module and renders it fresh, so a
 * component regression fails it.
 *
 * The map is the scaffold's
 * `withDocsFigures({ ...defaultMdxComponents, Mermaid, Tab, Tabs, img: ZoomImage })`.
 * Only Fumadocs' `ImageZoom` is replaced: it imports a stylesheet Node
 * cannot load, and the fixture page has no image, so it never renders.
 *
 * This file sits in `src/` rather than `src/figures/` so the scaffold
 * components (`./mermaid.js`, `./tabs.js`, `./zoom-image.js`) are reached
 * without parent-relative imports.
 */
import { readFileSync } from 'node:fs';

import { run } from '@mdx-js/mdx';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { DOCS_FIGURE_COMPONENTS, withDocsFigures } from './figures/index.js';
import { Mermaid } from './mermaid.js';
import { Tab, Tabs } from './tabs.js';
import { ZoomImage } from './zoom-image.js';

vi.mock('fumadocs-ui/components/image-zoom', () => ({
  ImageZoom: (props: object) => createElement('img', props),
}));

const compiled = readFileSync(
  new URL('./figures/__fixtures__/all-fences.compiled.js', import.meta.url),
  'utf8',
);

let html = '';

beforeAll(async () => {
  const page = (await run(compiled, {
    ...runtime,
    baseUrl: import.meta.url,
  })) as { default: ComponentType<{ components: object }> };
  const components = withDocsFigures({
    ...defaultMdxComponents,
    Mermaid,
    Tab,
    Tabs,
    img: ZoomImage,
  });
  html = renderToStaticMarkup(createElement(page.default, { components }));
});

/** The `<figure>` whose frame label is `[ TITLE ]`. Figures never nest. */
function figure(title: string): string {
  const label = html.indexOf(`[ ${title} ]`);
  expect(label, `figure [ ${title} ]`).toBeGreaterThan(-1);
  const start = html.lastIndexOf('<figure', label);
  const end = html.indexOf('</figure>', label);
  return html.slice(start, end + '</figure>'.length);
}

/** Class tokens that hide content outright: Tailwind `hidden`, `invisible`, `opacity-0`. */
const HIDING_CLASS_TOKENS = new Set(['hidden', 'invisible', 'opacity-0']);

/** Every whitespace-separated token of every `class` attribute in `source`. */
function classTokens(source: string): string[] {
  return [...source.matchAll(/\sclass="([^"]*)"/g)].flatMap((match) =>
    (match[1] ?? '').split(/\s+/).filter(Boolean),
  );
}

function figures(): string[] {
  return html.match(/<figure[\s\S]*?<\/figure>/g) ?? [];
}

/** `[mark, label]` pairs: a mark span's class and text, then the next text. */
function marked(source: string, mark: RegExp): string[] {
  return [...source.matchAll(mark)].map((match) => match.slice(1).join('|'));
}

describe('captured Fumadocs compile output', () => {
  it('compiled all eight fences to their figure components', () => {
    for (const name of DOCS_FIGURE_COMPONENTS) {
      expect(compiled).toMatch(new RegExp(`_jsxs?\\(${name}, \\{`));
    }
    expect(figures()).toHaveLength(8);
  });

  it('draws steps as done, current and next from the title emphasis', () => {
    const steps = figure('SET UP FIGURES');
    expect(
      marked(
        steps,
        /select-none (text-graph-\w+)">(\d\d)<\/span><div[^>]*><p class="text-pretty ([\w-]+)">([^<]+)<\/p>/g,
      ),
    ).toEqual([
      'text-graph-muted|01|text-fd-foreground|Install the packages',
      'text-graph-accent|02|text-graph-accent|Register the components (current)',
      'text-graph-frame|03|text-graph-muted|Write a figure (next)',
    ]);
  });

  it('draws the tree inside its tab, with the bold path accented', () => {
    const tree = figure('PROJECT LEVEL');
    const panel = html.slice(
      html.lastIndexOf('role="tabpanel"', html.indexOf('[ PROJECT LEVEL ]')),
    );
    expect(panel).toMatch(/^role="tabpanel" aria-labelledby="[^"]*Layout"/);
    expect(html).toContain('role="tab" aria-selected="true"');
    expect(
      marked(
        tree,
        /<li class="grid[^"]*?( opacity-40)?">[\s\S]*?<span class="(text-[\w-]+)">([^<]+)<\/span>/g,
      ),
    ).toEqual([
      '|text-graph-accent|.oat/',
      '|text-graph-accent|projects/',
      '|text-graph-accent|shared/',
      '|text-graph-accent|mdxcn/',
      ' opacity-40|text-fd-foreground|plan.md',
      ' opacity-40|text-fd-foreground|state.md',
      ' opacity-40|text-fd-foreground|repo/',
    ]);
    expect(tree).toContain('the active project');
    expect(tree).toContain('task plan');
  });

  it('draws timeline events as done, now and next', () => {
    expect(
      marked(
        figure('IDEA LIFECYCLE'),
        /leading-none select-none (text-[\w-]+)">([●○])<\/span><span class="tabular-nums [\w-]+">([^<]+)<\/span>/g,
      ),
    ).toEqual([
      'text-fd-foreground|●|seed',
      'text-graph-accent|●|brainstorming',
      'text-graph-muted|○|summarized',
    ]);
  });

  it('reads terminal lines as comment, command, output and pass', () => {
    const terminal = figure('BUILD');
    expect(
      marked(
        terminal,
        /data-kind="(\w+)"><span aria-hidden="true" class="[^"]*">([^<]*)<\/span><span>([^<]+)<\/span>/g,
      ),
    ).toEqual([
      'comment| |# Build the docs site',
      'command|$|pnpm build:docs',
      'output| |Compiled 212 pages',
      'ok| |✓ static export written to out/',
    ]);
  });

  it('draws the chosen, rejected and open options and the follow-up', () => {
    const decision = figure('STORAGE');
    expect(
      marked(
        decision,
        /select-none (text-[\w-]+)">([●×○])<\/span><span class="[\w-]+">([^<]+)<\/span><span class="text-graph-muted[^"]*">([^<]+)<\/span>/g,
      ),
    ).toEqual([
      'text-graph-accent|●|Postgres (chosen)|we already run it',
      'text-graph-muted|×|MongoDB (rejected)|no schema guarantees',
      'text-graph-muted|○|SQLite|still open for local tools',
    ]);
    expect(decision).toContain('>accepted<');
    expect(decision).toContain('>2026-11-21<');
    expect(decision).toContain(
      'The service keeps its existing connection pool.',
    );
  });

  it('normalizes the .md link inside a figure', () => {
    const decision = figure('STORAGE');
    expect(decision).toMatch(/<a [^>]*href="\.\.\/guides\/storage\/"/);
    expect(decision).toContain('storage guide');
    expect(decision).not.toContain('storage.md');
  });

  it('reads GFM task boxes, notes and sub-tasks', () => {
    const check = figure('RELEASE READINESS');
    expect(
      marked(
        check,
        /select-none (text-[\w-]+)">(\[[x ]\])<\/span><span class="[^"]*"><span class="[\w-]+">([^<]+)<\/span>/g,
      ),
    ).toEqual([
      'text-graph-accent|[x]|Tests pass',
      'text-graph-muted|[ ]|Docs updated',
      'text-graph-accent|[x]|Markdown Features page',
      'text-graph-muted|[ ]|Scaffold contributing page',
    ]);
    expect(check).toContain('on the merged tree');
    expect(check).toContain('2 of 4 done');
  });

  it('draws compare cells as ✓ and – under the accented column', () => {
    const compare = figure('FIGURE OPTIONS');
    expect(compare).toContain(
      '<span class="text-right text-graph-accent">Fence</span>',
    );
    expect(compare).toContain(
      '<span class="text-right text-graph-muted">MDX component</span>',
    );
    expect(
      marked(
        compare,
        /wrap-break-word [\w-]+">([^<]+)<\/span><span class="[^"]*">([^<]+)<\/span><span class="[^"]*">([^<]+)<\/span>/g,
      ),
    ).toEqual([
      'Plain Markdown|✓|–',
      'Renders on GitHub|✓|–',
      'Needs imports|–|✓',
    ]);
  });

  it('pairs each annotate marker with its note', () => {
    const annotate = figure('SOURCE.CONFIG.TS');
    const [code, notes] = annotate.split('graph-rule');
    expect(
      marked(
        code ?? '',
        /text-graph-accent">(\[\d\])<\/span><span>([^<]+)<\/span>/g,
      ),
    ).toEqual([
      '[1]|import { createSourceConfig } from &#x27;@open-agent-toolkit/docs-config&#x27;;',
      '[2]|const config = createSourceConfig();',
    ]);
    expect(code).not.toContain('// (1)');
    expect(
      marked(
        notes ?? '',
        /text-graph-accent">(\[\d\])<\/span><div[^>]*>([\s\S]*?)<\/div>/g,
      ),
    ).toEqual([
      '[1]|The shared chain already includes the fence transform.',
      '[2]|Pass <code>appRoot</code> when the app is not the working directory.',
    ]);
  });

  it('renders server HTML that hides no figure content', () => {
    for (const source of figures()) {
      expect(source).not.toMatch(/opacity:\s*0(?![.\d])/);
      expect(source).not.toMatch(/\bopacity-0\b/);
      expect(source).not.toMatch(/\shidden(=|\s|>)/);
      expect(source).not.toMatch(/style="[^"]*(transform|visibility)/);
      expect(source).not.toMatch(/data-motion|whileinview|\sinitial=/i);
    }
  });

  it('carries no hiding class token anywhere in a figure class list', () => {
    const tokens = figures().flatMap(classTokens);
    expect(tokens.filter((token) => HIDING_CLASS_TOKENS.has(token))).toEqual(
      [],
    );
    // The legal look-alikes are really present, so the filter is not passing
    // on an empty input: `aria-hidden` is an attribute, not a class, and
    // `overflow-y-hidden` clips a scroll area without hiding its content.
    expect(tokens).toContain('overflow-y-hidden');
    expect(figures().join('')).toContain('aria-hidden="true"');
  });
});
