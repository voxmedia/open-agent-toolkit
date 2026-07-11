import { execFile } from 'node:child_process';
import { lstat, readFile, realpath, rm, rmdir } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class CleanupRefusalError extends Error {
  constructor(message) {
    super(`Smoke cleanup refused: ${message}`);
    this.name = 'CleanupRefusalError';
  }
}

async function runGit(args, { cwd } = {}) {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return stdout.trim();
}

function isWithin(parent, candidate) {
  const pathFromParent = relative(parent, candidate);
  return (
    pathFromParent === '' ||
    (!pathFromParent.startsWith('..') && !isAbsolute(pathFromParent))
  );
}

function requireAbsolutePath(value, field) {
  if (typeof value !== 'string' || !isAbsolute(value)) {
    throw new CleanupRefusalError(`${field} must be an absolute path.`);
  }

  return resolve(value);
}

function requireBranch(value) {
  if (
    typeof value !== 'string' ||
    !/^smoke-[A-Za-z0-9-]+$/.test(value) ||
    value.includes('/')
  ) {
    throw new CleanupRefusalError('branch must be a flat smoke branch name.');
  }

  return value;
}

function requireCommitSha(value, field) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    throw new CleanupRefusalError(`${field} must be a full commit SHA.`);
  }

  return value;
}

function validateBranchOwnership(manifest, branch) {
  if (manifest.branchOwnership === undefined) {
    return null;
  }

  const ownership = manifest.branchOwnership;
  if (
    !ownership ||
    typeof ownership !== 'object' ||
    Array.isArray(ownership) ||
    ownership.createdByRun !== true
  ) {
    throw new CleanupRefusalError(
      'branchOwnership must explicitly record creation by this run.',
    );
  }
  if (ownership.branch !== branch) {
    throw new CleanupRefusalError(
      'branchOwnership does not match the recorded branch.',
    );
  }

  const sourceCommitSha = requireCommitSha(
    manifest.sourceCommitSha,
    'sourceCommitSha',
  );
  const baseCommitSha = requireCommitSha(
    ownership.baseCommitSha,
    'branchOwnership.baseCommitSha',
  );
  const expectedTipCommitSha = requireCommitSha(
    ownership.expectedTipCommitSha,
    'branchOwnership.expectedTipCommitSha',
  );
  if (baseCommitSha !== sourceCommitSha) {
    throw new CleanupRefusalError(
      'branch ownership base does not match the source commit.',
    );
  }

  const recordedTip = manifest.baselineCommitSha ?? sourceCommitSha;
  if (
    requireCommitSha(recordedTip, 'recorded branch tip') !==
    expectedTipCommitSha
  ) {
    throw new CleanupRefusalError(
      'branch ownership tip does not match the recorded provisioning tip.',
    );
  }

  return {
    baseCommitSha,
    expectedTipCommitSha,
  };
}

function validateManifest(manifest, runsDirectory) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new CleanupRefusalError('manifest must be a JSON object.');
  }

  const smokeRoot = requireAbsolutePath(runsDirectory, 'runsDirectory');
  const branch = requireBranch(manifest.branch);
  const branchOwnership = validateBranchOwnership(manifest, branch);
  const manifestPath = requireAbsolutePath(
    manifest.manifestPath,
    'manifestPath',
  );
  const runPath = dirname(manifestPath);
  const worktreePath = requireAbsolutePath(
    manifest.worktreePath,
    'worktreePath',
  );

  if (
    dirname(runPath) !== smokeRoot ||
    basename(runPath) !== branch ||
    basename(manifestPath) !== 'provisioning-manifest.json'
  ) {
    throw new CleanupRefusalError(
      'manifest path must identify its flat branch directory under the expected smoke root.',
    );
  }

  if (worktreePath !== join(runPath, 'worktree')) {
    throw new CleanupRefusalError(
      'worktreePath must be the manifest run directory worktree.',
    );
  }

  if (manifest.fixtureProjectPath !== undefined) {
    const fixtureProjectPath = requireAbsolutePath(
      manifest.fixtureProjectPath,
      'fixtureProjectPath',
    );
    if (
      fixtureProjectPath !== join(worktreePath, '.oat/projects/smoke-fixture')
    ) {
      throw new CleanupRefusalError(
        'fixtureProjectPath is outside the expected disposable worktree location.',
      );
    }
  }

  const createdPaths = manifest.createdPaths ?? [];
  if (!Array.isArray(createdPaths)) {
    throw new CleanupRefusalError(
      'createdPaths must be an array when present.',
    );
  }

  const normalizedCreatedPaths = [];
  for (const [index, path] of createdPaths.entries()) {
    const normalizedPath = requireAbsolutePath(path, `createdPaths[${index}]`);
    const allowed =
      normalizedPath === runPath ||
      normalizedPath === manifestPath ||
      isWithin(worktreePath, normalizedPath);

    if (!allowed || normalizedPath === smokeRoot) {
      throw new CleanupRefusalError(
        `createdPaths[${index}] is outside the manifest-owned smoke resources.`,
      );
    }

    if (!normalizedCreatedPaths.includes(normalizedPath)) {
      normalizedCreatedPaths.push(normalizedPath);
    }
  }

  return {
    branch,
    branchOwnership,
    createdPaths: normalizedCreatedPaths,
    manifestPath,
    runPath,
    smokeRoot,
    worktreePath,
  };
}

function parseWorktrees(output) {
  if (!output) {
    return [];
  }

  return output
    .split(/\n\n+/)
    .map((block) => {
      const entry = {};
      for (const line of block.split('\n')) {
        const separator = line.indexOf(' ');
        const key = separator === -1 ? line : line.slice(0, separator);
        const value = separator === -1 ? true : line.slice(separator + 1);
        entry[key] = value;
      }
      return entry;
    })
    .filter((entry) => typeof entry.worktree === 'string');
}

async function pathExists(path, fileSystem) {
  try {
    await fileSystem.lstat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function canonicalPath(path, fileSystem) {
  try {
    return await fileSystem.realpath(path);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return resolve(path);
    }
    throw error;
  }
}

async function readManifest(manifestOrPath, runsDirectory, fileSystem) {
  if (typeof manifestOrPath !== 'string') {
    return { manifest: manifestOrPath, missing: false };
  }

  const manifestPath = requireAbsolutePath(manifestOrPath, 'manifestPath');
  const smokeRoot = requireAbsolutePath(runsDirectory, 'runsDirectory');
  if (
    !isWithin(smokeRoot, manifestPath) ||
    basename(manifestPath) !== 'provisioning-manifest.json'
  ) {
    throw new CleanupRefusalError(
      'manifest path is outside the expected smoke root.',
    );
  }

  if (!(await pathExists(manifestPath, fileSystem))) {
    return { manifest: null, missing: true };
  }

  try {
    return {
      manifest: JSON.parse(await fileSystem.readFile(manifestPath, 'utf8')),
      missing: false,
    };
  } catch (error) {
    throw new CleanupRefusalError(
      `manifest could not be read as complete JSON: ${error.message}`,
    );
  }
}

function removalOrder(paths) {
  return [...new Set(paths)].sort((first, second) => {
    const depthDifference = second.split('/').length - first.split('/').length;
    return depthDifference || second.length - first.length;
  });
}

export async function cleanupSmoke(
  manifestOrPath,
  {
    fileSystem = { lstat, readFile, realpath, rm, rmdir },
    git = runGit,
    keep = false,
    repository,
    runsDirectory,
  } = {},
) {
  if (!repository || !runsDirectory) {
    throw new TypeError(
      'repository and runsDirectory are required for cleanup.',
    );
  }

  if (keep) {
    return { actions: [], status: 'kept' };
  }

  const loaded = await readManifest(manifestOrPath, runsDirectory, fileSystem);
  if (loaded.missing) {
    return { actions: [], status: 'noop' };
  }

  const resources = validateManifest(loaded.manifest, runsDirectory);
  const actions = [];
  const worktrees = parseWorktrees(
    await git(['worktree', 'list', '--porcelain'], { cwd: repository }),
  );
  const canonicalWorktreePath = await canonicalPath(
    resources.worktreePath,
    fileSystem,
  );
  const canonicalWorktrees = await Promise.all(
    worktrees.map(async (entry) => ({
      ...entry,
      canonicalPath: await canonicalPath(entry.worktree, fileSystem),
    })),
  );
  const expectedBranchRef = `refs/heads/${resources.branch}`;
  const registeredAtPath = canonicalWorktrees.find(
    (entry) => entry.canonicalPath === canonicalWorktreePath,
  );
  const branchRegistrations = canonicalWorktrees.filter(
    (entry) => entry.branch === expectedBranchRef,
  );

  if (registeredAtPath && registeredAtPath.branch !== expectedBranchRef) {
    throw new CleanupRefusalError(
      'the recorded worktree path is registered to a different branch.',
    );
  }

  if (
    branchRegistrations.some(
      (entry) => entry.canonicalPath !== canonicalWorktreePath,
    )
  ) {
    throw new CleanupRefusalError(
      'the recorded branch is checked out in an unrecorded worktree.',
    );
  }

  const branchOutput = await git(['branch', '--list', resources.branch], {
    cwd: repository,
  });
  const branchExists = Boolean(branchOutput.trim());
  if (
    !resources.branchOwnership &&
    (registeredAtPath || branchRegistrations.length > 0 || branchExists)
  ) {
    throw new CleanupRefusalError(
      'branch or worktree exists without explicit run ownership.',
    );
  }

  if (resources.branchOwnership && branchExists) {
    const actualTipCommitSha = await git(
      ['rev-parse', '--verify', expectedBranchRef],
      { cwd: repository },
    );
    if (actualTipCommitSha !== resources.branchOwnership.expectedTipCommitSha) {
      throw new CleanupRefusalError(
        'recorded branch tip no longer corroborates run ownership.',
      );
    }
  }

  if (
    registeredAtPath &&
    resources.branchOwnership &&
    registeredAtPath.HEAD !== resources.branchOwnership.expectedTipCommitSha
  ) {
    throw new CleanupRefusalError(
      'recorded worktree HEAD no longer corroborates run ownership.',
    );
  }

  if (registeredAtPath) {
    await git(['worktree', 'remove', '--force', resources.worktreePath], {
      cwd: repository,
    });
    actions.push(`worktree:${resources.worktreePath}`);
  }

  if (branchExists) {
    await git(['branch', '--delete', '--force', resources.branch], {
      cwd: repository,
    });
    actions.push(`branch:${resources.branch}`);
  }

  const removablePaths = [
    ...resources.createdPaths,
    resources.manifestPath,
    resources.worktreePath,
  ];
  for (const path of removalOrder(removablePaths)) {
    if (!(await pathExists(path, fileSystem))) {
      continue;
    }

    await fileSystem.rm(path, { force: true, recursive: true });
    actions.push(`path:${path}`);
  }

  if (
    resources.runPath !== resources.smokeRoot &&
    (await pathExists(resources.runPath, fileSystem))
  ) {
    try {
      await fileSystem.rmdir(resources.runPath);
      actions.push(`directory:${resources.runPath}`);
    } catch (error) {
      if (error?.code !== 'ENOTEMPTY' && error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return {
    actions,
    status: actions.length === 0 ? 'noop' : 'cleaned',
  };
}
