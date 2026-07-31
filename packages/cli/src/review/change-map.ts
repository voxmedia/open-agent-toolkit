import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import {
  mergeChangeMetadata,
  parseNameStatusZ,
  parseNumstatZ,
} from './git-metadata';
import {
  computePreparationDeadline,
  countPatchBytes,
  decidePatchCounting,
} from './patch-estimate';
import type { ChangeMapV1 } from './types';

export interface GitPatchStream {
  output: AsyncIterable<Uint8Array>;
  stop(): void | Promise<void>;
}

export interface GitChangeMapAdapter {
  nameStatus(repoRoot: string, range: string): Promise<Buffer>;
  numstat(repoRoot: string, range: string): Promise<Buffer>;
  patch(repoRoot: string, range: string): Promise<GitPatchStream>;
}

async function runGit(
  repoRoot: string,
  args: readonly string[],
): Promise<Buffer> {
  const child = spawn('git', args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (exitCode !== 0) {
    throw new Error(
      `git ${args[0] ?? 'command'} failed: ${Buffer.concat(stderr).toString('utf8').trim()}`,
    );
  }
  return Buffer.concat(stdout);
}

export class DefaultGitChangeMapAdapter implements GitChangeMapAdapter {
  nameStatus(repoRoot: string, range: string): Promise<Buffer> {
    return runGit(repoRoot, [
      'diff',
      '--name-status',
      '-z',
      '--find-renames',
      range,
    ]);
  }

  numstat(repoRoot: string, range: string): Promise<Buffer> {
    return runGit(repoRoot, [
      'diff',
      '--numstat',
      '-z',
      '--find-renames',
      range,
    ]);
  }

  async patch(repoRoot: string, range: string): Promise<GitPatchStream> {
    const child = spawn('git', ['diff', '--binary', '--no-ext-diff', range], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stderr: Buffer[] = [];
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    const completion = new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    const output = (async function* (): AsyncIterable<Uint8Array> {
      for await (const chunk of child.stdout) yield chunk as Buffer;
      const exitCode = await completion;
      if (exitCode !== 0 && child.signalCode === null) {
        throw new Error(
          `git diff failed: ${Buffer.concat(stderr).toString('utf8').trim()}`,
        );
      }
    })();
    return {
      output,
      stop: async () => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        child.kill('SIGTERM');
        await Promise.race([
          completion.then(() => undefined),
          delay(1_000).then(async () => {
            if (child.exitCode === null && child.signalCode === null) {
              child.kill('SIGKILL');
            }
            await completion;
          }),
        ]);
      },
    };
  }
}

export async function collectChangeMap(
  input: {
    repoRoot: string;
    baseSha: string;
    headSha: string;
    remainingTokens: number | null;
    outerBudgetMs: number | null;
    now?: () => number;
  },
  adapter: GitChangeMapAdapter = new DefaultGitChangeMapAdapter(),
): Promise<ChangeMapV1> {
  if (
    !/^[0-9a-f]{40}$/.test(input.baseSha) ||
    !/^[0-9a-f]{40}$/.test(input.headSha)
  ) {
    throw new Error('change map range requires full lowercase SHAs');
  }
  const range = `${input.baseSha}..${input.headSha}`;
  const [statusOutput, numstatOutput] = await Promise.all([
    adapter.nameStatus(input.repoRoot, range),
    adapter.numstat(input.repoRoot, range),
  ]);
  const merged = mergeChangeMetadata(
    parseNameStatusZ(statusOutput),
    parseNumstatZ(numstatOutput),
  );
  const decision = decidePatchCounting({
    additions: merged.totals.additions,
    deletions: merged.totals.deletions,
    remainingTokens: input.remainingTokens,
  });

  if (decision.kind === 'coarse-denied') {
    return {
      files: merged.files,
      totals: {
        files: merged.files.length,
        ...merged.totals,
        patchBytes: null,
        patchByteLowerBound: null,
        patchEstimateState: 'coarse-denied',
        patchCountingSkippedReason: decision.reason,
        estimatedPatchTokens: null,
      },
    };
  }

  const now = input.now ?? Date.now;
  const stream = await adapter.patch(input.repoRoot, range);
  const estimate = await countPatchBytes(stream.output, {
    deadlineMs: computePreparationDeadline(now(), input.outerBudgetMs),
    now,
    stop: stream.stop,
  });
  return {
    files: merged.files,
    totals: {
      files: merged.files.length,
      ...merged.totals,
      patchBytes: estimate.patchBytes,
      patchByteLowerBound: estimate.patchByteLowerBound,
      patchEstimateState: estimate.patchEstimateState,
      patchCountingSkippedReason: null,
      estimatedPatchTokens: estimate.estimatedPatchTokens,
    },
  };
}
