#!/usr/bin/env node

import { lstat, readFile, realpath, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashCanonicalJson, hashFile } from './lib/canonical-json.mjs';
import {
  isDigest,
  isObject,
  issue,
  profiles,
  validateArtifactShape,
} from './lib/contracts.mjs';
import { assertSafeExistingPath, isContainedPath } from './lib/safe-path.mjs';

const requiredStages = {
  quick: ['map', 'gather', 'compile', 'locator-validation'],
  standard: [
    'map',
    'gather',
    'compile',
    'locator-validation',
    'semantic-verification',
    'adversarial',
    'coverage',
    'reconciliation',
  ],
  thorough: [
    'map',
    'gather',
    'compile',
    'locator-validation',
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

async function readJson(path, code, errors) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
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

async function readManagedJson(root, path, code, errors) {
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
  return readJson(path, code, errors);
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
      const actual = await hashFile(path);
      if (isDigest(reference.digest) && actual !== reference.digest) {
        errors.push(
          issue(
            'ARTIFACT_DIGEST_MISMATCH',
            `Artifact digest does not match ${reference.path}`,
            reference.path,
          ),
        );
      }
      if (reference.path.endsWith('.json')) {
        const value = JSON.parse(await readFile(path, 'utf8'));
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
  return { artifactsByPath, artifactsById };
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

async function reopenEvidence(packetRoot, source, evidence, errors) {
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
      if ((await realpath(path)) !== path) {
        const error = new Error('File source path is not canonical');
        error.code = 'SYMLINK_ESCAPE';
        throw error;
      }
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) {
        const error = new Error('File source is a symlink');
        error.code = 'SYMLINK_ESCAPE';
        throw error;
      }
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

function stageArtifactIsComplete(stage, artifactsById) {
  const requiredReviewKind = {
    'semantic-verification': 'semantic',
    adversarial: 'adversarial',
    coverage: 'coverage',
    reconciliation: 'reconciliation',
  }[stage.mode];
  if (!requiredReviewKind) return stage.status === 'complete';
  return (
    stage.status === 'complete' &&
    Array.isArray(stage.artifactIds) &&
    stage.artifactIds.some((id) => {
      const artifact = artifactsById.get(id)?.value;
      return (
        artifact?.kind === 'recon.review-result' &&
        artifact.reviewKind === requiredReviewKind &&
        artifact.status === 'complete'
      );
    })
  );
}

function deriveAchievedProfile(stages, artifactsById) {
  const complete = new Set(
    stages
      .filter((stage) => stageArtifactIsComplete(stage, artifactsById))
      .map((stage) => stage.mode),
  );
  let achieved = null;
  for (const profile of profiles) {
    if (requiredStages[profile].every((mode) => complete.has(mode)))
      achieved = profile;
  }
  return achieved;
}

function sameReference(left, right) {
  return left?.path === right?.path && left?.digest === right?.digest;
}

function validateReconciliation(
  ledger,
  artifactsById,
  artifactsByPath,
  errors,
) {
  const reconciliation = [...artifactsById.values()].find(
    ({ value }) =>
      value.kind === 'recon.review-result' &&
      value.reviewKind === 'reconciliation',
  )?.value;
  if (ledger.revision <= 1) return;
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
  const prior = [...artifactsByPath.values()].find(
    ({ reference, value }) =>
      sameReference(reference, reconciliation.inputLedger) &&
      value.kind === 'recon.claim-ledger',
  )?.value;
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
  const expectedReviews = new Set(
    ledger.claims
      .filter((claim) => claim.status === 'verified')
      .flatMap((claim) => claim.reviewIds),
  );
  const incorporated = new Set(reconciliation.incorporatedReviewIds ?? []);
  if (
    expectedReviews.size !== incorporated.size ||
    [...expectedReviews].some(
      (id) => !incorporated.has(id) || !artifactsById.has(id),
    )
  ) {
    errors.push(
      issue(
        'RECONCILIATION_REVIEW_MISMATCH',
        'Reconciliation does not incorporate the exact independent review set',
        reconciliation.id,
      ),
    );
  }
}

function validateAssurance(
  manifest,
  ledger,
  exactEvidence,
  achievedProfile,
  artifactsById,
  errors,
) {
  const evidenceById = new Map(
    (ledger.evidence ?? []).map((item) => [item.id, item]),
  );
  for (const claim of ledger.claims ?? []) {
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
        if (!required.has(artifact.reviewKind)) {
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
          artifact.reviewKind === 'semantic' ? 'verify' : 'adversary';
        if (
          !brief ||
          brief.runId !== ledger.runId ||
          brief.mode !== expectedMode ||
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
        if (
          dispositions.length !== 1 ||
          dispositions[0].disposition !== required.get(artifact.reviewKind)
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
        required.delete(artifact.reviewKind);
      }
      if (required.size > 0) {
        errors.push(
          issue(
            'MISSING_INDEPENDENT_REVIEW',
            `Verified claims require ${[...required.keys()].join(', ')} reviews`,
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

export async function validatePacket(packetDirectory, options = {}) {
  const packetRoot = resolve(packetDirectory);
  const errors = [];
  const warnings = [];
  const manifest = await readManagedJson(
    packetRoot,
    resolve(packetRoot, 'manifest.json'),
    'INVALID_MANIFEST_JSON',
    errors,
  );
  const ledger = await readManagedJson(
    packetRoot,
    resolve(packetRoot, 'claims.json'),
    'INVALID_LEDGER_JSON',
    errors,
  );

  if (manifest) errors.push(...validateArtifactShape(manifest).errors);
  if (ledger) errors.push(...validateArtifactShape(ledger).errors);

  if (manifest && ledger && manifest.run?.id !== ledger.runId) {
    errors.push(issue('RUN_ID_MISMATCH', 'Manifest and ledger run IDs differ'));
  }

  if (manifest?.execution?.approvalEnvelope) {
    const expected = hashCanonicalJson(manifest.execution.approvalEnvelope);
    if (expected !== manifest.execution.approvalFingerprint) {
      errors.push(
        issue(
          'APPROVAL_FINGERPRINT_MISMATCH',
          'Execution envelope no longer matches its approval fingerprint',
          '$.execution.approvalFingerprint',
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

  const { artifactsByPath, artifactsById } = await validateReferences(
    packetRoot,
    collectReferences(manifest, ledger),
    errors,
  );
  if (manifest && !artifactsByPath.has('claims.json')) {
    errors.push(
      issue(
        'MISSING_CANONICAL_LEDGER_REFERENCE',
        'Manifest must bind claims.json by exact digest',
        '$.artifacts',
      ),
    );
  }

  const exactEvidence = new Set();
  if (manifest && ledger) {
    const sources = new Map(
      manifest.sources.map((source) => [source.id, source]),
    );
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
      if (await reopenEvidence(packetRoot, source, evidence, errors)) {
        exactEvidence.add(evidence.id);
      }
    }
    const achievedProfile = deriveAchievedProfile(
      manifest.stages ?? [],
      artifactsById,
    );
    validateAssurance(
      manifest,
      ledger,
      exactEvidence,
      achievedProfile,
      artifactsById,
      errors,
    );
    validateReconciliation(ledger, artifactsById, artifactsByPath, errors);

    const valid = errors.length === 0;
    if (!valid && options.removePublishedOnFailure !== false) {
      await rm(resolve(packetRoot, 'packet.md'), { force: true });
    }
    return {
      valid,
      publishable:
        valid &&
        (manifest.run.status === 'complete' ||
          manifest.run.status === 'partial'),
      status: manifest.run.status,
      requestedProfile: manifest.run.requestedProfile,
      achievedProfile,
      packetRoot,
      errors,
      warnings,
    };
  }

  if (options.removePublishedOnFailure !== false) {
    await rm(resolve(packetRoot, 'packet.md'), { force: true });
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

async function main(argv) {
  const [packetDirectory] = argv;
  if (!packetDirectory) {
    throw new Error('Usage: validate-packet.mjs <packet-directory>');
  }
  const result = await validatePacket(packetDirectory);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.valid ? 0 : 1;
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
