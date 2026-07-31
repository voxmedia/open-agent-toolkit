import { describe, expect, it } from 'vitest';

import { hashCanonicalJson } from './canonical-json';
import {
  validateReviewOutput,
  type ReviewOutputValidationContext,
} from './output-validator';
import type {
  ReviewAccountingV1,
  ReviewCommandEvidenceV1,
  ReviewerTerminalV1,
} from './types';

function fixture(): {
  context: ReviewOutputValidationContext;
  terminal: ReviewerTerminalV1;
} {
  const command: ReviewCommandEvidenceV1 = {
    id: 'command-1',
    command: 'pnpm test',
    cwd: '.',
    scopeRefs: [{ bucket: 'lane', bucketId: 'lane-1', pathIndexes: [0] }],
    provenance: {
      runner: 'host',
      invocationDigest: 'invocation',
      capturedAt: '2026-07-30T20:03:00.000Z',
    },
    result: { status: 'completed', exitCode: 0, outputDigest: 'output' },
  };
  const commandResultDigest = hashCanonicalJson({
    scopeRefs: command.scopeRefs,
    provenance: command.provenance,
    result: command.result,
  });
  const accounting: ReviewAccountingV1 & { completion: 'complete' } = {
    schemaVersion: 1,
    receipt: 'receipt',
    contextDigest: 'context',
    planDigest: 'plan',
    assignmentDigest: 'assignment',
    strategy: 'selective-inline',
    completion: 'complete',
    evidence: [
      {
        id: 'evidence-1',
        kind: 'command',
        locator: 'pnpm test',
        scopeRefs: command.scopeRefs,
        provenance: 'host',
        digest: 'evidence',
        commandId: command.id,
        commandResultDigest,
      },
    ],
    lanes: [
      {
        id: 'lane-1',
        paths: ['src/review.ts'],
        primaryObligationIds: ['task:p01-t01'],
        seamObligationIds: [],
        workerOutcome: 'not-delegated',
        dossierDigest: null,
        inspectionCoverage: 'all',
        uninspectedPathIndexes: [],
        uncoveredObligationIds: [],
        commands: [command],
        evidenceRefIds: ['evidence-1'],
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
        claimId: 'claim-promoted',
        kind: 'promoted-finding',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'rejected',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'claim-absence',
        kind: 'consequential-absence',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'claim-conflict',
        kind: 'worker-conflict',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'rejected',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'claim-gap',
        kind: 'cross-lane-gap',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'rejected',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'claim-positive',
        kind: 'positive-coverage-sample',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'sample',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'claim-deterministic',
        kind: 'deterministic-result',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'provenance',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
    ],
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  };
  return {
    context: {
      receipt: {
        token: 'receipt',
        validationRunId: 'validation-run-1',
        gateRunId: null,
        launchAttemptId: 'launch-1',
        acceptedHandleDigest: 'handle',
        contractVersion: 1,
        contextDigest: 'context',
        planDigest: 'plan',
        assignmentDigest: 'assignment',
        validatedAt: '2026-07-30T20:02:00.000Z',
        expiresAt: '2026-07-30T22:02:00.000Z',
      },
      plan: {
        strategy: 'selective-inline',
        lanes: [{ id: 'lane-1', delegated: false }],
        verificationBoundary: {
          requiredClaims: [
            { kind: 'promoted-finding', mode: 'direct' },
            { kind: 'consequential-absence', mode: 'direct' },
            { kind: 'worker-conflict', mode: 'direct' },
            { kind: 'cross-lane-gap', mode: 'direct' },
          ],
          positiveCoverage: {
            mode: 'sample',
            laneIds: ['lane-1'],
            rationale: 'sample',
          },
          deterministicAcceptance: {
            mode: 'provenance',
            requiredFields: [
              'command',
              'cwd',
              'scopeRefs',
              'provenance',
              'result',
            ],
          },
        },
      },
      assignment: {
        lanes: [
          {
            id: 'lane-1',
            paths: ['src/review.ts'],
            primaryObligationIds: ['task:p01-t01'],
            seamObligationIds: [],
            primaryContingency: {
              allowed: false,
              paths: [],
              obligationIds: [],
            },
          },
        ],
        classifications: [],
      },
    },
    terminal: {
      schemaVersion: 1,
      status: 'complete',
      candidate: {
        kind: 'structured',
        review: {
          summary: 'complete',
          findings: [],
          verification_commands: [],
        },
      },
      reviewAccounting: accounting,
    },
  };
}

function errorCodes(
  context: ReviewOutputValidationContext,
  terminal: ReviewerTerminalV1,
): string[] {
  const result = validateReviewOutput(context, terminal);
  expect(result.valid).toBe(false);
  return result.valid ? [] : result.errors.map((error) => error.code);
}

describe('review output validation', () => {
  it('accepts exact, claim-addressable terminal accounting', () => {
    expect(validateReviewOutput(fixture().context, fixture().terminal)).toEqual(
      {
        valid: true,
        outputDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      },
    );
  });

  it.each([
    ['receipt', 'receipt-mismatch'],
    ['contextDigest', 'digest-mismatch'],
    ['planDigest', 'digest-mismatch'],
    ['assignmentDigest', 'assignment-mismatch'],
  ] as const)('rejects %s identity drift', (field, code) => {
    const { context, terminal } = fixture();
    terminal.reviewAccounting[field] = 'drift';
    expect(errorCodes(context, terminal)).toContain(code);
  });

  it('rejects assignment projection drift', () => {
    const { context, terminal } = fixture();
    terminal.reviewAccounting.lanes[0]!.paths = ['src/fabricated.ts'];
    const result = validateReviewOutput(context, terminal);
    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.errors).toContainEqual(
      expect.objectContaining({
        code: 'assignment-mismatch',
        pointer: '/reviewAccounting/lanes/0/paths',
      }),
    );
  });

  it('rejects duplicate, missing, and substituted lane bucket identities', () => {
    const { context, terminal } = fixture();
    const expectedLane = structuredClone(context.assignment.lanes[0]!);
    expectedLane.id = 'lane-2';
    expectedLane.paths = ['src/second.ts'];
    context.assignment.lanes.push(expectedLane);
    const second = structuredClone(terminal.reviewAccounting.lanes[0]!);
    second.id = 'lane-2';
    second.paths = ['src/second.ts'];
    terminal.reviewAccounting.lanes.push(second);

    terminal.reviewAccounting.lanes[1] = structuredClone(
      terminal.reviewAccounting.lanes[0]!,
    );
    expect(errorCodes(context, terminal)).toEqual(
      expect.arrayContaining([
        'duplicate-assignment-bucket',
        'assignment-mismatch',
      ]),
    );

    terminal.reviewAccounting.lanes = [
      structuredClone(terminal.reviewAccounting.lanes[0]!),
    ];
    expect(errorCodes(context, terminal)).toContain('assignment-mismatch');

    terminal.reviewAccounting.lanes.push({
      ...structuredClone(second),
      id: 'substituted',
    });
    expect(errorCodes(context, terminal)).toContain('assignment-mismatch');
  });

  it('rejects duplicate and missing classification bucket identities', () => {
    const { context, terminal } = fixture();
    const classification = {
      id: 'classification-1',
      kind: 'bookkeeping' as const,
      reason: 'generated bookkeeping',
      paths: ['generated.json'],
      disposition: 'inspect' as const,
      strategy: 'manifest-check' as const,
      checks: ['inspect manifest'],
      exclusionAuthority: null,
    };
    context.assignment.classifications = [
      classification,
      { ...classification, id: 'classification-2', paths: ['other.json'] },
    ];
    const accountingClassification = {
      id: 'classification-1',
      kind: 'bookkeeping' as const,
      reason: 'generated bookkeeping',
      paths: ['generated.json'],
      planDisposition: 'inspect' as const,
      strategy: 'manifest-check' as const,
      plannedChecks: ['inspect manifest'],
      exclusionAuthority: null,
      outcome: 'complete' as const,
      inspectionCoverage: 'all' as const,
      uninspectedPathIndexes: [],
      commands: [],
      uncertainty: [],
    };
    terminal.reviewAccounting.classifications = [
      accountingClassification,
      structuredClone(accountingClassification),
    ];
    expect(errorCodes(context, terminal)).toEqual(
      expect.arrayContaining([
        'duplicate-assignment-bucket',
        'assignment-mismatch',
      ]),
    );

    terminal.reviewAccounting.classifications.pop();
    expect(errorCodes(context, terminal)).toContain('assignment-mismatch');
  });

  it.each([
    ['command', 'duplicate-command-id'],
    ['evidence', 'duplicate-evidence-id'],
    ['claim', 'duplicate-claim-id'],
    ['finding', 'duplicate-finding-id'],
  ] as const)('rejects duplicate %s IDs', (kind, code) => {
    const { context, terminal } = fixture();
    const accounting = terminal.reviewAccounting;
    if (kind === 'command') {
      accounting.lanes[0]!.primaryCompletion.commands.push(
        structuredClone(accounting.lanes[0]!.commands[0]!),
      );
    } else if (kind === 'evidence') {
      accounting.evidence.push(structuredClone(accounting.evidence[0]!));
    } else if (kind === 'claim') {
      accounting.verification.push(
        structuredClone(accounting.verification[0]!),
      );
    } else if (terminal.status === 'complete') {
      terminal.candidate = {
        kind: 'structured',
        review: {
          summary: '',
          verification_commands: [],
          findings: [
            {
              id: 'finding-1',
              severity: 'minor',
              title: 'one',
              file: null,
              line: null,
              body: '',
              fix_guidance: null,
            },
            {
              id: 'finding-1',
              severity: 'minor',
              title: 'two',
              file: null,
              line: null,
              body: '',
              fix_guidance: null,
            },
          ],
        },
      };
    }
    expect(errorCodes(context, terminal)).toContain(code);
  });

  it('rejects broken references and invalid claim dispositions', () => {
    const { context, terminal } = fixture();
    const claim = terminal.reviewAccounting.verification.at(-1)!;
    claim.laneIds = ['missing'];
    claim.evidenceRefIds = ['missing'];
    claim.mode = 'direct';
    claim.disposition = 'rejected';
    expect(errorCodes(context, terminal)).toEqual(
      expect.arrayContaining([
        'unknown-lane-reference',
        'unknown-evidence-reference',
        'invalid-claim-disposition',
      ]),
    );
  });

  it('requires blocked-incomplete accounting for incomplete coverage', () => {
    const { context, terminal } = fixture();
    terminal.reviewAccounting.lanes[0]!.inspectionCoverage = 'none';
    terminal.reviewAccounting.lanes[0]!.uninspectedPathIndexes = [0];
    terminal.reviewAccounting.lanes[0]!.uncoveredObligationIds = [
      'task:p01-t01',
    ];
    expect(errorCodes(context, terminal)).toContain('invalid-outcome');

    const blockedAccounting = {
      ...structuredClone(terminal.reviewAccounting),
      completion: 'blocked-incomplete' as const,
    };
    context.assignment.lanes[0]!.primaryContingency = {
      allowed: false,
      paths: ['src/review.ts'],
      obligationIds: ['task:p01-t01'],
    };
    blockedAccounting.lanes[0]!.workerOutcome = 'uncovered';
    context.plan.lanes[0]!.delegated = true;
    blockedAccounting.lanes[0]!.dossierDigest = null;
    blockedAccounting.lanes[0]!.primaryCompletion = {
      outcome: 'not-permitted',
      completedPathIndexes: [],
      completedObligationIds: [],
      commands: [],
      evidenceRefIds: [],
    };
    const blocked: ReviewerTerminalV1 = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'coverage incomplete',
      diagnostics: ['one path remains'],
      reviewAccounting: blockedAccounting,
    };
    expect(validateReviewOutput(context, blocked).valid).toBe(true);
  });

  it('rejects primary completion when contingency is not permitted', () => {
    const { context, terminal } = fixture();
    context.plan.lanes[0]!.delegated = true;
    context.assignment.lanes[0]!.primaryContingency = {
      allowed: false,
      paths: ['src/review.ts'],
      obligationIds: ['task:p01-t01'],
    };
    const lane = terminal.reviewAccounting.lanes[0]!;
    lane.workerOutcome = 'uncovered';
    lane.dossierDigest = null;
    lane.primaryCompletion = {
      outcome: 'complete',
      completedPathIndexes: [0],
      completedObligationIds: ['task:p01-t01'],
      commands: [],
      evidenceRefIds: ['evidence-1'],
    };
    lane.inspectionCoverage = 'all';
    lane.uninspectedPathIndexes = [];
    lane.uncoveredObligationIds = [];

    expect(errorCodes(context, terminal)).toContain('invalid-contingency');
  });

  it('derives final coverage from exact permitted primary subsets', () => {
    const { context, terminal } = fixture();
    context.plan.lanes[0]!.delegated = true;
    context.assignment.lanes[0]!.paths = ['src/review.ts', 'src/second.ts'];
    context.assignment.lanes[0]!.primaryObligationIds = [
      'task:p01-t01',
      'task:p01-t02',
    ];
    context.assignment.lanes[0]!.primaryContingency = {
      allowed: true,
      paths: ['src/review.ts', 'src/second.ts'],
      obligationIds: ['task:p01-t01', 'task:p01-t02'],
    };
    const lane = terminal.reviewAccounting.lanes[0]!;
    lane.paths = ['src/review.ts', 'src/second.ts'];
    lane.primaryObligationIds = ['task:p01-t01', 'task:p01-t02'];
    lane.workerOutcome = 'uncovered';
    lane.dossierDigest = null;
    lane.primaryCompletion = {
      outcome: 'partial',
      completedPathIndexes: [0],
      completedObligationIds: ['task:p01-t01'],
      commands: [],
      evidenceRefIds: ['evidence-1'],
    };
    lane.inspectionCoverage = 'all';
    lane.uninspectedPathIndexes = [];
    lane.uncoveredObligationIds = [];

    expect(errorCodes(context, terminal)).toContain(
      'contingency-coverage-mismatch',
    );

    lane.inspectionCoverage = 'partial';
    lane.uninspectedPathIndexes = [1];
    lane.uncoveredObligationIds = ['task:p01-t02'];
    terminal.reviewAccounting.completion = 'blocked-incomplete';
    const blocked: ReviewerTerminalV1 = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'partial contingency',
      diagnostics: ['one path remains'],
      reviewAccounting: terminal.reviewAccounting as ReviewAccountingV1 & {
        completion: 'blocked-incomplete';
      },
    };
    expect(validateReviewOutput(context, blocked).valid).toBe(true);

    lane.primaryCompletion.outcome = 'complete';
    expect(errorCodes(context, blocked)).toContain('invalid-contingency');
  });

  it('starts uncovered delegated coverage from the full lane assignment', () => {
    const { context, terminal } = fixture();
    context.plan.lanes[0]!.delegated = true;
    const expected = context.assignment.lanes[0]!;
    expected.paths = ['src/review.ts', 'src/second.ts'];
    expected.primaryObligationIds = ['task:p01-t01', 'task:p01-t02'];
    expected.primaryContingency = {
      allowed: true,
      paths: ['src/review.ts'],
      obligationIds: ['task:p01-t01'],
    };
    const lane = terminal.reviewAccounting.lanes[0]!;
    lane.paths = [...expected.paths];
    lane.primaryObligationIds = [...expected.primaryObligationIds];
    lane.workerOutcome = 'uncovered';
    lane.dossierDigest = null;
    lane.primaryCompletion = {
      outcome: 'complete',
      completedPathIndexes: [0],
      completedObligationIds: ['task:p01-t01'],
      commands: [],
      evidenceRefIds: ['evidence-1'],
    };
    lane.inspectionCoverage = 'all';
    lane.uninspectedPathIndexes = [];
    lane.uncoveredObligationIds = [];

    expect(errorCodes(context, terminal)).toContain(
      'contingency-coverage-mismatch',
    );

    lane.inspectionCoverage = 'partial';
    lane.uninspectedPathIndexes = [1];
    lane.uncoveredObligationIds = ['task:p01-t02'];
    terminal.reviewAccounting.completion = 'blocked-incomplete';
    const blocked: ReviewerTerminalV1 = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'strict-subset contingency left lane work',
      diagnostics: ['second path and obligation remain uncovered'],
      reviewAccounting: terminal.reviewAccounting as ReviewAccountingV1 & {
        completion: 'blocked-incomplete';
      },
    };
    expect(validateReviewOutput(context, blocked).valid).toBe(true);
  });

  it('requires partial worker coverage from a run-bound dossier projection', () => {
    const { context, terminal } = fixture();
    context.plan.lanes[0]!.delegated = true;
    const expected = context.assignment.lanes[0]!;
    expected.paths = ['src/review.ts', 'src/second.ts', 'src/third.ts'];
    expected.primaryObligationIds = [
      'task:p01-t01',
      'task:p01-t02',
      'task:p01-t03',
    ];
    expected.primaryContingency = {
      allowed: true,
      paths: ['src/second.ts'],
      obligationIds: ['task:p01-t02'],
    };
    const lane = terminal.reviewAccounting.lanes[0]!;
    lane.paths = [...expected.paths];
    lane.primaryObligationIds = [...expected.primaryObligationIds];
    lane.workerOutcome = 'partial';
    lane.dossierDigest = 'd'.repeat(64);
    lane.primaryCompletion = {
      outcome: 'complete',
      completedPathIndexes: [1],
      completedObligationIds: ['task:p01-t02'],
      commands: [],
      evidenceRefIds: ['evidence-1'],
    };
    lane.inspectionCoverage = 'all';
    lane.uninspectedPathIndexes = [];
    lane.uncoveredObligationIds = [];

    expect(errorCodes(context, terminal)).toContain('missing-worker-coverage');

    context.workerCoverage = [
      {
        validationRunId: 'validation-run-1',
        planDigest: 'plan',
        laneId: 'lane-1',
        dossierDigest: 'd'.repeat(64),
        outcome: 'partial',
        inspectedPathIndexes: [0],
        uncoveredPathIndexes: [1, 2],
        inspectedObligationIds: ['task:p01-t01'],
        uncoveredObligationIds: ['task:p01-t02', 'task:p01-t03'],
      },
    ];
    expect(errorCodes(context, terminal)).toContain(
      'contingency-coverage-mismatch',
    );

    lane.inspectionCoverage = 'partial';
    lane.uninspectedPathIndexes = [2];
    lane.uncoveredObligationIds = ['task:p01-t03'];
    terminal.reviewAccounting.completion = 'blocked-incomplete';
    const blocked: ReviewerTerminalV1 = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'partial worker and contingency left a coverage gap',
      diagnostics: ['third path and obligation remain uncovered'],
      reviewAccounting: terminal.reviewAccounting as ReviewAccountingV1 & {
        completion: 'blocked-incomplete';
      },
    };
    expect(validateReviewOutput(context, blocked).valid).toBe(true);
    context.workerCoverage[0]!.validationRunId = 'other-run';
    expect(errorCodes(context, blocked)).toContain(
      'worker-coverage-identity-mismatch',
    );
  });

  it('preserves inline not-delegated blocked-incomplete coverage', () => {
    const { context, terminal } = fixture();
    const expected = context.assignment.lanes[0]!;
    expected.paths = ['src/review.ts', 'src/second.ts'];
    expected.primaryObligationIds = ['task:p01-t01', 'task:p01-t02'];
    const lane = terminal.reviewAccounting.lanes[0]!;
    lane.paths = [...expected.paths];
    lane.primaryObligationIds = [...expected.primaryObligationIds];
    lane.inspectionCoverage = 'partial';
    lane.uninspectedPathIndexes = [1];
    lane.uncoveredObligationIds = ['task:p01-t02'];
    terminal.reviewAccounting.completion = 'blocked-incomplete';
    const blocked: ReviewerTerminalV1 = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'inline inspection remained partial',
      diagnostics: ['second path remains'],
      reviewAccounting: terminal.reviewAccounting as ReviewAccountingV1 & {
        completion: 'blocked-incomplete';
      },
    };

    expect(validateReviewOutput(context, blocked).valid).toBe(true);
  });

  it('does not let delegated lanes masquerade as inline coverage', () => {
    const { context, terminal } = fixture();
    context.plan.lanes[0]!.delegated = true;

    expect(errorCodes(context, terminal)).toContain('invalid-outcome');
  });

  it('rejects complete output that omits required direct and sample claims', () => {
    const { context, terminal } = fixture();
    terminal.reviewAccounting.verification = [];
    expect(errorCodes(context, terminal)).toEqual(
      expect.arrayContaining([
        'missing-required-claim',
        'missing-positive-coverage',
      ]),
    );
  });

  it('accepts only launcher-bound artifact finding projections', () => {
    const { context: baseContext, terminal } = fixture();
    terminal.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: '/private/review.md',
    };
    terminal.reviewAccounting.verification = [
      {
        claimId: 'finding',
        kind: 'promoted-finding',
        findingId: 'artifact:critical:1',
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'absence',
        kind: 'consequential-absence',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'conflict',
        kind: 'worker-conflict',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'rejected',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'gap',
        kind: 'cross-lane-gap',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'direct',
        disposition: 'rejected',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'positive',
        kind: 'positive-coverage-sample',
        findingId: null,
        laneIds: ['lane-1'],
        mode: 'sample',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
      terminal.reviewAccounting.verification[0]!,
    ];
    const context = {
      ...baseContext,
      artifactFindingProjection: {
        schemaVersion: 1,
        snapshotDigest: 'a'.repeat(64),
        accountingDigest: hashCanonicalJson(terminal.reviewAccounting),
        findingIds: ['artifact:critical:1'],
      },
    } as ReviewOutputValidationContext;

    expect(validateReviewOutput(context, terminal).valid).toBe(true);
    context.artifactFindingProjection!.accountingDigest = 'b'.repeat(64);
    expect(errorCodes(context, terminal)).toContain(
      'artifact-projection-mismatch',
    );
    delete context.artifactFindingProjection;
    expect(errorCodes(context, terminal)).toContain(
      'missing-artifact-projection',
    );
  });
});
