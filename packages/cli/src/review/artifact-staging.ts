import { createHash, randomUUID } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  rmdir,
  type FileHandle,
  unlink,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import {
  extractReviewAccounting,
  materializeReviewAccounting,
} from './artifact-accounting';
import { canonicalizeJson } from './canonical-json';
import type { ReviewAccountingV1, ReviewerAccountingOverlayV1 } from './types';

const NOFOLLOW =
  'O_NOFOLLOW' in constants ? constants.O_NOFOLLOW : (0 as number);
const PUBLICATION_LOCK_ATTEMPTS = 6_000;
const PUBLICATION_LOCK_DELAY_MS = 10;
const PUBLICATION_LOCK_LEASE_MS = 30_000;

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
  afterProofCreation?: (initializationPath: string) => Promise<void>;
  afterPartialProofWrite?: (initializationPath: string) => Promise<void>;
  beforeCommit?: (temporaryPath: string) => Promise<void>;
  afterCommit?: (temporaryPath: string) => Promise<void>;
}

export interface ArtifactCleanupHooks {
  beforeUnlink?: (proofPath: string) => Promise<void>;
}

export interface ArtifactPublicationIdentity {
  device: number;
  inode: number;
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

function isErrno(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

interface ArtifactPublicationPaths {
  proof: string;
  initialization: string;
  lockDirectory: string;
}

function publicationPaths(
  snapshot: ArtifactSnapshot,
  destination: string,
  reservationId: string,
): ArtifactPublicationPaths {
  if (!/^[0-9a-f]{64}$/.test(reservationId)) {
    throw new Error('artifact publication reservation identity is invalid');
  }
  const proofName = createHash('sha256')
    .update(JSON.stringify([snapshot.digest, reservationId]))
    .digest('hex');
  const prefix = join(dirname(destination), `.review-publication-${proofName}`);
  return {
    proof: `${prefix}.proof`,
    initialization: `${prefix}.initializing`,
    lockDirectory: `${prefix}.lock`,
  };
}

async function lstatIfPresent(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return null;
    throw error;
  }
}

function publicationIdentity(info: Stats): ArtifactPublicationIdentity {
  return { device: info.dev, inode: info.ino };
}

function matchesIdentity(
  info: Stats,
  identity: ArtifactPublicationIdentity,
): boolean {
  return info.dev === identity.device && info.ino === identity.inode;
}

async function unlinkObservedIdentity(
  path: string,
  identity: ArtifactPublicationIdentity,
  expectedLinks: readonly number[],
  beforeUnlink?: () => Promise<void>,
): Promise<boolean> {
  const info = await lstatIfPresent(path);
  if (info === null) return false;
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    !expectedLinks.includes(info.nlink) ||
    !matchesIdentity(info, identity)
  ) {
    throw new Error('artifact publication removal identity drift');
  }
  await beforeUnlink?.();
  const finalInfo = await lstatIfPresent(path);
  if (finalInfo === null) return false;
  if (
    !finalInfo.isFile() ||
    finalInfo.isSymbolicLink() ||
    !expectedLinks.includes(finalInfo.nlink) ||
    !matchesIdentity(finalInfo, identity)
  ) {
    throw new Error('artifact publication removal identity drift');
  }
  try {
    // Node 22 exposes no portable unlinkat-style identity-conditional unlink.
    // Rechecking immediately before unlink is the strongest fail-closed
    // portable behavior. A hostile same-user directory writer can still race
    // this final pathname operation after the last observation.
    await unlink(path);
    return true;
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return false;
    throw error;
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isErrno(error, 'EPERM');
  }
}

async function withPublicationLock<T>(
  lockDirectory: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    await mkdir(lockDirectory, { mode: 0o700 });
  } catch (error) {
    if (!isErrno(error, 'EEXIST')) throw error;
  }
  const lockInfo = await lstat(lockDirectory);
  if (
    !lockInfo.isDirectory() ||
    lockInfo.isSymbolicLink() ||
    lockInfo.mode & 0o077
  ) {
    throw new Error('artifact publication lock directory is unsafe');
  }

  const nonce = randomUUID();
  const claimPath = join(lockDirectory, `${nonce}.claim`);
  const owner = {
    schemaVersion: 1,
    pid: process.pid,
    nonce,
    acquiredAtMs: Date.now(),
    acquiredAtNs: process.hrtime.bigint().toString(),
  };
  const claimHandle = await open(
    claimPath,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | NOFOLLOW,
    0o600,
  );
  let claimIdentity: ArtifactPublicationIdentity;
  try {
    await claimHandle.writeFile(`${JSON.stringify(owner)}\n`);
    await claimHandle.sync();
    claimIdentity = publicationIdentity(await claimHandle.stat());
  } finally {
    await claimHandle.close();
  }

  let acquired = false;
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  try {
    for (let attempt = 0; attempt < PUBLICATION_LOCK_ATTEMPTS; attempt++) {
      const liveClaims: Array<{ acquiredAtNs: bigint; nonce: string }> = [];
      let initializingClaim = false;
      for (const name of await readdir(lockDirectory)) {
        if (!name.endsWith('.claim')) continue;
        const candidatePath = join(lockDirectory, name);
        const candidateInfo = await lstatIfPresent(candidatePath);
        if (candidateInfo === null) continue;
        if (
          !candidateInfo.isFile() ||
          candidateInfo.isSymbolicLink() ||
          candidateInfo.nlink !== 1 ||
          candidateInfo.mode & 0o077
        ) {
          throw new Error('artifact publication lock claim is unsafe');
        }
        let candidate:
          | {
              schemaVersion?: unknown;
              pid?: unknown;
              nonce?: unknown;
              acquiredAtMs?: unknown;
              acquiredAtNs?: unknown;
            }
          | undefined;
        try {
          const handle = await open(
            candidatePath,
            constants.O_RDONLY | NOFOLLOW,
          );
          try {
            const openedInfo = await handle.stat();
            if (
              !matchesIdentity(openedInfo, publicationIdentity(candidateInfo))
            ) {
              throw new Error('artifact publication lock claim drift');
            }
            candidate = JSON.parse(
              await handle.readFile('utf8'),
            ) as typeof candidate;
          } finally {
            await handle.close();
          }
        } catch (error) {
          if (isErrno(error, 'ENOENT')) continue;
          if (Date.now() - candidateInfo.mtimeMs > PUBLICATION_LOCK_LEASE_MS) {
            await unlinkObservedIdentity(
              candidatePath,
              publicationIdentity(candidateInfo),
              [1],
            );
            continue;
          }
          if (error instanceof SyntaxError) {
            initializingClaim = true;
            continue;
          }
          throw error;
        }
        const valid =
          candidate?.schemaVersion === 1 &&
          Number.isSafeInteger(candidate.pid) &&
          typeof candidate.nonce === 'string' &&
          `${candidate.nonce}.claim` === name &&
          Number.isSafeInteger(candidate.acquiredAtMs) &&
          typeof candidate.acquiredAtNs === 'string' &&
          /^[1-9]\d*$/.test(candidate.acquiredAtNs);
        if (!valid) {
          await unlinkObservedIdentity(
            candidatePath,
            publicationIdentity(candidateInfo),
            [1],
          );
          continue;
        }
        const liveCandidate = candidate as {
          pid: number;
          nonce: string;
          acquiredAtNs: string;
        };
        if (!processIsAlive(liveCandidate.pid)) {
          await unlinkObservedIdentity(
            candidatePath,
            publicationIdentity(candidateInfo),
            [1],
          );
          continue;
        }
        liveClaims.push({
          acquiredAtNs: BigInt(liveCandidate.acquiredAtNs),
          nonce: liveCandidate.nonce,
        });
      }
      if (initializingClaim) {
        await delay(PUBLICATION_LOCK_DELAY_MS);
        continue;
      }
      liveClaims.sort(
        (left, right) =>
          (left.acquiredAtNs < right.acquiredAtNs
            ? -1
            : left.acquiredAtNs > right.acquiredAtNs
              ? 1
              : 0) || left.nonce.localeCompare(right.nonce),
      );
      if (liveClaims[0]?.nonce === nonce) {
        acquired = true;
        break;
      }
      await delay(PUBLICATION_LOCK_DELAY_MS);
    }
    if (!acquired) {
      throw new Error('artifact publication lock timeout');
    }
    outcome = { ok: true, value: await operation() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  let cleanupError: unknown;
  try {
    await unlinkObservedIdentity(claimPath, claimIdentity, [1]);
  } catch (error) {
    cleanupError = error;
  }
  try {
    await rmdir(lockDirectory);
  } catch (error) {
    if (
      !isErrno(error, 'ENOENT') &&
      !isErrno(error, 'ENOTEMPTY') &&
      cleanupError === undefined
    ) {
      cleanupError = error;
    }
  }
  if (!outcome.ok) throw outcome.error;
  if (cleanupError !== undefined) throw cleanupError;
  return outcome.value;
}

function assertDestinationIdentity(
  info: Stats,
  identity: ArtifactPublicationIdentity,
): void {
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    info.mode & 0o077 ||
    info.dev !== identity.device ||
    info.ino !== identity.inode
  ) {
    throw new Error('artifact publication destination identity drift');
  }
}

async function readDescriptorBytes(
  handle: FileHandle,
  size: number,
): Promise<Buffer> {
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < bytes.length) {
    const { bytesRead } = await handle.read(
      bytes,
      offset,
      bytes.length - offset,
      offset,
    );
    if (bytesRead === 0) {
      throw new Error('artifact publication descriptor read was truncated');
    }
    offset += bytesRead;
  }
  return bytes;
}

async function verifyArtifactDescriptor(
  handle: FileHandle,
  snapshot: ArtifactSnapshot,
  identity: ArtifactPublicationIdentity,
  expectedLinks: readonly number[],
): Promise<Stats> {
  const expectedBytes = Buffer.from(snapshot.bytesBase64, 'base64');
  const initialInfo = await handle.stat();
  if (
    !initialInfo.isFile() ||
    initialInfo.mode & 0o077 ||
    !expectedLinks.includes(initialInfo.nlink) ||
    !matchesIdentity(initialInfo, identity) ||
    initialInfo.size !== expectedBytes.length
  ) {
    throw new Error('artifact publication descriptor identity is unsafe');
  }
  const verifiedBytes = await readDescriptorBytes(handle, initialInfo.size);
  if (digest(verifiedBytes) !== snapshot.digest) {
    throw new Error('artifact publication digest mismatch');
  }
  const finalInfo = await handle.stat();
  if (
    !finalInfo.isFile() ||
    finalInfo.mode & 0o077 ||
    !expectedLinks.includes(finalInfo.nlink) ||
    !matchesIdentity(finalInfo, identity) ||
    finalInfo.size !== expectedBytes.length
  ) {
    throw new Error('artifact publication descriptor identity is unsafe');
  }
  return finalInfo;
}

async function writeAllAt(
  handle: FileHandle,
  bytes: Buffer,
  start: number,
  end: number,
): Promise<void> {
  let offset = start;
  while (offset < end) {
    const { bytesWritten } = await handle.write(
      bytes,
      offset,
      end - offset,
      offset,
    );
    if (bytesWritten === 0) {
      throw new Error('artifact publication descriptor write was truncated');
    }
    offset += bytesWritten;
  }
}

async function verifyConsumedDestination(
  snapshot: ArtifactSnapshot,
  destination: string,
  identity: ArtifactPublicationIdentity,
): Promise<void> {
  const expectedBytes = Buffer.from(snapshot.bytesBase64, 'base64');
  const handle = await open(destination, constants.O_RDONLY | NOFOLLOW);
  try {
    const initialInfo = await handle.stat();
    if (
      !initialInfo.isFile() ||
      initialInfo.nlink !== 1 ||
      initialInfo.mode & 0o077 ||
      initialInfo.dev !== identity.device ||
      initialInfo.ino !== identity.inode ||
      initialInfo.size !== expectedBytes.length
    ) {
      throw new Error('artifact publication destination identity drift');
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
        throw new Error('artifact publication destination read was truncated');
      }
      offset += bytesRead;
    }
    if (digest(verifiedBytes) !== snapshot.digest) {
      throw new Error('artifact publication destination digest mismatch');
    }
    const descriptorInfo = await handle.stat();
    const pathInfo = await lstat(destination);
    if (
      !descriptorInfo.isFile() ||
      descriptorInfo.nlink !== 1 ||
      descriptorInfo.mode & 0o077 ||
      descriptorInfo.dev !== initialInfo.dev ||
      descriptorInfo.ino !== initialInfo.ino ||
      descriptorInfo.size !== expectedBytes.length ||
      !pathInfo.isFile() ||
      pathInfo.isSymbolicLink() ||
      pathInfo.nlink !== 1 ||
      pathInfo.mode & 0o077 ||
      pathInfo.dev !== descriptorInfo.dev ||
      pathInfo.ino !== descriptorInfo.ino ||
      pathInfo.size !== expectedBytes.length
    ) {
      throw new Error('artifact publication destination identity drift');
    }
  } finally {
    await handle.close();
  }
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
  reservationId: string,
  expectedIdentity: ArtifactPublicationIdentity | null = null,
  hooks: ArtifactPublicationHooks = {},
): Promise<ArtifactPublicationIdentity> {
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

  const paths = publicationPaths(snapshot, destination, reservationId);
  return withPublicationLock(paths.lockDirectory, async () => {
    if (expectedIdentity !== null) {
      const destinationInfo = await lstatIfPresent(destination);
      const proofInfo = await lstatIfPresent(paths.proof);
      if (destinationInfo !== null) {
        assertDestinationIdentity(destinationInfo, expectedIdentity);
        if (proofInfo === null) {
          await verifyConsumedDestination(
            snapshot,
            destination,
            expectedIdentity,
          );
          return expectedIdentity;
        }
      } else if (proofInfo === null) {
        throw new Error('artifact publication destination identity drift');
      }
    }

    let proofInfo = await lstatIfPresent(paths.proof);
    const initializationInfo = await lstatIfPresent(paths.initialization);
    if (proofInfo === null) {
      let initializationHandle: FileHandle;
      let created = false;
      try {
        initializationHandle = await open(
          paths.initialization,
          constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | NOFOLLOW,
          0o600,
        );
        created = true;
      } catch (error) {
        if (!isErrno(error, 'EEXIST')) throw error;
        initializationHandle = await open(
          paths.initialization,
          constants.O_RDWR | NOFOLLOW,
        );
      }
      try {
        const initialInfo = await initializationHandle.stat();
        const initializationIdentity = publicationIdentity(initialInfo);
        if (
          !initialInfo.isFile() ||
          initialInfo.nlink !== 1 ||
          initialInfo.mode & 0o077
        ) {
          throw new Error(
            'artifact publication initialization identity is unsafe',
          );
        }
        if (created) {
          await hooks.afterProofCreation?.(paths.initialization);
        }
        await initializationHandle.truncate(0);
        const partialEnd = Math.ceil(bytes.length / 2);
        await writeAllAt(initializationHandle, bytes, 0, partialEnd);
        await hooks.afterPartialProofWrite?.(paths.initialization);
        await writeAllAt(initializationHandle, bytes, partialEnd, bytes.length);
        await initializationHandle.sync();
        await verifyArtifactDescriptor(
          initializationHandle,
          snapshot,
          initializationIdentity,
          [1],
        );
        const initializationPathInfo = await lstat(paths.initialization);
        if (
          !initializationPathInfo.isFile() ||
          initializationPathInfo.isSymbolicLink() ||
          initializationPathInfo.nlink !== 1 ||
          !matchesIdentity(initializationPathInfo, initializationIdentity)
        ) {
          throw new Error('artifact publication initialization identity drift');
        }
        try {
          await link(paths.initialization, paths.proof);
        } catch (error) {
          if (!isErrno(error, 'EEXIST')) throw error;
        }
        proofInfo = await lstat(paths.proof);
        const linkedInitializationInfo = await lstat(paths.initialization);
        if (
          !proofInfo.isFile() ||
          proofInfo.isSymbolicLink() ||
          proofInfo.nlink !== 2 ||
          linkedInitializationInfo.nlink !== 2 ||
          !matchesIdentity(proofInfo, initializationIdentity) ||
          !matchesIdentity(linkedInitializationInfo, initializationIdentity)
        ) {
          throw new Error(
            'artifact publication initialized proof identity drift',
          );
        }
        await unlinkObservedIdentity(
          paths.initialization,
          initializationIdentity,
          [2],
        );
      } finally {
        await initializationHandle.close();
      }
      proofInfo = await lstat(paths.proof);
    } else if (initializationInfo !== null) {
      const proofIdentity = publicationIdentity(proofInfo);
      if (
        !initializationInfo.isFile() ||
        initializationInfo.isSymbolicLink() ||
        initializationInfo.nlink !== 2 ||
        proofInfo.nlink !== 2 ||
        !matchesIdentity(initializationInfo, proofIdentity)
      ) {
        throw new Error(
          'artifact publication initialization recovery identity drift',
        );
      }
      const recoveryHandle = await open(
        paths.proof,
        constants.O_RDONLY | NOFOLLOW,
      );
      try {
        await verifyArtifactDescriptor(
          recoveryHandle,
          snapshot,
          proofIdentity,
          [2],
        );
      } finally {
        await recoveryHandle.close();
      }
      await unlinkObservedIdentity(paths.initialization, proofIdentity, [2]);
      proofInfo = await lstat(paths.proof);
    }

    if (
      !proofInfo.isFile() ||
      proofInfo.isSymbolicLink() ||
      ![1, 2].includes(proofInfo.nlink) ||
      proofInfo.mode & 0o077
    ) {
      throw new Error('artifact publication proof identity is unsafe');
    }
    const proofIdentity = publicationIdentity(proofInfo);
    if (
      expectedIdentity !== null &&
      !matchesIdentity(proofInfo, expectedIdentity)
    ) {
      throw new Error('artifact publication temporary identity drift');
    }

    const handle = await open(paths.proof, constants.O_RDONLY | NOFOLLOW);
    try {
      let descriptorInfo = await verifyArtifactDescriptor(
        handle,
        snapshot,
        proofIdentity,
        [1, 2],
      );
      const proofPathInfo = await lstat(paths.proof);
      if (
        !proofPathInfo.isFile() ||
        proofPathInfo.isSymbolicLink() ||
        proofPathInfo.nlink !== descriptorInfo.nlink ||
        !matchesIdentity(proofPathInfo, proofIdentity)
      ) {
        throw new Error(
          'artifact publication temporary identity or link drift',
        );
      }

      if (descriptorInfo.nlink === 1) {
        await hooks.beforeCommit?.(paths.proof);
        descriptorInfo = await verifyArtifactDescriptor(
          handle,
          snapshot,
          proofIdentity,
          [1],
        );
        const preLinkPath = await lstat(paths.proof);
        if (
          !preLinkPath.isFile() ||
          preLinkPath.isSymbolicLink() ||
          preLinkPath.nlink !== 1 ||
          !matchesIdentity(preLinkPath, proofIdentity)
        ) {
          throw new Error(
            'artifact publication temporary identity or link drift',
          );
        }
        try {
          await link(paths.proof, destination);
        } catch (error) {
          if (!isErrno(error, 'EEXIST')) throw error;
          const destinationInfo = await lstat(destination);
          if (
            !destinationInfo.isFile() ||
            destinationInfo.isSymbolicLink() ||
            !matchesIdentity(destinationInfo, proofIdentity)
          ) {
            await unlinkObservedIdentity(paths.proof, proofIdentity, [1]);
            throw new Error('artifact publication destination already exists', {
              cause: error,
            });
          }
        }
      }

      descriptorInfo = await verifyArtifactDescriptor(
        handle,
        snapshot,
        proofIdentity,
        [2],
      );
      let destinationInfo = await lstat(destination);
      if (
        !destinationInfo.isFile() ||
        destinationInfo.isSymbolicLink() ||
        destinationInfo.mode & 0o077 ||
        destinationInfo.nlink !== 2 ||
        destinationInfo.size !== bytes.length ||
        !matchesIdentity(destinationInfo, proofIdentity)
      ) {
        throw new Error('artifact publication destination identity drift');
      }
      await hooks.afterCommit?.(paths.proof);
      descriptorInfo = await verifyArtifactDescriptor(
        handle,
        snapshot,
        proofIdentity,
        [2],
      );
      destinationInfo = await lstat(destination);
      if (
        !destinationInfo.isFile() ||
        destinationInfo.isSymbolicLink() ||
        destinationInfo.mode & 0o077 ||
        destinationInfo.nlink !== 2 ||
        destinationInfo.size !== bytes.length ||
        !matchesIdentity(destinationInfo, proofIdentity) ||
        !matchesIdentity(descriptorInfo, proofIdentity)
      ) {
        throw new Error('artifact publication destination identity drift');
      }
      return proofIdentity;
    } finally {
      await handle.close();
    }
  });
}

export async function cleanupAcceptedArtifactProof(
  snapshot: ArtifactSnapshot,
  destination: string,
  reservationId: string,
  identity: ArtifactPublicationIdentity,
  hooks: ArtifactCleanupHooks = {},
): Promise<void> {
  const paths = publicationPaths(snapshot, destination, reservationId);
  await withPublicationLock(paths.lockDirectory, async () => {
    const destinationInfo = await lstat(destination);
    assertDestinationIdentity(destinationInfo, identity);
    const proofInfo = await lstatIfPresent(paths.proof);
    if (proofInfo === null) {
      if (destinationInfo.nlink !== 1) {
        throw new Error('artifact publication destination link drift');
      }
      await verifyConsumedDestination(snapshot, destination, identity);
      return;
    }
    if (
      !proofInfo.isFile() ||
      proofInfo.isSymbolicLink() ||
      proofInfo.mode & 0o077 ||
      proofInfo.nlink !== 2 ||
      destinationInfo.nlink !== 2 ||
      !matchesIdentity(proofInfo, identity)
    ) {
      throw new Error('artifact publication temporary identity or link drift');
    }
    const proofHandle = await open(paths.proof, constants.O_RDONLY | NOFOLLOW);
    try {
      await verifyArtifactDescriptor(proofHandle, snapshot, identity, [2]);
    } finally {
      await proofHandle.close();
    }
    await unlinkObservedIdentity(paths.proof, identity, [2], async () => {
      await hooks.beforeUnlink?.(paths.proof);
    });
    const finalInfo = await lstat(destination);
    assertDestinationIdentity(finalInfo, identity);
    if (finalInfo.nlink !== 1) {
      throw new Error('artifact publication destination link drift');
    }
    await verifyConsumedDestination(snapshot, destination, identity);
  });
}
