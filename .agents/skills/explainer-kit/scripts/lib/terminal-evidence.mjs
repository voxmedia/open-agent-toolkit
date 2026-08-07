import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

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
const SECRET_FIELD =
  '(?:(?:aws[_-]?)?(?:access[_-]?key(?:[_-]?id)?|secret[_-]?access[_-]?key|session[_-]?token)|api[_-]?key|client[_-]?secret|credentials?|password|private[_-]?key|secret[_-]?key|token)';
const SECRET_ASSIGNMENT_PATTERN = new RegExp(
  `(?:^|[^a-z0-9_-])["']?${SECRET_FIELD}["']?\\s*[:=]`,
  'i',
);
const AUTHORIZATION_MATERIAL_PATTERN =
  /(?:^|[^a-z0-9_-])["']?authorization["']?\s*[:=]/i;
const CREDENTIALED_URL_PATTERN = /\bhttps?:\/\/[^\s/@:]+:[^\s/@]+@/i;
const BEARER_TOKEN_PATTERN = /\bbearer\s+[a-z0-9._~+/=-]+/i;
const BASIC_TOKEN_PATTERN = /\bbasic\s+[a-z0-9+/=]{8,}/i;
const AWS_ACCESS_KEY_PATTERN = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/;
const COMMON_TOKEN_PATTERN =
  /\b(?:gh[pousr]_[a-z0-9_]{20,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]{10,}|sk_(?:live|test)_[a-z0-9]{16,}|eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\.[a-z0-9_-]{10,})\b/i;
const PRIVATE_KEY_PATTERN = /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/;

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
    ...(error !== undefined && {
      error: normalizeRetainedError(error),
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
  if (
    evidence?.outcome === 'built-needs-review' &&
    (evidence.findings?.length ?? 0) === 0 &&
    evidence.error === undefined
  ) {
    semanticErrors.push(
      '$ must retain at least one finding or normalized review error for built-needs-review.',
    );
  }
  if (evidence?.outcome === 'failed' && evidence.error === undefined) {
    semanticErrors.push('$.error is required for a failed terminal outcome.');
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

export function scrubRetainedText(value, label = 'terminal evidence value') {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a primitive string.`);
  }
  const canonical = canonicalizeEscapedText(value);
  if (
    SECRET_ASSIGNMENT_PATTERN.test(canonical) ||
    AUTHORIZATION_MATERIAL_PATTERN.test(canonical) ||
    CREDENTIALED_URL_PATTERN.test(canonical) ||
    BEARER_TOKEN_PATTERN.test(canonical) ||
    BASIC_TOKEN_PATTERN.test(canonical) ||
    AWS_ACCESS_KEY_PATTERN.test(canonical) ||
    COMMON_TOKEN_PATTERN.test(canonical) ||
    PRIVATE_KEY_PATTERN.test(canonical)
  ) {
    return '[redacted]';
  }
  return value.slice(0, TERMINAL_EVIDENCE_MAX_TEXT_LENGTH);
}

export const serializeTerminalText = scrubRetainedText;

export function scrubRetainedValue(value, label = 'retained value') {
  if (typeof value === 'string') {
    return scrubRetainedText(value, label);
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      scrubRetainedValue(item, `${label}[${index}]`),
    );
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        scrubRetainedValue(item, `${label}.${key}`),
      ]),
    );
  }
  return value;
}

export function normalizeRetainedError(
  value,
  {
    defaultCode = 'E_RUN',
    defaultMessage = 'Run failed with an unsupported error value.',
  } = {},
) {
  let code = defaultCode;
  let message = defaultMessage;
  try {
    if (value instanceof Error) {
      code = primitiveText(value.code) ?? defaultCode;
      message = primitiveText(value.message) ?? defaultMessage;
    } else if (isPrimitiveText(value)) {
      message = String(value);
    } else if (isObject(value)) {
      code = primitiveText(value.code) ?? defaultCode;
      message = primitiveText(value.message) ?? defaultMessage;
    }
  } catch {
    code = defaultCode;
    message = defaultMessage;
  }
  return {
    code: scrubRetainedText(
      nonEmptyPrimitiveText(code, defaultCode),
      'error.code',
    ),
    message: scrubRetainedText(
      nonEmptyPrimitiveText(message, defaultMessage),
      'error.message',
    ),
  };
}

export async function readTerminalEvidenceFile(
  runRoot,
  { manifest, expectedBytes, expectedHash } = {},
) {
  if (typeof runRoot !== 'string' || runRoot.length === 0) {
    throw new TypeError('Terminal evidence run root must be a path string.');
  }
  const canonicalRunRoot = await realpath(runRoot);
  const evidencePath = resolve(canonicalRunRoot, 'terminal-evidence.json');
  const stats = await lstat(evidencePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(
      'Terminal evidence must be a regular file, not a symbolic link.',
    );
  }
  const canonicalEvidencePath = await realpath(evidencePath);
  if (canonicalEvidencePath !== evidencePath) {
    throw new Error('Terminal evidence must remain within the run root.');
  }
  const bytes = await readFile(canonicalEvidencePath);
  const hash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (expectedHash !== undefined && hash !== expectedHash) {
    throw new Error('Terminal evidence bytes changed while staging.');
  }
  if (
    expectedBytes !== undefined &&
    !bytes.equals(Buffer.from(expectedBytes))
  ) {
    throw new Error('Terminal evidence bytes changed while staging.');
  }
  let evidence;
  try {
    evidence = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('Terminal evidence must contain valid JSON.');
  }
  assertTerminalEvidence(evidence, { manifest });
  return { evidence, bytes, hash };
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

function isPrimitiveText(value) {
  return ['string', 'number', 'boolean', 'bigint'].includes(typeof value);
}

function primitiveText(value) {
  return isPrimitiveText(value) ? String(value) : undefined;
}

function nonEmptyPrimitiveText(value, fallback) {
  const text = primitiveText(value);
  return text && text.trim().length > 0 ? text : fallback;
}

function canonicalizeEscapedText(value) {
  return value
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (_match, codePoint) =>
      safeCodePoint(codePoint),
    )
    .replace(/\\u([0-9a-f]{4})/gi, (_match, codePoint) =>
      safeCodePoint(codePoint),
    )
    .replace(/\\x([0-9a-f]{2})/gi, (_match, codePoint) =>
      safeCodePoint(codePoint),
    );
}

function safeCodePoint(hex) {
  const codePoint = Number.parseInt(hex, 16);
  return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '\ufffd';
}
