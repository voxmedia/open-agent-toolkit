import { hashCanonicalJson } from './canonical-json.mjs';
import {
  approvalFingerprintInput,
  authorityLevels,
  conditionPredicates,
  profiles,
  taskClasses,
  waveModes,
} from './contracts.mjs';

const exactTargetFields = [
  'provider',
  'route',
  'role',
  'model',
  'effort',
  'reasoningMode',
  'serviceTier',
];

const exactTargetFieldSet = new Set(exactTargetFields);

function profilePolicy(orderedSingletonWaveModes, caps) {
  return Object.freeze({
    orderedSingletonWaveModes: Object.freeze(orderedSingletonWaveModes),
    ...caps,
  });
}

const profileRoutingPolicy = Object.freeze({
  quick: profilePolicy(['map', 'gather', 'compile'], {
    lanes: 4,
    concurrency: 4,
    conditions: 0,
  }),
  standard: profilePolicy(
    [
      'map',
      'gather',
      'compile',
      'semantic-verification',
      'adversarial',
      'coverage',
      'reconciliation',
    ],
    { lanes: 10, concurrency: 6, conditions: 1 },
  ),
  thorough: profilePolicy(
    [
      'map',
      'gather',
      'compile',
      'semantic-verification',
      'adversarial',
      'coverage',
      'redundant-gather',
      'redundant-verification',
      'reconciliation',
    ],
    { lanes: 20, concurrency: 8, conditions: 2 },
  ),
});

const economicalDefaults = Object.freeze({
  map: Object.freeze({
    assignment: 'Enumerate sources, files, or routes from explicit criteria.',
    taskClass: 'mechanical-recon',
  }),
  gather: Object.freeze({
    assignment: 'Extract requested observations with exact citations.',
    taskClass: 'mechanical-recon',
  }),
  'redundant-gather': Object.freeze({
    assignment: 'Independently repeat a bounded evidence extraction.',
    taskClass: 'mechanical-recon',
  }),
  compile: Object.freeze({
    assignment: 'Group and deduplicate dossiers while retaining conflicts.',
    taskClass: 'mechanical-recon',
  }),
  'semantic-verification': Object.freeze({
    assignment: 'Reopen named claims and check their specific source support.',
    taskClass: 'mechanical-recon',
  }),
  'redundant-verification': Object.freeze({
    assignment: 'Independently repeat bounded claim support checks.',
    taskClass: 'mechanical-recon',
  }),
  adversarial: Object.freeze({
    assignment: 'Search for counterexamples to a specified claim.',
    taskClass: 'mechanical-recon',
  }),
  coverage: Object.freeze({
    assignment:
      'Compare evidence with an explicit question or source inventory.',
    taskClass: 'mechanical-recon',
  }),
  reconciliation: Object.freeze({
    assignment:
      'Assemble agreement and disagreement without deciding implications.',
    taskClass: 'mechanical-recon',
  }),
  'contradiction-resolution': Object.freeze({
    assignment: 'Seek discriminating evidence for a named contradiction.',
    taskClass: 'mechanical-recon',
  }),
});

export class RoutingContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RoutingContractError';
    this.code = code;
  }
}

function clone(value) {
  return structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function routingError(code, message) {
  throw new RoutingContractError(code, message);
}

function assertObject(value, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    routingError(code, `${label} must be an object`);
  }
}

function assertExactTarget(target, label = 'target') {
  assertObject(target, 'INVALID_EXACT_TARGET', label);
  for (const key of Object.keys(target)) {
    if (!exactTargetFieldSet.has(key)) {
      routingError(
        'UNSUPPORTED_TARGET_CONTROL',
        `${label} contains unsupported control ${key}`,
      );
    }
  }
  for (const key of ['provider', 'route', 'role', 'model']) {
    if (typeof target[key] !== 'string' || target[key].length === 0) {
      routingError(
        'INVALID_EXACT_TARGET',
        `${label}.${key} must be a non-empty string`,
      );
    }
  }
  for (const key of ['effort', 'reasoningMode', 'serviceTier']) {
    if (
      !Object.hasOwn(target, key) ||
      (target[key] !== null &&
        (typeof target[key] !== 'string' || target[key].length === 0))
    ) {
      routingError(
        'INVALID_EXACT_TARGET',
        `${label}.${key} must be a non-empty string or null`,
      );
    }
  }
}

function exactTargetEqual(left, right) {
  return exactTargetFields.every((field) => left[field] === right[field]);
}

function assertPositiveInteger(value, label, minimum = 1) {
  if (!Number.isInteger(value) || value < minimum) {
    routingError(
      'INVALID_ROUTING_LIMIT',
      `${label} must be an integer greater than or equal to ${minimum}`,
    );
  }
}

function assertNonEmptyString(value, code, label) {
  if (typeof value !== 'string' || value.length === 0) {
    routingError(code, `${label} must be a non-empty string`);
  }
}

function assertClosedObject(value, allowedFields, code, label) {
  assertObject(value, code, label);
  for (const key of Object.keys(value)) {
    if (!allowedFields.has(key)) {
      routingError(code, `${label} contains unsupported field ${key}`);
    }
  }
}

function assertProposalExecution(manifest) {
  assertObject(manifest, 'INVALID_ROUTING_PROPOSAL', 'manifest');
  if (![1, 2].includes(manifest.schemaVersion)) {
    routingError(
      'UNSUPPORTED_ROUTING_VERSION',
      `Unsupported routing schemaVersion ${manifest.schemaVersion}`,
    );
  }
  const execution = manifest.execution;
  assertClosedObject(
    execution,
    manifest.schemaVersion === 1
      ? new Set([
          ...exactTargetFields,
          'authority',
          'maxConcurrency',
          'deadlineSeconds',
          'retryLimit',
          'waves',
          'approval',
        ])
      : new Set([
          'target',
          'authority',
          'maxConcurrency',
          'deadlineSeconds',
          'retryLimit',
          'waves',
          'conditions',
          'approval',
        ]),
    'INVALID_ROUTING_PROPOSAL',
    'execution',
  );
  const target =
    manifest.schemaVersion === 1 ? v1Target(execution) : execution.target;
  assertExactTarget(target, 'execution target');
  if (!authorityLevels.includes(execution.authority)) {
    routingError(
      'INVALID_ROUTING_AUTHORITY',
      'execution.authority must be provider-enforced or contract-enforced',
    );
  }
  assertPositiveInteger(execution.maxConcurrency, 'maxConcurrency');
  assertPositiveInteger(execution.deadlineSeconds, 'deadlineSeconds');
  assertPositiveInteger(execution.retryLimit, 'retryLimit', 0);
  if (!Array.isArray(execution.waves) || execution.waves.length === 0) {
    routingError(
      'INVALID_ROUTING_PROPOSAL',
      'execution.waves must contain at least one wave',
    );
  }
  const waveIds = new Set();
  const laneIds = new Set();
  const writeRoots = new Set();
  for (const [index, wave] of execution.waves.entries()) {
    assertClosedObject(
      wave,
      manifest.schemaVersion === 1
        ? new Set(['waveId', 'mode', 'taskClass', 'lanes', 'conditional'])
        : new Set([
            'waveId',
            'mode',
            'taskClass',
            'classFloor',
            'selectionReason',
            'target',
            'lanes',
            'conditional',
          ]),
      'INVALID_ROUTING_WAVE',
      `waves[${index}]`,
    );
    if (typeof wave.waveId !== 'string' || wave.waveId.length === 0) {
      routingError(
        'INVALID_ROUTING_WAVE',
        `waves[${index}].waveId must be a non-empty string`,
      );
    }
    if (waveIds.has(wave.waveId)) {
      routingError('DUPLICATE_ROUTING_ID', `Duplicate wave ${wave.waveId}`);
    }
    waveIds.add(wave.waveId);
    if (!waveModes.includes(wave.mode)) {
      routingError('INVALID_WAVE_MODE', `Unknown wave mode ${wave.mode}`);
    }
    if (!taskClasses.includes(wave.taskClass)) {
      routingError(
        'INVALID_TASK_CLASS',
        `Unknown task class ${wave.taskClass}`,
      );
    }
    if (manifest.schemaVersion === 2) {
      if (!taskClasses.includes(wave.classFloor)) {
        routingError(
          'INVALID_TASK_CLASS',
          `Unknown class floor ${wave.classFloor}`,
        );
      }
      if (
        taskClasses.indexOf(wave.taskClass) <
        taskClasses.indexOf(wave.classFloor)
      ) {
        routingError(
          'TASK_CLASS_BELOW_FLOOR',
          `Wave ${wave.waveId} task class is below its class floor`,
        );
      }
      if (
        typeof wave.selectionReason !== 'string' ||
        wave.selectionReason.trim().length === 0
      ) {
        routingError(
          'MISSING_SELECTION_REASON',
          `Wave ${wave.waveId} requires a substantive selection reason`,
        );
      }
      if (Object.hasOwn(wave, 'target')) {
        assertExactTarget(wave.target, `wave ${wave.waveId} target`);
      }
    }
    if (!Array.isArray(wave.lanes) || wave.lanes.length === 0) {
      routingError(
        'INVALID_ROUTING_WAVE',
        `Wave ${wave.waveId} must contain at least one lane`,
      );
    }
    if (typeof wave.conditional !== 'boolean') {
      routingError(
        'INVALID_ROUTING_WAVE',
        `Wave ${wave.waveId}.conditional must be a boolean`,
      );
    }
    for (const lane of wave.lanes) {
      assertClosedObject(
        lane,
        new Set(['laneId', 'scope', 'writeRoot']),
        'INVALID_ROUTING_LANE',
        `Wave ${wave.waveId} lane`,
      );
      assertNonEmptyString(
        lane.laneId,
        'INVALID_ROUTING_LANE',
        `Wave ${wave.waveId} laneId`,
      );
      if (laneIds.has(lane.laneId)) {
        routingError('DUPLICATE_ROUTING_ID', `Duplicate lane ${lane.laneId}`);
      }
      laneIds.add(lane.laneId);
      assertNonEmptyString(
        lane.scope,
        'INVALID_ROUTING_LANE',
        `Lane ${lane.laneId}.scope`,
      );
      assertNonEmptyString(
        lane.writeRoot,
        'INVALID_ROUTING_LANE',
        `Lane ${lane.laneId}.writeRoot`,
      );
      if (
        lane.writeRoot.startsWith('/') ||
        lane.writeRoot.split('/').some((segment) => segment === '..')
      ) {
        routingError(
          'INVALID_WRITE_ROOT',
          `Lane ${lane.laneId}.writeRoot must be packet-relative`,
        );
      }
      if (manifest.schemaVersion === 2 && writeRoots.has(lane.writeRoot)) {
        routingError(
          'DUPLICATE_WAVE_OUTPUT',
          `Wave output ${lane.writeRoot} is assigned more than once`,
        );
      }
      writeRoots.add(lane.writeRoot);
    }
  }

  if (manifest.schemaVersion === 2) {
    assertV2ProposalTopology(manifest, execution);
  }
  return { execution, target };
}

function assertV2ProposalTopology(manifest, execution) {
  const requestedProfile = manifest.run?.requestedProfile;
  if (!profiles.includes(requestedProfile)) {
    routingError(
      'INVALID_ROUTING_PROFILE',
      'A v2 routing proposal requires a supported requested profile',
    );
  }
  if (!Array.isArray(execution.conditions)) {
    routingError(
      'MISSING_ROUTING_CONDITIONS',
      'execution.conditions must be an array',
    );
  }

  const policy = profileRoutingPolicy[requestedProfile];
  const laneCount = execution.waves.reduce(
    (count, wave) => count + wave.lanes.length,
    0,
  );
  if (laneCount > policy.lanes) {
    routingError(
      'PROFILE_LANE_CAP_EXCEEDED',
      `${requestedProfile} routing permits at most ${policy.lanes} total worker lanes`,
    );
  }
  if (execution.maxConcurrency > policy.concurrency) {
    routingError(
      'PROFILE_CONCURRENCY_CAP_EXCEEDED',
      `${requestedProfile} routing permits concurrency at most ${policy.concurrency}`,
    );
  }
  if (execution.conditions.length > policy.conditions) {
    routingError(
      'PROFILE_CONDITION_CAP_EXCEEDED',
      `${requestedProfile} routing permits at most ${policy.conditions} conditional waves`,
    );
  }

  const waveIndexes = new Map(
    execution.waves.map((wave, index) => [wave.waveId, index]),
  );
  const reconciliationIndexes = execution.waves
    .map((wave, index) => (wave.mode === 'reconciliation' ? index : -1))
    .filter((index) => index !== -1);
  if (
    reconciliationIndexes.length > 1 ||
    (['standard', 'thorough'].includes(requestedProfile) &&
      reconciliationIndexes.length !== 1) ||
    reconciliationIndexes.some(
      (index) => index !== execution.waves.length - 1,
    ) ||
    reconciliationIndexes.some(
      (index) => execution.waves[index].conditional === true,
    )
  ) {
    routingError(
      'INVALID_TERMINAL_TOPOLOGY',
      'Standard and thorough routing require exactly one non-conditional terminal reconciliation wave',
    );
  }
  const terminalIndex = reconciliationIndexes[0] ?? -1;
  const unconditionalContradiction = execution.waves.find(
    (wave) =>
      wave.mode === 'contradiction-resolution' && wave.conditional !== true,
  );
  if (unconditionalContradiction) {
    routingError(
      'UNCONDITIONAL_CONTRADICTION_RESOLUTION',
      `Contradiction-resolution wave ${unconditionalContradiction.waveId} must be conditional and condition-bound`,
    );
  }
  const conditionIds = new Set();
  const destinations = new Set();
  const conditionFields = new Set([
    'conditionId',
    'destinationWaveId',
    'afterWaveIds',
    'predicate',
    'maxActivations',
  ]);
  for (const [index, condition] of execution.conditions.entries()) {
    const label = `conditions[${index}]`;
    assertClosedObject(
      condition,
      conditionFields,
      'INVALID_ROUTING_CONDITION',
      label,
    );
    assertNonEmptyString(
      condition.conditionId,
      'INVALID_ROUTING_CONDITION',
      `${label}.conditionId`,
    );
    assertNonEmptyString(
      condition.destinationWaveId,
      'INVALID_ROUTING_CONDITION',
      `${label}.destinationWaveId`,
    );
    if (
      !Array.isArray(condition.afterWaveIds) ||
      condition.afterWaveIds.length === 0
    ) {
      routingError(
        'INVALID_CONDITION_DEPENDENCY',
        `${label}.afterWaveIds must contain at least one predecessor wave`,
      );
    }
    if (!conditionPredicates.includes(condition.predicate)) {
      routingError(
        'INVALID_CONDITION_PREDICATE',
        `${label}.predicate is not supported`,
      );
    }
    if (condition.maxActivations !== 1) {
      routingError(
        'INVALID_CONDITION_LIMIT',
        `${label}.maxActivations must equal 1`,
      );
    }
    if (conditionIds.has(condition.conditionId)) {
      routingError(
        'DUPLICATE_ROUTING_ID',
        `Duplicate condition ${condition.conditionId}`,
      );
    }
    conditionIds.add(condition.conditionId);
    if (destinations.has(condition.destinationWaveId)) {
      routingError(
        'DUPLICATE_CONDITION_DESTINATION',
        `Conditional wave ${condition.destinationWaveId} has more than one activating condition`,
      );
    }
    destinations.add(condition.destinationWaveId);

    const destinationIndex = waveIndexes.get(condition.destinationWaveId);
    const destination =
      destinationIndex === undefined ? null : execution.waves[destinationIndex];
    if (
      !destination ||
      destination.conditional !== true ||
      destination.mode !== 'contradiction-resolution'
    ) {
      routingError(
        'INVALID_CONDITION_DESTINATION',
        `${label}.destinationWaveId must name a conditional contradiction-resolution wave`,
      );
    }
    const afterIds = new Set();
    for (const [afterIndex, afterWaveId] of condition.afterWaveIds.entries()) {
      assertNonEmptyString(
        afterWaveId,
        'INVALID_CONDITION_DEPENDENCY',
        `${label}.afterWaveIds[${afterIndex}]`,
      );
      if (afterIds.has(afterWaveId)) {
        routingError(
          'DUPLICATE_CONDITION_DEPENDENCY',
          `${label} repeats predecessor ${afterWaveId}`,
        );
      }
      afterIds.add(afterWaveId);
      const predecessorIndex = waveIndexes.get(afterWaveId);
      if (predecessorIndex === undefined) {
        routingError(
          'UNKNOWN_CONDITION_WAVE',
          `${label} names unknown predecessor ${afterWaveId}`,
        );
      }
      if (predecessorIndex >= destinationIndex) {
        routingError(
          'NON_FORWARD_CONDITION',
          `${label} predecessor ${afterWaveId} must appear before its destination`,
        );
      }
    }
    if (terminalIndex !== -1 && destinationIndex >= terminalIndex) {
      routingError(
        'INVALID_TERMINAL_TOPOLOGY',
        `${label} destination must appear before terminal reconciliation`,
      );
    }
  }
  for (const wave of execution.waves) {
    if (wave.conditional === true && !destinations.has(wave.waveId)) {
      routingError(
        'MISSING_WAVE_CONDITION',
        `Conditional wave ${wave.waveId} requires exactly one condition`,
      );
    }
  }

  const stageIndexes = policy.orderedSingletonWaveModes.map((mode) => ({
    mode,
    indexes: execution.waves
      .map((wave, index) => (wave.mode === mode ? index : -1))
      .filter((index) => index !== -1),
  }));
  const duplicateModes = stageIndexes
    .filter(({ indexes }) => indexes.length > 1)
    .map(({ mode }) => mode);
  if (duplicateModes.length > 0) {
    routingError(
      'DUPLICATE_PROFILE_WAVE_MODE',
      `${requestedProfile} routing requires one wave for singleton modes: ${duplicateModes.join(', ')}`,
    );
  }
  const missingModes = stageIndexes
    .filter(({ indexes }) => indexes.length === 0)
    .map(({ mode }) => mode);
  if (missingModes.length > 0) {
    routingError(
      'INCOMPLETE_PROFILE_TOPOLOGY',
      `${requestedProfile} routing is missing required non-conditional wave modes: ${missingModes.join(', ')}`,
    );
  }
  const conditionalRequired = stageIndexes.find(
    ({ indexes }) =>
      indexes.length === 1 && execution.waves[indexes[0]].conditional === true,
  );
  if (conditionalRequired) {
    routingError(
      'INCOMPLETE_PROFILE_TOPOLOGY',
      `${requestedProfile} required wave mode ${conditionalRequired.mode} must be non-conditional`,
    );
  }
  const orderedIndexes = stageIndexes.map(({ indexes }) => indexes[0]);
  if (
    orderedIndexes.some(
      (index, position) =>
        position > 0 && index <= orderedIndexes[position - 1],
    )
  ) {
    routingError(
      'OUT_OF_ORDER_PROFILE_TOPOLOGY',
      `${requestedProfile} routing must order singleton modes as: ${policy.orderedSingletonWaveModes.join(', ')}`,
    );
  }
}

function validateApproval(execution) {
  const approval = execution.approval;
  if (
    !approval ||
    approval.type !== 'explicit-user-approval' ||
    typeof approval.approvedAt !== 'string' ||
    !Number.isFinite(Date.parse(approval.approvedAt)) ||
    typeof approval.fingerprint !== 'string'
  ) {
    routingError(
      'MISSING_APPROVAL_ENVELOPE',
      'Exact target checks require valid explicit approval evidence',
    );
  }
  const expected = hashCanonicalJson(approvalFingerprintInput(execution));
  if (approval.fingerprint !== expected) {
    routingError(
      'APPROVAL_FINGERPRINT_MISMATCH',
      'Approved execution envelope no longer matches its fingerprint',
    );
  }
  return approval;
}

export function economicalDefaultForMode(mode) {
  const value = economicalDefaults[mode];
  if (!value) routingError('INVALID_WAVE_MODE', `Unknown wave mode ${mode}`);
  return clone(value);
}

export function economicalRoutingDefaults() {
  return deepFreeze(clone(economicalDefaults));
}

function v1Target(execution) {
  return Object.fromEntries(
    exactTargetFields.map((field) => [field, execution[field]]),
  );
}

export function resolveEffectiveWaveTarget(execution, wave) {
  const target = wave.target ?? execution.target;
  if (!target) {
    throw new TypeError('Version 2 routing requires an effective exact target');
  }
  return clone(target);
}

export function normalizeManifestRouting(manifest) {
  const execution = manifest.execution;
  let routing;
  if (manifest.schemaVersion === 1) {
    const target = v1Target(execution);
    routing = {
      sourceSchemaVersion: 1,
      target,
      authority: execution.authority,
      maxConcurrency: execution.maxConcurrency,
      deadlineSeconds: execution.deadlineSeconds,
      retryLimit: execution.retryLimit,
      waves: execution.waves.map((wave) => ({
        ...clone(wave),
        classFloor: wave.taskClass,
        selectionReason: null,
        target: clone(target),
      })),
      conditions: [],
      approval: clone(execution.approval),
    };
  } else if (manifest.schemaVersion === 2) {
    routing = {
      sourceSchemaVersion: 2,
      target: clone(execution.target),
      authority: execution.authority,
      maxConcurrency: execution.maxConcurrency,
      deadlineSeconds: execution.deadlineSeconds,
      retryLimit: execution.retryLimit,
      waves: execution.waves.map((wave) => ({
        ...clone(wave),
        target: resolveEffectiveWaveTarget(execution, wave),
      })),
      conditions: clone(execution.conditions),
      approval: clone(execution.approval),
    };
  } else {
    throw new TypeError(
      `Unsupported recon manifest schemaVersion ${manifest.schemaVersion}`,
    );
  }
  return deepFreeze(routing);
}

export function createRoutingPreview(manifest) {
  const { execution, target } = assertProposalExecution(manifest);
  if (execution.approval) validateApproval(execution);
  const waves = execution.waves.map((wave) => {
    const defaultPolicy = economicalDefaultForMode(wave.mode);
    const effectiveTarget =
      manifest.schemaVersion === 1
        ? target
        : resolveEffectiveWaveTarget(execution, wave);
    return {
      waveId: wave.waveId,
      mode: wave.mode,
      assignment: defaultPolicy.assignment,
      taskClass: wave.taskClass,
      classFloor:
        manifest.schemaVersion === 1 ? wave.taskClass : wave.classFloor,
      laneCount: wave.lanes.length,
      target: clone(effectiveTarget),
      selectionReason:
        manifest.schemaVersion === 1 ? null : wave.selectionReason,
      lanes: clone(wave.lanes),
      conditional: wave.conditional === true,
    };
  });
  const approvalInput = approvalFingerprintInput(execution);
  const approvalFingerprint = hashCanonicalJson(approvalInput);
  const requestedProfile = manifest.run?.requestedProfile ?? null;
  const profileCaps =
    manifest.schemaVersion === 2
      ? {
          maxLanes: profileRoutingPolicy[requestedProfile].lanes,
          maxConcurrency: profileRoutingPolicy[requestedProfile].concurrency,
          maxConditions: profileRoutingPolicy[requestedProfile].conditions,
        }
      : null;
  return deepFreeze({
    schemaVersion: manifest.schemaVersion,
    requestedProfile,
    profileCaps,
    approvalState: execution.approval ? 'recorded' : 'draft',
    approvalFingerprint,
    authority: execution.authority,
    waves,
    conditions: manifest.schemaVersion === 1 ? [] : clone(execution.conditions),
    limits: {
      waveCount: waves.length,
      laneCount: waves.reduce((count, wave) => count + wave.laneCount, 0),
      conditionCount:
        manifest.schemaVersion === 1 ? 0 : execution.conditions.length,
      maxConcurrency: execution.maxConcurrency,
      deadlineSeconds: execution.deadlineSeconds,
      retryLimit: execution.retryLimit,
      worstCaseLaneAttempts:
        waves.reduce((count, wave) => count + wave.laneCount, 0) *
        (execution.retryLimit + 1),
    },
  });
}

function encodeMarkdownValue(value) {
  return [...String(value)]
    .map((character) =>
      /^[\p{L}\p{N} .:/@%+-]$/u.test(character)
        ? character
        : `&#${character.codePointAt(0)};`,
    )
    .join('');
}

export function renderRoutingPreview(preview, format = 'markdown') {
  if (format === 'json') return `${JSON.stringify(preview, null, 2)}\n`;
  if (format !== 'markdown') {
    routingError(
      'UNSUPPORTED_PREVIEW_FORMAT',
      `Unsupported preview format ${format}`,
    );
  }
  const lines = [
    '# Recon routing proposal',
    '',
    `Approval: ${encodeMarkdownValue(preview.approvalState)}`,
    `Approval fingerprint: ${encodeMarkdownValue(preview.approvalFingerprint)}`,
    `Authority: ${encodeMarkdownValue(preview.authority)}`,
    `Requested profile: ${encodeMarkdownValue(preview.requestedProfile ?? 'legacy v1')}`,
    '',
    '| Wave | Mode | Assignment | Class / floor | Lanes | Exact target | Reason | Conditional |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- |',
  ];
  for (const wave of preview.waves) {
    const target = exactTargetFields
      .map(
        (field) =>
          `${field}=${encodeMarkdownValue(wave.target[field] ?? 'null')}`,
      )
      .join(', ');
    lines.push(
      `| ${encodeMarkdownValue(wave.waveId)} | ${encodeMarkdownValue(wave.mode)} | ${encodeMarkdownValue(wave.assignment)} | ${encodeMarkdownValue(wave.taskClass)} / ${encodeMarkdownValue(wave.classFloor)} | ${encodeMarkdownValue(wave.laneCount)} | ${target} | ${encodeMarkdownValue(wave.selectionReason ?? 'legacy v1 approval')} | ${encodeMarkdownValue(wave.conditional ? 'yes' : 'no')} |`,
    );
  }
  lines.push(
    '',
    '## Lane topology',
    '',
    '| Wave | Lane | Scope | Write root |',
    '| --- | --- | --- | --- |',
  );
  for (const wave of preview.waves) {
    for (const lane of wave.lanes) {
      lines.push(
        `| ${encodeMarkdownValue(wave.waveId)} | ${encodeMarkdownValue(lane.laneId)} | ${encodeMarkdownValue(lane.scope)} | ${encodeMarkdownValue(lane.writeRoot)} |`,
      );
    }
  }
  lines.push('', '## Conditional topology', '');
  if (preview.conditions.length === 0) {
    lines.push('None.');
  } else {
    lines.push(
      '| Condition | Destination | After waves | Predicate | Max activations |',
      '| --- | --- | --- | --- | ---: |',
    );
    for (const condition of preview.conditions) {
      const afterWaves = condition.afterWaveIds
        .map((waveId) => encodeMarkdownValue(waveId))
        .join(', ');
      lines.push(
        `| ${encodeMarkdownValue(condition.conditionId)} | ${encodeMarkdownValue(condition.destinationWaveId)} | ${afterWaves} | ${encodeMarkdownValue(condition.predicate)} | ${encodeMarkdownValue(condition.maxActivations)} |`,
      );
    }
  }
  lines.push(
    '',
    '## Worst-case limits',
    '',
    `- Waves: ${encodeMarkdownValue(preview.limits.waveCount)}`,
    `- Lanes: ${encodeMarkdownValue(preview.limits.laneCount)}`,
    `- Conditions: ${encodeMarkdownValue(preview.limits.conditionCount)}`,
    `- Concurrency: ${encodeMarkdownValue(preview.limits.maxConcurrency)}`,
    `- Deadline seconds: ${encodeMarkdownValue(preview.limits.deadlineSeconds)}`,
    `- Retry limit: ${encodeMarkdownValue(preview.limits.retryLimit)}`,
    `- Lane attempts: ${encodeMarkdownValue(preview.limits.worstCaseLaneAttempts)}`,
  );
  if (preview.profileCaps) {
    lines.push(
      `- Profile lane cap: ${encodeMarkdownValue(preview.profileCaps.maxLanes)}`,
      `- Profile concurrency cap: ${encodeMarkdownValue(preview.profileCaps.maxConcurrency)}`,
      `- Profile condition cap: ${encodeMarkdownValue(preview.profileCaps.maxConditions)}`,
    );
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function checkApprovedWaveTarget(manifest, waveId, candidateTarget) {
  const { execution } = assertProposalExecution(manifest);
  validateApproval(execution);
  if (typeof waveId !== 'string' || waveId.length === 0) {
    routingError('UNKNOWN_APPROVED_WAVE', 'A non-empty wave ID is required');
  }
  const wave = execution.waves.find((item) => item.waveId === waveId);
  if (!wave) {
    routingError('UNKNOWN_APPROVED_WAVE', `Unknown approved wave ${waveId}`);
  }
  assertExactTarget(candidateTarget, 'constructed target');
  const approvedTarget =
    manifest.schemaVersion === 1
      ? v1Target(execution)
      : resolveEffectiveWaveTarget(execution, wave);
  if (!exactTargetEqual(approvedTarget, candidateTarget)) {
    routingError(
      'CONSTRUCTED_TARGET_MISMATCH',
      `Constructed target does not exactly match approved wave ${waveId}`,
    );
  }
  return deepFreeze({
    valid: true,
    waveId,
    target: clone(approvedTarget),
  });
}

export function controllerEscalationDisposition({
  outcome,
  foreseeable,
  approvedTargetAdequate,
}) {
  if (outcome !== 'reconciliation-needs-judgment') {
    routingError(
      'INVALID_CONTROLLER_ESCALATION',
      `Unknown controller escalation outcome ${outcome}`,
    );
  }
  if (foreseeable === true) {
    return deepFreeze({
      action: 'select-before-approval',
      preserveCompletedWork: true,
      launchAllowed: false,
    });
  }
  if (approvedTargetAdequate === true) {
    return deepFreeze({
      action: 'use-approved-terminal',
      preserveCompletedWork: true,
      launchAllowed: true,
    });
  }
  return deepFreeze({
    action: 'renew-approval-or-new-run',
    preserveCompletedWork: true,
    launchAllowed: false,
    gap: 'unresolved-out-of-envelope',
  });
}
