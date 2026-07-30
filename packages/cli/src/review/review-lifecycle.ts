import { buildContextBudget } from './budget';
import { hashCanonicalJson } from './canonical-json';
import { consumeCommandCapability } from './command-capabilities';
import {
  type HostContextTelemetryAdapter,
  observeHostTelemetry,
} from './telemetry';
import type { PreparedReviewContextV1 } from './types';
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
  await consumeCommandCapability(
    dependencies.store,
    input.runId,
    'checkpoint',
    input.checkpointToken,
  );
  const run = await dependencies.store.readRun(input.runId);
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
    state.telemetry.push(evidence);
    state.context = structuredClone(context);
    state.phase = 'artifacts_loaded';
    return state;
  });
  return structuredClone(context);
}
