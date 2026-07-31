import { describe, expect, it } from 'vitest';

import {
  parsePlanValidationReceiptV1,
  parsePreparedReviewContextV1,
  parseReviewCommandInvocationV1,
  parseReviewerTerminalV1,
  parseReviewPreparationV1,
  parseReviewPlanV1,
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

function plan(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    runId: 'validation-run-1',
    contextDigest: 'context-digest',
    strategy: 'selective-inline',
    lanes: [
      {
        id: 'semantic',
        paths: ['src/review.ts'],
        primaryObligationIds: ['task:p01-t01'],
        seamObligationIds: [],
        risk: 'high',
        evidenceClass: 'semantic',
        strategy: 'path-diff',
        checks: ['Inspect behavior'],
        delegated: false,
        independenceRationale: null,
        substantial: false,
        substantialityRationale: null,
        deadlineMs: null,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: 'direct-verify',
        primaryContingency: { allowed: false, paths: [], obligationIds: [] },
      },
    ],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: [],
      nonReplayedLaneIds: [],
      expectedSavings: [],
      coordinationCosts: [],
      decisionRationale: 'One semantic lane remains inline.',
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
        rationale: 'Sample positive coverage.',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff: {
      allowed: false,
      estimatedTokens: 30,
      evidenceBudgetTokens: null,
      reason: 'No sealed context budget.',
    },
    timeAllocation: null,
  };
}

function receipt(): Record<string, unknown> {
  return {
    token: 'opaque-token',
    validationRunId: 'validation-run-1',
    gateRunId: null,
    launchAttemptId: 'launch-1',
    acceptedHandleDigest: 'handle-digest',
    contractVersion: 1,
    contextDigest: 'context-digest',
    planDigest: 'plan-digest',
    assignmentDigest: 'assignment-digest',
    validatedAt: '2026-07-30T20:02:00.000Z',
    expiresAt: '2026-07-30T22:00:00.000Z',
  };
}

function accounting(
  completion: 'complete' | 'blocked-incomplete',
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    receipt: 'opaque-token',
    contextDigest: 'context-digest',
    planDigest: 'plan-digest',
    assignmentDigest: 'assignment-digest',
    strategy: 'selective-inline',
    completion,
    evidence: [],
    lanes: [],
    classifications: [],
    verification: [],
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  };
}

function commandEvidence(): Record<string, unknown> {
  return {
    id: 'command-1',
    command: 'pnpm test',
    cwd: '.',
    scopeRefs: [{ bucket: 'lane', bucketId: 'semantic', pathIndexes: [0] }],
    provenance: {
      runner: 'host',
      invocationDigest: 'invocation-digest',
      capturedAt: '2026-07-30T20:03:00.000Z',
    },
    result: {
      status: 'completed',
      exitCode: 0,
      outputDigest: 'output-digest',
    },
  };
}

function interruptedCommandEvidence(): Record<string, unknown> {
  return {
    ...commandEvidence(),
    id: 'command-2',
    result: {
      status: 'interrupted',
      signal: 'SIGTERM',
      outputDigest: 'interrupted-output-digest',
    },
  };
}

function richAccounting(
  completion: 'complete' | 'blocked-incomplete' = 'complete',
): Record<string, unknown> {
  return {
    ...accounting(completion),
    evidence: [
      {
        id: 'evidence-1',
        kind: 'command',
        locator: 'pnpm test',
        scopeRefs: [{ bucket: 'lane', bucketId: 'semantic', pathIndexes: [0] }],
        provenance: 'host',
        digest: 'evidence-digest',
        commandId: 'command-1',
        commandResultDigest: 'command-result-digest',
      },
      {
        id: 'evidence-2',
        kind: 'source',
        locator: 'src/review.ts:1',
        scopeRefs: [{ bucket: 'lane', bucketId: 'semantic', pathIndexes: [0] }],
        provenance: 'host',
        digest: 'source-digest',
        commandId: null,
        commandResultDigest: null,
      },
    ],
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
        commands: [commandEvidence()],
        evidenceRefIds: ['evidence-1'],
        uncertainty: [],
        primaryCompletion: {
          outcome: 'not-needed',
          completedPathIndexes: [],
          completedObligationIds: [],
          commands: [interruptedCommandEvidence()],
          evidenceRefIds: ['evidence-1'],
        },
      },
    ],
    classifications: [
      {
        id: 'generated',
        kind: 'generated',
        reason: 'Generated output requires a manifest check.',
        paths: ['dist/review.js'],
        planDisposition: 'inspect',
        strategy: 'manifest-check',
        plannedChecks: ['Verify generated manifest'],
        exclusionAuthority: null,
        outcome: 'complete',
        inspectionCoverage: 'all',
        uninspectedPathIndexes: [],
        commands: [commandEvidence()],
        uncertainty: [],
      },
    ],
    verification: [
      {
        claimId: 'claim-1',
        kind: 'deterministic-result',
        findingId: null,
        laneIds: ['semantic'],
        mode: 'provenance',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
    ],
  };
}

function structuredTerminal(
  reviewAccounting: Record<string, unknown> = richAccounting(),
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    status: 'complete',
    candidate: {
      kind: 'structured',
      review: {
        summary: 'One issue found.',
        findings: [
          {
            id: 'I1',
            severity: 'important',
            title: 'Missing validation',
            file: 'src/review.ts',
            line: 42,
            body: 'The nested value is not validated.',
            fix_guidance: 'Validate it strictly.',
          },
        ],
        verification_commands: ['pnpm test'],
      },
    },
    reviewAccounting,
  };
}

describe('plan, receipt, and terminal schemas', () => {
  it('strictly parses portable command invocations', () => {
    expect(
      parseReviewCommandInvocationV1({
        executable: '/branch/oat',
        argv: ['review', 'validate-plan', 'a&b'],
        stdin: 'review-plan-json',
      }),
    ).toEqual({
      executable: '/branch/oat',
      argv: ['review', 'validate-plan', 'a&b'],
      stdin: 'review-plan-json',
    });
    expect(() =>
      parseReviewCommandInvocationV1({
        executable: '/branch/oat',
        argv: [],
        stdin: 'none',
        command: 'shell text',
      }),
    ).toThrow(/unknown field/);
  });

  it('parses valid plan, receipt, complete, and blocked branches', () => {
    expect(parseReviewPlanV1(plan()).strategy).toBe('selective-inline');
    expect(parsePlanValidationReceiptV1(receipt()).contractVersion).toBe(1);
    expect(
      parseReviewerTerminalV1({
        schemaVersion: 1,
        status: 'complete',
        candidate: {
          kind: 'structured',
          review: {
            summary: 'No issues.',
            findings: [],
            verification_commands: [],
          },
        },
        reviewAccounting: accounting('complete'),
      }).status,
    ).toBe('complete');
    expect(
      parseReviewerTerminalV1({
        schemaVersion: 1,
        status: 'blocked',
        reason: 'Coverage incomplete.',
        diagnostics: ['One obligation remains.'],
        reviewAccounting: accounting('blocked-incomplete'),
      }).status,
    ).toBe('blocked');
  });

  it('rejects missing delegation and verification fields', () => {
    const missingEconomics = plan();
    delete missingEconomics['delegationEconomics'];
    expect(() => parseReviewPlanV1(missingEconomics)).toThrow(
      'missing delegationEconomics',
    );

    const missingBoundary = plan();
    delete missingBoundary['verificationBoundary'];
    expect(() => parseReviewPlanV1(missingBoundary)).toThrow(
      'missing verificationBoundary',
    );
  });

  it('rejects unknown plan enums and malformed receipts', () => {
    const invalidPlan = plan();
    invalidPlan['strategy'] = 'read-everything';
    expect(() => parseReviewPlanV1(invalidPlan)).toThrow('invalid value');

    const invalidReceipt = receipt();
    invalidReceipt['contractVersion'] = 2;
    expect(() => parsePlanValidationReceiptV1(invalidReceipt)).toThrow(
      'must be 1',
    );
  });

  it('rejects complete terminals without candidates', () => {
    expect(() =>
      parseReviewerTerminalV1({
        schemaVersion: 1,
        status: 'complete',
        reviewAccounting: accounting('complete'),
      }),
    ).toThrow('missing candidate');
  });

  it('rejects blocked terminals with candidates', () => {
    expect(() =>
      parseReviewerTerminalV1({
        schemaVersion: 1,
        status: 'blocked',
        reason: 'Coverage incomplete.',
        diagnostics: [],
        candidate: {
          kind: 'artifact-draft',
          privateDraftPath: '/private/draft.md',
        },
        reviewAccounting: accounting('blocked-incomplete'),
      }),
    ).toThrow('unknown field candidate');
  });

  it('strictly parses every nested terminal and accounting branch', () => {
    expect(parseReviewerTerminalV1(structuredTerminal())).toMatchObject({
      status: 'complete',
      reviewAccounting: { completion: 'complete' },
    });
  });

  it.each([
    [
      'structured finding',
      (terminal: Record<string, unknown>) => {
        const review = (
          terminal['candidate'] as Record<string, Record<string, unknown>>
        )['review']!;
        review['findings'] = [42];
      },
    ],
    [
      'evidence',
      (terminal: Record<string, unknown>) => {
        (terminal['reviewAccounting'] as Record<string, unknown>)['evidence'] =
          [42];
      },
    ],
    [
      'evidence scope reference',
      (terminal: Record<string, unknown>) => {
        const evidence = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['evidence']![0] as Record<string, unknown>;
        evidence['scopeRefs'] = [null];
      },
    ],
    [
      'command',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown>;
        lane['commands'] = ['invalid'];
      },
    ],
    [
      'command provenance',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown[]>;
        const command = lane['commands']![0] as Record<string, unknown>;
        command['provenance'] = null;
      },
    ],
    [
      'command result',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown[]>;
        const command = lane['commands']![0] as Record<string, unknown>;
        command['result'] = { status: 'unknown' };
      },
    ],
    [
      'lane',
      (terminal: Record<string, unknown>) => {
        (terminal['reviewAccounting'] as Record<string, unknown>)['lanes'] = [
          null,
        ];
      },
    ],
    [
      'primary completion',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown>;
        lane['primaryCompletion'] = {};
      },
    ],
    [
      'classification',
      (terminal: Record<string, unknown>) => {
        (terminal['reviewAccounting'] as Record<string, unknown>)[
          'classifications'
        ] = ['invalid'];
      },
    ],
    [
      'claim verification',
      (terminal: Record<string, unknown>) => {
        (terminal['reviewAccounting'] as Record<string, unknown>)[
          'verification'
        ] = [{}];
      },
    ],
    [
      'budget',
      (terminal: Record<string, unknown>) => {
        (terminal['reviewAccounting'] as Record<string, unknown>)['budget'] =
          null;
      },
    ],
  ])('rejects malformed nested %s entries', (_name, mutate) => {
    const terminal = structuredTerminal();
    mutate(terminal);
    expect(() => parseReviewerTerminalV1(terminal)).toThrow(ReviewSchemaError);
  });

  it.each([
    [
      'structured finding',
      (terminal: Record<string, unknown>) => {
        const review = (
          terminal['candidate'] as Record<string, Record<string, unknown>>
        )['review']!;
        const finding = (review['findings'] as Record<string, unknown>[])[0]!;
        finding['garbage'] = true;
      },
    ],
    [
      'evidence',
      (terminal: Record<string, unknown>) => {
        const evidence = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['evidence']![0] as Record<string, unknown>;
        evidence['garbage'] = true;
      },
    ],
    [
      'scope reference',
      (terminal: Record<string, unknown>) => {
        const evidence = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['evidence']![0] as Record<string, unknown[]>;
        const scopeRef = evidence['scopeRefs']![0] as Record<string, unknown>;
        scopeRef['garbage'] = true;
      },
    ],
    [
      'command',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown[]>;
        const command = lane['commands']![0] as Record<string, unknown>;
        command['garbage'] = true;
      },
    ],
    [
      'command provenance',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown[]>;
        const command = lane['commands']![0] as Record<
          string,
          Record<string, unknown>
        >;
        command['provenance']!['garbage'] = true;
      },
    ],
    [
      'command result',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown[]>;
        const command = lane['commands']![0] as Record<
          string,
          Record<string, unknown>
        >;
        command['result']!['garbage'] = true;
      },
    ],
    [
      'lane',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, unknown>;
        lane['garbage'] = true;
      },
    ],
    [
      'primary completion',
      (terminal: Record<string, unknown>) => {
        const lane = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['lanes']![0] as Record<string, Record<string, unknown>>;
        lane['primaryCompletion']!['garbage'] = true;
      },
    ],
    [
      'classification',
      (terminal: Record<string, unknown>) => {
        const classification = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['classifications']![0] as Record<string, unknown>;
        classification['garbage'] = true;
      },
    ],
    [
      'claim verification',
      (terminal: Record<string, unknown>) => {
        const claim = (
          terminal['reviewAccounting'] as Record<string, unknown[]>
        )['verification']![0] as Record<string, unknown>;
        claim['garbage'] = true;
      },
    ],
    [
      'budget',
      (terminal: Record<string, unknown>) => {
        const budget = (
          terminal['reviewAccounting'] as Record<
            string,
            Record<string, unknown>
          >
        )['budget']!;
        budget['garbage'] = true;
      },
    ],
  ])('rejects unknown fields in nested %s branches', (_name, mutate) => {
    const terminal = structuredTerminal();
    mutate(terminal);
    expect(() => parseReviewerTerminalV1(terminal)).toThrow('unknown field');
  });
});
