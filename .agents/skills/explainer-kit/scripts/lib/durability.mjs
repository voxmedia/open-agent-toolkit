import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

import { canonicalHash, validateContract } from './contracts.mjs';
import { writeFileAtomic, writeJsonAtomic } from './fs-safe.mjs';
import { validateSafeRelativePath } from './safe-paths.mjs';

const execFile = promisify(execFileCallback);
const MUTABLE_RECORDS = new Set(['manifest.json', 'build-record.json']);
const FAILURE_WARNING =
  'E_DURABILITY: durability evidence verification failed.';

export async function recordDurability(request, options = {}) {
  assertValid('durability-evidence', request);

  const manifestPath = resolve(request.manifestPath);
  const runRoot = dirname(manifestPath);
  if (manifestPath !== joinWithin(runRoot, 'manifest.json')) {
    throw new Error('Durability manifestPath must identify manifest.json.');
  }

  const manifest = await readJson(manifestPath);
  const buildRecordPath = joinWithin(runRoot, manifest.buildRecord?.path);
  const buildRecord = await readJson(buildRecordPath);
  assertValid('build-record', buildRecord);
  assertValid('manifest', manifest, { buildRecord });
  if (
    manifest.outcome !== 'built-not-durable' &&
    manifest.outcome !== 'built-durable'
  ) {
    throw new Error(
      `Durability can only attest built runs, not ${manifest.outcome}.`,
    );
  }

  const verification = await verifyEvidence(request.evidence, {
    runRoot,
    manifest,
    options,
  });
  const now = options.now ?? (() => new Date().toISOString());

  if (!verification.verified) {
    const errors = verification.errors;
    updateOutcomes(manifest, buildRecord, {
      durable: false,
      warning: `${FAILURE_WARNING} ${errors.map(({ message }) => message).join(' ')}`,
      completedAt: now(),
    });
    await persistRecords(runRoot, manifest, buildRecord);
    return {
      durable: false,
      outcome: 'built-not-durable',
      errors,
      manifestPath,
      buildRecordPath,
    };
  }

  const attestedAt = now();
  const alreadyRecorded =
    manifest.outcome === 'built-durable' &&
    verification.artifacts.every((artifact) =>
      hasEvidence(artifact, verification.evidence),
    ) &&
    (!verification.publishReceipt ||
      manifest.publishReceipt?.hash ===
        canonicalHash(verification.publishReceipt));
  if (alreadyRecorded) {
    return {
      durable: true,
      outcome: 'built-durable',
      errors: [],
      manifestPath,
      buildRecordPath,
    };
  }

  for (const artifact of verification.artifacts) {
    appendEvidence(artifact, {
      ...verification.evidence,
      attestedAt,
    });
  }
  if (verification.publishReceipt) {
    manifest.publishReceipt = {
      path: 'publish-receipt.json',
      hash: canonicalHash(verification.publishReceipt),
    };
  }
  updateOutcomes(manifest, buildRecord, {
    durable: true,
    completedAt: attestedAt,
  });
  await persistRecords(runRoot, manifest, buildRecord);

  return {
    durable: true,
    outcome: 'built-durable',
    errors: [],
    manifestPath,
    buildRecordPath,
  };
}

export async function verifyRebuildability(artifact, runRoot) {
  if (artifact?.rebuildable !== true) {
    return {
      verified: false,
      reason: 'Artifact rebuildability defaults to false.',
    };
  }
  if (
    !artifact.rebuild ||
    !Array.isArray(artifact.rebuild.argv) ||
    artifact.rebuild.argv.length === 0
  ) {
    return {
      verified: false,
      reason: 'Rebuildable artifacts require deterministic replay metadata.',
    };
  }

  try {
    const canonicalRunRoot = await realpath(runRoot);
    const cwd = resolve(canonicalRunRoot, artifact.rebuild.cwd);
    assertWithin(canonicalRunRoot, cwd, 'Replay cwd');
    await realpath(cwd);

    for (const [inputPath, expectedHash] of Object.entries(
      artifact.rebuild.inputHashes ?? {},
    )) {
      const checked = validateSafeRelativePath(inputPath);
      if (!checked.valid) {
        return {
          verified: false,
          reason: `Replay input path is unsafe: ${inputPath}.`,
        };
      }
      const absoluteInput = resolve(canonicalRunRoot, checked.normalizedPath);
      assertWithin(canonicalRunRoot, absoluteInput, 'Replay input');
      if ((await fileHash(absoluteInput)) !== expectedHash) {
        return {
          verified: false,
          reason: `Replay input hash does not match: ${inputPath}.`,
        };
      }
    }

    const outputPath = resolve(canonicalRunRoot, artifact.renderedPath);
    assertWithin(canonicalRunRoot, outputPath, 'Replay output');
    const original = await readFile(outputPath);
    try {
      const [command, ...args] = artifact.rebuild.argv;
      await execFile(command, args, { cwd, maxBuffer: 10 * 1024 * 1024 });
      if ((await fileHash(outputPath)) !== artifact.hash) {
        return {
          verified: false,
          reason: `Deterministic replay hash does not match for ${artifact.renderedPath}.`,
        };
      }
    } finally {
      await writeFileAtomic(runRoot, artifact.renderedPath, original);
    }
    return { verified: true, reason: null };
  } catch (caught) {
    return {
      verified: false,
      reason: `Deterministic replay failed: ${errorMessage(caught)}`,
    };
  }
}

async function verifyEvidence(evidence, context) {
  const replayErrors = [];
  for (const artifact of context.manifest.artifacts) {
    if (artifact.status === 'built' && artifact.rebuildable === true) {
      const replay = await verifyRebuildability(artifact, context.runRoot);
      if (!replay.verified) {
        replayErrors.push(error('replay-verification', replay.reason));
      }
    }
  }
  if (replayErrors.length > 0) {
    return { verified: false, errors: replayErrors };
  }

  return evidence.kind === 'commit'
    ? verifyCommitEvidence(evidence, context)
    : verifyPublishEvidence(evidence, context);
}

async function verifyCommitEvidence(evidence, { runRoot, manifest }) {
  const errors = [];
  let repoRoot;
  let commit;
  try {
    repoRoot = await realpath(evidence.repoRoot);
    runRoot = await realpath(runRoot);
    assertWithin(repoRoot, runRoot, 'Manifest');
    ({ stdout: commit } = await execFile(
      'git',
      ['rev-parse', '--verify', `${evidence.commit}^{commit}`],
      { cwd: repoRoot },
    ));
    commit = commit.trim();
  } catch (caught) {
    return {
      verified: false,
      errors: [error('commit-verification', errorMessage(caught))],
    };
  }

  const manifestRepoPath = toRepoPath(
    repoRoot,
    joinWithin(runRoot, 'manifest.json'),
  );
  const buildRecordRepoPath = toRepoPath(
    repoRoot,
    joinWithin(runRoot, manifest.buildRecord.path),
  );
  const mutablePaths = new Set([manifestRepoPath, buildRecordRepoPath]);
  for (const path of evidence.paths) {
    if (
      MUTABLE_RECORDS.has(path) ||
      mutablePaths.has(path) ||
      path.endsWith('/manifest.json') ||
      path.endsWith('/build-record.json')
    ) {
      errors.push(
        error(
          'mutable-record',
          `Commit evidence must exclude mutable record ${path}.`,
        ),
      );
    }
  }

  const required = immutablePackage(manifest);
  const requiredByPath = new Map(
    required.map((file) => [
      toRepoPath(repoRoot, joinWithin(runRoot, file.path)),
      file,
    ]),
  );
  for (const [path] of requiredByPath) {
    if (!evidence.paths.includes(path)) {
      errors.push(
        error(
          'missing-artifact',
          `Commit evidence does not include required artifact ${path}.`,
        ),
      );
    }
  }

  for (const file of required) {
    const localPath = joinWithin(runRoot, file.path);
    if ((await fileHash(localPath)) !== file.hash) {
      errors.push(
        error(
          'hash-mismatch',
          `Retained package hash does not match manifest hash for ${file.path}.`,
        ),
      );
    }
  }

  for (const path of evidence.paths) {
    if (mutablePaths.has(path) || MUTABLE_RECORDS.has(path)) {
      continue;
    }
    try {
      const { stdout: blob } = await execFile(
        'git',
        ['cat-file', 'blob', `${commit}:${path}`],
        { cwd: repoRoot, encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 },
      );
      const file = requiredByPath.get(path);
      if (file && bufferHash(blob) !== file.hash) {
        errors.push(
          error(
            'hash-mismatch',
            `Commit blob hash does not match manifest hash for ${path}.`,
          ),
        );
      }
    } catch (caught) {
      errors.push(
        error(
          'missing-commit-path',
          `Commit does not contain ${path}: ${errorMessage(caught)}`,
        ),
      );
    }
  }

  return errors.length > 0
    ? { verified: false, errors }
    : {
        verified: true,
        errors: [],
        artifacts: requiredArtifacts(manifest),
        evidence: {
          kind: 'commit',
          ref: commit,
          paths: [...evidence.paths],
        },
      };
}

async function verifyPublishEvidence(evidence, { runRoot, manifest }) {
  const expectedPath = joinWithin(runRoot, 'publish-receipt.json');
  if (resolve(evidence.receiptPath) !== expectedPath) {
    return {
      verified: false,
      errors: [
        error(
          'receipt-location',
          'Publish receipt must be publish-receipt.json beside the manifest.',
        ),
      ],
    };
  }

  let receipt;
  try {
    receipt = await readJson(expectedPath);
  } catch (caught) {
    return {
      verified: false,
      errors: [error('publish-receipt', errorMessage(caught))],
    };
  }
  const validation = validateContract('publish-receipt', receipt, { manifest });
  const errors = validation.errors.map(({ code, message }) =>
    error(code, message),
  );
  if (
    receipt.sentinel?.uploadVerified !== true ||
    receipt.sentinel?.publicVerified !== true ||
    receipt.sentinel?.deleted !== true
  ) {
    errors.push(
      error(
        'sentinel-verification',
        'Publish receipt sentinel verification is incomplete.',
      ),
    );
  }

  const receiptByPath = new Map(
    (receipt.artifacts ?? []).map((artifact) => [
      artifact.relativePath,
      artifact,
    ]),
  );
  const required = requiredArtifacts(manifest);
  for (const artifact of required) {
    const published = receiptByPath.get(artifact.renderedPath);
    if (!published || published.hash !== artifact.hash) {
      errors.push(
        error(
          'missing-artifact',
          `Publish receipt does not verify ${artifact.renderedPath}.`,
        ),
      );
    }
  }

  return errors.length > 0
    ? { verified: false, errors }
    : {
        verified: true,
        errors: [],
        artifacts: required,
        publishReceipt: receipt,
        evidence: {
          kind: 'publish',
          ref: canonicalHash(receipt),
          paths: required.map(({ renderedPath }) => renderedPath),
        },
      };
}

function appendEvidence(artifact, evidence) {
  artifact.durableEvidence ??= [];
  if (hasEvidence(artifact, evidence)) {
    return;
  }

  const prior = artifact.durableEvidence.findLast(
    (existing) => existing.kind === evidence.kind,
  );
  const next = structuredClone(evidence);
  if (
    prior &&
    (prior.ref !== next.ref || !arraysEqual(prior.paths, next.paths))
  ) {
    next.supersedes = { ref: prior.ref, paths: [...prior.paths] };
  }
  artifact.durableEvidence.push(next);
}

function hasEvidence(artifact, evidence) {
  return (artifact.durableEvidence ?? []).some(
    (existing) =>
      existing.kind === evidence.kind &&
      existing.ref === evidence.ref &&
      arraysEqual(existing.paths, evidence.paths),
  );
}

function updateOutcomes(
  manifest,
  buildRecord,
  { durable, warning, completedAt = new Date().toISOString() },
) {
  const outcome = durable ? 'built-durable' : 'built-not-durable';
  manifest.outcome = outcome;
  buildRecord.outcome = outcome;

  manifest.warnings = manifest.warnings.filter(
    (entry) => !entry.startsWith('E_DURABILITY:'),
  );
  const stage = buildRecord.stages.find(({ id }) => id === 'durability');
  if (!stage) {
    throw new Error('Build record does not contain a durability stage.');
  }
  stage.status = durable ? 'passed' : 'warned';
  stage.completedAt = completedAt;
  stage.outputPaths = durable ? ['manifest.json', 'build-record.json'] : [];
  stage.warnings = warning ? [warning] : [];
  if (warning) {
    manifest.warnings.push(warning);
  }
}

async function persistRecords(runRoot, manifest, buildRecord) {
  assertValid('build-record', buildRecord);
  manifest.buildRecord.hash = canonicalHash(buildRecord);
  assertValid('manifest', manifest, { buildRecord });
  await writeJsonAtomic(runRoot, 'build-record.json', buildRecord);
  await writeJsonAtomic(runRoot, 'manifest.json', manifest);
}

function requiredArtifacts(manifest) {
  return manifest.artifacts.filter(
    (artifact) =>
      artifact.status === 'built' &&
      artifact.rebuildable === false &&
      typeof artifact.renderedPath === 'string',
  );
}

function immutablePackage(manifest) {
  return Object.entries(manifest.immutableHashes).map(([path, hash]) => ({
    path,
    hash,
  }));
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function joinWithin(root, relativePath) {
  const checked = validateSafeRelativePath(relativePath);
  if (!checked.valid) {
    throw new Error(
      `Unsafe durability record path: ${checked.errors[0].message}`,
    );
  }
  const path = resolve(root, checked.normalizedPath);
  assertWithin(root, path, 'Durability record');
  return path;
}

function assertWithin(root, target, label) {
  const path = relative(root, target);
  if (path === '..' || path.startsWith(`..${sep}`)) {
    throw new Error(`${label} escapes its configured root.`);
  }
}

function toRepoPath(repoRoot, absolutePath) {
  assertWithin(repoRoot, absolutePath, 'Evidence path');
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

async function fileHash(path) {
  return bufferHash(await readFile(path));
}

function bufferHash(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function assertValid(kind, value, context) {
  const result = validateContract(kind, value, context);
  if (!result.valid) {
    throw new Error(
      `Invalid ${kind}: ${result.errors
        .map(({ path, code, message }) => `${path} [${code}]: ${message}`)
        .join('; ')}`,
    );
  }
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function error(code, message) {
  return { code, message };
}

function errorMessage(value) {
  return value instanceof Error ? value.message : String(value);
}
