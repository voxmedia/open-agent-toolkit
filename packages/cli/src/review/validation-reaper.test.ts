import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { evaluateWholeDiffEligibility } from './budget';
import {
  bindAcceptedHandle,
  issueCommandCapabilities,
} from './command-capabilities';
import {
  beginEvidence,
  checkpointArtifactsLoaded,
  validateAndReceiptPlan,
} from './review-lifecycle';
import type { ReviewPlanV1, ReviewPreparationV1 } from './types';
import {
  reapExpiredValidationState,
  computeValidationTtlMs,
} from './validation-reaper';
import { ValidationStore } from './validation-store';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function preparation(runId: string, expiresAt: string): ReviewPreparationV1 {
  return {
    schemaVersion: 1,
    runId,
    mode: 'enforce',
    project: 'project',
    scope: 'p02',
    invocation: 'manual',
    sink: 'structured',
    correlation: { gateRunId: null, launchAttemptId: 'attempt' },
    range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
    changeMap: {
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
      ],
      totals: {
        files: 1,
        additions: 1,
        deletions: 1,
        binaryFiles: 0,
        numstatChangedLines: 2,
        numstatTokenDenialEstimate: 0,
        patchBytes: 20,
        patchByteLowerBound: null,
        patchEstimateState: 'exact',
        patchCountingSkippedReason: null,
        estimatedPatchTokens: 5,
      },
    },
    obligations: [
      {
        id: 'O1',
        kind: 'requirement',
        source: 'test',
        summary: 'Inspect the changed file.',
        expectedPaths: ['a.ts'],
        expectedChecks: ['inspect'],
      },
    ],
    priorEvidence: [],
    timeBudget: null,
    prepareContextTelemetry: null,
    prepareTelemetryEvidenceDigest: 'evidence',
    preparationDigest: 'digest',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt,
  };
}

async function recordAccountingInvalidTerminal(
  store: ValidationStore,
  runId: string,
  expiresAt: string,
  retainDiagnostic: boolean,
): Promise<string> {
  const runPreparation = preparation(runId, expiresAt);
  runPreparation.invocation = 'gate';
  runPreparation.correlation = {
    gateRunId: `gate-${runId}`,
    launchAttemptId: `attempt-${runId}`,
  };
  const created = await store.createRun({
    preparation: runPreparation,
    artifactDraft: false,
  });
  await store.bindGateCorrelation(
    runPreparation.correlation.gateRunId!,
    runPreparation.correlation.launchAttemptId,
    runId,
  );
  const tokens = await issueCommandCapabilities(store, runId);
  await bindAcceptedHandle(store, runId, `handle-${runId}`);
  const context = await checkpointArtifactsLoaded(
    { runId, checkpointToken: tokens.checkpointToken },
    { store, telemetryAdapter: null, telemetryAdapterId: null },
  );
  const plan: ReviewPlanV1 = {
    schemaVersion: 1,
    runId,
    contextDigest: context.contextDigest,
    strategy: 'selective-inline',
    lanes: [
      {
        id: 'lane-1',
        paths: ['a.ts'],
        primaryObligationIds: ['O1'],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'semantic',
        strategy: 'path-diff',
        checks: ['inspect'],
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
      decisionRationale: 'Single inline test lane.',
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
        laneIds: ['lane-1'],
        rationale: 'Exercise the retained receipt lifecycle.',
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
  const validated = await validateAndReceiptPlan(
    { runId, commandToken: tokens.planToken, plan },
    { store },
  );
  if (!validated.valid) throw new Error('expected valid reaper test plan');
  await beginEvidence({ runId, receipt: validated.receipt.token }, { store });
  await store.updateRun(runId, (state) => {
    state.phase = 'terminal';
    state.output = {
      immutableSubstanceDigest: 'a'.repeat(64),
      attempts: 3,
      terminalClassification: 'accounting-invalid',
    };
    return state;
  });
  await store.recordAccountingInvalidTerminal(runId);
  const receipt = await store.resolveAccountingInvalidTerminal(
    runPreparation.correlation.gateRunId!,
    runPreparation.correlation.launchAttemptId,
  );
  expect(receipt.expiresAt).toBe(expiresAt);
  if (!retainDiagnostic) return created.runDirectory;
  return store.retainTerminalDiagnostic(receipt);
}

describe('validation TTL and reaping', () => {
  it('computes exact bounded budget-derived TTLs', () => {
    expect(computeValidationTtlMs(null)).toBe(7_200_000);
    expect(computeValidationTtlMs(1_000)).toBe(1_800_000);
    expect(computeValidationTtlMs(3_600_000)).toBe(7_200_000);
    expect(computeValidationTtlMs(10_000_000)).toBe(14_400_000);
  });

  it('preserves live state and reaps store-produced terminal and diagnostic receipts', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-reaper-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'private-store'));
    await recordAccountingInvalidTerminal(
      store,
      'expiredterminal1',
      '2099-01-01T00:00:00.000Z',
      false,
    );
    const diagnostic = await recordAccountingInvalidTerminal(
      store,
      'expireddiagnosti1',
      '2099-01-01T00:00:00.000Z',
      true,
    );
    const live = await store.createRun({
      preparation: preparation('liverunentry0001', '2101-01-01T00:00:00.000Z'),
      artifactDraft: false,
    });
    await expect(
      reapExpiredValidationState(store, {
        now: new Date('2100-01-01T00:00:00.000Z'),
      }),
    ).resolves.toEqual({ scanned: 4, deleted: 3 });
    await expect(access(live.runDirectory)).resolves.toBeUndefined();
    await expect(access(diagnostic)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['missing', 'replaced'] as const)(
    'atomically reaps an expired gate run when its draft is %s',
    async (draftState) => {
      const parent = await mkdtemp(join(tmpdir(), 'oat-reaper-'));
      roots.push(parent);
      const store = new ValidationStore(join(parent, 'private-store'));
      const runId = `expired${draftState}draft`;
      const runPreparation = preparation(runId, '2099-01-01T00:00:00.000Z');
      runPreparation.invocation = 'gate';
      runPreparation.correlation = {
        gateRunId: `gate-${draftState}-draft`,
        launchAttemptId: `attempt-${draftState}-draft`,
      };
      const created = await store.createRun({
        preparation: runPreparation,
        artifactDraft: true,
      });
      await store.bindGateCorrelation(
        runPreparation.correlation.gateRunId!,
        runPreparation.correlation.launchAttemptId,
        runId,
      );
      await rm(created.artifactDraftPath!);
      if (draftState === 'replaced') {
        await writeFile(created.artifactDraftPath!, 'replacement');
      }

      await expect(
        reapExpiredValidationState(store, {
          now: new Date('2099-01-01T00:00:00.000Z'),
        }),
      ).resolves.toEqual({ scanned: 1, deleted: 1 });
      await expect(access(created.runDirectory)).rejects.toMatchObject({
        code: 'ENOENT',
      });
      await expect(
        store.resolveGateCorrelation(
          runPreparation.correlation.gateRunId!,
          runPreparation.correlation.launchAttemptId,
        ),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    },
  );

  it('bounds entry scans', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-reaper-'));
    roots.push(parent);
    const store = new ValidationStore(join(parent, 'private-store'));
    for (const runId of [
      'expiredrunentry1',
      'expiredrunentry2',
      'expiredrunentry3',
    ]) {
      await store.createRun({
        preparation: preparation(runId, '2020-01-01T00:00:00.000Z'),
        artifactDraft: false,
      });
    }
    const result = await reapExpiredValidationState(store, {
      now: new Date('2027-01-01T00:00:00.000Z'),
      maxEntries: 1,
    });
    expect(result).toEqual({ scanned: 1, deleted: 1 });
  });
});
