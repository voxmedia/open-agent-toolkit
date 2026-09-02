import {
  buildRuntimeObservation,
  observationIdentifier as observedValue,
  type ConfiguredInvocationForObservation,
  type RuntimeObservation,
} from './oat-dispatch-record';

/**
 * Claude runtime metadata parsing.
 *
 * Field paths here are taken from real on-disk transcripts under
 * `~/.claude/projects/`, not from assumption. An earlier revision read only
 * `system`/`init` and `result` records; a scan of all 2,725 local transcripts
 * found `"subtype":"init"` in zero of them, so that parser returned
 * `not-reported` against every real transcript while its hand-written fixtures
 * agreed with it. The on-disk `assistant` entry is now the primary shape.
 *
 * Reading an `assistant` entry does not mean reading a conversation. The parser
 * takes allowlisted entry-level metadata plus exactly two explicit key paths
 * inside `message` — `message.model` and `message.usage.service_tier`.
 * `message` is never spread, enumerated, or filtered after the fact, so
 * `message.content` is not merely dropped later; it is never reached. The
 * content-trap test pins this: a `message` whose `content` throws on access
 * still parses cleanly.
 *
 * Everything this module produces is per-run, non-authoritative corroboration.
 * A failed or partial parse yields `not-reported` and never falls back to the
 * configured invocation.
 */

/**
 * Entry-level keys the parser reads from an `assistant` entry. `message` is
 * handled separately by explicit path and is deliberately absent from this
 * list.
 *
 * `attributionAgent` is the role identifier and is the same class of signal
 * Codex carries as `agent_role`: a bounded enum-like name, not conversation
 * content. Across 2,725 captured transcripts it takes 8 distinct values, all
 * of which pass the shared identifier validator, with a longest value of 21
 * characters against the 256 bound. It appears on subagent turns only, so a
 * main session reports no role rather than a synthesized one.
 */
const CLAUDE_ASSISTANT_KEYS = [
  'type',
  'isSidechain',
  'effort',
  'attributionAgent',
  'sessionId',
  'session_id',
  'requestId',
] as const;

/**
 * Stream-json entry keys, for `claude -p --output-format stream-json`.
 *
 * UNVERIFIED: no captured artifact of that format was available, and zero of
 * the 2,725 local transcripts contain a `system`/`init` record. This path is
 * retained as a secondary shape and must not be presented as equally grounded
 * with the on-disk shape above.
 */
const CLAUDE_INIT_KEYS = [
  'type',
  'subtype',
  'model',
  'service_tier',
  'serviceTier',
  'agent',
  'subagent_type',
  'reasoning_effort',
  'effort',
  'request_id',
] as const;
const CLAUDE_RESULT_KEYS = ['type', 'subtype'] as const;
const CLAUDE_MODEL_USAGE_KEYS = ['serviceTier', 'service_tier'] as const;

export const CLAUDE_OBSERVATION_SOURCE = 'claude-session-metadata';

export interface ClaudeRuntimeMetadata {
  /**
   * `root` for a main session, `depth-unknown` for a subagent turn.
   *
   * `isSidechain` is the only lineage signal Claude emits and it is binary. No
   * depth, nesting, level, or ancestry key appears on any of the 141,078
   * captured assistant entries, and `parentUuid` never crosses an `agentId`
   * boundary, so it chains messages within one agent rather than agents to
   * each other. A depth number is therefore not derivable and is not invented.
   */
  childLineage: string | null;
  /** Observed role, from `attributionAgent`; `null` when the run reports none. */
  role: string | null;
  model: string | null;
  effort: string | null;
  serviceTier: string | null;
  /**
   * OAT request correlation declared by the provider, for parity with the Codex
   * parser. Claude declares none, so this is `null` on a real transcript.
   * Claude's own `requestId` is a per-turn API identifier and its `sessionId` a
   * transcript identifier; neither is an OAT dispatch request id, so neither is
   * equality-checked against one.
   */
  requestId: string | null;
  /** Provider session identifier, used to prove the envelope is one session. */
  sessionId: string | null;
}

interface ClaudeTurn {
  isSidechain: boolean | null;
  effort: string | null;
  sessionId: string | null;
  model: string | null;
  serviceTier: string | null;
  requestId: string | null;
  role: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
 * The two explicit key paths inside `message`. Reaching them by path is what
 * makes the projection narrow; a spread or key-filter would touch
 * `message.content` on the way.
 */
function messageMetadata(entry: Record<string, unknown>): {
  model: unknown;
  serviceTier: unknown;
} {
  const message = entry.message;
  if (!isRecord(message)) return { model: undefined, serviceTier: undefined };
  const usage = message.usage;
  return {
    model: message.model,
    serviceTier: isRecord(usage) ? usage.service_tier : undefined,
  };
}

function firstModelUsage(
  entry: Record<string, unknown>,
): { model: string | null; serviceTier: string | null } | null {
  const usage = entry.modelUsage;
  if (!isRecord(usage)) return null;
  const [name, detail] = Object.entries(usage)[0] ?? [];
  if (name === undefined) return null;
  return {
    model: observedValue(name),
    serviceTier: isRecord(detail)
      ? observedValue(detail.serviceTier ?? detail.service_tier)
      : null,
  };
}

/**
 * Project raw Claude entries down to exactly what this parser reads.
 *
 * A caller may hand over an unmodified transcript. Conversation entries keep
 * their discriminator and nothing else; an assistant entry keeps its
 * allowlisted metadata plus a `message` rebuilt from two key paths. A real
 * stream-json `result` record carries the final assistant answer under the key
 * `result`, which matches no sensitive-key family — projection drops it
 * outright rather than accepting and ignoring it.
 */
export function projectClaudeMetadataEntries(
  entries: readonly unknown[],
): unknown[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    if (!isRecord(entry)) return {};
    const type = entry.type;
    if (type === 'assistant') {
      const projected = pick(entry, CLAUDE_ASSISTANT_KEYS);
      const { model, serviceTier } = messageMetadata(entry);
      const message: Record<string, unknown> = {};
      if (model !== undefined) message.model = model;
      if (serviceTier !== undefined) {
        message.usage = { service_tier: serviceTier };
      }
      if (Object.keys(message).length > 0) projected.message = message;
      return projected;
    }
    if (type === 'system' && entry.subtype === 'init') {
      return pick(entry, CLAUDE_INIT_KEYS);
    }
    if (type === 'result') {
      const projected = pick(entry, CLAUDE_RESULT_KEYS);
      const usage = entry.modelUsage;
      if (isRecord(usage)) {
        projected.modelUsage = Object.fromEntries(
          Object.entries(usage).map(([model, detail]) => [
            model,
            isRecord(detail) ? pick(detail, CLAUDE_MODEL_USAGE_KEYS) : {},
          ]),
        );
      }
      return projected;
    }
    // A conversation entry keeps its discriminator and nothing else.
    return { type: typeof type === 'string' ? type : null };
  });
}

function assistantTurn(entry: Record<string, unknown>): ClaudeTurn {
  const { model, serviceTier } = messageMetadata(entry);
  return {
    isSidechain:
      typeof entry.isSidechain === 'boolean' ? entry.isSidechain : null,
    effort: observedValue(entry.effort),
    sessionId: observedValue(entry.sessionId ?? entry.session_id),
    model: observedValue(model),
    serviceTier: observedValue(serviceTier),
    requestId: null,
    // Role only. It never contributes to lineage: `isSidechain` is the sole
    // lineage signal, and inferring depth from a role name would be exactly
    // the invention this parser was rewritten to remove.
    role: observedValue(entry.attributionAgent),
  };
}

/** Secondary, unverified stream-json shape; see CLAUDE_INIT_KEYS. */
function streamJsonTurn(entry: Record<string, unknown>): ClaudeTurn | null {
  if (entry.type === 'system' && entry.subtype === 'init') {
    return {
      isSidechain: null,
      effort: observedValue(entry.reasoning_effort ?? entry.effort),
      sessionId: null,
      model: observedValue(entry.model),
      serviceTier: observedValue(entry.service_tier ?? entry.serviceTier),
      requestId: observedValue(entry.request_id),
      role: observedValue(entry.agent ?? entry.subagent_type),
    };
  }
  if (entry.type === 'result') {
    const usage = firstModelUsage(entry);
    if (usage === null) return null;
    return {
      isSidechain: null,
      effort: null,
      sessionId: null,
      model: usage.model,
      serviceTier: usage.serviceTier,
      requestId: null,
      role: null,
    };
  }
  return null;
}

/**
 * Extract the child's metadata from Claude transcript entries.
 *
 * The applicable turn is the last one: it is the most recent state the session
 * reported. Earlier turns fill only the fields the last one left unreported.
 * Returns `null` when no Claude metadata is present, or when the entries mix
 * sessions — every captured transcript carries exactly one `sessionId`, so more
 * than one means no single applicable child exists.
 */
export function extractClaudeRuntimeMetadata(
  entries: readonly unknown[],
): ClaudeRuntimeMetadata | null {
  if (!Array.isArray(entries)) return null;
  const turns: ClaudeTurn[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    // Classification is by discriminator alone.
    if (entry.type === 'assistant') {
      turns.push(assistantTurn(entry));
      continue;
    }
    const fallback = streamJsonTurn(entry);
    if (fallback !== null) turns.push(fallback);
  }
  if (turns.length === 0) return null;

  const sessions = new Set(
    turns
      .map((turn) => turn.sessionId)
      .filter((value): value is string => value !== null),
  );
  if (sessions.size > 1) return null;

  const applicable = turns.at(-1);
  if (!applicable) return null;
  let model: string | null = null;
  let effort: string | null = null;
  let serviceTier: string | null = null;
  let requestId: string | null = null;
  let role: string | null = null;
  for (const turn of turns) {
    model = turn.model ?? model;
    effort = turn.effort ?? effort;
    serviceTier = turn.serviceTier ?? serviceTier;
    requestId = turn.requestId ?? requestId;
    role = turn.role ?? role;
  }

  return {
    childLineage:
      applicable.isSidechain === null
        ? null
        : applicable.isSidechain
          ? 'depth-unknown'
          : 'root',
    role,
    model,
    effort,
    serviceTier,
    requestId,
    sessionId: [...sessions][0] ?? null,
  };
}

/**
 * Produce one source-qualified Claude runtime observation.
 *
 * Returns `not-reported` when no Claude metadata is present, when the entries
 * mix sessions, or when the provider declares a different OAT request. A parse
 * failure never falls back to the configured invocation.
 */
export function parseClaudeRuntimeObservation(input: {
  entries: readonly unknown[];
  observedAt: string;
  requestId?: string;
  configured?: ConfiguredInvocationForObservation | null;
}): RuntimeObservation {
  const metadata = extractClaudeRuntimeMetadata(input.entries);
  if (metadata === null) return { status: 'not-reported' };
  if (
    input.requestId !== undefined &&
    metadata.requestId !== null &&
    metadata.requestId !== input.requestId
  ) {
    return { status: 'not-reported' };
  }
  return buildRuntimeObservation({
    provider: 'claude',
    source: CLAUDE_OBSERVATION_SOURCE,
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
