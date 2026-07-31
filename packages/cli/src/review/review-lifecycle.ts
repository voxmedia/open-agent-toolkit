import { randomBytes } from 'node:crypto';

import { buildContextBudget } from './budget';
import { hashCanonicalJson } from './canonical-json';
import {
  verifyAndConsumeCommandCapability,
  verifyCommandCapability,
} from './command-capabilities';
import {
  projectValidatedAssignments,
  type PlanValidationError,
  validateReviewPlan,
} from './plan-validator';
import {
  type HostContextTelemetryAdapter,
  observeHostTelemetry,
} from './telemetry';
import type {
  PlanValidationReceiptV1,
  PreparedReviewContextV1,
  ReviewPlanV1,
} from './types';
import { ValidationStore } from './validation-store';

export interface ReviewLifecycleDependencies {
  store: ValidationStore;
  telemetryAdapter: HostContextTelemetryAdapter | null;
  telemetryAdapterId: string | null;
  clock?: () => Date;
}

export async function checkpointArtifactsLoaded(
  input: { runId: string; checkpointToken: string },
  dependencies: ReviewLifecycleDependencies,
): Promise<PreparedReviewContextV1> {
  const run = await dependencies.store.readRun(input.runId);
  verifyCommandCapability(run.state, 'checkpoint', input.checkpointToken);
  if (
    run.state.phase !== 'prepared' ||
    run.state.context !== null ||
    run.state.plan !== null
  ) {
    throw new Error('artifact checkpoint is not valid in the current phase');
  }
  const previous = run.state.telemetry
    .filter((entry) => entry.disposition === 'accepted')
    .at(-1)?.observation?.observedAt;
  const evidence = await observeHostTelemetry(
    {
      runId: input.runId,
      phase: 'post_artifact',
      adapterId: dependencies.telemetryAdapterId,
      previousObservedAt: previous ?? null,
    },
    dependencies.telemetryAdapter,
    dependencies.clock,
  );
  const evidenceDigest = hashCanonicalJson(evidence);
  const { timeBudget, ...preparationFields } = run.state.preparation;
  const contextWithoutDigest = {
    ...preparationFields,
    budget: {
      time: timeBudget,
      context: buildContextBudget(evidence.observation),
    },
    postArtifactTelemetryEvidenceDigest: evidenceDigest,
    artifactCheckpointAt: (
      dependencies.clock ?? (() => new Date())
    )().toISOString(),
  };
  const context: PreparedReviewContextV1 = {
    ...contextWithoutDigest,
    contextDigest: hashCanonicalJson(contextWithoutDigest, {
      excludeTopLevelKeys: ['createdAt', 'expiresAt', 'artifactCheckpointAt'],
    }),
  };
  await dependencies.store.updateRun(input.runId, (state) => {
    if (state.phase !== 'prepared' || state.context !== null) {
      throw new Error('artifact checkpoint was already sealed');
    }
    verifyAndConsumeCommandCapability(
      state,
      'checkpoint',
      input.checkpointToken,
    );
    state.telemetry.push(evidence);
    state.context = structuredClone(context);
    state.phase = 'artifacts_loaded';
    return state;
  });
  return structuredClone(context);
}

export async function validateAndReceiptPlan(
  input: { runId: string; commandToken: string; plan: ReviewPlanV1 },
  dependencies: Pick<ReviewLifecycleDependencies, 'store' | 'clock'>,
): Promise<
  | { valid: true; receipt: PlanValidationReceiptV1 }
  | { valid: false; errors: PlanValidationError[] }
> {
  const run = await dependencies.store.readRun(input.runId);
  verifyCommandCapability(run.state, 'plan', input.commandToken);
  if (run.state.phase !== 'artifacts_loaded' || run.state.context === null) {
    throw new Error('plan validation requires a sealed artifact checkpoint');
  }
  if (run.state.planValidationAttempts >= 2) {
    throw new Error('plan validation attempt limit exceeded');
  }
  const errors = validateReviewPlan(run.state.context, input.plan);
  if (errors.length > 0) {
    await dependencies.store.updateRun(input.runId, (state) => {
      if (
        state.phase !== 'artifacts_loaded' ||
        state.planValidationAttempts >= 2
      ) {
        throw new Error('plan validation attempt race');
      }
      state.planValidationAttempts++;
      return state;
    });
    return { valid: false, errors };
  }

  const projection = projectValidatedAssignments(input.plan);
  const now = (dependencies.clock ?? (() => new Date()))().toISOString();
  const receipt: PlanValidationReceiptV1 = {
    token: randomBytes(32).toString('base64url'),
    validationRunId: input.runId,
    gateRunId: run.state.preparation.correlation.gateRunId,
    launchAttemptId: run.state.preparation.correlation.launchAttemptId,
    acceptedHandleDigest: run.state.acceptedHandleDigest!,
    contractVersion: 1,
    contextDigest: run.state.context.contextDigest,
    planDigest: hashCanonicalJson(input.plan),
    assignmentDigest: hashCanonicalJson(projection),
    validatedAt: now,
    expiresAt: run.state.preparation.expiresAt,
  };
  await dependencies.store.updateRun(input.runId, (state) => {
    if (
      state.phase !== 'artifacts_loaded' ||
      state.context === null ||
      state.planValidationAttempts >= 2
    ) {
      throw new Error('plan validation state changed before receipt issuance');
    }
    verifyAndConsumeCommandCapability(state, 'plan', input.commandToken);
    state.planValidationAttempts++;
    state.plan = structuredClone(input.plan);
    state.assignment = structuredClone(projection);
    state.receipt = structuredClone(receipt);
    state.phase = 'plan_validated';
    return state;
  });
  return { valid: true, receipt: structuredClone(receipt) };
}

export async function beginEvidence(
  input: { runId: string; receipt: string },
  dependencies: Pick<ReviewLifecycleDependencies, 'store' | 'clock'>,
): Promise<{ validationRunId: string; phase: 'evidence_started' }> {
  const now = (dependencies.clock ?? (() => new Date()))();
  await dependencies.store.updateRun(input.runId, (state) => {
    if (
      state.phase !== 'plan_validated' ||
      state.context === null ||
      state.plan === null ||
      state.assignment === null ||
      state.receipt === null
    ) {
      throw new Error('evidence start requires a validated plan');
    }
    if (
      state.receipt.token !== input.receipt ||
      state.receipt.validationRunId !== input.runId ||
      state.receipt.contextDigest !== state.context.contextDigest ||
      state.receipt.planDigest !== hashCanonicalJson(state.plan) ||
      state.receipt.assignmentDigest !== hashCanonicalJson(state.assignment) ||
      state.receipt.acceptedHandleDigest !== state.acceptedHandleDigest ||
      state.receipt.gateRunId !== state.preparation.correlation.gateRunId ||
      state.receipt.launchAttemptId !==
        state.preparation.correlation.launchAttemptId
    ) {
      throw new Error('plan receipt identity mismatch');
    }
    if (Date.parse(state.receipt.expiresAt) <= now.getTime()) {
      throw new Error('plan receipt has expired');
    }
    state.phase = 'evidence_started';
    return state;
  });
  return { validationRunId: input.runId, phase: 'evidence_started' };
}
