import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProgram } from '../app/create-program';
import { registerCommands } from './index';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cli-int-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.cursor'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
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

async function seedCanonical(root: string): Promise<void> {
  await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
    'skill one',
    'utf8',
  );
  await mkdir(join(root, '.agents', 'agents', 'agent-one'), {
    recursive: true,
  });
  await writeFile(
    join(root, '.agents', 'agents', 'agent-one', 'AGENT.md'),
    'agent one',
    'utf8',
  );
}

describe('CLI command integration', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('init → status → sync → status: full workflow', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);

    const before = await runCli(root, ['status', '--json'], ['--json']);
    expect(before.exitCode).toBe(0);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.total).toBe(0);

    const sync = await runCli(root, ['sync', '--apply']);
    expect(sync.exitCode).toBe(0);

    const after = await runCli(root, ['status', '--json'], ['--json']);
    expect(after.exitCode).toBe(0);
    const payload = JSON.parse(after.stdout);
    expect(payload.summary.drifted).toBe(0);
    expect(payload.summary.missing).toBe(0);
    expect(payload.summary.stray).toBe(0);
    expect(payload.summary.inSync).toBeGreaterThan(0);
  });

  it('init on empty repo creates directories and empty manifest', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(root, ['init']);
    expect(result.exitCode).toBe(0);

    await expect(lstat(join(root, '.agents', 'skills'))).resolves.toBeDefined();
    await expect(lstat(join(root, '.agents', 'agents'))).resolves.toBeDefined();
    const manifestRaw = await readFile(
      join(root, '.oat', 'sync', 'manifest.json'),
      'utf8',
    );
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.entries).toEqual([]);
  });

  it('sync --apply creates symlinks for detected providers', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);

    const result = await runCli(root, ['sync', '--apply']);
    expect(result.exitCode).toBe(0);

    const claudeSkillStat = await lstat(
      join(root, '.claude', 'skills', 'skill-one'),
    );
    const cursorSkillStat = await lstat(
      join(root, '.cursor', 'skills', 'skill-one'),
    );
    const claudeAgentStat = await lstat(
      join(root, '.claude', 'agents', 'agent-one'),
    );
    const cursorAgentStat = await lstat(
      join(root, '.cursor', 'agents', 'agent-one'),
    );
    const codexAgentStat = await lstat(
      join(root, '.codex', 'agents', 'agent-one'),
    );

    expect(claudeSkillStat.isSymbolicLink()).toBe(true);
    expect(cursorSkillStat.isSymbolicLink()).toBe(true);
    expect(claudeAgentStat.isSymbolicLink()).toBe(true);
    expect(cursorAgentStat.isSymbolicLink()).toBe(true);
    expect(codexAgentStat.isSymbolicLink()).toBe(true);
  });

  it('status --json outputs valid JSON with no prompts', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);

    const result = await runCli(root, ['status', '--json'], ['--json']);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stderr).not.toContain('Adopt stray');
  });

  it('doctor on healthy setup reports all pass', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync', '--apply']);

    const result = await runCli(root, ['doctor', '--json'], ['--json']);
    const payload = JSON.parse(result.stdout);
    expect(
      payload.checks.every(
        (check: { status: string }) => check.status === 'pass',
      ),
    ).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('providers list shows all registered adapters', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    const result = await runCli(
      root,
      ['providers', 'list', '--json'],
      ['--json'],
    );
    const payload = JSON.parse(result.stdout);
    const names = payload.map((item: { name: string }) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(['claude', 'cursor', 'codex']),
    );
  });

  it('idempotency: init + sync twice produces same state', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);
    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync', '--apply']);

    const manifestPath = join(root, '.oat', 'sync', 'manifest.json');
    const before = await readFile(manifestPath, 'utf8');

    await runCli(root, ['init']);
    await runCli(root, ['sync', '--apply']);

    const after = await readFile(manifestPath, 'utf8');
    expect(after).toBe(before);
  });
});
