import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  extractReviewAccounting,
  materializeReviewAccounting,
} from './artifact-accounting';
import { canonicalizeJson } from './canonical-json';
import type { ReviewAccountingV1, ReviewerAccountingOverlayV1 } from './types';

const NOFOLLOW =
  'O_NOFOLLOW' in constants ? constants.O_NOFOLLOW : (0 as number);

export interface ArtifactDraft {
  path: string;
  device: number;
  inode: number;
}

export interface ArtifactSnapshot {
  bytesBase64: string;
  digest: string;
  accounting: ReviewAccountingV1;
}

export interface ArtifactPublicationHooks {
  beforeCommit?: (temporaryPath: string) => Promise<void>;
}

export class ArtifactDraftIdentityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ArtifactDraftIdentityError';
  }
}

function digest(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function createArtifactDraft(
  runDirectory: string,
): Promise<ArtifactDraft> {
  const directoryInfo = await lstat(runDirectory);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
    throw new Error('artifact draft directory identity is unsafe');
  }
  const path = join(runDirectory, 'artifact-draft.md');
  const handle = await open(
    path,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | NOFOLLOW,
    0o600,
  );
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1 || info.mode & 0o077) {
      throw new Error('artifact draft identity or permissions are unsafe');
    }
    return { path, device: info.dev, inode: info.ino };
  } finally {
    await handle.close();
  }
}

export async function readArtifactDraftBytes(
  draft: ArtifactDraft,
): Promise<Buffer> {
  let handle;
  try {
    handle = await open(draft.path, constants.O_RDONLY | NOFOLLOW);
    const info = await handle.stat();
    if (
      !info.isFile() ||
      info.nlink !== 1 ||
      info.dev !== draft.device ||
      info.ino !== draft.inode ||
      info.mode & 0o077
    ) {
      throw new ArtifactDraftIdentityError('artifact draft identity mismatch');
    }
    return await handle.readFile();
  } catch (error) {
    if (error instanceof ArtifactDraftIdentityError) throw error;
    throw new ArtifactDraftIdentityError('artifact draft identity mismatch', {
      cause: error,
    });
  } finally {
    await handle?.close();
  }
}

export async function snapshotArtifactDraft(
  draft: ArtifactDraft,
  envelopeAccounting: ReviewAccountingV1,
  authoredOverlay?: ReviewerAccountingOverlayV1,
): Promise<ArtifactSnapshot> {
  const authoredBytes = await readArtifactDraftBytes(draft);
  const bytes =
    authoredOverlay === undefined
      ? authoredBytes
      : materializeReviewAccounting(
          authoredBytes,
          authoredOverlay,
          envelopeAccounting,
        );
  const embeddedAccounting = extractReviewAccounting(bytes);
  if (
    canonicalizeJson(embeddedAccounting) !==
    canonicalizeJson(envelopeAccounting)
  ) {
    throw new Error(
      'embedded artifact accounting does not match the terminal envelope',
    );
  }
  return Object.freeze({
    bytesBase64: bytes.toString('base64'),
    digest: digest(bytes),
    accounting: structuredClone(embeddedAccounting),
  });
}

export async function publishAcceptedArtifact(
  snapshot: ArtifactSnapshot,
  destination: string,
  hooks: ArtifactPublicationHooks = {},
): Promise<void> {
  const bytes = Buffer.from(snapshot.bytesBase64, 'base64');
  if (digest(bytes) !== snapshot.digest) {
    throw new Error('artifact snapshot digest mismatch');
  }

  const destinationDirectory = dirname(destination);
  await mkdir(destinationDirectory, { recursive: true });
  const directoryInfo = await lstat(destinationDirectory);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
    throw new Error('artifact publication directory identity is unsafe');
  }

  const temporaryPath = join(
    destinationDirectory,
    `.review-${process.pid}-${crypto.randomUUID()}.tmp`,
  );
  let renamed = false;
  try {
    const handle = await open(
      temporaryPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | NOFOLLOW,
      0o600,
    );
    try {
      await handle.writeFile(bytes);
      await handle.sync();
      const initialInfo = await handle.stat();
      if (
        !initialInfo.isFile() ||
        initialInfo.nlink !== 1 ||
        initialInfo.mode & 0o077
      ) {
        throw new Error('artifact publication descriptor identity is unsafe');
      }
      const verifiedBytes = Buffer.alloc(initialInfo.size);
      let offset = 0;
      while (offset < verifiedBytes.length) {
        const { bytesRead } = await handle.read(
          verifiedBytes,
          offset,
          verifiedBytes.length - offset,
          offset,
        );
        if (bytesRead === 0) {
          throw new Error('artifact publication descriptor read was truncated');
        }
        offset += bytesRead;
      }
      if (digest(verifiedBytes) !== snapshot.digest) {
        throw new Error('artifact publication digest mismatch');
      }

      await hooks.beforeCommit?.(temporaryPath);
      const descriptorInfo = await handle.stat();
      const pathInfo = await lstat(temporaryPath);
      if (
        !descriptorInfo.isFile() ||
        descriptorInfo.nlink !== 1 ||
        descriptorInfo.dev !== initialInfo.dev ||
        descriptorInfo.ino !== initialInfo.ino ||
        !pathInfo.isFile() ||
        pathInfo.isSymbolicLink() ||
        pathInfo.nlink !== 1 ||
        pathInfo.dev !== descriptorInfo.dev ||
        pathInfo.ino !== descriptorInfo.ino
      ) {
        throw new Error(
          'artifact publication temporary identity or link drift',
        );
      }
      try {
        await lstat(destination);
        throw new Error('artifact publication destination already exists');
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          error.code !== 'ENOENT'
        ) {
          throw error;
        }
      }
      await rename(temporaryPath, destination);
      renamed = true;
      const destinationInfo = await lstat(destination);
      if (
        !destinationInfo.isFile() ||
        destinationInfo.isSymbolicLink() ||
        destinationInfo.nlink !== 1 ||
        destinationInfo.dev !== descriptorInfo.dev ||
        destinationInfo.ino !== descriptorInfo.ino
      ) {
        throw new Error('artifact publication destination identity drift');
      }
    } finally {
      await handle.close();
    }
  } finally {
    if (!renamed) await rm(temporaryPath, { force: true });
  }
}
