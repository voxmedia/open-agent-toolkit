import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, promisify } from 'node:util';

import { applyPresetToFixture } from '../fixture/presets/apply-preset.mjs';
import { gitCommonDirectory } from './journal.mjs';

const execFileAsync = promisify(execFile);
const runnerDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(runnerDirectory, '../../..');
const fixturePath = join(repositoryRoot, 'tools/smoke/fixture');
const runRoot = join(repositoryRoot, 'tools/smoke/.runs');
const GATE_TARGETS = {
  claude: 'codex-5-6-sol-max',
  codex: 'cursor-default',
  'cursor-cli': 'codex-5-6-sol-max',
  'cursor-ide': 'codex-5-6-sol-max',
};
const cliEntryPoint = join(repositoryRoot, 'packages/cli/src/index.ts');
const cliTsconfig = join(repositoryRoot, 'packages/cli/tsconfig.json');
const tsxExecutable = join(repositoryRoot, 'node_modules/.bin/tsx');
const SMOKE_CLOSEOUT_POLICY = Object.freeze({
  preApproval: Object.freeze([]),
  postApproval: Object.freeze([]),
});
const SMOKE_BOOTSTRAP_POLICY = Object.freeze({
  build: Object.freeze({
    allowed: true,
    argv: Object.freeze(['run', 'build']),
    outputScope: 'disposable-child-worktree',
  }),
  config: Object.freeze({
    copy: 'marker-source-only',
    preserveBytes: true,
  }),
  copyPrimary: Object.freeze({
    archivedProjects: false,
    environment: false,
    localProjects: false,
    mcp: false,
  }),
  dependencyInstall: Object.freeze({
    argv: Object.freeze([
      'install',
      '--offline',
      '--frozen-lockfile',
      '--ignore-scripts',
    ]),
    lifecycleScripts: false,
    lockfile: 'frozen',
    network: 'offline',
  }),
  localPathSync: false,
  providerViewSync: false,
  s3ArchiveSync: false,
  sharedHooks: false,
});

const SCENARIO_PRESETS = {
  full: 'pre-review',
  implement: 'implementation-ready',
  'plan-review': 'pre-review',
};

const defaultFileSystem = { cp, mkdir, realpath, rename, rm, writeFile };

async function runGit(args, { cwd } = {}) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

function formatTimestamp(value) {
  return value instanceof Date
    ? value.toISOString().replace(/[:.]/g, '-')
    : String(value);
}

function assertScenario(scenario) {
  const preset = SCENARIO_PRESETS[scenario];

  if (!preset) {
    throw new TypeError(`Unknown smoke scenario: ${scenario}`);
  }

  return preset;
}

function relativeToAbsolute(path, cwd) {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

function smokeConfigContents({
  driveMode,
  fixtureProjectPath,
  harness,
  scenario,
}) {
  return `${JSON.stringify(
    {
      activeProject: fixtureProjectPath,
      smoke: { driveMode, harness, scenario },
      workflow: { postImplementSequence: SMOKE_CLOSEOUT_POLICY },
    },
    null,
    2,
  )}\n`;
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function writableRoots(harness, worktreePath, gitMetadataPath) {
  const commonRoots = [
    { path: worktreePath, purpose: 'worktree-content' },
    { path: gitMetadataPath, purpose: 'shared-git-metadata' },
  ];
  const roots =
    harness === 'codex'
      ? [
          ...commonRoots,
          {
            path: join(worktreePath, '.agents'),
            purpose: 'agent-managed-content',
          },
        ]
      : commonRoots;

  return [{ harness, roots }];
}

async function resolveCloseoutPolicy(worktreePath) {
  const { stdout } = await execFileAsync(
    tsxExecutable,
    [
      '--tsconfig',
      cliTsconfig,
      cliEntryPoint,
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
      env: process.env,
    },
  );
  const resolution = JSON.parse(stdout);

  if (
    resolution.status !== 'ok' ||
    resolution.source !== 'local' ||
    !isDeepStrictEqual(resolution.value, SMOKE_CLOSEOUT_POLICY)
  ) {
    throw new Error(
      'Disposable local closeout policy did not resolve to the smoke policy.',
    );
  }

  return {
    source: resolution.source,
    value: resolution.value,
  };
}

function createManifest({
  appliedScenario,
  branch,
  commonGitDir,
  driveMode,
  harness,
  manifestPath,
  reportRoot,
  runPath,
  sourceCommitSha,
  worktreePath,
}) {
  const configPath = join(worktreePath, '.oat/config.local.json');
  const markerPath = join(worktreePath, '.oat/smoke-bootstrap.json');
  const fixtureProjectPath = join(worktreePath, '.oat/projects/smoke-fixture');
  const configSha256 = sha256(
    smokeConfigContents({
      fixtureProjectPath,
      driveMode,
      harness,
      scenario: appliedScenario,
    }),
  );

  return {
    appliedScenario,
    baselineCommitSha: null,
    branch,
    commonGitDir,
    createdPaths: [manifestPath, runPath],
    fixtureProjectPath,
    driveMode,
    gateTarget: gateTargetForHarness(harness),
    harness,
    intendedCloseoutPolicy: {
      source: 'local',
      value: SMOKE_CLOSEOUT_POLICY,
    },
    intendedSmokeBootstrap: {
      branch,
      configSha256,
      configSource: configPath,
      manifestPath,
      markerPath,
      policy: SMOKE_BOOTSTRAP_POLICY,
      runIdentity: branch,
    },
    manifestPath,
    ownershipJournal: {
      resources: [],
      schemaVersion: 1,
    },
    provisioningState: 'initializing',
    reportRoot,
    readiness: {
      reason: 'provisioning',
      status: 'not-ready',
    },
    sourceCommitSha,
    runIdentity: branch,
    worktreePath,
    writableRoots: [],
  };
}

async function saveManifest(manifest, fileSystem) {
  await fileSystem.mkdir(dirname(manifest.manifestPath), { recursive: true });
  const temporaryPath = `${manifest.manifestPath}.${process.pid}-${randomUUID()}.tmp`;

  try {
    await fileSystem.writeFile(
      temporaryPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await fileSystem.rename(temporaryPath, manifest.manifestPath);
  } finally {
    await fileSystem.rm(temporaryPath, { force: true }).catch(() => {});
  }
}

export function gateTargetForHarness(harness) {
  const target = GATE_TARGETS[harness];
  if (!target) {
    throw new TypeError(`No independent gate target for harness ${harness}.`);
  }
  return target;
}

export function createBranchName({
  clock = () => new Date(),
  driveMode = 'automated',
  random = randomUUID,
} = {}) {
  if (!['automated', 'operator'].includes(driveMode)) {
    throw new TypeError(`Unknown smoke drive mode: ${driveMode}`);
  }
  const timestamp = formatTimestamp(clock()).replace(/[^A-Za-z0-9-]/g, '-');
  const nonce = String(random()).replace(/[^A-Za-z0-9-]/g, '');

  if (!nonce) {
    throw new Error(
      'Smoke branch random value must contain an alphanumeric character.',
    );
  }

  return `smoke-${driveMode}-${timestamp}-${nonce}`;
}

export async function provisionSmoke(
  { driveMode = 'automated', harness, scenario },
  {
    applyPreset = applyPresetToFixture,
    clock,
    fileSystem = defaultFileSystem,
    fixture = fixturePath,
    git = runGit,
    random,
    repository = repositoryRoot,
    resolvePolicy = resolveCloseoutPolicy,
    runsDirectory = runRoot,
  } = {},
) {
  const preset = assertScenario(scenario);
  const branch = createBranchName({ clock, driveMode, random });
  const runPath = join(runsDirectory, branch);
  const worktreePath = join(runPath, 'worktree');
  const manifestPath = join(runPath, 'provisioning-manifest.json');
  const reportRoot = join(
    repository,
    'tools',
    'smoke',
    'reports',
    harness,
    ...(driveMode === 'operator' ? ['operator'] : []),
    scenario,
  );
  const existingBranch = await git(['branch', '--list', branch], {
    cwd: repository,
  });
  if (existingBranch.trim()) {
    throw new Error(
      `Smoke provisioning refused existing branch collision: ${branch}`,
    );
  }

  const sourceCommitSha = await git(['rev-parse', 'HEAD'], { cwd: repository });
  const commonGitDir = await gitCommonDirectory(repository, {
    fileSystem,
    git,
  });
  const manifest = createManifest({
    appliedScenario: scenario,
    branch,
    commonGitDir,
    driveMode,
    harness,
    manifestPath,
    reportRoot,
    runPath,
    sourceCommitSha,
    worktreePath,
  });

  await saveManifest(manifest, fileSystem);

  try {
    await fileSystem.mkdir(runPath, { recursive: true });
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'worktree',
        'add',
        '-b',
        branch,
        worktreePath,
        sourceCommitSha,
      ],
      {
        cwd: repository,
      },
    );
    manifest.branchOwnership = {
      baseCommitSha: sourceCommitSha,
      baselineCommitSha: null,
      branch,
      createdByRun: true,
      runIdentity: branch,
    };
    manifest.provisioningState = 'worktree-created';
    manifest.createdPaths.push(worktreePath);
    await saveManifest(manifest, fileSystem);

    const oatDirectory = join(worktreePath, '.oat');
    const projectsDirectory = join(oatDirectory, 'projects');
    await fileSystem.mkdir(projectsDirectory, { recursive: true });
    manifest.createdPaths.push(oatDirectory, projectsDirectory);
    await saveManifest(manifest, fileSystem);

    await fileSystem.cp(join(fixture, 'project'), manifest.fixtureProjectPath, {
      recursive: true,
    });
    manifest.createdPaths.push(manifest.fixtureProjectPath);
    await saveManifest(manifest, fileSystem);

    const workspacePath = join(worktreePath, 'workspace');
    await fileSystem.cp(join(fixture, 'workspace'), workspacePath, {
      recursive: true,
    });
    manifest.createdPaths.push(workspacePath);
    await saveManifest(manifest, fileSystem);

    applyPreset(preset, manifest.fixtureProjectPath);
    const configPath = join(worktreePath, '.oat/config.local.json');
    const configContents = smokeConfigContents({
      driveMode,
      fixtureProjectPath: manifest.fixtureProjectPath,
      harness,
      scenario,
    });
    await fileSystem.writeFile(configPath, configContents);
    manifest.createdPaths.push(configPath);
    await saveManifest(manifest, fileSystem);

    const markerPath = join(worktreePath, '.oat/smoke-bootstrap.json');
    await fileSystem.writeFile(
      markerPath,
      `${JSON.stringify(
        {
          branch,
          configSha256: sha256(configContents),
          configSource: configPath,
          manifestPath,
          policy: SMOKE_BOOTSTRAP_POLICY,
          runIdentity: branch,
          schemaVersion: 2,
        },
        null,
        2,
      )}\n`,
    );
    manifest.createdPaths.push(markerPath);
    manifest.effectiveSmokeBootstrap = {
      branch,
      configSha256: sha256(configContents),
      configSource: configPath,
      manifestPath,
      markerPath,
      policy: SMOKE_BOOTSTRAP_POLICY,
      runIdentity: branch,
    };
    await saveManifest(manifest, fileSystem);

    await git(
      [
        'add',
        '--',
        '.oat/projects/smoke-fixture',
        '.oat/smoke-bootstrap.json',
        'workspace/logs',
      ],
      {
        cwd: worktreePath,
      },
    );
    await git(
      [
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '-m',
        'test(smoke): establish fixture baseline',
      ],
      {
        cwd: worktreePath,
      },
    );
    manifest.baselineCommitSha = await git(['rev-parse', 'HEAD'], {
      cwd: worktreePath,
    });
    manifest.branchOwnership.baselineCommitSha = manifest.baselineCommitSha;
    manifest.provisioningState = 'baseline-committed';
    await saveManifest(manifest, fileSystem);

    const effectiveCloseoutPolicy = await resolvePolicy(worktreePath);
    if (
      effectiveCloseoutPolicy?.source !== 'local' ||
      !isDeepStrictEqual(effectiveCloseoutPolicy.value, SMOKE_CLOSEOUT_POLICY)
    ) {
      throw new Error(
        'Resolved closeout policy does not match the intended smoke policy.',
      );
    }
    manifest.effectiveCloseoutPolicy = effectiveCloseoutPolicy;
    manifest.provisioningState = 'config-resolved';
    await saveManifest(manifest, fileSystem);

    const worktreeStatus = await git(
      ['status', '--short', '--untracked-files=all'],
      {
        cwd: worktreePath,
      },
    );
    const unexpectedStatus = worktreeStatus
      .split('\n')
      .filter((line) => line && line !== '?? .oat/config.local.json');
    if (unexpectedStatus.length > 0) {
      throw new Error(
        `Disposable fixture baseline left unexpected worktree content: ${unexpectedStatus.join(', ')}`,
      );
    }

    const commonDirectory = relativeToAbsolute(
      await git(['rev-parse', '--git-common-dir'], { cwd: worktreePath }),
      worktreePath,
    );
    manifest.writableRoots = writableRoots(
      harness,
      worktreePath,
      await fileSystem.realpath(commonDirectory),
    );
    manifest.provisioningState = 'ready';
    manifest.readiness = { status: 'ready' };
    await saveManifest(manifest, fileSystem);

    return manifest;
  } catch (error) {
    manifest.provisioningState = 'failed';
    manifest.readiness = {
      reason: error instanceof Error ? error.message : String(error),
      status: 'not-ready',
    };
    await saveManifest(manifest, fileSystem);
    throw error;
  }
}
