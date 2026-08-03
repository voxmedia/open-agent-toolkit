import { currentGateCliLaunch } from '@commands/gate/branch-local-cli';
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
    launcherInvocation: {
      executable: string;
      argvPrefix: string[];
      cwd: string;
    },
  ) => PrepareReviewContextDependencies;
  launcherInvocation: {
    executable: string;
    argvPrefix: string[];
    cwd: string;
  };
  brokerPrepare: typeof launchValidationAuthorityBroker;
  processEnv: NodeJS.ProcessEnv;
}

const activeLaunch = currentGateCliLaunch();

const DEFAULT_DEPENDENCIES: PrepareContextCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  prepare: prepareReviewContext,
  launcherInvocation: {
    executable: activeLaunch.command,
    argvPrefix: activeLaunch.args,
    cwd: activeLaunch.cwd,
  },
  createDependencies: (_input, _launcherInvocation) => {
    throw new Error('direct preparation dependencies must be injected');
  },
  brokerPrepare: launchValidationAuthorityBroker,
  processEnv: process.env,
};

function withGateCorrelation(
  value: unknown,
  environment: NodeJS.ProcessEnv,
): unknown {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('invocation' in value) ||
    value.invocation !== 'gate'
  ) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const validCorrelationValue = (candidate: unknown) =>
    candidate === undefined ||
    candidate === null ||
    typeof candidate === 'string';
  if (
    !validCorrelationValue(input.gateRunId) ||
    !validCorrelationValue(input.launchAttemptId)
  ) {
    throw new ReviewSchemaError('gate correlation input is invalid');
  }
  const inputGateRunId =
    typeof input.gateRunId === 'string' ? input.gateRunId : null;
  const inputLaunchAttemptId =
    typeof input.launchAttemptId === 'string' ? input.launchAttemptId : null;
  const envGateRunId = environment['OAT_GATE_RUN_ID'] ?? null;
  const envLaunchAttemptId = environment['OAT_GATE_LAUNCH_ATTEMPT_ID'] ?? null;
  const inputComplete =
    inputGateRunId !== null && inputLaunchAttemptId !== null;
  const environmentComplete =
    envGateRunId !== null && envLaunchAttemptId !== null;
  if (
    (inputGateRunId === null) !== (inputLaunchAttemptId === null) ||
    (envGateRunId === null) !== (envLaunchAttemptId === null) ||
    (inputComplete &&
      environmentComplete &&
      (inputGateRunId !== envGateRunId ||
        inputLaunchAttemptId !== envLaunchAttemptId))
  ) {
    throw new ReviewSchemaError('gate correlation channels do not match');
  }
  if (inputComplete || !environmentComplete) return value;
  return {
    ...input,
    gateRunId: envGateRunId,
    launchAttemptId: envLaunchAttemptId,
  };
}

function parsePrepareInput(
  value: unknown,
  environment: NodeJS.ProcessEnv,
): PrepareReviewContextInput {
  try {
    const parsed = parsePrepareReviewContextInputV1(
      withGateCorrelation(value, environment),
    );
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
    throughTaskId: result.preparation.throughTaskId,
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
            dependencies.processEnv,
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
