import { randomBytes } from 'node:crypto';

import { allocateReviewTimeBudget } from './budget';
import { hashCanonicalJson } from './canonical-json';
import { type GitChangeMapAdapter, collectChangeMap } from './change-map';
import {
  issueCommandCapabilities,
  renderReviewCommands,
} from './command-capabilities';
import {
  type CollectReviewObligationsInput,
  collectReviewObligations,
} from './obligations';
import {
  type PriorReviewEvidenceCandidate,
  adaptPriorReviewEvidence,
} from './prior-evidence';
import {
  type HostContextTelemetryAdapter,
  observeHostTelemetry,
} from './telemetry';
import type {
  PrepareReviewContextResultV1,
  ReviewInvocation,
  ReviewPreparationV1,
  ReviewSink,
} from './types';
import {
  computeValidationTtlMs,
  reapExpiredValidationState,
} from './validation-reaper';
import { ValidationStore } from './validation-store';

export interface PrepareReviewContextInput {
  repoRoot: string;
  project: string;
  scope: string;
  workflowMode: 'spec-driven' | 'quick' | 'import';
  range: { baseSha: string; headSha: string };
  sink: ReviewSink;
  invocation: ReviewInvocation;
  budget: { totalMs: number; source: string } | null;
  gateRunId?: string;
  launchAttemptId?: string;
  obligationSources: Omit<
    CollectReviewObligationsInput,
    'scope' | 'workflowMode'
  >;
  priorEvidenceCandidates?: readonly PriorReviewEvidenceCandidate[];
  target: string;
}

export interface PrepareReviewContextDependencies {
  store: ValidationStore;
  git: GitChangeMapAdapter;
  telemetryAdapter: HostContextTelemetryAdapter | null;
  telemetryAdapterId: string | null;
  cli: string;
  clock?: () => Date;
  reap?: (store: ValidationStore) => Promise<unknown>;
}

export async function prepareReviewContext(
  input: PrepareReviewContextInput,
  dependencies: PrepareReviewContextDependencies,
): Promise<PrepareReviewContextResultV1> {
  await (dependencies.reap ?? reapExpiredValidationState)(dependencies.store);
  if (
    !/^[0-9a-f]{40}$/.test(input.range.baseSha) ||
    !/^[0-9a-f]{40}$/.test(input.range.headSha) ||
    input.range.baseSha === input.range.headSha
  ) {
    throw new Error('review range must contain distinct full lowercase SHAs');
  }
  if (
    input.invocation === 'gate' &&
    (!input.gateRunId || !input.launchAttemptId)
  ) {
    throw new Error('gate invocation requires exact correlation IDs');
  }
  if (
    input.invocation !== 'gate' &&
    (input.gateRunId !== undefined || input.launchAttemptId !== undefined)
  ) {
    throw new Error('non-gate invocation cannot supply gate correlation');
  }

  const runId = randomBytes(16).toString('hex');
  const launchAttemptId =
    input.launchAttemptId ?? randomBytes(16).toString('hex');
  const clock = dependencies.clock ?? (() => new Date());
  const created = clock();
  const time = allocateReviewTimeBudget({
    totalMs: input.budget?.totalMs ?? null,
    source: input.budget?.source ?? null,
    startedAtMs: created.getTime(),
  }).time;
  const telemetryEvidence = await observeHostTelemetry(
    {
      runId,
      phase: 'pre_artifact',
      adapterId: dependencies.telemetryAdapterId,
      previousObservedAt: null,
    },
    dependencies.telemetryAdapter,
    clock,
  );
  const [changeMap, obligations] = await Promise.all([
    collectChangeMap(
      {
        repoRoot: input.repoRoot,
        baseSha: input.range.baseSha,
        headSha: input.range.headSha,
        remainingTokens:
          telemetryEvidence.disposition === 'accepted'
            ? telemetryEvidence.observation!.remainingTokens
            : null,
        outerBudgetMs: input.budget?.totalMs ?? null,
        now: () => clock().getTime(),
      },
      dependencies.git,
    ),
    collectReviewObligations({
      ...input.obligationSources,
      workflowMode: input.workflowMode,
      scope: input.scope,
    }),
  ]);
  const priorEvidence = adaptPriorReviewEvidence({
    project: input.project,
    target: input.target,
    gateId: input.gateRunId ?? null,
    candidates: input.priorEvidenceCandidates ?? [],
  });
  const expiresAt = new Date(
    created.getTime() + computeValidationTtlMs(input.budget?.totalMs ?? null),
  ).toISOString();
  const preparationWithoutDigest = {
    schemaVersion: 1 as const,
    runId,
    mode: 'enforce' as const,
    project: input.project,
    scope: input.scope,
    invocation: input.invocation,
    sink: input.sink,
    correlation: {
      gateRunId: input.gateRunId ?? null,
      launchAttemptId,
    },
    range: { ...input.range },
    changeMap,
    obligations,
    priorEvidence,
    timeBudget: time,
    prepareContextTelemetry:
      telemetryEvidence.disposition === 'accepted'
        ? telemetryEvidence.observation
        : null,
    prepareTelemetryEvidenceDigest: hashCanonicalJson(telemetryEvidence),
    createdAt: created.toISOString(),
    expiresAt,
  };
  const preparation: ReviewPreparationV1 = {
    ...preparationWithoutDigest,
    preparationDigest: hashCanonicalJson(preparationWithoutDigest, {
      excludeTopLevelKeys: ['createdAt', 'expiresAt'],
    }),
  };

  let createdRun = false;
  try {
    const stored = await dependencies.store.createRun({
      preparation,
      artifactDraft: input.sink === 'artifact',
    });
    createdRun = true;
    await dependencies.store.updateRun(runId, (state) => {
      state.telemetry.push(telemetryEvidence);
      return state;
    });
    if (input.invocation === 'gate') {
      await dependencies.store.bindGateCorrelation(
        input.gateRunId!,
        launchAttemptId,
        runId,
      );
    }
    const tokens = await issueCommandCapabilities(dependencies.store, runId);
    return {
      preparation,
      artifactDraftPath: stored.artifactDraftPath,
      commands: renderReviewCommands({
        cli: dependencies.cli,
        runId,
        checkpointToken: tokens.checkpointToken,
        planToken: tokens.planToken,
      }),
    };
  } catch (error) {
    if (createdRun) await dependencies.store.deleteRun(runId);
    throw error;
  }
}
