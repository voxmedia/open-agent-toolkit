import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkArtifactCohesion,
  checkHtmlStructure,
  checkSourceDumping,
  pngDimensions,
  runBrowserProbes,
} from '../scripts/lib/qa.mjs';
import { png } from './fixtures/png.mjs';

function cleanProbe(overrides = {}) {
  return {
    pageOverflowX: false,
    clippedX: [],
    viewportClipped: [],
    unreadableHeadings: [],
    animationsDisabled: true,
    reducedMotion: true,
    keyboard: { tab: true },
    ...overrides,
  };
}

test('accepts an empty status group when other ledger groups are observed', () => {
  const report = checkArtifactCohesion(
    [
      {
        id: 'hub',
        cohesion: {
          terminology: { 'Explainer Kit': 'Explainer Kit' },
          numericClaims: { phases: 5 },
          statuses: {},
        },
      },
    ],
    {
      ledger: {
        terminology: [{ term: 'Explainer Kit' }],
        numbers: [{ subject: 'phases', value: 5 }],
        statuses: [],
      },
    },
  );
  assert.equal(report.valid, true);
  assert.equal(
    report.issues.some(({ code }) => code === 'cohesion-ledger-empty'),
    false,
  );
});

test('rejects a ledger with all three groups empty', () => {
  const report = checkArtifactCohesion([{ id: 'hub', cohesion: {} }], {
    ledger: { terminology: [], numbers: [], statuses: [] },
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(({ code }) => code === 'cohesion-ledger-empty'));
});

test('checks every same-subject numeric and status ledger claim', () => {
  const ledger = {
    terminology: [{ term: 'Explainer Kit' }],
    numbers: [
      { subject: 'Implementation', value: 12 },
      { subject: 'Implementation', value: 3 },
    ],
    statuses: [
      { subject: 'Implementation', value: 'complete' },
      { subject: 'Implementation', value: 'merged' },
    ],
  };
  assert.equal(
    checkArtifactCohesion(
      [
        {
          id: 'hub',
          cohesion: {
            terminology: { 'Explainer Kit': 'Explainer Kit' },
            numericClaims: { Implementation: '3' },
            statuses: { Implementation: 'merged' },
            claims: [
              { subject: 'Implementation', value: '12', kind: 'number' },
              { subject: 'Implementation', value: '3', kind: 'number' },
              { subject: 'Implementation', value: 'complete', kind: 'status' },
              { subject: 'Implementation', value: 'merged', kind: 'status' },
            ],
          },
        },
      ],
      { ledger },
    ).valid,
    true,
  );
  const omitted = checkArtifactCohesion(
    [
      {
        id: 'hub',
        cohesion: {
          terminology: { 'Explainer Kit': 'Explainer Kit' },
          numericClaims: { Implementation: '3' },
          statuses: { Implementation: 'merged' },
        },
      },
    ],
    { ledger },
  );
  assert.equal(omitted.valid, false);
  assert.equal(
    omitted.issues.filter(({ code }) => code === 'cohesion-claim-unobserved')
      .length,
    2,
  );
});

test('keys terminology by term and numeric or status facts by subject', () => {
  assert.deepEqual(
    checkArtifactCohesion(
      [
        {
          id: 'hub',
          cohesion: {
            terminology: { p01: 'p01' },
            numericClaims: { tasks: '17' },
            statuses: { phase: 'in progress' },
          },
        },
      ],
      {
        ledger: {
          terminology: [{ term: 'p01' }],
          numbers: [{ subject: 'tasks', value: 17 }],
          statuses: [{ subject: 'phase', value: 'in progress' }],
        },
      },
    ),
    { valid: true, issues: [] },
  );
});

test('reports external active assets in HTML structure', () => {
  const report = checkHtmlStructure({
    html: '<main><h1>Recap</h1><img src="https://example.com/a.png"></main>',
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(({ code }) => code === 'external-asset'));
});

test('detects verbatim source dumping', () => {
  const source =
    'The archive verifier checks every immutable package hash before deleting the active project.';
  assert.equal(
    checkSourceDumping({ authoredText: source, sourceTexts: [source] }).valid,
    false,
  );
  assert.equal(
    checkSourceDumping({
      authoredText: 'Archive verification makes project deletion safe.',
      sourceTexts: [source],
    }).valid,
    true,
  );
});

test('reads fixture PNG dimensions and rejects non-PNG bytes', () => {
  assert.deepEqual(pngDimensions(png(320, 640)), {
    width: 320,
    height: 640,
  });
  assert.equal(pngDimensions(Buffer.from('not png')), null);
});

test('browser probes report clipped inner content', async () => {
  const report = await runBrowserProbes({
    artifacts: [{ id: 'hub', type: 'hub', html: '<h1>Recap</h1>' }],
    widths: [320],
    probe: async () =>
      cleanProbe({
        clippedX: [
          {
            selector: '.wide',
            overflowX: 'hidden',
            clientWidth: 320,
            scrollWidth: 1200,
          },
        ],
      }),
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(({ code }) => code === 'inner-x-overflow'));
});

test('browser probes accept a clean result', async () => {
  const report = await runBrowserProbes({
    artifacts: [{ id: 'hub', type: 'hub', html: '<h1>Recap</h1>' }],
    widths: [320],
    probe: async () => cleanProbe(),
  });
  assert.deepEqual(report, { valid: true, issues: [], probes: 1 });
});
