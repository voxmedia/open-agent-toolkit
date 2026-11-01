import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  lstat,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, relative } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { createProgram } from '@app/create-program';
import { createInitCommand } from '@commands/init';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import { PACK_NAMES } from '@commands/tools/shared/pack-manifest';
import type { PackName } from '@commands/tools/shared/types';
import { resolveAssetsRoot } from '@fs/assets';
import type { ConcreteScope } from '@shared/types';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const temporaryRoots: string[] = [];

let assetsRoot: string;

beforeAll(async () => {
  assetsRoot = await resolveAssetsRoot();
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
  temporaryRoots.length = 0;
});

interface ScratchRoots {
  repo: string;
  home: string;
  /** Directory holding a fake `gh` that records each invocation. */
  bin: string;
  ghLog: string;
}

async function createScratchRoots(): Promise<ScratchRoots> {
  const [repo, home, bin] = await Promise.all([
    mkdtemp(join(tmpdir(), 'oat-setup-scope-repo-')),
    mkdtemp(join(tmpdir(), 'oat-setup-scope-home-')),
    mkdtemp(join(tmpdir(), 'oat-setup-scope-bin-')),
  ]);
  temporaryRoots.push(repo, home, bin);
  execFileSync('git', ['init', '-q'], { cwd: repo });
  const ghLog = join(bin, 'gh-calls.log');
  await writeFile(
    join(bin, 'gh'),
    `#!/bin/sh\necho "$@" >> "${ghLog}"\nexit 1\n`,
    'utf8',
  );
  await chmod(join(bin, 'gh'), 0o755);
  return { repo, home, bin, ghLog };
}

async function snapshotTree(root: string): Promise<Record<string, string>> {
  const entries: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const key = relative(root, path);
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        entries[key] = `link:${await readlink(path)}`;
      } else if (stats.isDirectory()) {
        entries[key] = 'dir';
        await walk(path);
      } else {
        const digest = createHash('sha256')
          .update(await readFile(path))
          .digest('hex');
        entries[key] = `file:${stats.mode.toString(8)}:${digest}`;
      }
    }
  }
  await walk(root);
  return entries;
}

async function readOptional(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}

interface InitRun {
  exitCode: number;
  stdout: string;
  runProviderSync: ReturnType<typeof vi.fn>;
}

/**
 * Runs the real `oat init` against the scratch roots. Only the provider-sync
 * subprocess is replaced; non-interactive setup declines it anyway.
 */
async function runInit(roots: ScratchRoots, args: string[]): Promise<InitRun> {
  const runProviderSync = vi.fn(async () => undefined);
  const program = createProgram();
  program.addCommand(
    createInitCommand({
      buildCommandContext: (options) => ({
        ...buildCommandContext(options),
        interactive: false,
      }),
      runProviderSync,
    }),
  );
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const previousExitCode = process.exitCode;
  const previousHome = process.env.HOME;
  const previousPath = process.env.PATH;
  const stdout: string[] = [];
  let exitCode = 0;
  try {
    process.exitCode = undefined;
    process.env.HOME = roots.home;
    process.env.PATH = `${roots.bin}${delimiter}${previousPath ?? ''}`;
    (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
      chunk,
    ) => {
      stdout.push(String(chunk));
      return true;
    };
    (process.stderr.write as unknown as (chunk: unknown) => boolean) = () =>
      true;
    await program.parseAsync(['--cwd', roots.repo, 'init', ...args], {
      from: 'user',
    });
    exitCode = process.exitCode ?? 0;
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    process.env.PATH = previousPath;
    process.exitCode = previousExitCode;
  }
  return { exitCode, stdout: stdout.join(''), runProviderSync };
}

async function completenessAt(
  pack: PackName,
  scope: ConcreteScope,
  roots: ScratchRoots,
): Promise<string> {
  const inventory = await inventoryScopedPack({
    pack,
    scope,
    scopeRoot: scope === 'project' ? roots.repo : roots.home,
    assetsRoot,
  });
  return inventory.completeness;
}

const NON_CORE_PACKS = PACK_NAMES.filter((pack) => pack !== 'core');

describe('oat init --setup honors --scope', () => {
  it('installs packs at project scope, skips core, and writes nothing under HOME', async () => {
    const roots = await createScratchRoots();
    const homeBefore = await snapshotTree(roots.home);

    const run = await runInit(roots, ['--scope', 'project', '--setup']);

    expect(run.exitCode).toBe(0);
    expect(await snapshotTree(roots.home)).toEqual(homeBefore);
    expect(run.stdout).toContain('Skipped core: core is user-scope only');
    for (const pack of NON_CORE_PACKS) {
      expect(await completenessAt(pack, 'project', roots)).toBe('complete');
    }
    expect(await readOptional(roots.ghLog)).toBe('');
    expect(run.stdout).toContain('Default branch: main');
  }, 60_000);

  it('keeps per-pack default placement when no scope is given (accepted control)', async () => {
    const roots = await createScratchRoots();

    const run = await runInit(roots, ['--setup']);

    expect(run.exitCode).toBe(0);
    for (const pack of PACK_NAMES) {
      expect(await completenessAt(pack, 'user', roots)).toBe('complete');
    }
    expect(run.stdout).toContain('Installed tool packs: core (user)');
    expect(await readOptional(roots.ghLog)).toBe('');
  }, 60_000);
});
