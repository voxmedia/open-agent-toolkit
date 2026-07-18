const PRODUCTS = new Set(['projectExplainer', 'projectRecap']);
const MODES = new Set(['interactive', 'autonomous']);
const PREFERENCES = new Set(['always', 'ask', 'never']);
const DECISIONS = new Set(['generate', 'skip']);
const SOURCES = new Set(['interactive', 'kickoff_prompt', 'autonomous_policy']);
const ALLOWED_PAIRS = Object.freeze({
  projectExplainer: new Set([
    'generate:interactive',
    'skip:interactive',
    'generate:kickoff_prompt',
  ]),
  projectRecap: new Set([
    'generate:interactive',
    'skip:interactive',
    'generate:autonomous_policy',
  ]),
});
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function resolveIntent({
  product,
  mode,
  state = null,
  preference,
  kickoffRequest = false,
  answer,
  now = new Date().toISOString(),
}) {
  assertProduct(product);
  if (!MODES.has(mode)) {
    throw new Error(`Unsupported lifecycle mode: ${String(mode)}`);
  }
  if (preference !== undefined && !PREFERENCES.has(preference)) {
    throw new Error(
      `${product} workflow preference must be always, ask, or never.`,
    );
  }
  if (typeof kickoffRequest !== 'boolean') {
    throw new TypeError('kickoffRequest must be a boolean.');
  }

  if (mode === 'autonomous') {
    if (answer !== undefined) {
      throw new Error('Autonomous lifecycle intent cannot use an answer.');
    }
    return resolveAutonomous({
      product,
      state,
      preference,
      kickoffRequest,
      now,
    });
  }

  if (state !== null) {
    validateIntentRecord(product, state);
  }
  if (state) {
    if (answer !== undefined) {
      throw new Error(
        `${product} already has a recorded decision; it must not prompt again.`,
      );
    }
    return result(product, state.decision, 'project_state', state);
  }

  const effectivePreference = preference ?? 'ask';
  if (effectivePreference === 'always') {
    if (answer !== undefined) {
      throw new Error(
        `${product} preference always does not require an answer.`,
      );
    }
    return result(product, 'generate', 'workflow_preference');
  }
  if (effectivePreference === 'never') {
    if (answer !== undefined) {
      throw new Error(
        `${product} preference never does not require an answer.`,
      );
    }
    return result(product, 'skip', 'workflow_preference');
  }

  if (answer === undefined) {
    return {
      product,
      decision: 'ask',
      resolutionSource:
        preference === undefined ? 'default' : 'workflow_preference',
      needsPrompt: true,
      record: null,
      warnings: [],
    };
  }
  if (!DECISIONS.has(answer)) {
    throw new Error(`${product} answer must be generate or skip.`);
  }
  const record = createRecord(product, answer, 'interactive', now);
  return result(product, answer, 'interactive_answer', record);
}

export function validateIntentRecord(product, record) {
  assertProduct(product);
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError(`${product} intent must be a decision record.`);
  }
  const keys = Object.keys(record);
  if (
    keys.length !== 3 ||
    keys.some((key) => !['decision', 'source', 'decided_at'].includes(key))
  ) {
    throw new Error(
      `${product} intent must contain only decision, source, and decided_at.`,
    );
  }
  if (!DECISIONS.has(record.decision)) {
    throw new Error(`${product} decision must be generate or skip.`);
  }
  if (!SOURCES.has(record.source)) {
    throw new Error(`${product} intent has an invalid source.`);
  }
  if (!ALLOWED_PAIRS[product].has(`${record.decision}:${record.source}`)) {
    throw new Error(
      `Invalid ${product} decision/source pair: ${record.decision}/${record.source}.`,
    );
  }
  assertTimestamp(record.decided_at);
  return record;
}

function resolveAutonomous({
  product,
  state,
  preference,
  kickoffRequest,
  now,
}) {
  if (product === 'projectRecap') {
    const warnings = [];
    if (state?.decision === 'skip') {
      warnings.push(
        'Autonomous project recap policy overrode a lower-precedence skip decision.',
      );
    }
    if (preference === 'never') {
      warnings.push(
        'Autonomous project recap policy overrode workflow preference never.',
      );
    }
    return result(
      product,
      'generate',
      'mode',
      createRecord(product, 'generate', 'autonomous_policy', now),
      warnings,
    );
  }

  if (kickoffRequest) {
    return result(
      product,
      'generate',
      'mode',
      createRecord(product, 'generate', 'kickoff_prompt', now),
    );
  }
  return result(product, 'skip', 'mode');
}

function createRecord(product, decision, source, now) {
  const record = { decision, source, decided_at: now };
  validateIntentRecord(product, record);
  return record;
}

function result(
  product,
  decision,
  resolutionSource,
  record = null,
  warnings = [],
) {
  return {
    product,
    decision,
    resolutionSource,
    needsPrompt: false,
    record,
    warnings,
  };
}

function assertProduct(product) {
  if (!PRODUCTS.has(product)) {
    throw new Error(`Unsupported lifecycle product: ${String(product)}`);
  }
}

function assertTimestamp(value) {
  if (
    typeof value !== 'string' ||
    !ISO_TIMESTAMP_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error('Intent decided_at must be a valid ISO 8601 timestamp.');
  }
}
