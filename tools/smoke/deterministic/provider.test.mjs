import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { cleanupSmoke } from '../runner/cleanup.mjs';
import { registerNestedSmokeResource } from '../runner/journal.mjs';
import { provisionSmoke } from '../runner/provision.mjs';
import { createPhaseWorktree } from './provider.mjs';

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

// Every fixture lives in its own temporary repository; the deterministic
// provider's ownership transaction is never exercised against the developer's
// real worktrees or branches.
async function createRepository(prefix) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  await git(['init', '--initial-branch=main'], { cwd: directory });
  await git(['config', 'user.email', 'smoke@example.test'], { cwd: directory });
  await git(['config', 'user.name', 'Smoke Test'], { cwd: directory });
  await writeFile(join(directory, 'README.md'), 'provider host\n');
  await git(['add', 'README.md'], { cwd: directory });
  await git(['commit', '-m', 'initial'], { cwd: directory });
  return directory;
}

async function provision(repository, randomValue) {
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

async function readJournal(manifest) {
  return JSON.parse(await readFile(manifest.manifestPath, 'utf8'))
    .ownershipJournal;
}

test('reserves phase ownership before the worktree Git call and finalizes after it', async () => {
  const repository = await createRepository('oat-smoke-provider-order-');
  let manifest;

  try {
    manifest = await provision(repository, 'provider-order');
    const observed = [];
    const registrations = [];

    const created = await createPhaseWorktree(manifest, 'p01', {
      createWorktree: async (args, cwd) => {
        // Snapshot the durable manifest at the instant Git is asked to mutate.
        observed.push({ args, journal: await readJournal(manifest) });
        return git(args, { cwd });
      },
      register: async (request) => {
        registrations.push({
          ...request,
          journal: await readJournal(manifest),
        });
        return registerNestedSmokeResource(request);
      },
    });

    assert.equal(created.branch, `${manifest.branch}-p01`);
    assert.equal(
      created.worktreePath,
      join(repository, '.smoke-runs', manifest.branch, 'phase-p01'),
    );

    // The Git mutation ran exactly once, and reserved intent was already
    // durable in the manifest when it did.
    assert.equal(observed.length, 1);
    assert.deepEqual(observed[0].args.slice(0, 6), [
      '-c',
      'core.hooksPath=/dev/null',
      'worktree',
      'add',
      '-b',
      created.branch,
    ]);
    assert.deepEqual(
      observed[0].journal.resources.map((entry) => [
        entry.branch,
        entry.markerPath,
        entry.state,
        entry.worktreePath,
      ]),
      [
        [
          created.branch,
          join(created.worktreePath, '.oat/smoke-bootstrap.json'),
          'reserved',
          created.worktreePath,
        ],
      ],
    );

    // Finalization happens only after creation, and only through registration.
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].journal.resources[0].state, 'reserved');
    assert.equal(
      (await readJournal(manifest)).resources[0].state,
      'registered',
    );

    const result = await cleanupSmoke(manifest.manifestPath, {
      git,
      repository,
      runsDirectory: join(repository, '.smoke-runs'),
    });
    assert.equal(result.status, 'cleaned');
    assert.equal(
      await git(['branch', '--list', 'smoke-*'], { cwd: repository }),
      '',
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('leaves reconcilable reserved intent when phase worktree creation fails', async () => {
  const repository = await createRepository('oat-smoke-provider-interrupt-');
  let manifest;

  try {
    manifest = await provision(repository, 'provider-interrupt');
    const registrations = [];
    const branch = `${manifest.branch}-p01`;
    const worktreePath = join(
      repository,
      '.smoke-runs',
      manifest.branch,
      'phase-p01',
    );

    await assert.rejects(
      () =>
        createPhaseWorktree(manifest, 'p01', {
          createWorktree: async () => {
            throw new Error('Injected worktree creation interruption.');
          },
          register: async (request) => {
            registrations.push(request);
          },
        }),
      /Injected worktree creation interruption/,
    );

    // Nothing finalized, nothing materialized, but the intent is durable.
    assert.deepEqual(registrations, []);
    assert.equal(
      await git(['branch', '--list', branch], { cwd: repository }),
      '',
    );
    const journal = await readJournal(manifest);
    assert.equal(journal.resources.length, 1);
    assert.equal(journal.resources[0].state, 'reserved');
    assert.equal(journal.resources[0].worktreePath, worktreePath);

    // The runner's ordinary cleanup reconciles it through the same ownership
    // checks as every other recovery; the provider never deletes paths itself.
    const result = await cleanupSmoke(manifest.manifestPath, {
      git,
      repository,
      runsDirectory: join(repository, '.smoke-runs'),
    });
    assert.equal(result.status, 'cleaned');
    assert.ok(result.actions.includes(`reservation:${branch}`));
    assert.equal(
      await git(['branch', '--list', 'smoke-*'], { cwd: repository }),
      '',
    );
    assert.equal(
      await git(['worktree', 'list', '--porcelain'], { cwd: repository }),
      `worktree ${repository}\nHEAD ${await git(['rev-parse', 'HEAD'], { cwd: repository })}\nbranch refs/heads/main`,
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});
