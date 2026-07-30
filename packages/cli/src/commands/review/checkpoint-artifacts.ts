import { join } from 'node:path';

import {
  checkpointArtifactsLoaded,
  type ReviewLifecycleDependencies,
} from '@review/review-lifecycle';
import type { PreparedReviewContextV1 } from '@review/types';
import { ValidationStore } from '@review/validation-store';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

interface CheckpointArtifactsInput {
  validationRunId: string;
  checkpointToken: string;
}

interface CheckpointArtifactsCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  checkpoint: (
    input: { runId: string; checkpointToken: string },
    dependencies: ReviewLifecycleDependencies,
  ) => Promise<PreparedReviewContextV1>;
  lifecycle: ReviewLifecycleDependencies;
}

const DEFAULT_DEPENDENCIES: CheckpointArtifactsCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  checkpoint: checkpointArtifactsLoaded,
  lifecycle: {
    store: new ValidationStore(
      join(process.cwd(), '.oat', 'review-validation'),
    ),
    telemetryAdapter: null,
    telemetryAdapterId: null,
  },
};

function assertCheckpointInput(
  value: unknown,
): asserts value is CheckpointArtifactsInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as Record<string, unknown>).validationRunId !== 'string' ||
    typeof (value as Record<string, unknown>).checkpointToken !== 'string'
  ) {
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'invalid-checkpoint-input',
      message: 'checkpoint requires validationRunId and checkpointToken',
    });
  }
}

export function createReviewCheckpointArtifactsCommand(
  overrides: Partial<CheckpointArtifactsCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('checkpoint-artifacts')
    .description('Seal loaded review artifacts from JSON stdin')
    .action(async () => {
      const exitCode = await runReviewJsonCommand({
        write: dependencies.write,
        operation: async () => {
          const input = await readBoundedJsonStdin(dependencies.stdin);
          assertCheckpointInput(input);
          const context = await dependencies.checkpoint(
            {
              runId: input.validationRunId,
              checkpointToken: input.checkpointToken,
            },
            dependencies.lifecycle,
          );
          return {
            validationRunId: context.runId,
            phase: 'artifacts_loaded' as const,
            contextDigest: context.contextDigest,
            postArtifactTelemetryEvidenceDigest:
              context.postArtifactTelemetryEvidenceDigest,
          };
        },
      });
      dependencies.setExitCode(exitCode);
    });
}
