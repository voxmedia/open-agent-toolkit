import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

import { canonicalHash, validateContract } from './contracts.mjs';

export const TERMINAL_EVIDENCE_VERSION = 'explainer-kit.terminal-evidence/v1';
export const VISUAL_REVIEW_EVIDENCE_VERSION =
  'explainer-kit.visual-review-evidence/v1';
export const EVIDENCE_REASON_MAX_COUNT = 50;

export function createTerminalEvidence({
  runId,
  outcome,
  manifest,
  reasons,
  evidenceDisposition,
  supersededBy,
} = {}) {
  const evidence = {
    schemaVersion: TERMINAL_EVIDENCE_VERSION,
    runId,
    outcome,
    ...(manifest && { manifestHash: canonicalHash(manifest) }),
    reasons: structuredClone(reasons),
    evidenceDisposition,
    ...(supersededBy && {
      supersededBy: structuredClone(supersededBy),
    }),
  };
  assertTerminalEvidence(evidence, { manifest });
  return evidence;
}

export function assertTerminalEvidence(evidence, { manifest } = {}) {
  const validation = validateContract('terminal-evidence', evidence, {
    manifest,
  });
  if (!validation.valid) {
    throw new Error(
      `Invalid terminal evidence: ${validation.errors
        .map(({ path, code }) => `${path} [${code}]`)
        .join('; ')}`,
    );
  }
  return evidence;
}

export function createVisualReviewEvidence({
  request,
  attempt,
  result,
  failureKind,
} = {}) {
  const evidence = {
    schemaVersion: VISUAL_REVIEW_EVIDENCE_VERSION,
    requestHash: request?.requestHash,
    attempt,
    disposition: failureKind
      ? 'failed'
      : result?.disposition === 'pass'
        ? 'pass'
        : 'correct',
    reasons: failureKind
      ? [{ stage: 'visual-review', kind: failureKind, count: 1 }]
      : result?.disposition === 'pass'
        ? []
        : findingReasons(result?.findings),
  };
  assertVisualReviewEvidence(evidence, { request, attempt });
  return evidence;
}

export function assertVisualReviewEvidence(
  evidence,
  { request, attempt } = {},
) {
  const validation = validateContract('visual-review-evidence', evidence, {
    visualReviewRequest: request,
    attempt,
  });
  if (!validation.valid) {
    throw new Error(
      `Invalid retained visual evidence: ${validation.errors
        .map(({ path, code }) => `${path} [${code}]`)
        .join('; ')}`,
    );
  }
  return evidence;
}

export function evidenceReason(stage, kind, { artifactId, count = 1 } = {}) {
  return {
    stage,
    kind,
    ...(artifactId !== undefined && { artifactId }),
    count,
  };
}

export function projectThrownReason(stage, kind = 'pipeline-failure') {
  return evidenceReason(stage, kind);
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

function findingReasons(findings) {
  const counts = new Map();
  let total = 0;
  for (const finding of Array.isArray(findings) ? findings : []) {
    if (total >= EVIDENCE_REASON_MAX_COUNT) break;
    const artifactId = finding?.artifactId;
    counts.set(artifactId, (counts.get(artifactId) ?? 0) + 1);
    total += 1;
  }
  return [...counts].map(([artifactId, count]) =>
    evidenceReason('visual-review', 'finding', { artifactId, count }),
  );
}
