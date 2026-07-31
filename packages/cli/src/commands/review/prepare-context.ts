import {
  type PrepareReviewContextDependencies,
  type PrepareReviewContextInput,
  prepareReviewContext,
} from '@review/prepare-context';
import type { PrepareReviewContextResultV1 } from '@review/types';
import { launchValidationAuthorityBroker } from '@review/validation-authority-broker';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

interface PrepareContextCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  prepare: (
    input: PrepareReviewContextInput,
    dependencies: PrepareReviewContextDependencies,
  ) => Promise<PrepareReviewContextResultV1>;
  createDependencies: (
    input: PrepareReviewContextInput,
    launcherInvocation: { executable: string; argvPrefix: string[] },
  ) => PrepareReviewContextDependencies;
  launcherInvocation: { executable: string; argvPrefix: string[] };
  brokerPrepare: typeof launchValidationAuthorityBroker;
}

const DEFAULT_DEPENDENCIES: PrepareContextCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  prepare: prepareReviewContext,
  launcherInvocation: {
    executable: process.execPath,
    argvPrefix: process.argv[1] ? [process.argv[1]] : [],
  },
  createDependencies: (_input, _launcherInvocation) => {
    throw new Error('direct preparation dependencies must be injected');
  },
  brokerPrepare: launchValidationAuthorityBroker,
};

function assertPrepareInput(
  value: unknown,
): asserts value is PrepareReviewContextInput {
  if (typeof value !== 'object' || value === null) {
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'invalid-prepare-context-input',
      message: 'prepare-context input must be a JSON object',
    });
  }
  const input = value as Record<string, unknown>;
  const hasBudget = input.budget !== null && input.budget !== undefined;
  if (hasBudget) {
    const budget = input.budget as Record<string, unknown>;
    if (
      typeof budget !== 'object' ||
      budget === null ||
      typeof budget.totalMs !== 'number' ||
      typeof budget.source !== 'string'
    ) {
      throw new ReviewJsonCommandError({
        category: 'input',
        code: 'invalid-budget-pair',
        message: 'budget totalMs and source must be supplied together',
      });
    }
  }
  const hasGateRunId = typeof input.gateRunId === 'string';
  const hasLaunchAttemptId = typeof input.launchAttemptId === 'string';
  if (
    (input.invocation === 'gate' && (!hasGateRunId || !hasLaunchAttemptId)) ||
    (input.invocation !== 'gate' && (hasGateRunId || hasLaunchAttemptId))
  ) {
    throw new ReviewJsonCommandError({
      category: 'contract',
      code: 'invalid-gate-correlation',
      message: 'gate correlation IDs must exactly match gate invocation',
    });
  }
}

function projectPrepareResult(result: PrepareReviewContextResultV1) {
  return {
    validationRunId: result.preparation.runId,
    preparationDigest: result.preparation.preparationDigest,
    artifactDraftPath: result.artifactDraftPath,
    correlation: result.preparation.correlation,
    range: result.preparation.range,
    expiresAt: result.preparation.expiresAt,
    commands: result.commands,
  };
}

export function createReviewPrepareContextCommand(
  overrides: Partial<PrepareContextCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const useBroker = overrides.prepare === undefined;
  return new Command('prepare-context')
    .description('Prepare authoritative review context from JSON stdin')
    .action(async () => {
      const exitCode = await runReviewJsonCommand({
        write: dependencies.write,
        operation: async () => {
          const input = await readBoundedJsonStdin(dependencies.stdin);
          assertPrepareInput(input);
          return projectPrepareResult(
            useBroker
              ? await dependencies.brokerPrepare({
                  preparationInput: input,
                  launcherInvocation: dependencies.launcherInvocation,
                })
              : await dependencies.prepare(
                  input,
                  dependencies.createDependencies(
                    input,
                    dependencies.launcherInvocation,
                  ),
                ),
          );
        },
      });
      dependencies.setExitCode(exitCode);
    });
}
