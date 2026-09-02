import {
  buildRuntimeObservation,
  observationIdentifier as observedValue,
  type ConfiguredInvocationForObservation,
  type RuntimeObservation,
} from './oat-dispatch-record';

/**
 * Codex rollout metadata parsing.
 *
 * Field paths here are taken from captured Codex 0.152.1 rollouts, not from
 * assumption; see `codex-runtime-observation.fixtures.ts` for the sanitized
 * captures the tests run against. An earlier revision of this parser read
 * `payload.parent_id` and `payload.role`, which Codex does not emit, so every
 * subagent was misreported as a root with no role while hand-written fixtures
 * agreed with the parser instead of with the world.
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

export const CODEX_OBSERVATION_SOURCE = 'codex-rollout-metadata';

const MAX_AGENT_PATH_LENGTH = 1024;
const MAX_AGENT_PATH_SEGMENTS = 64;

export interface CodexRuntimeMetadata {
  childLineage: string;
  role: string | null;
  model: string | null;
  effort: string | null;
  serviceTier: string | null;
  /** Request correlation declared by the session itself, when present. */
  requestId: string | null;
  /** Raw `thread_source`; `user` for a root session, `subagent` for a child. */
  threadSource: string | null;
  /**
   * Raw `forked_from_id`. Recorded without interpretation: a subagent commonly
   * carries it alongside `parent_thread_id`, so it does not by itself identify
   * a user fork. See the module tests for what could and could not be
   * established about fork shapes.
   */
  forkedFromId: string | null;
}

interface SessionFrame {
  id: string | null;
  parentThreadId: string | null;
  forkedFromId: string | null;
  threadSource: string | null;
  subagentSource: boolean;
  declaredDepth: number | null;
  agentPathSegments: number | null;
  role: string | null;
  requestId: string | null;
  historyStartOrdinal: number | null;
}

interface TurnMetadata {
  ordinal: number | null;
  model: string | null;
  effort: string | null;
  serviceTier: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function metadataEntryType(entry: unknown): CodexMetadataEntryType | null {
  if (!isRecord(entry)) return null;
  const type = entry.type;
  return typeof type === 'string' &&
    (CODEX_METADATA_ENTRY_TYPES as readonly string[]).includes(type)
    ? (type as CodexMetadataEntryType)
    : null;
}

function metadataPayload(
  entry: Record<string, unknown>,
): Record<string, unknown> | null {
  const payload = entry.payload;
  return isRecord(payload) ? payload : null;
}

/**
 * `source` is either a plain string for a user-started session (`exec`, `cli`,
 * `vscode`) or a tagged object for a spawned one. Only the tagged object form
 * carries spawn metadata.
 */
function threadSpawn(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  const source = payload.source;
  if (!isRecord(source)) return null;
  const subagent = source.subagent;
  if (!isRecord(subagent)) return null;
  const spawn = subagent.thread_spawn;
  return isRecord(spawn) ? spawn : null;
}

/**
 * Depth implied by `agent_path`, whose first segment is the root. Used only to
 * corroborate a declared depth; it is never stored and never stands alone.
 */
function agentPathDepth(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0 || value.length > MAX_AGENT_PATH_LENGTH) return null;
  const segments = value.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0 || segments.length > MAX_AGENT_PATH_SEGMENTS) {
    return null;
  }
  return segments.length - 1;
}

function sessionFrame(payload: Record<string, unknown>): SessionFrame {
  const spawn = threadSpawn(payload);
  return {
    id: observedValue(payload.id),
    parentThreadId:
      observedValue(payload.parent_thread_id) ??
      observedValue(spawn?.parent_thread_id),
    forkedFromId: observedValue(payload.forked_from_id),
    threadSource: observedValue(payload.thread_source),
    subagentSource: spawn !== null,
    declaredDepth: nonNegativeInteger(spawn?.depth),
    agentPathSegments:
      agentPathDepth(payload.agent_path) ?? agentPathDepth(spawn?.agent_path),
    role: observedValue(payload.agent_role) ?? observedValue(spawn?.agent_role),
    requestId: observedValue(payload.request_id),
    historyStartOrdinal: nonNegativeInteger(
      payload.subagent_history_start_ordinal,
    ),
  };
}

/**
 * A session is a child when it says so, when it carries spawn metadata, or when
 * it names a parent thread. Root is the absence of all three — never the
 * presence of a `session_id`, which on a subagent holds the *root's* id and
 * would classify every child as a root.
 */
function isChildSession(frame: SessionFrame): boolean {
  return (
    frame.threadSource === 'subagent' ||
    frame.subagentSource ||
    frame.parentThreadId !== null
  );
}

/**
 * Resolve lineage for the applicable session.
 *
 * The provider-declared `depth` is authoritative: it is a fact the runtime
 * states about itself, so it is used rather than re-derived. When `agent_path`
 * is also present the two are reconciled, and a disagreement yields
 * `depth-unknown` rather than a choice between two contradictory sources. The
 * parent-thread chain walk is only a fallback for a child that declares no
 * depth, and a parent named but absent from this rollout stays `depth-unknown`.
 */
function childLineage(
  frame: SessionFrame,
  byId: ReadonlyMap<string, SessionFrame>,
): string {
  if (!isChildSession(frame)) return 'root';

  if (frame.declaredDepth !== null) {
    if (
      frame.agentPathSegments !== null &&
      frame.agentPathSegments !== frame.declaredDepth
    ) {
      return 'depth-unknown';
    }
    return frame.declaredDepth === 0 ? 'root' : `depth-${frame.declaredDepth}`;
  }

  if (frame.parentThreadId === null) return 'depth-unknown';
  let depth = 0;
  let current: SessionFrame = frame;
  const visited = new Set<string>();
  while (current.parentThreadId !== null) {
    if (current.id !== null) {
      if (visited.has(current.id)) return 'depth-unknown';
      visited.add(current.id);
    }
    const parent = byId.get(current.parentThreadId);
    depth += 1;
    if (!parent || depth > MAX_AGENT_PATH_SEGMENTS) return 'depth-unknown';
    current = parent;
  }
  return `depth-${depth}`;
}

/**
 * Select the turn contexts that belong to the applicable session.
 *
 * A subagent rollout embeds its parent's history, including the parent's turn
 * context. `subagent_history_start_ordinal` marks where the session's own
 * records begin, which is how a depth-1 rollout is kept from reporting its
 * parent's model. Confirmed against the captured depth-1 rollout, whose
 * embedded parent turn context sits below that ordinal and whose own turn
 * context sits above it.
 */
function applicableTurns(
  turns: readonly TurnMetadata[],
  historyStartOrdinal: number | null,
): readonly TurnMetadata[] {
  if (historyStartOrdinal === null) return turns;
  const own = turns.filter(
    (turn) => turn.ordinal !== null && turn.ordinal >= historyStartOrdinal,
  );
  return own.length > 0 ? own : turns;
}

/** Payload keys the Codex parser can read. Nothing else survives projection. */
const CODEX_SESSION_META_KEYS = [
  'id',
  'parent_thread_id',
  'forked_from_id',
  'thread_source',
  'agent_role',
  'agent_path',
  'request_id',
  'subagent_history_start_ordinal',
] as const;
const CODEX_TURN_CONTEXT_KEYS = [
  'model',
  'effort',
  'reasoning_effort',
  'service_tier',
  'serviceTier',
] as const;
const CODEX_THREAD_SPAWN_KEYS = [
  'parent_thread_id',
  'depth',
  'agent_path',
  'agent_role',
] as const;

function pick(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) projected[key] = source[key];
  }
  return projected;
}

/**
 * Project raw rollout entries down to exactly what this parser reads.
 *
 * This is the guarantee behind "no conversation content is stored": a caller
 * may hand over an unmodified rollout, and everything outside the allowlist —
 * `base_instructions`, `cwd`, `git`, every conversation entry's payload, and
 * `session_id`, which is the root's id rather than this session's — is dropped
 * before the record boundary asserts anything. Projecting here rather than
 * requiring pre-sanitized input keeps the stripper inside reviewed code
 * instead of in each caller.
 */
export function projectCodexMetadataEntries(
  entries: readonly unknown[],
): unknown[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    const type = metadataEntryType(entry);
    const record = isRecord(entry) ? entry : {};
    const base: Record<string, unknown> = { type: record.type };
    if (typeof record.ordinal === 'number') base.ordinal = record.ordinal;
    // A non-metadata entry keeps its discriminator and nothing else; its
    // payload is never read, so it is never carried.
    if (type === null) return base;
    const payload = metadataPayload(record);
    if (payload === null) return base;
    if (type === 'turn_context') {
      return { ...base, payload: pick(payload, CODEX_TURN_CONTEXT_KEYS) };
    }
    const projected = pick(payload, CODEX_SESSION_META_KEYS);
    const spawn = threadSpawn(payload);
    if (typeof payload.source === 'string') {
      projected.source = payload.source;
    } else if (spawn !== null) {
      projected.source = {
        subagent: { thread_spawn: pick(spawn, CODEX_THREAD_SPAWN_KEYS) },
      };
    }
    return { ...base, payload: projected };
  });
}

/**
 * Extract the applicable child's metadata from Codex rollout entries.
 *
 * The applicable session is the *first* `session_meta`: a rollout's own header
 * is written at ordinal 0, and any embedded parent history follows it.
 */
export function extractCodexRuntimeMetadata(
  entries: readonly unknown[],
): CodexRuntimeMetadata | null {
  if (!Array.isArray(entries)) return null;
  const frames: SessionFrame[] = [];
  const turns: TurnMetadata[] = [];

  for (const entry of entries) {
    // Classification is by discriminator alone. A conversation entry's payload
    // is never read.
    const type = metadataEntryType(entry);
    if (type === null) continue;
    const record = entry as Record<string, unknown>;
    const payload = metadataPayload(record);
    if (payload === null) continue;

    if (type === 'session_meta') {
      frames.push(sessionFrame(payload));
      continue;
    }
    turns.push({
      ordinal: nonNegativeInteger(record.ordinal),
      model: observedValue(payload.model),
      effort:
        observedValue(payload.effort) ??
        observedValue(payload.reasoning_effort),
      serviceTier:
        observedValue(payload.service_tier) ??
        observedValue(payload.serviceTier),
    });
  }

  const applicable = frames[0];
  if (!applicable) return null;

  const byId = new Map<string, SessionFrame>();
  for (const frame of frames) {
    if (frame.id !== null && !byId.has(frame.id)) byId.set(frame.id, frame);
  }

  let model: string | null = null;
  let effort: string | null = null;
  let serviceTier: string | null = null;
  for (const turn of applicableTurns(turns, applicable.historyStartOrdinal)) {
    model = turn.model ?? model;
    effort = turn.effort ?? effort;
    serviceTier = turn.serviceTier ?? serviceTier;
  }

  return {
    childLineage: childLineage(applicable, byId),
    role: applicable.role,
    model,
    effort,
    serviceTier,
    requestId: applicable.requestId,
    threadSource: applicable.threadSource,
    forkedFromId: applicable.forkedFromId,
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
