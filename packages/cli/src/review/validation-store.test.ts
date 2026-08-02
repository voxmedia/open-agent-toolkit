import {
  access,
  lstat,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import {
  bindAcceptedHandle,
  issueCommandCapabilities,
} from './command-capabilities';
import {
  beginEvidence,
  checkpointArtifactsLoaded,
  validateAndReceiptPlan,
} from './review-lifecycle';
import type {
  PreparedReviewContextV1,
  ReviewPlanV1,
  ReviewPreparationV1,
  WorkerDossierV1,
} from './types';
import { ValidationStore } from './validation-store';
import { ValidationStoreAuthority } from './validation-store-authority';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function preparation(runId = 'abcdefghijklmnop'): ReviewPreparationV1 {
  return {
    schemaVersion: 1,
    runId,
    mode: 'enforce',
    project: 'project',
    scope: 'p02',
    invocation: 'manual',
    sink: 'artifact',
    correlation: { gateRunId: null, launchAttemptId: 'attempt' },
    range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
    changeMap: {
      files: [],
      totals: {
        files: 0,
        additions: 0,
        deletions: 0,
        binaryFiles: 0,
        numstatChangedLines: 0,
        numstatTokenDenialEstimate: 0,
        patchBytes: 0,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: 0,
      },
    },
    obligations: [],
    priorEvidence: [],
    timeBudget: null,
    prepareContextTelemetry: null,
    prepareTelemetryEvidenceDigest: 'evidence',
    preparationDigest: 'preparation',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
}

function delegatedGatePreparation(): ReviewPreparationV1 {
  const value = preparation('launchintegrity1');
  value.invocation = 'gate';
  value.correlation = {
    gateRunId: 'gate-run',
    launchAttemptId: 'current-attempt',
  };
  value.changeMap = {
    files: [
      {
        path: 'a.ts',
        status: 'modified',
        isBinary: false,
        additions: 1,
        deletions: 1,
        generatedHint: false,
        bookkeepingHint: false,
      },
      {
        path: 'b.ts',
        status: 'modified',
        isBinary: false,
        additions: 1,
        deletions: 1,
        generatedHint: false,
        bookkeepingHint: false,
      },
    ],
    totals: {
      files: 2,
      additions: 2,
      deletions: 2,
      binaryFiles: 0,
      numstatChangedLines: 4,
      numstatTokenDenialEstimate: 1,
      patchBytes: 40,
      patchByteLowerBound: null,
      patchEstimateState: 'exact',
      patchCountingSkippedReason: null,
      estimatedPatchTokens: 10,
    },
  };
  value.obligations = [
    {
      id: 'FR1',
      kind: 'requirement',
      source: 'test',
      summary: 'Inspect the delegated review path.',
      expectedPaths: ['a.ts'],
      expectedChecks: ['inspect'],
    },
    {
      id: 'FR2',
      kind: 'requirement',
      source: 'test',
      summary: 'Run deterministic verification.',
      expectedPaths: ['b.ts'],
      expectedChecks: ['verify'],
    },
  ];
  value.timeBudget = allocateReviewTimeBudget({
    totalMs: 120_000,
    source: 'test',
    startedAtMs: Date.now(),
  }).time;
  return value;
}

function delegatedPlan(context: PreparedReviewContextV1): ReviewPlanV1 {
  const time = context.budget.time!;
  const timeAllocation = allocateReviewTimeBudget({
    totalMs: time.totalMs,
    source: time.source,
    startedAtMs: time.deadlineMs - time.totalMs,
  }).allocation;
  return {
    schemaVersion: 1,
    runId: context.runId,
    contextDigest: context.contextDigest,
    strategy: 'delegated',
    lanes: [
      {
        id: 'review-lane',
        paths: ['a.ts'],
        primaryObligationIds: ['FR1'],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'semantic',
        strategy: 'path-diff',
        checks: ['inspect'],
        delegated: true,
        independenceRationale: 'Independent bounded review lane.',
        substantial: true,
        substantialityRationale: 'Owns the review path.',
        deadlineMs: timeAllocation.planningDeadlineMs + 1,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: 'sample',
        primaryContingency: {
          allowed: true,
          paths: ['a.ts'],
          obligationIds: ['FR1'],
        },
      },
      {
        id: 'verification-lane',
        paths: ['b.ts'],
        primaryObligationIds: ['FR2'],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'deterministic',
        strategy: 'inventory',
        checks: ['verify'],
        delegated: true,
        independenceRationale: 'Independent deterministic verification.',
        substantial: true,
        substantialityRationale: 'Owns the verification boundary.',
        deadlineMs: timeAllocation.planningDeadlineMs + 1,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: 'accept-provenance',
        primaryContingency: {
          allowed: false,
          paths: [],
          obligationIds: [],
        },
      },
    ],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: ['review-lane', 'verification-lane'],
      nonReplayedLaneIds: ['verification-lane'],
      expectedSavings: ['Bounded concurrent inspection.'],
      coordinationCosts: ['One dossier reconciliation.'],
      decisionRationale: 'Delegation is bounded.',
      decision: 'delegate',
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
        laneIds: ['review-lane', 'verification-lane'],
        rationale: 'Sample both delegated lanes.',
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
    timeAllocation,
  };
}

describe('ValidationStore.createRun', () => {
  it('creates private state and draft with stored inode identity', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const result = await store.createRun({
      preparation: preparation(),
      artifactDraft: true,
    });
    expect((await stat(store.root)).mode & 0o777).toBe(0o700);
    expect((await stat(result.runDirectory)).mode & 0o777).toBe(0o700);
    expect((await stat(result.statePath)).mode & 0o777).toBe(0o600);
    expect((await stat(result.artifactDraftPath!)).mode & 0o777).toBe(0o600);
    const draft = await stat(result.artifactDraftPath!);
    expect({ device: result.draftDevice, inode: result.draftInode }).toEqual({
      device: draft.dev,
      inode: draft.ino,
    });
    expect(await store.unsafeReadStateForTesting(result.runId)).toMatchObject({
      phase: 'prepared',
      draft: { device: draft.dev, inode: draft.ino },
      workerCoverage: [],
      output: { immutableSubstanceDigest: null, attempts: 0 },
      acceptedSnapshot: null,
    });
  });

  it('rejects unsafe pre-existing run paths', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const root = join(parent, 'store');
    await mkdir(root);
    await mkdir(join(root, 'run-abcdefghijklmnop'));
    const store = new ValidationStore(root);
    await expect(
      store.createRun({
        preparation: preparation(),
        artifactDraft: false,
      }),
    ).rejects.toMatchObject({ code: 'EEXIST' });
  });

  it('rejects a symlinked store root', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const target = join(parent, 'target');
    const root = join(parent, 'store');
    await mkdir(target);
    await symlink(target, root, 'dir');
    const store = new ValidationStore(root);
    await expect(
      store.createRun({
        preparation: preparation('qrstuvwxyzabcdef'),
        artifactDraft: false,
      }),
    ).rejects.toThrow(/real directory/);
    expect((await lstat(root)).isSymbolicLink()).toBe(true);
  });
});

describe('validation state and gate correlation', () => {
  it('stores only the digest of an accepted handle', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    await bindAcceptedHandle(store, 'abcdefghijklmnop', 'raw-secret-handle');
    const serialized = JSON.stringify(
      await store.unsafeReadStateForTesting('abcdefghijklmnop'),
    );
    expect(serialized).not.toContain('raw-secret-handle');
    expect(serialized).toMatch(/acceptedHandleDigest/);
  });

  it('reads and atomically updates valid state', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    const updated = await store.updateRun('abcdefghijklmnop', (state) => ({
      ...state,
      planValidationAttempts: 1,
    }));
    expect(updated.state.planValidationAttempts).toBe(1);
  });

  it('validates the complete next state before atomic rename', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    const before = await store.unsafeReadStateForTesting('abcdefghijklmnop');

    await expect(
      store.updateRun('abcdefghijklmnop', (state) => {
        (state as unknown as Record<string, unknown>)['unknown'] = true;
        return state;
      }),
    ).rejects.toThrow(/invalid schema/);

    expect(await store.unsafeReadStateForTesting('abcdefghijklmnop')).toEqual(
      before,
    );
    await expect(store.readRun('abcdefghijklmnop')).resolves.toMatchObject({
      state: { phase: 'prepared', planValidationAttempts: 0 },
    });
  });

  it('recovers a lock whose owning process has died', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    await store.createRun({
      preparation: preparation(),
      artifactDraft: false,
    });
    await writeFile(
      join(store.root, '.store.lock'),
      JSON.stringify({
        schemaVersion: 1,
        pid: 2_147_483_647,
        nonce: 'dead-owner',
        acquiredAtMs: Date.now(),
        leaseMs: 30_000,
      }),
      { mode: 0o600 },
    );

    await expect(
      store.updateRun('abcdefghijklmnop', (state) => state),
    ).resolves.toMatchObject({ runId: 'abcdefghijklmnop' });
    await expect(access(join(store.root, '.store.lock'))).rejects.toMatchObject(
      {
        code: 'ENOENT',
      },
    );
  });

  it('rejects schema corruption, expiry, and changed draft identity', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const created = await store.createRun({
      preparation: preparation(),
      artifactDraft: true,
    });
    const envelope = JSON.parse(await readFile(created.statePath, 'utf8')) as {
      state: { schemaVersion: number };
    };
    envelope.state.schemaVersion = 2;
    await writeFile(created.statePath, JSON.stringify(envelope));
    await expect(store.readRun(created.runId)).rejects.toThrow(
      /authentication/,
    );

    const expired = preparation('expiredvalidation');
    expired.expiresAt = '2020-01-01T00:00:00.000Z';
    await store.createRun({ preparation: expired, artifactDraft: false });
    await expect(store.readRun(expired.runId)).rejects.toThrow(/expired/);

    const replacement = preparation('replacementdraft');
    const replaced = await store.createRun({
      preparation: replacement,
      artifactDraft: true,
    });
    await rm(replaced.artifactDraftPath!);
    await writeFile(replaced.artifactDraftPath!, '');
    await expect(store.readRun(replacement.runId)).rejects.toThrow(/identity/);
  });

  it('rejects linked drafts', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const created = await store.createRun({
      preparation: preparation('hardlinkvalidation'),
      artifactDraft: true,
    });
    await link(created.artifactDraftPath!, join(parent, 'second-link'));
    await expect(store.readRun(created.runId)).rejects.toThrow(/identity/);
  });

  it('binds, resolves, and deletes exact gate-attempt pairs', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const gatePreparation = preparation('gatevalidationrun');
    gatePreparation.invocation = 'gate';
    gatePreparation.correlation = {
      gateRunId: 'gate-1',
      launchAttemptId: 'attempt-1',
    };
    await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    await store.bindGateCorrelation(
      'gate-1',
      'attempt-1',
      gatePreparation.runId,
    );
    await expect(
      store.resolveGateCorrelation('gate-1', 'attempt-1'),
    ).resolves.toBe(gatePreparation.runId);
    await expect(
      store.resolveGateCorrelation('gate-1', 'attempt-2'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await store.deleteRun(gatePreparation.runId);
    await expect(
      store.resolveGateCorrelation('gate-1', 'attempt-1'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('retains a minimal accounting-invalid diagnostic and deletes parent state', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const gatePreparation = delegatedGatePreparation();
    const created = await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    await store.bindGateCorrelation(
      'gate-run',
      'current-attempt',
      created.runId,
    );
    const tokens = await issueCommandCapabilities(store, created.runId);
    await bindAcceptedHandle(store, created.runId, 'accepted-handle');
    const context = await checkpointArtifactsLoaded(
      { runId: created.runId, checkpointToken: tokens.checkpointToken },
      { store, telemetryAdapter: null, telemetryAdapterId: null },
    );
    const validated = await validateAndReceiptPlan(
      {
        runId: created.runId,
        commandToken: tokens.planToken,
        plan: delegatedPlan(context),
      },
      { store },
    );
    if (!validated.valid) throw new Error('expected valid plan');
    await beginEvidence(
      { runId: created.runId, receipt: validated.receipt.token },
      { store },
    );
    await store.updateRun(created.runId, (state) => {
      state.phase = 'terminal';
      state.output = {
        immutableSubstanceDigest: 'a'.repeat(64),
        attempts: 3,
        terminalClassification: 'accounting-invalid',
      };
      return state;
    });

    await store.recordAccountingInvalidTerminal(created.runId);
    const receipt = await store.resolveAccountingInvalidTerminal(
      'gate-run',
      'current-attempt',
    );
    expect(receipt).toEqual({
      schemaVersion: 1,
      gateRunId: 'gate-run',
      launchAttemptId: 'current-attempt',
      validationRunId: created.runId,
      validationAttempts: 3,
      repairAttempts: 2,
    });

    const diagnosticPath = await store.retainTerminalDiagnostic(receipt);
    expect(JSON.parse(await readFile(diagnosticPath, 'utf8'))).toEqual({
      ...receipt,
      kind: 'review_complete_accounting_invalid',
    });
    await expect(store.readRun(created.runId)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      store.resolveGateCorrelation('gate-run', 'current-attempt'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('deletes only a pre-start rejected pair and permits a fresh attempt', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const rejected = preparation('rejectedattempt1');
    rejected.invocation = 'gate';
    rejected.correlation = {
      gateRunId: 'gate-retry',
      launchAttemptId: 'attempt-1',
    };
    await store.createRun({ preparation: rejected, artifactDraft: false });
    await store.bindGateCorrelation('gate-retry', 'attempt-1', rejected.runId);
    const unrelated = preparation('unrelatedattempt');
    unrelated.invocation = 'gate';
    unrelated.correlation = {
      gateRunId: 'other-gate',
      launchAttemptId: 'other-attempt',
    };
    await store.createRun({ preparation: unrelated, artifactDraft: false });
    await store.bindGateCorrelation(
      'other-gate',
      'other-attempt',
      unrelated.runId,
    );

    await store.deletePreStartRejectedGateRun('gate-retry', 'attempt-1');
    await expect(
      store.resolveGateCorrelation('gate-retry', 'attempt-1'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      store.resolveGateCorrelation('other-gate', 'other-attempt'),
    ).resolves.toBe(unrelated.runId);

    const replacement = preparation('replacementtry01');
    replacement.invocation = 'gate';
    replacement.correlation = {
      gateRunId: 'gate-retry',
      launchAttemptId: 'attempt-2',
    };
    await store.createRun({ preparation: replacement, artifactDraft: false });
    await store.bindGateCorrelation(
      'gate-retry',
      'attempt-2',
      replacement.runId,
    );
    await expect(
      store.resolveGateCorrelation('gate-retry', 'attempt-2'),
    ).resolves.toBe(replacement.runId);
  });

  it('forbids deleting an accepted gate attempt as a replacement', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const accepted = preparation('acceptedattempt1');
    accepted.invocation = 'gate';
    accepted.correlation = {
      gateRunId: 'accepted-gate',
      launchAttemptId: 'accepted-attempt',
    };
    await store.createRun({ preparation: accepted, artifactDraft: false });
    await store.bindGateCorrelation(
      'accepted-gate',
      'accepted-attempt',
      accepted.runId,
    );
    await store.updateRun(accepted.runId, (state) => {
      state.acceptedHandleDigest = 'accepted';
      return state;
    });

    await expect(
      store.deletePreStartRejectedGateRun('accepted-gate', 'accepted-attempt'),
    ).rejects.toThrow(/cannot be replaced/);
    await expect(
      store.resolveGateCorrelation('accepted-gate', 'accepted-attempt'),
    ).resolves.toBe(accepted.runId);
  });

  it('encodes colliding tuples injectively', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'store'));
    const gatePreparation = preparation('collisionrun0001');
    gatePreparation.invocation = 'gate';
    gatePreparation.correlation = {
      gateRunId: 'a-b',
      launchAttemptId: 'c',
    };
    await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    await store.bindGateCorrelation('a-b', 'c', gatePreparation.runId);

    await expect(store.resolveGateCorrelation('a-b', 'c')).resolves.toBe(
      gatePreparation.runId,
    );
    await expect(
      store.resolveGateCorrelation('a', 'b-c'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects tampered index records and loaded-run tuple mismatches', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const authority = new ValidationStoreAuthority(Buffer.alloc(32, 9));
    const store = new ValidationStore(join(parent, 'store'), authority);
    const gatePreparation = preparation('tamperedrun00001');
    gatePreparation.invocation = 'gate';
    gatePreparation.correlation = {
      gateRunId: 'gate',
      launchAttemptId: 'attempt',
    };
    const created = await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    await store.bindGateCorrelation('gate', 'attempt', gatePreparation.runId);
    const correlationName = (await readdir(store.root)).find((name) =>
      name.startsWith('correlation-'),
    )!;
    const correlationPath = join(store.root, correlationName);
    const record = JSON.parse(await readFile(correlationPath, 'utf8')) as {
      gateRunId: string;
    };
    record.gateRunId = 'other';
    await writeFile(correlationPath, JSON.stringify(record), { mode: 0o600 });
    await expect(
      store.resolveGateCorrelation('gate', 'attempt'),
    ).rejects.toThrow(/schema/);

    await rm(correlationPath);
    await store.bindGateCorrelation('gate', 'attempt', gatePreparation.runId);
    const state = authority.open(await readFile(created.statePath, 'utf8')) as {
      preparation: ReviewPreparationV1;
    };
    state.preparation.correlation.launchAttemptId = 'other';
    await writeFile(created.statePath, authority.seal(state), { mode: 0o600 });
    await expect(
      store.resolveGateCorrelation('gate', 'attempt'),
    ).rejects.toThrow(/does not match/);
  });

  it('rejects a stored receipt launch-attempt mismatch without mutation', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const authority = new ValidationStoreAuthority(Buffer.alloc(32, 13));
    const store = new ValidationStore(join(parent, 'store'), authority);
    const gatePreparation = delegatedGatePreparation();
    const created = await store.createRun({
      preparation: gatePreparation,
      artifactDraft: false,
    });
    const tokens = await issueCommandCapabilities(store, created.runId);
    await bindAcceptedHandle(store, created.runId, 'accepted-handle');
    const context = await checkpointArtifactsLoaded(
      { runId: created.runId, checkpointToken: tokens.checkpointToken },
      { store, telemetryAdapter: null, telemetryAdapterId: null },
    );
    const validated = await validateAndReceiptPlan(
      {
        runId: created.runId,
        commandToken: tokens.planToken,
        plan: delegatedPlan(context),
      },
      { store },
    );
    if (!validated.valid) {
      throw new Error(
        `expected valid plan: ${JSON.stringify(validated.errors)}`,
      );
    }
    await beginEvidence(
      { runId: created.runId, receipt: validated.receipt.token },
      { store },
    );

    const before = (await store.readRun(created.runId)).state;
    const expectedTampered = structuredClone(before);
    expectedTampered.receipt!.launchAttemptId = 'sibling-attempt';
    await store.updateRun(created.runId, (state) => {
      state.receipt!.launchAttemptId = 'sibling-attempt';
      return state;
    });
    expect((await store.readRun(created.runId)).state).toEqual(
      expectedTampered,
    );

    const dossier: WorkerDossierV1 = {
      schemaVersion: 1,
      runId: created.runId,
      planDigest: validated.receipt.planDigest,
      laneId: 'review-lane',
      outcome: 'complete',
      inspectedPaths: ['a.ts'],
      inspectedObligationIds: ['FR1'],
      commands: [],
      evidence: [],
      candidateFindings: [],
      uncoveredObligationIds: [],
      uncertainty: [],
    };
    await expect(
      store.bindValidatedWorkerDossier(created.runId, {
        receipt: validated.receipt.token,
        dossier,
      }),
    ).rejects.toMatchObject({ code: 'worker-dossier-receipt-mismatch' });

    const after = (await store.readRun(created.runId)).state;
    expect(after).toEqual(expectedTampered);
    expect(after).toMatchObject({
      phase: 'evidence_started',
      workerCoverage: [],
      output: { immutableSubstanceDigest: null, attempts: 0 },
    });
  });

  it('rejects authenticated malformed telemetry and incoherent phases', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-validation-'));
    roots.push(parent);
    const authority = new ValidationStoreAuthority(Buffer.alloc(32, 11));
    const store = new ValidationStore(join(parent, 'store'), authority);
    const created = await store.createRun({
      preparation: preparation('stricttelemetry1'),
      artifactDraft: false,
    });
    const initial = authority.open(
      await readFile(created.statePath, 'utf8'),
    ) as Record<string, unknown>;
    await writeFile(
      created.statePath,
      authority.seal({
        ...initial,
        telemetry: [
          {
            schemaVersion: 1,
            validationRunId: created.runId,
            phase: 'pre_artifact',
            adapterId: 7,
            requestStartedAt: '2026-07-30T20:00:00.000Z',
            requestCompletedAt: '2026-07-30T20:00:01.000Z',
            observation: null,
            disposition: 'missing',
            rejectionReason: null,
          },
        ],
      }),
      { mode: 0o600 },
    );
    await expect(store.readRun(created.runId)).rejects.toThrow(/adapterId/);

    await writeFile(
      created.statePath,
      authority.seal({
        ...initial,
        telemetry: [
          {
            schemaVersion: 1,
            validationRunId: created.runId,
            phase: 'post_artifact',
            adapterId: null,
            requestStartedAt: '2026-07-30T20:00:00.000Z',
            requestCompletedAt: '2026-07-30T20:00:01.000Z',
            observation: null,
            disposition: 'missing',
            rejectionReason: null,
          },
        ],
      }),
      { mode: 0o600 },
    );
    await expect(store.readRun(created.runId)).rejects.toThrow(/incoherent/);

    await writeFile(
      created.statePath,
      authority.seal({
        ...initial,
        phase: 'evidence_started',
        telemetry: [],
        context: null,
        plan: null,
        assignment: null,
        receipt: null,
      }),
      { mode: 0o600 },
    );
    await expect(store.readRun(created.runId)).rejects.toThrow(
      /post-checkpoint/,
    );
  });
});
