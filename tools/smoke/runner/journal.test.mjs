import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { cleanupSmoke } from './cleanup.mjs';
import {
  OWNERSHIP_JOURNAL_SCHEMA_VERSION,
  OwnershipJournalError,
  registerNestedSmokeResource,
  reserveNestedSmokeResource,
  validateSmokeMarkerBinding,
} from './journal.mjs';
import { provisionSmoke } from './provision.mjs';

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

async function createRepository(prefix) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  await git(['init', '--initial-branch=main'], { cwd: directory });
  await git(['config', 'user.email', 'smoke@example.test'], { cwd: directory });
  await git(['config', 'user.name', 'Smoke Test'], { cwd: directory });
  await writeFile(join(directory, 'README.md'), 'journal host\n');
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

async function addChild(repository, manifest, branch, worktreePath) {
  await mkdir(dirname(worktreePath), { recursive: true });
  await git(
    [
      '-c',
      'core.hooksPath=/dev/null',
      'worktree',
      'add',
      '-b',
      branch,
      worktreePath,
      manifest.baselineCommitSha,
    ],
    { cwd: repository },
  );
}

async function cleanup(repository, manifestPath) {
  return cleanupSmoke(manifestPath, {
    git,
    repository,
    runsDirectory: join(repository, '.smoke-runs'),
  });
}

test('accepts the current marker schema for interrupted-run cleanup', () => {
  const worktreePath = '/tmp/oat-smoke-legacy/worktree';
  const manifestPath = '/tmp/oat-smoke-legacy/provisioning-manifest.json';
  const marker = {
    branch: 'smoke-legacy',
    configSha256: 'a'.repeat(64),
    configSource: `${worktreePath}/.oat/config.local.json`,
    manifestPath,
    policy: { network: 'offline' },
    runIdentity: 'smoke-legacy',
    schemaVersion: 2,
  };
  const bootstrap = {
    ...marker,
    markerPath: `${worktreePath}/.oat/smoke-bootstrap.json`,
  };
  delete bootstrap.schemaVersion;
  const manifest = {
    branch: marker.branch,
    effectiveSmokeBootstrap: bootstrap,
    intendedSmokeBootstrap: bootstrap,
    manifestPath,
    runIdentity: marker.runIdentity,
    worktreePath,
  };

  assert.deepEqual(validateSmokeMarkerBinding(marker, manifest), marker);
});

test('retains both concurrent child registrations with atomic manifest updates', async () => {
  const repository = await createRepository('oat-smoke-journal-race-');
  let manifest;

  try {
    manifest = await provision(repository, 'journal-race');
    const children = [
      {
        branch: 'smoke-child-p01',
        path: join(repository, '.children/p01'),
      },
      {
        branch: 'smoke-child-p02',
        path: join(repository, '.children/p02'),
      },
    ];
    for (const child of children) {
      await addChild(repository, manifest, child.branch, child.path);
    }

    await Promise.all(
      children.map(async (child) => {
        const worktreePath = await realpath(child.path);
        return registerNestedSmokeResource({
          manifestPath: manifest.manifestPath,
          markerPath: join(worktreePath, '.oat/smoke-bootstrap.json'),
          worktreePath,
        });
      }),
    );

    const updated = JSON.parse(await readFile(manifest.manifestPath, 'utf8'));
    assert.deepEqual(
      updated.ownershipJournal.resources.map((entry) => entry.branch).sort(),
      children.map((child) => child.branch).sort(),
    );
    assert.deepEqual(
      (await readdir(dirname(manifest.manifestPath))).filter(
        (name) => name.includes('.tmp') || name.endsWith('.lock'),
      ),
      [],
    );

    const result = await cleanup(repository, manifest.manifestPath);
    assert.equal(result.status, 'cleaned');
    assert.equal(
      await git(['branch', '--list', 'smoke-*'], { cwd: repository }),
      '',
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('cleans a journaled branch left after interrupted child worktree removal', async () => {
  const repository = await createRepository('oat-smoke-journal-interrupt-');
  let manifest;

  try {
    manifest = await provision(repository, 'journal-interrupt');
    const branch = 'smoke-child-interrupted';
    const worktreePath = join(repository, '.children/interrupted');
    await addChild(repository, manifest, branch, worktreePath);
    const canonicalWorktreePath = await realpath(worktreePath);
    await registerNestedSmokeResource({
      manifestPath: manifest.manifestPath,
      markerPath: join(canonicalWorktreePath, '.oat/smoke-bootstrap.json'),
      worktreePath: canonicalWorktreePath,
    });
    await git(['worktree', 'remove', '--force', worktreePath], {
      cwd: repository,
    });
    assert.match(
      await git(['branch', '--list', branch], { cwd: repository }),
      new RegExp(branch),
    );

    const result = await cleanup(repository, manifest.manifestPath);
    assert.equal(result.status, 'cleaned');
    assert.equal(
      await git(['branch', '--list', branch], { cwd: repository }),
      '',
    );
    assert.equal(
      await git(['branch', '--list', manifest.branch], { cwd: repository }),
      '',
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

function childOf(manifest, name) {
  const worktreePath = join(dirname(manifest.manifestPath), name);
  return {
    branch: `${manifest.branch}-${name}`,
    markerPath: join(worktreePath, '.oat/smoke-bootstrap.json'),
    worktreePath,
  };
}

function reservationFor(manifest, child) {
  return {
    baselineCommitSha: manifest.baselineCommitSha,
    branch: child.branch,
    manifestPath: manifest.manifestPath,
    markerPath: child.markerPath,
    worktreePath: child.worktreePath,
  };
}

async function readJournal(manifest) {
  return JSON.parse(await readFile(manifest.manifestPath, 'utf8'))
    .ownershipJournal;
}

async function addReservedChild(manifest, child) {
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

test('persists reserved intent before creation and finalizes it afterwards', async () => {
  const repository = await createRepository('oat-smoke-journal-reserve-');

  try {
    const manifest = await provision(repository, 'journal-reserve');
    const child = childOf(manifest, 'phase-p01');

    const reserved = await reserveNestedSmokeResource(
      reservationFor(manifest, child),
    );
    assert.equal(reserved.state, 'reserved');

    const afterReserve = await readJournal(manifest);
    assert.equal(afterReserve.schemaVersion, OWNERSHIP_JOURNAL_SCHEMA_VERSION);
    assert.equal(afterReserve.resources.length, 1);
    assert.deepEqual(
      {
        baselineCommitSha: afterReserve.resources[0].baselineCommitSha,
        branch: afterReserve.resources[0].branch,
        commonGitDir: afterReserve.resources[0].commonGitDir,
        markerPath: afterReserve.resources[0].markerPath,
        runIdentity: afterReserve.resources[0].runIdentity,
        state: afterReserve.resources[0].state,
        worktreePath: afterReserve.resources[0].worktreePath,
      },
      {
        baselineCommitSha: manifest.baselineCommitSha,
        branch: child.branch,
        commonGitDir: manifest.commonGitDir,
        markerPath: child.markerPath,
        runIdentity: manifest.runIdentity,
        state: 'reserved',
        worktreePath: child.worktreePath,
      },
    );
    // The reservation is intent only: no Git state exists yet.
    assert.equal(
      await git(['branch', '--list', child.branch], { cwd: repository }),
      '',
    );

    // An identical replay is idempotent and appends nothing.
    assert.deepEqual(
      await reserveNestedSmokeResource(reservationFor(manifest, child)),
      afterReserve.resources[0],
    );
    assert.equal((await readJournal(manifest)).resources.length, 1);

    await addReservedChild(manifest, child);
    const finalized = await registerNestedSmokeResource({
      manifestPath: manifest.manifestPath,
      markerPath: child.markerPath,
      worktreePath: child.worktreePath,
    });
    assert.equal(finalized.state, 'registered');

    const afterFinalize = await readJournal(manifest);
    assert.equal(afterFinalize.resources.length, 1);
    const entry = afterFinalize.resources[0];
    assert.equal(entry.state, 'registered');
    assert.ok(entry.registeredAt);
    assert.ok(entry.reservedAt);
    // Finalization records corroboration; it never rewrites reserved intent.
    assert.equal(entry.baselineCommitSha, manifest.baselineCommitSha);
    assert.equal(entry.branch, child.branch);
    assert.equal(entry.markerPath, child.markerPath);
    assert.equal(entry.worktreePath, child.worktreePath);

    // Re-registering a finalized entry stays idempotent.
    await registerNestedSmokeResource({
      manifestPath: manifest.manifestPath,
      markerPath: child.markerPath,
      worktreePath: child.worktreePath,
    });
    assert.equal((await readJournal(manifest)).resources.length, 1);

    const result = await cleanup(repository, manifest.manifestPath);
    assert.equal(result.status, 'cleaned');
    assert.equal(
      await git(['branch', '--list', 'smoke-*'], { cwd: repository }),
      '',
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses reservations that are unsafe, conflicting, or out of run scope', async () => {
  const repository = await createRepository('oat-smoke-journal-refuse-');

  try {
    const manifest = await provision(repository, 'journal-refuse');
    const child = childOf(manifest, 'phase-p01');
    const base = reservationFor(manifest, child);

    const refusals = [
      // A different branch may not take the reserved path, and the reserved
      // branch may not move to a different path.
      { ...base, branch: `${manifest.branch}-other` },
      {
        ...base,
        markerPath: join(
          dirname(manifest.manifestPath),
          'phase-p02/.oat/smoke-bootstrap.json',
        ),
        worktreePath: join(dirname(manifest.manifestPath), 'phase-p02'),
      },
    ];
    const preReservation = [
      // Escaping the run directory, in either direction.
      {
        ...base,
        markerPath: join(repository, 'escape/.oat/smoke-bootstrap.json'),
        worktreePath: join(repository, 'escape'),
      },
      {
        ...base,
        markerPath: join(
          dirname(manifest.manifestPath),
          'a/b/.oat/smoke-bootstrap.json',
        ),
        worktreePath: join(dirname(manifest.manifestPath), 'a/b'),
      },
      // The outer worktree and outer branch are never child resources.
      {
        ...base,
        markerPath: join(manifest.worktreePath, '.oat/smoke-bootstrap.json'),
        worktreePath: manifest.worktreePath,
      },
      { ...base, branch: manifest.branch },
      // The marker must be the tracked marker inside the intended child.
      { ...base, markerPath: join(child.worktreePath, 'smoke-bootstrap.json') },
      // Unsafe branch syntax and non-run baselines.
      { ...base, branch: '--upload-pack=touch' },
      { ...base, branch: 'refs/heads/../../escape' },
      { ...base, baselineCommitSha: manifest.sourceCommitSha },
    ];

    for (const attempt of preReservation) {
      await assert.rejects(
        () => reserveNestedSmokeResource(attempt),
        OwnershipJournalError,
      );
      assert.deepEqual((await readJournal(manifest)).resources, []);
    }

    await reserveNestedSmokeResource(base);
    for (const attempt of refusals) {
      await assert.rejects(
        () => reserveNestedSmokeResource(attempt),
        /conflicting child path or branch/,
      );
    }
    const journal = await readJournal(manifest);
    assert.equal(journal.resources.length, 1);
    assert.equal(journal.resources[0].branch, child.branch);

    // A path that already exists is never a reservable creation target.
    const occupied = childOf(manifest, 'phase-p03');
    await mkdir(occupied.worktreePath, { recursive: true });
    await assert.rejects(
      () => reserveNestedSmokeResource(reservationFor(manifest, occupied)),
      /reserved worktree path already exists/,
    );
    assert.equal((await readJournal(manifest)).resources.length, 1);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('serializes concurrent reservations and leaves no lock or temporary file', async () => {
  const repository = await createRepository('oat-smoke-journal-reserve-race-');

  try {
    const manifest = await provision(repository, 'journal-reserve-race');
    const children = ['phase-p01', 'phase-p02', 'phase-p03'].map((name) =>
      childOf(manifest, name),
    );

    await Promise.all(
      children.map((child) =>
        reserveNestedSmokeResource(reservationFor(manifest, child)),
      ),
    );

    const journal = await readJournal(manifest);
    assert.deepEqual(
      journal.resources.map((entry) => entry.branch).sort(),
      children.map((child) => child.branch).sort(),
    );
    assert.deepEqual(
      journal.resources.map((entry) => entry.state),
      ['reserved', 'reserved', 'reserved'],
    );
    assert.deepEqual(
      (await readdir(dirname(manifest.manifestPath))).filter(
        (name) => name.includes('.tmp') || name.endsWith('.lock'),
      ),
      [],
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses to finalize a reservation the materialized child contradicts', async () => {
  const repository = await createRepository('oat-smoke-journal-mismatch-');

  try {
    const manifest = await provision(repository, 'journal-mismatch');
    const child = childOf(manifest, 'phase-p01');
    await reserveNestedSmokeResource(reservationFor(manifest, child));

    // The reserved path materialized on a branch the reservation never named.
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'worktree',
        'add',
        '-b',
        `${manifest.branch}-impostor`,
        child.worktreePath,
        manifest.baselineCommitSha,
      ],
      { cwd: manifest.worktreePath },
    );

    await assert.rejects(
      () =>
        registerNestedSmokeResource({
          manifestPath: manifest.manifestPath,
          markerPath: child.markerPath,
          worktreePath: child.worktreePath,
        }),
      /conflicting child path or branch/,
    );
    const journal = await readJournal(manifest);
    assert.equal(journal.resources.length, 1);
    assert.equal(journal.resources[0].state, 'reserved');
    assert.equal(journal.resources[0].branch, child.branch);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('reads schema version 1 manifests without manufacturing reserved ownership', async () => {
  const repository = await createRepository('oat-smoke-journal-v1-');

  try {
    const manifest = await provision(repository, 'journal-v1');
    const legacy = JSON.parse(await readFile(manifest.manifestPath, 'utf8'));
    legacy.ownershipJournal = { resources: [], schemaVersion: 1 };
    await writeFile(
      manifest.manifestPath,
      `${JSON.stringify(legacy, null, 2)}\n`,
    );

    // A v1 manifest never gains reserved intent: a v1 reader would read it as
    // established ownership.
    const child = childOf(manifest, 'phase-p01');
    await assert.rejects(
      () => reserveNestedSmokeResource(reservationFor(manifest, child)),
      /reservations require ownership journal schema version 2/,
    );
    assert.equal(
      (await readJournal(manifest)).schemaVersion,
      1,
      'a v1 manifest version is never rewritten in place',
    );
    assert.deepEqual((await readJournal(manifest)).resources, []);

    // Direct registration still works and its entries read as registered.
    const branch = 'smoke-child-legacy';
    const worktreePath = join(repository, '.children/legacy');
    await addChild(repository, manifest, branch, worktreePath);
    await registerNestedSmokeResource({
      manifestPath: manifest.manifestPath,
      markerPath: join(worktreePath, '.oat/smoke-bootstrap.json'),
      worktreePath,
    });
    const journal = await readJournal(manifest);
    assert.equal(journal.schemaVersion, 1);
    assert.equal(journal.resources.length, 1);

    const result = await cleanup(repository, manifest.manifestPath);
    assert.equal(result.status, 'cleaned');
    assert.equal(
      await git(['branch', '--list', 'smoke-*'], { cwd: repository }),
      '',
    );
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('refuses to reserve a branch or worktree registration that already exists', async () => {
  const repository = await createRepository('oat-smoke-journal-preexisting-');

  try {
    const manifest = await provision(repository, 'journal-preexisting');
    const child = childOf(manifest, 'phase-p01');

    // A branch that already points at the run baseline was not created by this
    // run. Reserving it would record intent to own someone else's ref, and
    // branch-only reconciliation would then delete it on an exact tip match.
    await git(['branch', child.branch, manifest.baselineCommitSha], {
      cwd: repository,
    });
    await assert.rejects(
      () => reserveNestedSmokeResource(reservationFor(manifest, child)),
      /reserved branch already exists/,
    );
    assert.deepEqual((await readJournal(manifest)).resources, []);

    // Cleanup then leaves it alone: it is an unjournaled run descendant.
    await assert.rejects(
      () => cleanup(repository, manifest.manifestPath),
      /run-descendant branch .* is not journaled/,
    );
    assert.match(
      await git(['branch', '--list', child.branch], { cwd: repository }),
      new RegExp(child.branch),
    );

    // A stale Git worktree registration at the reserved path is equally
    // disqualifying, even once the branch is gone.
    await git(['branch', '--delete', '--force', '--', child.branch], {
      cwd: repository,
    });
    await addReservedChild(manifest, child);
    await git(['checkout', '--detach'], { cwd: child.worktreePath });
    await git(['branch', '--delete', '--force', '--', child.branch], {
      cwd: repository,
    });
    await rm(child.worktreePath, { force: true, recursive: true });
    await assert.rejects(
      () => reserveNestedSmokeResource(reservationFor(manifest, child)),
      /already registered with Git/,
    );
    assert.deepEqual((await readJournal(manifest)).resources, []);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});

test('serializes concurrent identical and conflicting reservations', async () => {
  const repository = await createRepository(
    'oat-smoke-journal-reserve-conflict-',
  );

  try {
    const manifest = await provision(repository, 'journal-reserve-conflict');
    const child = childOf(manifest, 'phase-p01');

    // Identical concurrent requests collapse to exactly one reservation.
    const identical = await Promise.all(
      [0, 1, 2].map(() =>
        reserveNestedSmokeResource(reservationFor(manifest, child)),
      ),
    );
    assert.equal((await readJournal(manifest)).resources.length, 1);
    assert.deepEqual(
      identical.map((entry) => entry.branch),
      [child.branch, child.branch, child.branch],
    );

    // A concurrent request for the same path under a different branch loses.
    const conflicting = await Promise.allSettled([
      reserveNestedSmokeResource(reservationFor(manifest, child)),
      reserveNestedSmokeResource({
        ...reservationFor(manifest, child),
        branch: `${manifest.branch}-phase-p01-rival`,
      }),
    ]);
    assert.equal(conflicting[0].status, 'fulfilled');
    assert.equal(conflicting[1].status, 'rejected');
    assert.match(
      conflicting[1].reason.message,
      /conflicting child path or branch/,
    );
    const journal = await readJournal(manifest);
    assert.equal(journal.resources.length, 1);
    assert.equal(journal.resources[0].branch, child.branch);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});
