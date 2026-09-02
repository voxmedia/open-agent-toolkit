import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

import {
  cleanupAcceptedArtifactProof,
  publishAcceptedArtifact,
} from '@review/artifact-staging';
import type {
  ArtifactPublicationIdentity,
  ArtifactSnapshot,
} from '@review/artifact-staging';
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

export interface PublishStoredReviewOutputHooks {
  afterReservation?: () => Promise<void>;
  afterFilesystemCommit?: () => Promise<void>;
  afterConsumed?: () => Promise<void>;
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
  hooks: PublishStoredReviewOutputHooks = {},
): Promise<PublishStoredReviewOutputResult> {
  const destination = resolve(input.destination);
  let reserved:
    | {
        id: string;
        snapshot: ArtifactSnapshot;
        reservationId: string;
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
    const { acceptedSnapshot } = state;
    if (acceptedSnapshot.publication === 'available') {
      const reservationId = randomBytes(32).toString('hex');
      acceptedSnapshot.publication = 'consuming';
      acceptedSnapshot.publicationIntent = {
        destination,
        reservationId,
        destinationDevice: null,
        destinationInode: null,
      };
    } else if (
      acceptedSnapshot.publicationIntent === null ||
      acceptedSnapshot.publicationIntent.destination !== destination
    ) {
      throw new ReviewJsonCommandError({
        category: 'contract',
        code: 'accepted-snapshot-consumed',
        message: 'accepted artifact snapshot is already reserved or consumed',
      });
    }
    const intent = acceptedSnapshot.publicationIntent;
    if (intent === null) {
      throw new Error('artifact publication reservation intent is missing');
    }
    reserved = {
      id: acceptedSnapshot.id,
      snapshot: {
        bytesBase64: acceptedSnapshot.bytesBase64,
        digest: acceptedSnapshot.digest,
        accounting: structuredClone(acceptedSnapshot.accounting),
      },
      reservationId: intent.reservationId,
    };
    return state;
  });
  if (reserved === undefined) {
    throw new Error('artifact publication reservation produced no snapshot');
  }

  const refreshPublicationIdentity =
    async (): Promise<ArtifactPublicationIdentity | null> => {
      let identity: ArtifactPublicationIdentity | null | undefined;
      await store.updateRun(input.runId, (state) => {
        if (
          state.phase !== 'accepted' ||
          state.acceptedSnapshot === null ||
          state.acceptedSnapshot.id !== reserved!.id ||
          state.acceptedSnapshot.digest !== reserved!.snapshot.digest ||
          state.acceptedSnapshot.publicationIntent === null ||
          state.acceptedSnapshot.publicationIntent.destination !==
            destination ||
          state.acceptedSnapshot.publicationIntent.reservationId !==
            reserved!.reservationId
        ) {
          throw new Error('accepted artifact snapshot reservation changed');
        }
        const intent = state.acceptedSnapshot.publicationIntent;
        identity =
          intent.destinationDevice === null || intent.destinationInode === null
            ? null
            : {
                device: intent.destinationDevice,
                inode: intent.destinationInode,
              };
        return state;
      });
      if (identity === undefined) {
        throw new Error('artifact publication identity refresh failed');
      }
      return identity;
    };

  await hooks.afterReservation?.();
  let expectedIdentity = await refreshPublicationIdentity();
  let publicationIdentity: ArtifactPublicationIdentity;
  try {
    publicationIdentity = await publishAcceptedArtifact(
      reserved.snapshot,
      destination,
      reserved.reservationId,
      expectedIdentity,
    );
  } catch (error) {
    const recoveredIdentity = await refreshPublicationIdentity();
    if (expectedIdentity !== null || recoveredIdentity === null) throw error;
    expectedIdentity = recoveredIdentity;
    publicationIdentity = await publishAcceptedArtifact(
      reserved.snapshot,
      destination,
      reserved.reservationId,
      expectedIdentity,
    );
  }
  await hooks.afterFilesystemCommit?.();
  await store.updateRun(input.runId, (state) => {
    if (
      state.phase !== 'accepted' ||
      state.acceptedSnapshot === null ||
      state.acceptedSnapshot.id !== reserved!.id ||
      state.acceptedSnapshot.digest !== reserved!.snapshot.digest ||
      state.acceptedSnapshot.publicationIntent === null ||
      state.acceptedSnapshot.publicationIntent.destination !== destination ||
      state.acceptedSnapshot.publicationIntent.reservationId !==
        reserved!.reservationId
    ) {
      throw new Error('accepted artifact snapshot reservation changed');
    }
    const { acceptedSnapshot } = state;
    const intent = acceptedSnapshot.publicationIntent;
    if (intent === null) {
      throw new Error('accepted artifact snapshot reservation changed');
    }
    if (acceptedSnapshot.publication === 'consuming') {
      if (
        intent.destinationDevice !== null ||
        intent.destinationInode !== null
      ) {
        throw new Error('accepted artifact snapshot reservation changed');
      }
      intent.destinationDevice = publicationIdentity.device;
      intent.destinationInode = publicationIdentity.inode;
      acceptedSnapshot.publication = 'consumed';
    } else if (
      acceptedSnapshot.publication !== 'consumed' ||
      intent.destinationDevice !== publicationIdentity.device ||
      intent.destinationInode !== publicationIdentity.inode
    ) {
      throw new Error('accepted artifact snapshot reservation changed');
    }
    return state;
  });
  await hooks.afterConsumed?.();
  await cleanupAcceptedArtifactProof(
    reserved.snapshot,
    destination,
    reserved.reservationId,
    publicationIdentity,
  );
  return {
    snapshotId: reserved.id,
    digest: reserved.snapshot.digest,
    destination,
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
