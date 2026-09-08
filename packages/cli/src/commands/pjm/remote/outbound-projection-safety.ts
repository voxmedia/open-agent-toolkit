import { createHash } from 'node:crypto';

import { containsSensitiveContentSignalInValue } from './credential-safety';

export interface OutboundProjection {
  title?: string;
  description?: string | null;
  priority?: string | null;
  status?: string;
  annotation?: string;
  sourceRevision?: string;
}

export interface OutboundProjectionSafetyResult {
  schemaVersion: 1;
  projectionDigest: string;
  verdict: 'safe' | 'blocked';
  resultDigest: string;
  reasons: Array<{
    code: 'sensitive-content' | 'private-artifact' | 'invalid-projection';
    field: keyof OutboundProjection | null;
  }>;
  assessedAt: string;
}

const ALLOWED_FIELDS = new Set<keyof OutboundProjection>([
  'title',
  'description',
  'priority',
  'status',
  'annotation',
  'sourceRevision',
]);
const PRIVATE_ARTIFACT_MARKERS = [
  '.oat/projects/',
  'discovery.md',
  'implementation.md',
  'review artifact',
];

export function digestOutboundProjection(
  projection: OutboundProjection,
): string {
  return digest(projection);
}

export function assessOutboundProjectionSafety(
  projection: OutboundProjection,
  options: { assessedAt: string },
): OutboundProjectionSafetyResult {
  if (!Number.isFinite(Date.parse(options.assessedAt))) {
    throw new Error('Outbound safety assessment requires a valid timestamp.');
  }
  const reasons: OutboundProjectionSafetyResult['reasons'] = [];
  for (const [rawField, value] of Object.entries(projection)) {
    const field = rawField as keyof OutboundProjection;
    if (
      !ALLOWED_FIELDS.has(field) ||
      (value !== null && typeof value !== 'string')
    ) {
      reasons.push({
        code: 'invalid-projection',
        field: ALLOWED_FIELDS.has(field) ? field : null,
      });
      continue;
    }
    if (containsSensitiveContentSignalInValue(value)) {
      reasons.push({ code: 'sensitive-content', field });
    }
    if (
      typeof value === 'string' &&
      PRIVATE_ARTIFACT_MARKERS.some((marker) =>
        value.toLowerCase().includes(marker),
      )
    ) {
      reasons.push({ code: 'private-artifact', field });
    }
  }
  const projectionDigest = digest(projection);
  const verdict = reasons.length === 0 ? 'safe' : 'blocked';
  const resultDigest = digest({
    schemaVersion: 1,
    projectionDigest,
    verdict,
    reasons,
    assessedAt: options.assessedAt,
  });
  return {
    schemaVersion: 1,
    projectionDigest,
    verdict,
    resultDigest,
    reasons,
    assessedAt: options.assessedAt,
  };
}

export function requireCurrentOutboundSafety(
  projection: OutboundProjection,
  result: OutboundProjectionSafetyResult | null | undefined,
): asserts result is OutboundProjectionSafetyResult {
  if (!result) throw new Error('Outbound safety evidence is missing.');
  if (result.verdict !== 'safe')
    throw new Error('Outbound safety evidence blocks execution.');
  if (result.projectionDigest !== digestOutboundProjection(projection)) {
    throw new Error('Outbound safety evidence is stale or mismatched.');
  }
  const expectedResultDigest = digest({
    schemaVersion: result.schemaVersion,
    projectionDigest: result.projectionDigest,
    verdict: result.verdict,
    reasons: result.reasons,
    assessedAt: result.assessedAt,
  });
  if (expectedResultDigest !== result.resultDigest) {
    throw new Error('Outbound safety result digest is invalid.');
  }
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')}`;
}

function canonicalize(value: unknown): unknown {
  if (value === null || ['string', 'boolean'].includes(typeof value))
    return value;
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  throw new Error('Outbound projection contains an unsupported value.');
}
