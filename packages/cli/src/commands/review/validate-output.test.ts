import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { createArtifactDraft } from '@review/artifact-staging';
import type {
  ReviewAccountingV1,
  ReviewerTerminalV1,
  ValidatedWorkerCoverageProjectionV1,
} from '@review/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createValidateOutputCommand,
  validateStoredReviewOutput,
} from './validate-output';

const roots: string[] = [];

function accounting(): ReviewAccountingV1 & { completion: 'complete' } {
  return {
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
        id: 'lane',
        paths: ['src/a.ts'],
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
  };
}

function terminal(): ReviewerTerminalV1 {
  return {
    schemaVersion: 1,
    status: 'complete',
    candidate: {
      kind: 'structured',
      review: { summary: 'done', findings: [], verification_commands: [] },
    },
    reviewAccounting: accounting(),
  };
}

function validationState() {
  return {
    phase: 'evidence_started',
    preparation: {
      correlation: { gateRunId: null, launchAttemptId: 'launch' },
    },
    draft: null as {
      path: string;
      device: number;
      inode: number;
    } | null,
    receipt: {
      token: 'receipt',
      validationRunId: 'validation-run-1',
      gateRunId: null,
      launchAttemptId: 'launch',
      acceptedHandleDigest: 'handle',
      contractVersion: 1 as const,
      contextDigest: 'context',
      planDigest: 'plan',
      assignmentDigest: 'assignment',
      validatedAt: '2026-07-30T20:00:00.000Z',
      expiresAt: '2026-07-30T22:00:00.000Z',
    },
    plan: {
      strategy: 'selective-inline' as const,
      lanes: [{ id: 'lane', delegated: false }],
      verificationBoundary: {
        requiredClaims: [],
        positiveCoverage: {
          mode: 'sample' as const,
          laneIds: [],
          rationale: '',
        },
        deterministicAcceptance: {
          mode: 'provenance' as const,
          requiredFields: [],
        },
      },
    },
    assignment: {
      lanes: [
        {
          id: 'lane',
          paths: ['src/a.ts'],
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
    workerCoverage: [] as ValidatedWorkerCoverageProjectionV1[],
    output: {
      immutableSubstanceDigest: null,
      attempts: 0,
      terminalClassification: null as
        | 'reviewer-blocked'
        | 'accounting-invalid'
        | null,
    },
    acceptedSnapshot: null as {
      id: string;
      bytesBase64: string;
      digest: string;
      accounting: ReviewAccountingV1;
      publication: 'available' | 'consuming' | 'consumed';
    } | null,
  };
}

function fakeStore(state: ReturnType<typeof validationState>) {
  return {
    readRun: vi.fn(async () => ({ state })),
    updateRun: vi.fn(
      async (
        _runId: string,
        update: (current: typeof state) => typeof state,
      ) => {
        state = update(structuredClone(state));
        return { state };
      },
    ),
    recordAccountingInvalidTerminal: vi.fn(async () => {}),
    get state() {
      return state;
    },
  };
}

function args(): string[] {
  return [
    'node',
    'oat',
    'validate-output',
    '--run-id',
    'validation-run-1',
    '--stdin',
    '--json',
  ];
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('validate-output command', () => {
  it('emits one success envelope and exit zero', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const validate = vi.fn(async () => ({
      valid: true as const,
      outputDigest: 'digest',
    }));
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(terminal())]),
      write,
      setExitCode,
      validate,
    }).parseAsync(args());

    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]?.[0]).toMatch(/\n$/);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toEqual({
      ok: true,
      result: { valid: true, outputDigest: 'digest' },
    });
  });

  it('uses exit one for validation rejection with typed result', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(terminal())]),
      write,
      setExitCode,
      validate: vi.fn(async () => ({
        valid: false as const,
        errors: [
          { code: 'receipt-mismatch', pointer: '/receipt', message: 'wrong' },
        ],
      })),
    }).parseAsync(args());
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'validation', code: 'invalid-review-output' },
      result: { valid: false, errors: [{ code: 'receipt-mismatch' }] },
    });
  });

  it('uses exit two for system failure and rejects malformed terminals first', async () => {
    const systemWrite = vi.fn();
    const systemExit = vi.fn();
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(terminal())]),
      write: systemWrite,
      setExitCode: systemExit,
      validate: vi.fn(async () => {
        throw new Error('private store failed');
      }),
    }).parseAsync(args());
    expect(systemExit).toHaveBeenCalledWith(2);
    expect(JSON.parse(systemWrite.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'system' },
    });

    const invalidWrite = vi.fn();
    const validate = vi.fn();
    await createValidateOutputCommand({
      stdin: Readable.from(['{"schemaVersion":1,"status":"complete"}']),
      write: invalidWrite,
      setExitCode: vi.fn(),
      validate,
    }).parseAsync(args());
    expect(validate).not.toHaveBeenCalled();
    expect(JSON.parse(invalidWrite.mock.calls[0]?.[0] as string)).toMatchObject(
      {
        ok: false,
        error: { category: 'input', code: 'review-output-schema-invalid' },
      },
    );
  });

  it('requires canonical equality between artifact and envelope accounting', async () => {
    const root = join(
      tmpdir(),
      `oat-validate-output-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    await writeFile(
      draft.path,
      `Findings: 0 critical, 0 important, 0 medium, 0 minor\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(accounting())}\n\`\`\`\n`,
    );
    const value = terminal();
    if (value.status !== 'complete') throw new Error('fixture');
    value.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: draft.path,
    };
    const state = { ...validationState(), draft };
    const store = fakeStore(state);
    expect(
      await validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: value },
        store as never,
      ),
    ).toMatchObject({ valid: true });
    expect(store.state).toMatchObject({
      phase: 'accepted',
      draft: null,
      acceptedSnapshot: {
        id: expect.stringMatching(/^[0-9a-f]{64}$/),
        digest: expect.stringMatching(/^[0-9a-f]{64}$/),
        publication: 'available',
      },
    });
    const acceptedBytes = store.state.acceptedSnapshot?.bytesBase64;
    await writeFile(draft.path, '# changed after acceptance');
    expect(store.state.acceptedSnapshot?.bytesBase64).toBe(acceptedBytes);

    value.reviewAccounting.receipt = 'different';
    const mismatchStore = fakeStore({ ...validationState(), draft });
    expect(
      await validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: value },
        mismatchStore as never,
      ),
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'schema-error' }],
    });
  });

  it('persists immutable substance and terminalizes the third failed submission', async () => {
    const state = validationState();
    state.preparation.correlation.gateRunId = 'gate-run';
    const store = fakeStore(state);
    const invalid = terminal();
    invalid.reviewAccounting.receipt = 'wrong';

    expect(
      await validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: invalid },
        store as never,
      ),
    ).toMatchObject({ valid: false });
    expect(store.state).toMatchObject({
      phase: 'accounting_repair',
      output: {
        immutableSubstanceDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        attempts: 1,
      },
    });

    const changed = structuredClone(invalid);
    if (changed.status === 'complete') {
      changed.candidate.review.summary = 'changed substance';
    }
    expect(
      await validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: changed },
        store as never,
      ),
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'immutable-substance-mismatch' }],
    });
    expect(store.state).toMatchObject({
      phase: 'terminal',
      output: {
        attempts: 2,
        terminalClassification: 'accounting-invalid',
      },
    });
    expect(store.recordAccountingInvalidTerminal).toHaveBeenCalledWith(
      'validation-run-1',
    );

    const cappedState = validationState();
    cappedState.preparation.correlation.gateRunId = 'gate-run';
    const cappedStore = fakeStore(cappedState);
    for (let attempt = 1; attempt <= 3; attempt++) {
      await validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: invalid },
        cappedStore as never,
      );
      expect(cappedStore.state.output.attempts).toBe(attempt);
    }
    expect(cappedStore.state.phase).toBe('terminal');
    expect(cappedStore.state.output.terminalClassification).toBe(
      'accounting-invalid',
    );
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: invalid },
        cappedStore as never,
      ),
    ).rejects.toMatchObject({ code: 'output-attempt-limit' });
  });

  it('validates partial lanes against persisted worker coverage', async () => {
    const state = validationState();
    state.assignment.lanes[0]!.paths = ['src/a.ts', 'src/b.ts'];
    state.assignment.lanes[0]!.primaryObligationIds = [
      'task:p01-t01',
      'task:p01-t02',
    ];
    state.plan.lanes[0]!.delegated = true;
    state.workerCoverage = [
      {
        validationRunId: 'validation-run-1',
        planDigest: 'plan',
        laneId: 'lane',
        dossierDigest: 'd'.repeat(64),
        outcome: 'partial',
        inspectedPathIndexes: [0],
        uncoveredPathIndexes: [1],
        inspectedObligationIds: ['task:p01-t01'],
        uncoveredObligationIds: ['task:p01-t02'],
      },
    ];
    const reviewAccounting: ReviewAccountingV1 = accounting();
    reviewAccounting.completion = 'blocked-incomplete';
    const lane = reviewAccounting.lanes[0]!;
    lane.paths = ['src/a.ts', 'src/b.ts'];
    lane.primaryObligationIds = ['task:p01-t01', 'task:p01-t02'];
    lane.workerOutcome = 'partial';
    lane.dossierDigest = 'd'.repeat(64);
    lane.inspectionCoverage = 'partial';
    lane.uninspectedPathIndexes = [1];
    lane.uncoveredObligationIds = ['task:p01-t02'];
    lane.primaryCompletion.outcome = 'not-permitted';
    const value: ReviewerTerminalV1 = {
      schemaVersion: 1,
      status: 'blocked',
      reason: 'worker coverage remained partial',
      diagnostics: ['second path remains uncovered'],
      reviewAccounting: reviewAccounting as ReviewAccountingV1 & {
        completion: 'blocked-incomplete';
      },
    };

    const store = fakeStore(state);
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: value },
        store as never,
      ),
    ).resolves.toMatchObject({ valid: true });
    expect(store.state.phase).toBe('terminal');
    expect(store.state.output.terminalClassification).toBe('reviewer-blocked');
    expect(store.recordAccountingInvalidTerminal).not.toHaveBeenCalled();
  });
});
