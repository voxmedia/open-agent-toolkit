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
        claimId: 'claim-1',
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
    const claim = terminal.reviewAccounting.verification[0]!;
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
    const blocked: ReviewerTerminalV1 = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'coverage incomplete',
      diagnostics: ['one path remains'],
      reviewAccounting: blockedAccounting,
    };
    expect(validateReviewOutput(context, blocked).valid).toBe(true);
  });
});
