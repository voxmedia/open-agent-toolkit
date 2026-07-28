import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { mock, test } from 'node:test';

import {
  RUNTIME_UNAVAILABLE_REASONS,
  resolveHeadlessRuntime,
} from '../scripts/lib/browser-runtime.mjs';
import {
  GUIDELINE_WARNING_IDS,
  REPRESENTATIVE_WIDTHS,
  RENDER_QA_WARNING_IDS,
  auditArtifactSet,
  checkArtifactCohesion,
  checkGuidelines,
  checkHtmlStructure,
  checkSourceDumping,
  runBrowserProbes,
} from '../scripts/lib/qa.mjs';
import { evaluateExpansionProposals } from '../scripts/lib/recipes.mjs';
import { renderArtifact } from '../scripts/lib/render.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';
import { runVisualReview } from '../scripts/lib/visual-review.mjs';
import { runRenderQaCli, runRenderQaStage } from '../scripts/render-qa.mjs';

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

function png(width, height) {
  const bytes = Buffer.alloc(45);
  Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').copy(bytes);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  Buffer.from('0000000049454e44ae426082', 'hex').copy(bytes, 33);
  return bytes;
}

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

const guidelineRecipe = () => ({
  schemaVersion: 'explainer-kit.recipe/v2',
  id: 'guideline-fixture',
  version: '1',
  sourceRoles: [],
  floor: [
    {
      id: 'recap',
      type: 'hub',
      authoring: 'markdown',
      template: 'house-style',
      required: true,
      briefRef: 'briefs/fixture.md',
      requiredNarrative: ['request', 'architecture', 'outcome'],
    },
  ],
  expansion: {
    profiles: [
      {
        profileId: 'supporting-diagram',
        type: 'diagram',
        authoring: 'html',
        briefRef: 'briefs/supporting-diagram.md',
        shell: 'diagram-shell',
        maxCount: 1,
      },
    ],
    limits: { maxArtifacts: 1 },
  },
  discoveryLimits: {
    consecutiveNoNewFindingsRounds: 1,
    maxRounds: 1,
  },
});

test('accepts a self-contained, balanced and accessible artifact', () => {
  const report = checkHtmlStructure({
    id: 'overview',
    html: fixture(
      '<h1>System overview</h1><h2 id="details">Details</h2><a href="#details">Read details</a>',
    ),
  });

  assert.deepEqual(report, { valid: true, issues: [] });
});

test('guideline checker reports stable non-blocking floor warning ids', () => {
  const report = checkGuidelines({
    recipe: guidelineRecipe(),
    artifacts: [
      {
        id: 'recap',
        type: 'hub',
        html: fixture(
          '<h1>Recap</h1><section id="request"><h2>Request</h2><p>Ship it.</p></section><section id="outcome"><h2>Outcome</h2><p>Done.</p></section>',
        ),
      },
    ],
  });

  assert.equal(report.valid, true);
  assert.deepEqual(report.warnings, [
    GUIDELINE_WARNING_IDS.narrativeCoverage,
    GUIDELINE_WARNING_IDS.architectureDiagram,
    GUIDELINE_WARNING_IDS.structuredDepth,
  ]);
});

test('guideline checker accepts rich coverage with an inline diagram', () => {
  const report = checkGuidelines({
    recipe: guidelineRecipe(),
    artifacts: [
      {
        id: 'recap',
        type: 'hub',
        html: fixture(`<h1>Recap</h1>
          <section id="request"><h2>Request</h2><ul><li>Ship it.</li></ul></section>
          <section id="architecture"><h2>Architecture</h2><svg class="narrative-diagram" role="img" aria-label="Architecture diagram"></svg></section>
          <section id="outcome"><h2>Outcome</h2><table><tr><th>Check</th></tr><tr><td>Passed</td></tr></table></section>`),
      },
    ],
  });

  assert.deepEqual(report, { valid: true, warnings: [] });
});

test('guideline checker preserves over-limit expansion warnings', () => {
  const recipe = guidelineRecipe();
  const expansion = evaluateExpansionProposals(recipe, [
    {
      id: 'diagram-one',
      profileId: 'supporting-diagram',
      rationale: 'Show the top-level flow.',
    },
    {
      id: 'diagram-two',
      profileId: 'supporting-diagram',
      rationale: 'Show a second flow.',
    },
  ]);
  const report = checkGuidelines({
    recipe,
    artifacts: [
      {
        id: 'recap',
        type: 'hub',
        html: fixture(`<h1>Recap</h1>
          <section id="request"><h2>Request</h2><ul><li>Ship it.</li></ul></section>
          <section id="architecture"><h2>Architecture</h2></section>
          <section id="outcome"><h2>Outcome</h2><table><tr><td>Passed</td></tr></table></section>`),
      },
      {
        id: 'diagram-one',
        type: 'diagram',
        html: fixture('<h1>Architecture diagram</h1>'),
      },
    ],
    expansion,
  });

  assert.equal(expansion.valid, true);
  assert.equal(expansion.rejected[0].reason, 'profile-limit');
  assert.deepEqual(report, {
    valid: true,
    warnings: [GUIDELINE_WARNING_IDS.expansionProfileLimit],
  });
});

test('guideline checker preserves per-type expansion warnings', () => {
  const recipe = guidelineRecipe();
  recipe.expansion.profiles[0].maxCount = 2;
  recipe.expansion.limits = {
    maxArtifacts: 2,
    maxPerType: { diagram: 1 },
  };
  const expansion = evaluateExpansionProposals(recipe, [
    {
      id: 'diagram-one',
      profileId: 'supporting-diagram',
      rationale: 'Show the top-level flow.',
    },
    {
      id: 'diagram-two',
      profileId: 'supporting-diagram',
      rationale: 'Would exceed the declared diagram cap.',
    },
  ]);
  const report = checkGuidelines({
    recipe,
    artifacts: [
      {
        id: 'recap',
        type: 'hub',
        html: fixture(`<h1>Recap</h1>
          <section id="request"><h2>Request</h2><ul><li>Ship it.</li></ul></section>
          <section id="architecture"><h2>Architecture</h2><svg class="narrative-diagram" role="img" aria-label="Architecture diagram"></svg></section>
          <section id="outcome"><h2>Outcome</h2><table><tr><th>Check</th></tr><tr><td>Passed</td></tr></table></section>`),
      },
    ],
    expansion,
  });

  assert.equal(expansion.valid, true);
  assert.equal(expansion.rejected[0].reason, 'type-limit');
  assert.deepEqual(report, {
    valid: true,
    warnings: [GUIDELINE_WARNING_IDS.expansionTypeLimit],
  });
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

test('detects verbatim source dumping without rejecting concise factual prose', () => {
  const rawSource =
    'The W6 migration moved project records into durable reference storage. The archive verifier checks every immutable package hash before deleting the active project. Operators can retry safely after a failed verification.';

  const legitimate = checkSourceDumping({
    authoredText:
      'W6 now preserves recap evidence in durable reference storage. Archive verification happens before project deletion, so a failed check remains recoverable.',
    sourceTexts: [rawSource],
  });
  assert.deepEqual(legitimate, {
    valid: true,
    issues: [],
  });

  const dumped = checkSourceDumping({
    authoredText: rawSource,
    sourceTexts: [rawSource],
  });
  assert.equal(dumped.valid, false);
  assert.equal(dumped.issues[0].code, 'source-dump');
  assert.match(dumped.issues[0].message, /rewrite|verbatim/i);

  const boundary = checkSourceDumping({
    authoredText:
      'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda',
    sourceTexts: [
      'alpha beta gamma delta epsilon zeta eta theta changed words here',
    ],
    shingleSize: 4,
    maxOverlapRatio: 0.5,
    minMatchedShingles: 3,
  });
  assert.equal(boundary.valid, false);
  assert.equal(boundary.issues[0].details.matchedShingles, 5);
});

test('scores source dumping per section so unrelated prose cannot dilute a copied section', () => {
  const copied =
    'The archive verifier checks every immutable package hash before deleting the active project. Operators can retry safely after a failed verification.';
  assert.deepEqual(
    checkSourceDumping({
      authoredSections: [
        {
          id: 'archive',
          text: 'Archive verification now precedes project deletion, preserving a safe retry path when retained evidence does not match.',
        },
      ],
      sourceTexts: [copied],
    }),
    { valid: true, issues: [] },
  );

  const report = checkSourceDumping({
    authoredSections: [
      { id: 'archive', text: copied },
      {
        id: 'outcomes',
        text: 'Teams received a concise operational summary organized around decisions, outcomes, follow-up work, ownership, and remaining uncertainty. The explanation uses audience-ready language and avoids repeating implementation details.',
      },
    ],
    sourceTexts: [copied],
  });

  assert.equal(report.valid, false);
  assert.equal(report.issues.length, 1);
  assert.equal(report.issues[0].code, 'source-dump');
  assert.equal(report.issues[0].details.sectionId, 'archive');
  assert.equal(report.issues[0].details.overlapRatio, 1);
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

test('retains bounded screenshot and metrics evidence at all recap viewports', async (t) => {
  const evidenceRoot = await mkdtemp(join(tmpdir(), 'explainer-qa-evidence-'));
  t.after(() => rm(evidenceRoot, { recursive: true, force: true }));
  const report = await runBrowserProbes({
    artifacts: [{ id: 'project-recap', type: 'hub', html: fixture() }],
    evidenceRoot,
    requireEvidence: true,
    probe: async (request) => {
      await mkdir(join(evidenceRoot, 'qa/browser/project-recap'), {
        recursive: true,
      });
      await writeFile(
        request.screenshotPath,
        png(request.viewport.width, request.viewport.height),
      );
      return {
        pageOverflowX: false,
        clippedX: [],
        viewportClipped: [],
        unreadableHeadings: [],
        animationsDisabled: true,
        reducedMotion: true,
        keyboard: { tab: true },
      };
    },
  });

  assert.deepEqual(
    report.evidence.map(
      ({ artifactId, viewport, width, screenshotPath, metricsPath }) => ({
        artifactId,
        viewport,
        width,
        screenshotPath,
        metricsPath,
      }),
    ),
    [
      {
        artifactId: 'project-recap',
        viewport: 'mobile',
        width: 320,
        screenshotPath: 'qa/browser/project-recap/mobile.png',
        metricsPath: 'qa/browser/project-recap/mobile.json',
      },
      {
        artifactId: 'project-recap',
        viewport: 'tablet',
        width: 768,
        screenshotPath: 'qa/browser/project-recap/tablet.png',
        metricsPath: 'qa/browser/project-recap/tablet.json',
      },
      {
        artifactId: 'project-recap',
        viewport: 'desktop',
        width: 1440,
        screenshotPath: 'qa/browser/project-recap/desktop.png',
        metricsPath: 'qa/browser/project-recap/desktop.json',
      },
    ],
  );
  for (const evidence of report.evidence) {
    const metrics = JSON.parse(
      await readFile(join(evidenceRoot, evidence.metricsPath), 'utf8'),
    );
    assert.equal(metrics.schemaVersion, 'explainer-kit.browser-evidence/v1');
    assert.equal(metrics.artifactId, 'project-recap');
    assert.equal(metrics.viewport, evidence.viewport);
    assert.equal('screenshotBytes' in metrics, false);
  }
});

test('rejects partial required recap browser evidence while lower tiers remain explicit', async (t) => {
  const evidenceRoot = await mkdtemp(join(tmpdir(), 'explainer-qa-partial-'));
  t.after(() => rm(evidenceRoot, { recursive: true, force: true }));
  const artifact = { id: 'project-recap', type: 'hub', html: fixture() };
  const probe = async (request) => {
    if (request.viewport.width !== 768) {
      await mkdir(join(evidenceRoot, 'qa/browser/project-recap'), {
        recursive: true,
      });
      await writeFile(
        request.screenshotPath,
        png(request.viewport.width, request.viewport.height),
      );
    }
    return {
      pageOverflowX: false,
      clippedX: [],
      reducedMotion: true,
      keyboard: { tab: true },
    };
  };

  const required = await runBrowserProbes({
    artifacts: [artifact],
    evidenceRoot,
    requireEvidence: true,
    probe,
  });
  assert.equal(required.valid, false);
  assert.ok(
    required.issues.some(
      ({ code, width }) =>
        code === 'browser-evidence-missing' && width === 768,
    ),
  );

  const lowerTier = await runBrowserProbes({
    artifacts: [artifact],
    widths: [320],
    probe: async () => ({
      pageOverflowX: false,
      clippedX: [],
      reducedMotion: true,
      keyboard: { tab: true },
    }),
  });
  assert.equal(lowerTier.valid, true);
  assert.equal('evidence' in lowerTier, false);
});

test('rejects non-PNG and viewport-mismatched screenshot evidence', async (t) => {
  for (const [label, screenshot] of [
    ['text', () => Buffer.from('not a png')],
    ['dimensions', ({ width, height }) => png(width + 1, height)],
  ]) {
    const evidenceRoot = await mkdtemp(
      join(tmpdir(), `explainer-qa-${label}-`),
    );
    t.after(() => rm(evidenceRoot, { recursive: true, force: true }));
    const report = await runBrowserProbes({
      artifacts: [{ id: 'project-recap', type: 'hub', html: fixture() }],
      evidenceRoot,
      requireEvidence: true,
      probe: async (request) => {
        await mkdir(dirname(request.screenshotPath), { recursive: true });
        await writeFile(request.screenshotPath, screenshot(request.viewport));
        return {
          pageOverflowX: false,
          clippedX: [],
          viewportClipped: [],
          unreadableHeadings: [],
          animationsDisabled: true,
          reducedMotion: true,
          keyboard: { tab: true },
        };
      },
    });
    assert.equal(report.valid, false, label);
    assert.equal(report.evidence.length, 0, label);
  }
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
      viewportClipped: [
        {
          selector: '.diagram-node',
          left: -20,
          right: 280,
          viewportWidth: 320,
        },
      ],
      unreadableHeadings: [
        {
          selector: 'h2',
          text: 'Clipped heading',
          fontSize: 9,
        },
      ],
      animationsDisabled: false,
      reducedMotion: false,
      keyboard: { tab: false },
    }),
  });

  for (const code of [
    'viewport-overflow',
    'inner-x-overflow',
    'viewport-clipping',
    'heading-readability',
    'animations-enabled',
    'reduced-motion',
    'keyboard-navigation',
  ]) {
    assert.ok(
      report.issues.some((issue) => issue.code === code),
      code,
    );
  }
});

test('render QA stage serves built artifacts and emits seeded layout warnings', async (t) => {
  const siteDir = await mkdtemp(join(tmpdir(), 'explainer-render-qa-'));
  t.after(() => rm(siteDir, { recursive: true, force: true }));
  await mkdir(join(siteDir, 'pages'), { recursive: true });
  await Promise.all([
    writeFile(
      join(siteDir, 'pages', 'clipped-diagram.html'),
      fixture(
        '<h1>Diagram</h1><svg class="narrative-diagram" data-defect="clipped"></svg>',
      ),
    ),
    writeFile(
      join(siteDir, 'pages', 'overflowing-table.html'),
      fixture(
        '<h1>Evidence</h1><table data-defect="overflow"><tr><td>Wide</td></tr></table>',
      ),
    ),
  ]);

  const requests = [];
  const report = await runRenderQaStage({
    siteDir,
    artifacts: [
      {
        id: 'clipped-diagram',
        type: 'hub',
        renderedPath: 'site/pages/clipped-diagram.html',
      },
      {
        id: 'overflowing-table',
        type: 'hub',
        renderedPath: 'site/pages/overflowing-table.html',
      },
    ],
    widths: [320],
    browserProbe: async (request) => {
      requests.push(request);
      const html = await fetch(request.artifact.url).then((response) =>
        response.text(),
      );
      return {
        pageOverflowX: html.includes('data-defect="overflow"'),
        clippedX: html.includes('data-defect="overflow"')
          ? [{ selector: 'table', clientWidth: 320, scrollWidth: 900 }]
          : [],
        viewportClipped: html.includes('data-defect="clipped"')
          ? [{ selector: '.narrative-diagram', left: -10, right: 310 }]
          : [],
        unreadableHeadings: [],
        animationsDisabled: true,
        reducedMotion: true,
        keyboard: { tab: true },
      };
    },
  });

  assert.ok(requests.every(({ disableAnimations }) => disableAnimations));
  assert.deepEqual(report, {
    valid: true,
    skipped: false,
    warnings: [
      RENDER_QA_WARNING_IDS.viewportClipping,
      RENDER_QA_WARNING_IDS.documentOverflow,
      RENDER_QA_WARNING_IDS.innerContainerOverflow,
    ],
    issues: report.issues,
    probes: 2,
  });
});

test('render QA stage records one stable warning when no probe is available', async () => {
  const report = await runRenderQaStage({
    siteDir: '/not-read-when-skipped',
    artifacts: [
      {
        id: 'recap',
        type: 'hub',
        renderedPath: 'site/recap.html',
      },
    ],
  });

  assert.deepEqual(report, {
    valid: true,
    skipped: true,
    warnings: [RENDER_QA_WARNING_IDS.skippedNoProbe],
    issues: [],
    probes: 0,
  });
});

test('runtime resolution reports capability rather than assuming a driver', async () => {
  assert.deepEqual(
    await resolveHeadlessRuntime({
      loadDriver: async () => {
        throw new Error('Cannot find package');
      },
    }),
    { available: false, reason: RUNTIME_UNAVAILABLE_REASONS.driverMissing },
  );
  assert.deepEqual(
    await resolveHeadlessRuntime({
      loadDriver: async () => ({
        chromium: {
          launch: () => {},
          executablePath: () => '/nowhere/chromium',
        },
      }),
      fileExists: () => false,
      env: {},
    }),
    { available: false, reason: RUNTIME_UNAVAILABLE_REASONS.executableMissing },
  );

  const resolved = await resolveHeadlessRuntime({
    loadDriver: async () => ({
      chromium: {
        launch: () => 'browser',
        executablePath: () => '/opt/chromium',
      },
    }),
    fileExists: (candidate) => candidate === '/opt/chromium',
    env: {},
  });
  assert.equal(resolved.available, true);
  assert.equal(resolved.executablePath, '/opt/chromium');
  assert.equal(resolved.launch(), 'browser');
});

test('browser probes require both deck arrow pairs', async () => {
  const report = await runBrowserProbes({
    artifacts: [{ id: 'deck', type: 'deck', html: deck() }],
    widths: [768],
    probe: async ({ scenario }) => ({
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
      ...(scenario !== 'default' && {
        deckLayout: {
          flow: 'vertical',
          overflowX: scenario === 'print' ? 'visible' : 'auto',
        },
      }),
    }),
  });

  assert.ok(
    report.issues.some((issue) => issue.code === 'keyboard-navigation'),
  );
});

test('browser probes operate switchable themes and verify no-JS and print deck cascades separately', async () => {
  const { theme } = await resolveTheme();
  const rendered = await renderArtifact({
    recipeArtifact: {
      id: 'briefing',
      type: 'deck',
      template: 'deck-shell',
      required: true,
    },
    content: {
      artifactId: 'briefing',
      slug: 'probe-demo',
      title: 'Probe demo',
      description: 'Probe behavior.',
      sections: [{ id: 'wide', title: 'Wide', content: 'Wide content.' }],
    },
    theme,
    renderStrategy: 'user-switchable',
  });
  const scenarios = [];
  const report = await runBrowserProbes({
    artifacts: [
      {
        id: 'briefing',
        type: 'deck',
        html: rendered.html,
      },
    ],
    widths: [768],
    probe: async (request) => {
      scenarios.push(request.scenario);
      if (request.scenario !== 'default') {
        assert.deepEqual(request.wideContent, {
          containerSelector: '.slide__content',
          width: 2048,
        });
      }
      return {
        pageOverflowX: false,
        clippedX: [],
        reducedMotion: true,
        keyboard: {
          tab: true,
          arrows: Object.fromEntries(
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((key) => [
              key,
              true,
            ]),
          ),
        },
        ...(request.themeToggle && {
          themeToggle: {
            present: true,
            keyboardOperable: true,
            initialMode: 'light',
            toggledMode: 'dark',
            persisted: true,
          },
        }),
        ...(request.scenario !== 'default' && {
          deckLayout: {
            flow: 'vertical',
            overflowX: request.scenario === 'print' ? 'visible' : 'auto',
          },
        }),
      };
    },
  });

  assert.equal(report.valid, true);
  assert.deepEqual(scenarios, ['default', 'no-js', 'print']);
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

test('rejects recap QA when applicable ledger claims are empty or unobserved', async () => {
  const setPlan = {
    recipe: { id: 'project-recap' },
    ledger: {
      terminology: [{ term: 'config-blind core', meaning: 'Runtime.' }],
      statuses: [],
      numbers: [{ subject: 'source sets', value: 7, unit: 'sets' }],
    },
  };
  const report = await auditArtifactSet({
    artifacts: [{ id: 'hub', type: 'hub', html: fixture() }],
    setPlan,
  });
  assert.equal(report.valid, false);
  assert.ok(
    report.issues.some(({ code }) => code === 'cohesion-ledger-empty'),
  );
  assert.ok(
    report.issues.some(({ code }) => code === 'cohesion-claim-unobserved'),
  );
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

test('independent visual review binds the full rendered set and actionable rubric findings', async (t) => {
  const plan = {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'review-set',
    recipe: { id: 'project-recap', version: '1' },
    sourceIds: ['project'],
    ledger: {
      terminology: [{ term: 'core', meaning: 'Runtime boundary.' }],
      statuses: [{ subject: 'quality', value: 'reviewed' }],
      numbers: [{ subject: 'artifacts', value: 3, unit: 'artifacts' }],
    },
    portfolio: ['hub', 'architecture', 'deck'].map((artifactId) => ({
      artifactId,
      artifactType: artifactId === 'deck' ? 'deck' : 'hub',
      profileId: 'recipe-floor',
      required: true,
      sourceIds: ['project'],
      draft: `Compose ${artifactId}.`,
      visualIntent: `Make ${artifactId} clear.`,
    })),
  };
  const rendered = plan.portfolio.map(({ artifactId }) => ({
    artifactId,
    renderedPath: `site/${artifactId}/index.html`,
  }));
  const evidence = rendered.flatMap(({ artifactId }) =>
    ['mobile', 'tablet', 'desktop'].map((viewport) => ({
      artifactId,
      viewport,
      screenshotPath: `qa/browser/${artifactId}/${viewport}.png`,
      metricsPath: `qa/browser/${artifactId}/${viewport}.json`,
    })),
  );
  const runRoot = await mkdtemp(join(tmpdir(), 'explainer-visual-review-'));
  t.after(() => rm(runRoot, { recursive: true, force: true }));
  for (const { renderedPath } of rendered) {
    await mkdir(dirname(join(runRoot, renderedPath)), { recursive: true });
    await writeFile(
      join(runRoot, renderedPath),
      '<p>core reviewed 3 artifacts</p>',
    );
  }
  for (const { screenshotPath, metricsPath } of evidence) {
    await mkdir(dirname(join(runRoot, screenshotPath)), { recursive: true });
    const viewport = evidence.find(
      (item) => item.screenshotPath === screenshotPath,
    ).viewport;
    const size = {
      mobile: [320, 640],
      tablet: [768, 1024],
      desktop: [1440, 900],
    }[viewport];
    await writeFile(join(runRoot, screenshotPath), png(...size));
    await writeFile(join(runRoot, metricsPath), '{}');
  }
  const visualCritic = mock.fn(async (request) => ({
    schemaVersion: 'explainer-kit.visual-review-result/v1',
    reviewId: 'visual-review-1',
    requestId: request.requestId,
    requestHash: request.requestHash,
    reviewedAt: '2026-07-17T20:00:00Z',
    disposition: 'fail',
    artifactIds: request.renderedArtifacts.map(({ artifactId }) => artifactId),
    findings: [
      {
        artifactId: 'hub',
        rubric: 'first-viewport',
        severity: 'important',
        evidence: 'The outcome is below the first viewport.',
        correction: 'Move the outcome into the lead panel.',
      },
    ],
  }));

  const review = await runVisualReview({
    plan,
    rendered,
    evidence,
    visualCritic,
    runRoot,
  });

  assert.equal(visualCritic.mock.callCount(), 1);
  assert.deepEqual(
    review.request.renderedArtifacts.map(({ artifactId }) => artifactId),
    ['hub', 'architecture', 'deck'],
  );
  assert.ok(
    review.request.renderedArtifacts.every(
      ({ evidence: artifactEvidence }) => artifactEvidence.length === 3,
    ),
  );
  assert.equal(review.result.disposition, 'fail');
  assert.equal(review.result.findings[0].artifactId, 'hub');
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
