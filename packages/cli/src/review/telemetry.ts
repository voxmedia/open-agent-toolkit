import type { ContextBudgetTelemetry, HostTelemetryEvidenceV1 } from './types';

export interface HostContextTelemetryAdapter {
  observe(
    runId: string,
    phase: 'pre_artifact' | 'post_artifact',
  ): Promise<ContextBudgetTelemetry | null>;
}

export interface ObserveHostTelemetryInput {
  runId: string;
  phase: 'pre_artifact' | 'post_artifact';
  adapterId: string | null;
  previousObservedAt: string | null;
}

type Clock = () => Date;

function invalidEvidence(
  input: ObserveHostTelemetryInput,
  requestStartedAt: string,
  requestCompletedAt: string,
  rejectionReason: string,
): HostTelemetryEvidenceV1 {
  return {
    schemaVersion: 1,
    validationRunId: input.runId,
    phase: input.phase,
    adapterId: input.adapterId,
    requestStartedAt,
    requestCompletedAt,
    observation: null,
    disposition: 'invalid',
    rejectionReason,
  };
}

export async function observeHostTelemetry(
  input: ObserveHostTelemetryInput,
  adapter: HostContextTelemetryAdapter | null,
  clock: Clock = () => new Date(),
): Promise<HostTelemetryEvidenceV1> {
  const requestStartedAt = clock().toISOString();
  if (adapter === null || input.adapterId === null) {
    return {
      schemaVersion: 1,
      validationRunId: input.runId,
      phase: input.phase,
      adapterId: input.adapterId,
      requestStartedAt,
      requestCompletedAt: clock().toISOString(),
      observation: null,
      disposition: 'missing',
      rejectionReason: null,
    };
  }

  let observation: ContextBudgetTelemetry | null;
  try {
    observation = await adapter.observe(input.runId, input.phase);
  } catch {
    return invalidEvidence(
      input,
      requestStartedAt,
      clock().toISOString(),
      'adapter-error',
    );
  }
  const requestCompletedAt = clock().toISOString();
  if (observation === null) {
    return {
      schemaVersion: 1,
      validationRunId: input.runId,
      phase: input.phase,
      adapterId: input.adapterId,
      requestStartedAt,
      requestCompletedAt,
      observation: null,
      disposition: 'missing',
      rejectionReason: null,
    };
  }

  const observedAt = Date.parse(observation.observedAt);
  const startedAt = Date.parse(requestStartedAt);
  const completedAt = Date.parse(requestCompletedAt);
  const previousAt =
    input.previousObservedAt === null
      ? null
      : Date.parse(input.previousObservedAt);

  let rejectionReason: string | null = null;
  if (!Number.isFinite(observedAt) || observedAt < startedAt) {
    rejectionReason = 'stale-observation';
  } else if (observedAt > completedAt) {
    rejectionReason = 'future-observation';
  } else if (previousAt !== null && observedAt <= previousAt) {
    rejectionReason = 'non-monotonic-observation';
  } else if (observation.adapterId !== input.adapterId) {
    rejectionReason = 'wrong-adapter';
  } else if (
    !Number.isSafeInteger(observation.contextWindowTokens) ||
    observation.contextWindowTokens <= 0 ||
    !Number.isSafeInteger(observation.consumedTokens) ||
    observation.consumedTokens < 0 ||
    observation.consumedTokens > observation.contextWindowTokens ||
    !Number.isSafeInteger(observation.remainingTokens) ||
    observation.remainingTokens !==
      observation.contextWindowTokens - observation.consumedTokens
  ) {
    rejectionReason = 'inconsistent-token-arithmetic';
  } else if (observation.source.length === 0) {
    rejectionReason = 'missing-source';
  }

  if (rejectionReason !== null) {
    return invalidEvidence(
      input,
      requestStartedAt,
      requestCompletedAt,
      rejectionReason,
    );
  }

  return {
    schemaVersion: 1,
    validationRunId: input.runId,
    phase: input.phase,
    adapterId: input.adapterId,
    requestStartedAt,
    requestCompletedAt,
    observation,
    disposition: 'accepted',
    rejectionReason: null,
  };
}
