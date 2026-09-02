import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { createArtifactDraft } from '@review/artifact-staging';
import type {
  ReviewAccountingV1,
  ReviewerTerminalOverlayV1,
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

function terminalOverlay(): ReviewerTerminalOverlayV1 {
  const full = accounting();
  return {
    schemaVersion: 1,
    contract: 'reviewer-terminal-overlay/v1',
    status: 'complete',
    candidate: {
      kind: 'structured',
      review: { summary: 'done', findings: [], verification_commands: [] },
    },
    reviewAccounting: {
      evidence: structuredClone(full.evidence),
      lanes: full.lanes.map((lane) => ({
        laneId: lane.id,
        inspectionCoverage: lane.inspectionCoverage,
        uninspectedPathIndexes: [...lane.uninspectedPathIndexes],
        uncoveredObligationIds: [...lane.uncoveredObligationIds],
        commands: structuredClone(lane.commands),
        evidenceRefIds: [...lane.evidenceRefIds],
        uncertainty: [...lane.uncertainty],
        primaryCompletion: structuredClone(lane.primaryCompletion),
      })),
      classifications: full.classifications.map((classification) => ({
        classificationId: classification.id,
        outcome: classification.outcome,
        inspectionCoverage: classification.inspectionCoverage,
        uninspectedPathIndexes: [...classification.uninspectedPathIndexes],
        commands: structuredClone(classification.commands),
        uncertainty: [...classification.uncertainty],
      })),
      verification: {
        promotedFindings: [],
        consequentialAbsence: null,
        workerConflict: null,
        crossLaneGap: null,
        positiveCoverage: [],
        deterministicResults: [],
      },
      budget: structuredClone(full.budget),
    },
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
      lanes: [
        { id: 'lane', delegated: false, replay: 'direct-verify' as const },
      ],
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
      publicationIntent: {
        destination: string;
        reservationId: string;
        destinationDevice: number | null;
        destinationInode: number | null;
      } | null;
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

  it('accepts strict overlay ingress through the command boundary', async () => {
    const validate = vi.fn(async () => ({
      valid: true as const,
      outputDigest: 'digest',
    }));
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(terminalOverlay())]),
      write: vi.fn(),
      setExitCode: vi.fn(),
      validate,
    }).parseAsync(args());

    expect(validate).toHaveBeenCalledWith({
      runId: 'validation-run-1',
      terminal: expect.objectContaining({
        contract: 'reviewer-terminal-overlay/v1',
      }),
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

    const invalidOverlay = terminalOverlay() as unknown as Record<
      string,
      Record<string, unknown>
    >;
    invalidOverlay['reviewAccounting']!['receipt'] = 'forbidden';
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(invalidOverlay)]),
      write: vi.fn(),
      setExitCode: vi.fn(),
      validate,
    }).parseAsync(args());
    expect(validate).not.toHaveBeenCalled();
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

  it('assembles structured and artifact overlays from sealed state', async () => {
    const structuredStore = fakeStore(validationState());
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: terminalOverlay() },
        structuredStore as never,
      ),
    ).resolves.toMatchObject({ valid: true });
    expect(structuredStore.state.phase).toBe('accepted');

    const root = join(
      tmpdir(),
      `oat-validate-overlay-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    const overlay = terminalOverlay();
    await writeFile(
      draft.path,
      `Findings: 0 critical, 0 important, 0 medium, 0 minor\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(overlay.reviewAccounting)}\n\`\`\`\n`,
    );
    overlay.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: draft.path,
    };
    const artifactStore = fakeStore({ ...validationState(), draft });
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: overlay },
        artifactStore as never,
      ),
    ).resolves.toMatchObject({ valid: true });
    expect(artifactStore.state.acceptedSnapshot?.accounting).toEqual(
      accounting(),
    );
    expect(
      Buffer.from(
        artifactStore.state.acceptedSnapshot!.bytesBase64,
        'base64',
      ).toString('utf8'),
    ).toContain('"receipt":"receipt"');
  });

  it('counts overlay join failures as bounded repair submissions', async () => {
    const store = fakeStore(validationState());
    const overlay = terminalOverlay();
    overlay.reviewAccounting.lanes[0]!.laneId = 'unknown';

    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: overlay },
        store as never,
      ),
    ).resolves.toMatchObject({
      valid: false,
      errors: [{ code: 'unknown-overlay-selector' }],
    });
    expect(store.state).toMatchObject({
      phase: 'accounting_repair',
      output: { attempts: 1 },
    });

    await validateStoredReviewOutput(
      { runId: 'validation-run-1', terminal: overlay },
      store as never,
    );
    await validateStoredReviewOutput(
      { runId: 'validation-run-1', terminal: overlay },
      store as never,
    );
    expect(store.state).toMatchObject({
      phase: 'terminal',
      output: {
        attempts: 3,
        terminalClassification: 'accounting-invalid',
      },
    });
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: overlay },
        store as never,
      ),
    ).rejects.toMatchObject({ code: 'output-attempt-limit' });
  });

  it('freezes review substance before an overlay join repair', async () => {
    const store = fakeStore(validationState());
    const overlay = terminalOverlay();
    overlay.reviewAccounting.lanes[0]!.laneId = 'unknown';
    await validateStoredReviewOutput(
      { runId: 'validation-run-1', terminal: overlay },
      store as never,
    );

    const changed = structuredClone(overlay);
    if (changed.status === 'complete') {
      changed.candidate.review.summary = 'changed during repair';
    }
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: changed },
        store as never,
      ),
    ).resolves.toMatchObject({
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
  });

  it('repairs only overlay-authored mutable accounting on the same run', async () => {
    const store = fakeStore(validationState());
    const invalid = terminalOverlay();
    invalid.reviewAccounting.lanes[0]!.uninspectedPathIndexes = [0];

    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: invalid },
        store as never,
      ),
    ).resolves.toMatchObject({ valid: false });
    expect(store.state).toMatchObject({
      phase: 'accounting_repair',
      output: { attempts: 1 },
    });

    const repaired = structuredClone(invalid);
    repaired.reviewAccounting.lanes[0]!.uninspectedPathIndexes = [];
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: repaired },
        store as never,
      ),
    ).resolves.toMatchObject({ valid: true });
    expect(store.state).toMatchObject({
      phase: 'accepted',
      output: { attempts: 2 },
    });
  });

  it('repairs overlay accounting in an artifact without changing its substance', async () => {
    const root = join(
      tmpdir(),
      `oat-validate-overlay-repair-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    const invalid = terminalOverlay();
    invalid.reviewAccounting.lanes[0]!.uninspectedPathIndexes = [0];
    invalid.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: draft.path,
    };
    const artifact = (overlay: ReviewerTerminalOverlayV1) =>
      `# Review\n\nFindings: 0 critical, 0 important, 0 medium, 0 minor\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(overlay.reviewAccounting)}\n\`\`\`\n`;
    await writeFile(draft.path, artifact(invalid));
    const store = fakeStore({ ...validationState(), draft });

    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: invalid },
        store as never,
      ),
    ).resolves.toMatchObject({ valid: false });
    expect(store.state).toMatchObject({
      phase: 'accounting_repair',
      output: { attempts: 1 },
    });

    const repaired = structuredClone(invalid);
    repaired.reviewAccounting.lanes[0]!.uninspectedPathIndexes = [];
    await writeFile(draft.path, artifact(repaired));
    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: repaired },
        store as never,
      ),
    ).resolves.toMatchObject({ valid: true });
    expect(store.state).toMatchObject({
      phase: 'accepted',
      draft: null,
      output: { attempts: 2 },
      acceptedSnapshot: { publication: 'available' },
    });
  });

  it('records malformed artifact accounting as a terminal typed rejection', async () => {
    const root = join(
      tmpdir(),
      `oat-validate-overlay-malformed-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    const overlay = terminalOverlay();
    overlay.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: draft.path,
    };
    await writeFile(
      draft.path,
      'Findings: 0 critical, 0 important, 0 medium, 0 minor\n\n## Review Accounting\n\n```json\n{not-json}\n```\n',
    );
    const store = fakeStore({ ...validationState(), draft });

    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: overlay },
        store as never,
      ),
    ).resolves.toMatchObject({
      valid: false,
      errors: [{ pointer: '/candidate' }],
    });
    expect(store.state).toMatchObject({
      phase: 'terminal',
      output: {
        attempts: 1,
        terminalClassification: 'accounting-invalid',
      },
    });
  });

  it('terminalizes immutable artifact finding projection errors immediately', async () => {
    const root = join(
      tmpdir(),
      `oat-validate-overlay-findings-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    const overlay = terminalOverlay();
    overlay.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: draft.path,
    };
    await writeFile(
      draft.path,
      `# Review\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(overlay.reviewAccounting)}\n\`\`\`\n`,
    );
    const store = fakeStore({ ...validationState(), draft });

    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: overlay },
        store as never,
      ),
    ).resolves.toMatchObject({
      valid: false,
      errors: [{ pointer: '/candidate' }],
    });
    expect(store.state).toMatchObject({
      phase: 'terminal',
      output: {
        attempts: 1,
        terminalClassification: 'accounting-invalid',
      },
    });
  });

  it('keeps parseable artifact overlay mismatches accounting-repairable', async () => {
    const root = join(
      tmpdir(),
      `oat-validate-overlay-mismatch-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    const overlay = terminalOverlay();
    overlay.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: draft.path,
    };
    const embedded = structuredClone(overlay.reviewAccounting);
    embedded.budget.outputReservePreserved = true;
    await writeFile(
      draft.path,
      `Findings: 0 critical, 0 important, 0 medium, 0 minor\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(embedded)}\n\`\`\`\n`,
    );
    const store = fakeStore({ ...validationState(), draft });

    await expect(
      validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: overlay },
        store as never,
      ),
    ).resolves.toMatchObject({
      valid: false,
      errors: [{ pointer: '/reviewAccounting' }],
    });
    expect(store.state).toMatchObject({
      phase: 'accounting_repair',
      output: { attempts: 1 },
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
