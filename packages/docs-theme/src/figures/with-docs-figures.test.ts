/*
 * Tests for withDocsFigures, the package exports and the no-hidden-content
 * guard over all eight figures.
 *
 * The package index is checked as source text: importing it under vitest
 * loads Fumadocs' image-zoom CSS through ZoomImage, which Node cannot import.
 *
 * Inputs are hand-built element trees declared inline, modeled on upstream
 * mdxcn examples and doc comments, in the shape MDX gives reparsed Markdown.
 * Captured compile fixtures come in p03-t01.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { isHost } from './graph-markdown.js';
import * as figures from './index.js';
import { DOCS_FIGURE_COMPONENTS, withDocsFigures } from './index.js';

const h = createElement;
const figuresDir = dirname(fileURLToPath(import.meta.url));

type Figure = (props: Record<string, unknown>) => ReactNode;

const li = (key: number, ...children: ReactNode[]) =>
  h('li', { key }, ...children);

/** One small inline input per figure, in its fence grammar. */
const inputs: Record<(typeof DOCS_FIGURE_COMPONENTS)[number], ReactNode> = {
  DocsSteps: h(
    'ol',
    null,
    li(1, h('p', null, 'Install'), h('p', null, 'Run the CLI.')),
    li(2, h('p', null, h('strong', null, 'Register')), h('p', null, 'Wrap.')),
  ),
  DocsTree: h(
    'ul',
    null,
    li(1, 'src/', h('ul', null, li(1, 'index.ts — entry'))),
  ),
  DocsTimeline: h(
    'ul',
    null,
    li(1, 'seed: captured'),
    li(2, h('strong', null, 'now: exploring')),
    li(3, h('em', null, 'next: summary')),
  ),
  DocsTerminal: h(
    'pre',
    null,
    h('code', null, '# comment\n$ pnpm build\n✓ done\noutput'),
  ),
  DocsDecision: h(
    'ul',
    null,
    li(1, h('strong', null, 'Postgres'), ' — we run it'),
    li(2, h('em', null, 'Mongo'), ' — no joins'),
  ),
  DocsCheck: h(
    'ul',
    null,
    li(
      1,
      h('input', { type: 'checkbox', checked: true, readOnly: true }),
      ' a',
    ),
    li(
      2,
      h('input', { type: 'checkbox', checked: false, readOnly: true }),
      ' b',
    ),
  ),
  DocsCompare: h(
    'table',
    null,
    h(
      'thead',
      null,
      h('tr', null, h('th', null, ''), h('th', null, 'A'), h('th', null, 'B')),
    ),
    h(
      'tbody',
      null,
      h(
        'tr',
        null,
        h('td', null, 'x'),
        h('td', null, 'yes'),
        h('td', null, 'no'),
      ),
    ),
  ),
  DocsAnnotate: [
    h('pre', { key: 'pre' }, h('code', null, 'const x = 1; // (1)')),
    h('ol', { key: 'ol' }, li(1, 'Why x is 1.')),
  ],
};

describe('withDocsFigures', () => {
  function Paragraph(props: { children?: ReactNode }) {
    return h('p', { className: 'custom' }, props.children);
  }
  const Mermaid = () => null;

  it('keeps existing entries and adds all eight figures', () => {
    const components = withDocsFigures({ Mermaid, img: 'img' });

    expect(components.Mermaid).toBe(Mermaid);
    expect(components.img).toBe('img');
    for (const name of DOCS_FIGURE_COMPONENTS) {
      expect(typeof components[name]).toBe('function');
      expect(components[name]).toBe(figures[name]);
    }
  });

  it('marks host-tag overrides so figures still detect them', () => {
    const components = withDocsFigures({ p: Paragraph });
    const P = components.p as (props: object) => ReactNode;

    expect(P).not.toBe(Paragraph);
    expect(isHost(h(P), 'p')).toBe(true);
    expect(renderToStaticMarkup(h(P, null, 'hi'))).toBe(
      '<p class="custom">hi</p>',
    );
    expect(withDocsFigures(components).p).toBe(P);
  });

  it('lets figures read Markdown rendered through marked overrides', () => {
    const components = withDocsFigures({ p: Paragraph, li: 'li' });
    const P = components.p as (props: object) => ReactNode;
    const html = renderToStaticMarkup(
      h(
        components.DocsSteps,
        null,
        h('ol', null, li(1, h(P, null, 'Install'), h(P, null, 'Run it.'))),
      ),
    );

    expect(html).toContain('>01</span>');
    expect(html).toMatch(/<p class="[^"]*">Install<\/p>/);
  });
});

describe('package exports', () => {
  it('lists the eight figures', () => {
    expect([...DOCS_FIGURE_COMPONENTS].sort()).toEqual(
      [
        'DocsAnnotate',
        'DocsCheck',
        'DocsCompare',
        'DocsDecision',
        'DocsSteps',
        'DocsTerminal',
        'DocsTimeline',
        'DocsTree',
      ].sort(),
    );
  });

  it('re-exports the figures, the name list and withDocsFigures from the package index', () => {
    const index = readFileSync(join(figuresDir, '..', 'index.ts'), 'utf8');
    const block = /export \{([^}]*)\} from '\.\/figures\/index\.js';/.exec(
      index,
    )?.[1];
    const names = (block ?? '').split(',').map((name) => name.trim());

    for (const name of [
      ...DOCS_FIGURE_COMPONENTS,
      'DOCS_FIGURE_COMPONENTS',
      'withDocsFigures',
    ]) {
      expect(names).toContain(name);
    }
  });
});

describe('no-hidden-content guard', () => {
  it.each([...DOCS_FIGURE_COMPONENTS])(
    '%s renders fully visible server HTML',
    (name) => {
      const Figure = figures[name] as Figure;
      const html = renderToStaticMarkup(
        h(Figure, { title: name }, inputs[name]),
      );

      expect(html).toContain(`[ ${name.toUpperCase()} ]`);
      expect(html).not.toMatch(/opacity:\s*0(?![.\d])/);
      expect(html).not.toMatch(/translateY/);
      expect(html).not.toMatch(/data-motion/);
    },
  );

  it('ships no "use client" figure module or dependency', () => {
    const modules = readdirSync(figuresDir).filter(
      (file) => /\.tsx?$/.test(file) && !file.endsWith('.test.ts'),
    );
    expect(modules.length).toBeGreaterThan(0);
    for (const file of modules) {
      const source = readFileSync(join(figuresDir, file), 'utf8');
      expect(source, file).not.toMatch(/["']use client["']/);
      for (const [, specifier] of source.matchAll(
        /^(?:import|export)\b[^;]*?\sfrom\s+'([^']+)'/gm,
      )) {
        expect(
          specifier === 'react' || specifier!.startsWith('./'),
          `${file} imports ${specifier}`,
        ).toBe(true);
      }
    }
  });
});
