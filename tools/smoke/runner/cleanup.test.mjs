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
  const directory = await mkdtemp(join(tmpdir(), prefix));
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

async function runSignalCase(pauseStage) {
  const repository = await createRepository(`oat-smoke-signal-${pauseStage}-`);
  const harnessDirectory = await mkdtemp(join(tmpdir(), 'oat-smoke-signal-'));
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
const pauseForTermination = () =>
  new Promise((resolvePromise) => {
    const timer = setInterval(() => {}, 1_000);
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
    const exit = await new Promise((resolvePromise) => {
      child.once('exit', (code, signal) => resolvePromise({ code, signal }));
    });

    assert.deepEqual(
      exit,
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
