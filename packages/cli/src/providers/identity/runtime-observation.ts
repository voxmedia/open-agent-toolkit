import { z } from 'zod';

import {
  observeClaudeRuntimeFacts,
  parseClaudeRuntimeObservation,
} from './claude-runtime-observation';
import {
  observeCodexRuntimeFacts,
  parseCodexRuntimeObservation,
} from './codex-runtime-observation';
import type { GenericDispatchRecord } from './generic-dispatch-record';
import {
  buildRuntimeObservation,
  configuredInvocationForObservation,
  type RuntimeObservation,
} from './oat-dispatch-record';

/**
 * Cross-provider runtime observation normalizer.
 *
 * This is the one place a provider's post-launch metadata is turned into the
 * record's optional observation layer. It reads the immutable configured
 * invocation only to compare against it: launch, fallback, and every configured
 * control are untouched, and a mismatch or absence is evidence rather than
 * authorization.
 *
 * Observation is capability-gated. A provider with no metadata channel — Cursor
 * today — stays explicitly `not-reported` instead of having requested arguments
 * or materialized pins copied into observed state.
 *
 * ## Why projection emits a neutral shape
 *
 * The projection deliberately does **not** mirror the provider's own entry
 * shape. An earlier revision emitted provider-shaped entries, which carried
 * `sessionId` and a synthesized `message` into the output; both classify
 * sensitive under the Phase 6 key classifier, so every real Claude transcript
 * was refused at the durable-write boundary and the whole record write aborted.
 * Mirroring a source shape means inheriting its key names, and a provider is
 * free to name a field anything.
 *
 * Projection therefore emits {@link ObservedRuntimeFacts}: a flat, closed set
 * of purpose-built keys owned by this module. Provider-specific parsing happens
 * entirely inside the provider modules and nothing of the source shape escapes
 * them, so no upstream rename can reintroduce a collision. The keys are checked
 * against the classifier by `neutral projection keys are not sensitive` in this
 * module's tests.
 */

const OBSERVING_PROVIDERS: ReadonlySet<string> = new Set(['codex', 'claude']);

/**
 * Bound on how much provider metadata one observation may be derived from. The
 * entries are never persisted, but an unbounded input would still be unbounded
 * work at a durable-write boundary.
 */
const MAX_ENVELOPE_ENTRIES = 5000;
const MAX_ENVELOPE_BYTES = 16 * 1024 * 1024;

/**
 * Envelope shape only. Size is deliberately *not* enforced here.
 *
 * A shape, provider, or content violation is a caller error and fails closed.
 * A size violation is not: the observation layer is optional and
 * non-authoritative, so refusing an oversized transcript by throwing would
 * destroy the mandatory record write over an optional attachment. Size is
 * checked separately and degrades to `not-reported`.
 */
const runtimeObservationEnvelopeSchema = z
  .object({
    provider: z.string().min(1).max(256),
    observedAt: z.string().datetime(),
    entries: z.array(z.unknown()),
  })
  .strict();

/**
 * True when the envelope is too large to project. Bounded work at a
 * durable-write boundary, stated in the same terms as every other dispatch
 * bound, but degrading rather than fatal.
 */
export function runtimeObservationEnvelopeExceedsBounds(
  entries: readonly unknown[],
): boolean {
  if (entries.length > MAX_ENVELOPE_ENTRIES) return true;
  return (
    new TextEncoder().encode(JSON.stringify(entries) ?? 'null').length >
    MAX_ENVELOPE_BYTES
  );
}

/**
 * The closed, neutral set of facts an observation can carry.
 *
 * Every key is owned by this module and checked against the sensitive-key
 * classifier. Provider field names never appear here, so a provider renaming a
 * field cannot change what the boundary sees.
 */
export interface ObservedRuntimeFacts {
  lineage?: string | null;
  role?: string | null;
  model?: string | null;
  effort?: string | null;
  serviceTier?: string | null;
  /** Provider-declared OAT request correlation, when the provider states one. */
  correlation?: string | null;
}

export const OBSERVED_RUNTIME_FACT_KEYS = [
  'lineage',
  'role',
  'model',
  'effort',
  'serviceTier',
  'correlation',
] as const;

export type RuntimeObservationEnvelope = z.infer<
  typeof runtimeObservationEnvelopeSchema
>;

/**
 * Project raw provider output down to the neutral fact set.
 *
 * Callers may hand over an unmodified rollout or transcript. All provider
 * parsing happens inside the provider module; only the neutral facts come back,
 * so nothing of the source shape — including its key names — reaches the
 * boundary. Returns `null` for an unsupported provider, an over-bound envelope,
 * or output that yields no facts.
 */
export function projectRuntimeObservationFacts(
  provider: string,
  entries: readonly unknown[],
): ObservedRuntimeFacts | null {
  if (!providerSupportsRuntimeObservation(provider)) return null;
  if (!Array.isArray(entries)) return null;
  if (runtimeObservationEnvelopeExceedsBounds(entries)) return null;
  const facts =
    provider === 'codex'
      ? observeCodexRuntimeFacts(entries)
      : observeClaudeRuntimeFacts(entries);
  if (facts === null) return null;
  // Re-emit through the owned key list so only declared facts can escape.
  const projected: ObservedRuntimeFacts = {};
  for (const key of OBSERVED_RUNTIME_FACT_KEYS) {
    const value = facts[key];
    if (typeof value === 'string' && value !== '') projected[key] = value;
  }
  return Object.keys(projected).length > 0 ? projected : null;
}

/**
 * Build the observation from already-projected neutral facts.
 *
 * `source` names the path that produced the evidence and is supplied by the
 * caller of this function, never by the dispatch caller.
 */
export function observationFromFacts(input: {
  record: GenericDispatchRecord;
  provider: string;
  source: string;
  observedAt: string;
  facts: ObservedRuntimeFacts | null;
}): RuntimeObservation {
  if (input.facts === null) return { status: 'not-reported' };
  const { correlation: _correlation, lineage, ...axes } = input.facts;
  return buildRuntimeObservation({
    provider: input.provider,
    source: input.source,
    observedAt: input.observedAt,
    metadata: { childLineage: lineage, ...axes },
    configured: configuredInvocationForObservation(input.record),
  });
}

export function providerSupportsRuntimeObservation(provider: string): boolean {
  return OBSERVING_PROVIDERS.has(provider);
}

/**
 * Validate the envelope shape. Provider metadata entries stay opaque here: the
 * parsers read only allowlisted metadata fields out of them, and only the
 * extracted identifiers ever reach the strict observation schema.
 */
export function parseRuntimeObservationEnvelope(
  value: unknown,
): RuntimeObservationEnvelope {
  return runtimeObservationEnvelopeSchema.parse(value);
}

/**
 * Normalize one provider metadata envelope into a runtime observation.
 *
 * Returns `not-reported` when the provider exposes no metadata channel, when
 * the envelope does not describe the record's own provider, or when parsing
 * finds nothing. The record is never mutated.
 */
export function normalizeRuntimeObservation(input: {
  record: GenericDispatchRecord;
  envelope: RuntimeObservationEnvelope;
}): RuntimeObservation {
  const { record, envelope } = input;
  if (envelope.provider !== record.provider) {
    return { status: 'not-reported' };
  }
  if (!providerSupportsRuntimeObservation(envelope.provider)) {
    return { status: 'not-reported' };
  }
  const parserInput = {
    entries: envelope.entries,
    observedAt: envelope.observedAt,
    requestId: record.request_id,
    configured: configuredInvocationForObservation(record),
  };
  return envelope.provider === 'codex'
    ? parseCodexRuntimeObservation(parserInput)
    : parseClaudeRuntimeObservation(parserInput);
}
