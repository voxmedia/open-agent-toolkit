#!/usr/bin/env node

import { readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashCanonicalJson, hashFile, sha256 } from './lib/canonical-json.mjs';
import {
  approvalFingerprintInput,
  isDigest,
  isObject,
  issue,
  profiles,
  validateArtifactShape,
} from './lib/contracts.mjs';
import {
  assertCanonicalRoot,
  assertSafeExistingPath,
  assertUnchangedRoot,
  isContainedPath,
} from './lib/safe-path.mjs';
import { createValidatedRun } from './lib/validated-run.mjs';

const requiredPasses = {
  quick: ['map', 'gather'],
  standard: [
    'map',
    'gather',
    'semantic-verification',
    'adversarial',
    'coverage',
    'reconciliation',
  ],
  thorough: [
    'map',
    'gather',
    'semantic-verification',
    'adversarial',
    'coverage',
    'reconciliation',
    'redundant-gather',
    'redundant-verification',
    'contradiction-resolution',
  ],
};

function packetPath(packetRoot, path) {
  if (typeof path !== 'string' || path.length === 0) return null;
  const candidate = resolve(packetRoot, path);
  return isContainedPath(packetRoot, candidate) ? candidate : null;
}

async function retainFilesystemIdentity(identities, path) {
  const identity = await assertCanonicalRoot(path);
  identities.set(identity.path, identity);
  return identity;
}

async function retainDeclaredSourceIdentities(
  packetRoot,
  source,
  filesystemIdentities,
) {
  const paths = [];
  if (source.kind === 'repository' && typeof source.root === 'string') {
    paths.push(source.root);
  } else if (source.kind === 'file' && typeof source.path === 'string') {
    paths.push(source.path);
  } else if (source.kind === 'url') {
    const capturePath =
      source.capturePath ?? source.validatorState?.capturePath;
    if (typeof capturePath === 'string') {
      const path = packetPath(packetRoot, capturePath);
      if (!path) {
        throw Object.assign(new Error('Capture path escapes the packet root'), {
          code: 'PATH_ESCAPE',
        });
      }
      paths.push(path);
    }
  } else if (source.kind === 'command-output') {
    if (typeof source.cwd === 'string') paths.push(source.cwd);
    if (typeof source.outputPath === 'string') {
      const path = packetPath(packetRoot, source.outputPath);
      if (!path) {
        throw Object.assign(
          new Error('Command output path escapes the packet root'),
          { code: 'PATH_ESCAPE' },
        );
      }
      paths.push(path);
    }
  } else if (
    source.kind === 'connected-resource' &&
    typeof source.capturePath === 'string'
  ) {
    const path = packetPath(packetRoot, source.capturePath);
    if (!path) {
      throw Object.assign(new Error('Capture path escapes the packet root'), {
        code: 'PATH_ESCAPE',
      });
    }
    paths.push(path);
  }
  for (const path of paths) {
    await retainFilesystemIdentity(filesystemIdentities, path);
  }
}

async function readManagedJson(
  root,
  path,
  code,
  errors,
  canonicalByteDigests,
  relativePath,
) {
  try {
    await assertSafeExistingPath(root, path);
  } catch (error) {
    errors.push(
      issue(
        error?.code === 'SYMLINK_ESCAPE' ? 'SYMLINK_ESCAPE' : code,
        error?.code === 'SYMLINK_ESCAPE'
          ? 'Canonical packet path contains a symlink'
          : `Unable to read ${path}`,
        path,
      ),
    );
    return null;
  }
  try {
    const bytes = await readFile(path);
    const value = JSON.parse(bytes.toString('utf8'));
    canonicalByteDigests.set(relativePath, sha256(bytes));
    return value;
  } catch (error) {
    errors.push(
      issue(
        code,
        error instanceof Error ? error.message : `Unable to read ${path}`,
        path,
      ),
    );
    return null;
  }
}

function collectReferences(manifest, ledger) {
  const references = [];
  for (const reference of manifest?.artifacts ?? []) references.push(reference);
  for (const reference of ledger?.inputArtifacts ?? [])
    references.push(reference);
  for (const evidence of ledger?.evidence ?? []) {
    if (evidence.provenance) references.push(evidence.provenance);
  }
  for (const claim of ledger?.claims ?? []) {
    for (const reference of claim.derivedFrom ?? []) references.push(reference);
  }
  return references;
}

async function validateReferences(packetRoot, references, errors) {
  const checked = new Set();
  const artifactsByPath = new Map();
  const artifactsById = new Map();
  const validatedByteDigests = new Map();
  for (const reference of references) {
    if (!isObject(reference) || typeof reference.path !== 'string') continue;
    const key = `${reference.path}:${reference.digest}`;
    if (checked.has(key)) continue;
    checked.add(key);
    const path = packetPath(packetRoot, reference.path);
    if (!path) {
      errors.push(
        issue(
          'PATH_ESCAPE',
          'Artifact path escapes the packet directory',
          reference.path,
        ),
      );
      continue;
    }
    try {
      await assertSafeExistingPath(packetRoot, path);
      const bytes = await readFile(path);
      const actual = sha256(bytes);
      if (isDigest(reference.digest) && actual !== reference.digest) {
        errors.push(
          issue(
            'ARTIFACT_DIGEST_MISMATCH',
            `Artifact digest does not match ${reference.path}`,
            reference.path,
          ),
        );
      }
      validatedByteDigests.set(reference.path, actual);
      if (reference.path.endsWith('.json')) {
        const value = JSON.parse(bytes.toString('utf8'));
        const validation = validateArtifactShape(value);
        errors.push(
          ...validation.errors.map((error) => ({
            ...error,
            path: `${reference.path}:${error.path}`,
          })),
        );
        artifactsByPath.set(reference.path, { reference, value, path });
        if (typeof value.id === 'string') {
          if (artifactsById.has(value.id)) {
            errors.push(
              issue(
                'DUPLICATE_ARTIFACT_ID',
                `Duplicate artifact identifier ${value.id}`,
                reference.path,
              ),
            );
          }
          artifactsById.set(value.id, { reference, value, path });
        }
      }
    } catch (error) {
      errors.push(
        issue(
          error?.code === 'SYMLINK_ESCAPE'
            ? 'SYMLINK_ESCAPE'
            : 'MISSING_ARTIFACT',
          error?.code === 'SYMLINK_ESCAPE'
            ? `Artifact path contains a symlink: ${reference.path}`
            : `Missing artifact ${reference.path}`,
          reference.path,
        ),
      );
    }
  }
  return { artifactsByPath, artifactsById, validatedByteDigests };
}

function lineExcerpt(content, start, end) {
  if (start === undefined && end === undefined) return content;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < start
  ) {
    return null;
  }
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  if (end > lines.length) return null;
  return lines.slice(start - 1, end).join('\n');
}

function redactSecrets(value) {
  return value
    .replace(
      /\b(token|password|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      (_match, key) => `${key}=[REDACTED]`,
    )
    .replace(/\b(?:sk|ghp|xox[baprs])[-_][A-Za-z0-9_-]{8,}\b/g, '[REDACTED]');
}

function containsSecret(value) {
  if (typeof value === 'string') return redactSecrets(value) !== value;
  if (Array.isArray(value)) return value.some(containsSecret);
  if (isObject(value)) return Object.values(value).some(containsSecret);
  return false;
}

function validatePersistedSecretSafety(values, errors) {
  for (const [path, value] of values) {
    if (containsSecret(value)) {
      errors.push(
        issue(
          'UNREDACTED_SECRET',
          'Persisted packet data contains a secret-like span',
          path,
        ),
      );
    }
  }
}

function sourceHasMinimumProvenance(source) {
  if (!isObject(source)) return false;
  if (source.kind === 'repository') {
    return (
      typeof source.root === 'string' &&
      typeof source.revision === 'string' &&
      isObject(source.contentHashes)
    );
  }
  if (source.kind === 'file') {
    return typeof source.path === 'string' && isDigest(source.contentHash);
  }
  if (source.kind === 'url') {
    const validator = source.validatorState;
    return (
      typeof source.url === 'string' &&
      ((typeof source.capturePath === 'string' &&
        isDigest(source.captureDigest)) ||
        (isObject(validator) &&
          typeof validator.capturePath === 'string' &&
          isDigest(validator.captureDigest) &&
          (typeof validator.etag === 'string' ||
            typeof validator.lastModified === 'string')))
    );
  }
  if (source.kind === 'command-output') {
    return (
      Array.isArray(source.argv) &&
      typeof source.cwd === 'string' &&
      Number.isInteger(source.exitStatus) &&
      typeof source.outputPath === 'string' &&
      isDigest(source.outputDigest) &&
      Array.isArray(source.environmentNames)
    );
  }
  if (source.kind === 'connected-resource') {
    return (
      typeof source.system === 'string' &&
      typeof source.resourceId === 'string' &&
      (typeof source.resourceVersion === 'string' ||
        typeof source.retrievalToken === 'string') &&
      typeof source.capturePath === 'string' &&
      isDigest(source.captureDigest)
    );
  }
  return false;
}

async function reopenEvidence(
  packetRoot,
  source,
  evidence,
  errors,
  filesystemIdentities,
  allowIneligibleAudit = false,
) {
  if (source?.available !== true || source?.validationState !== 'pinned') {
    if (allowIneligibleAudit) return false;
    errors.push(
      issue(
        'INELIGIBLE_SOURCE_STATE',
        `Source ${source?.id ?? 'unknown'} is not available and pinned`,
        `source:${source?.id ?? 'unknown'}`,
      ),
    );
    return false;
  }
  if (!sourceHasMinimumProvenance(source)) {
    errors.push(
      issue(
        'INSUFFICIENT_PROVENANCE',
        `Source ${source?.id ?? 'unknown'} lacks reopenable provenance`,
        `source:${source?.id ?? 'unknown'}`,
      ),
    );
    return false;
  }
  const locator = evidence.locator;
  if (!isObject(locator) || locator.kind !== source.kind) {
    errors.push(
      issue(
        'INVALID_LOCATOR',
        'Locator kind does not match source kind',
        evidence.id,
      ),
    );
    return false;
  }
  if (
    !['exact', 'redacted-exact'].includes(evidence.locatorValidation?.status)
  ) {
    return false;
  }
  if (evidence.observedAt !== source.observedAt) {
    errors.push(
      issue(
        'SOURCE_VERSION_MISMATCH',
        'Evidence observation time does not match the pinned source',
        evidence.id,
      ),
    );
    return false;
  }

  let content;
  let expectedDigest;
  let path;
  try {
    if (source.kind === 'repository') {
      await retainFilesystemIdentity(filesystemIdentities, source.root);
      path = resolve(source.root, locator.path);
      if (!isContainedPath(resolve(source.root), path)) {
        errors.push(
          issue(
            'PATH_ESCAPE',
            'Repository locator escapes source root',
            evidence.id,
          ),
        );
        return false;
      }
      await assertSafeExistingPath(resolve(source.root), path);
      await retainFilesystemIdentity(filesystemIdentities, path);
      if (locator.revision !== source.revision) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'Repository revision changed',
            evidence.id,
          ),
        );
        return false;
      }
      expectedDigest = source.contentHashes[locator.path];
      content = await readFile(path, 'utf8');
    } else if (source.kind === 'file') {
      if (resolve(locator.path) !== resolve(source.path)) {
        errors.push(
          issue(
            'SOURCE_IDENTITY_MISMATCH',
            'File locator path does not match its source identity',
            evidence.id,
          ),
        );
        return false;
      }
      path = resolve(source.path);
      await retainFilesystemIdentity(filesystemIdentities, path);
      expectedDigest = source.contentHash;
      content = await readFile(path, 'utf8');
    } else if (source.kind === 'url') {
      if (locator.url !== source.url) {
        errors.push(
          issue('SOURCE_VERSION_MISMATCH', 'URL identity changed', evidence.id),
        );
        return false;
      }
      if (locator.retrievedAt !== source.observedAt) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'URL observation timestamp changed',
            evidence.id,
          ),
        );
        return false;
      }
      const validator = source.validatorState;
      if (validator) {
        const token = hashCanonicalJson({
          etag: validator.etag ?? null,
          lastModified: validator.lastModified ?? null,
        });
        if (locator.validatorToken !== token) {
          errors.push(
            issue(
              'SOURCE_VERSION_MISMATCH',
              'URL validator token changed',
              evidence.id,
            ),
          );
          return false;
        }
      }
      const capturePath = source.capturePath ?? validator?.capturePath;
      path = packetPath(packetRoot, capturePath);
      if (path) await assertSafeExistingPath(packetRoot, path);
      if (path) await retainFilesystemIdentity(filesystemIdentities, path);
      expectedDigest = source.captureDigest ?? validator?.captureDigest;
      content = await readFile(path, 'utf8');
    } else if (source.kind === 'command-output') {
      if (locator.artifactPath !== source.outputPath) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'Command artifact changed',
            evidence.id,
          ),
        );
        return false;
      }
      if (locator.commandDigest !== hashCanonicalJson(source.argv)) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'Command identity changed',
            evidence.id,
          ),
        );
        return false;
      }
      path = packetPath(packetRoot, source.outputPath);
      if (path) await assertSafeExistingPath(packetRoot, path);
      if (path) await retainFilesystemIdentity(filesystemIdentities, path);
      expectedDigest = source.outputDigest;
      content = await readFile(path, 'utf8');
    } else if (source.kind === 'connected-resource') {
      if (
        locator.system !== source.system ||
        locator.resourceId !== source.resourceId
      ) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'Connected resource identity changed',
            evidence.id,
          ),
        );
        return false;
      }
      if (
        source.resourceVersion &&
        locator.resourceVersion !== source.resourceVersion
      ) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'Connected resource version changed',
            evidence.id,
          ),
        );
        return false;
      }
      if (
        source.retrievalToken &&
        locator.retrievalToken !== source.retrievalToken
      ) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'Connected resource retrieval token changed',
            evidence.id,
          ),
        );
        return false;
      }
      if (locator.retrievedAt !== source.observedAt) {
        errors.push(
          issue(
            'SOURCE_VERSION_MISMATCH',
            'Connected resource observation timestamp changed',
            evidence.id,
          ),
        );
        return false;
      }
      path = packetPath(packetRoot, source.capturePath);
      if (path) await assertSafeExistingPath(packetRoot, path);
      if (path) await retainFilesystemIdentity(filesystemIdentities, path);
      expectedDigest = source.captureDigest;
      content = await readFile(path, 'utf8');
    }
  } catch (error) {
    errors.push(
      issue(
        error?.code === 'SYMLINK_ESCAPE'
          ? 'SYMLINK_ESCAPE'
          : 'SOURCE_UNAVAILABLE',
        error?.code === 'SYMLINK_ESCAPE'
          ? 'Pinned source path contains a symlink'
          : 'Pinned source could not be reopened',
        evidence.id,
      ),
    );
    return false;
  }

  if (!path || (await hashFile(path)) !== expectedDigest) {
    errors.push(
      issue('SOURCE_DRIFT', 'Pinned source digest changed', evidence.id),
    );
    return false;
  }

  let observed = content;
  if (
    source.kind === 'repository' ||
    source.kind === 'file' ||
    source.kind === 'command-output'
  ) {
    observed = lineExcerpt(content, locator.lineStart, locator.lineEnd);
    if (observed === null) {
      errors.push(
        issue(
          'INVALID_LOCATOR_RANGE',
          'Locator line range is invalid',
          evidence.id,
        ),
      );
      return false;
    }
  } else if (source.kind === 'connected-resource' && locator.fieldOrSection) {
    try {
      const parsed = JSON.parse(content);
      observed = String(parsed[locator.fieldOrSection] ?? '');
    } catch {
      observed = content;
    }
  }

  if (evidence.locatorValidation?.status === 'redacted-exact') {
    if (
      evidence.redaction?.applied !== true ||
      evidence.redaction?.originalPersisted !== false ||
      evidence.contentHash !== undefined ||
      redactSecrets(observed).trim() !== evidence.displayExcerpt.trim()
    ) {
      errors.push(
        issue(
          'INVALID_REDACTED_EVIDENCE',
          'Redacted-exact evidence is not safely reproducible',
          evidence.id,
        ),
      );
      return false;
    }
    return true;
  }

  if (redactSecrets(observed) !== observed) {
    errors.push(
      issue(
        'UNREDACTED_SECRET',
        'Evidence contains a secret-like span and must use redacted-exact persistence',
        evidence.id,
      ),
    );
    return false;
  }

  if (!observed.includes(evidence.displayExcerpt)) {
    errors.push(
      issue(
        'LOCATOR_EXCERPT_MISMATCH',
        'Display excerpt does not match the resolved source',
        evidence.id,
      ),
    );
    return false;
  }
  if (
    evidence.contentHash &&
    evidence.contentHash !== hashCanonicalJson(evidence.displayExcerpt)
  ) {
    errors.push(
      issue(
        'EVIDENCE_DIGEST_MISMATCH',
        'Evidence excerpt digest changed',
        evidence.id,
      ),
    );
    return false;
  }
  return true;
}

const passContracts = {
  map: { kind: 'recon.raw-dossier', mode: 'map' },
  gather: { kind: 'recon.raw-dossier', mode: 'gather' },
  'semantic-verification': {
    kind: 'recon.review-result',
    reviewKind: 'semantic',
  },
  adversarial: { kind: 'recon.review-result', reviewKind: 'adversarial' },
  coverage: { kind: 'recon.review-result', reviewKind: 'coverage' },
  reconciliation: {
    kind: 'recon.review-result',
    reviewKind: 'reconciliation',
  },
  'redundant-verification': {
    kind: 'recon.review-result',
    reviewKind: 'redundant-verification',
  },
  'contradiction-resolution': {
    kind: 'recon.review-result',
    reviewKind: 'contradiction-resolution',
  },
};

const assuranceReviewKinds = new Set([
  'semantic',
  'adversarial',
  'coverage',
  'redundant-verification',
  'contradiction-resolution',
]);

function artifactIsComplete(artifact) {
  return (
    (!('status' in artifact) || artifact.status === 'complete') &&
    (!('outcome' in artifact) || artifact.outcome === 'complete')
  );
}

const reviewWaveMode = {
  semantic: 'semantic-verification',
  adversarial: 'adversarial',
  coverage: 'coverage',
  reconciliation: 'reconciliation',
  'redundant-verification': 'redundant-verification',
  'contradiction-resolution': 'contradiction-resolution',
};

function laneWaveMatches(wave, value) {
  if (value.kind === 'recon.raw-dossier') {
    return wave.mode === 'redundant-gather'
      ? value.mode === 'gather'
      : wave.mode === value.mode;
  }
  return reviewWaveMode[value.reviewKind] === wave.mode;
}

function validateApprovedLanes(manifest, artifactsById, errors) {
  const lanes = new Map();
  for (const wave of manifest.execution?.waves ?? []) {
    for (const lane of wave.lanes ?? []) {
      lanes.set(lane.laneId, { wave, lane });
    }
  }
  const written = new Set();
  for (const [id, { reference, value }] of artifactsById) {
    if (value.runId !== manifest.run.id) continue;
    const laneId =
      value.kind === 'recon.raw-dossier'
        ? value.laneId
        : value.kind === 'recon.review-result'
          ? value.reviewerLane
          : null;
    if (laneId === null) continue;
    const approved = lanes.get(laneId);
    if (
      !approved ||
      (value.kind === 'recon.raw-dossier' &&
        approved.wave.waveId !== value.waveId) ||
      !laneWaveMatches(approved.wave, value)
    ) {
      errors.push(
        issue(
          'UNAPPROVED_LANE',
          `Artifact ${id} was not written by an approved lane of a matching wave`,
          id,
        ),
      );
      continue;
    }
    const root = approved.lane.writeRoot;
    if (reference.path !== root && !reference.path.startsWith(`${root}/`)) {
      errors.push(
        issue(
          'LANE_WRITE_PATH_VIOLATION',
          `Artifact ${id} is outside its approved lane write root ${root}`,
          id,
        ),
      );
    }
    // Only a complete artifact settles a lane; a failed or partial artifact
    // still needs a material outcome gap.
    if (artifactIsComplete(value)) written.add(laneId);
  }
  for (const [laneId, { wave }] of lanes) {
    // The canonical ledger is the compile outcome; it carries no lane identity.
    if (wave.conditional || wave.mode === 'compile' || written.has(laneId)) {
      continue;
    }
    const hasOutcomeEvidence = (manifest.gaps ?? []).some(
      (gap) =>
        (gap.code === 'PASS_FAILED' || gap.code === 'PASS_OMITTED') &&
        gap.material === true &&
        gap.message?.includes(wave.mode),
    );
    if (!hasOutcomeEvidence) {
      errors.push(
        issue(
          'MISSING_LANE_OUTCOME',
          `Approved lane ${laneId} has neither a result nor a material ${wave.mode} outcome gap`,
          `lane:${laneId}`,
        ),
      );
    }
  }
}

function collectCompletePasses(artifactsById, runId) {
  const passes = new Map();
  for (const [id, { value }] of artifactsById) {
    if (value.runId !== runId || !artifactIsComplete(value)) continue;
    for (const [mode, contract] of Object.entries(passContracts)) {
      if (
        value.kind === contract.kind &&
        (contract.mode ? value.mode === contract.mode : true) &&
        (contract.reviewKind ? value.reviewKind === contract.reviewKind : true)
      ) {
        const ids = passes.get(mode) ?? [];
        ids.push(id);
        passes.set(mode, ids);
      }
    }
  }
  const gatherLanes = new Set(
    (passes.get('gather') ?? []).map(
      (id) => artifactsById.get(id).value.laneId,
    ),
  );
  if (gatherLanes.size >= 2)
    passes.set('redundant-gather', passes.get('gather'));
  for (const ids of passes.values()) ids.sort();
  return passes;
}

function deriveAchievedProfile(passes) {
  let achieved = null;
  for (const profile of profiles) {
    if (requiredPasses[profile].every((mode) => passes.has(mode))) {
      achieved = profile;
    }
  }
  return achieved;
}

function validatePassOutcomes(manifest, passes, errors) {
  for (const mode of requiredPasses[manifest.run.requestedProfile] ?? []) {
    if (passes.has(mode)) continue;
    const hasOutcomeEvidence = (manifest.gaps ?? []).some(
      (gap) =>
        (gap.code === 'PASS_FAILED' || gap.code === 'PASS_OMITTED') &&
        gap.material === true &&
        gap.message?.includes(mode),
    );
    if (!hasOutcomeEvidence) {
      errors.push(
        issue(
          'MISSING_PASS_OUTCOME_EVIDENCE',
          `Requested ${manifest.run.requestedProfile} profile lacks a complete ${mode} result and a material PASS_FAILED or PASS_OMITTED gap naming it`,
          `pass:${mode}`,
        ),
      );
    }
  }
}

function collectAssuranceReviewIds(artifactsById, runId) {
  const ids = new Set();
  for (const [id, { value }] of artifactsById) {
    if (
      value.kind === 'recon.review-result' &&
      value.runId === runId &&
      assuranceReviewKinds.has(value.reviewKind) &&
      artifactIsComplete(value)
    ) {
      ids.add(id);
    }
  }
  return ids;
}

function sameReference(left, right) {
  return left?.path === right?.path && left?.digest === right?.digest;
}

function resolveTerminalReconciliation(
  artifactsById,
  artifactsByPath,
  passes,
  reconciliationRequired,
  errors,
) {
  const terminalId = passes.get('reconciliation')?.[0];
  const reconciliationResults = [...artifactsById.values()].filter(
    ({ value }) =>
      value.kind === 'recon.review-result' &&
      value.reviewKind === 'reconciliation',
  );
  const expectedCount = reconciliationRequired ? 1 : 0;
  if (
    reconciliationResults.length !== expectedCount ||
    (reconciliationRequired &&
      reconciliationResults[0]?.value.id !== terminalId)
  ) {
    errors.push(
      issue(
        'SHADOW_RECONCILIATION',
        'The packet must contain exactly its one complete terminal reconciliation',
        terminalId ?? '$.artifacts',
      ),
    );
  }
  const reconciliation = artifactsById.get(terminalId)?.value ?? null;
  const priorLedger = reconciliation
    ? ([...artifactsByPath.values()].find(
        ({ reference, value }) =>
          sameReference(reference, reconciliation.inputLedger) &&
          value.kind === 'recon.claim-ledger',
      )?.value ?? null)
    : null;
  return { reconciliation, priorLedger };
}

function reviewBriefBindsClaim(brief, reviewKind, claim, ledger, manifest) {
  const projected =
    reviewKind === 'semantic' || reviewKind === 'redundant-verification'
      ? brief?.claims?.find((item) => item.id === claim.id)
      : reviewKind === 'adversarial' ||
          reviewKind === 'contradiction-resolution'
        ? brief?.provisionalStatements?.find((item) => item.id === claim.id)
        : brief?.claims?.find((item) => item.id === claim.id);
  if (!projected || projected.statement !== claim.statement) return false;
  if (reviewKind !== 'semantic' && reviewKind !== 'redundant-verification') {
    return Object.keys(projected).sort().join(',') === 'id,statement';
  }
  const evidenceById = new Map(ledger.evidence.map((item) => [item.id, item]));
  const expectedEvidence = claim.evidence.map((link) => {
    const evidence = evidenceById.get(link.evidenceId);
    return evidence
      ? {
          id: evidence.id,
          sourceId: evidence.sourceId,
          displayExcerpt: evidence.displayExcerpt,
          locator: evidence.locator,
        }
      : null;
  });
  if (
    expectedEvidence.some((item) => !item) ||
    hashCanonicalJson(projected.evidence) !==
      hashCanonicalJson(expectedEvidence)
  ) {
    return false;
  }
  const sourceIds = new Set(expectedEvidence.map((item) => item.sourceId));
  const expectedSources = manifest.sources.filter((source) =>
    sourceIds.has(source.id),
  );
  return (
    hashCanonicalJson(brief.sources) === hashCanonicalJson(expectedSources)
  );
}

function validateReviewBindings(
  manifest,
  ledger,
  artifactsById,
  artifactsByPath,
  reconciliationContext,
  errors,
) {
  const claims = new Map(ledger.claims.map((claim) => [claim.id, claim]));
  const priorLedger = reconciliationContext.priorLedger;
  const priorClaims = new Map(
    (priorLedger?.claims ?? []).map((claim) => [claim.id, claim]),
  );
  for (const { value: result } of artifactsById.values()) {
    if (
      result.kind !== 'recon.review-result' ||
      result.reviewKind === 'reconciliation'
    ) {
      continue;
    }
    const brief = [...artifactsByPath.values()].find(
      ({ reference, value }) =>
        sameReference(reference, result.brief) &&
        value.kind === 'recon.review-brief',
    )?.value;
    const expectedMode =
      result.reviewKind === 'semantic' ||
      result.reviewKind === 'redundant-verification'
        ? 'verify'
        : result.reviewKind === 'adversarial' ||
            result.reviewKind === 'contradiction-resolution'
          ? 'adversary'
          : 'coverage';
    if (!brief || brief.mode !== expectedMode || brief.runId !== ledger.runId) {
      errors.push(
        issue(
          'REVIEW_BRIEF_MISMATCH',
          `Review ${result.id} does not resolve its exact typed brief`,
          result.id,
        ),
      );
      continue;
    }
    const seen = new Set();
    for (const disposition of result.dispositions) {
      const currentClaim = claims.get(disposition.claimId);
      const priorClaim = priorClaims.get(disposition.claimId);
      const claim = priorClaim ?? currentClaim;
      const bindingLedger = priorClaim ? priorLedger : ledger;
      if (
        !claim ||
        seen.has(disposition.claimId) ||
        !reviewBriefBindsClaim(
          brief,
          result.reviewKind,
          claim,
          bindingLedger,
          manifest,
        )
      ) {
        errors.push(
          issue(
            'REVIEW_BRIEF_MISMATCH',
            `Review ${result.id} dispositions must exactly match claim-bearing brief projections`,
            result.id,
          ),
        );
      }
      seen.add(disposition.claimId);
    }
    const suppliedEvidenceIds = new Set(
      result.newEvidence.map((evidence) => evidence.id),
    );
    const dispositionClaimIds = new Set(
      result.dispositions.map((disposition) => disposition.claimId),
    );
    const associationKeys = new Set();
    const associatedEvidenceIds = new Set();
    for (const association of result.evidenceAssociations ?? []) {
      const key = hashCanonicalJson(association);
      if (
        associationKeys.has(key) ||
        !suppliedEvidenceIds.has(association.evidenceId) ||
        !dispositionClaimIds.has(association.claimId) ||
        (!priorClaims.has(association.claimId) &&
          !claims.has(association.claimId))
      ) {
        errors.push(
          issue(
            'REVIEW_EVIDENCE_ASSOCIATION_MISMATCH',
            `Review ${result.id} evidence associations must bind exact supplied evidence to disposition claims`,
            result.id,
          ),
        );
      }
      associationKeys.add(key);
      associatedEvidenceIds.add(association.evidenceId);
    }
    if (
      suppliedEvidenceIds.size !== associatedEvidenceIds.size ||
      [...suppliedEvidenceIds].some((id) => !associatedEvidenceIds.has(id))
    ) {
      errors.push(
        issue(
          'REVIEW_EVIDENCE_ASSOCIATION_MISMATCH',
          `Review ${result.id} must associate every new evidence record`,
          result.id,
        ),
      );
    }
    if (result.reviewKind === 'contradiction-resolution') {
      const challengeOwners = new Map();
      for (const claim of ledger.claims) {
        for (const challenge of claim.challenges ?? []) {
          challengeOwners.set(challenge.id, claim.id);
        }
      }
      for (const disposition of result.contradictionDispositions ?? []) {
        const owner = challengeOwners.get(disposition.contradictionId);
        if (
          !owner ||
          !disposition.claimIds.includes(owner) ||
          !disposition.claimIds.every((claimId) => claims.has(claimId))
        ) {
          errors.push(
            issue(
              'CONTRADICTION_BINDING_MISMATCH',
              `Contradiction ${disposition.contradictionId} is not bound to its affected claims`,
              result.id,
            ),
          );
        }
      }
    }
  }
}

function validateReconciliation(
  manifest,
  ledger,
  artifactsById,
  reconciliationContext,
  passes,
  assuranceReviewIds,
  exactEvidence,
  reconciliationRequired,
  errors,
) {
  const { reconciliation, priorLedger: prior } = reconciliationContext;
  if (ledger.revision <= 1) {
    if (reconciliationRequired) {
      errors.push(
        issue(
          'RECONCILIATION_REVISION_MISMATCH',
          'Standard and thorough canonical ledgers must be the next revision of the bound prior ledger',
          '$.revision',
        ),
      );
    }
    return;
  }
  if (!reconciliation || reconciliation.status !== 'complete') {
    errors.push(
      issue(
        'MISSING_RECONCILIATION_RESULT',
        'A revised ledger requires a complete reconciliation result',
        '$.revision',
      ),
    );
    return;
  }
  if (reconciliation.runId !== ledger.runId) {
    errors.push(
      issue(
        'REVIEW_RUN_MISMATCH',
        'Reconciliation result belongs to another run',
        reconciliation.id,
      ),
    );
  }
  if (
    !prior ||
    prior.revision !== reconciliation.inputLedger?.revision ||
    reconciliation.outputRevision !== ledger.revision ||
    prior.revision + 1 !== ledger.revision
  ) {
    errors.push(
      issue(
        'RECONCILIATION_REVISION_MISMATCH',
        'Reconciliation must bind the previous and current ledger revisions',
        reconciliation.id,
      ),
    );
  }
  if (!prior) return;
  const priorClaims = new Map(prior.claims.map((claim) => [claim.id, claim]));
  const currentClaims = new Map(
    ledger.claims.map((claim) => [claim.id, claim]),
  );
  const expectedAdditions = [...currentClaims.keys()].filter(
    (id) => !priorClaims.has(id),
  );
  const expectedRemovals = [...priorClaims.keys()].filter(
    (id) => !currentClaims.has(id),
  );
  if (
    JSON.stringify(reconciliation.additions) !==
      JSON.stringify(expectedAdditions) ||
    JSON.stringify(reconciliation.removals) !== JSON.stringify(expectedRemovals)
  ) {
    errors.push(
      issue(
        'RECONCILIATION_MEMBERSHIP_MISMATCH',
        'Reconciliation additions and removals must exactly match ledger membership changes',
        reconciliation.id,
      ),
    );
  }
  const removalDispositions = new Map(
    (reconciliation.removalDispositions ?? []).map((item) => [
      item.claimId,
      item,
    ]),
  );
  for (const claimId of expectedRemovals) {
    const authorization = removalDispositions.get(claimId);
    const review = artifactsById.get(authorization?.reviewId)?.value;
    const disposition = review?.dispositions?.find(
      (item) => item.claimId === claimId,
    );
    if (
      !authorization ||
      authorization.disposition !== 'rejected' ||
      !assuranceReviewIds.has(authorization.reviewId) ||
      !reconciliation.incorporatedReviewIds.includes(authorization.reviewId) ||
      disposition?.disposition !== 'rejected'
    ) {
      errors.push(
        issue(
          'UNAUTHORIZED_CLAIM_REMOVAL',
          `Claim ${claimId} lacks a complete typed review disposition authorizing removal`,
          claimId,
        ),
      );
    }
  }
  if (removalDispositions.size !== expectedRemovals.length) {
    errors.push(
      issue(
        'UNAUTHORIZED_CLAIM_REMOVAL',
        'Removal dispositions must exactly match removed prior claims',
        reconciliation.id,
      ),
    );
  }
  const transitions = reconciliation.transitions ?? [];
  const transitionCounts = new Map();
  for (const transition of transitions) {
    transitionCounts.set(
      transition.claimId,
      (transitionCounts.get(transition.claimId) ?? 0) + 1,
    );
  }
  const incorporatedReviews = (reconciliation.incorporatedReviewIds ?? [])
    .map((id) => artifactsById.get(id)?.value)
    .filter(Boolean);
  const expectedNewEvidence = [];
  const allowedNewEvidence = new Map();
  const expectedAssociationsByClaim = new Map();
  const associationKeys = new Set();
  for (const review of incorporatedReviews) {
    const reviewEvidenceIds = new Set(
      (review.newEvidence ?? []).map((evidence) => evidence.id),
    );
    const dispositionClaimIds = new Set(
      (review.dispositions ?? []).map((disposition) => disposition.claimId),
    );
    for (const evidence of review.newEvidence ?? []) {
      if (allowedNewEvidence.has(evidence.id)) {
        errors.push(
          issue(
            'RECONCILIATION_EVIDENCE_INVENTION',
            `Evidence ${evidence.id} was supplied more than once`,
            evidence.id,
          ),
        );
        continue;
      }
      allowedNewEvidence.set(evidence.id, evidence);
      expectedNewEvidence.push(evidence);
    }
    for (const association of review.evidenceAssociations ?? []) {
      const key = hashCanonicalJson(association);
      if (
        associationKeys.has(key) ||
        !reviewEvidenceIds.has(association.evidenceId) ||
        !dispositionClaimIds.has(association.claimId)
      ) {
        errors.push(
          issue(
            'RECONCILIATION_EVIDENCE_ASSOCIATION_MISMATCH',
            `Review ${review.id} contains an invalid incorporated evidence association`,
            review.id,
          ),
        );
      }
      associationKeys.add(key);
      const links = expectedAssociationsByClaim.get(association.claimId) ?? [];
      links.push({
        evidenceId: association.evidenceId,
        relation: association.relation,
      });
      expectedAssociationsByClaim.set(association.claimId, links);
    }
  }
  for (const [claimId, priorClaim] of priorClaims) {
    const currentClaim = currentClaims.get(claimId);
    if (!currentClaim) continue;
    for (const field of ['statement', 'qualifications']) {
      if (
        hashCanonicalJson(priorClaim[field]) !==
        hashCanonicalJson(currentClaim[field])
      ) {
        errors.push(
          issue(
            'RECONCILIATION_CONTINUITY_MISMATCH',
            `Claim ${claimId} changed ${field} across reconciliation`,
            claimId,
          ),
        );
      }
    }
    const expectedEvidenceLinks = [
      ...priorClaim.evidence,
      ...(expectedAssociationsByClaim.get(claimId) ?? []),
    ];
    if (
      hashCanonicalJson(expectedEvidenceLinks) !==
      hashCanonicalJson(currentClaim.evidence)
    ) {
      errors.push(
        issue(
          'RECONCILIATION_CONTINUITY_MISMATCH',
          `Claim ${claimId} evidence links do not preserve prior bytes plus exact incorporated associations`,
          claimId,
        ),
      );
    }
    for (const field of ['derivedFrom', 'challenges']) {
      if (
        hashCanonicalJson(priorClaim[field]) !==
        hashCanonicalJson(currentClaim[field])
      ) {
        errors.push(
          issue(
            'RECONCILIATION_CONTINUITY_MISMATCH',
            `Claim ${claimId} changed ${field} without a typed reconciliation input`,
            claimId,
          ),
        );
      }
    }
    const expectedReviewIds = [
      ...new Set([
        ...priorClaim.reviewIds,
        ...[...artifactsById.values()]
          .filter(
            ({ value }) =>
              reconciliation.incorporatedReviewIds.includes(value.id) &&
              value.dispositions?.some((item) => item.claimId === claimId),
          )
          .map(({ value }) => value.id),
      ]),
    ];
    if (
      expectedReviewIds.length !== new Set(currentClaim.reviewIds).size ||
      expectedReviewIds.some((id) => !currentClaim.reviewIds.includes(id))
    ) {
      errors.push(
        issue(
          'RECONCILIATION_REVIEW_MISMATCH',
          `Claim ${claimId} review membership is not derived from incorporated results`,
          claimId,
        ),
      );
    }
    const expectedCount = priorClaim.status === currentClaim.status ? 0 : 1;
    const transition = transitions.find((item) => item.claimId === claimId);
    if (
      (transitionCounts.get(claimId) ?? 0) !== expectedCount ||
      (expectedCount === 1 &&
        (transition.from !== priorClaim.status ||
          transition.to !== currentClaim.status))
    ) {
      errors.push(
        issue(
          'RECONCILIATION_TRANSITION_BINDING_MISMATCH',
          `Claim ${claimId} is not bound to exactly its prior/current state transition`,
          claimId,
        ),
      );
    }
  }
  const priorEvidence = new Map(prior.evidence.map((item) => [item.id, item]));
  for (const evidence of ledger.evidence) {
    const previous = priorEvidence.get(evidence.id);
    if (
      previous &&
      hashCanonicalJson(previous) !== hashCanonicalJson(evidence)
    ) {
      errors.push(
        issue(
          'RECONCILIATION_EVIDENCE_DRIFT',
          `Evidence ${evidence.id} changed`,
          evidence.id,
        ),
      );
    }
    const allowed = allowedNewEvidence.get(evidence.id);
    if (
      !previous &&
      (!allowed || hashCanonicalJson(allowed) !== hashCanonicalJson(evidence))
    ) {
      errors.push(
        issue(
          'RECONCILIATION_EVIDENCE_INVENTION',
          `Evidence ${evidence.id} was not supplied by an incorporated review`,
          evidence.id,
        ),
      );
    }
  }
  if (
    hashCanonicalJson([...prior.evidence, ...expectedNewEvidence]) !==
    hashCanonicalJson(ledger.evidence)
  ) {
    errors.push(
      issue(
        'RECONCILIATION_EVIDENCE_INVENTION',
        'Canonical evidence must preserve prior bytes and append exactly incorporated review evidence',
        reconciliation.id,
      ),
    );
  }
  if (
    JSON.stringify(reconciliation.transitions) !==
    JSON.stringify(ledger.transitions)
  ) {
    errors.push(
      issue(
        'RECONCILIATION_TRANSITION_MISMATCH',
        'Reconciliation transitions differ from the canonical ledger',
        reconciliation.id,
      ),
    );
  }
  const incorporated = new Set(reconciliation.incorporatedReviewIds ?? []);
  if (
    assuranceReviewIds.size !== incorporated.size ||
    [...assuranceReviewIds].some((id) => !incorporated.has(id))
  ) {
    errors.push(
      issue(
        'RECONCILIATION_REVIEW_MISMATCH',
        'Reconciliation does not incorporate the exact independent review set',
        reconciliation.id,
      ),
    );
  }

  const coverageResults = (passes.get('coverage') ?? [])
    .map((id) => artifactsById.get(id)?.value)
    .filter(Boolean);
  const coverageDispositions = new Map(
    (reconciliation.coverageDispositions ?? []).map((item) => [
      item.findingId,
      item,
    ]),
  );
  for (const coverage of coverageResults) {
    for (const finding of coverage.coverageFindings ?? []) {
      const gap = manifest.gaps.find((item) => item.id === finding.gapId);
      const claimsExist = finding.claimIds.every((id) => currentClaims.has(id));
      if (
        !gap ||
        gap.material !== finding.material ||
        gap.code !== finding.code ||
        gap.message !== finding.message ||
        !gap.coverageFindingIds?.includes(finding.id) ||
        !finding.claimIds.every((id) => gap.claimIds?.includes(id)) ||
        !claimsExist
      ) {
        errors.push(
          issue(
            'COVERAGE_GAP_MISMATCH',
            `Coverage finding ${finding.id} is not bound to an exact manifest gap and affected claims`,
            finding.id,
          ),
        );
      }
      const disposition = coverageDispositions.get(finding.id);
      if (!disposition || disposition.gapId !== finding.gapId) {
        errors.push(
          issue(
            'COVERAGE_RECONCILIATION_MISMATCH',
            `Coverage finding ${finding.id} lacks an exact reconciliation disposition`,
            finding.id,
          ),
        );
      }
      if (disposition?.disposition === 'accepted-gap') {
        for (const claimId of finding.claimIds) {
          const claim = currentClaims.get(claimId);
          const coverageDisposition = coverage.dispositions.find(
            (item) => item.claimId === claimId,
          );
          if (
            finding.material === true &&
            (claim?.status === 'verified' ||
              coverageDisposition?.disposition !== 'gap')
          ) {
            errors.push(
              issue(
                'MATERIAL_COVERAGE_ASSURANCE_EXCEEDED',
                `Material unresolved coverage finding ${finding.id} requires claim ${claimId} to be downgraded`,
                claimId,
              ),
            );
          }
        }
      } else if (disposition?.disposition === 'resolved') {
        if (
          !disposition.evidenceIds?.every(
            (id) =>
              exactEvidence.has(id) &&
              ledger.evidence.some((evidence) => evidence.id === id),
          )
        ) {
          errors.push(
            issue(
              'COVERAGE_RESOLUTION_EVIDENCE_INVALID',
              `Coverage finding ${finding.id} is not resolved by exact typed evidence`,
              finding.id,
            ),
          );
        }
      }
    }
  }
}

function validateDerivedSourceGaps(manifest, ledger, errors) {
  const evidenceById = new Map(
    (ledger.evidence ?? []).map((item) => [item.id, item]),
  );
  const claimsBySource = new Map();
  for (const claim of ledger.claims ?? []) {
    for (const link of claim.evidence ?? []) {
      const sourceId = evidenceById.get(link.evidenceId)?.sourceId;
      if (!sourceId) continue;
      const ids = claimsBySource.get(sourceId) ?? new Set();
      ids.add(claim.id);
      claimsBySource.set(sourceId, ids);
    }
  }
  for (const source of manifest.sources ?? []) {
    if (source.available === true && source.validationState === 'pinned')
      continue;
    const affectedClaims = claimsBySource.get(source.id) ?? new Set();
    const gap = (manifest.gaps ?? []).find(
      (item) =>
        item.sourceIds?.includes(source.id) &&
        [...affectedClaims].every((claimId) =>
          item.claimIds?.includes(claimId),
        ),
    );
    if (!gap) {
      errors.push(
        issue(
          'MISSING_SOURCE_GAP',
          `Ineligible source ${source.id} requires an explicit affected-claim gap`,
          `source:${source.id}`,
        ),
      );
    } else if (gap.material !== true || manifest.run.status !== 'partial') {
      errors.push(
        issue(
          'SOURCE_GAP_REQUIRES_MATERIAL_PARTIAL',
          `Ineligible source ${source.id} requires a material gap and partial publication`,
          `source:${source.id}`,
        ),
      );
    }
    if (
      [...affectedClaims].some((claimId) =>
        ['supported', 'verified'].includes(
          ledger.claims.find((claim) => claim.id === claimId)?.status,
        ),
      )
    ) {
      errors.push(
        issue(
          'CLAIM_ASSURANCE_INVALID',
          `Ineligible source ${source.id} cannot support assured claims`,
          `source:${source.id}`,
        ),
      );
    }
  }
}

function validateAssurance(validatedRun, errors) {
  const { manifest, ledger, achievedProfile } = validatedRun;
  const exactEvidence = new Set(validatedRun.exactEvidenceIds);
  const assuranceReviewIds = new Set(validatedRun.assuranceReviewIds);
  const artifactsById = new Map(
    validatedRun.artifacts.map((artifact) => [artifact.id, artifact]),
  );
  const evidenceById = new Map(
    (ledger.evidence ?? []).map((item) => [item.id, item]),
  );
  const priorClaims = new Map(
    (validatedRun.priorLedger?.claims ?? []).map((claim) => [claim.id, claim]),
  );
  const claimIds = new Set((ledger.claims ?? []).map((claim) => claim.id));
  for (const claimId of ledger.synthesis?.keyClaimIds ?? []) {
    if (!claimIds.has(claimId)) {
      errors.push(
        issue(
          'SYNTHESIS_REFERENCE_MISSING',
          `Synthesis key claim ${claimId} does not resolve to an existing claim`,
          '$.synthesis.keyClaimIds',
        ),
      );
    }
  }
  const questionIds = new Set(
    (ledger.unresolvedQuestions ?? []).map((q) => q.id),
  );
  for (const questionId of ledger.synthesis?.unresolvedQuestionIds ?? []) {
    if (!questionIds.has(questionId)) {
      errors.push(
        issue(
          'SYNTHESIS_REFERENCE_MISSING',
          `Synthesis unresolved question ${questionId} does not resolve to an existing question`,
          '$.synthesis.unresolvedQuestionIds',
        ),
      );
    }
  }
  for (const claim of ledger.claims ?? []) {
    if (
      (claim.status === 'supported' || claim.status === 'verified') &&
      achievedProfile === null
    ) {
      errors.push(
        issue(
          'PROFILE_ASSURANCE_EXCEEDED',
          'Supported assurance requires the quick profile to be achieved',
          claim.id,
        ),
      );
    }
    if (claim.status === 'verified' && achievedProfile === 'quick') {
      errors.push(
        issue(
          'PROFILE_ASSURANCE_EXCEEDED',
          'A quick packet cannot contain verified claims',
          claim.id,
        ),
      );
    }
    if (claim.status === 'verified') {
      const unresolved = (claim.challenges ?? []).some(
        (challenge) =>
          challenge.material === true && challenge.status === 'unresolved',
      );
      if (unresolved) {
        errors.push(
          issue(
            'UNRESOLVED_VERIFICATION_CHALLENGE',
            'A verified claim has an unresolved material challenge',
            claim.id,
          ),
        );
      }
      if (
        !Array.isArray(claim.reviewIds) ||
        new Set(claim.reviewIds).size !== claim.reviewIds.length
      ) {
        errors.push(
          issue(
            'DUPLICATE_REVIEW_ID',
            'Verified claim review identifiers must be unique',
            claim.id,
          ),
        );
      }
      const required = new Map([
        ['semantic', 'affirmed'],
        ['adversarial', 'unchallenged'],
        ['coverage', 'covered'],
      ]);
      if (achievedProfile === 'thorough') {
        required.set('redundant-verification', 'affirmed');
      }
      const satisfied = new Set();
      const reviewerLanes = new Set();
      for (const reviewId of new Set(claim.reviewIds ?? [])) {
        const artifact = artifactsById.get(reviewId)?.value;
        if (!artifact || artifact.kind !== 'recon.review-result') {
          errors.push(
            issue(
              'MISSING_INDEPENDENT_REVIEW',
              `Review ${reviewId} does not resolve to a hashed result`,
              claim.id,
            ),
          );
          continue;
        }
        if (!assuranceReviewIds.has(reviewId)) {
          errors.push(
            issue(
              'INCOMPLETE_INDEPENDENT_REVIEW',
              `Review ${reviewId} is not a complete same-run assurance result`,
              claim.id,
            ),
          );
        }
        if (
          !required.has(artifact.reviewKind) &&
          artifact.reviewKind !== 'contradiction-resolution'
        ) {
          errors.push(
            issue(
              'REVIEW_KIND_MISMATCH',
              `Review ${reviewId} has an ineligible kind`,
              claim.id,
            ),
          );
          continue;
        }
        if (artifact.runId !== ledger.runId) {
          errors.push(
            issue(
              'REVIEW_RUN_MISMATCH',
              `Review ${reviewId} belongs to another run`,
              claim.id,
            ),
          );
        }
        if (artifact.status !== 'complete') {
          errors.push(
            issue(
              'INCOMPLETE_INDEPENDENT_REVIEW',
              `Review ${reviewId} is not complete`,
              claim.id,
            ),
          );
        }
        if (reviewerLanes.has(artifact.reviewerLane)) {
          errors.push(
            issue(
              'MISSING_INDEPENDENT_REVIEW',
              `Review lane ${artifact.reviewerLane} is reused`,
              claim.id,
            ),
          );
        }
        reviewerLanes.add(artifact.reviewerLane);
        const brief = [...artifactsById.values()].find(
          ({ reference, value }) =>
            sameReference(reference, artifact.brief) &&
            value.kind === 'recon.review-brief',
        )?.value;
        const expectedMode =
          artifact.reviewKind === 'semantic' ||
          artifact.reviewKind === 'redundant-verification'
            ? 'verify'
            : artifact.reviewKind === 'adversarial' ||
                artifact.reviewKind === 'contradiction-resolution'
              ? 'adversary'
              : 'coverage';
        if (
          !brief ||
          brief.runId !== ledger.runId ||
          brief.mode !== expectedMode ||
          !reviewBriefBindsClaim(
            brief,
            artifact.reviewKind,
            priorClaims.get(claim.id) ?? claim,
            priorClaims.has(claim.id) ? validatedRun.priorLedger : ledger,
            manifest,
          ) ||
          !artifact.permittedInputs?.some((reference) =>
            sameReference(reference, artifact.brief),
          )
        ) {
          errors.push(
            issue(
              'REVIEW_BRIEF_MISMATCH',
              `Review ${reviewId} is not bound to the expected immutable brief`,
              claim.id,
            ),
          );
        }
        const dispositions = (artifact.dispositions ?? []).filter(
          (item) => item.claimId === claim.id,
        );
        const expectedDisposition =
          artifact.reviewKind === 'contradiction-resolution'
            ? 'resolved'
            : required.get(artifact.reviewKind);
        if (
          dispositions.length !== 1 ||
          dispositions[0].disposition !== expectedDisposition
        ) {
          errors.push(
            issue(
              'REVIEW_DISPOSITION_MISMATCH',
              `Review ${reviewId} does not support verified disposition`,
              claim.id,
            ),
          );
        }
        if ((artifact.unresolvedIssues ?? []).length > 0) {
          errors.push(
            issue(
              'REVIEW_DISPOSITION_MISMATCH',
              `Review ${reviewId} retains unresolved issues`,
              claim.id,
            ),
          );
        }
        if (required.has(artifact.reviewKind)) {
          satisfied.add(artifact.reviewKind);
        }
      }
      const missingReviewKinds = [...required.keys()].filter(
        (kind) => !satisfied.has(kind),
      );
      if (missingReviewKinds.length > 0) {
        errors.push(
          issue(
            'MISSING_INDEPENDENT_REVIEW',
            `Verified claims require ${missingReviewKinds.join(', ')} reviews`,
            claim.id,
          ),
        );
      }
    }
    if (claim.status === 'supported' || claim.status === 'verified') {
      const supports = (claim.evidence ?? []).some((link) => {
        const evidence = evidenceById.get(link.evidenceId);
        return (
          link.relation === 'supports' &&
          evidence &&
          exactEvidence.has(evidence.id)
        );
      });
      if (!supports) {
        errors.push(
          issue(
            'CLAIM_ASSURANCE_INVALID',
            'Supported claims require exact valid evidence',
            claim.id,
          ),
        );
      }
    }
  }

  if (manifest.run.achievedProfile !== achievedProfile) {
    errors.push(
      issue(
        'ACHIEVED_PROFILE_MISMATCH',
        `Manifest claims ${manifest.run.achievedProfile}, derived ${achievedProfile}`,
        '$.run.achievedProfile',
      ),
    );
  }
  if (
    manifest.run.status === 'complete' &&
    achievedProfile !== manifest.run.requestedProfile
  ) {
    errors.push(
      issue(
        'INCOMPLETE_PROFILE',
        'Complete status requires the requested profile to be achieved',
        '$.run.status',
      ),
    );
  }
  const hasMaterialGap = (manifest.gaps ?? []).some(
    (gap) => gap.material === true,
  );
  if (manifest.run.status === 'complete' && hasMaterialGap) {
    errors.push(
      issue(
        'MATERIAL_GAP_REQUIRES_PARTIAL',
        'Complete publication cannot contain material gaps',
        '$.run.status',
      ),
    );
  }
  const requestedIndex = profiles.indexOf(manifest.run.requestedProfile);
  const achievedIndex = profiles.indexOf(achievedProfile);
  if (
    manifest.run.status === 'partial' &&
    achievedIndex >= requestedIndex &&
    !hasMaterialGap
  ) {
    errors.push(
      issue(
        'INVALID_PARTIAL_STATUS',
        'Partial status requires a lower achieved profile',
        '$.run.status',
      ),
    );
  }
}

export async function compileValidatedRun(packetDirectory) {
  const packetRoot = resolve(packetDirectory);
  const errors = [];
  const warnings = [];
  const filesystemIdentities = new Map();
  const canonicalByteDigests = new Map();
  let packetRootIdentity = null;
  try {
    packetRootIdentity = await assertCanonicalRoot(packetRoot);
    filesystemIdentities.set(packetRootIdentity.path, packetRootIdentity);
  } catch (error) {
    errors.push(
      issue(
        error?.code === 'SYMLINK_ESCAPE'
          ? 'SYMLINK_ESCAPE'
          : 'NON_CANONICAL_ROOT',
        'Packet root must be a stable canonical realpath',
        packetRoot,
      ),
    );
  }
  const manifest = await readManagedJson(
    packetRoot,
    resolve(packetRoot, 'manifest.json'),
    'INVALID_MANIFEST_JSON',
    errors,
    canonicalByteDigests,
    'manifest.json',
  );
  const ledger = await readManagedJson(
    packetRoot,
    resolve(packetRoot, 'claims.json'),
    'INVALID_LEDGER_JSON',
    errors,
    canonicalByteDigests,
    'claims.json',
  );

  if (manifest) errors.push(...validateArtifactShape(manifest).errors);
  if (ledger) errors.push(...validateArtifactShape(ledger).errors);

  if (manifest && manifest.request?.outputPath !== packetRoot) {
    errors.push(
      issue(
        'OUTPUT_ROOT_MISMATCH',
        'Declared output path must equal the canonical packet root',
        '$.request.outputPath',
      ),
    );
  }

  if (manifest && ledger && manifest.run?.id !== ledger.runId) {
    errors.push(issue('RUN_ID_MISMATCH', 'Manifest and ledger run IDs differ'));
  }

  if (isObject(manifest?.execution?.approval)) {
    const expected = hashCanonicalJson(
      approvalFingerprintInput(manifest.execution),
    );
    if (manifest.execution.approval.fingerprint !== expected) {
      errors.push(
        issue(
          'APPROVAL_FINGERPRINT_MISMATCH',
          'Approved execution envelope no longer matches its approval fingerprint',
          '$.execution.approval.fingerprint',
        ),
      );
    }
  } else if (manifest) {
    errors.push(
      issue(
        'MISSING_APPROVAL_ENVELOPE',
        'Manifest lacks approval-bound execution evidence',
      ),
    );
  }

  const { artifactsByPath, artifactsById, validatedByteDigests } =
    await validateReferences(
      packetRoot,
      collectReferences(manifest, ledger),
      errors,
    );
  for (const [path, digest] of validatedByteDigests) {
    const retained = canonicalByteDigests.get(path);
    if (retained && retained !== digest) {
      errors.push(
        issue(
          'ARTIFACT_DIGEST_MISMATCH',
          `Canonical artifact bytes changed during validation: ${path}`,
          path,
        ),
      );
    }
    canonicalByteDigests.set(path, digest);
  }
  if (manifest && !artifactsByPath.has('claims.json')) {
    errors.push(
      issue(
        'MISSING_CANONICAL_LEDGER_REFERENCE',
        'Manifest must bind claims.json by exact digest',
        '$.artifacts',
      ),
    );
  }
  validatePersistedSecretSafety(
    [
      ['manifest.json', manifest],
      ['claims.json', ledger],
      ...[...artifactsByPath.entries()].map(([path, artifact]) => [
        path,
        artifact.value,
      ]),
    ],
    errors,
  );

  const exactEvidence = new Set();
  if (manifest && ledger) {
    validateDerivedSourceGaps(manifest, ledger, errors);
    const sources = new Map(
      manifest.sources.map((source) => [source.id, source]),
    );
    for (const source of sources.values()) {
      try {
        await retainDeclaredSourceIdentities(
          packetRoot,
          source,
          filesystemIdentities,
        );
      } catch (error) {
        const code = [
          'SYMLINK_ESCAPE',
          'PATH_ESCAPE',
          'NON_CANONICAL_ROOT',
        ].includes(error?.code)
          ? error.code
          : 'SOURCE_UNAVAILABLE';
        errors.push(
          issue(
            code,
            'Declared source filesystem identity is not stable and canonical',
            `source:${source.id}`,
          ),
        );
      }
    }
    for (const evidence of ledger.evidence ?? []) {
      const source = sources.get(evidence.sourceId);
      if (!source) {
        errors.push(
          issue(
            'MISSING_SOURCE',
            `Unknown source ${evidence.sourceId}`,
            evidence.id,
          ),
        );
        continue;
      }
      const affectedClaims = (ledger.claims ?? []).filter((claim) =>
        (claim.evidence ?? []).some((link) => link.evidenceId === evidence.id),
      );
      const ineligibleGap = (manifest.gaps ?? []).find(
        (gap) =>
          gap.sourceIds?.includes(source.id) &&
          affectedClaims.every((claim) => gap.claimIds?.includes(claim.id)) &&
          affectedClaims.every(
            (claim) => !['supported', 'verified'].includes(claim.status),
          ),
      );
      if (
        await reopenEvidence(
          packetRoot,
          source,
          evidence,
          errors,
          filesystemIdentities,
          Boolean(ineligibleGap),
        )
      ) {
        exactEvidence.add(evidence.id);
      }
    }
    validateApprovedLanes(manifest, artifactsById, errors);
    const passes = collectCompletePasses(artifactsById, manifest.run.id);
    const achievedProfile = deriveAchievedProfile(passes);
    validatePassOutcomes(manifest, passes, errors);
    const assuranceReviewIds = collectAssuranceReviewIds(
      artifactsById,
      manifest.run.id,
    );
    const reconciliationRequired =
      achievedProfile === 'standard' || achievedProfile === 'thorough';
    const reconciliationContext = resolveTerminalReconciliation(
      artifactsById,
      artifactsByPath,
      passes,
      reconciliationRequired,
      errors,
    );
    validateReviewBindings(
      manifest,
      ledger,
      artifactsById,
      artifactsByPath,
      reconciliationContext,
      errors,
    );
    validateReconciliation(
      manifest,
      ledger,
      artifactsById,
      reconciliationContext,
      passes,
      assuranceReviewIds,
      exactEvidence,
      reconciliationRequired,
      errors,
    );
    for (const identity of filesystemIdentities.values()) {
      try {
        await assertUnchangedRoot(identity);
      } catch {
        errors.push(
          issue(
            'ROOT_IDENTITY_CHANGED',
            'Filesystem identity changed during validation',
            identity.path,
          ),
        );
      }
    }
    let validatedRun = null;
    if (
      packetRootIdentity &&
      isObject(manifest.run) &&
      Array.isArray(ledger.claims) &&
      Array.isArray(ledger.evidence)
    ) {
      validatedRun = createValidatedRun({
        packetRoot,
        filesystemIdentities,
        canonicalByteDigests,
        manifest,
        ledger,
        artifactsById,
        exactEvidence,
        passes,
        achievedProfile,
        assuranceReviewIds,
        reconciliationContext,
      });
      validateAssurance(validatedRun, errors);
    }

    const valid = errors.length === 0;
    const publishable =
      valid &&
      (manifest.run.status === 'complete' || manifest.run.status === 'partial');
    if (valid && !publishable) {
      errors.push(
        issue(
          'PACKET_NOT_PUBLISHABLE',
          `Packet status ${manifest.run.status} is not publishable`,
          '$.run.status',
        ),
      );
    }
    if (!publishable && packetRootIdentity) {
      await assertUnchangedRoot(packetRootIdentity);
      await rm(join(packetRoot, 'packet.md'), { force: true });
    }
    return {
      valid,
      publishable,
      status: manifest.run.status,
      requestedProfile: manifest.run.requestedProfile,
      achievedProfile,
      packetRoot,
      errors,
      warnings,
      validatedRun: publishable ? validatedRun : undefined,
    };
  }

  if (packetRootIdentity) {
    await assertUnchangedRoot(packetRootIdentity);
    await rm(join(packetRoot, 'packet.md'), { force: true });
  }
  return {
    valid: false,
    publishable: false,
    status: 'failed',
    requestedProfile: null,
    achievedProfile: null,
    packetRoot,
    errors,
    warnings,
  };
}

export async function validatePacket(packetDirectory) {
  const { validatedRun: _validatedRun, ...result } =
    await compileValidatedRun(packetDirectory);
  return result;
}

async function main(argv) {
  const [packetDirectory] = argv;
  if (!packetDirectory) {
    throw new Error('Usage: validate-packet.mjs <packet-directory>');
  }
  const result = await validatePacket(packetDirectory);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.publishable ? 0 : 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 2;
  });
}
