import { describe, expect, it } from 'vitest';

import {
  parsePreparedReviewContextV1,
  parseReviewPreparationV1,
  ReviewSchemaError,
} from './schemas';

function preparation(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    runId: 'validation-run-1',
    mode: 'enforce',
    project: '.oat/projects/shared/example',
    scope: 'p01',
    invocation: 'manual',
    sink: 'artifact',
    correlation: { gateRunId: null, launchAttemptId: 'launch-1' },
    range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
    changeMap: {
      files: [
        {
          path: 'src/review.ts',
          status: 'modified',
          isBinary: false,
          additions: 2,
          deletions: 1,
          generatedHint: false,
          bookkeepingHint: false,
        },
      ],
      totals: {
        files: 1,
        additions: 2,
        deletions: 1,
        binaryFiles: 0,
        numstatChangedLines: 3,
        numstatTokenDenialEstimate: 1,
        patchBytes: 90,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: 30,
      },
    },
    obligations: [
      {
        id: 'task:p01-t01',
        kind: 'task',
        source: 'plan.md',
        summary: 'Review the runtime.',
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
    prepareTelemetryEvidenceDigest: 'pre-telemetry-digest',
    preparationDigest: 'preparation-digest',
    createdAt: '2026-07-30T20:00:00.000Z',
    expiresAt: '2026-07-30T22:00:00.000Z',
  };
}

function context(): Record<string, unknown> {
  const value = preparation();
  delete value['timeBudget'];
  return {
    ...value,
    budget: {
      time: {
        totalMs: 120_000,
        source: 'scope-default',
        deadlineMs: 130_000,
      },
      context: null,
    },
    postArtifactTelemetryEvidenceDigest: 'post-telemetry-digest',
    artifactCheckpointAt: '2026-07-30T20:01:00.000Z',
    contextDigest: 'context-digest',
  };
}

describe('preparation schemas', () => {
  it('parses valid preparation and prepared context fixtures', () => {
    expect(parseReviewPreparationV1(preparation()).runId).toBe(
      'validation-run-1',
    );
    expect(parsePreparedReviewContextV1(context()).contextDigest).toBe(
      'context-digest',
    );
  });

  it.each([
    [
      'wrong version',
      (value: Record<string, unknown>) => (value['schemaVersion'] = 2),
    ],
    [
      'unknown field',
      (value: Record<string, unknown>) => (value['extra'] = true),
    ],
    [
      'malformed SHA',
      (value: Record<string, unknown>) =>
        ((value['range'] as Record<string, unknown>)['headSha'] = 'not-a-sha'),
    ],
    [
      'non-normalized path',
      (value: Record<string, unknown>) =>
        ((
          (value['changeMap'] as Record<string, unknown>)['files'] as Array<
            Record<string, unknown>
          >
        )[0]!['path'] = '../review.ts'),
    ],
    [
      'duplicate path',
      (value: Record<string, unknown>) => {
        const files = (value['changeMap'] as Record<string, unknown>)[
          'files'
        ] as unknown[];
        files.push(structuredClone(files[0]));
      },
    ],
    [
      'duplicate obligation',
      (value: Record<string, unknown>) => {
        const obligations = value['obligations'] as unknown[];
        obligations.push(structuredClone(obligations[0]));
      },
    ],
    [
      'gate correlation on manual invocation',
      (value: Record<string, unknown>) =>
        ((value['correlation'] as Record<string, unknown>)['gateRunId'] =
          'gate-1'),
    ],
    [
      'missing gate correlation',
      (value: Record<string, unknown>) => (value['invocation'] = 'gate'),
    ],
    [
      'draft path smuggled into preparation',
      (value: Record<string, unknown>) =>
        (value['artifactDraftPath'] = '/private/draft.md'),
    ],
  ])('rejects %s', (_name, mutate) => {
    const value = preparation();
    mutate(value);
    expect(() => parseReviewPreparationV1(value)).toThrow(ReviewSchemaError);
  });

  it('rejects unknown fields in nested strict objects', () => {
    const value = context();
    (value['budget'] as Record<string, unknown>)['reviewerEstimate'] = 10;
    expect(() => parsePreparedReviewContextV1(value)).toThrow('unknown field');
  });
});
