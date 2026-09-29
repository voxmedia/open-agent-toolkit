import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import { EXPECTED_CLAUDE_CONTENT } from '@commands/instructions/instructions.utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `oat init` and `oat sync` may prompt; these runs are non-interactive.
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

/**
 * Every file and link under `root` as `path -> content | link target`, with
 * the temp root masked, leaving out `.git` and the `.oat` state that differs
 * by construction (the config under test and the manifest's timestamps).
 */
async function snapshotTree(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const key = relative(root, path).replaceAll('\\', '/');
      if (key === '.git' || key === '.oat') {
        continue;
      }
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        snapshot[key] =
          `link:${(await readlink(path)).replaceAll(root, '<root>')}`;
      } else if (stats.isDirectory()) {
        await walk(path);
      } else {
        snapshot[key] =
          `file:${(await readFile(path, 'utf8')).replaceAll(root, '<root>')}`;
      }
    }
  }
  await walk(root);
  return snapshot;
}

describe('provider sync is independent of instructions.claude.shims', () => {
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

  async function syncWithShims(
    shims: 'none' | 'pointer',
  ): Promise<{ root: string; snapshot: Record<string, string> }> {
    const root = await mkdtemp(
      join(tmpdir(), `oat-shim-independence-${shims}-`),
    );
    const home = await mkdtemp(join(tmpdir(), 'oat-shim-independence-home-'));
    tempDirs.push(root, home);
    process.env.HOME = home;
    for (const directory of ['.git', '.claude', '.cursor', '.codex']) {
      await mkdir(join(root, directory), { recursive: true });
    }

    expect((await runCli(root, ['init', '--scope', 'project'])).exitCode).toBe(
      0,
    );
    const set = await runCli(root, [
      'config',
      'set',
      'instructions.claude.shims',
      shims,
    ]);
    expect(set.exitCode, set.stderr).toBe(0);

    // Canonical content of every kind provider sync owns.
    await mkdir(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.agents', 'skills', 'skill-one', 'SKILL.md'),
      '---\nname: skill-one\ndescription: one\n---\n\n# Skill one\n',
    );
    await mkdir(join(root, '.agents', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'agents', 'agent-one.md'),
      '---\nname: agent-one\ndescription: one\n---\n\n# Agent one\n',
    );
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'rule-one.md'),
      '---\ndescription: one\nactivation: always\n---\n\n# Rule one\n',
    );

    // Instruction files instruction sync would act on under either setting:
    // under `none` it would remove the pkg pointer shim, and under `pointer`
    // it would create a root CLAUDE.md. Provider sync must do neither.
    await writeFile(join(root, 'AGENTS.md'), '# root instructions\n');
    await mkdir(join(root, 'pkg'), { recursive: true });
    await writeFile(join(root, 'pkg', 'AGENTS.md'), '# pkg instructions\n');
    await writeFile(join(root, 'pkg', 'CLAUDE.md'), EXPECTED_CLAUDE_CONTENT);

    const sync = await runCli(root, ['sync', '--scope', 'project']);
    expect(sync.exitCode, sync.stderr).toBe(0);

    return { root, snapshot: await snapshotTree(root) };
  }

  it('writes identical rules, skills, and agents under none and pointer, and never touches CLAUDE.md', async () => {
    const none = await syncWithShims('none');
    const pointer = await syncWithShims('pointer');

    expect(none.snapshot).toEqual(pointer.snapshot);

    for (const { root, snapshot } of [none, pointer]) {
      // Rules, skills, and agents really were synced.
      expect(
        Object.keys(snapshot).filter((path) =>
          path.startsWith('.claude/rules/'),
        ),
      ).not.toEqual([]);
      expect(
        Object.keys(snapshot).some((path) =>
          path.startsWith('.claude/skills/'),
        ),
      ).toBe(true);
      expect(
        Object.keys(snapshot).some((path) =>
          path.startsWith('.claude/agents/'),
        ),
      ).toBe(true);
      // No CLAUDE.md created, none removed.
      await expect(lstat(join(root, 'CLAUDE.md'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      await expect(
        readFile(join(root, 'pkg', 'CLAUDE.md'), 'utf8'),
      ).resolves.toBe(EXPECTED_CLAUDE_CONTENT);
      expect(
        Object.keys(snapshot).filter((path) => /(^|\/)CLAUDE\.md$/.test(path)),
      ).toEqual(['pkg/CLAUDE.md']);
    }
  });

  it('instruction sync under none leaves synced .claude/rules untouched and unreported', async () => {
    const { root, snapshot } = await syncWithShims('none');
    const rulesBefore = Object.fromEntries(
      Object.entries(snapshot).filter(([path]) =>
        path.startsWith('.claude/rules/'),
      ),
    );

    const instructions = await runCli(root, ['--json', 'instructions', 'sync']);
    expect(instructions.exitCode, instructions.stderr).toBe(0);
    const payload = JSON.parse(instructions.stdout) as {
      actions: Array<{ target: string }>;
      warnings?: unknown[];
    };
    // Only the pkg shim is removed; nothing under .claude is acted on or
    // named in a warning.
    expect(
      payload.actions.map((action) =>
        relative(root, action.target).replaceAll('\\', '/'),
      ),
    ).toEqual(['pkg/CLAUDE.md']);
    expect(JSON.stringify(payload.warnings ?? [])).not.toContain('.claude/');

    const after = await snapshotTree(root);
    expect(
      Object.fromEntries(
        Object.entries(after).filter(([path]) =>
          path.startsWith('.claude/rules/'),
        ),
      ),
    ).toEqual(rulesBefore);
  });
});
