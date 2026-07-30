import { join } from 'node:path';

import {
  beginEvidence,
  type ReviewLifecycleDependencies,
} from '@review/review-lifecycle';
import { ValidationStore } from '@review/validation-store';
import { Command } from 'commander';

import { runReviewJsonCommand } from './review-json';

interface BeginEvidenceCommandDependencies {
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  begin: typeof beginEvidence;
  lifecycle: Pick<ReviewLifecycleDependencies, 'store' | 'clock'>;
}

const DEFAULT_DEPENDENCIES: BeginEvidenceCommandDependencies = {
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

export function createReviewBeginEvidenceCommand(
  overrides: Partial<BeginEvidenceCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('begin-evidence')
    .description('Begin receipt-authorized review evidence')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--receipt <receipt>', 'Validated review plan receipt')
    .requiredOption('--json', 'Emit one JSON envelope')
    .action(async (options: { runId: string; receipt: string }) => {
      const exitCode = await runReviewJsonCommand({
        write: dependencies.write,
        operation: () =>
          dependencies.begin(
            { runId: options.runId, receipt: options.receipt },
            dependencies.lifecycle,
          ),
      });
      dependencies.setExitCode(exitCode);
    });
}
