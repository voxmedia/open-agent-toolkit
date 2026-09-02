import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from '@review/budget';
import {
  checkpointArtifactsLoaded,
  type ReviewLifecycleDependencies,
} from '@review/review-lifecycle';
import type {
  PreparedReviewContextV1,
  ReviewPlanningProjectionV1,
} from '@review/types';
import { requestValidationAuthorityBroker } from '@review/validation-authority-broker';
import { Command } from 'commander';

import { runReviewJsonCommand } from './review-json';

interface CheckpointArtifactsCommandDependencies {
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  checkpoint: (
    input: { runId: string; checkpointToken: string },
    dependencies: ReviewLifecycleDependencies,
  ) => Promise<PreparedReviewContextV1>;
  lifecycle?: ReviewLifecycleDependencies;
  createLifecycle: () => ReviewLifecycleDependencies;
}

const DEFAULT_DEPENDENCIES: CheckpointArtifactsCommandDependencies = {
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  checkpoint: checkpointArtifactsLoaded,
  createLifecycle: () => {
    throw new Error('validation authority broker is required');
  },
};

export function createReviewCheckpointArtifactsCommand(
  overrides: Partial<CheckpointArtifactsCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('checkpoint-artifacts')
    .description('Seal loaded review artifacts')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption(
      '--checkpoint-token <token>',
      'Artifact checkpoint capability',
    )
    .option('--json', 'Emit one JSON envelope')
    .option('--broker-socket <path>', 'Launcher-owned authority broker socket')
    .action(
      async (
        options: {
          runId: string;
          checkpointToken: string;
          brokerSocket?: string;
        },
        command,
      ) => {
        if (!command.optsWithGlobals().json) {
          command.error("error: required option '--json' not specified");
        }
        const exitCode = await runReviewJsonCommand({
          write: dependencies.write,
          operation: async () => {
            const lifecycleInput = {
              runId: options.runId,
              checkpointToken: options.checkpointToken,
            };
            const context = options.brokerSocket
              ? await requestValidationAuthorityBroker<PreparedReviewContextV1>(
                  options.brokerSocket,
                  { action: 'checkpoint', ...lifecycleInput },
                )
              : await dependencies.checkpoint(
                  lifecycleInput,
                  dependencies.lifecycle ?? dependencies.createLifecycle(),
                );
            const time = context.budget.time;
            const planning: ReviewPlanningProjectionV1 = {
              schemaVersion: 1,
              contextDigest: context.contextDigest,
              changeMap: context.changeMap,
              obligations: context.obligations,
              priorEvidence: context.priorEvidence,
              budget: context.budget,
              derivedPolicy: {
                wholeDiff: {
                  singleLane: evaluateWholeDiffEligibility({
                    changeMap: context.changeMap,
                    contextBudget: context.budget.context,
                    coherentLaneCount: 1,
                    hasConsequentialSeam: false,
                  }),
                  multipleLanes: evaluateWholeDiffEligibility({
                    changeMap: context.changeMap,
                    contextBudget: context.budget.context,
                    coherentLaneCount: 2,
                    hasConsequentialSeam: false,
                  }),
                },
                timeAllocation:
                  time === null
                    ? null
                    : allocateReviewTimeBudget({
                        totalMs: time.totalMs,
                        source: time.source,
                        startedAtMs: time.deadlineMs - time.totalMs,
                      }).allocation,
              },
            };
            return {
              validationRunId: context.runId,
              phase: 'artifacts_loaded' as const,
              contextDigest: context.contextDigest,
              postArtifactTelemetryEvidenceDigest:
                context.postArtifactTelemetryEvidenceDigest,
              planning,
            };
          },
        });
        dependencies.setExitCode(exitCode);
      },
    );
}
