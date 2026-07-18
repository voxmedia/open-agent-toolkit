import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  REPRESENTATIVE_WIDTHS,
  auditArtifactSet,
  checkArtifactCohesion,
  checkHtmlStructure,
  runBrowserProbes,
} from '../scripts/lib/qa.mjs';
import { renderArtifact } from '../scripts/lib/render.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';
import { runRenderQaCli } from '../scripts/render-qa.mjs';

const fixture = (
  body = '<h1>System overview</h1><p>Ready.</p>',
  extra = '',
) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>System overview</title>
    <style>
      ${extra}
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation: none !important; transition: none !important; }
      }
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`;

const deck = () =>
  fixture(
    '<h1>Briefing</h1><section class="slide"><h2>Ready</h2></section>',
  ).replace(
    '</body>',
    `<script>
      addEventListener('keydown', (event) => {
        if (['ArrowRight', 'ArrowDown'].includes(event.key)) go(1);
        if (['ArrowLeft', 'ArrowUp'].includes(event.key)) go(-1);
      });
    </script></body>`,
  );

test('accepts a self-contained, balanced and accessible artifact', () => {
  const report = checkHtmlStructure({
    id: 'overview',
    html: fixture(
      '<h1>System overview</h1><h2 id="details">Details</h2><a href="#details">Read details</a>',
    ),
  });

  assert.deepEqual(report, { valid: true, issues: [] });
});

test('rejects unresolved tokens, configured leaks and non-inline assets', async () => {
  const seededLeak = await readFile(
    new URL('fixtures/seeded-leak.html', import.meta.url),
    'utf8',
  );
  const cases = [
    [fixture('<h1>{{TITLE}}</h1>'), [], 'unresolved-token'],
    [seededLeak, ['ORCA_PRIVATE_BUCKET'], 'denylisted-string'],
    [
      fixture(
        '<h1>Remote</h1><img src="https://cdn.example.com/private.png" alt="">',
      ),
      [],
      'external-asset',
    ],
    [
      fixture('<h1>Local file</h1><img src="./logo.svg" alt="">'),
      [],
      'external-asset',
    ],
    [
      fixture(
        '<h1>Remote</h1>',
        '@import url("https://cdn.example.com/a.css");',
      ),
      [],
      'external-asset',
    ],
  ];

  for (const [html, denylist, code] of cases) {
    const report = checkHtmlStructure({ id: code, html, denylist });
    assert.equal(report.valid, false, code);
    assert.ok(
      report.issues.some((issue) => issue.code === code),
      code,
    );
  }
});

test('rejects unbalanced tags, unreadable headings and unsafe links', () => {
  const html = fixture(
    '<h1> </h1><h3>Skipped level</h3><section><a href="">Empty</a><a href="/root/path">Root</a><a href="javascript:alert(1)">Unsafe</a>',
  );
  const report = checkHtmlStructure({ id: 'broken', html });

  for (const code of [
    'tag-balance',
    'heading-text',
    'heading-order',
    'link-form',
  ]) {
    assert.ok(
      report.issues.some((issue) => issue.code === code),
      code,
    );
  }
});

test('requires reduced-motion CSS and both deck arrow pairs', () => {
  const noMotion = fixture(
    '<h1>Animated page</h1>',
    'html { scroll-behavior: smooth; }',
  ).replace(
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?<\/style>/,
    '</style>',
  );
  const incompleteDeck = deck().replaceAll("'ArrowDown'", "'PageDown'");

  assert.ok(
    checkHtmlStructure({ id: 'motion', html: noMotion }).issues.some(
      (issue) => issue.code === 'reduced-motion',
    ),
  );
  assert.ok(
    checkHtmlStructure({
      id: 'deck',
      type: 'deck',
      html: incompleteDeck,
    }).issues.some((issue) => issue.code === 'deck-keyboard'),
  );
  assert.equal(
    checkHtmlStructure({ id: 'deck', type: 'deck', html: deck() }).valid,
    true,
  );
});

test('accepts representative output from every bundled renderer', async () => {
  const { theme } = await resolveTheme();
  const cases = [
    ['hub', 'house-style'],
    ['diagram', 'diagram-shell'],
    ['explainer', 'engineer-tour'],
    ['deck', 'deck-shell'],
  ];

  for (const [type, template] of cases) {
    const id = `${type}-artifact`;
    const rendered = await renderArtifact({
      recipeArtifact: { id, type, template, required: true },
      content: {
        artifactId: id,
        slug: 'qa-demo',
        title: 'QA demo',
        description: 'Representative output.',
        sections: [
          { id: 'overview', title: 'Overview', content: 'Ready.' },
          { id: 'details', title: 'Details', content: 'Complete.' },
        ],
      },
      theme,
      renderStrategy: 'default-only',
    });

    assert.deepEqual(
      checkHtmlStructure({ id, type, html: rendered.html }),
      { valid: true, issues: [] },
      type,
    );
  }
});

test('runs browser probe contract at representative widths with reduced motion', async () => {
  const calls = [];
  const report = await runBrowserProbes({
    artifacts: [{ id: 'page', type: 'hub', html: fixture() }],
    probe: async (request) => {
      calls.push(request);
      return {
        pageOverflowX: false,
        clippedX: [],
        reducedMotion: true,
        keyboard: { tab: true },
      };
    },
  });

  assert.deepEqual(
    calls.map(({ viewport }) => viewport.width),
    REPRESENTATIVE_WIDTHS,
  );
  assert.ok(calls.every(({ reducedMotion }) => reducedMotion === 'reduce'));
  assert.ok(calls.every(({ evaluate }) => typeof evaluate === 'string'));
  assert.deepEqual(report, { valid: true, issues: [], probes: calls.length });
});

test('browser probes reject page and inner-container x-axis clipping', async () => {
  const report = await runBrowserProbes({
    artifacts: [{ id: 'page', type: 'hub', html: fixture() }],
    widths: [320],
    probe: async () => ({
      pageOverflowX: true,
      clippedX: [
        {
          selector: '.diagram-viewport',
          overflowX: 'hidden',
          clientWidth: 300,
          scrollWidth: 900,
        },
      ],
      reducedMotion: false,
      keyboard: { tab: false },
    }),
  });

  for (const code of [
    'viewport-overflow',
    'inner-x-overflow',
    'reduced-motion',
    'keyboard-navigation',
  ]) {
    assert.ok(
      report.issues.some((issue) => issue.code === code),
      code,
    );
  }
});

test('browser probes require both deck arrow pairs', async () => {
  const report = await runBrowserProbes({
    artifacts: [{ id: 'deck', type: 'deck', html: deck() }],
    widths: [768],
    probe: async () => ({
      pageOverflowX: false,
      clippedX: [],
      reducedMotion: true,
      keyboard: {
        tab: true,
        arrows: {
          ArrowLeft: true,
          ArrowRight: true,
          ArrowUp: false,
          ArrowDown: false,
        },
      },
    }),
  });

  assert.ok(
    report.issues.some((issue) => issue.code === 'keyboard-navigation'),
  );
});

test('accepts cohesive terminology, numeric claims and statuses', () => {
  const artifacts = [
    {
      id: 'hub',
      cohesion: {
        terminology: { product: 'Explainer Kit' },
        numericClaims: { artifactCount: 4, completion: '100%' },
        statuses: { release: 'ready' },
      },
    },
    {
      id: 'deck',
      cohesion: {
        terminology: { product: ' explainer kit ' },
        numericClaims: { artifactCount: '4', completion: '100%' },
        statuses: { release: 'READY' },
      },
    },
  ];

  assert.deepEqual(checkArtifactCohesion(artifacts), {
    valid: true,
    issues: [],
  });
});

test('rejects inconsistent terminology, numeric claims and statuses', () => {
  const fields = [
    ['terminology', 'product', 'Explainer Kit', 'Explanation Suite'],
    ['numericClaims', 'artifactCount', 4, 5],
    ['statuses', 'release', 'ready', 'blocked'],
  ];

  for (const [group, key, first, second] of fields) {
    const report = checkArtifactCohesion([
      { id: 'hub', cohesion: { [group]: { [key]: first } } },
      { id: 'deck', cohesion: { [group]: { [key]: second } } },
    ]);
    assert.equal(report.valid, false, group);
    assert.ok(
      report.issues.some((issue) => issue.code === `cohesion-${group}`),
      group,
    );
  }
});

test('composes structural, cohesion and optional browser checks', async () => {
  const report = await auditArtifactSet({
    artifacts: [
      {
        id: 'hub',
        type: 'hub',
        html: fixture(),
        cohesion: { statuses: { release: 'ready' } },
      },
      {
        id: 'deck',
        type: 'deck',
        html: deck(),
        cohesion: { statuses: { release: 'ready' } },
      },
    ],
  });

  assert.equal(report.valid, true);
  assert.equal(report.browser, null);
  assert.equal(report.artifacts.length, 2);
});

test('CLI reads an explicit request and returns machine-readable QA', async () => {
  const logs = [];
  const exitCode = await runRenderQaCli(
    [new URL('fixtures/seeded-leak.html', import.meta.url).pathname],
    { log: (value) => logs.push(value) },
    { denylist: ['ORCA_PRIVATE_BUCKET'] },
  );

  assert.equal(exitCode, 1);
  assert.equal(JSON.parse(logs[0]).valid, false);
});
