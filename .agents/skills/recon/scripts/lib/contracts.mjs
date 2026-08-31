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
export const sourceValidationStates = [
  'pinned',
  'unpinned',
  'stale',
  'invalid',
  'unavailable',
];
export const workerModes = [
  'map',
  'gather',
  'compile',
  'verify',
  'adversary',
  'coverage',
  'reconcile',
];
export const stageModes = [
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
];
export const approvalSelectionAxes = [
  'provider',
  'model',
  'effort',
  'reasoningMode',
  'route',
  'role',
  'serviceTier',
];
export const approvalEnvelopeAxes = [
  ...approvalSelectionAxes,
  'authority',
  'deadlineSeconds',
  'retryLimit',
  'concurrency',
  'laneCap',
  'waves',
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

function validateExactReference(reference, path, errors, extra = []) {
  errors.push(...validateArtifactReference(reference, path));
  closedObject(reference, new Set(['path', 'digest', ...extra]), errors, path);
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

function requiredInteger(value, key, errors, path = '$', minimum = 0) {
  if (!Number.isInteger(value?.[key]) || value[key] < minimum) {
    errors.push(
      issue(
        'MISSING_REQUIRED_FIELD',
        `${key} must be an integer greater than or equal to ${minimum}`,
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

function requiredObject(value, key, errors, path = '$') {
  if (!isObject(value?.[key])) {
    errors.push(
      issue(
        'MISSING_REQUIRED_FIELD',
        `${key} must be an object`,
        `${path}.${key}`,
      ),
    );
  }
}

function closedObject(value, allowed, errors, path = '$') {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(
        issue('UNKNOWN_FIELD', `Unexpected field ${key}`, `${path}.${key}`),
      );
    }
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

function validateApprovalEnvelope(value, errors, path) {
  if (!isObject(value)) return;
  closedObject(value, new Set(approvalEnvelopeAxes), errors, path);
  for (const key of [...approvalSelectionAxes, 'authority']) {
    requiredString(value, key, errors, path);
  }
  requiredInteger(value, 'deadlineSeconds', errors, path, 1);
  requiredInteger(value, 'retryLimit', errors, path);
  requiredInteger(value, 'concurrency', errors, path, 1);
  requiredInteger(value, 'laneCap', errors, path, 1);
  requiredArray(value, 'waves', errors, path);
  const waveIds = new Set();
  const laneIds = new Set();
  for (const [waveIndex, wave] of (value.waves ?? []).entries()) {
    const wavePath = `${path}.waves[${waveIndex}]`;
    requiredString(wave, 'id', errors, wavePath);
    requiredString(wave, 'mode', errors, wavePath);
    requiredArray(wave, 'lanes', errors, wavePath);
    if (typeof wave.required !== 'boolean') {
      errors.push(
        issue(
          'MISSING_REQUIRED_FIELD',
          'required must be a boolean',
          `${wavePath}.required`,
        ),
      );
    }
    if (!stageModes.includes(wave.mode)) {
      errors.push(
        issue('INVALID_STAGE_MODE', 'Unknown wave mode', `${wavePath}.mode`),
      );
    }
    if (waveIds.has(wave.id)) {
      errors.push(
        issue('DUPLICATE_ID', `Duplicate wave ${wave.id}`, `${wavePath}.id`),
      );
    }
    waveIds.add(wave.id);
    closedObject(
      wave,
      new Set(['id', 'mode', 'required', 'lanes']),
      errors,
      wavePath,
    );
    for (const [laneIndex, lane] of (wave.lanes ?? []).entries()) {
      const lanePath = `${wavePath}.lanes[${laneIndex}]`;
      requiredString(lane, 'id', errors, lanePath);
      if (typeof lane.required !== 'boolean') {
        errors.push(
          issue(
            'MISSING_REQUIRED_FIELD',
            'required must be a boolean',
            `${lanePath}.required`,
          ),
        );
      }
      if (laneIds.has(lane.id)) {
        errors.push(
          issue('DUPLICATE_ID', `Duplicate lane ${lane.id}`, `${lanePath}.id`),
        );
      }
      laneIds.add(lane.id);
      closedObject(lane, new Set(['id', 'required']), errors, lanePath);
    }
  }
}

function validateManifest(value, errors) {
  closedObject(
    value,
    new Set([
      'kind',
      'schemaVersion',
      'run',
      'request',
      'sources',
      'execution',
      'stages',
      'artifacts',
      'gaps',
    ]),
    errors,
  );
  if (!isObject(value.run)) {
    errors.push(
      issue('MISSING_REQUIRED_FIELD', 'run must be an object', '$.run'),
    );
  } else {
    closedObject(
      value.run,
      new Set([
        'id',
        'topic',
        'status',
        'requestedProfile',
        'achievedProfile',
        'createdAt',
        'updatedAt',
      ]),
      errors,
      '$.run',
    );
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
  requiredObject(value, 'request', errors);
  requiredObject(value, 'execution', errors);
  if (isObject(value.request)) {
    closedObject(
      value.request,
      new Set([
        'objective',
        'questions',
        'includedScope',
        'excludedScope',
        'contextReferences',
        'outputPath',
      ]),
      errors,
      '$.request',
    );
    requiredString(value.request, 'objective', errors, '$.request');
    requiredString(value.request, 'outputPath', errors, '$.request');
    for (const key of [
      'questions',
      'includedScope',
      'excludedScope',
      'contextReferences',
    ]) {
      requiredArray(value.request, key, errors, '$.request');
    }
  }
  if (isObject(value.execution)) {
    closedObject(
      value.execution,
      new Set(['approvalEnvelope', 'approvalFingerprint']),
      errors,
      '$.execution',
    );
    requiredObject(value.execution, 'approvalEnvelope', errors, '$.execution');
    requiredString(
      value.execution,
      'approvalFingerprint',
      errors,
      '$.execution',
    );
    validateApprovalEnvelope(
      value.execution.approvalEnvelope,
      errors,
      '$.execution.approvalEnvelope',
    );
  }
  if (Array.isArray(value.sources))
    duplicateIds(value.sources, '$.sources', errors);
  if (Array.isArray(value.stages))
    duplicateIds(value.stages, '$.stages', errors);
  if (Array.isArray(value.gaps)) duplicateIds(value.gaps, '$.gaps', errors);
  for (const [index, reference] of (value.artifacts ?? []).entries()) {
    validateExactReference(reference, `$.artifacts[${index}]`, errors);
  }
  for (const [index, source] of (value.sources ?? []).entries()) {
    for (const key of [
      'kind',
      'id',
      'authority',
      'observedAt',
      'validationState',
    ]) {
      requiredString(source, key, errors, `$.sources[${index}]`);
    }
    if (typeof source.available !== 'boolean') {
      errors.push(
        issue(
          'MISSING_REQUIRED_FIELD',
          'available must be a boolean',
          `$.sources[${index}].available`,
        ),
      );
    }
    if (!sourceValidationStates.includes(source.validationState)) {
      errors.push(
        issue(
          'INVALID_SOURCE_VALIDATION_STATE',
          'Unknown source validation state',
          `$.sources[${index}].validationState`,
        ),
      );
    }
    if (
      (source.available === false) !==
      (source.validationState === 'unavailable')
    ) {
      errors.push(
        issue(
          'SOURCE_AVAILABILITY_MISMATCH',
          'Unavailable sources must use unavailable validation state and vice versa',
          `$.sources[${index}]`,
        ),
      );
    }
    const common = [
      'kind',
      'id',
      'available',
      'authority',
      'observedAt',
      'validationState',
    ];
    const kindKeys = {
      repository: ['root', 'revision', 'dirty', 'contentHashes'],
      file: ['path', 'contentHash'],
      url: ['url', 'capturePath', 'captureDigest', 'validatorState'],
      'command-output': [
        'argv',
        'cwd',
        'exitStatus',
        'outputPath',
        'outputDigest',
        'environmentNames',
      ],
      'connected-resource': [
        'system',
        'resourceId',
        'resourceVersion',
        'retrievalToken',
        'capturePath',
        'captureDigest',
      ],
    }[source.kind];
    if (!kindKeys) {
      errors.push(
        issue(
          'INVALID_SOURCE_KIND',
          'Unknown source kind',
          `$.sources[${index}].kind`,
        ),
      );
    } else {
      closedObject(
        source,
        new Set([...common, ...kindKeys]),
        errors,
        `$.sources[${index}]`,
      );
      if (source.kind === 'url' && isObject(source.validatorState)) {
        closedObject(
          source.validatorState,
          new Set(['etag', 'lastModified', 'capturePath', 'captureDigest']),
          errors,
          `$.sources[${index}].validatorState`,
        );
        const hasDirectCapture =
          Object.hasOwn(source, 'capturePath') ||
          Object.hasOwn(source, 'captureDigest');
        const hasValidatorCapture =
          Object.hasOwn(source.validatorState, 'capturePath') ||
          Object.hasOwn(source.validatorState, 'captureDigest');
        if (hasDirectCapture && hasValidatorCapture) {
          errors.push(
            issue(
              'DUAL_URL_CAPTURE',
              'URL sources must declare exactly one capture representation',
              `$.sources[${index}]`,
            ),
          );
        }
      }
    }
  }
  for (const [index, gap] of (value.gaps ?? []).entries()) {
    requiredString(gap, 'id', errors, `$.gaps[${index}]`);
    requiredString(gap, 'code', errors, `$.gaps[${index}]`);
    requiredString(gap, 'message', errors, `$.gaps[${index}]`);
    if (typeof gap.material !== 'boolean') {
      errors.push(
        issue(
          'MISSING_REQUIRED_FIELD',
          'material must be a boolean',
          `$.gaps[${index}].material`,
        ),
      );
    }
    closedObject(
      gap,
      new Set([
        'id',
        'code',
        'message',
        'material',
        'sourceIds',
        'claimIds',
        'coverageFindingIds',
      ]),
      errors,
      `$.gaps[${index}]`,
    );
  }
  for (const [index, stage] of (value.stages ?? []).entries()) {
    requiredString(stage, 'id', errors, `$.stages[${index}]`);
    requiredString(stage, 'mode', errors, `$.stages[${index}]`);
    requiredString(stage, 'status', errors, `$.stages[${index}]`);
    requiredArray(stage, 'artifactIds', errors, `$.stages[${index}]`);
    requiredArray(stage, 'dispatchReceiptIds', errors, `$.stages[${index}]`);
    requiredString(stage, 'laneId', errors, `$.stages[${index}]`);
    if (!stageModes.includes(stage.mode)) {
      errors.push(
        issue(
          'INVALID_STAGE_MODE',
          'Unknown stage mode',
          `$.stages[${index}].mode`,
        ),
      );
    }
    if (!['complete', 'failed', 'omitted'].includes(stage.status)) {
      errors.push(
        issue(
          'INVALID_STAGE_STATUS',
          'Unknown stage status',
          `$.stages[${index}].status`,
        ),
      );
    }
    if (
      stage.kind !== 'recon.stage-result' ||
      stage.schemaVersion !== SCHEMA_VERSION
    ) {
      errors.push(
        issue(
          'INVALID_STAGE_RESULT',
          'Expected recon.stage-result version 1',
          `$.stages[${index}]`,
        ),
      );
    }
    closedObject(
      stage,
      new Set([
        'kind',
        'schemaVersion',
        'id',
        'mode',
        'status',
        'artifactIds',
        'dispatchReceiptIds',
        'laneId',
        'message',
      ]),
      errors,
      `$.stages[${index}]`,
    );
  }
}

function validateLedger(value, errors) {
  closedObject(
    value,
    new Set([
      'kind',
      'schemaVersion',
      'runId',
      'revision',
      'inputArtifacts',
      'synthesis',
      'evidence',
      'claims',
      'unresolvedQuestions',
      'transitions',
    ]),
    errors,
  );
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
  requiredArray(value, 'transitions', errors);
  requiredObject(value, 'synthesis', errors);
  if (isObject(value.synthesis)) {
    requiredString(value.synthesis, 'answer', errors, '$.synthesis');
    for (const key of ['keyClaimIds', 'caveats', 'unresolvedQuestionIds']) {
      requiredArray(value.synthesis, key, errors, '$.synthesis');
    }
    closedObject(
      value.synthesis,
      new Set(['answer', 'keyClaimIds', 'caveats', 'unresolvedQuestionIds']),
      errors,
      '$.synthesis',
    );
  }
  for (const key of ['evidence', 'claims', 'unresolvedQuestions']) {
    if (Array.isArray(value[key])) duplicateIds(value[key], `$.${key}`, errors);
  }
  for (const [index, reference] of (value.inputArtifacts ?? []).entries()) {
    validateExactReference(reference, `$.inputArtifacts[${index}]`, errors);
  }
  for (const [index, evidence] of (value.evidence ?? []).entries()) {
    closedObject(
      evidence,
      new Set([
        'id',
        'sourceId',
        'locator',
        'displayExcerpt',
        'observedAt',
        'contentHash',
        'locatorValidation',
        'provenance',
        'redaction',
      ]),
      errors,
      `$.evidence[${index}]`,
    );
    requiredString(evidence, 'id', errors, `$.evidence[${index}]`);
    requiredString(evidence, 'sourceId', errors, `$.evidence[${index}]`);
    requiredString(evidence, 'displayExcerpt', errors, `$.evidence[${index}]`);
    requiredString(evidence, 'observedAt', errors, `$.evidence[${index}]`);
    if (!isObject(evidence.locator)) {
      errors.push(
        issue(
          'INVALID_LOCATOR',
          'locator must be an object',
          `$.evidence[${index}].locator`,
        ),
      );
    } else {
      const locatorKeys = {
        repository: ['kind', 'path', 'revision', 'lineStart', 'lineEnd'],
        file: ['kind', 'path', 'lineStart', 'lineEnd'],
        url: ['kind', 'url', 'retrievedAt', 'fragment', 'validatorToken'],
        'command-output': [
          'kind',
          'artifactPath',
          'lineStart',
          'lineEnd',
          'commandDigest',
        ],
        'connected-resource': [
          'kind',
          'system',
          'resourceId',
          'resourceVersion',
          'retrievalToken',
          'fieldOrSection',
          'retrievedAt',
        ],
      }[evidence.locator.kind];
      if (!locatorKeys) {
        errors.push(
          issue(
            'INVALID_LOCATOR',
            'Unknown locator kind',
            `$.evidence[${index}].locator.kind`,
          ),
        );
      } else {
        closedObject(
          evidence.locator,
          new Set(locatorKeys),
          errors,
          `$.evidence[${index}].locator`,
        );
      }
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
    if (isObject(evidence.locatorValidation)) {
      closedObject(
        evidence.locatorValidation,
        new Set(['status', 'validatedAt']),
        errors,
        `$.evidence[${index}].locatorValidation`,
      );
      requiredString(
        evidence.locatorValidation,
        'validatedAt',
        errors,
        `$.evidence[${index}].locatorValidation`,
      );
    }
    validateExactReference(
      evidence.provenance,
      `$.evidence[${index}].provenance`,
      errors,
    );
  }
  for (const [index, claim] of (value.claims ?? []).entries()) {
    closedObject(
      claim,
      new Set([
        'id',
        'statement',
        'status',
        'evidence',
        'qualifications',
        'reviewIds',
        'derivedFrom',
        'challenges',
      ]),
      errors,
      `$.claims[${index}]`,
    );
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
      'challenges',
    ]) {
      requiredArray(claim, key, errors, `$.claims[${index}]`);
    }
    for (const [referenceIndex, reference] of (
      claim.derivedFrom ?? []
    ).entries()) {
      validateExactReference(
        reference,
        `$.claims[${index}].derivedFrom[${referenceIndex}]`,
        errors,
      );
    }
  }
  for (const [index, transition] of (value.transitions ?? []).entries()) {
    closedObject(
      transition,
      new Set(['claimId', 'from', 'to']),
      errors,
      `$.transitions[${index}]`,
    );
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
  const claimIds = new Set((value.claims ?? []).map((claim) => claim.id));
  const lastTransitionByClaim = new Map();
  for (const transition of value.transitions ?? []) {
    if (!claimIds.has(transition.claimId)) {
      errors.push(
        issue(
          'UNKNOWN_TRANSITION_CLAIM',
          `Transition references unknown claim ${transition.claimId}`,
          '$.transitions',
        ),
      );
    }
    lastTransitionByClaim.set(transition.claimId, transition);
  }
  for (const claim of value.claims ?? []) {
    if (
      value.revision === 1 &&
      lastTransitionByClaim.get(claim.id)?.to !== claim.status
    ) {
      errors.push(
        issue(
          'CLAIM_TRANSITION_MISMATCH',
          `Final transition does not establish ${claim.id} as ${claim.status}`,
          `claim:${claim.id}`,
        ),
      );
    }
  }
}

function validateDossier(value, errors) {
  closedObject(
    value,
    new Set([
      'kind',
      'schemaVersion',
      'id',
      'runId',
      'waveId',
      'laneId',
      'mode',
      'outcome',
      'allowedInputs',
      'excludedInputs',
      'findings',
      'uncertainty',
      'contradictions',
      'gaps',
    ]),
    errors,
  );
  for (const key of ['runId', 'waveId', 'laneId', 'mode', 'outcome']) {
    requiredString(value, key, errors);
  }
  if (!workerModes.includes(value.mode)) {
    errors.push(issue('INVALID_WORKER_MODE', 'Unknown worker mode', '$.mode'));
  }
  if (!['complete', 'partial', 'failed'].includes(value.outcome)) {
    errors.push(
      issue('INVALID_DOSSIER_OUTCOME', 'Unknown dossier outcome', '$.outcome'),
    );
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

function validateReviewBriefArtifact(value, errors) {
  for (const key of ['id', 'runId', 'mode', 'createdAt']) {
    requiredString(value, key, errors);
  }
  requiredArray(value, 'excludedInputs', errors);
  if (value.mode === 'verify') {
    requiredArray(value, 'claims', errors);
    requiredArray(value, 'sources', errors);
    closedObject(
      value,
      new Set([
        'kind',
        'schemaVersion',
        'id',
        'runId',
        'mode',
        'createdAt',
        'excludedInputs',
        'claims',
        'sources',
      ]),
      errors,
    );
    for (const [index, claim] of (value.claims ?? []).entries()) {
      requiredString(claim, 'id', errors, `$.claims[${index}]`);
      requiredString(claim, 'statement', errors, `$.claims[${index}]`);
      requiredArray(claim, 'evidence', errors, `$.claims[${index}]`);
      closedObject(
        claim,
        new Set(['id', 'statement', 'evidence']),
        errors,
        `$.claims[${index}]`,
      );
      for (const [evidenceIndex, evidence] of (
        claim.evidence ?? []
      ).entries()) {
        for (const key of ['id', 'sourceId', 'displayExcerpt']) {
          requiredString(
            evidence,
            key,
            errors,
            `$.claims[${index}].evidence[${evidenceIndex}]`,
          );
        }
        requiredObject(
          evidence,
          'locator',
          errors,
          `$.claims[${index}].evidence[${evidenceIndex}]`,
        );
        closedObject(
          evidence,
          new Set(['id', 'sourceId', 'displayExcerpt', 'locator']),
          errors,
          `$.claims[${index}].evidence[${evidenceIndex}]`,
        );
      }
    }
  } else if (value.mode === 'adversary') {
    requiredObject(value, 'scope', errors);
    requiredArray(value, 'questions', errors);
    requiredArray(value, 'provisionalStatements', errors);
    closedObject(
      value,
      new Set([
        'kind',
        'schemaVersion',
        'id',
        'runId',
        'mode',
        'createdAt',
        'excludedInputs',
        'scope',
        'questions',
        'provisionalStatements',
      ]),
      errors,
    );
    closedObject(
      value.scope,
      new Set(['included', 'excluded']),
      errors,
      '$.scope',
    );
    for (const key of ['included', 'excluded']) {
      requiredArray(value.scope, key, errors, '$.scope');
    }
    for (const [index, statement] of (
      value.provisionalStatements ?? []
    ).entries()) {
      requiredString(
        statement,
        'id',
        errors,
        `$.provisionalStatements[${index}]`,
      );
      requiredString(
        statement,
        'statement',
        errors,
        `$.provisionalStatements[${index}]`,
      );
      closedObject(
        statement,
        new Set(['id', 'statement']),
        errors,
        `$.provisionalStatements[${index}]`,
      );
    }
  } else if (value.mode === 'coverage') {
    requiredObject(value, 'scope', errors);
    requiredArray(value, 'questions', errors);
    requiredArray(value, 'claims', errors);
    closedObject(
      value,
      new Set([
        'kind',
        'schemaVersion',
        'id',
        'runId',
        'mode',
        'createdAt',
        'excludedInputs',
        'scope',
        'questions',
        'claims',
      ]),
      errors,
    );
    closedObject(
      value.scope,
      new Set(['included', 'excluded']),
      errors,
      '$.scope',
    );
    for (const key of ['included', 'excluded']) {
      requiredArray(value.scope, key, errors, '$.scope');
    }
    for (const [index, claim] of (value.claims ?? []).entries()) {
      requiredString(claim, 'id', errors, `$.claims[${index}]`);
      requiredString(claim, 'statement', errors, `$.claims[${index}]`);
      closedObject(
        claim,
        new Set(['id', 'statement']),
        errors,
        `$.claims[${index}]`,
      );
    }
  } else {
    errors.push(
      issue('INVALID_REVIEW_MODE', 'Unknown review brief mode', '$.mode'),
    );
  }
}

function validateReviewResult(value, errors) {
  for (const key of ['id', 'runId', 'reviewKind', 'reviewerLane', 'status']) {
    requiredString(value, key, errors);
  }
  for (const key of [
    'permittedInputs',
    'excludedInputs',
    'dispositions',
    'newEvidence',
    'coverageFindings',
    'unresolvedIssues',
  ]) {
    requiredArray(value, key, errors);
  }
  if (
    ![
      'semantic',
      'adversarial',
      'coverage',
      'redundant-verification',
      'contradiction-resolution',
      'reconciliation',
    ].includes(value.reviewKind)
  ) {
    errors.push(
      issue(
        'INVALID_REVIEW_KIND',
        'Unknown review result kind',
        '$.reviewKind',
      ),
    );
  }
  if (!['complete', 'failed'].includes(value.status)) {
    errors.push(
      issue('INVALID_REVIEW_STATUS', 'Unknown review status', '$.status'),
    );
  }
  if (value.reviewKind === 'reconciliation') {
    requiredObject(value, 'inputLedger', errors);
    if (isObject(value.inputLedger)) {
      validateExactReference(value.inputLedger, '$.inputLedger', errors, [
        'revision',
      ]);
      if (!Number.isInteger(value.inputLedger.revision)) {
        errors.push(
          issue(
            'INVALID_REVISION',
            'input ledger revision must be an integer',
            '$.inputLedger.revision',
          ),
        );
      }
    }
    if (!Number.isInteger(value.outputRevision)) {
      errors.push(
        issue(
          'INVALID_REVISION',
          'outputRevision must be an integer',
          '$.outputRevision',
        ),
      );
    }
    requiredArray(value, 'incorporatedReviewIds', errors);
    requiredArray(value, 'transitions', errors);
    requiredArray(value, 'additions', errors);
    requiredArray(value, 'removals', errors);
    requiredArray(value, 'removalDispositions', errors);
    requiredArray(value, 'coverageDispositions', errors);
    for (const key of ['additions', 'removals']) {
      const seen = new Set();
      for (const [index, id] of (value[key] ?? []).entries()) {
        if (typeof id !== 'string' || id.length === 0 || seen.has(id)) {
          errors.push(
            issue(
              'INVALID_RECONCILIATION_MEMBERSHIP',
              `${key} must contain unique non-empty claim IDs`,
              `$.${key}[${index}]`,
            ),
          );
        }
        seen.add(id);
      }
    }
    for (const [index, disposition] of (
      value.removalDispositions ?? []
    ).entries()) {
      for (const key of ['claimId', 'reviewId', 'disposition']) {
        requiredString(
          disposition,
          key,
          errors,
          `$.removalDispositions[${index}]`,
        );
      }
      if (disposition.disposition !== 'rejected') {
        errors.push(
          issue(
            'INVALID_REMOVAL_DISPOSITION',
            'Claim removal must be authorized by a rejected review disposition',
            `$.removalDispositions[${index}].disposition`,
          ),
        );
      }
      closedObject(
        disposition,
        new Set(['claimId', 'reviewId', 'disposition']),
        errors,
        `$.removalDispositions[${index}]`,
      );
    }
    for (const [index, transition] of (value.transitions ?? []).entries()) {
      closedObject(
        transition,
        new Set(['claimId', 'from', 'to']),
        errors,
        `$.transitions[${index}]`,
      );
      requiredString(transition, 'claimId', errors, `$.transitions[${index}]`);
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
    for (const [index, disposition] of (
      value.coverageDispositions ?? []
    ).entries()) {
      for (const key of ['findingId', 'gapId', 'disposition']) {
        requiredString(
          disposition,
          key,
          errors,
          `$.coverageDispositions[${index}]`,
        );
      }
      if (!['accepted-gap', 'resolved'].includes(disposition.disposition)) {
        errors.push(
          issue(
            'INVALID_COVERAGE_DISPOSITION',
            'Coverage dispositions must be accepted-gap or resolved',
            `$.coverageDispositions[${index}].disposition`,
          ),
        );
      }
      if (
        disposition.disposition === 'resolved' &&
        (!Array.isArray(disposition.evidenceIds) ||
          disposition.evidenceIds.length === 0)
      ) {
        errors.push(
          issue(
            'INVALID_COVERAGE_DISPOSITION',
            'Resolved coverage dispositions require typed evidence IDs',
            `$.coverageDispositions[${index}].evidenceIds`,
          ),
        );
      }
      closedObject(
        disposition,
        new Set(['findingId', 'gapId', 'disposition', 'evidenceIds']),
        errors,
        `$.coverageDispositions[${index}]`,
      );
    }
  } else {
    validateExactReference(value.brief, '$.brief', errors);
  }
  for (const [index, reference] of (value.permittedInputs ?? []).entries()) {
    validateExactReference(reference, `$.permittedInputs[${index}]`, errors);
  }
  for (const [index, disposition] of (value.dispositions ?? []).entries()) {
    requiredString(disposition, 'claimId', errors, `$.dispositions[${index}]`);
    requiredString(
      disposition,
      'disposition',
      errors,
      `$.dispositions[${index}]`,
    );
    closedObject(
      disposition,
      new Set(['claimId', 'disposition']),
      errors,
      `$.dispositions[${index}]`,
    );
    const allowed = {
      semantic: ['affirmed', 'rejected', 'uncertain'],
      adversarial: ['unchallenged', 'challenged'],
      coverage: ['covered', 'gap'],
      'redundant-verification': ['affirmed', 'rejected', 'uncertain'],
      'contradiction-resolution': ['resolved', 'unresolved', 'rejected'],
      reconciliation: [],
    }[value.reviewKind];
    if (allowed && !allowed.includes(disposition.disposition)) {
      errors.push(
        issue(
          'INVALID_REVIEW_DISPOSITION',
          'Disposition does not belong to this review kind',
          `$.dispositions[${index}].disposition`,
        ),
      );
    }
  }
  if (value.reviewKind === 'contradiction-resolution') {
    requiredArray(value, 'contradictionDispositions', errors);
    for (const [index, disposition] of (
      value.contradictionDispositions ?? []
    ).entries()) {
      requiredString(
        disposition,
        'contradictionId',
        errors,
        `$.contradictionDispositions[${index}]`,
      );
      requiredArray(
        disposition,
        'claimIds',
        errors,
        `$.contradictionDispositions[${index}]`,
      );
      requiredString(
        disposition,
        'disposition',
        errors,
        `$.contradictionDispositions[${index}]`,
      );
      if (!['resolved', 'unresolved'].includes(disposition.disposition)) {
        errors.push(
          issue(
            'INVALID_CONTRADICTION_DISPOSITION',
            'Contradiction disposition must be resolved or unresolved',
            `$.contradictionDispositions[${index}].disposition`,
          ),
        );
      }
      closedObject(
        disposition,
        new Set(['contradictionId', 'claimIds', 'disposition']),
        errors,
        `$.contradictionDispositions[${index}]`,
      );
    }
  }
  if (
    ['redundant-verification', 'contradiction-resolution'].includes(
      value.reviewKind,
    ) &&
    ((value.dispositions ?? []).length === 0 ||
      (value.permittedInputs ?? []).length === 0 ||
      (value.reviewKind === 'contradiction-resolution' &&
        (value.contradictionDispositions ?? []).length === 0))
  ) {
    errors.push(
      issue(
        'EMPTY_ASSURANCE_RESULT',
        'Thorough assurance results must bind immutable inputs, claims, and affected contradictions',
        '$',
      ),
    );
  }
  for (const [index, finding] of (value.coverageFindings ?? []).entries()) {
    for (const key of ['id', 'gapId', 'code', 'message']) {
      requiredString(finding, key, errors, `$.coverageFindings[${index}]`);
    }
    requiredArray(finding, 'claimIds', errors, `$.coverageFindings[${index}]`);
    if (typeof finding.material !== 'boolean') {
      errors.push(
        issue(
          'MISSING_REQUIRED_FIELD',
          'material must be a boolean',
          `$.coverageFindings[${index}].material`,
        ),
      );
    }
    closedObject(
      finding,
      new Set(['id', 'gapId', 'code', 'message', 'material', 'claimIds']),
      errors,
      `$.coverageFindings[${index}]`,
    );
  }
  if (
    value.reviewKind !== 'coverage' &&
    value.reviewKind !== 'reconciliation' &&
    (value.coverageFindings ?? []).length > 0
  ) {
    errors.push(
      issue(
        'INVALID_COVERAGE_FINDING_OWNER',
        'Only coverage results may report coverage findings',
        '$.coverageFindings',
      ),
    );
  }
  for (const [index, evidence] of (value.newEvidence ?? []).entries()) {
    closedObject(
      evidence,
      new Set([
        'id',
        'sourceId',
        'locator',
        'displayExcerpt',
        'observedAt',
        'contentHash',
        'locatorValidation',
        'provenance',
        'redaction',
      ]),
      errors,
      `$.newEvidence[${index}]`,
    );
    for (const key of ['id', 'sourceId', 'displayExcerpt', 'observedAt']) {
      requiredString(evidence, key, errors, `$.newEvidence[${index}]`);
    }
    requiredObject(evidence, 'locator', errors, `$.newEvidence[${index}]`);
    requiredObject(
      evidence,
      'locatorValidation',
      errors,
      `$.newEvidence[${index}]`,
    );
    validateExactReference(
      evidence.provenance,
      `$.newEvidence[${index}].provenance`,
      errors,
    );
  }
  const common = [
    'kind',
    'schemaVersion',
    'id',
    'runId',
    'reviewKind',
    'reviewerLane',
    'status',
    'permittedInputs',
    'excludedInputs',
    'dispositions',
    'newEvidence',
    'coverageFindings',
    'unresolvedIssues',
  ];
  closedObject(
    value,
    new Set(
      value.reviewKind === 'reconciliation'
        ? [
            ...common,
            'inputLedger',
            'outputRevision',
            'incorporatedReviewIds',
            'transitions',
            'additions',
            'removals',
            'removalDispositions',
            'coverageDispositions',
          ]
        : value.reviewKind === 'contradiction-resolution'
          ? [...common, 'brief', 'contradictionDispositions']
          : [...common, 'brief'],
    ),
    errors,
  );
}

function validateDispatchReceipt(value, errors) {
  for (const key of ['id', 'runId', 'stageId', 'laneId', 'state']) {
    requiredString(value, key, errors);
  }
  requiredObject(value, 'selection', errors);
  requiredObject(value, 'approvalEnvelope', errors);
  requiredString(value, 'fingerprint', errors);
  const selectionKeys = new Set(approvalSelectionAxes);
  const envelopeKeys = new Set(approvalEnvelopeAxes);
  closedObject(value.selection, selectionKeys, errors, '$.selection');
  for (const key of approvalSelectionAxes) {
    requiredString(value.selection, key, errors, '$.selection');
  }
  closedObject(
    value.approvalEnvelope,
    envelopeKeys,
    errors,
    '$.approvalEnvelope',
  );
  if (
    !['prepared', 'approved', 'accepted', 'completed', 'failed'].includes(
      value.state,
    )
  ) {
    errors.push(
      issue('INVALID_DISPATCH_STATE', 'Unknown dispatch state', '$.state'),
    );
  }
  if (['accepted', 'completed', 'failed'].includes(value.state))
    requiredObject(value, 'acceptedEnvelope', errors);
  if (isObject(value.acceptedEnvelope)) {
    closedObject(
      value.acceptedEnvelope,
      envelopeKeys,
      errors,
      '$.acceptedEnvelope',
    );
  }
  validateApprovalEnvelope(
    value.approvalEnvelope,
    errors,
    '$.approvalEnvelope',
  );
  if (isObject(value.acceptedEnvelope)) {
    validateApprovalEnvelope(
      value.acceptedEnvelope,
      errors,
      '$.acceptedEnvelope',
    );
  }
  if (value.state === 'completed') requiredArray(value, 'artifactIds', errors);
  closedObject(
    value,
    new Set([
      'kind',
      'schemaVersion',
      'id',
      'runId',
      'stageId',
      'laneId',
      'state',
      'selection',
      'approvalEnvelope',
      'fingerprint',
      'acceptedEnvelope',
      'artifactIds',
    ]),
    errors,
  );
}

function validateStageResult(value, errors) {
  for (const key of ['id', 'mode', 'laneId', 'status'])
    requiredString(value, key, errors);
  requiredArray(value, 'artifactIds', errors);
  requiredArray(value, 'dispatchReceiptIds', errors);
  if (!stageModes.includes(value.mode)) {
    errors.push(issue('INVALID_STAGE_MODE', 'Unknown stage mode', '$.mode'));
  }
  if (!['complete', 'failed', 'omitted'].includes(value.status)) {
    errors.push(
      issue('INVALID_STAGE_STATUS', 'Unknown stage status', '$.status'),
    );
  }
  closedObject(
    value,
    new Set([
      'kind',
      'schemaVersion',
      'id',
      'mode',
      'laneId',
      'status',
      'artifactIds',
      'dispatchReceiptIds',
      'message',
    ]),
    errors,
  );
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
  if (value.kind === 'recon.review-brief')
    validateReviewBriefArtifact(value, errors);
  if (value.kind === 'recon.review-result') validateReviewResult(value, errors);
  if (value.kind === 'recon.dispatch-receipt')
    validateDispatchReceipt(value, errors);
  if (value.kind === 'recon.stage-result') validateStageResult(value, errors);
  return { valid: errors.length === 0, errors };
}
