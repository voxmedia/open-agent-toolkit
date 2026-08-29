import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliError } from '@errors/cli-error';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGitRunner, defaultGitRunner } from './git';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createRepository(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'oat-git-runner-'));
  tempDirs.push(directory);
  execFileSync('git', ['init', '-q'], { cwd: directory });
  return directory;
}

describe('GitRunner', () => {
  it('runs git with an argument array and trims output', async () => {
    const cwd = await createRepository();

    await expect(
      defaultGitRunner.run(['rev-parse', '--is-inside-work-tree'], { cwd }),
    ).resolves.toEqual({ stdout: 'true', stderr: '', code: 0 });
  });

  it('throws CliError with usage exit code for failed commands', async () => {
    const cwd = await createRepository();

    await expect(
      defaultGitRunner.run(['rev-parse', '--verify', 'missing-ref'], { cwd }),
    ).rejects.toMatchObject({ name: 'CliError', exitCode: 2 });
  });

  it('returns failed command output when failure is allowed', async () => {
    const cwd = await createRepository();

    const result = await defaultGitRunner.run(
      ['rev-parse', '--verify', 'missing-ref'],
      { cwd, allowFailure: true },
    );

    expect(result.code).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('fatal:');
  });

  it('passes arguments without a shell and stabilizes the Git environment', async () => {
    const execFile = vi.fn(
      (
        _file: string,
        _args: readonly string[],
        _options: object,
        callback: (error: null, stdout: string, stderr: string) => void,
      ) => {
        callback(null, ' output \n', '');
        return undefined;
      },
    );
    const runner = createGitRunner(execFile);

    await expect(
      runner.run(['status', '--porcelain'], {
        cwd: '/repo',
        env: {
          GIT_DIR: '/redirected/git-dir',
          GIT_INDEX_FILE: '/redirected/index',
          GIT_WORK_TREE: '/redirected/worktree',
          LANG: 'de_DE.UTF-8',
          LANGUAGE: 'de',
          LC_ALL: 'de_DE.UTF-8',
          OAT_GIT_RUNNER_TEST: 'override',
        },
      }),
    ).resolves.toEqual({ stdout: 'output', stderr: '', code: 0 });

    expect(execFile).toHaveBeenCalledOnce();
    expect(execFile.mock.calls[0]?.[0]).toBe('git');
    expect(execFile.mock.calls[0]?.[1]).toEqual(['status', '--porcelain']);
    expect(execFile.mock.calls[0]?.[2]).toMatchObject({
      cwd: '/repo',
      env: expect.objectContaining({
        PATH: expect.any(String),
        OAT_GIT_RUNNER_TEST: 'override',
      }),
    });
    expect(execFile.mock.calls[0]?.[2]).not.toHaveProperty('shell', true);
    const env = execFile.mock.calls[0]?.[2].env;
    expect(env).toMatchObject({
      LANG: 'C',
      LANGUAGE: 'C',
      LC_ALL: 'C',
      OAT_GIT_RUNNER_TEST: 'override',
    });
    expect(env).not.toHaveProperty('GIT_DIR');
    expect(env).not.toHaveProperty('GIT_INDEX_FILE');
    expect(env).not.toHaveProperty('GIT_WORK_TREE');
  });

  it('preserves a numeric exit code from an injected implementation', async () => {
    const execFile = vi.fn(
      (
        _file: string,
        _args: readonly string[],
        _options: object,
        callback: (
          error: Error & { code: number },
          stdout: string,
          stderr: string,
        ) => void,
      ) => {
        callback(
          Object.assign(new Error('failed'), { code: 17 }),
          'partial\n',
          'failure\n',
        );
        return undefined;
      },
    );
    const runner = createGitRunner(execFile);

    await expect(
      runner.run(['test'], { cwd: '/repo', allowFailure: true }),
    ).resolves.toEqual({ stdout: 'partial', stderr: 'failure', code: 17 });
    await expect(runner.run(['test'], { cwd: '/repo' })).rejects.toBeInstanceOf(
      CliError,
    );
  });

  it.each([false, true])(
    'classifies a missing Git executable as a system error when allowFailure=%s',
    async (allowFailure) => {
      const execFile = vi.fn(
        (
          _file: string,
          _args: readonly string[],
          _options: object,
          callback: (
            error: Error & { code: string },
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          callback(
            Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }),
            '',
            '',
          );
          return undefined;
        },
      );
      const runner = createGitRunner(execFile);

      await expect(
        runner.run(['status'], { cwd: '/repo', allowFailure }),
      ).rejects.toMatchObject({
        name: 'CliError',
        exitCode: 2,
        message: expect.stringMatching(
          /Unable to run the Git executable \(ENOENT\).*available on PATH/,
        ),
      });
    },
  );
});
