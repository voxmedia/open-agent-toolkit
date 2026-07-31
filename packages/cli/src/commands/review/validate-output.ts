import { randomBytes } from 'node:crypto';

import { extractArtifactFindingProjection } from '@review/artifact-accounting';
import {
  snapshotArtifactDraft,
  type ArtifactDraft,
  type ArtifactSnapshot,
} from '@review/artifact-staging';
import {
  immutableReviewSubstanceDigest,
  isAccountingRepairablePointer,
} from '@review/coordinator-contract';
import {
  validateReviewOutput,
  type OutputValidationResult,
} from '@review/output-validator';
import { parseReviewerTerminalV1, ReviewSchemaError } from '@review/schemas';
import type {
  ArtifactFindingProjectionV1,
  ReviewerTerminalV1,
} from '@review/types';
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
  if (state.phase === 'terminal' && state.output.attempts >= 3) {
    throw new ReviewJsonCommandError({
      category: 'contract',
      code: 'output-attempt-limit',
      message: 'review output submission limit is exhausted',
    });
  }
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

  let artifactFindingProjection: ArtifactFindingProjectionV1 | undefined;
  let artifactBytesBase64: string | undefined;
  let artifactSnapshot: ArtifactSnapshot | undefined;
  let artifactError: OutputValidationResult | null = null;
  if (
    input.terminal.status === 'complete' &&
    input.terminal.candidate.kind === 'artifact-draft'
  ) {
    if (
      state.draft === null ||
      input.terminal.candidate.privateDraftPath !== state.draft.path
    ) {
      artifactError = {
        valid: false,
        errors: [
          {
            code: 'schema-error',
            pointer: '/candidate/privateDraftPath',
            message: 'artifact candidate does not match the private draft',
          },
        ],
      };
    } else {
      try {
        const snapshot = await snapshotArtifactDraft(
          {
            path: state.draft.path,
            device: state.draft.device,
            inode: state.draft.inode,
          } satisfies ArtifactDraft,
          input.terminal.reviewAccounting,
        );
        artifactFindingProjection = extractArtifactFindingProjection(
          Buffer.from(snapshot.bytesBase64, 'base64'),
        );
        artifactBytesBase64 = snapshot.bytesBase64;
        artifactSnapshot = snapshot;
      } catch {
        artifactError = {
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
  }

  let result: OutputValidationResult | undefined;
  await store.updateRun(input.runId, (current) => {
    if (
      current.receipt === null ||
      current.plan === null ||
      current.assignment === null
    ) {
      throw new ReviewJsonCommandError({
        category: 'contract',
        code: 'output-validation-phase-invalid',
        message: 'review output validation state is incomplete',
      });
    }
    if (current.phase === 'terminal' && current.output.attempts >= 3) {
      throw new ReviewJsonCommandError({
        category: 'contract',
        code: 'output-attempt-limit',
        message: 'review output submission limit is exhausted',
      });
    }
    const expectedPhase =
      current.output.attempts === 0 ? 'evidence_started' : 'accounting_repair';
    if (current.phase !== expectedPhase || current.output.attempts >= 3) {
      throw new ReviewJsonCommandError({
        category: 'contract',
        code: 'output-validation-phase-invalid',
        message: 'review output cannot be submitted in the current phase',
      });
    }

    const immutableSubstanceDigest = immutableReviewSubstanceDigest(
      input.terminal,
      artifactBytesBase64,
    );
    current.output.attempts++;
    if (current.output.immutableSubstanceDigest === null) {
      current.output.immutableSubstanceDigest = immutableSubstanceDigest;
    } else if (
      current.output.immutableSubstanceDigest !== immutableSubstanceDigest
    ) {
      result = {
        valid: false,
        errors: [
          {
            code: 'immutable-substance-mismatch',
            pointer: '/',
            message: 'accounting repair changed immutable review substance',
          },
        ],
      };
      current.phase = 'terminal';
      return current;
    }

    result =
      artifactError ??
      validateReviewOutput(
        {
          receipt: current.receipt,
          plan: current.plan,
          assignment: current.assignment,
          artifactFindingProjection,
        },
        input.terminal,
      );
    if (result.valid) {
      current.phase =
        input.terminal.status === 'complete' ? 'accepted' : 'terminal';
      if (
        input.terminal.status === 'complete' &&
        artifactSnapshot !== undefined
      ) {
        current.acceptedSnapshot = {
          id: randomBytes(32).toString('hex'),
          bytesBase64: artifactSnapshot.bytesBase64,
          digest: artifactSnapshot.digest,
          accounting: structuredClone(artifactSnapshot.accounting),
          publication: 'available',
        };
        current.draft = null;
      }
    } else {
      const repairable =
        current.output.attempts < 3 &&
        result.errors.length > 0 &&
        result.errors.every((error) =>
          isAccountingRepairablePointer(error.pointer),
        );
      current.phase = repairable ? 'accounting_repair' : 'terminal';
    }
    return current;
  });
  if (result === undefined) {
    throw new Error('output validation transition produced no result');
  }
  return result;
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
