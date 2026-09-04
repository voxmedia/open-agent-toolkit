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
export const taskClasses = [
  'mechanical-recon',
  'intelligent-recon',
  'default-implementation',
  'hard-reasoning',
  'consequential',
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
  'unresolved:verified',
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

function requiredTimestamp(value, key, errors, path = '$') {
  requiredString(value, key, errors, path);
  if (
    typeof value?.[key] === 'string' &&
    !Number.isFinite(Date.parse(value[key]))
  ) {
    errors.push(
      issue(
        'INVALID_TIMESTAMP',
        `${key} must be a parseable timestamp`,
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

function requiredCanonicalStringSet(value, key, errors, path = '$') {
  requiredArray(value, key, errors, path);
  if (!Array.isArray(value?.[key])) return;
  const entries = value[key];
  for (const [index, entry] of entries.entries()) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      errors.push(
        issue(
          'INVALID_ARRAY_ENTRY',
          `${key} entries must be non-empty strings`,
          `${path}.${key}[${index}]`,
        ),
      );
    }
  }
  if (new Set(entries).size !== entries.length) {
    errors.push(
      issue(
        'DUPLICATE_ARRAY_ENTRY',
        `${key} entries must be unique`,
        `${path}.${key}`,
      ),
    );
  }
  const sorted = entries.every((entry) => typeof entry === 'string')
    ? [...entries].sort()
    : null;
  if (sorted && entries.some((entry, index) => entry !== sorted[index])) {
    errors.push(
      issue(
        'NON_CANONICAL_ARRAY_ORDER',
        `${key} entries must use stable sorted order`,
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

const projectionKeys = new Set([
  'schema',
  'prepared_record_version',
  'run_id',
  'prepared_at',
  'request',
  'selection',
  'execution',
  'catalog_observation',
]);
const requestKeys = new Set([
  'request_id',
  'caller',
  'objective',
  'action',
  'expected_output',
  'verification_evidence',
  'escalate_when',
]);
const selectionKeys = new Set([
  'provider',
  'dispatch_context',
  'dispatch_policy',
  'dispatch_ceiling',
  'selected_route',
  'selection_source',
  'candidates_considered',
  'selection_reason',
  'role_name',
  'role_class',
  'role_selector',
  'model_selector',
  'model_selector_granularity',
  'effort_selector',
  'reasoning_mode_selector',
  'service_tier_selector',
  'guidance_reference',
  'guidance_version',
  'guidance_verified_at',
  'guidance_status',
]);
const pinnedTargetKeys = new Set([
  'provider',
  'dispatch_context',
  'selected_route',
  'role_selector',
  'model_selector',
  'model_selector_granularity',
  'effort_selector',
  'reasoning_mode_selector',
  'service_tier_selector',
]);
const waveKeys = new Set([
  'wave_id',
  'conditional',
  'task_class',
  'model_class_floor',
  'scope',
  'lanes',
  'authority',
  'authorization_scope',
  'writable_roots',
  'deadline_seconds',
  'retry_limit',
  'fallback',
  'dispatch_mode',
  'context_fork_controls',
  'concurrency',
  'lane_cap',
  'payload_digest',
]);
const catalogKeys = new Set([
  'id',
  'source',
  'dispatch_context',
  'observed_at',
  'relevant_catalog_fingerprint',
]);

export function validateApprovalProjection(value, errors, path) {
  if (!isObject(value)) return;
  closedObject(value, projectionKeys, errors, path);
  if (value.schema !== 'oat-dispatch-approval/v1') {
    errors.push(
      issue(
        'INVALID_APPROVAL_SCHEMA',
        'Approval projection must use oat-dispatch-approval/v1',
        `${path}.schema`,
      ),
    );
  }
  if (value.prepared_record_version !== 1) {
    errors.push(
      issue(
        'INVALID_PREPARED_RECORD_VERSION',
        'Prepared record version must be 1',
        `${path}.prepared_record_version`,
      ),
    );
  }
  requiredString(value, 'run_id', errors, path);
  requiredString(value, 'prepared_at', errors, path);
  requiredObject(value, 'request', errors, path);
  requiredObject(value, 'selection', errors, path);
  requiredObject(value, 'execution', errors, path);
  requiredObject(value, 'catalog_observation', errors, path);

  closedObject(value.request, requestKeys, errors, `${path}.request`);
  for (const key of [
    'request_id',
    'caller',
    'objective',
    'action',
    'expected_output',
    'verification_evidence',
  ]) {
    requiredString(value.request, key, errors, `${path}.request`);
  }
  requiredCanonicalStringSet(
    value.request,
    'escalate_when',
    errors,
    `${path}.request`,
  );

  closedObject(value.selection, selectionKeys, errors, `${path}.selection`);
  for (const key of [...selectionKeys].filter(
    (item) => item !== 'candidates_considered',
  )) {
    if (
      key === 'reasoning_mode_selector' &&
      value.selection?.reasoning_mode_selector === null
    ) {
      continue;
    }
    requiredString(value.selection, key, errors, `${path}.selection`);
  }
  requiredCanonicalStringSet(
    value.selection,
    'candidates_considered',
    errors,
    `${path}.selection`,
  );

  closedObject(
    value.execution,
    new Set(['waves', 'run_maximum_floor', 'pinned_target']),
    errors,
    `${path}.execution`,
  );
  requiredArray(value.execution, 'waves', errors, `${path}.execution`);
  requiredString(
    value.execution,
    'run_maximum_floor',
    errors,
    `${path}.execution`,
  );
  requiredObject(value.execution, 'pinned_target', errors, `${path}.execution`);
  const waveIds = new Set();
  const laneIds = new Set();
  for (const [waveIndex, wave] of (value.execution?.waves ?? []).entries()) {
    const wavePath = `${path}.execution.waves[${waveIndex}]`;
    closedObject(wave, waveKeys, errors, wavePath);
    for (const key of [
      'wave_id',
      'task_class',
      'model_class_floor',
      'scope',
      'authority',
      'authorization_scope',
      'dispatch_mode',
    ]) {
      requiredString(wave, key, errors, wavePath);
    }
    requiredArray(wave, 'lanes', errors, wavePath);
    requiredCanonicalStringSet(wave, 'writable_roots', errors, wavePath);
    requiredObject(wave, 'fallback', errors, wavePath);
    requiredObject(wave, 'context_fork_controls', errors, wavePath);
    requiredInteger(wave, 'deadline_seconds', errors, wavePath, 1);
    requiredInteger(wave, 'retry_limit', errors, wavePath);
    requiredInteger(wave, 'concurrency', errors, wavePath, 1);
    requiredInteger(wave, 'lane_cap', errors, wavePath, 1);
    if (typeof wave.conditional !== 'boolean') {
      errors.push(
        issue(
          'MISSING_REQUIRED_FIELD',
          'conditional must be a boolean',
          `${wavePath}.conditional`,
        ),
      );
    }
    if (!taskClasses.includes(wave.task_class)) {
      errors.push(
        issue(
          'INVALID_TASK_CLASS',
          'Unknown wave task class',
          `${wavePath}.task_class`,
        ),
      );
    }
    if (wave.model_class_floor !== wave.task_class) {
      errors.push(
        issue(
          'MODEL_CLASS_FLOOR_MISMATCH',
          'Wave model class floor must equal its task class',
          `${wavePath}.model_class_floor`,
        ),
      );
    }
    if (!isDigest(wave.payload_digest)) {
      errors.push(
        issue(
          'INVALID_PAYLOAD_DIGEST',
          'Wave payload digest must be sha256',
          `${wavePath}.payload_digest`,
        ),
      );
    }
    if (waveIds.has(wave.wave_id)) {
      errors.push(
        issue(
          'DUPLICATE_ID',
          `Duplicate wave ${wave.wave_id}`,
          `${wavePath}.wave_id`,
        ),
      );
    }
    waveIds.add(wave.wave_id);
    closedObject(
      wave.fallback,
      new Set(['mode']),
      errors,
      `${wavePath}.fallback`,
    );
    requiredString(wave.fallback, 'mode', errors, `${wavePath}.fallback`);
    closedObject(
      wave.context_fork_controls,
      new Set(['fork_turns']),
      errors,
      `${wavePath}.context_fork_controls`,
    );
    requiredString(
      wave.context_fork_controls,
      'fork_turns',
      errors,
      `${wavePath}.context_fork_controls`,
    );
    for (const [laneIndex, lane] of (wave.lanes ?? []).entries()) {
      const lanePath = `${wavePath}.lanes[${laneIndex}]`;
      closedObject(lane, new Set(['lane_id', 'scope']), errors, lanePath);
      requiredString(lane, 'lane_id', errors, lanePath);
      requiredString(lane, 'scope', errors, lanePath);
      if (laneIds.has(lane.lane_id)) {
        errors.push(
          issue(
            'DUPLICATE_ID',
            `Duplicate lane ${lane.lane_id}`,
            `${lanePath}.lane_id`,
          ),
        );
      }
      laneIds.add(lane.lane_id);
    }
  }

  const floors = (value.execution?.waves ?? [])
    .map((wave) => taskClasses.indexOf(wave.model_class_floor))
    .filter((index) => index >= 0);
  const maximumFloor = taskClasses[Math.max(...floors)];
  if (maximumFloor && value.execution?.run_maximum_floor !== maximumFloor) {
    errors.push(
      issue(
        'RUN_MAXIMUM_FLOOR_MISMATCH',
        'Run maximum floor does not equal the strongest wave floor',
        `${path}.execution.run_maximum_floor`,
      ),
    );
  }
  if (!taskClasses.includes(value.execution?.run_maximum_floor)) {
    errors.push(
      issue(
        'INVALID_TASK_CLASS',
        'Unknown run maximum floor',
        `${path}.execution.run_maximum_floor`,
      ),
    );
  }
  closedObject(
    value.execution?.pinned_target,
    pinnedTargetKeys,
    errors,
    `${path}.execution.pinned_target`,
  );
  for (const key of pinnedTargetKeys) {
    if (
      key === 'reasoning_mode_selector' &&
      value.execution?.pinned_target?.reasoning_mode_selector === null
    ) {
      continue;
    }
    requiredString(
      value.execution?.pinned_target,
      key,
      errors,
      `${path}.execution.pinned_target`,
    );
  }
  for (const key of pinnedTargetKeys) {
    if (value.execution?.pinned_target?.[key] !== value.selection?.[key]) {
      errors.push(
        issue(
          'PINNED_TARGET_MISMATCH',
          `${key} differs from the approved selection`,
          `${path}.execution.pinned_target.${key}`,
        ),
      );
    }
  }

  closedObject(
    value.catalog_observation,
    catalogKeys,
    errors,
    `${path}.catalog_observation`,
  );
  for (const key of ['id', 'source', 'dispatch_context', 'observed_at']) {
    requiredString(
      value.catalog_observation,
      key,
      errors,
      `${path}.catalog_observation`,
    );
  }
  if (!isDigest(value.catalog_observation?.relevant_catalog_fingerprint)) {
    errors.push(
      issue(
        'INVALID_CATALOG_FINGERPRINT',
        'Catalog fingerprint must be sha256',
        `${path}.catalog_observation.relevant_catalog_fingerprint`,
      ),
    );
  }
  if (
    value.catalog_observation?.dispatch_context !==
    value.selection?.dispatch_context
  ) {
    errors.push(
      issue(
        'CATALOG_CONTEXT_MISMATCH',
        'Catalog context differs from the approved selection',
        `${path}.catalog_observation.dispatch_context`,
      ),
    );
  }
}

function validateApprovalEvidence(value, errors, path) {
  if (!isObject(value)) return;
  closedObject(value, new Set(['type', 'fingerprint']), errors, path);
  if (value.type !== 'explicit-user-approval') {
    errors.push(
      issue(
        'INVALID_APPROVAL_EVIDENCE',
        'Approval evidence must record explicit user approval',
        `${path}.type`,
      ),
    );
  }
  if (!isDigest(value.fingerprint)) {
    errors.push(
      issue(
        'INVALID_APPROVAL_FINGERPRINT',
        'Approval evidence fingerprint must be sha256',
        `${path}.fingerprint`,
      ),
    );
  }
}

function validateCatalogRecheck(value, errors, path) {
  if (!isObject(value)) return;
  closedObject(value, catalogKeys, errors, path);
  for (const key of ['id', 'source', 'dispatch_context']) {
    requiredString(value, key, errors, path);
  }
  requiredTimestamp(value, 'observed_at', errors, path);
  if (!isDigest(value.relevant_catalog_fingerprint)) {
    errors.push(
      issue(
        'INVALID_CATALOG_FINGERPRINT',
        'Catalog recheck fingerprint must be sha256',
        `${path}.relevant_catalog_fingerprint`,
      ),
    );
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
      new Set([
        'approvalProjection',
        'approvalCanonicalJson',
        'approvalFingerprint',
        'approvedAt',
        'approvalEvidence',
        'catalogRecheck',
      ]),
      errors,
      '$.execution',
    );
    requiredObject(
      value.execution,
      'approvalProjection',
      errors,
      '$.execution',
    );
    requiredString(
      value.execution,
      'approvalCanonicalJson',
      errors,
      '$.execution',
    );
    requiredString(
      value.execution,
      'approvalFingerprint',
      errors,
      '$.execution',
    );
    requiredTimestamp(value.execution, 'approvedAt', errors, '$.execution');
    requiredObject(value.execution, 'approvalEvidence', errors, '$.execution');
    requiredObject(value.execution, 'catalogRecheck', errors, '$.execution');
    validateApprovalProjection(
      value.execution.approvalProjection,
      errors,
      '$.execution.approvalProjection',
    );
    validateApprovalEvidence(
      value.execution.approvalEvidence,
      errors,
      '$.execution.approvalEvidence',
    );
    validateCatalogRecheck(
      value.execution.catalogRecheck,
      errors,
      '$.execution.catalogRecheck',
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
    requiredString(stage, 'waveId', errors, `$.stages[${index}]`);
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
        'waveId',
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
    const claimIds = new Set(
      Array.isArray(value.claims)
        ? value.claims.map((claim) => claim?.id).filter(Boolean)
        : [],
    );
    if (Array.isArray(value.synthesis.keyClaimIds)) {
      for (const [index, claimId] of value.synthesis.keyClaimIds.entries()) {
        if (typeof claimId !== 'string' || claimId.trim().length === 0) {
          errors.push(
            issue(
              'INVALID_ARRAY_ENTRY',
              'keyClaimIds entries must be non-empty strings',
              `$.synthesis.keyClaimIds[${index}]`,
            ),
          );
        } else if (!claimIds.has(claimId)) {
          errors.push(
            issue(
              'SYNTHESIS_REFERENCE_MISSING',
              `Synthesis key claim ${claimId} does not resolve to an existing claim`,
              `$.synthesis.keyClaimIds[${index}]`,
            ),
          );
        }
      }
    }
    const questionIds = new Set(
      Array.isArray(value.unresolvedQuestions)
        ? value.unresolvedQuestions.map((q) => q?.id).filter(Boolean)
        : [],
    );
    if (Array.isArray(value.synthesis.unresolvedQuestionIds)) {
      for (const [
        index,
        questionId,
      ] of value.synthesis.unresolvedQuestionIds.entries()) {
        if (typeof questionId !== 'string' || questionId.trim().length === 0) {
          errors.push(
            issue(
              'INVALID_ARRAY_ENTRY',
              'unresolvedQuestionIds entries must be non-empty strings',
              `$.synthesis.unresolvedQuestionIds[${index}]`,
            ),
          );
        } else if (!questionIds.has(questionId)) {
          errors.push(
            issue(
              'SYNTHESIS_REFERENCE_MISSING',
              `Synthesis unresolved question ${questionId} does not resolve to an existing question`,
              `$.synthesis.unresolvedQuestionIds[${index}]`,
            ),
          );
        }
      }
    }
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
    const lastTransition = lastTransitionByClaim.get(claim.id);
    if (value.revision === 1 && claim.status === 'provisional') {
      if (lastTransition) {
        errors.push(
          issue(
            'INVALID_PROVISIONAL_GENESIS',
            `Revision-one provisional claim ${claim.id} must use genesis without an incoming transition`,
            `claim:${claim.id}`,
          ),
        );
      }
      continue;
    }
    if (
      (value.revision === 1 || lastTransition) &&
      lastTransition?.to !== claim.status
    ) {
      errors.push(
        issue(
          'CLAIM_TRANSITION_MISMATCH',
          `Final transition does not establish ${claim.id} as ${claim.status}`,
          `claim:${claim.id}`,
        ),
      );
    }
    if (
      value.revision > 1 &&
      claim.status === 'provisional' &&
      lastTransition?.to !== 'provisional'
    ) {
      errors.push(
        issue(
          'INVALID_PROVISIONAL_GENESIS',
          `Later revision provisional claim ${claim.id} requires a legal incoming transition`,
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
  if (
    (value.newEvidence ?? []).length > 0 ||
    value.evidenceAssociations !== undefined
  ) {
    requiredArray(value, 'evidenceAssociations', errors);
  }
  for (const [index, association] of (
    value.evidenceAssociations ?? []
  ).entries()) {
    for (const key of ['evidenceId', 'claimId', 'relation']) {
      requiredString(
        association,
        key,
        errors,
        `$.evidenceAssociations[${index}]`,
      );
    }
    if (
      !['supports', 'contradicts', 'qualifies', 'context'].includes(
        association.relation,
      )
    ) {
      errors.push(
        issue(
          'INVALID_EVIDENCE_RELATION',
          'Evidence association relation is not supported',
          `$.evidenceAssociations[${index}].relation`,
        ),
      );
    }
    closedObject(
      association,
      new Set(['evidenceId', 'claimId', 'relation']),
      errors,
      `$.evidenceAssociations[${index}]`,
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
    'evidenceAssociations',
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
  requiredObject(value, 'approvalProjection', errors);
  requiredString(value, 'approvalCanonicalJson', errors);
  requiredString(value, 'approvalFingerprint', errors);
  validateApprovalProjection(
    value.approvalProjection,
    errors,
    '$.approvalProjection',
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
  const approved = ['approved', 'accepted', 'completed', 'failed'].includes(
    value.state,
  );
  const launched = ['accepted', 'completed', 'failed'].includes(value.state);
  if (approved) {
    requiredTimestamp(value, 'approvedAt', errors);
    requiredObject(value, 'approvalEvidence', errors);
    validateApprovalEvidence(
      value.approvalEvidence,
      errors,
      '$.approvalEvidence',
    );
  } else if (value.approvedAt !== null || value.approvalEvidence !== null) {
    errors.push(
      issue(
        'INVALID_DISPATCH_STATE_EVIDENCE',
        'Prepared receipt cannot contain approval evidence',
        '$.approvalEvidence',
      ),
    );
  }
  if (launched) {
    requiredObject(value, 'catalogRecheck', errors);
    requiredObject(value, 'launchAcceptance', errors);
    validateCatalogRecheck(value.catalogRecheck, errors, '$.catalogRecheck');
    if (isObject(value.launchAcceptance)) {
      closedObject(
        value.launchAcceptance,
        new Set(['status', 'acceptedAt', 'handle']),
        errors,
        '$.launchAcceptance',
      );
      if (value.launchAcceptance.status !== 'accepted') {
        errors.push(
          issue(
            'INVALID_LAUNCH_ACCEPTANCE',
            'Launch was not accepted',
            '$.launchAcceptance.status',
          ),
        );
      }
      requiredTimestamp(
        value.launchAcceptance,
        'acceptedAt',
        errors,
        '$.launchAcceptance',
      );
      requiredString(
        value.launchAcceptance,
        'handle',
        errors,
        '$.launchAcceptance',
      );
    }
  } else if (value.catalogRecheck !== null || value.launchAcceptance !== null) {
    errors.push(
      issue(
        'INVALID_DISPATCH_STATE_EVIDENCE',
        'Pre-launch receipt cannot contain catalog or acceptance evidence',
        '$.catalogRecheck',
      ),
    );
  }
  if (value.state === 'completed') {
    requiredArray(value, 'artifactIds', errors);
    requiredObject(value, 'terminalOutcome', errors);
    if (isObject(value.terminalOutcome)) {
      closedObject(
        value.terminalOutcome,
        new Set(['status', 'completedAt']),
        errors,
        '$.terminalOutcome',
      );
      if (value.terminalOutcome.status !== 'completed') {
        errors.push(
          issue(
            'INVALID_TERMINAL_OUTCOME',
            'Terminal outcome is not completed',
            '$.terminalOutcome.status',
          ),
        );
      }
      requiredTimestamp(
        value.terminalOutcome,
        'completedAt',
        errors,
        '$.terminalOutcome',
      );
    }
  } else if (value.terminalOutcome !== null) {
    errors.push(
      issue(
        'INVALID_DISPATCH_STATE_EVIDENCE',
        'Non-completed receipt cannot contain a terminal outcome',
        '$.terminalOutcome',
      ),
    );
  }
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
      'approvalProjection',
      'approvalCanonicalJson',
      'approvalFingerprint',
      'approvedAt',
      'approvalEvidence',
      'catalogRecheck',
      'launchAcceptance',
      'terminalOutcome',
      'artifactIds',
    ]),
    errors,
  );
}

function validateStageResult(value, errors) {
  for (const key of ['id', 'waveId', 'mode', 'laneId', 'status'])
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
      'waveId',
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
