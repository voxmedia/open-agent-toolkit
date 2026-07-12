import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename as renameFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  createBranchName,
  gateRuntimeForHarness,
  gateTargetForHarness,
  provisionSmoke,
} from './provision.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../..');
const fixturePath = join(repositoryRoot, 'tools/smoke/fixture');
const smokeBootstrapPolicy = {
  config: {
    copy: 'marker-source-only',
    preserveBytes: true,
  },
  copyPrimary: {
    archivedProjects: false,
    environment: false,
    localProjects: false,
    mcp: false,
  },
  localPathSync: false,
  providerViewSync: false,
  s3ArchiveSync: false,
  sharedHooks: false,
};

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
  await mkdir(join(directory, '.oat'), { recursive: true });
  await writeFile(
    join(directory, '.oat/config.json'),
    `${JSON.stringify(
      {
        workflow: {
          postImplementSequence: {
            preApproval: ['summary', 'document', 'pr'],
            postApproval: ['summary', 'document', 'pr'],
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(join(directory, 'README.md'), 'smoke fixture host\n');
  await git(['add', '.oat/config.json', 'README.md'], { cwd: directory });
  await git(['commit', '-m', 'initial'], { cwd: directory });
  return directory;
}

async function resolveLocalCloseoutPolicy(worktreePath, home) {
  const { stdout } = await execFileAsync(
    join(repositoryRoot, 'node_modules/.bin/tsx'),
    [
      '--tsconfig',
      join(repositoryRoot, 'packages/cli/tsconfig.json'),
      join(repositoryRoot, 'packages/cli/src/index.ts'),
      '--json',
      '--cwd',
      worktreePath,
      'config',
      'get',
      'workflow.postImplementSequence',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, HOME: home },
    },
  );
  return JSON.parse(stdout);
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

  assert.equal(
    branch,
    'smoke-automated-2026-07-11T20-30-45-123Z-uuidwithpunctuation',
  );
  assert.doesNotMatch(branch, /\//);
  assert.equal(
    createBranchName({
      clock: () => new Date('2026-07-11T20:30:45.123Z'),
      driveMode: 'operator',
      random: () => 'uuid/with:punctuation',
    }),
    'smoke-operator-2026-07-11T20-30-45-123Z-uuidwithpunctuation',
  );
  assert.notEqual(
    branch,
    createBranchName({
      clock: () => new Date('2026-07-11T20:30:45.123Z'),
      random: () => 'another-uuid',
    }),
  );
});

test('selects a deterministic cross-runtime gate target per harness', () => {
  assert.equal(gateTargetForHarness('codex'), 'cursor-gpt-5-6-sol-max');
  assert.equal(gateTargetForHarness('claude'), 'codex-5-6-sol-max');
  assert.equal(gateTargetForHarness('cursor-cli'), 'codex-5-6-sol-max');
  assert.equal(gateTargetForHarness('cursor-ide'), 'codex-5-6-sol-max');
  assert.equal(gateRuntimeForHarness('codex'), 'cursor');
  assert.equal(gateRuntimeForHarness('claude'), 'codex');
  assert.throws(() => gateTargetForHarness('unknown'), /No independent/);
  assert.throws(() => gateRuntimeForHarness('unknown'), /No independent/);
});

test('rejects a pre-existing branch collision without claiming or deleting it', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const branch = 'smoke-automated-2026-07-11T20-30-45-123Z-collision';
  const manifestPath = join(
    runsDirectory,
    branch,
    'provisioning-manifest.json',
  );
  const existingTip = await git(['rev-parse', 'HEAD'], { cwd: repository });
  await git(['branch', branch, existingTip], { cwd: repository });

  try {
    await assert.rejects(
      () =>
        provisionSmoke(
          { harness: 'codex', scenario: 'implement' },
          {
            clock: () => new Date('2026-07-11T20:30:45.123Z'),
            fixture: fixturePath,
            git,
            random: () => 'collision',
            repository,
            runsDirectory,
          },
        ),
      new RegExp(`existing branch collision: ${branch}`),
    );
    assert.equal(
      await git(['rev-parse', `refs/heads/${branch}`], { cwd: repository }),
      existingTip,
    );
    await assert.rejects(() => readFile(manifestPath), { code: 'ENOENT' });
  } finally {
    await git(['branch', '--delete', '--force', branch], {
      cwd: repository,
    }).catch(() => {});
    await rm(repository, { force: true, recursive: true });
  }
});

test('provisions an isolated fixture, preset, manifest, and harness roots', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const homeConfig = join(repository, 'home/.oat/config.json');
  await mkdir(join(repository, 'home/.oat'), { recursive: true });
  await writeFile(homeConfig, '{"personal":true}\n');
  const originalUserConfig = await readFile(homeConfig, 'utf8');
  const sourceCommitSha = await git(['rev-parse', 'HEAD'], { cwd: repository });
  const hookLog = join(repository, '.git/smoke-hook.log');
  for (const hook of ['post-checkout', 'pre-commit']) {
    const hookPath = join(repository, '.git/hooks', hook);
    await writeFile(
      hookPath,
      `#!/bin/sh\nprintf '${hook}\\n' >> ${JSON.stringify(hookLog)}\n`,
    );
    await chmod(hookPath, 0o755);
  }
  const manifestPublishes = [];
  let childWorktreePath;
  let manifest;

  try {
    manifest = await provisionSmoke(
      { harness: 'codex', scenario: 'implement' },
      {
        clock: () => new Date('2026-07-11T20:30:45.123Z'),
        fileSystem: {
          cp,
          mkdir,
          realpath,
          async rename(source, destination) {
            if (destination.endsWith('provisioning-manifest.json')) {
              manifestPublishes.push({ destination, source });
            }
            return renameFile(source, destination);
          },
          rm,
          writeFile,
        },
        fixture: fixturePath,
        git,
        random: () => 'test-run',
        repository,
        runsDirectory,
      },
    );

    assert.equal(
      manifest.branch,
      'smoke-automated-2026-07-11T20-30-45-123Z-test-run',
    );
    assert.equal(manifest.driveMode, 'automated');
    assert.equal(
      manifest.reportRoot,
      join(repository, 'tools/smoke/reports/codex/implement'),
    );
    assert.equal(manifest.appliedScenario, 'implement');
    assert.equal(manifest.sourceCommitSha, sourceCommitSha);
    assert.match(manifest.baselineCommitSha, /^[0-9a-f]{40}$/);
    assert.notEqual(manifest.baselineCommitSha, sourceCommitSha);
    assert.equal(manifest.gateRuntime, 'cursor');
    assert.equal(manifest.gateTarget, 'cursor-gpt-5-6-sol-max');
    assert.deepEqual(manifest.branchOwnership, {
      baseCommitSha: sourceCommitSha,
      baselineCommitSha: manifest.baselineCommitSha,
      branch: manifest.branch,
      createdByRun: true,
      runIdentity: manifest.branch,
    });
    assert.equal(manifest.runIdentity, manifest.branch);
    assert.equal(
      manifest.commonGitDir,
      await realpath(join(repository, '.git')),
    );
    assert.deepEqual(manifest.ownershipJournal, {
      resources: [],
      schemaVersion: 1,
    });
    assert.equal(manifest.provisioningState, 'ready');
    assert.deepEqual(manifest.readiness, { status: 'ready' });
    assert.deepEqual(manifest.intendedCloseoutPolicy, {
      source: 'local',
      value: { preApproval: [], postApproval: [] },
    });
    const configPath = join(manifest.worktreePath, '.oat/config.local.json');
    const markerPath = join(manifest.worktreePath, '.oat/smoke-bootstrap.json');
    const configSha256 = createHash('sha256')
      .update(await readFile(configPath))
      .digest('hex');
    const expectedSmokeBootstrap = {
      branch: manifest.branch,
      configSha256,
      configSource: configPath,
      manifestPath: manifest.manifestPath,
      markerPath,
      policy: smokeBootstrapPolicy,
      runIdentity: manifest.branch,
    };
    assert.deepEqual(manifest.intendedSmokeBootstrap, expectedSmokeBootstrap);
    assert.deepEqual(manifest.effectiveSmokeBootstrap, expectedSmokeBootstrap);
    assert.deepEqual(manifest.createdPaths, [
      manifest.manifestPath,
      join(runsDirectory, manifest.branch),
      manifest.worktreePath,
      join(manifest.worktreePath, '.oat'),
      join(manifest.worktreePath, '.oat/projects'),
      manifest.fixtureProjectPath,
      join(manifest.worktreePath, 'workspace'),
      configPath,
      markerPath,
    ]);
    assert.deepEqual(
      JSON.parse(await readFile(manifest.manifestPath, 'utf8')),
      manifest,
    );
    assert.ok(manifestPublishes.length > 1);
    for (const { destination, source } of manifestPublishes) {
      assert.equal(destination, manifest.manifestPath);
      assert.equal(resolve(source, '..'), resolve(destination, '..'));
      assert.match(source, /\.tmp$/);
      await assert.rejects(() => readFile(source), { code: 'ENOENT' });
    }
    assert.equal(await readFile(homeConfig, 'utf8'), originalUserConfig);
    await assert.rejects(() => readFile(hookLog), { code: 'ENOENT' });

    const config = JSON.parse(
      await readFile(
        join(manifest.worktreePath, '.oat/config.local.json'),
        'utf8',
      ),
    );
    assert.equal(config.activeProject, manifest.fixtureProjectPath);
    assert.deepEqual(config.smoke, {
      driveMode: 'automated',
      harness: 'codex',
      scenario: 'implement',
    });
    assert.deepEqual(config.workflow.postImplementSequence, {
      preApproval: [],
      postApproval: [],
    });
    assert.deepEqual(
      config.workflow.gates.execTargets['cursor-gpt-5-6-sol-max'],
      {
        availabilityCommand: ['cursor-agent', '--version'],
        baseCommand: [
          'node',
          'tools/smoke/runner/cursor-broker-client.mjs',
          '-p',
          '--force',
          '--model',
          'gpt-5.6-sol-max',
        ],
        invocation: {
          model: 'gpt-5.6-sol-max',
          reasoningEffort: 'provider-default',
        },
        priority: 120,
        runtime: 'cursor',
      },
    );
    assert.deepEqual(manifest.effectiveCloseoutPolicy, {
      source: 'local',
      value: { preApproval: [], postApproval: [] },
    });
    assert.equal(
      await git(['rev-parse', `${manifest.baselineCommitSha}^`], {
        cwd: repository,
      }),
      sourceCommitSha,
    );
    assert.equal(
      await git(['rev-parse', `refs/heads/${manifest.branch}`], {
        cwd: repository,
      }),
      manifest.baselineCommitSha,
    );
    assert.deepEqual(
      (
        await git(
          [
            'diff-tree',
            '--no-commit-id',
            '--name-only',
            '-r',
            manifest.baselineCommitSha,
          ],
          { cwd: repository },
        )
      ).split('\n'),
      [
        '.oat/projects/smoke-fixture/design.md',
        '.oat/projects/smoke-fixture/discovery.md',
        '.oat/projects/smoke-fixture/implementation.md',
        '.oat/projects/smoke-fixture/plan.md',
        '.oat/projects/smoke-fixture/state.md',
        '.oat/smoke-bootstrap.json',
        'workspace/logs/p01.log',
        'workspace/logs/p02.log',
        'workspace/logs/p03.log',
      ],
    );
    assert.equal(
      await git(['status', '--short', '--untracked-files=all'], {
        cwd: manifest.worktreePath,
      }),
      '?? .oat/config.local.json',
    );
    await assert.rejects(
      () =>
        git(
          [
            'cat-file',
            '-e',
            `${manifest.baselineCommitSha}:.oat/config.local.json`,
          ],
          { cwd: repository },
        ),
      /Command failed/,
    );
    childWorktreePath = join(runsDirectory, `${manifest.branch}-child`);
    await git(
      [
        'worktree',
        'add',
        '--detach',
        childWorktreePath,
        manifest.baselineCommitSha,
      ],
      { cwd: repository },
    );
    assert.match(
      await readFile(
        join(childWorktreePath, '.oat/projects/smoke-fixture/plan.md'),
        'utf8',
      ),
      /oat_ready_for: oat-project-implement/,
    );
    assert.match(
      await readFile(join(childWorktreePath, 'workspace/logs/p01.log'), 'utf8'),
      /phase p01/,
    );
    await assert.rejects(
      () => readFile(join(childWorktreePath, '.oat/config.local.json')),
      { code: 'ENOENT' },
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(
          join(childWorktreePath, '.oat/smoke-bootstrap.json'),
          'utf8',
        ),
      ),
      JSON.parse(await readFile(markerPath, 'utf8')),
    );
    assert.deepEqual(
      await resolveLocalCloseoutPolicy(
        manifest.worktreePath,
        join(repository, 'home'),
      ),
      {
        key: 'workflow.postImplementSequence',
        source: 'local',
        status: 'ok',
        value: { preApproval: [], postApproval: [] },
      },
    );
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
    if (childWorktreePath) {
      await git(['worktree', 'remove', '--force', childWorktreePath], {
        cwd: repository,
      }).catch(() => {});
    }
    if (manifest) {
      await removeProvision(repository, manifest);
    }
    await rm(repository, { force: true, recursive: true });
  }
});

test('preserves a partial manifest when fixture copying fails', async () => {
  const repository = await createRepository();
  const runsDirectory = join(repository, '.smoke-runs');
  const branch = 'smoke-automated-2026-07-11T20-30-45-123Z-copy-fails';
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
              rename: renameFile,
              rm,
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
    assert.deepEqual(manifest.intendedCloseoutPolicy, {
      source: 'local',
      value: { preApproval: [], postApproval: [] },
    });
    assert.deepEqual(
      manifest.intendedSmokeBootstrap.policy,
      smokeBootstrapPolicy,
    );
    assert.equal(Object.hasOwn(manifest, 'effectiveCloseoutPolicy'), false);
    assert.equal(Object.hasOwn(manifest, 'effectiveSmokeBootstrap'), false);
    assert.equal(manifest.baselineCommitSha, null);
    assert.equal(manifest.provisioningState, 'failed');
    assert.equal(manifest.readiness.status, 'not-ready');
    assert.match(manifest.readiness.reason, /copy failed/);
    assert.deepEqual(manifest.branchOwnership, {
      baseCommitSha: manifest.sourceCommitSha,
      baselineCommitSha: null,
      branch,
      createdByRun: true,
      runIdentity: branch,
    });
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
