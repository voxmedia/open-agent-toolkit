import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import { selectReleaseVisualMatrix } from '../../.agents/skills/explainer-kit/scripts/render-qa.mjs';
import {
  runExplainerVisualValidation,
  runExplainerVisualValidationCli,
} from './validate-explainer-visuals.mjs';

const tempRoots = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('drives a real installed Chromium browser for every declared deck scenario', async () => {
  const matrix = [
    selectReleaseVisualMatrix().find(
      ({ artifact, renderStrategy }) =>
        artifact.type === 'deck' && renderStrategy === 'default-only',
    ),
  ].map((entry) => ({ ...entry, viewports: [320] }));

  const result = await runExplainerVisualValidation({ matrix });

  assert.equal(result.schemaVersion, 'explainer-kit.visual-validation/v1');
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.match(result.browser.name, /chrom|chrome/i);
  assert.deepEqual(
    new Set(result.measurements.map(({ scenario }) => scenario)),
    new Set(['default', 'no-js', 'print']),
  );
  assert.equal(result.measurements.length, 3);
  assert.ok(
    result.measurements.every(
      ({ viewport, result: measurement }) =>
        viewport.width === 320 &&
        typeof measurement.pageOverflowX === 'boolean' &&
        Array.isArray(measurement.clippedX),
    ),
  );
});

test('fails closed and emits no successful report when Chromium is unavailable', async () => {
  await assert.rejects(
    runExplainerVisualValidation({
      matrix: [selectReleaseVisualMatrix()[0]],
      launchBrowser: async () => {
        throw new Error('browser executable missing');
      },
    }),
    /browser executable missing/i,
  );
});

test('CLI removes a stale successful report when Chromium is unavailable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-visual-failure-'));
  tempRoots.push(root);
  const output = join(root, 'visual-results.json');
  await writeFile(output, '{"valid":true}\n');

  const exitCode = await runExplainerVisualValidationCli(['--output', output], {
    launchBrowser: async () => {
      throw new Error('browser executable missing');
    },
  });

  assert.equal(exitCode, 1);
  await assert.rejects(readFile(output), { code: 'ENOENT' });
});

test('CLI retains machine-readable browser measurements', async () => {
  const root = await mkdtemp(join(tmpdir(), 'explainer-visual-cli-'));
  tempRoots.push(root);
  const output = join(root, 'visual-results.json');
  const matrix = [
    {
      ...selectReleaseVisualMatrix()[0],
      viewports: [320],
    },
  ];

  const exitCode = await runExplainerVisualValidationCli(['--output', output], {
    matrix,
  });

  assert.equal(exitCode, 0);
  const retained = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(retained.valid, true);
  assert.equal(retained.measurements.length, 1);
});
