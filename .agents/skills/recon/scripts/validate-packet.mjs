#!/usr/bin/env node

import { readFile, rm } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashCanonicalJson, hashFile } from './lib/canonical-json.mjs';
import {
  isDigest,
  isObject,
  issue,
  profiles,
  validateArtifactShape,
} from './lib/contracts.mjs';

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

function containsPath(root, candidate) {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === '' ||
    (!fromRoot.startsWith(`..${sep}`) &&
      fromRoot !== '..' &&
      !isAbsolute(fromRoot))
  );
}

function packetPath(packetRoot, path) {
  if (typeof path !== 'string' || path.length === 0) return null;
  const candidate = resolve(packetRoot, path);
  return containsPath(packetRoot, candidate) ? candidate : null;
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
    } catch {
      errors.push(
        issue(
          'MISSING_ARTIFACT',
          `Missing artifact ${reference.path}`,
          reference.path,
        ),
      );
    }
  }
}

function lineExcerpt(content, start, end) {
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
    return (
      typeof source.url === 'string' &&
      ((typeof source.capturePath === 'string' &&
        isDigest(source.captureDigest)) ||
        isObject(source.validatorState))
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

  let content;
  let expectedDigest;
  let path;
  try {
    if (source.kind === 'repository') {
      path = resolve(source.root, locator.path);
      if (!containsPath(resolve(source.root), path)) {
        errors.push(
          issue(
            'PATH_ESCAPE',
            'Repository locator escapes source root',
            evidence.id,
          ),
        );
        return false;
      }
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
      path = resolve(source.path);
      expectedDigest = source.contentHash;
      content = await readFile(path, 'utf8');
    } else if (source.kind === 'url') {
      if (locator.url !== source.url) {
        errors.push(
          issue('SOURCE_VERSION_MISMATCH', 'URL identity changed', evidence.id),
        );
        return false;
      }
      path = packetPath(packetRoot, source.capturePath);
      expectedDigest = source.captureDigest;
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
        locator.resourceVersion &&
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
      path = packetPath(packetRoot, source.capturePath);
      expectedDigest = source.captureDigest;
      content = await readFile(path, 'utf8');
    }
  } catch {
    errors.push(
      issue(
        'SOURCE_UNAVAILABLE',
        'Pinned source could not be reopened',
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

function deriveAchievedProfile(stages) {
  const complete = new Set(
    stages
      .filter((stage) => stage.status === 'complete')
      .map((stage) => stage.mode),
  );
  let achieved = null;
  for (const profile of profiles) {
    if (requiredStages[profile].every((mode) => complete.has(mode)))
      achieved = profile;
  }
  return achieved;
}

function validateAssurance(
  manifest,
  ledger,
  exactEvidence,
  achievedProfile,
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
      if (!Array.isArray(claim.reviewIds) || claim.reviewIds.length < 3) {
        errors.push(
          issue(
            'MISSING_INDEPENDENT_REVIEW',
            'Verified claims require independent reviews',
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
  const requestedIndex = profiles.indexOf(manifest.run.requestedProfile);
  const achievedIndex = profiles.indexOf(achievedProfile);
  if (manifest.run.status === 'partial' && achievedIndex >= requestedIndex) {
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
  const manifest = await readJson(
    resolve(packetRoot, 'manifest.json'),
    'INVALID_MANIFEST_JSON',
    errors,
  );
  const ledger = await readJson(
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

  await validateReferences(
    packetRoot,
    collectReferences(manifest, ledger),
    errors,
  );

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
    const achievedProfile = deriveAchievedProfile(manifest.stages ?? []);
    validateAssurance(manifest, ledger, exactEvidence, achievedProfile, errors);

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
