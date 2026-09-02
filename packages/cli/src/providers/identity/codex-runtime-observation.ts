import {
  buildRuntimeObservation,
  type ConfiguredInvocationForObservation,
  type RuntimeObservation,
} from './oat-dispatch-record';

/**
 * Codex rollout metadata parsing.
 *
 * The parser reads session and turn metadata only. Entries are classified by
 * their `type` discriminator alone, and the payload of any entry outside
 * {@link CODEX_METADATA_ENTRY_TYPES} is never touched, so conversation content,
 * instructions, and tool output cannot be reached from here. Every extracted
 * value is a short provider identifier validated against a closed shape before
 * it can become durable evidence.
 *
 * Everything this module produces is per-run, non-authoritative corroboration.
 * A failed or partial parse yields `not-reported`; it never falls back to the
 * configured invocation, so a requested value cannot masquerade as an
 * observation.
 */

/** Entry types whose payloads are metadata rather than conversation content. */
export const CODEX_METADATA_ENTRY_TYPES = [
  'session_meta',
  'turn_context',
] as const;

type CodexMetadataEntryType = (typeof CODEX_METADATA_ENTRY_TYPES)[number];

function metadataEntryType(entry: unknown): CodexMetadataEntryType | null {
  const type = entryType(entry);
  return (CODEX_METADATA_ENTRY_TYPES as readonly string[]).includes(type ?? '')
    ? (type as CodexMetadataEntryType)
    : null;
}

export const CODEX_OBSERVATION_SOURCE = 'codex-rollout-metadata';

const MAX_OBSERVED_VALUE_LENGTH = 256;

/**
 * Provider identifiers only: letters, digits, and the separators real Codex
 * model, effort, tier, and role names use. Anything else — newlines, control
 * characters, prose punctuation, or an over-long value — is dropped rather
 * than stored, because it is not an identifier this layer can attest to.
 */
const OBSERVED_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

export interface CodexRuntimeMetadata {
  childLineage: string;
  role: string | null;
  model: string | null;
  effort: string | null;
  serviceTier: string | null;
  /** Request correlation declared by the session itself, when present. */
  requestId: string | null;
  /** True when the applicable session was forked from an earlier history. */
  forked: boolean;
}

interface SessionFrame {
  id: string | null;
  parentId: string | null;
  role: string | null;
  requestId: string | null;
  forked: boolean;
  model: string | null;
  effort: string | null;
  serviceTier: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** A bounded identifier, or `null` when the value cannot be attested to. */
function observedValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_OBSERVED_VALUE_LENGTH) {
    return null;
  }
  return OBSERVED_VALUE_PATTERN.test(trimmed) ? trimmed : null;
}

function entryType(entry: unknown): string | null {
  if (!isRecord(entry)) return null;
  const type = entry.type;
  return typeof type === 'string' ? type : null;
}

function metadataPayload(
  entry: Record<string, unknown>,
): Record<string, unknown> | null {
  const payload = entry.payload;
  return isRecord(payload) ? payload : null;
}

function isForkSource(payload: Record<string, unknown>): boolean {
  const source = payload.source;
  return isRecord(source) && source.type === 'fork';
}

/**
 * Lineage from the session's own parent chain.
 *
 * A fork's embedded parent records are prior history, not dispatch ancestry, so
 * only declared `parent_id` links contribute depth. A parent that is named but
 * absent from this metadata yields `depth-unknown` rather than a guessed depth.
 */
function childLineage(
  frame: SessionFrame,
  byId: ReadonlyMap<string, SessionFrame>,
): string {
  if (frame.parentId === null) return 'root';
  let depth = 0;
  let current: SessionFrame | undefined = frame;
  const visited = new Set<string>();
  while (current && current.parentId !== null) {
    if (current.id !== null) {
      if (visited.has(current.id)) return 'depth-unknown';
      visited.add(current.id);
    }
    const parent = byId.get(current.parentId);
    depth += 1;
    if (!parent) return 'depth-unknown';
    current = parent;
  }
  return `depth-${depth}`;
}

/**
 * Extract the applicable child's metadata from Codex rollout entries.
 *
 * The applicable session is the last one declared: in a forked history the
 * embedded parent records come first, so the trailing frame is the child that
 * actually ran. Each turn context binds to the session it follows, and a later
 * turn context supersedes an earlier one within the same session.
 */
export function extractCodexRuntimeMetadata(
  entries: readonly unknown[],
): CodexRuntimeMetadata | null {
  if (!Array.isArray(entries)) return null;
  const frames: SessionFrame[] = [];

  for (const entry of entries) {
    // Classification is by discriminator alone. A conversation entry's payload
    // is never read.
    const type = metadataEntryType(entry);
    if (type === null) continue;
    const payload = metadataPayload(entry as Record<string, unknown>);
    if (payload === null) continue;

    if (type === 'session_meta') {
      frames.push({
        id: observedValue(payload.id),
        parentId: observedValue(payload.parent_id),
        role: observedValue(payload.role),
        requestId: observedValue(payload.request_id),
        forked: isForkSource(payload),
        model: null,
        effort: null,
        serviceTier: null,
      });
      continue;
    }

    const frame = frames.at(-1);
    if (!frame) continue;
    frame.model = observedValue(payload.model) ?? frame.model;
    frame.effort =
      observedValue(payload.effort ?? payload.reasoning_effort) ?? frame.effort;
    frame.serviceTier =
      observedValue(payload.service_tier ?? payload.serviceTier) ??
      frame.serviceTier;
  }

  const applicable = frames.at(-1);
  if (!applicable) return null;

  const byId = new Map<string, SessionFrame>();
  for (const frame of frames) {
    if (frame.id !== null && !byId.has(frame.id)) byId.set(frame.id, frame);
  }

  return {
    childLineage: childLineage(applicable, byId),
    role: applicable.role,
    model: applicable.model,
    effort: applicable.effort,
    serviceTier: applicable.serviceTier,
    requestId: applicable.requestId,
    forked: applicable.forked,
  };
}

/**
 * Produce one source-qualified Codex runtime observation.
 *
 * Returns `not-reported` when nothing metadata-shaped is present, when the
 * observation time is not a timestamp, or when the session correlates to a
 * different request. A declined correlation is deliberately silent rather than
 * attributed: another session's identity is not evidence about this request.
 */
export function parseCodexRuntimeObservation(input: {
  entries: readonly unknown[];
  observedAt: string;
  requestId?: string;
  configured?: ConfiguredInvocationForObservation | null;
}): RuntimeObservation {
  const metadata = extractCodexRuntimeMetadata(input.entries);
  if (metadata === null) return { status: 'not-reported' };
  if (
    input.requestId !== undefined &&
    metadata.requestId !== null &&
    metadata.requestId !== input.requestId
  ) {
    return { status: 'not-reported' };
  }
  return buildRuntimeObservation({
    provider: 'codex',
    source: CODEX_OBSERVATION_SOURCE,
    observedAt: input.observedAt,
    metadata: {
      childLineage: metadata.childLineage,
      role: metadata.role,
      model: metadata.model,
      effort: metadata.effort,
      serviceTier: metadata.serviceTier,
    },
    configured: input.configured ?? null,
  });
}
