import { describe, expect, it } from 'vitest';

import type { ProviderCatalogRefreshPolicy } from './registry';
import { adviseProviderRefresh } from './restart-adviser';

const policy = (
  state: 'live' | 'manual-refresh' | 'restart-required',
): ProviderCatalogRefreshPolicy => ({
  state,
  provenance: {
    kind: 'official-contract',
    reference: 'https://provider.example/refresh',
    verifiedAt: '2026-08-31',
  },
});

describe('adviseProviderRefresh', () => {
  it.each([
    {
      state: 'live' as const,
      expected: 'unknown',
      recovery: [],
    },
    {
      state: 'manual-refresh' as const,
      expected: 'refresh-required',
      recovery: ['refresh-provider-catalog'],
    },
    {
      state: 'restart-required' as const,
      expected: 'restart-required',
      recovery: ['restart-provider'],
    },
  ])(
    'maps a changed materialization under $state policy without claiming visibility',
    ({ state, expected, recovery }) => {
      const advice = adviseProviderRefresh({
        policy: policy(state),
        materialization: 'changed',
      });

      expect(advice.state).toBe(expected);
      expect(advice.source).toBe('provider-refresh-policy');
      expect(advice.recovery.map(({ code }) => code)).toEqual(recovery);
    },
  );

  it('reports visibility only from a current-session observation', () => {
    expect(
      adviseProviderRefresh({
        policy: policy('restart-required'),
        materialization: 'changed',
        observation: {
          state: 'visible',
          reference: 'provider catalog query returned the role',
        },
      }),
    ).toMatchObject({
      state: 'visible',
      source: 'runtime-observation',
      recovery: [],
    });
  });

  it('preserves an explicit not-reported observation without turning it into unknown', () => {
    expect(
      adviseProviderRefresh({
        policy: policy('manual-refresh'),
        materialization: 'current',
        observation: {
          state: 'not-reported',
          reference: 'status does not query the running provider catalog',
        },
      }),
    ).toMatchObject({
      state: 'not-reported',
      source: 'runtime-observation',
      reason: 'status does not query the running provider catalog',
      recovery: [],
    });
  });

  it.each([
    { materialization: 'current' as const, expected: 'unknown' },
    { materialization: 'failed' as const, expected: 'unknown' },
    { materialization: 'missing' as const, expected: 'unknown' },
    { materialization: 'unsupported' as const, expected: 'unsupported' },
  ])(
    'keeps $materialization materialization separate from provider visibility',
    ({ materialization, expected }) => {
      const advice = adviseProviderRefresh({
        policy: policy('restart-required'),
        materialization,
      });

      expect(advice.state).toBe(expected);
      expect(advice.source).toBe('materialization-result');
      expect(advice.recovery).toEqual([]);
    },
  );

  it('preserves unknown policy evidence and does not invent refresh advice', () => {
    expect(
      adviseProviderRefresh({
        policy: { state: 'unknown', reason: 'No sourced contract' },
        materialization: 'changed',
      }),
    ).toMatchObject({
      state: 'unknown',
      source: 'provider-refresh-policy',
      reason: 'No sourced contract',
      recovery: [],
    });
  });
});
