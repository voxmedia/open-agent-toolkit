import type {
  JsonValue,
  ReviewCliEnvelope,
  ReviewErrorCategory,
  ReviewInvocation,
  ReviewProgress,
  ReviewSink,
} from '@review/index';
import { describe, expect, it } from 'vitest';

import type {
  ChangeMapV1,
  HostTelemetryEvidenceV1,
  PreparedReviewContextV1,
  PrepareReviewContextResultV1,
  ReviewPreparationV1,
} from './types';

describe('common review contracts', () => {
  it('accepts exact success and error envelopes', () => {
    const success = {
      ok: true,
      result: { phase: 'evidence_started' },
    } satisfies ReviewCliEnvelope<{ phase: ReviewProgress }>;
    const failure = {
      ok: false,
      error: {
        category: 'validation',
        code: 'invalid-plan',
        message: 'The plan is invalid.',
        details: { pointers: ['/lanes/0'] },
      },
    } satisfies ReviewCliEnvelope<JsonValue>;

    expect(success.result.phase).toBe('evidence_started');
    expect(failure.error.code).toBe('invalid-plan');
  });

  it('pins invocation, sink, progress, and error-category unions', () => {
    const invocations: ReviewInvocation[] = ['manual', 'auto', 'gate'];
    const sinks: ReviewSink[] = ['artifact', 'structured'];
    const progress: ReviewProgress[] = [
      'prepared',
      'artifacts_loaded',
      'plan_validated',
      'evidence_started',
      'accounting_repair',
      'accepted',
      'terminal',
    ];
    const categories: ReviewErrorCategory[] = [
      'input',
      'contract',
      'validation',
      'system',
    ];

    expect({ invocations, sinks, progress, categories }).toEqual({
      invocations: ['manual', 'auto', 'gate'],
      sinks: ['artifact', 'structured'],
      progress: [
        'prepared',
        'artifacts_loaded',
        'plan_validated',
        'evidence_started',
        'accounting_repair',
        'accepted',
        'terminal',
      ],
      categories: ['input', 'contract', 'validation', 'system'],
    });
  });
});

const changeMap = {
  files: [
    {
      path: 'src/review.ts',
      status: 'modified',
      isBinary: false,
      additions: 12,
      deletions: 3,
      generatedHint: false,
      bookkeepingHint: false,
    },
  ],
  totals: {
    files: 1,
    additions: 12,
    deletions: 3,
    binaryFiles: 0,
    numstatChangedLines: 15,
    numstatTokenDenialEstimate: 4,
    patchBytes: 900,
    patchByteLowerBound: null,
    patchEstimateState: 'exact',
    patchCountingSkippedReason: null,
    estimatedPatchTokens: 300,
  },
} satisfies ChangeMapV1;

const preparation = {
  schemaVersion: 1,
  runId: 'validation-run-1',
  mode: 'enforce',
  project: '.oat/projects/shared/example',
  scope: 'p01',
  invocation: 'manual',
  sink: 'artifact',
  correlation: { gateRunId: null, launchAttemptId: 'launch-1' },
  range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
  changeMap,
  obligations: [
    {
      id: 'task:p01-t01',
      kind: 'task',
      source: 'plan.md',
      summary: 'Establish the runtime.',
      expectedPaths: ['src/review.ts'],
      expectedChecks: ['pnpm test'],
    },
  ],
  priorEvidence: [],
  timeBudget: {
    totalMs: 120_000,
    source: 'scope-default',
    deadlineMs: 130_000,
  },
  prepareContextTelemetry: null,
  prepareTelemetryEvidenceDigest: 'telemetry-pre',
  preparationDigest: 'preparation-digest',
  createdAt: '2026-07-30T20:00:00.000Z',
  expiresAt: '2026-07-30T22:00:00.000Z',
} satisfies ReviewPreparationV1;

describe('review preparation contracts', () => {
  it('keeps pre-artifact and post-artifact contexts distinct', () => {
    const { timeBudget: _timeBudget, ...preparationBase } = preparation;
    const telemetry = {
      schemaVersion: 1,
      validationRunId: preparation.runId,
      phase: 'post_artifact',
      adapterId: 'cursor-host',
      requestStartedAt: '2026-07-30T20:01:00.000Z',
      requestCompletedAt: '2026-07-30T20:01:01.000Z',
      observation: {
        observedAt: '2026-07-30T20:01:00.500Z',
        contextWindowTokens: 200_000,
        consumedTokens: 50_000,
        remainingTokens: 150_000,
        adapterId: 'cursor-host',
        source: 'host',
      },
      disposition: 'accepted',
      rejectionReason: null,
    } satisfies HostTelemetryEvidenceV1;
    const context = {
      ...preparationBase,
      budget: {
        time: preparation.timeBudget,
        context: {
          totalTokens: 200_000,
          consumedAtPlanTokens: 50_000,
          outputReserveTokens: 10_000,
          reconciliationReserveTokens: 10_000,
          evidenceBudgetTokens: 130_000,
          source: 'host',
        },
      },
      postArtifactTelemetryEvidenceDigest: 'telemetry-post',
      artifactCheckpointAt: telemetry.requestCompletedAt,
      contextDigest: 'context-digest',
    } satisfies PreparedReviewContextV1;
    const result = {
      preparation,
      artifactDraftPath: '/private/review-draft.md',
      commands: {
        checkpointArtifacts: 'oat review checkpoint-artifacts',
        validatePlan: 'oat review validate-plan',
        beginEvidence: 'oat review begin-evidence',
      },
    } satisfies PrepareReviewContextResultV1;

    expect(context.budget.context?.evidenceBudgetTokens).toBe(130_000);
    expect(result.artifactDraftPath).toContain('review-draft');
    expect(telemetry.validationRunId).toBe(preparation.runId);
  });
});
