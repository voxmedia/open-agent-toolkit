import {
  beginEvidence,
  type ReviewLifecycleDependencies,
} from '@review/review-lifecycle';
import { requestValidationAuthorityBroker } from '@review/validation-authority-broker';
import { Command } from 'commander';

import { runReviewJsonCommand } from './review-json';

interface BeginEvidenceCommandDependencies {
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  begin: typeof beginEvidence;
  lifecycle?: Pick<ReviewLifecycleDependencies, 'store' | 'clock'>;
  createLifecycle: () => Pick<ReviewLifecycleDependencies, 'store' | 'clock'>;
}

const DEFAULT_DEPENDENCIES: BeginEvidenceCommandDependencies = {
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  begin: beginEvidence,
  createLifecycle: () => {
    throw new Error('validation authority broker is required');
  },
};

export function createReviewBeginEvidenceCommand(
  overrides: Partial<BeginEvidenceCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('begin-evidence')
    .description('Begin receipt-authorized review evidence')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--receipt <receipt>', 'Validated review plan receipt')
    .option('--json', 'Emit one JSON envelope')
    .option('--broker-socket <path>', 'Launcher-owned authority broker socket')
    .action(
      async (
        options: {
          runId: string;
          receipt: string;
          brokerSocket?: string;
        },
        command,
      ) => {
        if (!command.optsWithGlobals().json) {
          command.error("error: required option '--json' not specified");
        }
        const exitCode = await runReviewJsonCommand({
          write: dependencies.write,
          operation: () => {
            const lifecycleInput = {
              runId: options.runId,
              receipt: options.receipt,
            };
            return options.brokerSocket
              ? requestValidationAuthorityBroker(options.brokerSocket, {
                  action: 'begin',
                  ...lifecycleInput,
                })
              : dependencies.begin(
                  lifecycleInput,
                  dependencies.lifecycle ?? dependencies.createLifecycle(),
                );
          },
        });
        dependencies.setExitCode(exitCode);
      },
    );
}
