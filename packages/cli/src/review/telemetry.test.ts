import { describe, expect, it } from 'vitest';

import {
  type HostContextTelemetryAdapter,
  observeHostTelemetry,
} from './telemetry';
import type { ContextBudgetTelemetry } from './types';

const START = '2026-07-30T20:00:00.000Z';
const OBSERVED = '2026-07-30T20:00:00.500Z';
const END = '2026-07-30T20:00:01.000Z';

function clock() {
  const values = [new Date(START), new Date(END)];
  return () => values.shift() ?? new Date(END);
}

function observation(
  overrides: Partial<ContextBudgetTelemetry> = {},
): ContextBudgetTelemetry {
  return {
    observedAt: OBSERVED,
    contextWindowTokens: 200_000,
    consumedTokens: 50_000,
    remainingTokens: 150_000,
    adapterId: 'host-adapter',
    source: 'cursor-host',
    ...overrides,
  };
}

function adapter(
  value: ContextBudgetTelemetry | null,
): HostContextTelemetryAdapter {
  return {
    async observe() {
      return value;
    },
  };
}

function input(previousObservedAt: string | null = null) {
  return {
    runId: 'validation-run-1',
    phase: 'post_artifact' as const,
    adapterId: 'host-adapter',
    previousObservedAt,
  };
}

describe('host telemetry boundary', () => {
  it('accepts only synchronous adapter-bound observations', async () => {
    const evidence = await observeHostTelemetry(
      input(),
      adapter(observation()),
      clock(),
    );
    expect(evidence).toMatchObject({
      disposition: 'accepted',
      adapterId: 'host-adapter',
      requestStartedAt: START,
      requestCompletedAt: END,
    });
    expect(evidence.observation?.remainingTokens).toBe(150_000);
  });

  it('records missing telemetry without numeric budget', async () => {
    const evidence = await observeHostTelemetry(
      input(),
      adapter(null),
      clock(),
    );
    expect(evidence).toMatchObject({
      disposition: 'missing',
      observation: null,
      rejectionReason: null,
    });
  });

  it.each([
    [
      'stale',
      observation({ observedAt: '2026-07-30T19:59:59.000Z' }),
      null,
      'stale-observation',
    ],
    [
      'future',
      observation({ observedAt: '2026-07-30T20:00:02.000Z' }),
      null,
      'future-observation',
    ],
    [
      'non-monotonic',
      observation(),
      '2026-07-30T20:00:00.500Z',
      'non-monotonic-observation',
    ],
    [
      'wrong-adapter',
      observation({ adapterId: 'reviewer-self-report' }),
      null,
      'wrong-adapter',
    ],
    [
      'arithmetically inconsistent',
      observation({ remainingTokens: 149_999 }),
      null,
      'inconsistent-token-arithmetic',
    ],
  ])(
    'rejects %s observations without exposing numbers',
    async (_name, telemetry, previous, reason) => {
      const evidence = await observeHostTelemetry(
        input(previous),
        adapter(telemetry),
        clock(),
      );
      expect(evidence).toMatchObject({
        disposition: 'invalid',
        observation: null,
        rejectionReason: reason,
      });
    },
  );
});
