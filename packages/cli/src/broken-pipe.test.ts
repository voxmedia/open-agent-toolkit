import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { exitQuietlyOnBrokenPipe } from './index';

function builtCliEntry(): string {
  const entry = fileURLToPath(new URL('../dist/index.js', import.meta.url));
  if (!existsSync(entry)) {
    throw new Error(
      `Missing built CLI at ${entry}. This test spawns the real CLI; run ` +
        '`pnpm --filter @open-agent-toolkit/cli build` first (turbo already ' +
        'orders build before test).',
    );
  }
  return entry;
}

interface ClosedReaderRun {
  readonly code: number;
  readonly firstLine: string;
  readonly stderr: string;
}

/**
 * Runs the CLI as `oat <args> | head -1`. A shell pipe is what users hit; a
 * stdio pipe from `spawn` is a socket on macOS, where an early hang-up can
 * surface as ENOTCONN instead of EPIPE.
 */
async function runWithReaderClosingAfterFirstLine(
  args: readonly string[],
  cwd: string,
  home: string,
): Promise<ClosedReaderRun> {
  const outputs = await mkdtemp(join(tmpdir(), 'oat-broken-pipe-out-'));
  try {
    const stderrPath = join(outputs, 'stderr');
    const codePath = join(outputs, 'code');
    const firstLine = execFileSync(
      'sh',
      [
        '-c',
        '{ "$OAT_NODE" "$OAT_ENTRY" "$@" 2>"$OAT_STDERR"; echo $? >"$OAT_CODE"; } | head -1',
        'sh',
        ...args,
      ],
      {
        cwd,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          NO_COLOR: '1',
          OAT_NODE: process.execPath,
          OAT_ENTRY: builtCliEntry(),
          OAT_STDERR: stderrPath,
          OAT_CODE: codePath,
        },
      },
    ).trimEnd();
    return {
      code: Number((await readFile(codePath, 'utf8')).trim()),
      firstLine,
      stderr: await readFile(stderrPath, 'utf8'),
    };
  } finally {
    await rm(outputs, { recursive: true, force: true });
  }
}

describe('closed stdout', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('exits quietly when the reader closes after the first line', async () => {
    const home = await mkdtemp(join(tmpdir(), 'oat-broken-pipe-home-'));
    const repo = await mkdtemp(join(tmpdir(), 'oat-broken-pipe-repo-'));
    tempDirs.push(home, repo);
    execFileSync('git', ['init', '-q'], { cwd: repo });

    const run = await runWithReaderClosingAfterFirstLine(
      ['tools', 'list'],
      repo,
      home,
    );

    expect(run.firstLine).not.toBe('');
    expect(run.stderr).not.toContain('EPIPE');
    expect({ code: run.code, stderr: run.stderr }).toEqual({
      code: 0,
      stderr: '',
    });
  });
});

describe('exitQuietlyOnBrokenPipe', () => {
  function streamError(code: string): NodeJS.ErrnoException {
    return Object.assign(new Error(`write ${code}`), { code });
  }

  it('exits with status 0 on EPIPE', () => {
    const stream = new PassThrough() as unknown as NodeJS.WriteStream;
    const exit = vi.fn();
    exitQuietlyOnBrokenPipe(stream, exit);

    stream.emit('error', streamError('EPIPE'));

    expect(exit).toHaveBeenCalledWith(0);
  });

  it('keeps any other stream error fatal', () => {
    const stream = new PassThrough() as unknown as NodeJS.WriteStream;
    const exit = vi.fn();
    exitQuietlyOnBrokenPipe(stream, exit);

    expect(() => stream.emit('error', streamError('EIO'))).toThrow('write EIO');
    expect(exit).not.toHaveBeenCalled();
  });
});
