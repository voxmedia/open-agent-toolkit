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

const repositoryDecisionPolicy: ProviderCatalogRefreshPolicy = {
  state: 'restart-required',
  provenance: {
    kind: 'repository-decision',
    reference:
      '.oat/projects/shared/tool-pack-scope-provider-truthfulness/implementation.md#hill-decision-conservative-new-session-advice',
    verifiedAt: '2026-08-31',
  },
};

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

  it('advises a new session for the repository decision without claiming restart or visibility', () => {
    const advice = adviseProviderRefresh({
      policy: repositoryDecisionPolicy,
      materialization: 'changed',
    });

    expect(advice).toMatchObject({
      state: 'restart-required',
      source: 'provider-refresh-policy',
      policy: repositoryDecisionPolicy,
      recovery: [
        {
          code: 'start-new-provider-session',
          message:
            'Start a new provider session so it has an opportunity to load the changed asset, then inspect its catalog.',
        },
      ],
    });
    expect(advice.reason).toContain('conservatively advises starting a new');
    expect(advice.reason).toContain('does not prove runtime visibility');
    expect(advice.reason).not.toMatch(
      /restart (?:the )?(?:provider|application|process)/i,
    );
    expect(advice.recovery[0]?.message).not.toMatch(
      /restart (?:the )?(?:provider|application|process)/i,
    );
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
    { materialization: 'not-required' as const, expected: 'unknown' },
    { materialization: 'current' as const, expected: 'unknown' },
    { materialization: 'planned' as const, expected: 'unknown' },
    { materialization: 'failed' as const, expected: 'unknown' },
    { materialization: 'missing' as const, expected: 'unknown' },
    { materialization: 'unsupported' as const, expected: 'unsupported' },
    { materialization: 'unknown' as const, expected: 'unknown' },
  ])(
    'does not emit repository-decision advice for $materialization materialization',
    ({ materialization, expected }) => {
      const advice = adviseProviderRefresh({
        policy: repositoryDecisionPolicy,
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

  it('does not invent a provider command for generic manual-refresh evidence', () => {
    const advice = adviseProviderRefresh({
      policy: {
        state: 'manual-refresh',
        provenance: {
          kind: 'official-contract',
          reference: 'https://code.claude.com/docs/en/sub-agents',
          verifiedAt: '2026-08-31',
        },
      },
      materialization: 'changed',
    });

    expect(advice.recovery).toEqual([
      expect.not.objectContaining({ command: expect.any(String) }),
    ]);
  });
});
