import {
  buildRuntimeObservation,
  observationIdentifier as observedValue,
  NOT_EXPOSED_OBSERVATION_VALUE,
  type ConfiguredInvocationForObservation,
  type RuntimeObservation,
} from './oat-dispatch-record';

/**
 * Claude runtime metadata parsing.
 *
 * Claude reports session identity on its `system`/`init` record and closing
 * model usage on its `result` record. Both are metadata. Conversation entries
 * (`assistant`, `user`, and anything else) are skipped on their `type`
 * discriminator alone, so no `message` body is ever reached.
 *
 * Claude exposes no selectable reasoning-effort axis for a native child. When
 * Claude metadata is present but states no effort, the axis is recorded as the
 * literal `not-exposed` rather than left blank or filled from the request:
 * "the provider does not expose this" is a different fact from "the provider
 * did not say", and neither is evidence of agreement or disagreement.
 */

/** Entry types whose fields are metadata rather than conversation content. */
export const CLAUDE_METADATA_ENTRY_TYPES = ['system', 'result'] as const;

export const CLAUDE_OBSERVATION_SOURCE = 'claude-session-metadata';

export interface ClaudeRuntimeMetadata {
  role: string | null;
  model: string | null;
  effort: string;
  serviceTier: string | null;
  /** Request correlation declared by the session itself, when present. */
  requestId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
 * Extract the child's metadata from Claude session entries.
 *
 * Later metadata supplements earlier metadata field by field; it never replaces
 * a value with a blank one. Returns `null` when no Claude metadata entry is
 * present at all, so an absent transcript stays `not-reported`.
 */
export function extractClaudeRuntimeMetadata(
  entries: readonly unknown[],
): ClaudeRuntimeMetadata | null {
  if (!Array.isArray(entries)) return null;
  let seen = false;
  let role: string | null = null;
  let model: string | null = null;
  let effort: string | null = null;
  let serviceTier: string | null = null;
  let requestId: string | null = null;

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const type = entry.type;
    // Classification is by discriminator alone; conversation entries are never
    // opened.
    if (
      typeof type !== 'string' ||
      !(CLAUDE_METADATA_ENTRY_TYPES as readonly string[]).includes(type)
    ) {
      continue;
    }
    if (type === 'system' && entry.subtype === 'init') {
      seen = true;
      role = role ?? observedValue(entry.agent ?? entry.subagent_type);
      model = model ?? observedValue(entry.model);
      effort = effort ?? observedValue(entry.reasoning_effort ?? entry.effort);
      serviceTier =
        serviceTier ?? observedValue(entry.service_tier ?? entry.serviceTier);
      requestId = requestId ?? observedValue(entry.request_id);
      continue;
    }
    if (type === 'result') {
      const usage = firstModelUsage(entry);
      if (usage === null) continue;
      seen = true;
      model = model ?? usage.model;
      serviceTier = serviceTier ?? usage.serviceTier;
    }
  }

  if (!seen) return null;
  return {
    role,
    model,
    // Claude exposes no selectable effort axis for a native child.
    effort: effort ?? NOT_EXPOSED_OBSERVATION_VALUE,
    serviceTier,
    requestId,
  };
}

/**
 * Produce one source-qualified Claude runtime observation.
 *
 * Returns `not-reported` when no Claude metadata is present or when the session
 * correlates to a different request. A parse failure never falls back to the
 * configured invocation.
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
      role: metadata.role,
      model: metadata.model,
      effort: metadata.effort,
      serviceTier: metadata.serviceTier,
    },
    configured: input.configured ?? null,
  });
}
