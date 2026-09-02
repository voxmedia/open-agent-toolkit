import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { evaluateWholeDiffEligibility } from './budget';
import {
  compareOperationMetrics,
  deriveOperationMetrics,
  executeValidatedReviewStrategy,
  type ReviewOperationMetricsV1,
} from './operation-metrics';
import type {
  EvidenceStrategy,
  PreparedReviewContextV1,
  ReviewLaneV1,
  ReviewPlanV1,
} from './types';

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8'),
  ) as unknown;
}

interface ExecutionFixture {
  schemaVersion: 1;
  fixture: string;
  changedFiles: number;
  strategy: 'whole-diff-inline' | 'selective-inline';
  laneStrategy: EvidenceStrategy;
  replay: ReviewLaneV1['replay'];
}

function loadExecutionFixture(name: string): ExecutionFixture {
  return loadFixture(name) as ExecutionFixture;
}

function executionInputs(fixture: ExecutionFixture): {
  context: PreparedReviewContextV1;
  plan: ReviewPlanV1;
} {
  const paths = Array.from(
    { length: fixture.changedFiles },
    (_, index) => `src/file-${index}.ts`,
  );
  const context = {
    changeMap: {
      files: paths.map((path) => ({
        path,
        status: 'modified' as const,
        isBinary: false,
        additions: 1,
        deletions: 1,
        generatedHint: false,
        bookkeepingHint: false,
      })),
      totals: {
        files: fixture.changedFiles,
        additions: fixture.changedFiles,
        deletions: fixture.changedFiles,
        binaryFiles: 0,
        numstatChangedLines: fixture.changedFiles * 2,
        numstatTokenDenialEstimate: fixture.changedFiles,
        patchBytes: fixture.changedFiles * 20,
        patchByteLowerBound: null,
        patchEstimateState: 'exact' as const,
        patchCountingSkippedReason: null,
        estimatedPatchTokens: fixture.changedFiles * 10,
      },
    },
    obligations: [{ id: 'NFR4' }],
    runId: `run-${fixture.fixture}`,
    contextDigest: `context-${fixture.fixture}`,
    budget: {
      time: null,
      context:
        fixture.strategy === 'whole-diff-inline'
          ? {
              totalTokens: 100_000,
              consumedAtPlanTokens: 0,
              outputReserveTokens: 5_000,
              reconciliationReserveTokens: 5_000,
              evidenceBudgetTokens: 90_000,
              source: 'test',
            }
          : null,
    },
  } as PreparedReviewContextV1;
  const lane: ReviewLaneV1 = {
    id: 'primary',
    paths,
    primaryObligationIds: ['NFR4'],
    seamObligationIds: [],
    risk: 'high',
    evidenceClass: 'semantic',
    strategy: fixture.laneStrategy,
    checks: ['execute deterministic evidence strategy'],
    delegated: false,
    independenceRationale: null,
    substantial: false,
    substantialityRationale: null,
    deadlineMs: null,
    dossier: { contractVersion: 1, partialAllowed: true },
    replay: fixture.replay,
    primaryContingency: { allowed: false, paths: [], obligationIds: [] },
  };
  const plan: ReviewPlanV1 = {
    schemaVersion: 1,
    runId: context.runId,
    contextDigest: context.contextDigest,
    strategy: fixture.strategy,
    lanes: [lane],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: [],
      nonReplayedLaneIds: [],
      expectedSavings: [],
      coordinationCosts: [],
      decisionRationale: 'One deterministic execution lane remains inline.',
      decision: 'inline',
    },
    verificationBoundary: {
      requiredClaims: [
        { kind: 'promoted-finding', mode: 'direct' },
        { kind: 'consequential-absence', mode: 'direct' },
        { kind: 'worker-conflict', mode: 'direct' },
        { kind: 'cross-lane-gap', mode: 'direct' },
      ],
      positiveCoverage: {
        mode: 'sample',
        laneIds: ['primary'],
        rationale: 'Sample the deterministic execution lane.',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff: evaluateWholeDiffEligibility({
      changeMap: context.changeMap,
      contextBudget: context.budget.context,
      coherentLaneCount: 1,
      hasConsequentialSeam: false,
    }),
    timeAllocation: null,
  };
  return { context, plan };
}

function executeFixture(fixture: ExecutionFixture) {
  const { context, plan } = executionInputs(fixture);
  return executeValidatedReviewStrategy(context, plan, fixture.fixture);
}

describe('selective review operation metrics', () => {
  it('rejects a caller-authored empty selective trace with the expected producer string', () => {
    expect(() =>
      deriveOperationMetrics({
        schemaVersion: 1,
        fixture: 'forged-selective',
        changedFiles: 237,
        strategy: 'selective-inline',
        producer: 'review-operation-recorder/v1',
        events: [],
        completion: 'complete',
        accountingBytes: 1,
      }),
    ).toThrow(/production execution harness/);
  });

  it('reduces broad content and semantic replay operations for the fixed large scope', () => {
    const baseline = loadFixture(
      'large-scope-baseline.v1.json',
    ) as ReviewOperationMetricsV1;
    const selective = deriveOperationMetrics(
      executeFixture(loadExecutionFixture('large-scope-selective.v1.json')),
    );

    expect(selective.changedFiles).toBe(baseline.changedFiles);
    const comparison = compareOperationMetrics(baseline, selective);
    expect(comparison).toMatchObject({
      baselineFixture: 'large-scope-pre-review-plan',
      candidateFixture: 'large-scope-selective-review-plan',
      changedFiles: 237,
      broadContent: {
        baseline: 238,
        candidate: 1,
        saved: 237,
        improved: true,
      },
      semanticReplay: {
        baseline: 237,
        candidate: 1,
        saved: 236,
        improved: true,
      },
      toolSteps: {
        baseline: 481,
        candidate: 2,
        saved: 479,
      },
      completion: { baseline: 'blocked', candidate: 'complete' },
      improvesBroadReview: true,
    });
    expect(comparison.accountingBytes).toEqual({
      baseline: 0,
      candidate: expect.any(Number),
    });
    expect(comparison.accountingBytes.candidate).toBeGreaterThan(0);
  });

  it('keeps the compact small scope inline without delegation', () => {
    const compact = deriveOperationMetrics(
      executeFixture(loadExecutionFixture('small-scope-inline.v1.json')),
    );
    const operations = Object.fromEntries(
      compact.operations.map(({ kind, count }) => [kind, count]),
    );

    expect(compact).toMatchObject({
      changedFiles: 3,
      strategy: 'whole-diff-inline',
      completion: 'complete',
    });
    expect(operations).toEqual({
      'content-diff': 1,
      'full-file-read': 0,
      'semantic-replay': 0,
      'tool-step': 2,
    });
  });

  it('fails a production-executed broad and replay-heavy strategy', () => {
    const baseline = loadFixture(
      'large-scope-baseline.v1.json',
    ) as ReviewOperationMetricsV1;
    const fixture: ExecutionFixture = {
      schemaVersion: 1,
      fixture: 'large-scope-broad-negative',
      changedFiles: 237,
      strategy: 'selective-inline',
      laneStrategy: 'full-file',
      replay: 'direct-verify',
    };

    const comparison = compareOperationMetrics(
      baseline,
      deriveOperationMetrics(executeFixture(fixture)),
    );
    expect(comparison).toMatchObject({
      broadContent: { candidate: 237, improved: true },
      semanticReplay: { candidate: 237, improved: false },
      improvesBroadReview: false,
    });
  });

  it('rejects unvalidated ChangeMap and ReviewPlan execution inputs', () => {
    const fixture = loadExecutionFixture('large-scope-selective.v1.json');
    const { context, plan } = executionInputs(fixture);
    plan.contextDigest = 'forged-context';
    expect(() =>
      executeValidatedReviewStrategy(context, plan, fixture.fixture),
    ).toThrow(/requires a validated review plan/);
  });

  it('rejects incomparable scopes and incomplete operation inventories', () => {
    const baseline = loadFixture(
      'large-scope-baseline.v1.json',
    ) as ReviewOperationMetricsV1;
    const wrongScope = structuredClone(baseline);
    wrongScope.changedFiles = 236;
    const missingMetric = structuredClone(baseline);
    missingMetric.operations.pop();

    expect(() => compareOperationMetrics(baseline, wrongScope)).toThrow(
      /same changed-file scope/,
    );
    expect(() => compareOperationMetrics(baseline, missingMetric)).toThrow(
      /exactly one count/,
    );
  });

  it('contains no wall-clock metric or performance claim', () => {
    for (const fixture of [
      loadFixture('large-scope-selective.v1.json'),
      loadFixture('small-scope-inline.v1.json'),
    ]) {
      expect(JSON.stringify(fixture)).not.toMatch(
        /wall.?clock|duration|elapsed|faster/i,
      );
    }
    expect(
      JSON.stringify(
        compareOperationMetrics(
          loadFixture(
            'large-scope-baseline.v1.json',
          ) as ReviewOperationMetricsV1,
          deriveOperationMetrics(
            executeFixture(
              loadExecutionFixture('large-scope-selective.v1.json'),
            ),
          ),
        ),
      ),
    ).not.toMatch(/wall.?clock|duration|elapsed|faster/i);
  });

  it('rejects traces not owned by the production recorder', () => {
    const trace = executeFixture(
      loadExecutionFixture('large-scope-selective.v1.json'),
    );
    expect(() => deriveOperationMetrics(structuredClone(trace))).toThrow(
      /production execution harness/,
    );
  });

  it('rejects hand-entered aggregate candidate counters', () => {
    expect(() =>
      deriveOperationMetrics({
        schemaVersion: 1,
        fixture: 'hand-entered',
        changedFiles: 237,
        strategy: 'selective-inline',
        producer: 'review-operation-recorder/v1',
        operations: [
          { kind: 'full-file-read', count: 1 },
          { kind: 'semantic-replay', count: 1 },
        ],
        completion: 'complete',
        accountingBytes: 32_768,
      }),
    ).toThrow(/production execution harness/);
  });
});
