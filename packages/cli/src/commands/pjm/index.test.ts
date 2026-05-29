import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import { afterEach, describe, expect, it } from 'vitest';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const EXPECTED_FILES = [
  'current-state.md',
  'roadmap.md',
  'decision-record.md',
  'backlog/index.md',
  'backlog/completed.md',
  'backlog/items/.gitkeep',
  'backlog/archived/.gitkeep',
] as const;

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-pjm-command-'));
  await mkdir(join(root, '.git'), { recursive: true });
  return root;
}

async function runCli(root: string, args: string[]): Promise<CliResult> {
  const program = createProgram();
  registerCommands(program);

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stdoutChunks.push(String(chunk));
    return true;
  };
  (process.stderr.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stderrChunks.push(String(chunk));
    return true;
  };

  try {
    await program.parseAsync(['--cwd', root, ...args], { from: 'user' });
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    exitCode,
  };
}

describe('oat pjm init', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('is reachable from the registered program and initializes repo reference docs', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, ['--json', 'pjm', 'init']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const payload = JSON.parse(result.stdout);
    const referenceRoot = join(root, '.oat', 'repo', 'reference');
    expect(payload).toEqual({
      status: 'ok',
      referenceRoot,
      created: EXPECTED_FILES,
      skipped: [],
    });

    for (const relativePath of EXPECTED_FILES) {
      await expect(
        access(join(referenceRoot, relativePath)),
      ).resolves.toBeUndefined();
    }
    await expect(
      readFile(join(referenceRoot, 'decision-record.md'), 'utf8'),
    ).resolves.not.toContain('oat_template:');
  });

  it('supports a reference root override', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, [
      '--json',
      'pjm',
      'init',
      '--reference-root',
      'custom/reference',
    ]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    const referenceRoot = join(root, 'custom', 'reference');
    expect(payload.referenceRoot).toBe(referenceRoot);
    await expect(
      access(join(referenceRoot, 'current-state.md')),
    ).resolves.toBeUndefined();
  });
});
