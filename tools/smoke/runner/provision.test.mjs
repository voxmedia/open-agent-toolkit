import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { createBranchName, provisionSmoke } from './provision.mjs';

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

async function createRepository() {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-provision-'));
  await git(['init', '--initial-branch=main'], { cwd: directory });
  await git(['config', 'user.email', 'smoke@example.test'], { cwd: directory });
  await git(['config', 'user.name', 'Smoke Test'], { cwd: directory });
  await writeFile(join(directory, 'README.md'), 'smoke fixture host\n');
  await git(['add', 'README.md'], { cwd: directory });
  await git(['commit', '-m', 'initial'], { cwd: directory });
  return directory;
}

async function removeProvision(repository, manifest) {
  await git(['worktree', 'remove', '--force', manifest.worktreePath], {
    cwd: repository,
  }).catch(() => {});
  await git(['branch', '--delete', '--force', manifest.branch], {
    cwd: repository,
  }).catch(() => {});
  await rm(join(manifest.worktreePath, '..'), { force: true, recursive: true });
}

test('uses flat collision-resistant deterministic branch names', () => {
  const branch = createBranchName({
    clock: () => new Date('2026-07-11T20:30:45.123Z'),
    random: () => 'uuid/with:punctuation',
  });

  assert.equal(branch, 'smoke-2026-07-11T20-30-45-123Z-uuidwithpunctuation');
  assert.doesNotMatch(branch, /\//);
  assert.notEqual(
    branch,
    createBranchName({
      clock: () => new Date('2026-07-11T20:30:45.123Z'),
      random: () => 'another-uuid',
    }),
  );
});

test('provisions an isolated fixture, preset, manifest, and harness roots', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const homeConfig = join(repository, 'home/.oat/config.json');
  await mkdir(join(repository, 'home/.oat'), { recursive: true });
  await writeFile(homeConfig, '{"personal":true}\n');
  const originalUserConfig = await readFile(homeConfig, 'utf8');
  let manifest;

  try {
    manifest = await provisionSmoke(
      { harness: 'codex', scenario: 'implement' },
      {
        clock: () => new Date('2026-07-11T20:30:45.123Z'),
        fixture: fixturePath,
        git,
        random: () => 'test-run',
        repository,
        runsDirectory,
      },
    );

    assert.equal(manifest.branch, 'smoke-2026-07-11T20-30-45-123Z-test-run');
    assert.equal(manifest.appliedScenario, 'implement');
    assert.deepEqual(manifest.createdPaths, [
      manifest.manifestPath,
      join(runsDirectory, manifest.branch),
      manifest.worktreePath,
      join(manifest.worktreePath, '.oat'),
      join(manifest.worktreePath, '.oat/projects'),
      manifest.fixtureProjectPath,
      join(manifest.worktreePath, 'workspace'),
      join(manifest.worktreePath, '.oat/config.local.json'),
    ]);
    assert.deepEqual(
      JSON.parse(await readFile(manifest.manifestPath, 'utf8')),
      manifest,
    );
    assert.equal(await readFile(homeConfig, 'utf8'), originalUserConfig);

    const config = JSON.parse(
      await readFile(
        join(manifest.worktreePath, '.oat/config.local.json'),
        'utf8',
      ),
    );
    assert.equal(config.activeProject, manifest.fixtureProjectPath);
    assert.deepEqual(config.smoke, { harness: 'codex', scenario: 'implement' });
    assert.match(
      await readFile(join(manifest.fixtureProjectPath, 'plan.md'), 'utf8'),
      /oat_ready_for: oat-project-implement/,
    );
    assert.deepEqual(manifest.writableRoots, [
      {
        harness: 'codex',
        roots: [
          { path: manifest.worktreePath, purpose: 'worktree-content' },
          {
            path: await realpath(join(repository, '.git')),
            purpose: 'shared-git-metadata',
          },
          {
            path: join(manifest.worktreePath, '.agents'),
            purpose: 'agent-managed-content',
          },
        ],
      },
    ]);
  } finally {
    if (manifest) {
      await removeProvision(repository, manifest);
    }
    await rm(repository, { force: true, recursive: true });
  }
});

test('preserves a partial manifest when fixture copying fails', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const branch = 'smoke-2026-07-11T20-30-45-123Z-copy-fails';
  const manifestPath = join(
    runsDirectory,
    branch,
    'provisioning-manifest.json',
  );

  try {
    await assert.rejects(
      () =>
        provisionSmoke(
          { harness: 'claude', scenario: 'plan-review' },
          {
            clock: () => new Date('2026-07-11T20:30:45.123Z'),
            fileSystem: {
              cp: async () => {
                throw new Error('copy failed');
              },
              mkdir,
              realpath,
              writeFile,
            },
            fixture: fixturePath,
            git,
            random: () => 'copy-fails',
            repository,
            runsDirectory,
          },
        ),
      /copy failed/,
    );

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.branch, branch);
    assert.equal(manifest.appliedScenario, 'plan-review');
    assert.ok(manifest.createdPaths.includes(manifest.worktreePath));
    assert.ok(
      manifest.createdPaths.includes(
        join(manifest.worktreePath, '.oat/projects'),
      ),
    );
    assert.equal(
      manifest.fixtureProjectPath,
      join(manifest.worktreePath, '.oat/projects/smoke-fixture'),
    );
    await removeProvision(repository, manifest);
  } finally {
    await rm(repository, { force: true, recursive: true });
  }
});
