import {
  authorityLevels,
  profileRoutingPolicy,
  taskClasses,
  validateV2ProfileTopology,
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
  if (manifest.schemaVersion !== 2) {
    routingError(
      'UNSUPPORTED_ROUTING_VERSION',
      `Unsupported routing schemaVersion ${manifest.schemaVersion}`,
    );
  }
  const execution = manifest.execution;
  assertClosedObject(
    execution,
    new Set([
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
  const target = execution.target;
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
      new Set([
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
    if (!taskClasses.includes(wave.classFloor)) {
      routingError(
        'INVALID_TASK_CLASS',
        `Unknown class floor ${wave.classFloor}`,
      );
    }
    if (
      taskClasses.indexOf(wave.taskClass) < taskClasses.indexOf(wave.classFloor)
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
      if (writeRoots.has(lane.writeRoot)) {
        routingError(
          'DUPLICATE_WAVE_OUTPUT',
          `Wave output ${lane.writeRoot} is assigned more than once`,
        );
      }
      writeRoots.add(lane.writeRoot);
    }
  }

  assertV2ProposalTopology(manifest, execution);
  return { execution };
}

function assertV2ProposalTopology(manifest, execution) {
  const [error] = validateV2ProfileTopology(manifest, execution);
  if (error) routingError(error.code, error.message);
}

function validateApproval(execution) {
  const approval = execution.approval;
  if (
    !approval ||
    approval.type !== 'explicit-user-approval' ||
    typeof approval.approvedAt !== 'string' ||
    !Number.isFinite(Date.parse(approval.approvedAt))
  ) {
    routingError(
      'MISSING_APPROVAL_ENVELOPE',
      'Exact target checks require valid explicit approval evidence',
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

export function resolveEffectiveWaveTarget(execution, wave) {
  const target = wave.target ?? execution.target;
  if (!target) {
    throw new TypeError('Recon routing requires an effective exact target');
  }
  return clone(target);
}

export function normalizeManifestRouting(manifest) {
  if (manifest.schemaVersion !== 2) {
    throw new TypeError(
      `Unsupported recon manifest schemaVersion ${manifest.schemaVersion}`,
    );
  }
  const execution = manifest.execution;
  const routing = {
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
  return deepFreeze(routing);
}

export function createRoutingPreview(manifest) {
  const { execution } = assertProposalExecution(manifest);
  if (execution.approval) validateApproval(execution);
  const waves = execution.waves.map((wave) => {
    const defaultPolicy = economicalDefaultForMode(wave.mode);
    const effectiveTarget = resolveEffectiveWaveTarget(execution, wave);
    return {
      waveId: wave.waveId,
      mode: wave.mode,
      assignment: defaultPolicy.assignment,
      taskClass: wave.taskClass,
      classFloor: wave.classFloor,
      laneCount: wave.lanes.length,
      target: clone(effectiveTarget),
      selectionReason: wave.selectionReason,
      lanes: clone(wave.lanes),
      conditional: wave.conditional === true,
    };
  });
  const requestedProfile = manifest.run?.requestedProfile ?? null;
  const profilePolicy = profileRoutingPolicy[requestedProfile];
  const laneCount = waves.reduce((count, wave) => count + wave.laneCount, 0);
  const countedAdaptiveLaneCount = waves.reduce(
    (count, wave) =>
      count +
      (profilePolicy.countedLaneModes.includes(wave.mode) ? wave.laneCount : 0),
    0,
  );
  const profileCaps = {
    maxLanes: profilePolicy.lanes,
    maxConcurrency: profilePolicy.concurrency,
    maxConditions: profilePolicy.conditions,
  };
  return deepFreeze({
    schemaVersion: manifest.schemaVersion,
    requestedProfile,
    profileCaps,
    approvalState: execution.approval ? 'recorded' : 'draft',
    authority: execution.authority,
    waves,
    conditions: clone(execution.conditions),
    limits: {
      waveCount: waves.length,
      laneCount,
      countedAdaptiveLaneCount,
      conditionCount: execution.conditions.length,
      maxConcurrency: execution.maxConcurrency,
      deadlineSeconds: execution.deadlineSeconds,
      retryLimit: execution.retryLimit,
      worstCaseLaneAttempts: laneCount * (execution.retryLimit + 1),
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
    `Authority: ${encodeMarkdownValue(preview.authority)}`,
    `Requested profile: ${encodeMarkdownValue(preview.requestedProfile)}`,
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
      `| ${encodeMarkdownValue(wave.waveId)} | ${encodeMarkdownValue(wave.mode)} | ${encodeMarkdownValue(wave.assignment)} | ${encodeMarkdownValue(wave.taskClass)} / ${encodeMarkdownValue(wave.classFloor)} | ${encodeMarkdownValue(wave.laneCount)} | ${target} | ${encodeMarkdownValue(wave.selectionReason)} | ${encodeMarkdownValue(wave.conditional ? 'yes' : 'no')} |`,
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
      `- Profile adaptive-lane cap: ${encodeMarkdownValue(preview.profileCaps.maxLanes)} (counted lanes: ${encodeMarkdownValue(preview.limits.countedAdaptiveLaneCount)} of ${encodeMarkdownValue(preview.limits.laneCount)} total)`,
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
  const approvedTarget = resolveEffectiveWaveTarget(execution, wave);
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
