import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, unlink } from 'node:fs/promises';
import { hostname } from 'node:os';
import { relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

/** Specific advisory serialization for cooperating AGENTS.md appenders. */
export async function acquireAgentsMdAppendLock(
  repoRoot: string,
  targetPath: string,
): Promise<() => Promise<void>> {
  const lockPath = `${targetPath}.oat-guidance.lock`;
  const location = relative(repoRoot, lockPath);
  const recovery = `Check the recorded host/PID and remove ${location} manually only after verifying its owner is gone, then rerun.`;
  const token = randomUUID();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let handle;
    try {
      handle = await open(
        lockPath,
        constants.O_RDWR |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW |
          constants.O_NONBLOCK,
        0o600,
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'EEXIST'
      ) {
        throw new Error(
          `AGENTS.md append lock could not be acquired. ${recovery}`,
        );
      }
      // Never steal, truncate, or follow a contender's lock, including stale locks.
      let reader;
      try {
        reader = await open(
          lockPath,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
        );
        const stat = await reader.stat();
        if (!stat.isFile() || stat.nlink !== 1 || stat.size > 4096)
          throw new Error('Unsafe lock');
        const content = await reader.readFile('utf8');
        if (content === '' && attempt < 39) {
          await delay(25);
          continue;
        }
        const owner = JSON.parse(content);
        if (
          typeof owner.token !== 'string' ||
          typeof owner.host !== 'string' ||
          !Number.isSafeInteger(owner.pid) ||
          owner.pid <= 0
        )
          throw new Error('Malformed lock');
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          continue;
        throw new Error(
          `AGENTS.md append lock is unsafe or malformed. ${recovery}`,
        );
      } finally {
        await reader?.close();
      }
      if (attempt < 39) await delay(25);
      continue;
    }
    const identity = await handle.stat();
    const bytes = JSON.stringify({ token, host: hostname(), pid: process.pid });
    let releasing: Promise<void> | undefined;
    let interrupted: 'SIGINT' | 'SIGTERM' | undefined;
    const onInt = () => {
      interrupted = 'SIGINT';
    };
    const onTerm = () => {
      interrupted = 'SIGTERM';
    };
    const release = (): Promise<void> => {
      releasing ??= (async () => {
        process.removeListener('SIGINT', onInt);
        process.removeListener('SIGTERM', onTerm);
        try {
          const current = await lstat(lockPath);
          if (
            current.isFile() &&
            current.nlink === 1 &&
            current.dev === identity.dev &&
            current.ino === identity.ino &&
            current.size === Buffer.byteLength(bytes) &&
            (await readOwnedBytes()) === bytes
          ) {
            const verified = await lstat(lockPath);
            if (verified.dev === identity.dev && verified.ino === identity.ino)
              await unlink(lockPath);
          }
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !('code' in error) ||
            error.code !== 'ENOENT'
          )
            throw error;
        } finally {
          await handle.close();
          if (interrupted) process.kill(process.pid, interrupted);
        }
      })();
      return releasing;
    };
    const readOwnedBytes = async () => {
      const buffer = Buffer.alloc(Buffer.byteLength(bytes));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      return buffer.subarray(0, bytesRead).toString('utf8');
    };
    try {
      await handle.writeFile(bytes);
    } catch (error) {
      // Initialization failed before returning ownership; remove only this inode.
      try {
        const current = await lstat(lockPath);
        if (current.dev === identity.dev && current.ino === identity.ino)
          await unlink(lockPath);
      } finally {
        await handle.close();
      }
      throw error;
    }
    // Cleanup runs after the critical section and on catchable termination.
    process.once('SIGINT', onInt);
    process.once('SIGTERM', onTerm);
    return release;
  }
  throw new Error(
    `AGENTS.md append lock is held by another writer. ${recovery}`,
  );
}
