import type {
  JsonValue,
  ReviewCliEnvelope,
  ReviewErrorCategory,
  ReviewInvocation,
  ReviewProgress,
  ReviewSink,
} from '@review/index';
import { describe, expect, it } from 'vitest';

import {
  DIRECT_REVIEW_CLAIM_KINDS,
  PROVENANCE_EVIDENCE_STRATEGIES,
} from './types';
import type {
  ChangeMapV1,
  HostTelemetryEvidenceV1,
  PlanValidationReceiptV1,
  PreparedReviewContextV1,
  PrepareReviewContextInputV1,
  PrepareReviewContextResultV1,
  ReviewAccountingV1,
  ReviewCandidateV1,
  ReviewCommandEvidenceV1,
  ReviewEvidenceRefV1,
  ReviewLaneV1,
  ReviewPlanV1,
  ReviewPreparationV1,
  ReviewerTerminalV1,
  ValidatedAssignmentProjectionV1,
  WorkerDossierV1,
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
    const incompatible = {
      ok: true,
      // @ts-expect-error -- numeric results must not satisfy a string envelope.
      result: 42,
    } satisfies ReviewCliEnvelope<string>;

    expect(success.result.phase).toBe('evidence_started');
    expect(failure.error.code).toBe('invalid-plan');
    expect(incompatible.result).toBe(42);
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
    const input = {
      schemaVersion: 1,
      repoRoot: '/repo',
      project: '.oat/projects/shared/demo',
      scope: 'p02',
      workflowMode: 'spec-driven',
      range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
      sink: 'artifact',
      invocation: 'manual',
      budget: null,
      gateRunId: null,
      launchAttemptId: null,
      obligationSources: {
        plan: { source: '# Plan', path: 'plan.md' },
        spec: null,
        implementation: null,
      },
      priorEvidenceCandidates: [],
      target: 'reviewer',
    } satisfies PrepareReviewContextInputV1;
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
        checkpointArtifacts: {
          executable: process.execPath,
          argv: [
            '/repo/packages/cli/dist/index.js',
            'review',
            'checkpoint-artifacts',
            '--run-id',
            preparation.runId,
            '--checkpoint-token',
            'checkpoint-token',
            '--json',
          ],
          stdin: 'none',
        },
        validatePlan: {
          executable: process.execPath,
          argv: [
            '/repo/packages/cli/dist/index.js',
            'review',
            'validate-plan',
            '--run-id',
            preparation.runId,
            '--command-token',
            'plan-token',
            '--stdin',
            '--json',
          ],
          stdin: 'review-plan-json',
        },
        beginEvidence: {
          executable: process.execPath,
          argv: [
            '/repo/packages/cli/dist/index.js',
            'review',
            'begin-evidence',
            '--run-id',
            preparation.runId,
            '--receipt',
            '__OAT_PLAN_RECEIPT__',
            '--json',
          ],
          stdin: 'none',
        },
      },
    } satisfies PrepareReviewContextResultV1;

    expect(context.budget.context?.evidenceBudgetTokens).toBe(130_000);
    expect(input.schemaVersion).toBe(1);
    expect(result.artifactDraftPath).toContain('review-draft');
    expect(telemetry.validationRunId).toBe(preparation.runId);
  });
});

const semanticLane = {
  id: 'semantic',
  paths: ['src/review.ts'],
  primaryObligationIds: ['task:p01-t01'],
  seamObligationIds: [],
  risk: 'high',
  evidenceClass: 'semantic',
  strategy: 'path-diff',
  checks: ['Inspect contract behavior'],
  delegated: false,
  independenceRationale: null,
  substantial: false,
  substantialityRationale: null,
  deadlineMs: null,
  dossier: { contractVersion: 1, partialAllowed: true },
  replay: 'direct-verify',
  primaryContingency: { allowed: false, paths: [], obligationIds: [] },
} satisfies ReviewLaneV1;

const inlinePlan = {
  schemaVersion: 1,
  runId: preparation.runId,
  contextDigest: 'context-digest',
  strategy: 'whole-diff-inline',
  lanes: [semanticLane],
  classifications: [],
  crossLaneInvariants: [],
  delegationEconomics: {
    independentLaneIds: [],
    nonReplayedLaneIds: [],
    expectedSavings: [],
    coordinationCosts: [],
    decisionRationale: 'One coherent semantic lane is cheaper inline.',
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
      laneIds: ['semantic'],
      rationale: 'Sample positive coverage directly.',
    },
    deterministicAcceptance: {
      mode: 'provenance',
      requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
    },
  },
  wholeDiff: {
    allowed: true,
    estimatedTokens: 300,
    evidenceBudgetTokens: 130_000,
    reason: 'The exact estimate fits the sealed budget.',
  },
  timeAllocation: null,
} satisfies ReviewPlanV1;

describe('review plan contracts', () => {
  it('exports the complete direct-claim and provenance strategy registries', () => {
    expect(DIRECT_REVIEW_CLAIM_KINDS).toEqual([
      'promoted-finding',
      'consequential-absence',
      'worker-conflict',
      'cross-lane-gap',
    ]);
    expect(PROVENANCE_EVIDENCE_STRATEGIES).toEqual(['command', 'inventory']);
  });

  it('represents compact-inline and delegated strategies with FR5-FR7 fields', () => {
    const deterministicLane = {
      ...semanticLane,
      id: 'deterministic',
      paths: ['src/review.test.ts'],
      primaryObligationIds: ['task:p01-t02'],
      evidenceClass: 'deterministic',
      strategy: 'command',
      delegated: true,
      independenceRationale: 'The command lane is independently executable.',
      substantial: true,
      substantialityRationale: 'It covers the complete verification matrix.',
      replay: 'accept-provenance',
      primaryContingency: {
        allowed: true,
        paths: ['src/review.test.ts'],
        obligationIds: ['task:p01-t02'],
      },
    } satisfies ReviewLaneV1;
    const delegated = {
      ...inlinePlan,
      strategy: 'delegated',
      lanes: [
        {
          ...semanticLane,
          delegated: true,
          substantial: true,
          independenceRationale: 'Independent semantics.',
          substantialityRationale: 'Broad contract surface.',
        },
        deterministicLane,
      ],
      crossLaneInvariants: ['Runtime and tests use the same contract version.'],
      delegationEconomics: {
        independentLaneIds: ['semantic', 'deterministic'],
        nonReplayedLaneIds: ['deterministic'],
        expectedSavings: ['Command evidence avoids semantic replay.'],
        coordinationCosts: ['Two bounded dossier reconciliations.'],
        decisionRationale: 'Expected savings exceed bounded coordination.',
        decision: 'delegate',
      },
      wholeDiff: {
        allowed: false,
        estimatedTokens: 300,
        evidenceBudgetTokens: 130_000,
        reason: 'Multiple consequential lanes require selective evidence.',
      },
    } satisfies ReviewPlanV1;

    expect(inlinePlan.delegationEconomics.decision).toBe('inline');
    expect(delegated.delegationEconomics.nonReplayedLaneIds).toEqual([
      'deterministic',
    ]);
    expect(delegated.verificationBoundary.requiredClaims).toHaveLength(4);
  });

  it('binds assignment projection and receipt identity', () => {
    const projection = {
      lanes: inlinePlan.lanes.map((lane) => ({
        id: lane.id,
        paths: lane.paths,
        primaryObligationIds: lane.primaryObligationIds,
        seamObligationIds: lane.seamObligationIds,
        primaryContingency: lane.primaryContingency,
      })),
      classifications: inlinePlan.classifications,
    } satisfies ValidatedAssignmentProjectionV1;
    const receipt = {
      token: 'opaque-token',
      validationRunId: preparation.runId,
      gateRunId: null,
      launchAttemptId: preparation.correlation.launchAttemptId,
      acceptedHandleDigest: 'handle-digest',
      contractVersion: 1,
      contextDigest: inlinePlan.contextDigest,
      planDigest: 'plan-digest',
      assignmentDigest: 'assignment-digest',
      validatedAt: '2026-07-30T20:02:00.000Z',
      expiresAt: preparation.expiresAt,
    } satisfies PlanValidationReceiptV1;

    expect(projection.lanes[0]?.paths).toEqual(['src/review.ts']);
    expect(receipt.validationRunId).toBe(inlinePlan.runId);
  });
});

const command = {
  id: 'command-1',
  command: 'pnpm test',
  cwd: '.',
  scopeRefs: [{ bucket: 'lane', bucketId: 'semantic', pathIndexes: [0] }],
  provenance: {
    runner: 'host',
    invocationDigest: 'invocation-digest',
    capturedAt: '2026-07-30T20:03:00.000Z',
  },
  result: { status: 'completed', exitCode: 0, outputDigest: 'output-digest' },
} satisfies ReviewCommandEvidenceV1;

const evidence = {
  id: 'evidence-1',
  kind: 'command',
  locator: 'pnpm test',
  scopeRefs: command.scopeRefs,
  provenance: 'host',
  digest: 'evidence-digest',
  commandId: command.id,
  commandResultDigest: 'command-result-digest',
} satisfies ReviewEvidenceRefV1;

const accounting = {
  schemaVersion: 1,
  receipt: 'opaque-token',
  contextDigest: 'context-digest',
  planDigest: 'plan-digest',
  assignmentDigest: 'assignment-digest',
  strategy: 'selective-inline',
  completion: 'complete',
  evidence: [evidence],
  lanes: [
    {
      id: 'semantic',
      paths: ['src/review.ts'],
      primaryObligationIds: ['task:p01-t01'],
      seamObligationIds: [],
      workerOutcome: 'not-delegated',
      dossierDigest: null,
      inspectionCoverage: 'all',
      uninspectedPathIndexes: [],
      uncoveredObligationIds: [],
      commands: [command],
      evidenceRefIds: [evidence.id],
      uncertainty: [],
      primaryCompletion: {
        outcome: 'not-needed',
        completedPathIndexes: [],
        completedObligationIds: [],
        commands: [],
        evidenceRefIds: [],
      },
    },
  ],
  classifications: [],
  verification: [
    {
      claimId: 'claim-1',
      kind: 'deterministic-result',
      findingId: null,
      laneIds: ['semantic'],
      mode: 'provenance',
      disposition: 'verified',
      evidenceRefIds: [evidence.id],
    },
  ],
  budget: { evidenceStoppedAt: null, outputReservePreserved: null },
} satisfies ReviewAccountingV1;

describe('review output contracts', () => {
  it('represents complete and partial worker dossiers with typed evidence registries', () => {
    const complete = {
      schemaVersion: 1,
      runId: preparation.runId,
      planDigest: 'plan-digest',
      laneId: 'semantic',
      outcome: 'complete',
      inspectedPaths: ['src/review.ts'],
      inspectedObligationIds: ['task:p01-t01'],
      commands: [command],
      evidence: [evidence],
      candidateFindings: [],
      uncoveredObligationIds: [],
      uncertainty: [],
    } satisfies WorkerDossierV1;
    const partial = {
      ...complete,
      outcome: 'partial',
      uncoveredObligationIds: ['task:p01-t01'],
      uncertainty: ['The command timed out.'],
    } satisfies WorkerDossierV1;

    expect(complete.evidence[0]?.kind).toBe('command');
    expect(partial.outcome).toBe('partial');
  });

  it('keeps private candidates separate from complete and blocked terminals', () => {
    const candidate = {
      kind: 'artifact-draft',
      privateDraftPath: '/private/review-draft.md',
    } satisfies ReviewCandidateV1;
    const complete = {
      schemaVersion: 1,
      status: 'complete',
      candidate,
      reviewAccounting: accounting,
    } satisfies ReviewerTerminalV1;
    const blockedAccounting = {
      ...accounting,
      completion: 'blocked-incomplete',
      lanes: accounting.lanes.map((lane) => ({
        ...lane,
        inspectionCoverage: 'partial' as const,
        uninspectedPathIndexes: [0],
        uncoveredObligationIds: ['task:p01-t01'],
      })),
    } satisfies ReviewAccountingV1;
    const blocked = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'Coverage could not complete.',
      diagnostics: ['task:p01-t01 remains uncovered'],
      reviewAccounting: blockedAccounting,
    } satisfies ReviewerTerminalV1;

    expect(complete.candidate.kind).toBe('artifact-draft');
    expect('candidate' in blocked).toBe(false);
    expect(blocked.reviewAccounting.completion).toBe('blocked-incomplete');
  });
});
