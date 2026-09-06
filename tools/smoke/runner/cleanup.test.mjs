import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename as renameFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { CleanupRefusalError, cleanupSmoke } from './cleanup.mjs';
import { reserveNestedSmokeResource } from './journal.mjs';
import { provisionSmoke } from './provision.mjs';
import { main } from './run-smoke.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../..');
const fixturePath = join(repositoryRoot, 'tools/smoke/fixture');

async function git(args, { cwd } = {}) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

async function createRepository(prefix = 'oat-smoke-cleanup-') {
  const directory = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  await git(['init', '--initial-branch=main'], { cwd: directory });
  await git(['config', 'user.email', 'smoke@example.test'], { cwd: directory });
  await git(['config', 'user.name', 'Smoke Test'], { cwd: directory });
  await writeFile(join(directory, 'README.md'), 'smoke cleanup host\n');
  await git(['add', 'README.md'], { cwd: directory });
  await git(['commit', '-m', 'initial'], { cwd: directory });
  return directory;
}

async function provision(repository, randomValue = 'cleanup-test') {
  return provisionSmoke(
    { harness: 'codex', scenario: 'implement' },
    {
      clock: () => new Date('2026-07-11T20:30:45.123Z'),
      fixture: fixturePath,
      git,
      random: () => randomValue,
      repository,
      runsDirectory: join(repository, '.smoke-runs'),
    },
  );
}

function cleanup(repository, manifest) {
  return cleanupSmoke(manifest, {
    git,
    repository,
    runsDirectory: join(repository, '.smoke-runs'),
  });
}

async function exists(path) {
  return access(path)
    .then(() => true)
    .catch(() => false);
}

async function assertNoSmokeGitResources(repository, baselineWorktrees) {
  assert.equal(
    await git(['worktree', 'list', '--porcelain'], { cwd: repository }),
    baselineWorktrees,
  );
  assert.equal(
    await git(['branch', '--list', 'smoke-*'], { cwd: repository }),
    '',
  );
}

test('removes a lifecycle-advanced outer branch in dependency order and is idempotent', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const baselineWorktrees = await git(['worktree', 'list', '--porcelain'], {
    cwd: repository,
  });
  const unrelatedPath = join(repository, 'unrelated-preserve.txt');
  await writeFile(unrelatedPath, 'do not remove\n');
  let manifest;

  try {
    manifest = await provision(repository, 'exact-manifest');
    await writeFile(
      join(manifest.worktreePath, 'lifecycle-result.txt'),
      'legitimate lifecycle output\n',
    );
    await git(['add', 'lifecycle-result.txt'], { cwd: manifest.worktreePath });
    await git(['commit', '-m', 'test: complete smoke lifecycle'], {
      cwd: manifest.worktreePath,
    });
    const driveOutputPath = join(
      dirname(manifest.manifestPath),
      'drive-output.json',
    );
    await writeFile(driveOutputPath, '{"status":"completed"}\n');
    manifest.createdPaths.push(driveOutputPath);
    await writeFile(
      manifest.manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    const result = await cleanup(repository, manifest);

    assert.equal(result.status, 'cleaned');
    assert.ok(result.actions[0].startsWith('worktree:'));
    assert.ok(result.actions[1].startsWith('branch:'));
    assert.equal(await readFile(unrelatedPath, 'utf8'), 'do not remove\n');
    assert.equal(await exists(manifest.worktreePath), false);
    assert.equal(await exists(dirname(manifest.manifestPath)), false);
    await assertNoSmokeGitResources(repository, baselineWorktrees);

    assert.deepEqual(await cleanup(repository, manifest), {
      actions: [],
      status: 'noop',
    });
    assert.deepEqual(
      await cleanupSmoke(manifest.manifestPath, {
        git,
        repository,
        runsDirectory,
      }),
      { actions: [], status: 'noop' },
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses unrecorded or out-of-root paths, branches, and worktrees', async () => {
  const repository = await createRepository();
  let manifest;

  try {
    manifest = await provision(repository, 'refusal');
    const outsidePath = join(repository, 'outside-smoke-root');
    const invalidManifests = [
      {
        ...manifest,
        createdPaths: [...manifest.createdPaths, outsidePath],
      },
      {
        ...manifest,
        branch: 'smoke-unrecorded-branch',
      },
      {
        ...manifest,
        worktreePath: join(dirname(manifest.worktreePath), 'other-worktree'),
      },
    ];

    for (const invalidManifest of invalidManifests) {
      await writeFile(
        manifest.manifestPath,
        `${JSON.stringify(invalidManifest, null, 2)}\n`,
      );
      await assert.rejects(
        () =>
          cleanupSmoke(manifest.manifestPath, {
            git,
            repository,
            runsDirectory: join(repository, '.smoke-runs'),
          }),
        CleanupRefusalError,
      );
      assert.equal(await exists(manifest.worktreePath), true);
      assert.match(
        await git(['branch', '--list', manifest.branch], { cwd: repository }),
        new RegExp(manifest.branch),
      );
      await writeFile(
        manifest.manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
    }

    assert.equal(await exists(outsidePath), false);
    await cleanup(repository, manifest);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('preserves a pre-existing smoke-named branch without ownership evidence', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const branch = 'smoke-pre-existing-collision';
  const runPath = join(runsDirectory, branch);
  const manifestPath = join(runPath, 'provisioning-manifest.json');
  const worktreePath = join(runPath, 'worktree');
  const existingTip = await git(['rev-parse', 'HEAD'], { cwd: repository });
  const commonGitDir = await realpath(join(repository, '.git'));
  await git(['branch', branch, existingTip], { cwd: repository });
  await mkdir(runPath, { recursive: true });
  const manifest = {
    branch,
    commonGitDir,
    createdPaths: [manifestPath, runPath],
    manifestPath,
    ownershipJournal: { resources: [], schemaVersion: 1 },
    runIdentity: branch,
    worktreePath,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);

  try {
    await assert.rejects(
      () => cleanup(repository, manifest),
      /without explicit run ownership/,
    );
    assert.equal(
      await git(['rev-parse', `refs/heads/${branch}`], { cwd: repository }),
      existingTip,
    );
    assert.equal(await exists(manifestPath), true);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('fails closed when an owned branch diverges from its immutable baseline', async () => {
  const repository = await createRepository();
  let manifest;

  try {
    manifest = await provision(repository, 'tip-mismatch');
    await git(
      [
        'update-ref',
        `refs/heads/${manifest.branch}`,
        manifest.sourceCommitSha,
        manifest.baselineCommitSha,
      ],
      { cwd: repository },
    );

    await assert.rejects(
      () => cleanup(repository, manifest),
      /diverged from its ownership baseline/,
    );
    assert.equal(await exists(manifest.worktreePath), true);
    assert.match(
      await git(['branch', '--list', manifest.branch], { cwd: repository }),
      new RegExp(manifest.branch),
    );
    assert.equal(await exists(manifest.manifestPath), true);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses run-descendant worktrees and branches absent from the journal', async () => {
  const repository = await createRepository();
  const branch = 'smoke-child-unjournaled';
  let childWorktreePath;
  let manifest;

  try {
    manifest = await provision(repository, 'unjournaled-child');
    childWorktreePath = join(repository, '.children/unjournaled');
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'worktree',
        'add',
        '-b',
        branch,
        childWorktreePath,
        manifest.baselineCommitSha,
      ],
      { cwd: repository },
    );

    await assert.rejects(
      () => cleanup(repository, manifest),
      /run-descendant worktree .* is not journaled/,
    );
    assert.equal(await exists(childWorktreePath), true);
    assert.equal(await exists(manifest.worktreePath), true);

    await git(['worktree', 'remove', '--force', childWorktreePath], {
      cwd: repository,
    });
    await git(['branch', '--delete', '--force', '--', branch], {
      cwd: repository,
    });
    await cleanup(repository, manifest);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses a manifest tampered to name a baseline without the run marker', async () => {
  const repository = await createRepository();
  let manifest;

  try {
    manifest = await provision(repository, 'tampered-baseline');
    const tampered = {
      ...manifest,
      baselineCommitSha: manifest.sourceCommitSha,
      branchOwnership: {
        ...manifest.branchOwnership,
        baselineCommitSha: manifest.sourceCommitSha,
      },
    };
    await writeFile(
      manifest.manifestPath,
      `${JSON.stringify(tampered, null, 2)}\n`,
    );

    await assert.rejects(
      () => cleanup(repository, manifest),
      /does not contain the smoke marker/,
    );
    assert.equal(await exists(manifest.worktreePath), true);
    await writeFile(
      manifest.manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await cleanup(repository, manifest);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('recovers from a manifest interrupted before created-path updates', async () => {
  const repository = await createRepository();
  const baselineWorktrees = await git(['worktree', 'list', '--porcelain'], {
    cwd: repository,
  });
  let manifest;

  try {
    manifest = await provision(repository, 'partial-manifest');
    const partialManifest = {
      ...manifest,
      createdPaths: [manifest.manifestPath, dirname(manifest.manifestPath)],
      writableRoots: [],
    };
    await writeFile(
      manifest.manifestPath,
      `${JSON.stringify(partialManifest, null, 2)}\n`,
    );

    const result = await cleanupSmoke(manifest.manifestPath, {
      git,
      repository,
      runsDirectory: join(repository, '.smoke-runs'),
    });

    assert.equal(result.status, 'cleaned');
    assert.equal(await exists(manifest.worktreePath), false);
    assert.equal(await exists(dirname(manifest.manifestPath)), false);
    await assertNoSmokeGitResources(repository, baselineWorktrees);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

for (const { name, provisionOptions } of [
  {
    name: 'worktree creation',
    provisionOptions: () => ({
      git: async (args, options) => {
        if (args.includes('worktree') && args.includes('add')) {
          throw new Error('worktree add failed');
        }
        return git(args, options);
      },
    }),
  },
  {
    name: 'fixture copy',
    provisionOptions: () => ({
      fileSystem: {
        cp: async () => {
          throw new Error('fixture copy failed');
        },
        mkdir,
        realpath,
        rename: renameFile,
        rm,
        writeFile,
      },
    }),
  },
  {
    name: 'baseline commit',
    provisionOptions: () => ({
      git: async (args, options) => {
        if (args.includes('commit')) {
          throw new Error('baseline commit failed');
        }
        return git(args, options);
      },
    }),
  },
]) {
  test(`cleanup recovers resources after ${name} fails`, async () => {
    const repository = await createRepository(`oat-smoke-${name}-`);
    const runsDirectory = join(repository, '.smoke-runs');
    const baselineWorktrees = await git(['worktree', 'list', '--porcelain'], {
      cwd: repository,
    });
    const collateralPath = join(repository, 'collateral.txt');
    await writeFile(collateralPath, 'preserve me\n');
    const branch = `smoke-automated-2026-07-11T20-30-45-123Z-${name.replaceAll(' ', '-')}`;
    const manifestPath = join(
      runsDirectory,
      branch,
      'provisioning-manifest.json',
    );

    try {
      await assert.rejects(
        () =>
          provisionSmoke(
            { harness: 'codex', scenario: 'implement' },
            {
              clock: () => new Date('2026-07-11T20:30:45.123Z'),
              fixture: fixturePath,
              random: () => name.replaceAll(' ', '-'),
              repository,
              runsDirectory,
              ...provisionOptions(repository),
            },
          ),
        /failed/,
      );

      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      const result = await cleanupSmoke(manifestPath, {
        git,
        repository,
        runsDirectory,
      });

      assert.equal(result.status, 'cleaned');
      assert.equal(await exists(dirname(manifestPath)), false);
      assert.equal(await exists(manifest.worktreePath), false);
      assert.equal(await readFile(collateralPath, 'utf8'), 'preserve me\n');
      await assertNoSmokeGitResources(repository, baselineWorktrees);
    } finally {
      await rm(repository, { force: true, recursive: true });
    }
  });
}

test('refuses cleanup when a pre-baseline branch has advanced', async () => {
  const repository = await createRepository('oat-smoke-pre-baseline-advance-');
  const runsDirectory = join(repository, '.smoke-runs');
  const branch =
    'smoke-automated-2026-07-11T20-30-45-123Z-pre-baseline-advance';
  const manifestPath = join(
    runsDirectory,
    branch,
    'provisioning-manifest.json',
  );

  try {
    await assert.rejects(
      () =>
        provisionSmoke(
          { harness: 'codex', scenario: 'implement' },
          {
            clock: () => new Date('2026-07-11T20:30:45.123Z'),
            fileSystem: {
              cp: async () => {
                throw new Error('fixture copy failed');
              },
              mkdir,
              realpath,
              rename: renameFile,
              rm,
              writeFile,
            },
            fixture: fixturePath,
            git,
            random: () => 'pre-baseline-advance',
            repository,
            runsDirectory,
          },
        ),
      /fixture copy failed/,
    );
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    await writeFile(join(manifest.worktreePath, 'advanced.txt'), 'advanced\n');
    await git(['add', 'advanced.txt'], { cwd: manifest.worktreePath });
    await git(['commit', '-m', 'advance pre-baseline branch'], {
      cwd: manifest.worktreePath,
    });

    await assert.rejects(
      () => cleanupSmoke(manifestPath, { git, repository, runsDirectory }),
      /pre-baseline branch or worktree .* no longer exactly matches its source/,
    );
    assert.equal(await exists(manifest.worktreePath), true);
    assert.match(
      await git(['branch', '--list', manifest.branch], { cwd: repository }),
      new RegExp(manifest.branch),
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('full dry-run preserves repository and user config while cleaning all resources', async () => {
  const repository = await createRepository('oat-smoke-dry-run-');
  const home = await mkdtemp(join(tmpdir(), 'oat-smoke-home-'));
  const userConfig = join(home, '.oat/config.json');
  const runsDirectory = join(repository, '.smoke-runs');
  await mkdir(dirname(userConfig), { recursive: true });
  await writeFile(userConfig, '{"personal":true,"bytes":"unchanged"}\n');
  const configBefore = await readFile(userConfig);
  const statusBefore = await git(['status', '--short'], { cwd: repository });
  const worktreesBefore = await git(['worktree', 'list', '--porcelain'], {
    cwd: repository,
  });
  const calls = [];

  try {
    const result = await main(
      ['--harness', 'codex', '--scenario', 'implement', '--dry-run'],
      {
        cleanup: async (manifest) => {
          calls.push('cleanup');
          return cleanupSmoke(manifest, {
            git,
            repository,
            runsDirectory,
          });
        },
        preflight: async () => {
          calls.push('preflight');
          return { status: 'ready' };
        },
        provision: async (options) => {
          calls.push('provision');
          return provisionSmoke(options, {
            clock: () => new Date('2026-07-11T20:30:45.123Z'),
            fixture: fixturePath,
            git,
            random: () => 'full-dry-run',
            repository,
            runsDirectory,
          });
        },
        repository,
        runsDirectory,
      },
    );

    assert.deepEqual(Object.keys(result), [
      'preflight',
      'prepare',
      'drive',
      'collect',
      'cleanup',
    ]);
    assert.deepEqual(calls, ['preflight', 'provision', 'cleanup']);
    assert.equal(result.drive.record.status, 'dry-run-stub');
    assert.equal(result.collect.status, 'dry-run-stub');
    assert.equal(result.cleanup.status, 'cleaned');
    assert.equal(
      await git(['status', '--short'], { cwd: repository }),
      statusBefore,
    );
    assert.deepEqual(await readFile(userConfig), configBefore);
    await assertNoSmokeGitResources(repository, worktreesBefore);
    assert.deepEqual(await readdir(runsDirectory), []);
  } finally {
    await rm(home, { force: true, recursive: true });
    await rm(repository, { force: true, recursive: true });
  }
});

test('--keep preserves the manifest, worktree, and branch', async () => {
  const repository = await createRepository('oat-smoke-keep-');
  const runsDirectory = join(repository, '.smoke-runs');
  let manifest;

  try {
    const result = await main(
      ['--harness', 'codex', '--scenario', 'implement', '--dry-run', '--keep'],
      {
        cleanup: (cleanupManifest) =>
          cleanupSmoke(cleanupManifest, {
            git,
            repository,
            runsDirectory,
          }),
        preflight: async () => ({ status: 'ready' }),
        provision: async (options) => {
          manifest = await provisionSmoke(options, {
            clock: () => new Date('2026-07-11T20:30:45.123Z'),
            fixture: fixturePath,
            git,
            random: () => 'keep',
            repository,
            runsDirectory,
          });
          return manifest;
        },
        repository,
        runsDirectory,
      },
    );

    assert.equal(result.cleanup, undefined);
    assert.equal(await exists(manifest.manifestPath), true);
    assert.equal(await exists(manifest.worktreePath), true);
    assert.match(
      await git(['branch', '--list', manifest.branch], { cwd: repository }),
      new RegExp(manifest.branch),
    );
    await cleanup(repository, manifest);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

async function waitForFile(path, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await exists(path)) {
      return;
    }
    if (child.exitCode !== null) {
      throw new Error(`signal test child exited early with ${child.exitCode}`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  throw new Error(`timed out waiting for signal sentinel: ${path}`);
}

// Test-only containment bounds for the signal harness child. These exist so a
// child that misses or ignores SIGTERM fails one test with diagnostics instead
// of wedging the whole suite; they never relax the exit contract asserted below.
//
// Sizing: the child finishes its SIGTERM cleanup and exits in ~1s (measured
// repeatedly at 0.9-1.7s while the full workspace suite ran on a saturated
// 14-core machine). One `SIGTERM during drive` run on 2026-08-26 nevertheless
// exceeded 10s -- load average above 14 with a sibling lane building, empty
// stdout/stderr, never reproduced across 8+ later runs. That outlier is why this
// bound is not 10s: the child's own post-SIGTERM budget legitimately includes
// run-smoke's abort grace period plus git worktree/branch teardown plus a
// recursive rm, all of which stretch under contention.
//
// This deadline is therefore ~35x the typical case and ~6x the single slowest
// run observed -- deliberately generous, because a bound that is merely
// "comfortable" turns scheduler stalls on a contended CI runner into a flaky red
// gate, while an over-generous bound only makes a true wedge fail in a minute
// instead of never. Worst case before the suite reports is 2 x (60 + 15)s across
// the two stage cases.
const SIGNAL_CHILD_EXIT_TIMEOUT_MS = 60_000;
// Second bound, after SIGKILL. A killed child runs no cleanup, so this only
// covers reaping and parent event-loop scheduling under the same contention.
const SIGNAL_CHILD_REAP_TIMEOUT_MS = 15_000;
// Deliberately tiny bound used only by the forced-timeout regression below, so
// proving the timeout path does not slow the suite.
const SIGNAL_CHILD_TIMEOUT_PROBE_MS = 250;
// Upper bound for an assertion that a short-circuit returned "immediately".
// Sized for scheduling, not for the operation: a descheduled process can stall
// well past a few hundred milliseconds on a contended runner, so this stays far
// above that noise while remaining 6-12x below the deadlines it must be
// distinguished from.
const SIGNAL_SHORT_CIRCUIT_MAX_MS = 5_000;

/**
 * Wait for `child` to exit, bounded by `timeoutMs`.
 *
 * Resolves with `{ code, signal, timedOut }`, where `timedOut` is true only when
 * the deadline elapsed first. The exit listener and the deadline timer are
 * released on every path, and a child that already exited resolves from its
 * recorded status rather than awaiting an `exit` event that cannot fire again.
 */
function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({
      code: child.exitCode,
      signal: child.signalCode,
      timedOut: false,
    });
  }
  return new Promise((resolvePromise) => {
    // Single owner for both subscriptions: whichever path settles first releases
    // the other, so neither an exit listener nor a deadline timer is left behind.
    const pending = {};
    const settle = (result) => {
      clearTimeout(pending.timer);
      child.removeListener('exit', pending.onExit);
      resolvePromise(result);
    };
    pending.onExit = (code, signal) =>
      settle({ code, signal, timedOut: false });
    pending.timer = setTimeout(
      () => settle({ code: null, signal: null, timedOut: true }),
      timeoutMs,
    );
    pending.timer.unref();
    child.once('exit', pending.onExit);
  });
}

// Children handed to `detachChild`. Tracked because detaching is irreversible
// for waiting purposes: see `reapOrDetach`.
const detachedChildren = new WeakSet();

/**
 * Last resort when a child outlives even the kill deadline: destroy its pipes
 * and unref it so it cannot keep this test process alive. The suite still fails
 * loudly, but it can exit.
 */
function detachChild(child) {
  detachedChildren.add(child);
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

/**
 * Bounded reap that refuses to leak containment, resolving with the
 * `waitForChildExit` shape plus `detached`.
 *
 * A detached child is never awaited again. `waitForChildExit`'s deadline timer
 * is unref'd (the source plan requires that), and `detachChild` unrefs the child
 * and destroys its stdio -- so a second wait on the same child would hold zero
 * ref'd handles and could never settle on an otherwise idle loop. The event loop
 * would simply drain, discarding whatever diagnostic the caller was about to
 * raise and skipping the cleanup that follows it. Short-circuiting here keeps
 * both the report and the cleanup reachable.
 */
async function reapOrDetach(child, timeoutMs) {
  if (detachedChildren.has(child)) {
    return {
      code: child.exitCode,
      detached: true,
      signal: child.signalCode,
      timedOut: child.exitCode === null && child.signalCode === null,
    };
  }
  const reaped = await waitForChildExit(child, timeoutMs);
  if (!reaped.timedOut) {
    return { ...reaped, detached: false };
  }
  detachChild(child);
  return { ...reaped, detached: true };
}

/**
 * Merge a capture sampled before the reap with the same accumulator read after
 * it. The buffers only ever grow, so the later read normally supersedes the
 * earlier one; the concatenating branch is defence for a reader that resets.
 */
function mergeCapture(before, after) {
  return after.startsWith(before) ? after : `${before}${after}`;
}

/**
 * Handle a child that missed its SIGTERM deadline: force-kill it if it is still
 * alive, reap it through a second bounded wait, and build the diagnostic the
 * caller fails with. The message is returned rather than thrown so this branch
 * stays directly testable.
 *
 * Output is read after the reap so writes made while the child was being killed
 * still reach the diagnostic. The pre-reap sample plus `mergeCapture` exist so a
 * caller supplying a resetting reader still gets a complete capture; they do not
 * recover bytes left buffered in a stream that `detachChild` destroys.
 */
async function forceKillAfterTimeout(
  child,
  {
    exitTimeoutMs = SIGNAL_CHILD_EXIT_TIMEOUT_MS,
    pauseStage,
    readStderr,
    readStdout,
    reap = reapOrDetach,
    reapTimeoutMs = SIGNAL_CHILD_REAP_TIMEOUT_MS,
  },
) {
  const forced = child.exitCode === null && child.signalCode === null;
  if (forced) {
    child.kill('SIGKILL');
  }
  const stdoutAtDeadline = readStdout();
  const stderrAtDeadline = readStderr();
  const reaped = await reap(child, reapTimeoutMs);
  const reapSummary = !forced
    ? `it exited on its own with code ${reaped.code} signal ${reaped.signal} just after the deadline`
    : reaped.timedOut
      ? `SIGKILL did not reap it within ${reapTimeoutMs}ms`
      : `SIGKILL reaped it with code ${reaped.code} signal ${reaped.signal}`;
  const stdout = mergeCapture(stdoutAtDeadline, readStdout());
  const stderr = mergeCapture(stderrAtDeadline, readStderr());
  return {
    message: `signal test child did not exit within ${exitTimeoutMs}ms of SIGTERM during ${pauseStage}; ${reapSummary}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
    reaped,
  };
}

/**
 * Run one SIGTERM stage case end to end.
 *
 * The options are test seams, not production knobs: the deadlines and the
 * post-kill reap are injectable so the regressions below can drive this
 * function's own timeout and detach branches in milliseconds, and
 * `ignoreSigterm` builds a fixture child that deliberately swallows SIGTERM.
 * Defaults reproduce the real case exactly.
 */
async function runSignalCase(
  pauseStage,
  {
    exitTimeoutMs = SIGNAL_CHILD_EXIT_TIMEOUT_MS,
    ignoreSigterm = false,
    onDirectories,
    reapAfterKill = reapOrDetach,
    reapBeforeCleanup = reapOrDetach,
    reapTimeoutMs = SIGNAL_CHILD_REAP_TIMEOUT_MS,
  } = {},
) {
  const repository = await createRepository(`oat-smoke-signal-${pauseStage}-`);
  const harnessDirectory = await mkdtemp(join(tmpdir(), 'oat-smoke-signal-'));
  onDirectories?.({ harnessDirectory, repository });
  const runsDirectory = join(repository, '.smoke-runs');
  const sentinelPath = join(harnessDirectory, `${pauseStage}.json`);
  const guardPath = join(harnessDirectory, 'outside-manifest.guard');
  const userConfig = join(harnessDirectory, 'home/.oat/config.json');
  const wrapperPath = join(harnessDirectory, 'signal-wrapper.mjs');
  await mkdir(dirname(userConfig), { recursive: true });
  await writeFile(guardPath, 'outside manifest\n');
  await writeFile(userConfig, '{"personal":"signal-safe"}\n');
  const guardBefore = await readFile(guardPath);
  const configBefore = await readFile(userConfig);
  const statusBefore = await git(['status', '--short'], { cwd: repository });
  const worktreesBefore = await git(['worktree', 'list', '--porcelain'], {
    cwd: repository,
  });
  const runSmokeUrl = pathToFileURL(
    join(repositoryRoot, 'tools/smoke/runner/run-smoke.mjs'),
  ).href;
  const provisionUrl = pathToFileURL(
    join(repositoryRoot, 'tools/smoke/runner/provision.mjs'),
  ).href;
  const cleanupUrl = pathToFileURL(
    join(repositoryRoot, 'tools/smoke/runner/cleanup.mjs'),
  ).href;
  const wrapper = `
import { writeFile } from 'node:fs/promises';
import { main } from ${JSON.stringify(runSmokeUrl)};
import { provisionSmoke } from ${JSON.stringify(provisionUrl)};
import { cleanupSmoke } from ${JSON.stringify(cleanupUrl)};

const repository = process.env.SMOKE_REPOSITORY;
const runsDirectory = process.env.SMOKE_RUNS;
const fixture = process.env.SMOKE_FIXTURE;
const sentinel = process.env.SMOKE_SENTINEL;
const pauseStage = process.env.SMOKE_PAUSE_STAGE;
const ignoreSigterm = process.env.SMOKE_IGNORE_SIGTERM === '1';
if (ignoreSigterm) {
  // Regression fixture only: swallow SIGTERM so the harness must fall back to
  // its force-kill path. Installed at module scope, before any sentinel write,
  // so a signal that arrives as soon as the parent sees the sentinel is
  // deterministically ignored rather than racing this handler's installation.
  process.on('SIGTERM', () => {});
}
const pauseForTermination = () =>
  new Promise((resolvePromise) => {
    const timer = setInterval(() => {}, 1_000);
    if (ignoreSigterm) {
      // The interval alone holds this child alive; the promise never resolves,
      // so only SIGKILL ends it.
      return;
    }
    process.once('SIGTERM', () => {
      clearInterval(timer);
      resolvePromise();
    });
  });

try {
  await main(
    ['--harness', 'codex', '--scenario', 'implement', '--dry-run'],
    {
      cleanup: (manifest) =>
        cleanupSmoke(manifest, { repository, runsDirectory }),
      handlers: {
        async drive(options, context) {
          if (pauseStage === 'drive') {
            await writeFile(sentinel, JSON.stringify(context.manifest));
            await pauseForTermination();
          }
          return { action: 'none', status: 'dry-run-stub' };
        },
      },
      preflight: async () => ({ status: 'ready' }),
      async provision(options, context) {
        const manifest = await provisionSmoke(options, {
          fixture,
          random: () => 'signal-' + pauseStage,
          repository,
          runsDirectory,
        });
        context.manifest = manifest;
        if (pauseStage === 'provision') {
          await writeFile(sentinel, JSON.stringify(manifest));
          await pauseForTermination();
        }
        return manifest;
      },
      repository,
      runsDirectory,
    },
  );
} catch (error) {
  process.exitCode = error.exitCode ?? 1;
}
`;
  await writeFile(wrapperPath, wrapper);

  const child = spawn(process.execPath, [wrapperPath], {
    env: {
      ...process.env,
      HOME: join(harnessDirectory, 'home'),
      SMOKE_FIXTURE: fixturePath,
      SMOKE_IGNORE_SIGTERM: ignoreSigterm ? '1' : '0',
      SMOKE_PAUSE_STAGE: pauseStage,
      SMOKE_REPOSITORY: repository,
      SMOKE_RUNS: runsDirectory,
      SMOKE_SENTINEL: sentinelPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  try {
    await waitForFile(sentinelPath, child);
    assert.equal(child.kill('SIGTERM'), true);
    const exit = await waitForChildExit(child, exitTimeoutMs);

    if (exit.timedOut) {
      const { message } = await forceKillAfterTimeout(child, {
        exitTimeoutMs,
        pauseStage,
        readStderr: () => stderr,
        readStdout: () => stdout,
        reap: reapAfterKill,
        reapTimeoutMs,
      });
      assert.fail(message);
    }

    assert.deepEqual(
      { code: exit.code, signal: exit.signal },
      { code: 143, signal: null },
      `stdout:\n${stdout}\nstderr:\n${stderr}`,
    );
    assert.deepEqual(await readFile(guardPath), guardBefore);
    assert.deepEqual(await readFile(userConfig), configBefore);
    assert.equal(
      await git(['status', '--short'], { cwd: repository }),
      statusBefore,
    );
    await assertNoSmokeGitResources(repository, worktreesBefore);
    assert.deepEqual(await readdir(runsDirectory), []);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
    // Reap before removing the temporary directories: a child that is still
    // running could otherwise write into paths this cleanup is deleting. The
    // wait is bounded, and an already-detached child short-circuits instead of
    // awaiting an exit that can no longer keep the loop alive, so both removals
    // below are reachable on every path -- including the one where the failing
    // assertion above is still propagating.
    await reapBeforeCleanup(child, reapTimeoutMs);
    await rm(harnessDirectory, { force: true, recursive: true });
    await rm(repository, { force: true, recursive: true });
  }
}

test('SIGTERM during provision cleans the durable manifest without collateral writes', async () => {
  await runSignalCase('provision');
});

test('SIGTERM during drive cleans the durable manifest without collateral writes', async () => {
  await runSignalCase('drive');
});

/**
 * Start a child that installs a SIGTERM handler which never resolves and only
 * then announces readiness, so a signal sent after this resolves is
 * deterministically ignored rather than racing the handler's installation. Only
 * SIGKILL ends it. Callers own the returned directory.
 */
async function startSigtermIgnoringChild() {
  const harnessDirectory = await mkdtemp(
    join(tmpdir(), 'oat-smoke-signal-timeout-'),
  );
  const sentinelPath = join(harnessDirectory, 'ready.json');
  const wrapperPath = join(harnessDirectory, 'ignore-sigterm.mjs');
  await writeFile(
    wrapperPath,
    `
import { writeFileSync } from 'node:fs';

setInterval(() => {}, 1_000);
process.on('SIGTERM', () => {});
writeFileSync(${JSON.stringify(sentinelPath)}, '{"ready":true}');
`,
  );

  const child = spawn(process.execPath, [wrapperPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitForFile(sentinelPath, child);
  } catch (error) {
    child.kill('SIGKILL');
    await rm(harnessDirectory, { force: true, recursive: true });
    throw error;
  }
  return { child, harnessDirectory };
}

test('bounded exit wait times out, then the harness force-kills, reaps, and reports', async () => {
  const { child, harnessDirectory } = await startSigtermIgnoringChild();
  try {
    assert.equal(child.kill('SIGTERM'), true);

    const startedAt = Date.now();
    const ignored = await waitForChildExit(
      child,
      SIGNAL_CHILD_TIMEOUT_PROBE_MS,
    );
    assert.deepEqual(ignored, { code: null, signal: null, timedOut: true });
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, null);

    // Drive the harness's own fallback rather than killing the child here. This
    // covers `forceKillAfterTimeout` only -- `runSignalCase`'s timeout branch,
    // its detach path, and its reap-before-cleanup ordering are covered by the
    // real-path regressions below, not by this test.
    let readAfterReap = false;
    const { message, reaped } = await forceKillAfterTimeout(child, {
      pauseStage: 'provision',
      readStderr: () => 'captured-stderr-marker',
      readStdout: () => {
        // Sampled before and after the reap; the last read must land after it so
        // writes made while the child was being killed still reach the message.
        readAfterReap = child.exitCode !== null || child.signalCode !== null;
        return 'captured-stdout-marker';
      },
    });
    assert.ok(readAfterReap, 'captured output must be read after reaping');
    assert.deepEqual(reaped, {
      code: null,
      detached: false,
      signal: 'SIGKILL',
      timedOut: false,
    });
    assert.match(message, /during provision/);
    assert.match(message, /SIGKILL reaped it with code null signal SIGKILL/);
    assert.match(message, /captured-stdout-marker/);
    assert.match(message, /captured-stderr-marker/);

    // An already-exited child resolves from recorded status instead of waiting
    // for an `exit` event that can no longer fire.
    assert.deepEqual(
      await waitForChildExit(child, SIGNAL_CHILD_TIMEOUT_PROBE_MS),
      { code: null, signal: 'SIGKILL', timedOut: false },
    );

    // The whole timeout path stays far inside the deadline the harness applies
    // to a real signal case.
    assert.ok(
      Date.now() - startedAt < SIGNAL_CHILD_EXIT_TIMEOUT_MS,
      'forced timeout path must complete within the signal-case deadline',
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
    await reapOrDetach(child, SIGNAL_CHILD_REAP_TIMEOUT_MS);
    await rm(harnessDirectory, { force: true, recursive: true });
  }
});

test('reapOrDetach detaches at its deadline and short-circuits later waits on that child', async () => {
  const { child, harnessDirectory } = await startSigtermIgnoringChild();
  try {
    // Never signalled, so this bounded reap cannot succeed: it must time out and
    // detach. That is the state the harness reaches when even SIGKILL goes
    // unreaped, and it is reproducible without an unkillable child.
    const detached = await reapOrDetach(child, SIGNAL_CHILD_TIMEOUT_PROBE_MS);
    assert.deepEqual(detached, {
      code: null,
      detached: true,
      signal: null,
      timedOut: true,
    });

    // A detached child holds no ref'd handles, so waiting on it again would
    // drain the event loop instead of settling -- discarding any diagnostic in
    // flight and skipping the cleanup behind it. Note the 60s deadline below:
    // short-circuiting is the only reason this returns at all.
    const startedAt = Date.now();
    const again = await reapOrDetach(child, SIGNAL_CHILD_EXIT_TIMEOUT_MS);
    assert.deepEqual(again, {
      code: null,
      detached: true,
      signal: null,
      timedOut: true,
    });
    assert.ok(
      Date.now() - startedAt < SIGNAL_SHORT_CIRCUIT_MAX_MS,
      'a detached child must short-circuit rather than await its 60s deadline',
    );
  } finally {
    child.kill('SIGKILL');
    await rm(harnessDirectory, { force: true, recursive: true });
  }
});

test('runSignalCase force-kills, reports the stage, and still cleans up when the child ignores SIGTERM', async () => {
  let directories;
  await assert.rejects(
    runSignalCase('provision', {
      exitTimeoutMs: 300,
      ignoreSigterm: true,
      onDirectories: (paths) => {
        directories = paths;
      },
    }),
    /did not exit within 300ms of SIGTERM during provision; SIGKILL reaped it/,
  );
  assert.equal(await exists(directories.harnessDirectory), false);
  assert.equal(await exists(directories.repository), false);
});

test('a detached child still reports its diagnostic and still removes both temp directories', async () => {
  let directories;
  let detachedDuringReap = false;
  let cleanupReapMs = null;
  await assert.rejects(
    runSignalCase('provision', {
      exitTimeoutMs: 300,
      ignoreSigterm: true,
      onDirectories: (paths) => {
        directories = paths;
      },
      // A child that survives SIGKILL cannot be built portably, so stand in for
      // one: detach exactly as the real reap does on its timeout path, and
      // report the timeout. Everything after this point is the harness's code.
      reapAfterKill: async (forcedChild) => {
        detachChild(forcedChild);
        detachedDuringReap = true;
        return { code: null, detached: true, signal: null, timedOut: true };
      },
      // The real reap, timed. It must short-circuit for the now-detached child;
      // if it awaits instead, the loop drains and neither the rejection below
      // nor either rm ever happens.
      reapBeforeCleanup: async (cleanupChild, timeoutMs) => {
        // Ordering guard: the reap runs before either rm, so both directories
        // must still exist at this point.
        assert.equal(await exists(directories.harnessDirectory), true);
        assert.equal(await exists(directories.repository), true);
        const startedAt = Date.now();
        const result = await reapOrDetach(cleanupChild, timeoutMs);
        cleanupReapMs = Date.now() - startedAt;
        return result;
      },
      reapTimeoutMs: 30_000,
    }),
    /did not exit within 300ms of SIGTERM during provision; SIGKILL did not reap it within 30000ms/,
  );
  assert.ok(detachedDuringReap, 'the force-kill path must have detached');
  assert.notEqual(
    cleanupReapMs,
    null,
    'cleanup must reap before removing directories',
  );
  assert.ok(
    cleanupReapMs < SIGNAL_SHORT_CIRCUIT_MAX_MS,
    `detached reap must short-circuit, took ${cleanupReapMs}ms`,
  );
  assert.equal(await exists(directories.harnessDirectory), false);
  assert.equal(await exists(directories.repository), false);
});

// --- Reserved-ownership reconciliation -------------------------------------
//
// A reservation records durable intent before `git worktree add` runs, so
// cleanup must reconcile all three interruption windows without ever deleting
// state it cannot corroborate against the recorded reservation.

function childOf(manifest, name) {
  const worktreePath = join(dirname(manifest.manifestPath), name);
  return {
    branch: `${manifest.branch}-${name}`,
    markerPath: join(worktreePath, '.oat/smoke-bootstrap.json'),
    worktreePath,
  };
}

async function reserveChild(manifest, name) {
  const child = childOf(manifest, name);
  await reserveNestedSmokeResource({
    baselineCommitSha: manifest.baselineCommitSha,
    branch: child.branch,
    manifestPath: manifest.manifestPath,
    markerPath: child.markerPath,
    worktreePath: child.worktreePath,
  });
  return child;
}

async function materializeChild(manifest, child) {
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'worktree',
      'add',
      '-b',
      child.branch,
      child.worktreePath,
      manifest.baselineCommitSha,
    ],
    { cwd: manifest.worktreePath },
  );
}

async function readManifestFile(manifest) {
  return JSON.parse(await readFile(manifest.manifestPath, 'utf8'));
}

async function tamperManifest(manifest, mutate) {
  const current = await readManifestFile(manifest);
  mutate(current);
  await writeFile(
    manifest.manifestPath,
    `${JSON.stringify(current, null, 2)}\n`,
  );
  return current;
}

async function branchTip(repository, branch) {
  return git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], {
    cwd: repository,
  }).catch(() => '');
}

test('discharges a reservation interrupted before the worktree was created', async () => {
  const repository = await createRepository();
  const baselineWorktrees = await git(['worktree', 'list', '--porcelain'], {
    cwd: repository,
  });
  let manifest;

  try {
    manifest = await provision(repository, 'reserved-window-one');
    const child = await reserveChild(manifest, 'phase-p01');
    assert.equal(await branchTip(repository, child.branch), '');

    const result = await cleanup(repository, manifest);

    assert.equal(result.status, 'cleaned');
    // Nothing was materialized, so nothing is deleted: the reservation is
    // discharged with the run manifest and no Git resource is touched.
    assert.ok(result.actions.includes(`reservation:${child.branch}`));
    assert.equal(
      result.actions.some((action) => action === `branch:${child.branch}`),
      false,
    );
    assert.equal(
      result.actions.some(
        (action) => action === `worktree:${child.worktreePath}`,
      ),
      false,
    );
    assert.equal(await exists(child.worktreePath), false);
    assert.equal(await exists(manifest.manifestPath), false);
    await assertNoSmokeGitResources(repository, baselineWorktrees);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('reconciles a reservation interrupted between creation and registration', async () => {
  const repository = await createRepository();
  const baselineWorktrees = await git(['worktree', 'list', '--porcelain'], {
    cwd: repository,
  });
  let manifest;

  try {
    manifest = await provision(repository, 'reserved-window-two');
    const child = await reserveChild(manifest, 'phase-p01');
    // Interruption after `git worktree add`, before finalization: the entry is
    // still `reserved` but the branch and worktree now exist.
    await materializeChild(manifest, child);
    assert.equal(
      (await readManifestFile(manifest)).ownershipJournal.resources[0].state,
      'reserved',
    );

    const result = await cleanup(repository, manifest);

    assert.equal(result.status, 'cleaned');
    assert.ok(result.actions.includes(`worktree:${child.worktreePath}`));
    assert.ok(result.actions.includes(`branch:${child.branch}`));
    assert.equal(await exists(child.worktreePath), false);
    await assertNoSmokeGitResources(repository, baselineWorktrees);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('reconciles a reserved branch left after its worktree was removed', async () => {
  const repository = await createRepository();
  const baselineWorktrees = await git(['worktree', 'list', '--porcelain'], {
    cwd: repository,
  });
  let manifest;

  try {
    manifest = await provision(repository, 'reserved-branch-only');
    const child = await reserveChild(manifest, 'phase-p01');
    await materializeChild(manifest, child);
    await git(['worktree', 'remove', '--force', child.worktreePath], {
      cwd: repository,
    });
    assert.equal(
      await branchTip(repository, child.branch),
      manifest.baselineCommitSha,
    );

    const result = await cleanup(repository, manifest);

    assert.equal(result.status, 'cleaned');
    assert.ok(result.actions.includes(`branch:${child.branch}`));
    await assertNoSmokeGitResources(repository, baselineWorktrees);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses a reserved branch whose tip no longer matches its reserved baseline', async () => {
  const repository = await createRepository();
  let manifest;

  try {
    manifest = await provision(repository, 'reserved-divergent');
    const child = await reserveChild(manifest, 'phase-p01');
    await materializeChild(manifest, child);
    await writeFile(join(child.worktreePath, 'child-work.txt'), 'work\n');
    await git(['add', 'child-work.txt'], { cwd: child.worktreePath });
    await git(['commit', '-m', 'test: advance reserved child'], {
      cwd: child.worktreePath,
    });
    await git(['worktree', 'remove', '--force', child.worktreePath], {
      cwd: repository,
    });
    const advancedTip = await branchTip(repository, child.branch);
    assert.notEqual(advancedTip, manifest.baselineCommitSha);

    // A reservation was never corroborated against a materialized child, so a
    // tip that advanced past the reserved baseline is a contradiction rather
    // than legitimate lifecycle progress.
    await assert.rejects(
      () => cleanup(repository, manifest),
      /does not exactly match its reserved baseline/,
    );
    assert.equal(await branchTip(repository, child.branch), advancedTip);
    assert.equal(await exists(manifest.worktreePath), true);
    assert.equal(await exists(manifest.manifestPath), true);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses every contradicted reserved state and leaves it untouched', async () => {
  const repository = await createRepository();
  let manifest;

  try {
    manifest = await provision(repository, 'reserved-contradictions');
    const child = await reserveChild(manifest, 'phase-p01');
    const pristine = await readManifestFile(manifest);

    // 1. A reserved path occupied by something Git never registered.
    await mkdir(child.worktreePath, { recursive: true });
    await writeFile(join(child.worktreePath, 'squatter.txt'), 'not ours\n');
    await assert.rejects(
      () => cleanup(repository, manifest),
      /exists without Git worktree registration/,
    );
    assert.equal(
      await readFile(join(child.worktreePath, 'squatter.txt'), 'utf8'),
      'not ours\n',
    );
    await rm(child.worktreePath, { force: true, recursive: true });

    // 2. The reserved branch checked out in a worktree the run never reserved.
    const strayPath = join(repository, '.stray/child');
    await git(['branch', child.branch, manifest.baselineCommitSha], {
      cwd: repository,
    });
    await mkdir(dirname(strayPath), { recursive: true });
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'worktree',
        'add',
        strayPath,
        child.branch,
      ],
      { cwd: repository },
    );
    await assert.rejects(
      () => cleanup(repository, manifest),
      /checked out in an unreserved worktree/,
    );
    assert.equal(await exists(strayPath), true);
    await git(['worktree', 'remove', '--force', strayPath], {
      cwd: repository,
    });
    await git(['branch', '--delete', '--force', '--', child.branch], {
      cwd: repository,
    });

    // 3. The reserved path registered on a branch the reservation never named.
    await materializeChild(manifest, child);
    await git(['checkout', '-b', `${child.branch}-renamed`], {
      cwd: child.worktreePath,
    });
    await assert.rejects(
      () => cleanup(repository, manifest),
      /registered to a different branch/,
    );
    assert.equal(await exists(child.worktreePath), true);
    assert.equal(
      await branchTip(repository, `${child.branch}-renamed`),
      manifest.baselineCommitSha,
    );

    // 4. The reserved worktree registered without its reserved branch.
    await git(['checkout', '--detach'], { cwd: child.worktreePath });
    await git(
      ['branch', '--delete', '--force', '--', `${child.branch}-renamed`],
      { cwd: repository },
    );
    await git(['branch', '--delete', '--force', '--', child.branch], {
      cwd: repository,
    });
    await assert.rejects(
      () => cleanup(repository, manifest),
      /registered without its reserved branch/,
    );
    assert.equal(await exists(child.worktreePath), true);

    // 5. A materialized reservation whose run marker is gone.
    await git(['checkout', '-B', child.branch, manifest.baselineCommitSha], {
      cwd: child.worktreePath,
    });
    await rm(child.markerPath, { force: true });
    await assert.rejects(
      () => cleanup(repository, manifest),
      /is missing its run marker/,
    );
    assert.equal(await exists(child.worktreePath), true);
    assert.equal(
      await branchTip(repository, child.branch),
      manifest.baselineCommitSha,
    );

    // 6. A journal entry whose marker path points outside its own worktree.
    await tamperManifest(manifest, (current) => {
      current.ownershipJournal.resources[0].markerPath = join(
        manifest.worktreePath,
        '.oat/smoke-bootstrap.json',
      );
    });
    await assert.rejects(
      () => cleanup(repository, manifest),
      /is not the tracked marker in its journaled worktree/,
    );
    assert.equal(await exists(child.worktreePath), true);

    // 7. Schema-v1 compatibility never reinterprets reserved intent as owned.
    await tamperManifest(manifest, (current) => {
      current.ownershipJournal = {
        resources: pristine.ownershipJournal.resources,
        schemaVersion: 1,
      };
    });
    await assert.rejects(
      () => cleanup(repository, manifest),
      /is not supported by ownership journal schema version 1/,
    );
    assert.equal(await exists(child.worktreePath), true);
    assert.equal(
      await branchTip(repository, child.branch),
      manifest.baselineCommitSha,
    );
    assert.equal(await exists(manifest.manifestPath), true);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses prefix-matching and unjournaled run descendants beside a reservation', async () => {
  const repository = await createRepository();
  let manifest;

  try {
    manifest = await provision(repository, 'reserved-prefix-control');
    const child = await reserveChild(manifest, 'phase-p01');
    await materializeChild(manifest, child);

    // A prefix-matching sibling is never owned by name or path prefix.
    const prefixPath = `${child.worktreePath}-lookalike`;
    const prefixBranch = `${child.branch}-lookalike`;
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'worktree',
        'add',
        '-b',
        prefixBranch,
        prefixPath,
        manifest.baselineCommitSha,
      ],
      { cwd: repository },
    );

    await assert.rejects(
      () => cleanup(repository, manifest),
      /run-descendant worktree .* is not journaled/,
    );
    assert.equal(await exists(prefixPath), true);
    assert.equal(
      await branchTip(repository, prefixBranch),
      manifest.baselineCommitSha,
    );
    assert.equal(await exists(child.worktreePath), true);
    assert.equal(await exists(manifest.worktreePath), true);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses a tampered journal that widens reserved ownership', async () => {
  // Cleanup never trusts the manifest to have been written by the reservation
  // writer: it re-derives containment, baseline, marker, and shared-Git-
  // directory invariants before a reserved entry can authorize any deletion.
  const repository = await createRepository();
  let manifest;

  try {
    manifest = await provision(repository, 'reserved-tampered');
    const child = await reserveChild(manifest, 'phase-p01');
    await materializeChild(manifest, child);
    const pristineJournal = structuredClone(
      (await readManifestFile(manifest)).ownershipJournal,
    );

    // An unjournaled run descendant that a tampered entry tries to adopt.
    const outsidePath = join(repository, '.outside/child');
    const outsideBranch = 'smoke-outside-descendant';
    await mkdir(dirname(outsidePath), { recursive: true });
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'worktree',
        'add',
        '-b',
        outsideBranch,
        outsidePath,
        manifest.baselineCommitSha,
      ],
      { cwd: repository },
    );

    const tampering = [
      [
        // Reserving outside the run directory would put an unjournaled
        // descendant into the owned set and skip the refusal that protects it.
        (current) => {
          current.ownershipJournal.resources[0].branch = outsideBranch;
          current.ownershipJournal.resources[0].worktreePath = outsidePath;
          current.ownershipJournal.resources[0].markerPath = join(
            outsidePath,
            '.oat/smoke-bootstrap.json',
          );
        },
        /reserves a worktree outside the manifest run directory/,
      ],
      [
        // A reservation may only ever name the run's own baseline.
        (current) => {
          current.ownershipJournal.resources[0].baselineCommitSha =
            current.sourceCommitSha;
        },
        /reserves a baseline other than the run baseline/,
      ],
      [
        // Wrong shared Git directory.
        (current) => {
          current.ownershipJournal.resources[0].commonGitDir = join(
            repository,
            '.other-git',
          );
        },
        /conflicts with run ownership/,
      ],
      [
        // A forged `registered` transition may not shed its marker path.
        (current) => {
          current.ownershipJournal.resources[0].state = 'registered';
          delete current.ownershipJournal.resources[0].markerPath;
        },
        /markerPath must be an absolute path/,
      ],
      [
        // A reserved entry cannot escape the re-derivation below by dropping
        // the field that guard is keyed on: `reservedAt` is mandatory for a
        // reserved entry, so its absence is refused rather than reclassified.
        (current) => {
          delete current.ownershipJournal.resources[0].reservedAt;
          current.ownershipJournal.resources[0].worktreePath = outsidePath;
          current.ownershipJournal.resources[0].markerPath = join(
            outsidePath,
            '.oat/smoke-bootstrap.json',
          );
          current.ownershipJournal.resources[0].branch = outsideBranch;
        },
        /reservedAt is required for a reserved entry/,
      ],
      [
        // Nor may it shed the containment a reservation was written under.
        // Reserved-origin entries keep those invariants after finalization, so
        // flipping `state` while retaining `reservedAt` and a well-formed
        // marker path must not reach the registered validation path.
        (current) => {
          current.ownershipJournal.resources[0].state = 'registered';
          current.ownershipJournal.resources[0].branch = outsideBranch;
          current.ownershipJournal.resources[0].worktreePath = outsidePath;
          current.ownershipJournal.resources[0].markerPath = join(
            outsidePath,
            '.oat/smoke-bootstrap.json',
          );
        },
        /reserves a worktree outside the manifest run directory/,
      ],
    ];

    for (const [mutate, expected] of tampering) {
      await tamperManifest(manifest, mutate);
      await assert.rejects(() => cleanup(repository, manifest), expected);
      assert.equal(await exists(outsidePath), true);
      assert.equal(await exists(child.worktreePath), true);
      assert.equal(await exists(manifest.worktreePath), true);
      assert.match(
        await git(['branch', '--list', outsideBranch], { cwd: repository }),
        new RegExp(outsideBranch),
      );
      await tamperManifest(manifest, (current) => {
        current.ownershipJournal = structuredClone(pristineJournal);
      });
    }

    // Even with the untampered reservation restored, the unjournaled
    // descendant beside it still fails the run closed rather than becoming
    // collateral.
    await assert.rejects(
      () => cleanup(repository, manifest),
      /run-descendant worktree .* is not journaled/,
    );
    assert.equal(await exists(outsidePath), true);

    // Once the operator resolves that resource, the honest reservation cleans.
    await git(['worktree', 'remove', '--force', outsidePath], {
      cwd: repository,
    });
    await git(['branch', '--delete', '--force', '--', outsideBranch], {
      cwd: repository,
    });
    const result = await cleanup(repository, manifest);
    assert.equal(result.status, 'cleaned');
    assert.equal(await exists(child.worktreePath), false);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});
