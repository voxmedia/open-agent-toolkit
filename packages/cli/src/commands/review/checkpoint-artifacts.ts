import {
  checkpointArtifactsLoaded,
  type ReviewLifecycleDependencies,
} from '@review/review-lifecycle';
import type { PreparedReviewContextV1 } from '@review/types';
import { ValidationStore } from '@review/validation-store';
import {
  launcherValidationStoreAuthority,
  launcherValidationStoreRoot,
} from '@review/validation-store-authority';
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
  createLifecycle: () => ({
    store: new ValidationStore(
      launcherValidationStoreRoot(),
      launcherValidationStoreAuthority(),
    ),
    telemetryAdapter: null,
    telemetryAdapterId: null,
  }),
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
    .requiredOption('--json', 'Emit one JSON envelope')
    .action(async (options: { runId: string; checkpointToken: string }) => {
      const exitCode = await runReviewJsonCommand({
        write: dependencies.write,
        operation: async () => {
          const context = await dependencies.checkpoint(
            {
              runId: options.runId,
              checkpointToken: options.checkpointToken,
            },
            dependencies.lifecycle ?? dependencies.createLifecycle(),
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
