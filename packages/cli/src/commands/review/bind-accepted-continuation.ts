import { requestValidationAuthorityBroker } from '@review/validation-authority-broker';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

const MAX_ACCEPTED_CONTINUATION_STDIN_BYTES = 8192;

interface BindAcceptedContinuationCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  request: typeof requestValidationAuthorityBroker;
}

const DEFAULT_DEPENDENCIES: BindAcceptedContinuationCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  request: requestValidationAuthorityBroker,
};

function parseAcceptedContinuation(value: unknown): {
  schemaVersion: 1;
  handleId: string;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidAcceptedContinuation();
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(',') !== 'handleId,schemaVersion' ||
    record.schemaVersion !== 1 ||
    typeof record.handleId !== 'string' ||
    record.handleId.length === 0 ||
    Buffer.byteLength(record.handleId, 'utf8') > 4096
  ) {
    throw invalidAcceptedContinuation();
  }
  return record as { schemaVersion: 1; handleId: string };
}

function invalidAcceptedContinuation(): ReviewJsonCommandError {
  return new ReviewJsonCommandError({
    category: 'input',
    code: 'invalid-accepted-continuation-input',
    message:
      'bind-accepted-continuation stdin must be exact AcceptedContinuationBindingV1 JSON',
  });
}

export function createReviewBindAcceptedContinuationCommand(
  overrides: Partial<BindAcceptedContinuationCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('bind-accepted-continuation')
    .description('Bind the exact host-accepted reviewer continuation')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--coordinator-token <token>', 'Coordinator capability')
    .requiredOption('--broker-socket <path>', 'Launcher-owned authority broker')
    .requiredOption('--stdin', 'Read accepted continuation JSON from stdin')
    .option('--json', 'Emit one JSON envelope')
    .action(
      async (
        options: {
          runId: string;
          coordinatorToken: string;
          brokerSocket: string;
        },
        command,
      ) => {
        if (!command.optsWithGlobals().json) {
          command.error("error: required option '--json' not specified");
        }
        const exitCode = await runReviewJsonCommand({
          write: dependencies.write,
          operation: async () => {
            const continuation = parseAcceptedContinuation(
              await readBoundedJsonStdin(
                dependencies.stdin,
                MAX_ACCEPTED_CONTINUATION_STDIN_BYTES,
              ),
            );
            return dependencies.request<{
              validationRunId: string;
              acceptedHandleDigest: string;
            }>(options.brokerSocket, {
              action: 'bind-accepted-continuation',
              runId: options.runId,
              coordinatorToken: options.coordinatorToken,
              handleId: continuation.handleId,
            });
          },
        });
        dependencies.setExitCode(exitCode);
      },
    );
}
