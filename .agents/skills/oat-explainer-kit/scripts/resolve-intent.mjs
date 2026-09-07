import { RECAP_PROBE_CODES, RECAP_SEAM_IDS } from './probe-recap-seams.mjs';

const PRODUCTS = new Set(['projectExplainer', 'projectRecap']);
const MODES = new Set(['interactive', 'autonomous']);
const PREFERENCES = new Set(['always', 'ask', 'never']);
const DECISIONS = new Set(['generate', 'skip']);
const SOURCES = new Set([
  'interactive',
  'kickoff_prompt',
  'autonomous_policy',
  'capability_probe',
]);
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
    'skip:capability_probe',
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
  seamProbe,
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
  if (seamProbe !== undefined) {
    assertSeamProbe(seamProbe);
    if (product !== 'projectRecap') {
      throw new Error(
        'Seam probe results apply only to projectRecap resolution.',
      );
    }
    if (mode !== 'autonomous') {
      throw new Error(
        'Seam probe results apply only to autonomous projectRecap resolution.',
      );
    }
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
      seamProbe,
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

export function explainerModeForIntent(intent) {
  if (
    !intent ||
    typeof intent !== 'object' ||
    intent.product !== 'projectRecap' ||
    intent.decision !== 'generate'
  ) {
    throw new Error(
      'Only a generated projectRecap intent can select completion-chain explainer mode.',
    );
  }
  return 'unattended';
}

function resolveAutonomous({
  product,
  state,
  preference,
  kickoffRequest,
  seamProbe,
  now,
}) {
  if (product === 'projectRecap') {
    const warnings = [];
    if (seamProbe !== undefined && seamProbe.ok !== true) {
      if (seamProbe.code !== 'seams-unavailable') {
        const error = new Error(
          `Project recap seams are configured but invalid, so the recap fails closed rather than resolving a capability skip: ${seamProbe.message ?? seamProbe.code}`,
        );
        error.code = 'E_RECAP_SEAMS_INVALID';
        throw error;
      }
      warnings.push(
        `Autonomous project recap skipped: no provider is configured for ${formatSeams(seamProbe.missing)}.`,
      );
      return result(
        product,
        'skip',
        'capability_probe',
        createRecord(product, 'skip', 'capability_probe', now),
        warnings,
      );
    }
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

/**
 * A seam probe result is a decision input, so a malformed one must fail rather
 * than silently degrade into either a skip or a forced generate.
 */
function assertSeamProbe(seamProbe) {
  if (
    !seamProbe ||
    typeof seamProbe !== 'object' ||
    Array.isArray(seamProbe) ||
    typeof seamProbe.ok !== 'boolean' ||
    !RECAP_PROBE_CODES.includes(seamProbe.code)
  ) {
    throw new TypeError(
      'seamProbe must be a probeRecapSeams result with ok and a known code.',
    );
  }
  // A recap that runs from this decision runs unattended, so an interactive
  // probe is the wrong evidence: it checks only the author and critic and would
  // report a host with no set planner as fully available.
  if (seamProbe.mode !== 'unattended') {
    throw new TypeError(
      'seamProbe must come from an unattended probe of the recap seams.',
    );
  }
  if (
    !Array.isArray(seamProbe.missing) ||
    !Array.isArray(seamProbe.invalid) ||
    !Array.isArray(seamProbe.resolved) ||
    ![...seamProbe.missing, ...seamProbe.resolved].every((seam) =>
      RECAP_SEAM_IDS.includes(seam),
    )
  ) {
    throw new TypeError(
      'seamProbe must partition the canonical recap seams into missing, invalid, and resolved.',
    );
  }
  // The result is a discriminated union, so each code must carry exactly the
  // evidence it claims. A half-populated object must never reach the skip
  // branch and forge a capability skip out of an invalid seam.
  const consistent =
    seamProbe.code === 'seams-ok'
      ? seamProbe.ok === true &&
        seamProbe.missing.length === 0 &&
        seamProbe.invalid.length === 0 &&
        seamProbe.resolved.length === RECAP_SEAM_IDS.length
      : seamProbe.ok === false &&
        (seamProbe.code === 'seams-unavailable'
          ? seamProbe.missing.length > 0 && seamProbe.invalid.length === 0
          : seamProbe.invalid.length > 0);
  if (!consistent) {
    throw new TypeError(
      'An unsatisfied seamProbe must list the seams its code claims.',
    );
  }
}

function formatSeams(seams) {
  if (!Array.isArray(seams) || seams.length === 0) return 'a required seam';
  if (seams.length === 1) return seams[0];
  return `${seams.slice(0, -1).join(', ')} and ${seams.at(-1)}`;
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
