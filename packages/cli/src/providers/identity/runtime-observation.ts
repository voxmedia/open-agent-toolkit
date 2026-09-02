import { z } from 'zod';

import {
  parseClaudeRuntimeObservation,
  projectClaudeMetadataEntries,
} from './claude-runtime-observation';
import {
  parseCodexRuntimeObservation,
  projectCodexMetadataEntries,
} from './codex-runtime-observation';
import type { GenericDispatchRecord } from './generic-dispatch-record';
import {
  configuredInvocationForObservation,
  type RuntimeObservation,
} from './oat-dispatch-record';

/**
 * Cross-provider runtime observation normalizer.
 *
 * This is the one place a provider's sanitized post-launch metadata is turned
 * into the record's optional observation layer. It reads the immutable
 * configured invocation only to compare against it: launch, fallback, and every
 * configured control are untouched, and a mismatch or absence is evidence
 * rather than authorization.
 *
 * Observation is capability-gated. A provider with no metadata channel — Cursor
 * today — stays explicitly `not-reported` instead of having requested arguments
 * or materialized pins copied into observed state.
 */

const OBSERVING_PROVIDERS: ReadonlySet<string> = new Set(['codex', 'claude']);

/**
 * Bound on how much provider metadata one observation may be derived from. The
 * entries are never persisted, but an unbounded input would still be unbounded
 * work at a durable-write boundary.
 */
const MAX_ENVELOPE_ENTRIES = 5000;

const runtimeObservationEnvelopeSchema = z
  .object({
    provider: z.string().min(1).max(256),
    observedAt: z.string().datetime(),
    entries: z.array(z.unknown()).max(MAX_ENVELOPE_ENTRIES),
  })
  .strict();

export type RuntimeObservationEnvelope = z.infer<
  typeof runtimeObservationEnvelopeSchema
>;

/**
 * Project raw provider metadata through the owning parser's allowlist.
 *
 * Callers may hand over unmodified provider output; only the fields a parser
 * can actually read survive, and an unsupported provider yields nothing at all.
 * The record boundary asserts the projection rather than the raw input, so the
 * allowlist — not caller discipline — is what keeps conversation content out.
 */
export function projectRuntimeMetadataEntries(
  provider: string,
  entries: readonly unknown[],
): unknown[] {
  if (!providerSupportsRuntimeObservation(provider)) return [];
  return provider === 'codex'
    ? projectCodexMetadataEntries(entries)
    : projectClaudeMetadataEntries(entries);
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
