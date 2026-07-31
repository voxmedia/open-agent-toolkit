import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  collectChangeMap,
  DefaultGitChangeMapAdapter,
  type GitChangeMapAdapter,
} from './change-map';

const exec = promisify(execFile);
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe('collectChangeMap', () => {
  it('collects authoritative metadata from a temporary repository', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-change-map-'));
    roots.push(root);
    await exec('git', ['init', '-q'], { cwd: root });
    await exec('git', ['config', 'user.email', 'test@example.com'], {
      cwd: root,
    });
    await exec('git', ['config', 'user.name', 'Test'], { cwd: root });
    await writeFile(join(root, 'modified.txt'), 'before\n');
    await writeFile(join(root, 'deleted.txt'), 'delete\n');
    await writeFile(join(root, 'renamed.txt'), 'rename\n');
    await exec('git', ['add', '.'], { cwd: root });
    await exec('git', ['commit', '-qm', 'base'], { cwd: root });
    const baseSha = (
      await exec('git', ['rev-parse', 'HEAD'], { cwd: root })
    ).stdout.trim();

    await writeFile(join(root, 'modified.txt'), 'after\n');
    await rm(join(root, 'deleted.txt'));
    await exec('git', ['mv', 'renamed.txt', 'moved.txt'], { cwd: root });
    await writeFile(join(root, 'added.bin'), Buffer.from([0, 1, 2]));
    await exec('git', ['add', '-A'], { cwd: root });
    await exec('git', ['commit', '-qm', 'head'], { cwd: root });
    const headSha = (
      await exec('git', ['rev-parse', 'HEAD'], { cwd: root })
    ).stdout.trim();

    const result = await collectChangeMap(
      {
        repoRoot: root,
        baseSha,
        headSha,
        remainingTokens: 1_000_000,
        outerBudgetMs: null,
        now: () => 0,
      },
      new DefaultGitChangeMapAdapter(),
    );
    expect(result.files.map((file) => file.status).sort()).toEqual([
      'added',
      'deleted',
      'modified',
      'renamed',
    ]);
    expect(result.files.some((file) => file.isBinary)).toBe(true);
    expect(result.totals.patchEstimateState).toBe('exact');
  });

  it('skips patch collection after a denial-only decision', async () => {
    const adapter: GitChangeMapAdapter = {
      nameStatus: vi.fn(async () => Buffer.from('A\0a.ts\0')),
      numstat: vi.fn(async () => Buffer.from('4\t4\ta.ts\0')),
      patch: vi.fn(),
    };
    const result = await collectChangeMap(
      {
        repoRoot: '.',
        baseSha: 'a'.repeat(40),
        headSha: 'b'.repeat(40),
        remainingTokens: null,
        outerBudgetMs: null,
      },
      adapter,
    );
    expect(result.totals.patchEstimateState).toBe('coarse-denied');
    expect(adapter.patch).not.toHaveBeenCalled();
  });

  it('surfaces Git collection failures', async () => {
    const adapter: GitChangeMapAdapter = {
      nameStatus: vi.fn(async () => {
        throw new Error('git unavailable');
      }),
      numstat: vi.fn(async () => Buffer.alloc(0)),
      patch: vi.fn(),
    };
    await expect(
      collectChangeMap(
        {
          repoRoot: '.',
          baseSha: 'a'.repeat(40),
          headSha: 'b'.repeat(40),
          remainingTokens: null,
          outerBudgetMs: null,
        },
        adapter,
      ),
    ).rejects.toThrow(/git unavailable/);
  });

  it('stops and awaits a stalled patch producer at the wall-clock deadline', async () => {
    let cleaned = false;
    const adapter: GitChangeMapAdapter = {
      nameStatus: async () => Buffer.from('M\0a.ts\0'),
      numstat: async () => Buffer.from('1\t1\ta.ts\0'),
      patch: async () => ({
        output: {
          [Symbol.asyncIterator]: () => ({
            next: () => new Promise(() => undefined),
          }),
        },
        stop: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          cleaned = true;
        },
      }),
    };
    const startedAt = Date.now();
    let clockCalls = 0;
    const result = await collectChangeMap(
      {
        repoRoot: '.',
        baseSha: 'a'.repeat(40),
        headSha: 'b'.repeat(40),
        remainingTokens: 1_000,
        outerBudgetMs: 0,
        now: () => Date.now() + (clockCalls++ === 0 ? 0 : 4_990),
      },
      adapter,
    );

    expect(result.totals).toMatchObject({
      patchEstimateState: 'lower-bound',
      patchByteLowerBound: 0,
    });
    expect(cleaned).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(500);
  });
});
