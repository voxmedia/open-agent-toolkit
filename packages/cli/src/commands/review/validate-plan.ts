import {
  type ReviewLifecycleDependencies,
  validateAndReceiptPlan,
} from '@review/review-lifecycle';
import { parseReviewPlanV1, ReviewSchemaError } from '@review/schemas';
import type { ReviewPlanV1 } from '@review/types';
import { requestValidationAuthorityBroker } from '@review/validation-authority-broker';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

interface ValidatePlanCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  validate: typeof validateAndReceiptPlan;
  lifecycle?: Pick<ReviewLifecycleDependencies, 'store' | 'clock'>;
  createLifecycle: () => Pick<ReviewLifecycleDependencies, 'store' | 'clock'>;
}

const DEFAULT_DEPENDENCIES: ValidatePlanCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  validate: validateAndReceiptPlan,
  createLifecycle: () => {
    throw new Error('validation authority broker is required');
  },
};

function parseReviewPlan(value: unknown): ReviewPlanV1 {
  try {
    return parseReviewPlanV1(value);
  } catch (error) {
    if (!(error instanceof ReviewSchemaError)) throw error;
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'review-plan-schema-invalid',
      message: 'validate-plan stdin does not match ReviewPlanV1',
    });
  }
}

export function createReviewValidatePlanCommand(
  overrides: Partial<ValidatePlanCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('validate-plan')
    .description('Validate a review plan from JSON stdin')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--command-token <token>', 'Plan validation capability')
    .requiredOption('--stdin', 'Read the complete review plan from stdin')
    .option('--json', 'Emit one JSON envelope')
    .option('--broker-socket <path>', 'Launcher-owned authority broker socket')
    .action(
      async (
        options: {
          runId: string;
          commandToken: string;
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
            const plan = parseReviewPlan(
              await readBoundedJsonStdin(dependencies.stdin),
            );
            const lifecycleInput = {
              runId: options.runId,
              commandToken: options.commandToken,
              plan,
            };
            const result = options.brokerSocket
              ? await requestValidationAuthorityBroker<
                  Awaited<ReturnType<typeof validateAndReceiptPlan>>
                >(options.brokerSocket, {
                  action: 'validate',
                  ...lifecycleInput,
                })
              : await dependencies.validate(
                  lifecycleInput,
                  dependencies.lifecycle ?? dependencies.createLifecycle(),
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
      },
    );
}
