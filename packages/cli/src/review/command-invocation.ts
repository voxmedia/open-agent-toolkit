import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';

import type { ReviewCommandInvocationV1 } from './types';
import { reviewerSafeEnvironment } from './validation-store-authority';

export interface CommandInvocationResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export async function executeCommandInvocation(
  invocation: ReviewCommandInvocationV1,
  options: {
    cwd?: string;
    environment?: NodeJS.ProcessEnv;
    stdin?: string;
  } = {},
): Promise<CommandInvocationResult> {
  if (!isAbsolute(invocation.cwd)) {
    throw new Error('command invocation cwd must be an absolute path');
  }
  if (options.cwd !== undefined && options.cwd !== invocation.cwd) {
    throw new Error(
      `command invocation cwd mismatch: expected ${invocation.cwd}, received ${options.cwd}`,
    );
  }
  if (invocation.stdin !== 'none' && options.stdin === undefined) {
    throw new Error(`${invocation.stdin} stdin is required`);
  }
  if (invocation.stdin === 'none' && options.stdin !== undefined) {
    throw new Error('command invocation does not accept stdin');
  }
  const child = spawn(invocation.executable, invocation.argv, {
    cwd: invocation.cwd,
    env: reviewerSafeEnvironment(options.environment),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  if (options.stdin === undefined) child.stdin.end();
  else child.stdin.end(options.stdin);
  const completed = await new Promise<{
    exitCode: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  });
  return {
    ...completed,
    stdout: Buffer.concat(stdout).toString('utf8'),
    stderr: Buffer.concat(stderr).toString('utf8'),
  };
}
