import { describe, expect, it, vi } from 'vitest';

import {
  immutableReviewSubstanceDigest,
  validateAndRepair,
  type ReviewCoordinatorSession,
} from './coordinator-contract';
import type { ReviewOutputValidationContext } from './output-validator';
import type { ReviewerTerminalV1 } from './types';

function fixture(): {
  context: ReviewOutputValidationContext;
  terminal: ReviewerTerminalV1;
} {
  const context: ReviewOutputValidationContext = {
    receipt: {
      token: 'receipt',
      validationRunId: 'validation-run',
      gateRunId: null,
      launchAttemptId: 'launch',
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
        requiredClaims: [],
        positiveCoverage: {
          mode: 'sample',
          laneIds: [],
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
  };
  return {
    context,
    terminal: {
      schemaVersion: 1,
      status: 'complete',
      candidate: {
        kind: 'structured',
        review: {
          summary: 'reviewed',
          findings: [],
          verification_commands: [],
        },
      },
      reviewAccounting: {
        schemaVersion: 1,
        receipt: 'receipt',
        contextDigest: 'context',
        planDigest: 'plan',
        assignmentDigest: 'assignment',
        strategy: 'selective-inline',
        completion: 'complete',
        evidence: [],
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
            commands: [],
            evidenceRefIds: [],
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
        verification: [],
        budget: { evidenceStoppedAt: null, outputReservePreserved: null },
      },
    },
  };
}

function session(
  context: ReviewOutputValidationContext,
  repairAccounting: ReviewCoordinatorSession['continuation']['repairAccounting'],
): ReviewCoordinatorSession {
  return {
    context,
    continuation: { repairAccounting },
    outputDeadlineMs: Date.now() + 60_000,
  };
}

describe('immutable same-handle accounting repair', () => {
  it('repairs only identity and assignment allowlist fields', async () => {
    const { context, terminal } = fixture();
    terminal.reviewAccounting.receipt = 'wrong';
    terminal.reviewAccounting.lanes[0]!.paths = ['src/wrong.ts'];
    const repairAccounting = vi.fn(async () => {
      const repaired = structuredClone(terminal);
      repaired.reviewAccounting.receipt = 'receipt';
      repaired.reviewAccounting.lanes[0]!.paths = ['src/review.ts'];
      return repaired;
    });
    const result = await validateAndRepair(
      session(context, repairAccounting),
      terminal,
    );
    expect(result).toMatchObject({ accepted: true, repairAttempts: 1 });
    expect(repairAccounting).toHaveBeenCalledTimes(1);
  });

  it('freezes findings, severity, verdict, evidence, commands, claims, outcomes, uncertainty, strategy, and budget', () => {
    const { terminal } = fixture();
    const original = immutableReviewSubstanceDigest(terminal);
    const mutations: Array<(value: ReviewerTerminalV1) => void> = [
      (value) => {
        if (value.status === 'complete')
          value.candidate.review.summary = 'changed';
      },
      (value) => {
        value.reviewAccounting.strategy = 'delegated';
      },
      (value) => {
        value.reviewAccounting.evidence.push({
          id: 'e',
          kind: 'source',
          locator: 'src/review.ts',
          scopeRefs: [],
          provenance: 'host',
          digest: 'digest',
          commandId: null,
          commandResultDigest: null,
        });
      },
      (value) => {
        value.reviewAccounting.lanes[0]!.commands.push({
          id: 'c',
          command: 'pnpm test',
          cwd: '.',
          scopeRefs: [],
          provenance: {
            runner: 'host',
            invocationDigest: 'invocation',
            capturedAt: '2026-07-30T20:03:00.000Z',
          },
          result: { status: 'completed', exitCode: 0, outputDigest: 'output' },
        });
      },
      (value) => {
        value.reviewAccounting.verification.push({
          claimId: 'claim',
          kind: 'positive-coverage-sample',
          findingId: null,
          laneIds: ['lane-1'],
          mode: 'sample',
          disposition: 'verified',
          evidenceRefIds: [],
        });
      },
      (value) => {
        value.reviewAccounting.lanes[0]!.workerOutcome = 'uncovered';
      },
      (value) => {
        value.reviewAccounting.lanes[0]!.uncertainty = ['uncertain'];
      },
      (value) => {
        value.reviewAccounting.budget.outputReservePreserved = true;
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(terminal);
      mutate(changed);
      expect(immutableReviewSubstanceDigest(changed)).not.toBe(original);
    }

    const allowed = structuredClone(terminal);
    allowed.reviewAccounting.receipt = 'new';
    allowed.reviewAccounting.contextDigest = 'new';
    allowed.reviewAccounting.planDigest = 'new';
    allowed.reviewAccounting.assignmentDigest = 'new';
    allowed.reviewAccounting.lanes[0]!.paths = ['src/new.ts'];
    allowed.reviewAccounting.lanes[0]!.primaryObligationIds = ['task:new'];
    allowed.reviewAccounting.lanes[0]!.seamObligationIds = ['task:seam'];
    allowed.reviewAccounting.lanes[0]!.uninspectedPathIndexes = [0];
    allowed.reviewAccounting.lanes[0]!.uncoveredObligationIds = ['task:new'];
    allowed.reviewAccounting.lanes[0]!.primaryCompletion.completedPathIndexes =
      [0];
    allowed.reviewAccounting.lanes[0]!.primaryCompletion.completedObligationIds =
      ['task:new'];
    expect(immutableReviewSubstanceDigest(allowed)).toBe(original);

    const artifact = (summary: string, pretty: boolean) =>
      Buffer.from(
        [
          '# Review',
          summary,
          '',
          '## Review Accounting',
          '',
          '```json',
          JSON.stringify(
            terminal.reviewAccounting,
            null,
            pretty ? 2 : undefined,
          ),
          '```',
          '',
        ].join('\n'),
      ).toString('base64');
    const artifactDigest = immutableReviewSubstanceDigest(
      terminal,
      artifact('original prose', false),
    );
    expect(
      immutableReviewSubstanceDigest(
        terminal,
        artifact('original prose', true),
      ),
    ).toBe(artifactDigest);
    expect(
      immutableReviewSubstanceDigest(
        terminal,
        artifact('changed prose', false),
      ),
    ).not.toBe(artifactDigest);
  });

  it('rejects any repaired substance mutation', async () => {
    const { context, terminal } = fixture();
    terminal.reviewAccounting.receipt = 'wrong';
    const repairAccounting = vi.fn(async () => {
      const repaired = structuredClone(terminal);
      repaired.reviewAccounting.receipt = 'receipt';
      if (repaired.status === 'complete') {
        repaired.candidate.review.summary = 'changed verdict substance';
      }
      return repaired;
    });
    const result = await validateAndRepair(
      session(context, repairAccounting),
      terminal,
    );
    expect(result).toMatchObject({
      accepted: false,
      code: 'review_complete_accounting_invalid',
      repairAttempts: 1,
    });
  });

  it('caps repair calls at two on the recorded continuation', async () => {
    const { context, terminal } = fixture();
    terminal.reviewAccounting.receipt = 'wrong';
    const repairAccounting = vi.fn(async () => structuredClone(terminal));
    const result = await validateAndRepair(
      session(context, repairAccounting),
      terminal,
    );
    expect(result).toMatchObject({ accepted: false, repairAttempts: 2 });
    expect(repairAccounting).toHaveBeenCalledTimes(2);
  });
});
