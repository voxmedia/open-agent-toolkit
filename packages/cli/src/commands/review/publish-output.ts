import { publishAcceptedArtifact } from '@review/artifact-staging';
import type { ArtifactSnapshot } from '@review/artifact-staging';
import { ValidationStore } from '@review/validation-store';
import {
  launcherValidationStoreAuthority,
  launcherValidationStoreRoot,
} from '@review/validation-store-authority';
import { Command } from 'commander';

import { ReviewJsonCommandError, runReviewJsonCommand } from './review-json';

interface PublishOutputCommandDependencies {
  write: (output: string) => void;
  setExitCode: (code: number) => void;
  publish: (input: {
    runId: string;
    destination: string;
  }) => Promise<PublishStoredReviewOutputResult>;
}

export interface PublishStoredReviewOutputResult {
  snapshotId: string;
  digest: string;
  destination: string;
}

function createDefaultStore(): ValidationStore {
  return new ValidationStore(
    launcherValidationStoreRoot(),
    launcherValidationStoreAuthority(),
  );
}

export async function publishStoredReviewOutput(
  input: { runId: string; destination: string },
  store: ValidationStore = createDefaultStore(),
): Promise<PublishStoredReviewOutputResult> {
  let reserved:
    | {
        id: string;
        snapshot: ArtifactSnapshot;
      }
    | undefined;
  await store.updateRun(input.runId, (state) => {
    if (state.phase !== 'accepted') {
      throw new ReviewJsonCommandError({
        category: 'contract',
        code: 'output-publication-phase-invalid',
        message: 'artifact publication requires accepted output',
      });
    }
    if (state.acceptedSnapshot === null) {
      throw new ReviewJsonCommandError({
        category: 'contract',
        code: 'accepted-snapshot-unavailable',
        message: 'accepted output has no artifact snapshot',
      });
    }
    if (state.acceptedSnapshot.publication !== 'available') {
      throw new ReviewJsonCommandError({
        category: 'contract',
        code: 'accepted-snapshot-consumed',
        message: 'accepted artifact snapshot is already reserved or consumed',
      });
    }
    reserved = {
      id: state.acceptedSnapshot.id,
      snapshot: {
        bytesBase64: state.acceptedSnapshot.bytesBase64,
        digest: state.acceptedSnapshot.digest,
        accounting: structuredClone(state.acceptedSnapshot.accounting),
      },
    };
    state.acceptedSnapshot.publication = 'consuming';
    return state;
  });
  if (reserved === undefined) {
    throw new Error('artifact publication reservation produced no snapshot');
  }

  await publishAcceptedArtifact(reserved.snapshot, input.destination);
  await store.updateRun(input.runId, (state) => {
    if (
      state.phase !== 'accepted' ||
      state.acceptedSnapshot === null ||
      state.acceptedSnapshot.id !== reserved!.id ||
      state.acceptedSnapshot.digest !== reserved!.snapshot.digest ||
      state.acceptedSnapshot.publication !== 'consuming'
    ) {
      throw new Error('accepted artifact snapshot reservation changed');
    }
    state.acceptedSnapshot.publication = 'consumed';
    return state;
  });
  return {
    snapshotId: reserved.id,
    digest: reserved.snapshot.digest,
    destination: input.destination,
  };
}

const DEFAULT_DEPENDENCIES: PublishOutputCommandDependencies = {
  write: (output) => process.stdout.write(output),
  setExitCode: (code) => {
    process.exitCode = code;
  },
  publish: (input) => publishStoredReviewOutput(input),
};

export function createPublishOutputCommand(
  overrides: Partial<PublishOutputCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('publish-output')
    .description('Publish the accepted review artifact snapshot once')
    .requiredOption('--run-id <id>', 'Validation run identifier')
    .requiredOption('--destination <path>', 'Launcher-owned destination path')
    .option('--json', 'Emit one JSON envelope')
    .action(
      async (
        options: { runId: string; destination: string },
        command: Command,
      ) => {
        if (!command.optsWithGlobals().json) {
          command.error("error: required option '--json' not specified");
        }
        const exitCode = await runReviewJsonCommand({
          write: dependencies.write,
          operation: () =>
            dependencies.publish({
              runId: options.runId,
              destination: options.destination,
            }),
        });
        dependencies.setExitCode(exitCode);
      },
    );
}
