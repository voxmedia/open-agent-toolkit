/**
 * Parser for the posted-review-body marker block.
 *
 * The marker block is an HTML comment opened by `<!-- oat-review-metadata`
 * carrying simple single-line YAML-ish scalars (see design.md → Data Models →
 * Posted-review-body). GitHub renders the comment as nothing but preserves it
 * across round-trips, so it is the durable routing channel between the
 * provide-remote skills (writers) and the receive-remote skills (readers).
 *
 * This is intentionally a tolerant single-line scalar parser — NOT a full YAML
 * parser. The schema is flat (no nested structures), so a line-oriented reader
 * is sufficient and avoids a dependency the schema does not need.
 */

/** Token that opens the marker comment block. */
export const MARKER_BLOCK_OPEN = 'oat-review-metadata';

/**
 * Matches the first `<!-- oat-review-metadata ... -->` HTML comment block.
 * Non-greedy body capture so a later comment in prose never wins.
 */
const MARKER_BLOCK_PATTERN = new RegExp(
  `<!--\\s*${MARKER_BLOCK_OPEN}\\s*([\\s\\S]*?)-->`,
);

/** A full 40-character lowercase/uppercase hex SHA. */
const FULL_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;

export type ReviewInvocation = 'manual' | 'auto' | 'gate';

export interface MarkerBlock {
  /** Always `true` for an OAT provide-remote review; the discriminator. */
  oat_provide_remote: true;
  /** Full 40-char hex SHA of the reviewed PR HEAD. */
  oat_review_head_sha: string;
  /** Scope token (`pNN`, `final`, …) or the `ad-hoc` sentinel. */
  oat_review_scope: string;
  /**
   * Project path — present only on the project rail. Key existence (not a
   * `null` value) discriminates project rail from ad-hoc rail.
   */
  oat_project?: string;
  /**
   * How the review was invoked. Missing and unknown values stay undefined so
   * legacy markers cannot silently acquire lifecycle lineage.
   */
  oat_review_invocation?: ReviewInvocation;
  /** Exact gate target. Required before a gate marker can establish lineage. */
  oat_gate_target?: string;
  /** Forward-compat bag for unknown marker keys. Omitted when none seen. */
  extras?: Record<string, string>;
}

const KNOWN_KEYS = new Set([
  'oat_provide_remote',
  'oat_review_head_sha',
  'oat_review_scope',
  'oat_project',
  'oat_review_invocation',
  'oat_gate_target',
]);

/**
 * Parse the first OAT marker block out of a posted-review body.
 *
 * Returns `null` when the body is not an OAT provide-remote review — either
 * because no marker block exists, because `oat_provide_remote` is not `true`,
 * or because the recorded head SHA is not a valid 40-char hex SHA (a value the
 * caller could not safely narrow against; returning null lets the caller fall
 * back to full-scope review).
 */
export function parseMarkerBlock(body: string): MarkerBlock | null {
  if (!body) {
    return null;
  }

  const match = body.match(MARKER_BLOCK_PATTERN);
  if (!match || match[1] === undefined) {
    return null;
  }

  const raw: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') {
      continue;
    }
    const sep = trimmed.indexOf(':');
    if (sep === -1) {
      continue;
    }
    const key = trimmed.slice(0, sep).trim().toLowerCase();
    const value = trimmed.slice(sep + 1).trim();
    if (key === '') {
      continue;
    }
    raw[key] = value;
  }

  if (raw['oat_provide_remote'] !== 'true') {
    return null;
  }

  const headSha = raw['oat_review_head_sha'];
  if (!headSha || !FULL_SHA_PATTERN.test(headSha)) {
    return null;
  }

  const scope = raw['oat_review_scope'];
  if (!scope) {
    return null;
  }

  const invocationRaw = raw['oat_review_invocation'];
  const oat_review_invocation: ReviewInvocation | undefined =
    invocationRaw === 'manual' ||
    invocationRaw === 'auto' ||
    invocationRaw === 'gate'
      ? invocationRaw
      : undefined;

  const block: MarkerBlock = {
    oat_provide_remote: true,
    oat_review_head_sha: headSha,
    oat_review_scope: scope,
  };
  if (oat_review_invocation !== undefined) {
    block.oat_review_invocation = oat_review_invocation;
  }

  // Project key existence (not a null value) discriminates the rail.
  if ('oat_project' in raw && raw['oat_project'] !== '') {
    block.oat_project = raw['oat_project'];
  }
  const gateTarget = raw['oat_gate_target']?.trim();
  if (gateTarget) {
    block.oat_gate_target = gateTarget;
  }

  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_KEYS.has(key)) {
      extras[key] = value;
    }
  }
  if (Object.keys(extras).length > 0) {
    block.extras = extras;
  }

  return block;
}
