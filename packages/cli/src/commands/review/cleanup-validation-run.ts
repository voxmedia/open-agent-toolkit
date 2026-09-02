import { requestValidationAuthorityBroker } from '@review/validation-authority-broker';
import { Command } from 'commander';

import { runReviewJsonCommand } from './review-json';

interface CleanupValidationRunCommandDependencies {
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  request: typeof requestValidationAuthorityBroker;
}

const DEFAULT_DEPENDENCIES: CleanupValidationRunCommandDependencies = {
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  request: requestValidationAuthorityBroker,
};

export function createReviewCleanupValidationRunCommand(
  overrides: Partial<CleanupValidationRunCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('cleanup-validation-run')
    .description('Delete one coordinator-owned validation run')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--coordinator-token <token>', 'Coordinator capability')
    .requiredOption('--broker-socket <path>', 'Launcher-owned authority broker')
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
          operation: () =>
            dependencies.request<{
              validationRunId: string;
              cleaned: true;
            }>(options.brokerSocket, {
              action: 'cleanup-validation-run',
              runId: options.runId,
              coordinatorToken: options.coordinatorToken,
            }),
        });
        dependencies.setExitCode(exitCode);
      },
    );
}
