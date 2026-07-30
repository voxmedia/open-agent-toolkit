import { join } from 'node:path';

import {
  beginEvidence,
  type ReviewLifecycleDependencies,
} from '@review/review-lifecycle';
import { ValidationStore } from '@review/validation-store';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

interface BeginEvidenceInput {
  validationRunId: string;
  receipt: string;
}

interface BeginEvidenceCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  begin: typeof beginEvidence;
  lifecycle: Pick<ReviewLifecycleDependencies, 'store' | 'clock'>;
}

const DEFAULT_DEPENDENCIES: BeginEvidenceCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  begin: beginEvidence,
  lifecycle: {
    store: new ValidationStore(
      join(process.cwd(), '.oat', 'review-validation'),
    ),
  },
};

function assertBeginEvidenceInput(
  value: unknown,
): asserts value is BeginEvidenceInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as Record<string, unknown>).validationRunId !== 'string' ||
    typeof (value as Record<string, unknown>).receipt !== 'string'
  ) {
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'invalid-begin-evidence-input',
      message: 'begin-evidence requires validationRunId and receipt',
    });
  }
}

export function createReviewBeginEvidenceCommand(
  overrides: Partial<BeginEvidenceCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('begin-evidence')
    .description('Begin receipt-authorized review evidence from JSON stdin')
    .action(async () => {
      const exitCode = await runReviewJsonCommand({
        write: dependencies.write,
        operation: async () => {
          const input = await readBoundedJsonStdin(dependencies.stdin);
          assertBeginEvidenceInput(input);
          return dependencies.begin(
            { runId: input.validationRunId, receipt: input.receipt },
            dependencies.lifecycle,
          );
        },
      });
      dependencies.setExitCode(exitCode);
    });
}
