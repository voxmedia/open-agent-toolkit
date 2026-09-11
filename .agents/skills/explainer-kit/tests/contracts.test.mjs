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

test('throws for a retired contract kind', () => {
  assert.throws(
    () => validateContract('run-request', {}),
    /Unknown contract kind: run-request/,
  );
});
