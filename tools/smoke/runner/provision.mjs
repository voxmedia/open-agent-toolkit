import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { applyPresetToFixture } from '../fixture/presets/apply-preset.mjs';

const execFileAsync = promisify(execFile);
const runnerDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(runnerDirectory, '../../..');
const fixturePath = join(repositoryRoot, 'tools/smoke/fixture');
const runRoot = join(repositoryRoot, 'tools/smoke/.runs');

const SCENARIO_PRESETS = {
  full: 'pre-review',
  implement: 'implementation-ready',
  'plan-review': 'pre-review',
};

const defaultFileSystem = { cp, mkdir, realpath, writeFile };

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

function createManifest({
  appliedScenario,
  branch,
  harness,
  manifestPath,
  runPath,
  worktreePath,
}) {
  return {
    appliedScenario,
    branch,
    createdPaths: [manifestPath, runPath],
    fixtureProjectPath: join(worktreePath, '.oat/projects/smoke-fixture'),
    harness,
    manifestPath,
    worktreePath,
    writableRoots: [],
  };
}

async function saveManifest(manifest, fileSystem) {
  await fileSystem.mkdir(dirname(manifest.manifestPath), { recursive: true });
  await fileSystem.writeFile(
    manifest.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

export function createBranchName({
  clock = () => new Date(),
  random = randomUUID,
} = {}) {
  const timestamp = formatTimestamp(clock()).replace(/[^A-Za-z0-9-]/g, '-');
  const nonce = String(random()).replace(/[^A-Za-z0-9-]/g, '');

  if (!nonce) {
    throw new Error(
      'Smoke branch random value must contain an alphanumeric character.',
    );
  }

  return `smoke-${timestamp}-${nonce}`;
}

export async function provisionSmoke(
  { harness, scenario },
  {
    applyPreset = applyPresetToFixture,
    clock,
    fileSystem = defaultFileSystem,
    fixture = fixturePath,
    git = runGit,
    random,
    repository = repositoryRoot,
    runsDirectory = runRoot,
  } = {},
) {
  const preset = assertScenario(scenario);
  const branch = createBranchName({ clock, random });
  const runPath = join(runsDirectory, branch);
  const worktreePath = join(runPath, 'worktree');
  const manifestPath = join(runPath, 'provisioning-manifest.json');
  const manifest = createManifest({
    appliedScenario: scenario,
    branch,
    harness,
    manifestPath,
    runPath,
    worktreePath,
  });

  await saveManifest(manifest, fileSystem);

  try {
    await fileSystem.mkdir(runPath, { recursive: true });
    await git(['worktree', 'add', '-b', branch, worktreePath, 'HEAD'], {
      cwd: repository,
    });
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

    const configPath = join(worktreePath, '.oat/config.local.json');
    await fileSystem.writeFile(
      configPath,
      `${JSON.stringify(
        {
          activeProject: manifest.fixtureProjectPath,
          smoke: { harness, scenario },
        },
        null,
        2,
      )}\n`,
    );
    manifest.createdPaths.push(configPath);
    await saveManifest(manifest, fileSystem);

    applyPreset(preset, manifest.fixtureProjectPath);
    const commonDirectory = relativeToAbsolute(
      await git(['rev-parse', '--git-common-dir'], { cwd: worktreePath }),
      worktreePath,
    );
    manifest.writableRoots = writableRoots(
      harness,
      worktreePath,
      await fileSystem.realpath(commonDirectory),
    );
    await saveManifest(manifest, fileSystem);

    return manifest;
  } catch (error) {
    await saveManifest(manifest, fileSystem);
    throw error;
  }
}
