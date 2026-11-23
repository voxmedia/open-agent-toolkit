/*
 * Unit tests for the vendored mdxcn frame, child parser and figures.css.
 *
 * Inputs are hand-built element trees declared inline, modeled on the element
 * shapes MDX produces for Markdown children and on the Fumadocs overrides of
 * `pre`, `table` and `a`. They test component logic only; fixtures captured
 * from a real compile arrive with the fence/component contract in p03-t01.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GraphBody, GraphFrame, GraphProse } from './graph-frame.js';
import {
  GRAPH_HOST_TAGS,
  hostOf,
  isHost,
  listItems,
} from './graph-markdown.js';

const figuresDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(figuresDir, '..', '..');
const repoRoot = resolve(packageRoot, '..', '..');
const tsxLoader = pathToFileURL(
  join(repoRoot, 'node_modules', 'tsx', 'dist', 'loader.mjs'),
).href;

const h = createElement;

/** A host-tag override the way `withDocsFigures` marks one. */
function marked(tag: string) {
  function Host(props: { children?: ReactNode }) {
    return h(tag, props);
  }
  Host.graphHost = tag;
  return Host;
}

/** Hidden-content markup that static figures must never render. */
function expectNoHiddenContent(html: string) {
  expect(html).not.toMatch(/opacity:\s*0(?![.\d])/);
  expect(html).not.toMatch(/style="[^"]*transform/);
  expect(html).not.toMatch(/translateY/);
  expect(html).not.toMatch(/data-motion|whileinview|\sinitial=/i);
}

describe('GraphFrame', () => {
  it('renders a visible, prose-isolated frame with the [ TITLE ] label', () => {
    const html = renderToStaticMarkup(
      h(
        GraphFrame,
        { title: 'Ideas' },
        h(GraphBody, null, h(GraphProse, null, h('p', null, 'Hello'))),
      ),
    );

    expect(html).toContain('[ IDEAS ]');
    expect(html).toMatch(/^<figure[^>]*class="[^"]*\bnot-prose\b/);
    expect(html).toContain('data-frame="box"');
    expect(html).toContain('graph-frame');
    expectNoHiddenContent(html);
  });

  it('takes the frame style from an explicit prop, with no inherited state', () => {
    const html = renderToStaticMarkup(
      h(
        GraphFrame,
        { title: 'Plain', frame: 'none' },
        h(GraphBody, { frame: 'none' }, 'body'),
      ),
    );

    expect(html).toContain('data-frame="none"');
    expect(html).not.toMatch(/class="[^"]*\bgraph-frame\b/);
    expect(html).toContain('p-0');
  });

  // `cn` has no tailwind-merge, so a padding reset placed beside the boxed
  // padding loses on stylesheet order (Tailwind emits `p-0`/`px-0` before
  // `px-5`/`py-7`). Each frame must carry exactly one padding set.
  it.each([
    ['box', ['px-5', 'py-7', 'sm:px-8', 'sm:py-8'], ['p-0', 'px-0']],
    ['corners', ['px-5', 'py-7', 'sm:px-8', 'sm:py-8'], ['p-0', 'px-0']],
    ['rule', ['px-0', 'py-7', 'sm:py-8'], ['px-5', 'sm:px-8', 'p-0']],
    ['none', ['p-0'], ['px-5', 'py-7', 'sm:px-8', 'sm:py-8', 'px-0']],
  ] as const)(
    'gives the %s frame body one non-conflicting padding set',
    (frame, present, absent) => {
      const html = renderToStaticMarkup(h(GraphBody, { frame }, 'body'));
      const classes = /class="([^"]*)"/.exec(html)?.[1].split(/\s+/) ?? [];

      for (const name of present) expect(classes).toContain(name);
      for (const name of absent) expect(classes).not.toContain(name);
    },
  );

  it('styles inline code as a code chip and uses only prefixed tokens', () => {
    const html = renderToStaticMarkup(
      h(GraphProse, null, h('p', null, 'Run ', h('code', null, 'oat'))),
    );

    expect(html).toContain('[&amp;_code]:bg-fd-muted');
    expect(html).not.toContain('[&amp;_code]:font-semibold');
    expect(html).not.toMatch(/\btext-foreground\b/);
  });
});

describe('graph-markdown host-tag detection', () => {
  const tags = [
    'p',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'code',
    'pre',
    'table',
    'a',
  ];

  it('lists every host tag figures read, including a', () => {
    for (const tag of tags) {
      expect(GRAPH_HOST_TAGS).toContain(tag);
    }
  });

  it.each(tags)('detects a plain <%s> element', (tag) => {
    expect(isHost(h(tag), tag)).toBe(true);
  });

  it.each(tags)('detects a marked <%s> override', (tag) => {
    expect(hostOf(h(marked(tag)))).toBe(tag);
    expect(isHost(h(marked(tag)), tag)).toBe(true);
  });

  it.each(tags)(
    'detects a rendered override carrying data-graph-host=%s',
    (tag) => {
      const Override = (props: object) => h('div', props);
      expect(isHost(h(Override, { 'data-graph-host': tag }), tag)).toBe(true);
    },
  );

  it('detects Fumadocs-style pre and table overrides by function name', () => {
    // Fumadocs' default `pre` is an arrow property named `pre`, and its
    // `table` override is a function named `Table`.
    const components = {
      pre: (props: { children?: ReactNode }) => h('div', null, props.children),
    };
    function Table(props: { children?: ReactNode }) {
      return h('div', null, h('table', props));
    }

    expect(isHost(h(components.pre), 'pre')).toBe(true);
    expect(isHost(h(Table), 'table')).toBe(true);
  });

  it('reads list items through marked ul and li overrides', () => {
    const Ul = marked('ul');
    const Li = marked('li');
    const items = listItems(
      h(Ul, null, h(Li, { key: 'a' }, 'one'), h(Li, { key: 'b' }, 'two')),
    );

    expect(items).toHaveLength(2);
  });
});

describe('figures.css', () => {
  const css = readFileSync(join(packageRoot, 'figures.css'), 'utf8');

  it('is exported and shipped by package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(packageRoot, 'package.json'), 'utf8'),
    ) as { exports: Record<string, unknown>; files: string[] };

    expect(pkg.exports['./figures.css']).toBe('./figures.css');
    expect(pkg.files).toContain('figures.css');
  });

  it('defines only --graph-* and --color-graph-* custom properties', () => {
    const defined = [...css.matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/g)].map(
      (match) => match[1],
    );

    expect(defined.length).toBeGreaterThan(0);
    for (const name of defined) {
      expect(name).toMatch(/^--(?:color-)?graph-/);
    }
    expect(css).not.toMatch(/--(?:background|foreground|destructive)\s*:/);
  });

  it('maps tokens onto Fumadocs colors with dark overrides', () => {
    expect(css).toContain('var(--color-fd-primary)');
    expect(css).toContain('var(--color-fd-muted-foreground)');
    expect(css).toMatch(/\.dark\s*\{/);
    expect(css).toMatch(/@theme inline\s*\{/);
  });

  it('carries the frame and rule utilities', () => {
    for (const utility of [
      'graph-frame',
      'graph-rule',
      'graph-rule-y',
      'scrollbar-graph',
      'graph-scroll-x',
    ]) {
      expect(css).toMatch(new RegExp(`@utility ${utility}\\s*\\{`));
    }
  });

  it('carries the full mdxcn MIT notice', () => {
    expect(css).toContain('Copyright (c) 2026 Keshav Bagaade');
    expect(css).toContain('Permission is hereby granted, free of charge');
    expect(css).toContain('OTHER DEALINGS IN THE\nSOFTWARE.');
  });
});

describe('figure modules are server components', () => {
  const modules = readdirSync(figuresDir)
    .filter((name) => /\.tsx?$/.test(name) && !name.endsWith('.test.ts'))
    .map((name) => join(figuresDir, name));

  const forbidden: [string, RegExp][] = [
    ['"use client"', /["']use client["']/],
    ['createContext', /\bcreateContext\b/],
    ['useContext', /\buseContext\b/],
    ['useState', /\buseState\b/],
    ['useEffect', /\buseEffect\b/],
    ['useReducer', /\buseReducer\b/],
    ['useLayoutEffect', /\buseLayoutEffect\b/],
    ['motion import', /from\s+["']motion(?:\/[\w-]+)?["']/],
  ];

  /** Import every module under React's `react-server` condition. */
  function importUnderReactServer(files: string[]) {
    const script =
      "const { pathToFileURL } = await import('node:url');" +
      'for (const file of process.argv.slice(1)) {' +
      '  await import(pathToFileURL(file).href);' +
      '}';
    return spawnSync(
      process.execPath,
      [
        '--no-deprecation',
        '--conditions=react-server',
        '--import',
        tsxLoader,
        '--input-type=module',
        '-e',
        script,
        ...files,
      ],
      { cwd: packageRoot, encoding: 'utf8' },
    );
  }

  it('covers every non-test figure module, .ts included', () => {
    const names = modules.map((file) => file.slice(figuresDir.length + 1));
    expect(names).toEqual(
      expect.arrayContaining([
        'graph-frame.tsx',
        'graph-markdown.ts',
        'index.ts',
        'steps.tsx',
      ]),
    );
    expect(names.some((name) => name.endsWith('.test.ts'))).toBe(false);
  });

  it.each(modules)('%s has no client-only code', (file) => {
    const source = readFileSync(file, 'utf8');
    for (const [label, pattern] of forbidden) {
      expect(pattern.test(source), `${label} in ${file}`).toBe(false);
    }
  });

  it('imports every figure module under node --conditions=react-server', () => {
    const result = importUnderReactServer(modules);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('fails the react-server import for a module that creates a context', () => {
    const probeDir = mkdtempSync(join(packageRoot, '.react-server-probe-'));
    try {
      const probe = join(probeDir, 'context-probe.tsx');
      writeFileSync(
        probe,
        "import * as React from 'react';\n" +
          'export const Probe = React.createContext(null);\n',
      );
      const result = importUnderReactServer([probe]);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/createContext is not a function/);
    } finally {
      rmSync(probeDir, { recursive: true, force: true });
    }
  });
});
