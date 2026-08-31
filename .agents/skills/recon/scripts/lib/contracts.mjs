export const SCHEMA_VERSION = 1;

export const artifactKinds = new Set([
  'recon.packet-manifest',
  'recon.claim-ledger',
  'recon.raw-dossier',
  'recon.review-brief',
  'recon.review-result',
  'recon.stage-result',
  'recon.dispatch-receipt',
]);

export const profiles = ['quick', 'standard', 'thorough'];
export const claimStates = [
  'provisional',
  'supported',
  'verified',
  'contested',
  'unresolved',
  'unsupported',
];
export const locatorStates = ['exact', 'redacted-exact', 'stale', 'invalid'];
export const workerModes = [
  'map',
  'gather',
  'compile',
  'verify',
  'adversary',
  'coverage',
  'reconcile',
];

const legalTransitions = new Set([
  'provisional:supported',
  'provisional:verified',
  'provisional:contested',
  'provisional:unresolved',
  'provisional:unsupported',
  'supported:verified',
  'supported:contested',
  'supported:unresolved',
  'supported:unsupported',
  'verified:contested',
  'verified:unresolved',
  'verified:unsupported',
  'contested:supported',
  'contested:verified',
  'contested:unresolved',
  'contested:unsupported',
  'unresolved:supported',
  'unresolved:contested',
  'unresolved:unsupported',
  'unsupported:provisional',
]);

export function issue(code, message, path = '$', severity = 'error') {
  return { code, message, path, severity };
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isDigest(value) {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
}

export function validateArtifactReference(reference, path = '$') {
  const errors = [];
  if (!isObject(reference)) {
    return [issue('INVALID_ARTIFACT_REFERENCE', 'Expected an object', path)];
  }
  if (typeof reference.path !== 'string' || reference.path.length === 0) {
    errors.push(
      issue(
        'INVALID_ARTIFACT_REFERENCE',
        'Artifact path must be a non-empty string',
        `${path}.path`,
      ),
    );
  }
  if (!isDigest(reference.digest)) {
    errors.push(
      issue(
        'INVALID_ARTIFACT_REFERENCE',
        'Artifact digest must be sha256:<64 lowercase hex characters>',
        `${path}.digest`,
      ),
    );
  }
  return errors;
}

function requiredString(value, key, errors, path = '$') {
  if (typeof value?.[key] !== 'string' || value[key].length === 0) {
    errors.push(
      issue(
        'MISSING_REQUIRED_FIELD',
        `${key} must be a non-empty string`,
        `${path}.${key}`,
      ),
    );
  }
}

function requiredArray(value, key, errors, path = '$') {
  if (!Array.isArray(value?.[key])) {
    errors.push(
      issue(
        'MISSING_REQUIRED_FIELD',
        `${key} must be an array`,
        `${path}.${key}`,
      ),
    );
  }
}

function duplicateIds(values, path, errors) {
  const seen = new Set();
  for (const [index, value] of values.entries()) {
    if (!isObject(value) || typeof value.id !== 'string') continue;
    if (seen.has(value.id)) {
      errors.push(
        issue(
          'DUPLICATE_ID',
          `Duplicate identifier ${value.id}`,
          `${path}[${index}].id`,
        ),
      );
    }
    seen.add(value.id);
  }
}

function validateManifest(value, errors) {
  if (!isObject(value.run)) {
    errors.push(
      issue('MISSING_REQUIRED_FIELD', 'run must be an object', '$.run'),
    );
  } else {
    requiredString(value.run, 'id', errors, '$.run');
    requiredString(value.run, 'topic', errors, '$.run');
    if (
      ![
        'preparing',
        'awaiting-approval',
        'running',
        'complete',
        'partial',
        'failed',
      ].includes(value.run.status)
    ) {
      errors.push(
        issue('INVALID_RUN_STATUS', 'Unknown run status', '$.run.status'),
      );
    }
    if (!profiles.includes(value.run.requestedProfile)) {
      errors.push(
        issue(
          'INVALID_PROFILE',
          'Unknown requested profile',
          '$.run.requestedProfile',
        ),
      );
    }
    if (
      value.run.achievedProfile !== null &&
      !profiles.includes(value.run.achievedProfile)
    ) {
      errors.push(
        issue(
          'INVALID_PROFILE',
          'Unknown achieved profile',
          '$.run.achievedProfile',
        ),
      );
    }
  }
  requiredArray(value, 'sources', errors);
  requiredArray(value, 'stages', errors);
  requiredArray(value, 'artifacts', errors);
  requiredArray(value, 'gaps', errors);
  if (Array.isArray(value.sources))
    duplicateIds(value.sources, '$.sources', errors);
  if (Array.isArray(value.stages))
    duplicateIds(value.stages, '$.stages', errors);
  if (Array.isArray(value.gaps)) duplicateIds(value.gaps, '$.gaps', errors);
  for (const [index, reference] of (value.artifacts ?? []).entries()) {
    errors.push(
      ...validateArtifactReference(reference, `$.artifacts[${index}]`),
    );
  }
}

function validateLedger(value, errors) {
  requiredString(value, 'runId', errors);
  if (!Number.isInteger(value.revision) || value.revision < 1) {
    errors.push(
      issue(
        'INVALID_REVISION',
        'revision must be a positive integer',
        '$.revision',
      ),
    );
  }
  for (const key of [
    'inputArtifacts',
    'evidence',
    'claims',
    'unresolvedQuestions',
  ]) {
    requiredArray(value, key, errors);
  }
  for (const key of ['evidence', 'claims', 'unresolvedQuestions']) {
    if (Array.isArray(value[key])) duplicateIds(value[key], `$.${key}`, errors);
  }
  for (const [index, reference] of (value.inputArtifacts ?? []).entries()) {
    errors.push(
      ...validateArtifactReference(reference, `$.inputArtifacts[${index}]`),
    );
  }
  for (const [index, evidence] of (value.evidence ?? []).entries()) {
    requiredString(evidence, 'id', errors, `$.evidence[${index}]`);
    requiredString(evidence, 'sourceId', errors, `$.evidence[${index}]`);
    requiredString(evidence, 'displayExcerpt', errors, `$.evidence[${index}]`);
    if (!isObject(evidence.locator)) {
      errors.push(
        issue(
          'INVALID_LOCATOR',
          'locator must be an object',
          `$.evidence[${index}].locator`,
        ),
      );
    }
    if (!locatorStates.includes(evidence.locatorValidation?.status)) {
      errors.push(
        issue(
          'INVALID_LOCATOR_STATE',
          'Unknown locator validation state',
          `$.evidence[${index}].locatorValidation.status`,
        ),
      );
    }
    errors.push(
      ...validateArtifactReference(
        evidence.provenance,
        `$.evidence[${index}].provenance`,
      ),
    );
  }
  for (const [index, claim] of (value.claims ?? []).entries()) {
    requiredString(claim, 'id', errors, `$.claims[${index}]`);
    requiredString(claim, 'statement', errors, `$.claims[${index}]`);
    if (!claimStates.includes(claim.status)) {
      errors.push(
        issue(
          'INVALID_CLAIM_STATE',
          'Unknown claim state',
          `$.claims[${index}].status`,
        ),
      );
    }
    for (const key of [
      'evidence',
      'qualifications',
      'reviewIds',
      'derivedFrom',
    ]) {
      requiredArray(claim, key, errors, `$.claims[${index}]`);
    }
    for (const [referenceIndex, reference] of (
      claim.derivedFrom ?? []
    ).entries()) {
      errors.push(
        ...validateArtifactReference(
          reference,
          `$.claims[${index}].derivedFrom[${referenceIndex}]`,
        ),
      );
    }
  }
  for (const [index, transition] of (value.transitions ?? []).entries()) {
    if (!legalTransitions.has(`${transition.from}:${transition.to}`)) {
      errors.push(
        issue(
          'ILLEGAL_CLAIM_TRANSITION',
          `Illegal claim transition ${transition.from} -> ${transition.to}`,
          `$.transitions[${index}]`,
        ),
      );
    }
  }
}

function validateDossier(value, errors) {
  for (const key of ['runId', 'waveId', 'laneId', 'mode', 'outcome']) {
    requiredString(value, key, errors);
  }
  if (!workerModes.includes(value.mode)) {
    errors.push(issue('INVALID_WORKER_MODE', 'Unknown worker mode', '$.mode'));
  }
  for (const key of [
    'allowedInputs',
    'excludedInputs',
    'findings',
    'uncertainty',
    'contradictions',
    'gaps',
  ]) {
    requiredArray(value, key, errors);
  }
}

export function validateArtifactShape(value) {
  const errors = [];
  if (!isObject(value)) {
    return {
      valid: false,
      errors: [issue('INVALID_ARTIFACT', 'Expected a JSON object')],
    };
  }
  if (!artifactKinds.has(value.kind)) {
    errors.push(
      issue(
        'UNKNOWN_ARTIFACT_KIND',
        `Unknown artifact kind ${value.kind}`,
        '$.kind',
      ),
    );
  }
  if (value.schemaVersion !== SCHEMA_VERSION) {
    errors.push(
      issue(
        'UNSUPPORTED_SCHEMA_VERSION',
        `Expected schemaVersion ${SCHEMA_VERSION}`,
        '$.schemaVersion',
      ),
    );
  }
  if (value.kind === 'recon.packet-manifest') validateManifest(value, errors);
  if (value.kind === 'recon.claim-ledger') validateLedger(value, errors);
  if (value.kind === 'recon.raw-dossier') validateDossier(value, errors);
  return { valid: errors.length === 0, errors };
}
