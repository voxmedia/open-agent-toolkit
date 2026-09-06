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

import {
  gitCommonDirectory,
  isCommitAncestor,
  parseWorktrees,
  readSmokeMarkerAtCommit,
  requireCommitSha as requireJournalCommitSha,
  requireSafeBranchName,
  resolveJournalEntryState,
  SUPPORTED_OWNERSHIP_JOURNAL_SCHEMA_VERSIONS,
  validateSmokeMarkerBinding,
} from './journal.mjs';

const CHILD_MARKER_RELATIVE_PATH = '.oat/smoke-bootstrap.json';

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
  try {
    return requireJournalCommitSha(value, field);
  } catch (error) {
    throw new CleanupRefusalError(error.message);
  }
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
  if (baseCommitSha !== sourceCommitSha) {
    throw new CleanupRefusalError(
      'branch ownership base does not match the source commit.',
    );
  }

  const manifestBaseline = manifest.baselineCommitSha;
  const ownershipBaseline = ownership.baselineCommitSha;
  if (manifestBaseline === null && ownershipBaseline === null) {
    return {
      baseCommitSha,
      baselineCommitSha: null,
      sourceCommitSha,
      state: 'pre-baseline',
    };
  }

  const baselineCommitSha = requireCommitSha(
    ownershipBaseline,
    'branchOwnership.baselineCommitSha',
  );
  if (
    requireCommitSha(manifestBaseline, 'baselineCommitSha') !==
    baselineCommitSha
  ) {
    throw new CleanupRefusalError(
      'branch ownership baseline does not match the recorded smoke baseline.',
    );
  }
  if (
    ownership.runIdentity !== manifest.runIdentity ||
    manifest.runIdentity !== branch
  ) {
    throw new CleanupRefusalError(
      'branch ownership run identity does not match the manifest.',
    );
  }

  return {
    baseCommitSha,
    baselineCommitSha,
    sourceCommitSha,
    state: 'completed',
  };
}

function requireJournalBranch(value, field) {
  try {
    return requireSafeBranchName(value, field);
  } catch (error) {
    throw new CleanupRefusalError(error.message);
  }
}

function requireJournalEntryState(entry, schemaVersion, field) {
  try {
    return resolveJournalEntryState(entry, schemaVersion, field);
  } catch (error) {
    throw new CleanupRefusalError(error.message);
  }
}

function validateOwnershipJournal(
  manifest,
  worktreePath,
  commonGitDir,
  runPath,
) {
  const journal = manifest.ownershipJournal;
  if (
    !journal ||
    typeof journal !== 'object' ||
    Array.isArray(journal) ||
    !SUPPORTED_OWNERSHIP_JOURNAL_SCHEMA_VERSIONS.includes(
      journal.schemaVersion,
    ) ||
    !Array.isArray(journal.resources)
  ) {
    throw new CleanupRefusalError(
      'ownershipJournal must use the supported schema.',
    );
  }

  const seenBranches = new Set();
  const seenWorktrees = new Set();
  return journal.resources.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new CleanupRefusalError(
        `ownershipJournal.resources[${index}] must be an object.`,
      );
    }
    const branch = requireJournalBranch(
      entry.branch,
      `ownershipJournal.resources[${index}].branch`,
    );
    const nestedWorktreePath = requireAbsolutePath(
      entry.worktreePath,
      `ownershipJournal.resources[${index}].worktreePath`,
    );
    const baselineCommitSha = requireCommitSha(
      entry.baselineCommitSha,
      `ownershipJournal.resources[${index}].baselineCommitSha`,
    );
    const state = requireJournalEntryState(
      entry,
      journal.schemaVersion,
      `ownershipJournal.resources[${index}].state`,
    );
    // Every schema-v2 entry carries its own marker path, so a missing one is
    // only ever legitimate for a schema-v1 entry written before the field
    // existed. Accepting it more widely would let a forged state transition
    // shed the corroboration a reservation depends on.
    const markerPath =
      entry.markerPath === undefined && journal.schemaVersion === 1
        ? null
        : requireAbsolutePath(
            entry.markerPath,
            `ownershipJournal.resources[${index}].markerPath`,
          );
    if (
      markerPath !== null &&
      markerPath !== join(nestedWorktreePath, CHILD_MARKER_RELATIVE_PATH)
    ) {
      throw new CleanupRefusalError(
        `ownershipJournal.resources[${index}].markerPath is not the tracked marker in its journaled worktree.`,
      );
    }
    // Re-derive the invariants the reservation writer enforced. Cleanup must
    // not trust a manifest to have been written by that writer: an entry that
    // named a resource outside the run directory, or a baseline other than the
    // run's own, would otherwise enter the owned sets and skip the
    // unjournaled-run-descendant refusal.
    //
    // These bind to reserved *origin*, not to the current state, because
    // finalization never rewrites them. Scoping them to `state === 'reserved'`
    // alone would let a forged `registered` transition shed them while keeping
    // every other reservation field.
    if (state === 'reserved' || entry.reservedAt !== undefined) {
      if (
        dirname(nestedWorktreePath) !== runPath ||
        nestedWorktreePath === runPath
      ) {
        throw new CleanupRefusalError(
          `ownershipJournal.resources[${index}] reserves a worktree outside the manifest run directory.`,
        );
      }
      if (baselineCommitSha !== manifest.baselineCommitSha) {
        throw new CleanupRefusalError(
          `ownershipJournal.resources[${index}] reserves a baseline other than the run baseline.`,
        );
      }
    }
    if (
      nestedWorktreePath === worktreePath ||
      branch === manifest.branch ||
      entry.commonGitDir !== commonGitDir ||
      entry.runIdentity !== manifest.runIdentity ||
      seenBranches.has(branch) ||
      seenWorktrees.has(nestedWorktreePath)
    ) {
      throw new CleanupRefusalError(
        `ownershipJournal.resources[${index}] conflicts with run ownership.`,
      );
    }
    seenBranches.add(branch);
    seenWorktrees.add(nestedWorktreePath);
    return {
      baselineCommitSha,
      branch,
      commonGitDir,
      markerPath,
      runIdentity: entry.runIdentity,
      state,
      worktreePath: nestedWorktreePath,
    };
  });
}

function validateManifest(manifest, runsDirectory) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new CleanupRefusalError('manifest must be a JSON object.');
  }

  const smokeRoot = requireAbsolutePath(runsDirectory, 'runsDirectory');
  const branch = requireBranch(manifest.branch);
  const branchOwnership = validateBranchOwnership(manifest, branch);
  const commonGitDir = requireAbsolutePath(
    manifest.commonGitDir,
    'commonGitDir',
  );
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
  const nestedResources = validateOwnershipJournal(
    manifest,
    worktreePath,
    commonGitDir,
    runPath,
  );

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
      isWithin(runPath, normalizedPath) ||
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
    commonGitDir,
    createdPaths: normalizedCreatedPaths,
    manifestPath,
    runPath,
    smokeRoot,
    nestedResources,
    worktreePath,
  };
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
    if (
      manifestOrPath &&
      typeof manifestOrPath === 'object' &&
      typeof manifestOrPath.manifestPath === 'string'
    ) {
      const authoritativePath = requireAbsolutePath(
        manifestOrPath.manifestPath,
        'manifestPath',
      );
      if (await pathExists(authoritativePath, fileSystem)) {
        try {
          return {
            manifest: JSON.parse(
              await fileSystem.readFile(authoritativePath, 'utf8'),
            ),
            missing: false,
          };
        } catch (error) {
          throw new CleanupRefusalError(
            `manifest could not be read as complete JSON: ${error.message}`,
          );
        }
      }
    }
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

function asCleanupRefusal(error) {
  if (error instanceof CleanupRefusalError) {
    return error;
  }
  return new CleanupRefusalError(error.message);
}

async function validateOwnedResource(
  resource,
  {
    canonicalWorktrees,
    fileSystem,
    git,
    manifest,
    repository,
    branchMap,
    commonGitDir,
  },
) {
  try {
    const marker = await readSmokeMarkerAtCommit(resource.baselineCommitSha, {
      cwd: repository,
      git,
    });
    validateSmokeMarkerBinding(marker, manifest);
  } catch (error) {
    throw asCleanupRefusal(error);
  }

  const branchRef = `refs/heads/${resource.branch}`;
  const registeredAtPath = canonicalWorktrees.find(
    (entry) => entry.canonicalPath === resource.worktreePath,
  );
  const branchRegistrations = canonicalWorktrees.filter(
    (entry) => entry.branch === branchRef,
  );
  if (registeredAtPath && registeredAtPath.branch !== branchRef) {
    throw new CleanupRefusalError(
      `journaled worktree ${resource.worktreePath} is registered to a different branch.`,
    );
  }
  if (
    branchRegistrations.some(
      (entry) => entry.canonicalPath !== resource.worktreePath,
    )
  ) {
    throw new CleanupRefusalError(
      `journaled branch ${resource.branch} is checked out in an unjournaled worktree.`,
    );
  }

  const branchTip = branchMap.get(resource.branch);
  if (
    branchTip &&
    !(await isCommitAncestor(resource.baselineCommitSha, branchTip, {
      cwd: repository,
      git,
    }))
  ) {
    throw new CleanupRefusalError(
      `branch ${resource.branch} diverged from its ownership baseline.`,
    );
  }
  if (registeredAtPath) {
    if (!branchTip || registeredAtPath.HEAD !== branchTip) {
      throw new CleanupRefusalError(
        `worktree ${resource.worktreePath} no longer corroborates its journaled branch.`,
      );
    }
    if (
      !(await isCommitAncestor(
        resource.baselineCommitSha,
        registeredAtPath.HEAD,
        { cwd: repository, git },
      ))
    ) {
      throw new CleanupRefusalError(
        `worktree ${resource.worktreePath} diverged from its ownership baseline.`,
      );
    }
    if (await pathExists(resource.worktreePath, fileSystem)) {
      let actualCommonDirectory;
      try {
        actualCommonDirectory = await gitCommonDirectory(
          resource.worktreePath,
          {
            fileSystem,
            git,
          },
        );
      } catch (error) {
        throw new CleanupRefusalError(
          `could not corroborate the shared Git directory for ${resource.worktreePath}: ${error.message}`,
        );
      }
      if (
        actualCommonDirectory !== commonGitDir ||
        actualCommonDirectory !== resource.commonGitDir
      ) {
        throw new CleanupRefusalError(
          `worktree ${resource.worktreePath} belongs to a mismatched shared Git directory.`,
        );
      }
    }
  }

  return {
    branchExists: Boolean(branchTip),
    registered: Boolean(registeredAtPath),
  };
}

async function requireReservedChildMarker(resource, { fileSystem, manifest }) {
  if (
    resource.markerPath !==
    join(resource.worktreePath, CHILD_MARKER_RELATIVE_PATH)
  ) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} no longer resolves to its recorded marker path.`,
    );
  }
  let stats;
  try {
    stats = await fileSystem.lstat(resource.markerPath);
  } catch {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} is missing its run marker.`,
    );
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} marker is not a real regular file.`,
    );
  }
  let marker;
  try {
    marker = JSON.parse(await fileSystem.readFile(resource.markerPath, 'utf8'));
  } catch (error) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} marker is not valid JSON: ${error.message}`,
    );
  }
  try {
    validateSmokeMarkerBinding(marker, manifest);
  } catch (error) {
    throw asCleanupRefusal(error);
  }
  return marker;
}

/**
 * Reconcile a reservation that may or may not have materialized.
 *
 * A reservation is durable intent, not established ownership, so this refuses
 * every state it cannot corroborate exactly rather than inferring ownership
 * from the reserved branch name, the reserved path prefix, or the age of the
 * run. Deletion is authorized only for state that matches the recorded
 * reservation exactly:
 *
 * - neither branch nor worktree materialized: nothing is deleted and only the
 *   manifest reservation goes away with the run manifest;
 * - branch and worktree both registered exactly as reserved: the reserved
 *   baseline must be an ancestor of the corroborated HEAD, the shared Git
 *   directory must match, and the child's run marker must bind to this run;
 * - branch present without a worktree: its tip must equal the reserved
 *   baseline exactly and that baseline must carry this run's marker.
 *
 * Anything else — a path without exact Git registration, a mismatched branch,
 * HEAD, or shared Git directory, a missing marker, or a worktree without its
 * reserved branch — fails closed and is left untouched.
 */
async function validateReservedResource(
  resource,
  {
    canonicalWorktrees,
    fileSystem,
    git,
    manifest,
    repository,
    branchMap,
    commonGitDir,
  },
) {
  const branchRef = `refs/heads/${resource.branch}`;
  const registeredAtPath = canonicalWorktrees.find(
    (entry) => entry.canonicalPath === resource.worktreePath,
  );
  const branchRegistrations = canonicalWorktrees.filter(
    (entry) => entry.branch === branchRef,
  );
  const branchTip = branchMap.get(resource.branch);
  const pathOnDisk = await pathExists(resource.worktreePath, fileSystem);

  if (!branchTip && !registeredAtPath) {
    if (pathOnDisk) {
      throw new CleanupRefusalError(
        `reserved worktree path ${resource.worktreePath} exists without Git worktree registration.`,
      );
    }
    if (branchRegistrations.length > 0) {
      throw new CleanupRefusalError(
        `reserved branch ${resource.branch} is checked out in an unreserved worktree.`,
      );
    }
    return { branchExists: false, branchTip: null, registered: false };
  }

  if (!branchTip) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} is registered without its reserved branch.`,
    );
  }
  if (
    branchRegistrations.some(
      (entry) => entry.canonicalPath !== resource.worktreePath,
    )
  ) {
    throw new CleanupRefusalError(
      `reserved branch ${resource.branch} is checked out in an unreserved worktree.`,
    );
  }

  try {
    const baselineMarker = await readSmokeMarkerAtCommit(
      resource.baselineCommitSha,
      { cwd: repository, git },
    );
    validateSmokeMarkerBinding(baselineMarker, manifest);
  } catch (error) {
    throw asCleanupRefusal(error);
  }

  if (!registeredAtPath) {
    if (pathOnDisk) {
      throw new CleanupRefusalError(
        `reserved worktree path ${resource.worktreePath} exists without Git worktree registration.`,
      );
    }
    if (branchTip !== resource.baselineCommitSha) {
      throw new CleanupRefusalError(
        `reserved branch ${resource.branch} does not exactly match its reserved baseline.`,
      );
    }
    return { branchExists: true, branchTip, registered: false };
  }

  if (registeredAtPath.branch !== branchRef) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} is registered to a different branch.`,
    );
  }
  if (!pathOnDisk) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} is registered but missing from disk.`,
    );
  }
  if (registeredAtPath.HEAD !== branchTip) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} no longer corroborates its reserved branch.`,
    );
  }
  if (
    !(await isCommitAncestor(
      resource.baselineCommitSha,
      registeredAtPath.HEAD,
      {
        cwd: repository,
        git,
      },
    ))
  ) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} diverged from its reserved baseline.`,
    );
  }

  let actualCommonDirectory;
  try {
    actualCommonDirectory = await gitCommonDirectory(resource.worktreePath, {
      fileSystem,
      git,
    });
  } catch (error) {
    throw new CleanupRefusalError(
      `could not corroborate the shared Git directory for ${resource.worktreePath}: ${error.message}`,
    );
  }
  if (
    actualCommonDirectory !== commonGitDir ||
    actualCommonDirectory !== resource.commonGitDir
  ) {
    throw new CleanupRefusalError(
      `reserved worktree ${resource.worktreePath} belongs to a mismatched shared Git directory.`,
    );
  }

  await requireReservedChildMarker(resource, { fileSystem, manifest });

  return { branchExists: true, branchTip, registered: true };
}

async function validatePreBaselineResource(
  resource,
  { canonicalWorktrees, fileSystem, git, branchMap, commonGitDir },
) {
  const branchRef = `refs/heads/${resource.branch}`;
  const registeredAtPath = canonicalWorktrees.find(
    (entry) => entry.canonicalPath === resource.worktreePath,
  );
  const branchRegistrations = canonicalWorktrees.filter(
    (entry) => entry.branch === branchRef,
  );
  const branchTip = branchMap.get(resource.branch);

  if (
    !branchTip ||
    !registeredAtPath ||
    registeredAtPath.branch !== branchRef ||
    branchRegistrations.some(
      (entry) => entry.canonicalPath !== resource.worktreePath,
    ) ||
    branchTip !== resource.sourceCommitSha ||
    registeredAtPath.HEAD !== resource.sourceCommitSha
  ) {
    throw new CleanupRefusalError(
      `pre-baseline branch or worktree ${resource.branch} no longer exactly matches its source.`,
    );
  }
  if (!(await pathExists(resource.worktreePath, fileSystem))) {
    throw new CleanupRefusalError(
      `pre-baseline worktree ${resource.worktreePath} is missing from disk.`,
    );
  }

  let actualCommonDirectory;
  try {
    actualCommonDirectory = await gitCommonDirectory(resource.worktreePath, {
      fileSystem,
      git,
    });
  } catch (error) {
    throw new CleanupRefusalError(
      `could not corroborate the shared Git directory for ${resource.worktreePath}: ${error.message}`,
    );
  }
  if (actualCommonDirectory !== commonGitDir) {
    throw new CleanupRefusalError(
      `worktree ${resource.worktreePath} belongs to a mismatched shared Git directory.`,
    );
  }

  return { branchExists: true, registered: true };
}

function parseBranches(output) {
  const branches = new Map();
  for (const line of output.split('\n')) {
    if (!line) {
      continue;
    }
    const separator = line.indexOf('\t');
    if (separator === -1) {
      throw new CleanupRefusalError('could not parse repository branch list.');
    }
    const ref = line.slice(0, separator);
    const sha = line.slice(separator + 1);
    if (!ref.startsWith('refs/heads/')) {
      continue;
    }
    branches.set(
      ref.slice('refs/heads/'.length),
      requireCommitSha(sha, `tip for ${ref}`),
    );
  }
  return branches;
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
  let repositoryCommonDirectory;
  try {
    repositoryCommonDirectory = await gitCommonDirectory(repository, {
      fileSystem,
      git,
    });
  } catch (error) {
    throw new CleanupRefusalError(
      `could not resolve the repository shared Git directory: ${error.message}`,
    );
  }
  if (repositoryCommonDirectory !== resources.commonGitDir) {
    throw new CleanupRefusalError(
      'cleanup repository has a mismatched shared Git directory.',
    );
  }

  const worktrees = parseWorktrees(
    await git(['worktree', 'list', '--porcelain'], { cwd: repository }),
  );
  const canonicalWorktrees = await Promise.all(
    worktrees.map(async (entry) => ({
      ...entry,
      canonicalPath: await canonicalPath(entry.worktree, fileSystem),
    })),
  );
  const branchMap = parseBranches(
    await git(
      ['for-each-ref', '--format=%(refname)%09%(objectname)', 'refs/heads'],
      { cwd: repository },
    ),
  );
  const nestedOwnedResources = await Promise.all(
    resources.nestedResources.map(async (resource) => ({
      ...resource,
      removalPath: resource.worktreePath,
      worktreePath: await canonicalPath(resource.worktreePath, fileSystem),
    })),
  );
  const outerResource = {
    baselineCommitSha: resources.branchOwnership?.baselineCommitSha,
    branch: resources.branch,
    commonGitDir: resources.commonGitDir,
    removalPath: resources.worktreePath,
    runIdentity: loaded.manifest.runIdentity,
    worktreePath: await canonicalPath(resources.worktreePath, fileSystem),
  };
  if (!resources.branchOwnership) {
    if (
      resources.nestedResources.length > 0 ||
      branchMap.has(resources.branch) ||
      canonicalWorktrees.some(
        (entry) => entry.canonicalPath === outerResource.worktreePath,
      ) ||
      (await pathExists(outerResource.worktreePath, fileSystem))
    ) {
      throw new CleanupRefusalError(
        'outer branch or worktree exists without explicit run ownership.',
      );
    }

    await fileSystem.rm(resources.manifestPath, { force: true });
    actions.push(`path:${resources.manifestPath}`);
    try {
      await fileSystem.rmdir(resources.runPath);
      actions.push(`directory:${resources.runPath}`);
    } catch (error) {
      if (error?.code !== 'ENOTEMPTY' && error?.code !== 'ENOENT') {
        throw error;
      }
    }
    return {
      actions,
      status: actions.length === 0 ? 'noop' : 'cleaned',
    };
  }

  const ownedResources = [...nestedOwnedResources, outerResource];
  const resourceStates = new Map();
  for (const resource of nestedOwnedResources) {
    const validate =
      resource.state === 'reserved'
        ? validateReservedResource
        : validateOwnedResource;
    resourceStates.set(
      resource.branch,
      await validate(resource, {
        branchMap,
        canonicalWorktrees,
        commonGitDir: resources.commonGitDir,
        fileSystem,
        git,
        manifest: loaded.manifest,
        repository,
      }),
    );
  }
  if (resources.branchOwnership.state === 'pre-baseline') {
    if (nestedOwnedResources.length > 0) {
      throw new CleanupRefusalError(
        'pre-baseline ownership cannot contain nested journal resources.',
      );
    }
    resourceStates.set(
      outerResource.branch,
      await validatePreBaselineResource(
        {
          ...outerResource,
          sourceCommitSha: resources.branchOwnership.sourceCommitSha,
        },
        {
          branchMap,
          canonicalWorktrees,
          commonGitDir: resources.commonGitDir,
          fileSystem,
          git,
        },
      ),
    );
  } else {
    resourceStates.set(
      outerResource.branch,
      await validateOwnedResource(outerResource, {
        branchMap,
        canonicalWorktrees,
        commonGitDir: resources.commonGitDir,
        fileSystem,
        git,
        manifest: loaded.manifest,
        repository,
      }),
    );
  }

  const ownedPaths = new Set(
    ownedResources.map((resource) => resource.worktreePath),
  );
  const ownedBranches = new Set(
    ownedResources.map((resource) => resource.branch),
  );
  if (resources.branchOwnership.state === 'completed') {
    const runBaseline = resources.branchOwnership.baselineCommitSha;
    for (const entry of canonicalWorktrees) {
      if (
        !ownedPaths.has(entry.canonicalPath) &&
        typeof entry.HEAD === 'string' &&
        /^[0-9a-f]{40}$/u.test(entry.HEAD) &&
        (await isCommitAncestor(runBaseline, entry.HEAD, {
          cwd: repository,
          git,
        }))
      ) {
        throw new CleanupRefusalError(
          `run-descendant worktree ${entry.canonicalPath} is not journaled.`,
        );
      }
    }
    for (const [branch, tip] of branchMap) {
      if (
        !ownedBranches.has(branch) &&
        (await isCommitAncestor(runBaseline, tip, { cwd: repository, git }))
      ) {
        throw new CleanupRefusalError(
          `run-descendant branch ${branch} is not journaled.`,
        );
      }
    }
  }

  for (const resource of nestedOwnedResources) {
    if (resourceStates.get(resource.branch).registered) {
      await git(['worktree', 'remove', '--force', resource.removalPath], {
        cwd: repository,
      });
      actions.push(`worktree:${resource.removalPath}`);
    }
  }
  if (resourceStates.get(resources.branch).registered) {
    await git(['worktree', 'remove', '--force', resources.worktreePath], {
      cwd: repository,
    });
    actions.push(`worktree:${resources.worktreePath}`);
  }
  for (const resource of nestedOwnedResources) {
    const state = resourceStates.get(resource.branch);
    if (!state.branchExists) {
      continue;
    }
    if (resource.state === 'reserved') {
      // Re-read the tip immediately before deleting so a ref that moved since
      // validation is refused rather than discarded. `git branch --delete` is
      // kept rather than a lower-level compare-and-delete because it also
      // preserves Git's own refusal to delete a branch that some other
      // worktree has checked out.
      const currentTip = await git(
        [
          'for-each-ref',
          '--format=%(objectname)',
          `refs/heads/${resource.branch}`,
        ],
        { cwd: repository },
      );
      if (currentTip !== state.branchTip) {
        throw new CleanupRefusalError(
          `reserved branch ${resource.branch} moved after it was corroborated.`,
        );
      }
    }
    await git(['branch', '--delete', '--force', '--', resource.branch], {
      cwd: repository,
    });
    actions.push(`branch:${resource.branch}`);
  }
  if (resourceStates.get(resources.branch).branchExists) {
    await git(['branch', '--delete', '--force', '--', resources.branch], {
      cwd: repository,
    });
    actions.push(`branch:${resources.branch}`);
  }
  // A reservation whose branch and worktree never materialized has no Git or
  // filesystem resource to remove; it is discharged when the run manifest is
  // removed below. Record it so an interrupted run reports the window it
  // stopped in.
  for (const resource of nestedOwnedResources) {
    const state = resourceStates.get(resource.branch);
    if (
      resource.state === 'reserved' &&
      !state.registered &&
      !state.branchExists
    ) {
      actions.push(`reservation:${resource.branch}`);
    }
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
