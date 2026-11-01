import {
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
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

interface StatusPayload {
  reports: Array<{
    provider: string;
    providerPath: string;
    state: { status: string; reason?: string };
  }>;
  summary: { drifted: number };
}

function canonicalAgent(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} role\n---\n\n# ${name}\n`;
}

describe('status after a canonical agent is deleted or renamed', () => {
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

  it.each(['delete', 'rename'] as const)(
    'after %s: reports the stale views as pending instead of failing, and is clean after sync',
    async (change) => {
      const root = await realpath(
        await mkdtemp(join(tmpdir(), 'oat-status-stale-agent-')),
      );
      const home = await mkdtemp(join(tmpdir(), 'oat-status-stale-home-'));
      tempDirs.push(root, home);
      process.env.HOME = home;
      for (const directory of [
        '.git',
        '.claude',
        '.cursor',
        '.codex',
        '.github',
      ]) {
        await mkdir(join(root, directory), { recursive: true });
      }
      await mkdir(join(root, '.oat', 'sync'), { recursive: true });
      await writeFile(
        join(root, '.oat', 'sync', 'config.json'),
        `${JSON.stringify({
          version: 1,
          defaultStrategy: 'auto',
          providers: {
            claude: { enabled: true },
            cursor: { enabled: true },
            codex: { enabled: true },
            copilot: { enabled: true },
          },
        })}\n`,
      );
      const source = join(root, '.agents', 'agents', 'agent-one.md');
      await mkdir(join(root, '.agents', 'agents'), { recursive: true });
      await writeFile(source, canonicalAgent('agent-one'));
      const initial = await runCli(root, ['sync', '--scope', 'project']);
      expect(initial.exitCode, initial.stderr).toBe(0);

      if (change === 'delete') {
        await rm(source);
      } else {
        const target = join(root, '.agents', 'agents', 'agent-two.md');
        await rename(source, target);
        await writeFile(target, canonicalAgent('agent-two'));
      }

      const pending = await runCli(root, [
        '--json',
        'status',
        '--scope',
        'project',
      ]);
      expect(pending.stderr).not.toContain('escapes the sync scope');
      const pendingPayload = JSON.parse(pending.stdout) as StatusPayload;
      expect(
        pendingPayload.reports
          .filter(({ state }) => state.status === 'drifted')
          .map(({ providerPath }) => providerPath),
      ).toEqual(
        expect.arrayContaining([
          '.claude/agents/agent-one.md',
          '.cursor/agents/agent-one.md',
          '.github/agents/agent-one.md',
        ]),
      );

      const human = await runCli(root, ['status', '--scope', 'project']);
      expect(human.stderr).not.toContain('escapes the sync scope');
      expect(human.stdout).toContain('agent-one.md');

      const sync = await runCli(root, ['sync', '--scope', 'project']);
      expect(sync.exitCode, sync.stderr).toBe(0);

      const settled = await runCli(root, [
        '--json',
        'status',
        '--scope',
        'project',
      ]);
      expect(settled.stderr).not.toContain('escapes the sync scope');
      expect(settled.exitCode, settled.stdout).toBe(0);
      const settledPayload = JSON.parse(settled.stdout) as StatusPayload;
      expect(
        settledPayload.reports.filter(({ providerPath }) =>
          providerPath.endsWith('/agent-one.md'),
        ),
      ).toEqual([]);
      expect(settledPayload.summary.drifted).toBe(0);
    },
  );
});
