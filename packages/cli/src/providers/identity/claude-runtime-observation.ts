import { observationIdentifier as observedValue } from './oat-dispatch-record';

/**
 * Claude runtime metadata parsing.
 *
 * Field paths here are taken from real on-disk transcripts under
 * `~/.claude/projects/`, not from assumption. Every corpus figure in this file
 * is an operator-environment observation as of 2026-09-02 on the capturing
 * operator's machine, not a provider guarantee: a later mismatch means the
 * corpus moved, not that the claim was wrong.
 *
 * An earlier revision read only `system`/`init` and `result` records; a scan of
 * all 2,725 local transcripts found `"subtype":"init"` in zero of them, so that parser returned
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
 * The complete entry-level read surface for an `assistant` entry. `message` is
 * handled separately by explicit path and is deliberately absent from this
 * list, so this plus `message.model` and `message.usage.service_tier` is
 * everything the parser touches. Exported so a test can pin it: a future widening
 * has to change this list, in view, rather than slip in at a call site.
 *
 * `attributionAgent` is the role identifier and is the same class of signal
 * Codex carries as `agent_role`: a bounded enum-like name, not conversation
 * content. Across 2,725 captured transcripts it took 8 distinct values, all
 * of which pass the shared identifier validator, with a longest value of 21
 * characters against the 256 bound. It appears on subagent turns only, so a
 * main session reports no role rather than a synthesized one.
 */
export const CLAUDE_ASSISTANT_KEYS = [
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
 * the 2,725 observed local transcripts contained a `system`/`init` record. This path is
 * retained as a secondary shape and must not be presented as equally grounded
 * with the on-disk shape above.
 */
export const CLAUDE_INIT_KEYS = [
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

export const CLAUDE_OBSERVATION_SOURCE = 'claude-session-metadata';

export interface ClaudeRuntimeMetadata {
  /**
   * `root` for a main session, `depth-unknown` for a subagent turn.
   *
   * `isSidechain` is the only lineage signal Claude emits and it is binary. No
   * depth, nesting, level, or ancestry key appeared on any of the 141,078
   * observed assistant entries, and `parentUuid` never crosses an `agentId`
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
 * Neutral observation facts for the cross-provider projection.
 *
 * The single-session guarantee runs in-process inside
 * {@link extractClaudeRuntimeMetadata}, so `sessionId` never needs to survive
 * into the projected output — which matters, because `sessionId` classifies
 * sensitive and previously made every real transcript unrecordable.
 */
export function observeClaudeRuntimeFacts(entries: readonly unknown[]): {
  lineage: string | null;
  role: string | null;
  model: string | null;
  effort: string | null;
  serviceTier: string | null;
  correlation: string | null;
} | null {
  const metadata = extractClaudeRuntimeMetadata(entries);
  if (metadata === null) return null;
  return {
    lineage: metadata.childLineage,
    role: metadata.role,
    model: metadata.model,
    effort: metadata.effort,
    serviceTier: metadata.serviceTier,
    correlation: metadata.requestId,
  };
}
