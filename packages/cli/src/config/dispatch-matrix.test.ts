import { describe, expect, it } from 'vitest';

import { normalizeDispatchMatrix, walkDispatchMatrix } from './dispatch-matrix';

describe('normalizeDispatchMatrix', () => {
  it('canonicalizes provider scalars and preserves opaque Cursor strings', () => {
    const normalized = normalizeDispatchMatrix(
      {
        codex: 'high',
        cursor: '  gpt-5.6-sol-high  ',
      },
      {
        pathPrefix: 'workflow.dispatchCeiling.providers',
        compatibilityMode: 'layered-config',
      },
    );

    expect(normalized).toEqual({
      providers: {
        codex: 'high',
        cursor: 'gpt-5.6-sol-high',
      },
      issues: [],
    });
  });

  it('canonicalizes direct targets, legacy routes, fallback routes, and ladders', () => {
    const normalized = normalizeDispatchMatrix(
      {
        codex: {
          economy: { model: 'gpt-5.6-luna', effort: 'high' },
          balanced: [{ model: 'gpt-5.6-terra', effort: 'medium' }, 'high'],
          high: {
            candidates: [
              { model: 'gpt-5.6-sol', effort: 'medium' },
              {
                route: [
                  { model: 'gpt-5.6-sol', effort: 'high' },
                  { harness: 'cursor', model: 'gpt-5.6-sol-high' },
                ],
              },
            ],
          },
        },
      },
      { pathPrefix: 'matrix', compatibilityMode: 'layered-config' },
    );

    expect(normalized.providers.codex).toEqual({
      economy: {
        candidates: [{ model: 'gpt-5.6-luna', effort: 'high' }],
      },
      balanced: {
        candidates: [
          {
            route: [{ model: 'gpt-5.6-terra', effort: 'medium' }, 'high'],
          },
        ],
      },
      high: {
        candidates: [
          { model: 'gpt-5.6-sol', effort: 'medium' },
          {
            route: [
              { model: 'gpt-5.6-sol', effort: 'high' },
              { harness: 'cursor', model: 'gpt-5.6-sol-high' },
            ],
          },
        ],
      },
    });
    expect(normalized.issues).toEqual([]);
  });

  it('keeps sparse tiers and reports malformed providers, tiers, and candidates', () => {
    const normalized = normalizeDispatchMatrix(
      {
        codex: {
          economy: { candidates: ['low', null, {}, { route: [] }] },
          madeUp: 'high',
          frontier: { candidates: [{ model: 'gpt-5.6-sol' }] },
        },
        cursor: 42,
      },
      { pathPrefix: 'matrix', compatibilityMode: 'project-state' },
    );

    expect(normalized.providers).toEqual({
      codex: {
        economy: { candidates: ['low'] },
        frontier: { candidates: [{ model: 'gpt-5.6-sol' }] },
      },
    });
    expect(normalized.issues).toEqual([
      {
        path: 'matrix.codex.economy.candidates[1]',
        kind: 'malformed-candidate',
        value: null,
      },
      {
        path: 'matrix.codex.economy.candidates[2]',
        kind: 'malformed-candidate',
        value: {},
      },
      {
        path: 'matrix.codex.economy.candidates[3]',
        kind: 'malformed-candidate',
        value: { route: [] },
      },
      {
        path: 'matrix.codex.madeUp',
        kind: 'malformed-tier',
        value: 'high',
      },
      {
        path: 'matrix.cursor',
        kind: 'malformed-provider',
        value: 42,
      },
    ]);
  });
});

describe('walkDispatchMatrix', () => {
  it('emits provenance-rich cell references with exact indices and paths', () => {
    const { providers } = normalizeDispatchMatrix(
      {
        cursor: {
          economy: ' gpt-5.6-luna-low ',
          high: {
            candidates: [
              'gpt-5.6-sol-medium',
              {
                route: [
                  'gpt-5.6-sol-high',
                  { harness: 'codex', model: 'gpt-5.6-sol', effort: 'high' },
                ],
              },
            ],
          },
        },
      },
      { pathPrefix: 'matrix', compatibilityMode: 'layered-config' },
    );

    expect(
      walkDispatchMatrix(providers, {
        source: 'repo-config',
        pathPrefix: 'workflow.dispatchCeiling.providers',
      }),
    ).toEqual([
      {
        provider: 'cursor',
        tier: 'economy',
        candidateIndex: 0,
        fallbackRouteIndex: null,
        value: 'gpt-5.6-luna-low',
        target: null,
        path: 'workflow.dispatchCeiling.providers.cursor.economy.candidates[0]',
        source: 'repo-config',
      },
      {
        provider: 'cursor',
        tier: 'high',
        candidateIndex: 0,
        fallbackRouteIndex: null,
        value: 'gpt-5.6-sol-medium',
        target: null,
        path: 'workflow.dispatchCeiling.providers.cursor.high.candidates[0]',
        source: 'repo-config',
      },
      {
        provider: 'cursor',
        tier: 'high',
        candidateIndex: 1,
        fallbackRouteIndex: 0,
        value: 'gpt-5.6-sol-high',
        target: null,
        path: 'workflow.dispatchCeiling.providers.cursor.high.candidates[1].route[0]',
        source: 'repo-config',
      },
      {
        provider: 'cursor',
        tier: 'high',
        candidateIndex: 1,
        fallbackRouteIndex: 1,
        value: null,
        target: {
          harness: 'codex',
          model: 'gpt-5.6-sol',
          effort: 'high',
        },
        path: 'workflow.dispatchCeiling.providers.cursor.high.candidates[1].route[1]',
        source: 'repo-config',
      },
    ]);
  });

  it('emits provider scalar refs and preserves exactly one of value or target', () => {
    const refs = walkDispatchMatrix(
      {
        codex: 'high',
        cursor: {
          frontier: {
            candidates: [{ harness: 'cursor', model: 'gpt-5.6-sol-max' }],
          },
        },
      },
      { source: 'user-config', pathPrefix: 'matrix' },
    );

    expect(refs[0]).toEqual({
      provider: 'codex',
      tier: null,
      candidateIndex: null,
      fallbackRouteIndex: null,
      value: 'high',
      target: null,
      path: 'matrix.codex',
      source: 'user-config',
    });
    for (const ref of refs) {
      expect((ref.value === null) !== (ref.target === null)).toBe(true);
    }
  });
});
