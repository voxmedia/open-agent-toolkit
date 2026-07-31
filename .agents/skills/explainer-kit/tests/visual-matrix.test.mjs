import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { test } from 'node:test';

import { createFixtureBrowserProbeSession } from '../scripts/lib/browser-runtime.mjs';
import { checkHtmlStructure } from '../scripts/lib/qa.mjs';
import { renderArtifact } from '../scripts/lib/render.mjs';
import { resolveTheme } from '../scripts/lib/theme.mjs';
import {
  RELEASE_ARTIFACTS,
  RELEASE_MODES,
  RELEASE_PALETTES,
  RELEASE_PROFILES,
  RELEASE_VIEWPORTS,
  runReleaseVisualMatrix,
  selectReleaseVisualMatrix,
} from '../scripts/render-qa.mjs';

const RELEASE_STYLES = [
  'clean-neutral',
  'business-corporate',
  'navy-ocean',
  'dark-edgy',
];

test('curated style inventory renders every artifact class distinctly', async () => {
  const styles = await jsonNames(new URL('../styles/', import.meta.url));
  assert.deepEqual(styles, [...RELEASE_STYLES].sort());

  const hashes = new Set();
  for (const style of RELEASE_STYLES) {
    const { theme } = await resolveTheme({ style });
    hashes.add(theme.bundleHash);
    for (const artifact of RELEASE_ARTIFACTS) {
      const rendered = await renderArtifact({
        recipeArtifact: artifact,
        content: contentFor(artifact.id),
        theme,
        renderStrategy: 'default-only',
      });
      assert.deepEqual(
        checkHtmlStructure({
          id: `${style}:${artifact.type}`,
          type: artifact.type,
          html: rendered.html,
        }),
        { valid: true, issues: [] },
      );
    }
  }
  assert.equal(hashes.size, RELEASE_STYLES.length);
});

test('selects a bounded release matrix covering every palette and mode', () => {
  const matrix = selectReleaseVisualMatrix();
  const paletteCases = matrix.filter(({ axis }) => axis === 'palette-mode');

  assert.equal(
    paletteCases.length,
    RELEASE_PALETTES.length * RELEASE_MODES.length,
  );
  assert.deepEqual(
    new Set(paletteCases.map(({ palette, mode }) => `${palette}:${mode}`)),
    new Set(
      RELEASE_PALETTES.flatMap((palette) =>
        RELEASE_MODES.map((mode) => `${palette}:${mode}`),
      ),
    ),
  );
  assert.ok(paletteCases.every(({ artifact }) => artifact.type === 'hub'));
});

test('release matrix inventory matches every bundled palette and profile', async () => {
  const [palettes, profiles] = await Promise.all([
    jsonNames(new URL('../palettes/', import.meta.url)),
    jsonNames(new URL('../profiles/', import.meta.url)),
  ]);

  assert.deepEqual([...RELEASE_PALETTES].sort(), palettes);
  assert.deepEqual([...RELEASE_PROFILES].sort(), profiles);
});

test('covers every profile and artifact class without a Cartesian explosion', () => {
  const matrix = selectReleaseVisualMatrix();
  const representativeCases = matrix.filter(
    ({ axis }) => axis === 'profile-artifact',
  );

  assert.deepEqual(
    new Set(
      representativeCases.map(
        ({ visualProfile, artifact }) => `${visualProfile}:${artifact.type}`,
      ),
    ),
    new Set(
      RELEASE_PROFILES.flatMap((profile) =>
        RELEASE_ARTIFACTS.map(({ type }) => `${profile}:${type}`),
      ),
    ),
  );
  assert.equal(
    matrix.length,
    RELEASE_PALETTES.length * RELEASE_MODES.length +
      RELEASE_PROFILES.length * RELEASE_ARTIFACTS.length,
  );
  assert.ok(matrix.length < 30, 'release visual selection must stay bounded');
});

test('renders and structurally audits every selected release case', async () => {
  for (const entry of selectReleaseVisualMatrix()) {
    const { theme } = await resolveTheme({
      palette: entry.palette,
      visualProfile: entry.visualProfile,
      defaultMode: entry.mode,
      renderStrategy: entry.renderStrategy,
    });
    const rendered = await renderArtifact({
      recipeArtifact: entry.artifact,
      content: contentFor(entry.artifact.id),
      theme,
      renderStrategy: entry.renderStrategy,
    });
    const report = checkHtmlStructure({
      id: entry.id,
      type: entry.artifact.type,
      html: rendered.html,
    });

    assert.deepEqual(report, { valid: true, issues: [] }, entry.id);
    assert.match(
      rendered.html,
      new RegExp(`data-theme-mode="${entry.mode}"`),
      entry.id,
    );
  }
});

test('assigns representative viewports and explicit deck runtime scenarios', () => {
  const matrix = selectReleaseVisualMatrix();

  assert.deepEqual(RELEASE_VIEWPORTS, [320, 768, 1440]);
  assert.deepEqual(
    new Set(matrix.flatMap(({ viewports }) => viewports)),
    new Set(RELEASE_VIEWPORTS),
  );
  for (const { type } of RELEASE_ARTIFACTS) {
    const widths = new Set(
      matrix
        .filter(({ artifact }) => artifact.type === type)
        .flatMap(({ viewports }) => viewports),
    );
    assert.ok(widths.has(320), `${type} must cover a narrow viewport`);
    assert.ok(widths.has(1440), `${type} must cover a desktop viewport`);
  }

  const decks = matrix.filter(({ artifact }) => artifact.type === 'deck');
  assert.ok(decks.length > 0);
  assert.ok(
    decks.every(
      ({ scenarios }) =>
        scenarios.includes('horizontal') &&
        scenarios.includes('no-js') &&
        scenarios.includes('print'),
    ),
  );
});

test('covers default-only and user-switchable presentation without baselines', () => {
  const matrix = selectReleaseVisualMatrix();

  assert.deepEqual(
    new Set(matrix.map(({ renderStrategy }) => renderStrategy)),
    new Set(['default-only', 'user-switchable']),
  );
  assert.ok(
    matrix.every(
      (entry) =>
        !Object.hasOwn(entry, 'expectedHtml') &&
        !Object.hasOwn(entry, 'baselineHash'),
    ),
  );
});

test('executes horizontal, no-JS, and print deck probes in release QA', async () => {
  const deckEntry = selectReleaseVisualMatrix().find(
    ({ axis, artifact, renderStrategy }) =>
      axis === 'profile-artifact' &&
      artifact.type === 'deck' &&
      renderStrategy === 'default-only',
  );
  const requests = [];
  const report = await runReleaseVisualMatrix({
    matrix: [deckEntry],
    browserProbe: async (request) => {
      requests.push(request);
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
        deckLayout: {
          flow: request.scenario === 'default' ? 'horizontal' : 'vertical',
          overflowX: request.scenario === 'print' ? 'visible' : 'auto',
        },
      };
    },
  });

  assert.equal(report.valid, true);
  assert.deepEqual(
    new Set(requests.map(({ scenario }) => scenario)),
    new Set(['default', 'no-js', 'print']),
  );
  assert.ok(
    requests
      .filter(({ scenario }) => scenario === 'no-js')
      .every(({ javascriptEnabled }) => javascriptEnabled === false),
  );
  assert.ok(
    requests
      .filter(({ scenario }) => scenario === 'print')
      .every(({ media }) => media === 'print'),
  );
});

test('release QA rejects a deck that is not horizontal by default', async () => {
  const observations = [];
  const deckEntry = selectReleaseVisualMatrix().find(
    ({ axis, artifact, renderStrategy }) =>
      axis === 'profile-artifact' &&
      artifact.type === 'deck' &&
      renderStrategy === 'default-only',
  );
  const report = await runReleaseVisualMatrix({
    matrix: [deckEntry],
    browserSession: createFixtureBrowserProbeSession({
      probe: async ({ scenario }) => ({
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
        deckLayout: {
          flow: 'vertical',
          overflowX: scenario === 'print' ? 'visible' : 'auto',
        },
      }),
    }),
    onProbeResult: (observation) => observations.push(observation),
  });

  assert.equal(report.valid, false);
  assert.equal(
    observations.length,
    deckEntry.viewports.length * deckEntry.scenarios.length,
  );
  assert.deepEqual(
    new Set(observations.map(({ scenario }) => scenario)),
    new Set(['default', 'no-js', 'print']),
  );
  assert.ok(
    report.issues.some(({ code }) => code === 'deck-horizontal-layout'),
  );
});

function contentFor(artifactId) {
  return {
    artifactId,
    slug: 'release-qa',
    title: 'Release QA',
    description: 'Representative release artifact.',
    sections: [
      { id: 'overview', title: 'Overview', content: 'Release candidate.' },
      { id: 'evidence', title: 'Evidence', content: 'Checks are complete.' },
    ],
  };
}

async function jsonNames(directory) {
  return (await readdir(directory))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}
