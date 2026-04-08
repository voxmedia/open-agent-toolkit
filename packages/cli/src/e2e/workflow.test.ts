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

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import type { SyncConfig } from '@config/index';
import { checkbox, confirm } from '@inquirer/prompts';
import type { Manifest } from '@manifest/index';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(async () => []),
  confirm: vi.fn(async () => false),
}));

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const mockedConfirm = vi.mocked(confirm);
const mockedCheckbox = vi.mocked(checkbox);

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-cli-e2e-'));
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
  interactive = false,
): Promise<CliResult> {
  const program = createProgram();
  registerCommands(program);

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const stdinIsTTYDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    'isTTY',
  );
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  process.stdout.write = createWriteCapture(stdoutChunks);
  process.stderr.write = createWriteCapture(stderrChunks);
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: interactive,
  });

  try {
    await program.parseAsync(
      ['--cwd', root, '--scope', 'project', ...globalArgs, ...args],
      { from: 'user' },
    );
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    if (stdinIsTTYDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinIsTTYDescriptor);
    }
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode;

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    exitCode,
  };
}

function createWriteCapture(chunks: string[]): typeof process.stdout.write {
  return (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): boolean => {
    const text =
      typeof chunk === 'string'
        ? chunk
        : Buffer.from(chunk).toString(
            typeof encoding === 'string' ? encoding : 'utf8',
          );
    chunks.push(text);

    if (typeof encoding === 'function') {
      encoding();
      return true;
    }

    callback?.();
    return true;
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

async function readManifest(root: string): Promise<Manifest> {
  const manifestRaw = await readFile(
    join(root, '.oat', 'sync', 'manifest.json'),
    'utf8',
  );
  return JSON.parse(manifestRaw) as Manifest;
}

async function writeSyncConfig(
  root: string,
  config: SyncConfig,
): Promise<void> {
  await mkdir(join(root, '.oat', 'sync'), { recursive: true });
  await writeFile(
    join(root, '.oat', 'sync', 'config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8',
  );
}

describe('e2e workflow', () => {
  const tempDirs: string[] = [];
  const stdinDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    'isTTY',
  );

  beforeEach(() => {
    mockedConfirm.mockResolvedValue(false);
    mockedCheckbox.mockResolvedValue([]);
  });

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;

    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    }
  });

  it('fresh repo: init → sync → providers list → status (all in sync)', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    const providers = await runCli(
      root,
      ['providers', 'list', '--json'],
      ['--json'],
    );
    expect(providers.exitCode).toBe(0);
    const providerPayload = JSON.parse(providers.stdout);
    expect(providerPayload.map((item: { name: string }) => item.name)).toEqual(
      expect.arrayContaining(['claude', 'cursor', 'codex']),
    );

    const status = await runCli(root, ['status', '--json'], ['--json']);
    expect(status.exitCode).toBe(0);
    const payload = JSON.parse(status.stdout);
    expect(payload.summary.drifted).toBe(0);
    expect(payload.summary.missing).toBe(0);
    expect(payload.summary.stray).toBe(0);
    expect(payload.summary.inSync).toBeGreaterThan(0);
  });

  it('drift scenario: sync → modify provider file → status reports drift → sync fixes it', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync']);

    const driftPath = join(root, '.claude', 'skills', 'skill-one');
    await rm(driftPath, { recursive: true, force: true });
    await mkdir(driftPath, { recursive: true });
    await writeFile(join(driftPath, 'SKILL.md'), 'drifted content', 'utf8');

    const before = await runCli(root, ['status', '--json'], ['--json']);
    expect(before.exitCode).toBe(1);
    const beforePayload = JSON.parse(before.stdout);
    expect(beforePayload.summary.drifted).toBeGreaterThan(0);

    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    const after = await runCli(root, ['status', '--json'], ['--json']);
    expect(after.exitCode).toBe(0);
    const afterPayload = JSON.parse(after.stdout);
    expect(afterPayload.summary.drifted).toBe(0);
  });

  it('adoption: create provider-local skill → init detects and adopts', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await mkdir(join(root, '.claude', 'skills', 'adopt-me'), {
      recursive: true,
    });
    await writeFile(
      join(root, '.claude', 'skills', 'adopt-me', 'SKILL.md'),
      'adopt me',
      'utf8',
    );

    mockedConfirm.mockResolvedValue(false);
    mockedCheckbox
      .mockResolvedValueOnce(['claude', 'cursor', 'codex'])
      .mockResolvedValueOnce(['0']);

    const init = await runCli(root, ['init'], [], true);
    expect(init.exitCode).toBe(0);

    const canonicalPath = join(root, '.agents', 'skills', 'adopt-me');
    const providerPath = join(root, '.claude', 'skills', 'adopt-me');
    const canonicalStat = await lstat(canonicalPath);
    const providerStat = await lstat(providerPath);

    expect(canonicalStat.isDirectory()).toBe(true);
    expect(providerStat.isSymbolicLink()).toBe(true);
  });

  it('copy fallback: force copy strategy → sync creates copies with hashes', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    await writeSyncConfig(root, {
      version: 1,
      defaultStrategy: 'copy',
      providers: {},
    });

    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    const copiedPath = join(root, '.claude', 'skills', 'skill-one');
    const copiedStat = await lstat(copiedPath);
    expect(copiedStat.isSymbolicLink()).toBe(false);

    const manifest = await readManifest(root);
    const entry = manifest.entries.find(
      (candidate) =>
        candidate.provider === 'claude' &&
        candidate.canonicalPath === '.agents/skills/skill-one',
    );
    expect(entry).toBeDefined();
    expect(entry?.strategy).toBe('copy');
    expect(entry?.contentHash).toBeTruthy();
  });

  it('rule status: sync → frontmatter edit → status still in sync', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'test-rule.md'),
      '---\ndescription: original\nactivation: always\n---\n\n# Rule Body\n',
      'utf8',
    );

    // First sync creates the copies
    const firstSync = await runCli(root, ['sync']);
    expect(firstSync.exitCode).toBe(0);

    // Status should be clean
    const beforeEdit = await runCli(root, ['status', '--json'], ['--json']);
    expect(beforeEdit.exitCode).toBe(0);
    const beforePayload = JSON.parse(beforeEdit.stdout);
    expect(beforePayload.summary.drifted).toBe(0);

    // Edit only frontmatter (body stays the same)
    await writeFile(
      join(root, '.agents', 'rules', 'test-rule.md'),
      '---\ndescription: updated description\nactivation: always\n---\n\n# Rule Body\n',
      'utf8',
    );

    // Sync should skip (transformed output unchanged for claude)
    const secondSync = await runCli(root, ['sync']);
    expect(secondSync.exitCode).toBe(0);

    // Status should still report in sync (not false-positive drift)
    const afterEdit = await runCli(root, ['status', '--json'], ['--json']);
    expect(afterEdit.exitCode).toBe(0);
    const afterPayload = JSON.parse(afterEdit.stdout);
    expect(afterPayload.summary.drifted).toBe(0);
  });

  it('removal: delete canonical → sync removes provider view', async () => {
    const root = await createWorkspace();
    tempDirs.push(root);

    await runCli(root, ['init']);
    await seedCanonical(root);
    await runCli(root, ['sync']);

    await rm(join(root, '.agents', 'skills', 'skill-one'), {
      recursive: true,
      force: true,
    });

    const sync = await runCli(root, ['sync']);
    expect(sync.exitCode).toBe(0);

    await expect(
      lstat(join(root, '.claude', 'skills', 'skill-one')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      lstat(join(root, '.cursor', 'skills', 'skill-one')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });

    const manifest = await readManifest(root);
    expect(
      manifest.entries.some(
        (entry) => entry.canonicalPath === '.agents/skills/skill-one',
      ),
    ).toBe(false);
  });
});
