import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstat,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import { inventoryScopedPack } from '@commands/tools/shared/pack-inventory';
import { PACK_NAMES } from '@commands/tools/shared/pack-manifest';
import type { PackName } from '@commands/tools/shared/types';
import { resolveAssetsRoot } from '@fs/assets';
import type { ConcreteScope } from '@shared/types';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

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
}

async function createScratchRoots(): Promise<ScratchRoots> {
  const [repo, home] = await Promise.all([
    mkdtemp(join(tmpdir(), 'oat-install-scope-repo-')),
    mkdtemp(join(tmpdir(), 'oat-install-scope-home-')),
  ]);
  temporaryRoots.push(repo, home);
  execFileSync('git', ['init', '-q'], { cwd: repo });
  return { repo, home };
}

/**
 * Every entry under `root` with its kind and content digest, so two snapshots
 * are equal only when nothing was created, removed, or rewritten.
 */
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

interface CliRun {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCli(roots: ScratchRoots, args: string[]): Promise<CliRun> {
  const program = createProgram();
  registerCommands(program);
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const previousExitCode = process.exitCode;
  const previousHome = process.env.HOME;
  const stdout: string[] = [];
  const stderr: string[] = [];
  let exitCode = 0;
  try {
    process.exitCode = undefined;
    process.env.HOME = roots.home;
    (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
      chunk,
    ) => {
      stdout.push(String(chunk));
      return true;
    };
    (process.stderr.write as unknown as (chunk: unknown) => boolean) = (
      chunk,
    ) => {
      stderr.push(String(chunk));
      return true;
    };
    await program.parseAsync(['--cwd', roots.repo, ...args], {
      from: 'user',
    });
    exitCode = process.exitCode ?? 0;
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    process.exitCode = previousExitCode;
  }
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
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

describe('tools install honors the scope it was given', () => {
  it('refuses core at project scope and writes nothing anywhere', async () => {
    const roots = await createScratchRoots();
    const homeBefore = await snapshotTree(roots.home);
    const repoBefore = await snapshotTree(roots.repo);

    const run = await runCli(roots, [
      'tools',
      'install',
      'core',
      '--scope',
      'project',
    ]);

    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('core is user-scope only');
    expect(run.stdout).not.toContain('Installed');
    expect(await snapshotTree(roots.home)).toEqual(homeBefore);
    expect(await snapshotTree(roots.repo)).toEqual(repoBefore);
  });

  it('reports a refused single-pack scope as a JSON error', async () => {
    const roots = await createScratchRoots();
    const homeBefore = await snapshotTree(roots.home);
    const repoBefore = await snapshotTree(roots.repo);

    const run = await runCli(roots, [
      '--json',
      'tools',
      'install',
      'core',
      '--scope',
      'project',
    ]);

    expect(run.exitCode).toBe(1);
    const payload = JSON.parse(run.stdout) as {
      status: string;
      message: string;
      lifecycle: {
        status: string;
        selection: { targetScopes: string[] };
        recovery: Array<{ code: string; command?: string }>;
      };
    };
    expect(payload.status).toBe('error');
    expect(payload.message).toContain('core is user-scope only');
    expect(payload.lifecycle.status).toBe('failed');
    expect(payload.lifecycle.selection.targetScopes).toEqual([]);
    expect(payload.lifecycle.recovery).toEqual([
      expect.objectContaining({
        code: 'scope-not-allowed',
        command: 'oat tools install core --scope user',
      }),
    ]);
    expect(await snapshotTree(roots.home)).toEqual(homeBefore);
    expect(await snapshotTree(roots.repo)).toEqual(repoBefore);
  });

  it('installs core at user scope when no scope is given (accepted control)', async () => {
    const roots = await createScratchRoots();
    const repoBefore = await snapshotTree(roots.repo);

    const run = await runCli(roots, ['tools', 'install', 'core']);

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain('Installed core tool pack.');
    expect(await completenessAt('core', 'user', roots)).toBe('complete');
    expect(await snapshotTree(roots.repo)).toEqual(repoBefore);
  });

  it('skips core for an aggregate project install and writes nothing under HOME', async () => {
    const roots = await createScratchRoots();
    const homeBefore = await snapshotTree(roots.home);

    const run = await runCli(roots, ['tools', 'install', '--scope', 'project']);

    expect(run.exitCode).toBe(0);
    expect(await snapshotTree(roots.home)).toEqual(homeBefore);
    expect(run.stdout).toContain('Skipped core: core is user-scope only');
    expect(run.stdout).not.toMatch(/core \((user|project)/);
    for (const pack of NON_CORE_PACKS) {
      expect(await completenessAt(pack, 'project', roots)).toBe('complete');
    }
    expect(await completenessAt('core', 'user', roots)).toBe('absent');
  }, 60_000);

  it('reports the aggregate core skip in JSON', async () => {
    const roots = await createScratchRoots();
    const homeBefore = await snapshotTree(roots.home);

    const run = await runCli(roots, [
      '--json',
      'tools',
      'install',
      '--scope',
      'project',
      '--no-sync',
    ]);

    expect(run.exitCode).toBe(0);
    const payload = JSON.parse(run.stdout) as {
      installedPacks: Array<{ pack: string }>;
      skippedPacks: Array<{ pack: string; reason: string }>;
    };
    expect(payload.installedPacks.map(({ pack }) => pack)).not.toContain(
      'core',
    );
    expect(payload.skippedPacks).toEqual([
      { pack: 'core', reason: expect.stringContaining('user-scope only') },
    ]);
    expect(await snapshotTree(roots.home)).toEqual(homeBefore);
  }, 60_000);
});
