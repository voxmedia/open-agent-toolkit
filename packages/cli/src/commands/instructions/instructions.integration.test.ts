import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '@app/create-program';
import { EXPECTED_CLAUDE_CONTENT } from '@commands/instructions/instructions.utils';
import { afterEach, describe, expect, it } from 'vitest';
import { registerCommands } from '../index';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-instructions-int-'));
  await mkdir(join(root, '.git'), { recursive: true });
  return root;
}

async function runCli(
  root: string,
  args: string[],
  globalArgs: string[] = [],
): Promise<CliResult> {
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
    await program.parseAsync(
      ['--cwd', root, '--scope', 'project', ...globalArgs, ...args],
      { from: 'user' },
    );
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

describe('instructions command integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('missing CLAUDE.md -> sync --apply creates pointer -> validate passes', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');

    const before = await runCli(
      root,
      ['instructions', 'validate', '--json'],
      ['--json'],
    );
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.missing).toBe(1);

    const syncApply = await runCli(root, ['instructions', 'sync', '--apply']);
    expect(syncApply.exitCode).toBe(0);

    await expect(lstat(join(root, 'CLAUDE.md'))).resolves.toBeDefined();
    await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
      EXPECTED_CLAUDE_CONTENT,
    );

    const after = await runCli(
      root,
      ['instructions', 'validate', '--json'],
      ['--json'],
    );
    expect(after.exitCode).toBe(0);
    const afterPayload = JSON.parse(after.stdout);
    expect(afterPayload.status).toBe('ok');
    expect(afterPayload.summary.ok).toBe(1);
  });

  it('mismatch requires --force in dry-run and apply modes', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeFile(join(root, 'AGENTS.md'), '# root instructions\n', 'utf8');
    await writeFile(join(root, 'CLAUDE.md'), 'custom\n', 'utf8');

    const dryRun = await runCli(
      root,
      ['instructions', 'sync', '--json'],
      ['--json'],
    );
    expect(dryRun.exitCode).toBe(1);
    const dryRunPayload = JSON.parse(dryRun.stdout);
    expect(dryRunPayload.mode).toBe('dry-run');
    expect(dryRunPayload.actions).toHaveLength(1);
    expect(dryRunPayload.actions[0]).toMatchObject({
      type: 'skip',
      result: 'skipped',
    });

    const applyNoForce = await runCli(
      root,
      ['instructions', 'sync', '--apply', '--json'],
      ['--json'],
    );
    expect(applyNoForce.exitCode).toBe(1);
    const applyNoForcePayload = JSON.parse(applyNoForce.stdout);
    expect(applyNoForcePayload.mode).toBe('apply');
    expect(applyNoForcePayload.actions[0]).toMatchObject({
      type: 'skip',
      result: 'skipped',
    });

    const applyForce = await runCli(root, [
      'instructions',
      'sync',
      '--apply',
      '--force',
    ]);
    expect(applyForce.exitCode).toBe(0);
    await expect(readFile(join(root, 'CLAUDE.md'), 'utf8')).resolves.toBe(
      EXPECTED_CLAUDE_CONTENT,
    );
  });

  it('discovers nested AGENTS.md and excludes node_modules', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'packages', 'foo'), { recursive: true });
    await mkdir(join(root, 'packages', 'foo', 'node_modules', 'dep'), {
      recursive: true,
    });

    await writeFile(
      join(root, 'packages', 'foo', 'AGENTS.md'),
      '# include\n',
      'utf8',
    );
    await writeFile(
      join(root, 'packages', 'foo', 'node_modules', 'dep', 'AGENTS.md'),
      '# exclude\n',
      'utf8',
    );

    const result = await runCli(
      root,
      ['instructions', 'validate', '--json'],
      ['--json'],
    );
    expect(result.exitCode).toBe(1);

    const payload = JSON.parse(result.stdout);
    expect(payload.summary.scanned).toBe(1);
    expect(payload.entries[0].agentsPath).toContain('packages/foo/AGENTS.md');
  });

  it('accepts CRLF pointer content', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await writeFile(join(root, 'AGENTS.md'), '# root\n', 'utf8');
    await writeFile(join(root, 'CLAUDE.md'), '@AGENTS.md\r\n', 'utf8');

    const result = await runCli(
      root,
      ['instructions', 'validate', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('ok');
  });

  it('skips directory symlink cycles while scanning', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, 'pkg'), { recursive: true });
    await writeFile(join(root, 'pkg', 'AGENTS.md'), '# pkg\n', 'utf8');
    await symlink(root, join(root, 'loop')); // directory symlink back to root

    const result = await runCli(
      root,
      ['instructions', 'validate', '--json'],
      ['--json'],
    );

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.scanned).toBe(1);
  });
});
