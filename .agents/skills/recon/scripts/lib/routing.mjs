const exactTargetFields = [
  'provider',
  'route',
  'role',
  'model',
  'effort',
  'reasoningMode',
  'serviceTier',
];

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
