import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';

export interface OatRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the real `oat` program in-process against `cwd`, capturing stdout,
 * stderr and the exit code, as `commands.integration.test.ts` does.
 */
export async function runOat(
  cwd: string,
  args: string[],
  globalArgs: string[] = [],
): Promise<OatRunResult> {
  const program = createProgram();
  registerCommands(program);
  program.exitOverride();

  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
    chunk,
  ) => {
    stdout.push(String(chunk));
    return true;
  };
  (process.stderr.write as unknown as (chunk: unknown) => boolean) = (
    chunk,
  ) => {
    stderr.push(String(chunk));
    return true;
  };
  try {
    await program.parseAsync(['--cwd', cwd, ...globalArgs, ...args], {
      from: 'user',
    });
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }
  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;
  return { stdout: stdout.join(''), stderr: stderr.join(''), exitCode };
}

export function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** A git repository on `main` with one commit, ready for `oat project new`. */
export async function initMainRepo(root: string): Promise<void> {
  git(root, ['init', '-q', '--initial-branch=main']);
  git(root, ['config', 'user.email', 'oat-test@example.invalid']);
  git(root, ['config', 'user.name', 'OAT Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  await mkdir(join(root, '.oat'), { recursive: true });
  await writeFile(join(root, 'README.md'), '# fixture\n', 'utf8');
  git(root, ['add', 'README.md']);
  git(root, ['commit', '-q', '-m', 'initial']);
}
