import {
  snapshotArtifactDraft,
  type ArtifactDraft,
} from '@review/artifact-staging';
import {
  validateReviewOutput,
  type OutputValidationResult,
} from '@review/output-validator';
import { parseReviewerTerminalV1, ReviewSchemaError } from '@review/schemas';
import type { ReviewerTerminalV1 } from '@review/types';
import { ValidationStore } from '@review/validation-store';
import {
  launcherValidationStoreAuthority,
  launcherValidationStoreRoot,
} from '@review/validation-store-authority';
import { Command } from 'commander';

import {
  readBoundedJsonStdin,
  ReviewJsonCommandError,
  runReviewJsonCommand,
} from './review-json';

interface ValidateOutputCommandDependencies {
  stdin: AsyncIterable<Uint8Array | string>;
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  validate: (input: {
    runId: string;
    terminal: ReviewerTerminalV1;
  }) => Promise<OutputValidationResult>;
}

function createDefaultStore(): ValidationStore {
  return new ValidationStore(
    launcherValidationStoreRoot(),
    launcherValidationStoreAuthority(),
  );
}

export async function validateStoredReviewOutput(
  input: { runId: string; terminal: ReviewerTerminalV1 },
  store: ValidationStore = createDefaultStore(),
): Promise<OutputValidationResult> {
  const run = await store.readRun(input.runId);
  const { state } = run;
  if (
    !['evidence_started', 'accounting_repair'].includes(state.phase) ||
    state.receipt === null ||
    state.plan === null ||
    state.assignment === null
  ) {
    throw new ReviewJsonCommandError({
      category: 'contract',
      code: 'output-validation-phase-invalid',
      message: 'review output validation requires evidence-started state',
    });
  }

  if (
    input.terminal.status === 'complete' &&
    input.terminal.candidate.kind === 'artifact-draft'
  ) {
    if (
      state.draft === null ||
      input.terminal.candidate.privateDraftPath !== state.draft.path
    ) {
      return {
        valid: false,
        errors: [
          {
            code: 'schema-error',
            pointer: '/candidate/privateDraftPath',
            message: 'artifact candidate does not match the private draft',
          },
        ],
      };
    }
    try {
      await snapshotArtifactDraft(
        {
          path: state.draft.path,
          device: state.draft.device,
          inode: state.draft.inode,
        } satisfies ArtifactDraft,
        input.terminal.reviewAccounting,
      );
    } catch {
      return {
        valid: false,
        errors: [
          {
            code: 'schema-error',
            pointer: '/reviewAccounting',
            message:
              'artifact accounting or private draft identity failed validation',
          },
        ],
      };
    }
  }

  return validateReviewOutput(
    {
      receipt: state.receipt,
      plan: state.plan,
      assignment: state.assignment,
    },
    input.terminal,
  );
}

const DEFAULT_DEPENDENCIES: ValidateOutputCommandDependencies = {
  stdin: process.stdin,
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  validate: (input) => validateStoredReviewOutput(input),
};

function parseTerminal(value: unknown): ReviewerTerminalV1 {
  try {
    return parseReviewerTerminalV1(value);
  } catch (error) {
    if (!(error instanceof ReviewSchemaError)) throw error;
    throw new ReviewJsonCommandError({
      category: 'input',
      code: 'review-output-schema-invalid',
      message: 'validate-output stdin does not match ReviewerTerminalV1',
    });
  }
}

export function createValidateOutputCommand(
  overrides: Partial<ValidateOutputCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('validate-output')
    .description('Validate complete reviewer output from JSON stdin')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--stdin', 'Read complete reviewer output from stdin')
    .option('--json', 'Emit one JSON envelope')
    .action(async (options: { runId: string }, command) => {
      if (!command.optsWithGlobals().json) {
        command.error("error: required option '--json' not specified");
      }
      const exitCode = await runReviewJsonCommand({
        write: dependencies.write,
        operation: async () => {
          const terminal = parseTerminal(
            await readBoundedJsonStdin(dependencies.stdin),
          );
          const result = await dependencies.validate({
            runId: options.runId,
            terminal,
          });
          if (!result.valid) {
            throw new ReviewJsonCommandError({
              category: 'validation',
              code: 'invalid-review-output',
              message: 'review output failed validation',
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
