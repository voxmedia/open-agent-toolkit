import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import * as commandCapabilityApi from './command-capabilities';
import {
  bindAcceptedHandle,
  issueCommandCapabilities,
} from './command-capabilities';
import * as reviewPublicApi from './index';
import * as reviewLifecycleApi from './review-lifecycle';
import {
  beginEvidence,
  checkpointArtifactsLoaded,
  validateAndReceiptPlan,
} from './review-lifecycle';
import type {
  PreparedReviewContextV1,
  ReviewPlanV1,
  ReviewPreparationV1,
} from './types';
import { ValidationStore } from './validation-store';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function preparation(
  runId: string,
  launchAttemptId: string,
): ReviewPreparationV1 {
  return {
    schemaVersion: 1,
    runId,
    mode: 'enforce',
    project: '.oat/projects/shared/boundary',
    scope: 'p03-t03',
    invocation: 'manual',
    sink: 'structured',
    correlation: { gateRunId: null, launchAttemptId },
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
    timeBudget: {
      totalMs: 120_000,
      source: 'integration',
      deadlineMs: 120_000,
    },
    prepareContextTelemetry: null,
    prepareTelemetryEvidenceDigest: 'pre-evidence',
    preparationDigest: `preparation-${runId}`,
    createdAt: '2026-07-31T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
}

function plan(context: PreparedReviewContextV1): ReviewPlanV1 {
  const time = context.budget.time;
  return {
    schemaVersion: 1,
    runId: context.runId,
    contextDigest: context.contextDigest,
    strategy: 'selective-inline',
    lanes: [
      {
        id: 'primary',
        paths: [],
        primaryObligationIds: [],
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
        replay: 'sample',
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
      independentLaneIds: [],
      nonReplayedLaneIds: [],
      expectedSavings: [],
      coordinationCosts: [],
      decisionRationale: 'single inline lane',
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
        rationale: 'small coherent scope',
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
    timeAllocation:
      time === null
        ? null
        : allocateReviewTimeBudget({
            totalMs: time.totalMs,
            source: time.source,
            startedAtMs: time.deadlineMs - time.totalMs,
          }).allocation,
  };
}

describe('accepted reviewer boundary integration', () => {
  it('binds one continuation before mutation and atomically consumes its receipt', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-reviewer-boundary-'));
    roots.push(root);
    const store = new ValidationStore(join(root, 'store'));
    const firstRun = 'boundaryrun00001';
    const siblingRun = 'boundaryrun00002';
    await store.createRun({
      preparation: preparation(firstRun, 'launch-first'),
      artifactDraft: false,
    });
    await store.createRun({
      preparation: preparation(siblingRun, 'launch-sibling'),
      artifactDraft: false,
    });
    const firstTokens = await issueCommandCapabilities(store, firstRun);
    const siblingTokens = await issueCommandCapabilities(store, siblingRun);
    const dependencies = {
      store,
      telemetryAdapter: null,
      telemetryAdapterId: null,
      clock: () => new Date('2026-07-31T00:00:01.000Z'),
    };

    await expect(
      checkpointArtifactsLoaded(
        {
          runId: firstRun,
          checkpointToken: firstTokens.checkpointToken,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'command-capability-rejected' });
    expect((await store.readRun(firstRun)).state.phase).toBe('prepared');

    await bindAcceptedHandle(store, firstRun, 'accepted-first');
    await bindAcceptedHandle(store, siblingRun, 'accepted-sibling');
    await expect(
      checkpointArtifactsLoaded(
        {
          runId: siblingRun,
          checkpointToken: firstTokens.checkpointToken,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'command-capability-rejected' });
    expect((await store.readRun(siblingRun)).state.phase).toBe('prepared');

    const context = await checkpointArtifactsLoaded(
      {
        runId: firstRun,
        checkpointToken: firstTokens.checkpointToken,
      },
      dependencies,
    );
    const accepted = await validateAndReceiptPlan(
      {
        runId: firstRun,
        commandToken: firstTokens.planToken,
        plan: plan(context),
      },
      dependencies,
    );
    expect(accepted.valid).toBe(true);
    if (!accepted.valid) throw new Error('expected a plan receipt');

    const transitions = await Promise.allSettled([
      beginEvidence(
        { runId: firstRun, receipt: accepted.receipt.token },
        dependencies,
      ),
      beginEvidence(
        { runId: firstRun, receipt: accepted.receipt.token },
        dependencies,
      ),
    ]);
    expect(
      transitions.filter((transition) => transition.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      transitions.filter((transition) => transition.status === 'rejected'),
    ).toHaveLength(1);
    expect((await store.readRun(firstRun)).state).toMatchObject({
      phase: 'evidence_started',
      receipt: {
        token: accepted.receipt.token,
        acceptedHandleDigest: accepted.receipt.acceptedHandleDigest,
      },
    });

    await expect(
      beginEvidence(
        { runId: firstRun, receipt: accepted.receipt.token },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'evidence-start-phase-invalid' });
    expect((await store.readRun(siblingRun)).state).toMatchObject({
      phase: 'prepared',
      capabilities: { checkpointUsed: false, planUsed: false },
    });
    expect(siblingTokens.checkpointToken).not.toBe(firstTokens.checkpointToken);
  });

  it('exposes no replacement or reviewer relaunch API', () => {
    const exportedNames = [
      ...Object.keys(commandCapabilityApi),
      ...Object.keys(reviewLifecycleApi),
      ...Object.keys(reviewPublicApi),
    ];

    expect(
      exportedNames.filter((name) =>
        /replacement|replace.*reviewer|relaunch|launch.*reviewer/i.test(name),
      ),
    ).toEqual([]);
  });
});
