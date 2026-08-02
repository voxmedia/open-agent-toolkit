import { describe, expect, it } from 'vitest';

import { preflightReviewPlan, projectLegacyReviewOutput } from './preflight';
import type { ReviewPlanCapabilities, ReviewSink } from './types';

function capabilities(
  overrides: Partial<ReviewPlanCapabilities> = {},
): ReviewPlanCapabilities {
  return {
    schemaVersion: 1,
    provider: 'test-provider',
    supportsAcceptedContinuation: true,
    supportsArtifactCheckpoint: true,
    supportsSameHandleRepair: true,
    supportsReviewerTerminalV1: true,
    supportsStructuredBlockedStatus: true,
    supportsPrivateArtifactStaging: true,
    contextTelemetry: 'host-observed',
    telemetryAdapterId: 'host-adapter',
    ...overrides,
  };
}

function preflight(
  sink: ReviewSink,
  provided: ReviewPlanCapabilities,
  reviewerSelfReport?: unknown,
) {
  return preflightReviewPlan(
    { invocation: 'manual', sink, mode: 'enforce' },
    provided,
    reviewerSelfReport,
  );
}

describe('review capability preflight', () => {
  it.each([
    ['artifact', 'supportsPrivateArtifactStaging'],
    ['structured', 'supportsStructuredBlockedStatus'],
  ] as const)(
    'rejects only the missing %s sink capability',
    (sink, missing) => {
      const result = preflight(sink, capabilities({ [missing]: false }));
      expect(result.ok).toBe(false);
      expect(result.errors.map(({ code }) => code)).toEqual([
        `missing-${missing}`,
      ]);
    },
  );

  it.each([
    'supportsAcceptedContinuation',
    'supportsArtifactCheckpoint',
    'supportsSameHandleRepair',
    'supportsReviewerTerminalV1',
  ] as const)('requires common capability %s for every sink', (missing) => {
    for (const sink of ['artifact', 'structured'] as const) {
      const result = preflight(sink, capabilities({ [missing]: false }));
      expect(result.errors.map(({ code }) => code)).toContain(
        `missing-${missing}`,
      );
    }
  });

  it('allows unavailable telemetry without authorizing an adapter', () => {
    const result = preflight(
      'artifact',
      capabilities({
        contextTelemetry: 'unavailable',
        telemetryAdapterId: null,
      }),
    );
    expect(result).toMatchObject({ ok: true, errors: [] });
  });

  it('ignores reviewer self-reported capabilities', () => {
    const result = preflight(
      'structured',
      capabilities({ supportsStructuredBlockedStatus: false }),
      { supportsStructuredBlockedStatus: true },
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe(
      'missing-supportsStructuredBlockedStatus',
    );
  });

  it('preserves the legacy path without capability enforcement', () => {
    const result = preflightReviewPlan(
      { invocation: 'gate', sink: 'artifact', mode: 'legacy' },
      capabilities({
        supportsAcceptedContinuation: false,
        supportsPrivateArtifactStaging: false,
      }),
    );
    expect(result).toMatchObject({ ok: true, errors: [] });
  });

  it('rejects a 119,999 ms enforce budget before launch without downgrading', () => {
    const result = preflightReviewPlan(
      {
        invocation: 'gate',
        sink: 'artifact',
        mode: 'enforce',
        budgetMs: 119_999,
        budgetSource: 'scope-default',
      },
      capabilities(),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'review-budget-below-minimum',
          message:
            'Review budget is below the enforced 120-second minimum. Raise the configured timeout or explicitly select temporary legacy review mode.',
          details: {
            source: 'scope-default',
            valueMs: 119_999,
            minimumMs: 120_000,
            remedies: [
              'raise the configured review timeout to at least 120000 ms',
              'explicitly set workflow.reviewPlanMode to legacy temporarily',
            ],
          },
        },
      ],
    });
  });

  it.each([120_000, null])(
    'accepts enforce budget %s when capabilities are complete',
    (budgetMs) => {
      expect(
        preflightReviewPlan(
          {
            invocation: 'manual',
            sink: 'artifact',
            mode: 'enforce',
            budgetMs,
            budgetSource: budgetMs === null ? null : 'scope-default',
          },
          capabilities(),
        ),
      ).toMatchObject({ ok: true, errors: [] });
    },
  );

  it('marks legacy output without creating validation state', () => {
    const output = projectLegacyReviewOutput({ findings: [] });
    expect(output).toEqual({
      findings: [],
      validationStatus: 'legacy-unvalidated',
    });
  });
});
