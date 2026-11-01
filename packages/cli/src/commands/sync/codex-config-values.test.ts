import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import TOML from '@iarna/toml';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(async () => []),
  confirm: vi.fn(async () => false),
}));

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(root: string, args: string[]): Promise<CliResult> {
  const program = createProgram();
  registerCommands(program);

  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const stdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stdout.push(String(chunk));
    return true;
  };
  (process.stderr.write as unknown as (chunk: unknown) => boolean) = (
    chunk: unknown,
  ) => {
    stderr.push(String(chunk));
    return true;
  };
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: false,
  });

  try {
    await program.parseAsync(['--cwd', root, ...args], { from: 'user' });
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    if (stdinIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', stdinIsTTY);
    }
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;
  return { stdout: stdout.join(''), stderr: stderr.join(''), exitCode };
}

interface SyncPayload {
  codexExtensions: Array<{
    operations: Array<{ action: string; target: string; reason: string }>;
  }>;
}

function codexConfigOperation(stdout: string) {
  const payload = JSON.parse(stdout) as SyncPayload;
  return payload.codexExtensions
    .flatMap(({ operations }) => operations)
    .find(({ target }) => target === 'config');
}

const CONFLICT_LINE =
  'conflict: kept features.multi_agent = false (OAT-managed Codex roles need true)';
const NOTE_LINE =
  'note: kept agents.max_depth = 1 (this disables only optional nested work)';

describe('sync keeps user Codex multi_agent and max_depth values', () => {
  const tempDirs: string[] = [];
  const previousHome = process.env.HOME;

  afterEach(async () => {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function repositoryWithCodexConfig(config: string): Promise<string> {
    const root = await realpath(
      await mkdtemp(join(tmpdir(), 'oat-codex-config-values-')),
    );
    const home = await mkdtemp(join(tmpdir(), 'oat-codex-config-home-'));
    tempDirs.push(root, home);
    process.env.HOME = home;
    await mkdir(join(root, '.git'), { recursive: true });
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex', 'config.toml'), config);
    await mkdir(join(root, '.oat', 'sync'), { recursive: true });
    await writeFile(
      join(root, '.oat', 'sync', 'config.json'),
      `${JSON.stringify({
        version: 1,
        defaultStrategy: 'auto',
        providers: { codex: { enabled: true } },
      })}\n`,
    );
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'agent-one.md'),
      '---\nname: agent-one\ndescription: one\n---\n\n# Agent one\n',
    );
    return root;
  }

  it.each([
    {
      label: 'tables',
      config:
        '# mine\n[features]\nmulti_agent = false\n\n[agents]\nmax_depth = 1\n',
    },
    {
      label: 'dotted keys',
      config: 'features.multi_agent = false\nagents.max_depth = 1\n',
    },
  ])(
    'keeps multi_agent = false and max_depth = 1 and names them ($label)',
    async ({ config }) => {
      const root = await repositoryWithCodexConfig(config);

      const dryRun = await runCli(root, [
        'sync',
        '--scope',
        'project',
        '--dry-run',
      ]);
      expect(dryRun.exitCode, dryRun.stderr).toBe(0);
      expect(dryRun.stdout).toContain(CONFLICT_LINE);
      expect(dryRun.stdout).toContain(NOTE_LINE);

      const dryRunJson = await runCli(root, [
        '--json',
        'sync',
        '--scope',
        'project',
        '--dry-run',
      ]);
      expect(codexConfigOperation(dryRunJson.stdout)?.reason).toContain(
        CONFLICT_LINE,
      );

      const apply = await runCli(root, ['sync', '--scope', 'project']);
      expect(apply.exitCode, apply.stderr).toBe(0);
      expect(apply.stdout).toContain(CONFLICT_LINE);
      expect(apply.stdout).toContain(NOTE_LINE);
      const written = await readFile(
        join(root, '.codex', 'config.toml'),
        'utf8',
      );
      expect(written.startsWith(config)).toBe(true);
      const parsed = TOML.parse(written) as Record<
        string,
        Record<string, unknown>
      >;
      expect(parsed.features!.multi_agent).toBe(false);
      expect(parsed.agents!.max_depth).toBe(1);
      expect(parsed.agents!['agent-one']).toEqual({
        description: 'one',
        config_file: 'agents/agent-one.toml',
      });
      await expect(
        readFile(join(root, '.codex', 'agents', 'agent-one.toml'), 'utf8'),
      ).resolves.toContain('# oat-role: agent-one');

      const again = await runCli(root, [
        '--json',
        'sync',
        '--scope',
        'project',
      ]);
      expect(again.exitCode, again.stderr).toBe(0);
      expect(codexConfigOperation(again.stdout)).toMatchObject({
        action: 'skip',
        reason: expect.stringContaining(CONFLICT_LINE),
      });
      expect(codexConfigOperation(again.stdout)?.reason).toContain(NOTE_LINE);
      expect(await readFile(join(root, '.codex', 'config.toml'), 'utf8')).toBe(
        written,
      );
    },
  );

  it('adds absent keys and names each one', async () => {
    const root = await repositoryWithCodexConfig('model = "gpt-5.6-sol"\n');

    const apply = await runCli(root, ['--json', 'sync', '--scope', 'project']);

    expect(apply.exitCode, apply.stderr).toBe(0);
    const reason = codexConfigOperation(apply.stdout)?.reason;
    expect(reason).toContain('added features.multi_agent = true');
    expect(reason).toContain('added agents.max_depth = 2');
    const written = await readFile(join(root, '.codex', 'config.toml'), 'utf8');
    expect(written).toContain('multi_agent = true');
    expect(written).toContain('max_depth = 2');
  });
});
