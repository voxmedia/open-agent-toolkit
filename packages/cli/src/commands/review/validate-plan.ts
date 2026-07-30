import { join } from 'node:path';

import {
  type ReviewLifecycleDependencies,
  validateAndReceiptPlan,
} from '@review/review-lifecycle';
import type { ReviewPlanV1 } from '@review/types';
import { ValidationStore } from '@review/validation-store';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

interface ValidatePlanInput {
  validationRunId: string;
  commandToken: string;
  plan: ReviewPlanV1;
}

interface ValidatePlanCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  validate: typeof validateAndReceiptPlan;
  lifecycle: Pick<ReviewLifecycleDependencies, 'store' | 'clock'>;
}

const DEFAULT_DEPENDENCIES: ValidatePlanCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  validate: validateAndReceiptPlan,
  lifecycle: {
    store: new ValidationStore(
      join(process.cwd(), '.oat', 'review-validation'),
    ),
  },
};

function assertValidatePlanInput(
  value: unknown,
): asserts value is ValidatePlanInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as Record<string, unknown>).validationRunId !== 'string' ||
    typeof (value as Record<string, unknown>).commandToken !== 'string' ||
    typeof (value as Record<string, unknown>).plan !== 'object' ||
    (value as Record<string, unknown>).plan === null
  ) {
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'invalid-validate-plan-input',
      message: 'validate-plan requires validationRunId, commandToken, and plan',
    });
  }
}

export function createReviewValidatePlanCommand(
  overrides: Partial<ValidatePlanCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('validate-plan')
    .description('Validate a review plan from JSON stdin')
    .action(async () => {
      const exitCode = await runReviewJsonCommand({
        write: dependencies.write,
        operation: async () => {
          const input = await readBoundedJsonStdin(dependencies.stdin);
          assertValidatePlanInput(input);
          const result = await dependencies.validate(
            {
              runId: input.validationRunId,
              commandToken: input.commandToken,
              plan: input.plan,
            },
            dependencies.lifecycle,
          );
          if (!result.valid) {
            throw new ReviewJsonCommandError({
              category: 'validation',
              code: 'invalid-review-plan',
              message: 'review plan failed validation',
              details: { errorCount: result.errors.length },
              result,
            });
          }
          return result;
        },
      });
      dependencies.setExitCode(exitCode);
    });
}
