import { canonicalHash, validateContract } from './contracts.mjs';

export const TERMINAL_EVIDENCE_VERSION = 'explainer-kit.terminal-evidence/v1';
export const TERMINAL_EVIDENCE_MAX_TEXT_LENGTH = 2_000;
export const TERMINAL_EVIDENCE_MAX_FINDINGS = 50;

const FINDING_FIELDS = [
  'artifactId',
  'rubric',
  'severity',
  'evidence',
  'correction',
];
const SECRET_ASSIGNMENT_PATTERN =
  /((?:(?:aws[_-]?)?(?:access[_-]?key(?:[_-]?id)?|secret[_-]?access[_-]?key|session[_-]?token)|client[_-]?secret|credentials?|password|private[_-]?key|secret[_-]?key|token)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&]+)/gi;
const CREDENTIALED_URL_PATTERN = /\b(https?:\/\/)([^\s/@:]+):([^\s/@]+)@/gi;
const BEARER_TOKEN_PATTERN = /\bbearer\s+[a-z0-9._~+/=-]+/gi;
const AWS_ACCESS_KEY_PATTERN = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;

export function createTerminalEvidence({
  runId,
  outcome,
  manifest,
  findings = [],
  error,
  evidenceDisposition,
  supersededBy,
} = {}) {
  if (
    typeof runId !== 'string' ||
    !['built-needs-review', 'failed'].includes(outcome) ||
    !Array.isArray(findings) ||
    findings.length > TERMINAL_EVIDENCE_MAX_FINDINGS ||
    !['retained', 'partial', 'unavailable', 'superseded'].includes(
      evidenceDisposition,
    )
  ) {
    throw new TypeError('Terminal evidence has an invalid compact shape.');
  }

  const evidence = {
    schemaVersion: TERMINAL_EVIDENCE_VERSION,
    runId: serializeTerminalText(runId, 'runId'),
    outcome,
    ...(manifest && { manifestHash: canonicalHash(manifest) }),
    findings: findings.map(compactFinding),
    ...(error && {
      error: {
        code: serializeTerminalText(error.code ?? 'E_RUN', 'error.code'),
        message: serializeTerminalText(
          error.message ?? 'Run failed.',
          'error.message',
        ),
      },
    }),
    evidenceDisposition,
    ...(supersededBy && {
      supersededBy: {
        runId: serializeTerminalText(supersededBy.runId, 'supersededBy.runId'),
        manifestHash: serializeTerminalText(
          supersededBy.manifestHash,
          'supersededBy.manifestHash',
        ),
      },
    }),
  };
  assertTerminalEvidence(evidence, { manifest });
  return evidence;
}

export function assertTerminalEvidence(evidence, { manifest } = {}) {
  const validation = validateContract('terminal-evidence', evidence);
  const semanticErrors = [];
  if (!validation.valid) {
    semanticErrors.push(
      ...validation.errors.map(
        ({ path, code, message }) => `${path} [${code}]: ${message}`,
      ),
    );
  }
  if (
    evidence?.evidenceDisposition === 'superseded' &&
    !evidence.supersededBy
  ) {
    semanticErrors.push(
      '$.supersededBy is required when evidenceDisposition is superseded.',
    );
  }
  if (
    evidence?.evidenceDisposition !== 'superseded' &&
    evidence?.supersededBy !== undefined
  ) {
    semanticErrors.push(
      '$.supersededBy is only valid when evidenceDisposition is superseded.',
    );
  }
  for (const [index, finding] of (evidence?.findings ?? []).entries()) {
    if (Object.keys(finding).length === 0) {
      semanticErrors.push(
        `$.findings[${index}] must retain at least one field.`,
      );
    }
  }
  if (manifest) {
    if (evidence?.runId !== manifest.runId) {
      semanticErrors.push(
        'Terminal evidence does not match the terminal manifest run identity.',
      );
    }
    if (evidence?.outcome !== manifest.outcome) {
      semanticErrors.push(
        'Terminal evidence does not match the terminal manifest outcome.',
      );
    }
    if (evidence?.manifestHash !== canonicalHash(manifest)) {
      semanticErrors.push(
        'Terminal evidence does not match the terminal manifest hash.',
      );
    }
  }
  for (const [path, value] of retainedTextEntries(evidence)) {
    try {
      if (serializeTerminalText(value, path) !== value) {
        semanticErrors.push(`${path} contains credential-bearing content.`);
      }
    } catch (error) {
      semanticErrors.push(
        error instanceof Error ? error.message : `${path} is invalid.`,
      );
    }
  }
  if (semanticErrors.length > 0) {
    throw new Error(`Invalid terminal evidence: ${semanticErrors.join('; ')}`);
  }
  return evidence;
}

export function serializeTerminalText(
  value,
  label = 'terminal evidence value',
) {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a primitive string.`);
  }
  const redacted = value
    .replace(
      CREDENTIALED_URL_PATTERN,
      (_match, protocol) => `${protocol}[redacted]@`,
    )
    .replace(SECRET_ASSIGNMENT_PATTERN, '$1[redacted]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted]')
    .replace(AWS_ACCESS_KEY_PATTERN, '[redacted]');
  return redacted.slice(0, TERMINAL_EVIDENCE_MAX_TEXT_LENGTH);
}

function compactFinding(finding) {
  if (!isObject(finding)) {
    throw new TypeError('Terminal findings must be compact objects.');
  }
  const unsupported = Object.keys(finding).filter(
    (key) => !FINDING_FIELDS.includes(key),
  );
  if (unsupported.length > 0) {
    throw new TypeError(
      `Terminal findings contain unsupported fields: ${unsupported.join(', ')}.`,
    );
  }
  const compact = Object.fromEntries(
    FINDING_FIELDS.filter((key) => finding[key] !== undefined).map((key) => [
      key,
      serializeTerminalText(finding[key], `finding.${key}`),
    ]),
  );
  if (Object.keys(compact).length === 0) {
    throw new TypeError('Terminal findings must retain at least one field.');
  }
  return compact;
}

function retainedTextEntries(evidence) {
  if (!isObject(evidence)) return [];
  const entries = [['$.runId', evidence.runId]];
  for (const [index, finding] of (evidence.findings ?? []).entries()) {
    for (const field of FINDING_FIELDS) {
      if (finding[field] !== undefined) {
        entries.push([`$.findings[${index}].${field}`, finding[field]]);
      }
    }
  }
  if (evidence.error) {
    entries.push(
      ['$.error.code', evidence.error.code],
      ['$.error.message', evidence.error.message],
    );
  }
  if (evidence.supersededBy) {
    entries.push(['$.supersededBy.runId', evidence.supersededBy.runId]);
  }
  return entries;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
