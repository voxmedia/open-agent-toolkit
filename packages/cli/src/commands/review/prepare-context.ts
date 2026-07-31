import { allocateReviewTimeBudget } from '@review/budget';
import {
  type PrepareReviewContextDependencies,
  type PrepareReviewContextInput,
  prepareReviewContext,
} from '@review/prepare-context';
import {
  parsePrepareReviewContextInputV1,
  ReviewSchemaError,
} from '@review/schemas';
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

function parsePrepareInput(value: unknown): PrepareReviewContextInput {
  try {
    const parsed = parsePrepareReviewContextInputV1(value);
    allocateReviewTimeBudget({
      totalMs: parsed.budget?.totalMs ?? null,
      source: parsed.budget?.source ?? null,
      startedAtMs: 0,
    });
    return {
      ...parsed,
      gateRunId: parsed.gateRunId ?? undefined,
      launchAttemptId: parsed.launchAttemptId ?? undefined,
      obligationSources: {
        plan: parsed.obligationSources.plan,
        spec: parsed.obligationSources.spec ?? undefined,
        implementation: parsed.obligationSources.implementation,
      },
    };
  } catch (error) {
    if (!(error instanceof ReviewSchemaError)) throw error;
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'invalid-prepare-context-input',
      message:
        'prepare-context stdin does not match PrepareReviewContextInputV1',
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
          const input = parsePrepareInput(
            await readBoundedJsonStdin(dependencies.stdin),
          );
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
