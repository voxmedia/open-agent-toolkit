import type {
  ValidatedWorkerCoverageProjectionV1,
  WorkerDossierV1,
} from '@review/types';
import { requestValidationAuthorityBroker } from '@review/validation-authority-broker';
import {
  parseWorkerDossierV1,
  WorkerDossierParseError,
} from '@review/worker-dossier';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

interface BindWorkerDossierCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  bind: (input: {
    brokerSocket: string;
    runId: string;
    receipt: string;
    dossier: WorkerDossierV1;
  }) => Promise<ValidatedWorkerCoverageProjectionV1>;
}

const DEFAULT_DEPENDENCIES: BindWorkerDossierCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  bind: ({ brokerSocket, runId, receipt, dossier }) =>
    requestValidationAuthorityBroker(brokerSocket, {
      action: 'bind-worker-dossier',
      runId,
      receipt,
      dossier,
    }),
};

function parseDossier(value: unknown): WorkerDossierV1 {
  try {
    return parseWorkerDossierV1(value);
  } catch (error) {
    if (!(error instanceof WorkerDossierParseError)) throw error;
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'worker-dossier-schema-invalid',
      message: 'bind-worker-dossier stdin does not match WorkerDossierV1',
    });
  }
}

export function createReviewBindWorkerDossierCommand(
  overrides: Partial<BindWorkerDossierCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('bind-worker-dossier')
    .description('Bind accepted worker coverage before output validation')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--receipt <receipt>', 'Validated review plan receipt')
    .requiredOption(
      '--broker-socket <path>',
      'Launcher-owned authority broker socket',
    )
    .requiredOption('--stdin', 'Read one WorkerDossierV1 from stdin')
    .option('--json', 'Emit one JSON envelope')
    .action(
      async (
        options: {
          runId: string;
          receipt: string;
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
            const dossier = parseDossier(
              await readBoundedJsonStdin(dependencies.stdin),
            );
            return dependencies.bind({
              brokerSocket: options.brokerSocket,
              runId: options.runId,
              receipt: options.receipt,
              dossier,
            });
          },
        });
        dependencies.setExitCode(exitCode);
      },
    );
}
