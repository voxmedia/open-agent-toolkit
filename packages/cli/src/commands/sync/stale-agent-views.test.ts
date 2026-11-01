import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import { inProcessSyncDependencies } from '@commands/tools/shared/in-process-sync';
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

/** Every file and link under `root` except `.git`, as `path -> content`. */
async function snapshotTree(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const key = relative(root, path).replaceAll('\\', '/');
      if (key === '.git') {
        continue;
      }
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        snapshot[key] = `link:${await readlink(path)}`;
      } else if (stats.isDirectory()) {
        await walk(path);
      } else {
        snapshot[key] = `file:${await readFile(path, 'utf8')}`;
      }
    }
  }
  await walk(root);
  return snapshot;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

const AGENT_VIEW_DIRECTORIES = [
  '.claude/agents',
  '.cursor/agents',
  '.github/agents',
] as const;

function agentViews(name: string): string[] {
  return AGENT_VIEW_DIRECTORIES.map((directory) => `${directory}/${name}.md`);
}

function canonicalAgent(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} role\n---\n\n# ${name}\n`;
}

async function codexAgentTables(root: string): Promise<string[]> {
  const config = await readFile(join(root, '.codex', 'config.toml'), 'utf8');
  return [...config.matchAll(/^\[agents\.([^\]]+)\]$/gmu)]
    .map((match) => match[1]!)
    .sort();
}

/** Codex state sync must leave alone: a user table and an ownerless role. */
async function seedCodexNeighbours(root: string): Promise<void> {
  await writeFile(
    join(root, '.codex', 'agents', 'legacy-agent.toml'),
    '# oat-managed: true\n# oat-role: legacy-agent\ndeveloper_instructions = "old"\n',
  );
  const config = await readFile(join(root, '.codex', 'config.toml'), 'utf8');
  await writeFile(
    join(root, '.codex', 'config.toml'),
    `${config}\n[agents.custom]\ndescription = "mine"\nconfig_file = "agents/custom.toml"\n\n[agents.legacy-agent]\ndescription = "old"\nconfig_file = "agents/legacy-agent.toml"\n`,
  );
}

async function expectCodexCleaned(
  root: string,
  remaining: string[],
): Promise<void> {
  expect(await pathExists(join(root, '.codex/agents/agent-one.toml'))).toBe(
    false,
  );
  expect(await pathExists(join(root, '.codex/agents/legacy-agent.toml'))).toBe(
    true,
  );
  expect(await codexAgentTables(root)).toEqual(
    ['custom', 'legacy-agent', ...remaining].sort(),
  );
}

describe('sync after a canonical agent is deleted or renamed', () => {
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

  async function syncedRepository(): Promise<string> {
    const root = await realpath(
      await mkdtemp(join(tmpdir(), 'oat-stale-agent-views-')),
    );
    const home = await mkdtemp(join(tmpdir(), 'oat-stale-agent-views-home-'));
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
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'agent-one.md'),
      canonicalAgent('agent-one'),
    );

    const sync = await runCli(root, ['sync', '--scope', 'project']);
    expect(sync.exitCode, sync.stderr).toBe(0);
    for (const view of agentViews('agent-one')) {
      expect(await pathExists(join(root, view)), view).toBe(true);
    }
    await expect(
      readFile(join(root, '.codex', 'agents', 'agent-one.toml'), 'utf8'),
    ).resolves.toMatch(
      /^# oat-managed: true\n# oat-role: agent-one\n# oat-owner: project-config\n/,
    );
    await seedCodexNeighbours(root);
    return root;
  }

  async function changeCanonicalAgent(
    root: string,
    change: 'delete' | 'rename',
  ): Promise<void> {
    const source = join(root, '.agents', 'agents', 'agent-one.md');
    if (change === 'delete') {
      await rm(source);
      return;
    }
    const target = join(root, '.agents', 'agents', 'agent-two.md');
    await rename(source, target);
    await writeFile(target, canonicalAgent('agent-two'));
  }

  it.each(['delete', 'rename'] as const)(
    'after %s: dry-run lists the stale view removals and writes nothing',
    async (change) => {
      const root = await syncedRepository();
      await changeCanonicalAgent(root, change);
      const before = await snapshotTree(root);

      const dryRun = await runCli(root, [
        '--json',
        'sync',
        '--scope',
        'project',
        '--dry-run',
      ]);

      expect(dryRun.stderr).not.toContain('escapes the sync scope');
      expect(dryRun.exitCode, dryRun.stderr).toBe(0);
      const payload = JSON.parse(dryRun.stdout) as {
        plans: Array<{
          removals: Array<{ providerPath: string; operation: string }>;
        }>;
        codexExtensions: Array<{
          operations: Array<{
            action: string;
            target: string;
            path: string;
            reason: string;
          }>;
        }>;
      };
      const removals = payload.plans
        .flatMap((plan) => plan.removals)
        .filter(({ operation }) => operation === 'remove')
        .map(({ providerPath }) => relative(root, providerPath))
        .sort();
      expect(removals).toEqual(agentViews('agent-one').sort());
      const codexOperations = payload.codexExtensions.flatMap(
        ({ operations }) => operations,
      );
      expect(
        codexOperations
          .filter(({ action }) => action === 'remove')
          .map(({ path }) => path),
      ).toEqual(['.codex/agents/agent-one.toml']);
      expect(
        codexOperations.find(({ target }) => target === 'config'),
      ).toMatchObject({
        action: 'update',
        reason: expect.stringContaining(
          'removes stale role tables: agents.agent-one',
        ),
      });

      const human = await runCli(root, [
        'sync',
        '--scope',
        'project',
        '--dry-run',
      ]);
      expect(human.exitCode, human.stderr).toBe(0);
      expect(human.stdout).toContain(
        'codex:role:remove .codex/agents/agent-one.toml',
      );
      expect(human.stdout).toContain('agents.agent-one');
      expect(await snapshotTree(root)).toEqual(before);
    },
  );

  it.each(['some', 'the last'] as const)(
    'pack removal of %s canonical agent removes its views, Codex role, and table',
    async (label) => {
      const root = await syncedRepository();
      if (label === 'some') {
        await writeFile(
          join(root, '.agents', 'agents', 'agent-keep.md'),
          canonicalAgent('agent-keep'),
        );
        const sync = await runCli(root, ['sync', '--scope', 'project']);
        expect(sync.exitCode, sync.stderr).toBe(0);
      }
      await rm(join(root, '.agents', 'agents', 'agent-one.md'));

      const previousExitCode = process.exitCode;
      const evidence = await inProcessSyncDependencies.runSync({
        scope: 'project',
        cwd: root,
        home: process.env.HOME!,
        removedCanonicalPaths: ['.agents/agents/agent-one.md'],
      });
      process.exitCode = previousExitCode;

      expect(evidence?.failedOperations ?? 0).toBe(0);
      for (const view of agentViews('agent-one')) {
        expect(await pathExists(join(root, view)), view).toBe(false);
      }
      await expectCodexCleaned(root, label === 'some' ? ['agent-keep'] : []);
      if (label === 'some') {
        expect(
          await pathExists(join(root, '.codex/agents/agent-keep.toml')),
        ).toBe(true);
      }
    },
  );

  it('pack removal removes the role a removed agent declared under a different name', async () => {
    const root = await syncedRepository();
    await writeFile(
      join(root, '.agents', 'agents', 'agent-one.md'),
      canonicalAgent('declared-role'),
    );
    await writeFile(
      join(root, '.agents', 'agents', 'keep.md'),
      canonicalAgent('agent-one'),
    );
    const sync = await runCli(root, ['sync', '--scope', 'project']);
    expect(sync.exitCode, sync.stderr).toBe(0);
    expect(
      await pathExists(join(root, '.codex/agents/declared-role.toml')),
    ).toBe(true);
    await rm(join(root, '.agents', 'agents', 'agent-one.md'));

    const previousExitCode = process.exitCode;
    const evidence = await inProcessSyncDependencies.runSync({
      scope: 'project',
      cwd: root,
      home: process.env.HOME!,
      removedCanonicalPaths: ['.agents/agents/agent-one.md'],
    });
    process.exitCode = previousExitCode;

    expect(evidence?.failedOperations ?? 0).toBe(0);
    expect(
      await pathExists(join(root, '.codex/agents/declared-role.toml')),
    ).toBe(false);
    await expect(
      readFile(join(root, '.codex', 'agents', 'agent-one.toml'), 'utf8'),
    ).resolves.toContain('# oat-role: agent-one');
    expect(
      await pathExists(join(root, '.codex/agents/legacy-agent.toml')),
    ).toBe(true);
    expect(await codexAgentTables(root)).toEqual([
      'agent-one',
      'custom',
      'legacy-agent',
    ]);
  });

  it.each(['delete', 'rename'] as const)(
    'after %s: sync removes the stale views and exits 0',
    async (change) => {
      const root = await syncedRepository();
      await changeCanonicalAgent(root, change);

      const sync = await runCli(root, ['sync', '--scope', 'project']);

      expect(sync.stderr).not.toContain('escapes the sync scope');
      expect(sync.exitCode, sync.stderr).toBe(0);
      for (const view of agentViews('agent-one')) {
        expect(await pathExists(join(root, view)), view).toBe(false);
      }
      for (const view of agentViews('agent-two')) {
        expect(await pathExists(join(root, view)), view).toBe(
          change === 'rename',
        );
      }
      await expectCodexCleaned(root, change === 'rename' ? ['agent-two'] : []);
      expect(await pathExists(join(root, '.codex/agents/agent-two.toml'))).toBe(
        change === 'rename',
      );

      const second = await runCli(root, [
        '--json',
        'sync',
        '--scope',
        'project',
        '--dry-run',
      ]);
      expect(second.exitCode, second.stderr).toBe(0);
      const payload = JSON.parse(second.stdout) as {
        summary: { plannedOperations: number };
      };
      expect(payload.summary.plannedOperations).toBe(0);
    },
  );
});
