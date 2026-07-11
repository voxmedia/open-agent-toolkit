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
import { registerNestedSmokeResource } from './journal.mjs';
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
  const directory = await mkdtemp(join(tmpdir(), prefix));
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
