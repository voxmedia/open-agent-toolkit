import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canonicalHash,
  canonicalStringify,
  validateContract,
} from '../scripts/lib/contracts.mjs';

const HASH = `sha256:${'a'.repeat(64)}`;

function factBase() {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: '2026-09-10T00:00:00Z',
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [
      {
        id: 'plan',
        kind: 'file',
        locator: 'plan.md',
        hash: HASH,
      },
    ],
    claims: [
      {
        id: 'claim-1',
        text: 'Phase p01 is in progress.',
        status: 'confirmed',
        citations: [{ sourceId: 'plan', locator: 'plan.md:1-2' }],
      },
    ],
    unresolvedClaims: [],
    overrides: [],
  };
}

function theme() {
  const colors = {
    surface: { canvas: '#ffffff', panel: '#f0f0f0', elevated: '#e0e0e0' },
    ink: { primary: '#111111', muted: '#444444', inverse: '#ffffff' },
    accent: { primary: '#0055aa', secondary: '#663399' },
    status: {
      success: '#008800',
      warning: '#aa6600',
      danger: '#cc0000',
      info: '#0066cc',
    },
    diagramSeries: ['#0055aa'],
  };
  return {
    schemaVersion: 'explainer-kit.theme/v1',
    name: 'neutral-clean',
    defaultMode: 'light',
    modes: { light: colors, dark: colors },
    provenance: { derived: false },
    typography: {
      sans: ['system-ui'],
      serif: ['serif'],
      mono: ['monospace'],
      scale: { body: '1rem' },
      lineHeight: { body: 1.5 },
    },
    spacing: { unit: 4, scale: { sm: 4 } },
    geometry: { radius: { sm: 2 }, borderWidth: 1 },
    elevation: { shadows: { low: 'none' } },
    density: 'comfortable',
    motion: {
      enabled: false,
      durationMs: { normal: 0 },
      easing: { standard: 'linear' },
      reducedMotion: 'disable-nonessential',
    },
    diagrams: {
      lineWidth: 2,
      nodeGap: 24,
      arrowStyle: 'straight',
      labelTreatment: 'boxed',
    },
    bundleHash: HASH,
  };
}

function manifest() {
  return {
    schemaVersion: 'explainer-kit.manifest/v2',
    runId: 'run-1',
    slug: 'demo',
    recipe: { id: 'project-recap', version: '2' },
    createdAt: '2026-09-10T00:00:00Z',
    mode: 'unattended',
    source: {
      factBasePath: 'source/fact-base.json',
      factBaseHash: HASH,
      inputHashes: { 'plan.md': HASH },
    },
    theme: { path: 'theme.resolved.json', hash: HASH },
    artifacts: [
      {
        id: 'project-recap',
        type: 'hub',
        contentPath: 'site/index.html',
        hash: HASH,
        status: 'built',
      },
    ],
    immutableHashes: {
      'theme.resolved.json': HASH,
      'source/fact-base.json': HASH,
      'source/fact-base.md': HASH,
      'source/ledger.json': HASH,
      'qa/result.json': HASH,
      'site/index.html': HASH,
    },
    outcome: 'built-needs-review',
    warnings: [],
  };
}

test('accepts the retained fact-base shape', () => {
  assert.deepEqual(validateContract('fact-base', factBase()), {
    valid: true,
    errors: [],
  });
});

test('rejects a citation carrying a retired path key', () => {
  const value = factBase();
  value.claims[0].citations[0].path = 'plan.md';
  assert.ok(
    validateContract('fact-base', value).errors.some(
      ({ code, path }) => code === 'unknown-key' && path.endsWith('.path'),
    ),
  );
});

test('accepts a resolved theme', () => {
  assert.deepEqual(validateContract('theme', theme()), {
    valid: true,
    errors: [],
  });
});

test('canonical serialization and hashing are deterministic', () => {
  const left = { b: 2, a: { y: 2, x: 1 } };
  const right = { a: { x: 1, y: 2 }, b: 2 };
  assert.equal(canonicalStringify(left), canonicalStringify(right));
  assert.equal(canonicalHash(left), canonicalHash(right));
});

test('accepts manifest v2 and rejects v1 or retired build records', () => {
  assert.equal(validateContract('manifest', manifest()).valid, true);
  const v1 = manifest();
  v1.schemaVersion = 'explainer-kit.manifest/v1';
  assert.equal(validateContract('manifest', v1).valid, false);
  const withBuildRecord = manifest();
  withBuildRecord.buildRecord = { path: 'build-record.json', hash: HASH };
  assert.equal(validateContract('manifest', withBuildRecord).valid, false);
});

test('rejects manifest theme and artifact hash mismatches', () => {
  const themeMismatch = manifest();
  themeMismatch.theme.hash = `sha256:${'b'.repeat(64)}`;
  assert.ok(
    validateContract('manifest', themeMismatch).errors.some(
      ({ code }) => code === 'hash-mismatch',
    ),
  );
  const artifactMismatch = manifest();
  artifactMismatch.artifacts[0].hash = `sha256:${'b'.repeat(64)}`;
  assert.ok(
    validateContract('manifest', artifactMismatch).errors.some(
      ({ code }) => code === 'hash-mismatch',
    ),
  );
});

test('throws for a retired contract kind', () => {
  assert.throws(
    () => validateContract('run-request', {}),
    /Unknown contract kind: run-request/,
  );
});
