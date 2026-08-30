import {
  execFile,
  type ExecFileException,
  type ExecFileOptionsWithStringEncoding,
} from 'node:child_process';

import { CliError } from '@errors/cli-error';

export interface GitResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface GitRunOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  allowFailure?: boolean;
}

export interface GitRunner {
  run(args: string[], options: GitRunOptions): Promise<GitResult>;
}

export type ExecFileImplementation = (
  file: string,
  args: readonly string[],
  options: ExecFileOptionsWithStringEncoding,
  callback: (
    error: ExecFileException | null,
    stdout: string,
    stderr: string,
  ) => void,
) => unknown;

function numericExitCode(error: ExecFileException | null): number {
  return typeof error?.code === 'number' ? error.code : 0;
}

function spawnFailure(error: ExecFileException): CliError {
  const code = typeof error.code === 'string' ? ` (${error.code})` : '';
  return new CliError(
    `Unable to run the Git executable${code}: ${error.message || 'unknown process spawn error'}. Install Git and ensure it is available on PATH.`,
    2,
  );
}

function gitEnvironment(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...overrides,
    LANG: 'C',
    LANGUAGE: 'C',
    LC_ALL: 'C',
  };
  for (const variable of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_NAMESPACE',
    'GIT_CEILING_DIRECTORIES',
  ]) {
    delete env[variable];
  }
  return env;
}

export function createGitRunner(
  execFileImpl: ExecFileImplementation = execFile,
): GitRunner {
  return {
    async run(args, options) {
      const result = await new Promise<GitResult>((resolve, reject) => {
        execFileImpl(
          'git',
          args,
          {
            cwd: options.cwd,
            env: gitEnvironment(options.env),
            encoding: 'utf8',
          },
          (error, stdout, stderr) => {
            if (error && typeof error.code !== 'number') {
              reject(spawnFailure(error));
              return;
            }
            resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              code: numericExitCode(error),
            });
          },
        );
      });

      if (result.code !== 0 && !options.allowFailure) {
        const detail = result.stderr || result.stdout || 'unknown git error';
        throw new CliError(
          `git ${args.join(' ')} failed (exit ${result.code}): ${detail}`,
          2,
        );
      }

      return result;
    },
  };
}

export const defaultGitRunner = createGitRunner();
