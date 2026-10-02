import { z } from 'zod';

import { redactAbsolutePathsDeep } from './absolute-paths';
import {
  assertBoundedDispatchRecordSize,
  assertNoSensitiveDispatchContent,
  genericDispatchRecordSchema,
  normalizeDispatchKey,
  parseGenericDispatchRecord,
  type GenericDispatchRecord,
} from './generic-dispatch-record';

/**
 * A pre-start native-selection rejection is a closed event set. It is proof
 * that the native launch surface refused the exact target before any child
 * started, and it is the only category that can authorize one canonical
 * fallback. It is deliberately disjoint from terminal child-outcome codes.
 */
export const QUALIFYING_PRE_START_REJECTION_CODES = [
  'native-role-unavailable',
  'native-target-unavailable',
  'native-selector-unsupported',
  'native-catalog-unsatisfying',
  'capability-unresolved-or-unsupported',
  'wrapper-payload-rejected',
  'wrapper-launch-refused',
] as const;

export type QualifyingPreStartRejectionCode =
  (typeof QUALIFYING_PRE_START_REJECTION_CODES)[number];

/**
 * Terminal or post-acceptance outcome families. None of these ever authorizes
 * replacement, so they are rejected with an explicit diagnostic rather than
 * falling through the generic closed-set message.
 */
const PROHIBITED_REJECTION_FAMILIES: readonly {
  term: string;
  category: string;
}[] = [
  { term: 'timeout', category: 'timeout' },
  { term: 'timedout', category: 'timeout' },
  { term: 'deadlineexceeded', category: 'timeout' },
  { term: 'blocked', category: 'BLOCKED' },
  { term: 'refus', category: 'refusal' },
  { term: 'declin', category: 'refusal' },
  { term: 'interrupt', category: 'interruption' },
  { term: 'cancel', category: 'interruption' },
  { term: 'abort', category: 'interruption' },
  { term: 'mismatch', category: 'runtime mismatch' },
  { term: 'missingtelemetry', category: 'missing telemetry' },
  { term: 'notreported', category: 'missing telemetry' },
  { term: 'malformed', category: 'malformed output' },
  { term: 'postacceptance', category: 'post-acceptance' },
  { term: 'postlaunch', category: 'post-acceptance' },
  { term: 'poststart', category: 'post-acceptance' },
];

function prohibitedRejectionCategory(code: string): string | null {
  const normalized = normalizeDispatchKey(code);
  return (
    PROHIBITED_REJECTION_FAMILIES.find(({ term }) => normalized.includes(term))
      ?.category ?? null
  );
}

const preStartRejectionCodeSchema = z
  .string()
  .min(1)
  .superRefine((code, context) => {
    // The closed qualifying set is authoritative. Family classification only
    // supplies a better diagnostic for a code that is already not qualifying.
    if (
      (QUALIFYING_PRE_START_REJECTION_CODES as readonly string[]).includes(code)
    ) {
      return;
    }
    const prohibited = prohibitedRejectionCategory(code);
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        prohibited === null
          ? `Pre-start rejection code must be one of the qualifying codes: ${QUALIFYING_PRE_START_REJECTION_CODES.join(', ')}.`
          : `A ${prohibited} outcome is not a pre-start native-selection rejection and never authorizes fallback or replacement.`,
    });
  });

const redactedPathSchema = z
  .string()
  .regex(
    /^<(?:loaded|user|project)>\/agents\/[a-z0-9][a-z0-9_-]*\.md$/,
    'expected <loaded|user|project>/agents/<name>.md',
  );
const candidateMissSchema = z
  .object({
    tier: z.enum(['loaded', 'user', 'project']),
    candidate: redactedPathSchema,
    outcome: z.enum([
      'missing',
      'broken-symlink',
      'escaping-symlink',
      'noncanonical-copy',
      'wrong-target',
      'invalid-role',
    ]),
  })
  .strict();
const resolvedRoleSchema = z
  .object({
    status: z.literal('resolved'),
    dependency: z.string().min(1),
    canonicalRole: z.string().min(1),
    tier: z.enum(['loaded', 'user', 'project']),
    validation: z.enum(['direct-canonical', 'exact-canonical-symlink']),
    canonicalPath: redactedPathSchema,
    selectedPath: redactedPathSchema,
    roleVersion: z.string().min(1),
    contentDigest: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/, 'expected sha256:<64 lowercase hex>'),
    candidateMisses: z.array(candidateMissSchema),
  })
  .strict();
const missingRoleSchema = z
  .object({
    status: z.literal('missing'),
    dependency: z.string().min(1),
    canonicalRole: z.string().min(1),
    candidateMisses: z.array(candidateMissSchema),
    recovery: z.array(z.object({ command: z.string().min(1) }).strict()).min(1),
  })
  .strict();
const canonicalRoleSchema = z.discriminatedUnion('status', [
  resolvedRoleSchema,
  missingRoleSchema,
]);

const rejectionSchema = z
  .object({
    code: preStartRejectionCodeSchema,
    rejectedAt: z.string().datetime(),
    provesNoChildStarted: z.literal(true),
  })
  .strict();

const exactTargetSchema = z
  .object({
    provider: z.string().min(1),
    modelSelector: z.string().min(1).nullable(),
    effortSelector: z.string().min(1).nullable(),
    reasoningModeSelector: z.string().min(1).nullable(),
    serviceTierSelector: z.string().min(1).nullable(),
    selectedRoute: z.string().min(1),
  })
  .strict();

export type ExactTargetRef = z.infer<typeof exactTargetSchema>;

const fallbackDispatchSchema = z
  .object({
    status: z.literal('fallback-dispatch'),
    triggerRequestId: z.string().min(1),
    fallbackRequestId: z.string().min(1),
    trigger: z.literal('pre-start-rejection'),
    fallbackReason: z.string().min(1),
    kind: z.literal('canonical-instruction-fresh-child'),
    approximation: z.literal(true),
    preservedTarget: exactTargetSchema,
    rejection: rejectionSchema.extend({
      source: z.literal('provider-wrapper'),
    }),
    roleInstructions: resolvedRoleSchema,
  })
  .strict();
const fallbackSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('not-applicable'),
      reason: z.string().min(1),
    })
    .strict(),
  fallbackDispatchSchema,
]);

/**
 * Observation values are provider-reported identifiers, not prose. They are
 * bounded at the same 256-character caller-authored identifier limit the
 * generic record uses, so a transcript body cannot ride in through an
 * optional metadata field.
 */
const MAX_OBSERVATION_VALUE_LENGTH = 256;

/**
 * Provider identifiers only. Neither `/` nor `:` appears in any observed model,
 * effort, tier, role, lineage, or source value, and admitting them let absolute
 * paths (`C:/Users/...`), relative path-ish values, and URLs through in some
 * spellings while NFR1 only ever intended none. Excluding both separators
 * closes every spelling at once rather than denying them one at a time.
 */
const OBSERVATION_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The axes an observation and a configured invocation can be compared on. */
const COMPARED_OBSERVATION_AXES = [
  'role',
  'model',
  'effort',
  'serviceTier',
] as const;

/**
 * The single canonical observation-value validator. Both the metadata path and
 * a caller-supplied observation resolve through it, so a value can never be
 * stored on one path that would be refused on the other.
 */
export function observationIdentifier(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_OBSERVATION_VALUE_LENGTH) {
    return null;
  }
  return OBSERVATION_IDENTIFIER_PATTERN.test(trimmed) ? trimmed : null;
}

const observationValue = () =>
  z
    .string()
    .min(1)
    .max(MAX_OBSERVATION_VALUE_LENGTH)
    .regex(
      OBSERVATION_IDENTIFIER_PATTERN,
      'Observation values must be provider identifiers.',
    );

const runtimeObservationSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not-reported') }).strict(),
  z
    .object({
      status: z.literal('reported'),
      provider: observationValue(),
      childLineage: observationValue().optional(),
      role: observationValue().optional(),
      model: observationValue().optional(),
      effort: observationValue().optional(),
      serviceTier: observationValue().optional(),
      source: observationValue(),
      observedAt: z.string().datetime(),
      match: z.enum(['matching', 'mismatching', 'not-comparable']),
      /**
       * The axes the verdict actually rests on. Optional so a record written
       * before this field existed still parses, but always written now: a
       * `matching` that rests on one incidental axis is a materially weaker
       * claim than one resting on model and role, and a consumer reading only
       * the scalar `match` cannot tell them apart.
       */
      comparedAxes: z
        .array(observationValue())
        .max(COMPARED_OBSERVATION_AXES.length)
        .optional(),
    })
    .strict(),
]);

/**
 * The comparable axes a provider may report about its own child. Every field is
 * optional: a provider that does not expose an axis reports nothing for it, and
 * an axis a provider genuinely does not have reports the literal `not-exposed`.
 * That value is reserved for a truly absent axis: an axis that simply went
 * unreported on a given run is left absent instead, so the two cases stay
 * distinguishable.
 * Nothing here is ever populated from the configured invocation.
 */
export interface ObservedRuntimeMetadata {
  childLineage?: string | null;
  role?: string | null;
  model?: string | null;
  effort?: string | null;
  serviceTier?: string | null;
}

/**
 * The immutable configured invocation an observation is compared against. It is
 * read-only input to the comparison and is never written into an observation.
 *
 * An axis may carry several equally authoritative configured spellings — a
 * canonical role name and the materialized native selector that expresses it,
 * for example. Observing any one of them is agreement; treating the alternate
 * spelling as disagreement would manufacture a false mismatch.
 */
export type ConfiguredObservationAxis =
  | string
  | readonly string[]
  | null
  | undefined;

export interface ConfiguredInvocationForObservation {
  role?: ConfiguredObservationAxis;
  model?: ConfiguredObservationAxis;
  effort?: ConfiguredObservationAxis;
  serviceTier?: ConfiguredObservationAxis;
}

/** The literal an axis carries when the provider exposes no selectable value. */
export const NOT_EXPOSED_OBSERVATION_VALUE = 'not-exposed';

/**
 * Project the record's immutable configured selection axes for comparison.
 *
 * This is a read-only projection: it never mutates the record, and its output
 * is only ever compared against, never copied into, an observation.
 */
export function configuredInvocationForObservation(
  record: GenericDispatchRecord,
): ConfiguredInvocationForObservation {
  const roles = [record.role_name, record.role_selector].filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );
  return {
    role: [...new Set(roles)],
    model: record.model_selector,
    effort: record.effort_selector,
    serviceTier: record.service_tier_selector ?? null,
  };
}

export type RuntimeObservationMatch =
  | 'matching'
  | 'mismatching'
  | 'not-comparable';

/**
 * Values that name the absence of an axis rather than a runtime fact. They can
 * never establish agreement or disagreement, so they are excluded from the
 * comparable set instead of being compared as literal strings.
 */
const NON_COMPARABLE_OBSERVED_VALUES: ReadonlySet<string> = new Set([
  NOT_EXPOSED_OBSERVATION_VALUE,
  'not-reported',
  'unknown',
]);

function comparableValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return NON_COMPARABLE_OBSERVED_VALUES.has(trimmed.toLowerCase())
    ? null
    : trimmed.toLowerCase();
}

function comparableValues(axis: ConfiguredObservationAxis): string[] {
  const values = typeof axis === 'string' ? [axis] : (axis ?? []);
  return values
    .map(comparableValue)
    .filter((value): value is string => value !== null);
}

/**
 * Compare observed metadata with the configured invocation.
 *
 * Only axes both sides report are compared. With no comparable axis the result
 * is `not-comparable` rather than `matching`: silence is never agreement. A
 * mismatch is evidence only — it never authorizes replacement, retry, or
 * fallback.
 */
export function comparedObservationAxes(
  metadata: ObservedRuntimeMetadata,
  configured: ConfiguredInvocationForObservation | null | undefined,
): string[] {
  return COMPARED_OBSERVATION_AXES.filter(
    (axis) =>
      comparableValue(metadata[axis]) !== null &&
      comparableValues(configured?.[axis]).length > 0,
  );
}

export function compareObservedRuntimeMetadata(
  metadata: ObservedRuntimeMetadata,
  configured: ConfiguredInvocationForObservation | null | undefined,
): RuntimeObservationMatch {
  const compared = comparedObservationAxes(metadata, configured);
  if (compared.length === 0) return 'not-comparable';
  const mismatched = compared.some((axis) => {
    const observed = comparableValue(metadata[axis as 'model']);
    const expected = comparableValues(configured?.[axis as 'model']);
    return observed === null || !expected.includes(observed);
  });
  return mismatched ? 'mismatching' : 'matching';
}

/**
 * Build one source-qualified runtime observation.
 *
 * Absent, empty, or schema-invalid metadata yields `not-reported`. The
 * configured invocation is only ever read for the comparison, so a parse
 * failure cannot copy a requested value into observed state.
 */
export function buildRuntimeObservation(input: {
  provider: string;
  source: string;
  observedAt: string;
  metadata: ObservedRuntimeMetadata | null;
  configured?: ConfiguredInvocationForObservation | null;
}): RuntimeObservation {
  const metadata = input.metadata;
  if (metadata === null) return { status: 'not-reported' };
  assertNoSensitiveDispatchContent(metadata, '<observation>');
  const reported: Record<string, string> = {};
  for (const axis of ['childLineage', ...COMPARED_OBSERVATION_AXES] as const) {
    const value = metadata[axis];
    if (typeof value === 'string' && value.trim() !== '') {
      reported[axis] = value;
    }
  }
  if (Object.keys(reported).length === 0) return { status: 'not-reported' };

  const candidate = {
    status: 'reported' as const,
    provider: input.provider,
    ...reported,
    source: input.source,
    observedAt: input.observedAt,
    match: compareObservedRuntimeMetadata(metadata, input.configured),
    comparedAxes: comparedObservationAxes(metadata, input.configured),
  };
  const parsed = runtimeObservationSchema.safeParse(candidate);
  return parsed.success ? parsed.data : { status: 'not-reported' };
}

/**
 * Record shape only. The fallback claim and the fallback link were published
 * through the removed dispatch journal; no event kind writes either now, so a
 * validated record carries `fallbackClaim: null` and a `not-applicable`
 * fallback. The fields stay so the validated output keeps its shape.
 */
const fallbackClaimSchema = z
  .object({
    fallbackRequestId: z.string().min(1),
    claimedAt: z.string().datetime(),
  })
  .strict();

export type FallbackClaim = z.infer<typeof fallbackClaimSchema>;

const oatRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    canonicalRole: canonicalRoleSchema.nullable(),
    preStartRejection: rejectionSchema.nullable(),
    fallbackClaim: fallbackClaimSchema.nullable().default(null),
    fallback: fallbackSchema,
    runtimeObservation: runtimeObservationSchema,
  })
  .strict();

export const persistedOatDispatchRecordSchema = genericDispatchRecordSchema
  .innerType()
  .extend({ oat: oatRecordSchema })
  .strict();

/**
 * Strict observation parse. Used where a caller supplied the observation
 * directly, so a malformed value is refused rather than quietly degraded to
 * `not-reported` — absent evidence and a bad claim are different facts.
 */
export function parseRuntimeObservation(value: unknown): RuntimeObservation {
  return runtimeObservationSchema.parse(value);
}

export type CanonicalFallbackEvidence = z.infer<typeof fallbackSchema>;
export type RuntimeObservation = z.infer<typeof runtimeObservationSchema>;
export type PersistedOatDispatchRecordV1 = z.infer<
  typeof persistedOatDispatchRecordSchema
>;

const oatDispatchEvidenceEventSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('canonical-role-resolution'),
      requestId: z.string().min(1),
      source: z.literal('canonical-role-resolver'),
      evidence: canonicalRoleSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('pre-start-rejection-attestation'),
      requestId: z.string().min(1),
      source: z.literal('provider-wrapper'),
      expectedLaunchStatus: z.literal('blocked-before-start'),
      rejection: rejectionSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('runtime-observation'),
      requestId: z.string().min(1),
      source: z.literal('runtime-observer'),
      observation: runtimeObservationSchema,
    })
    .strict(),
]);

export type OatDispatchEvidenceEvent = z.infer<
  typeof oatDispatchEvidenceEventSchema
>;

/**
 * Non-throwing event validation, so a caller can report every event issue
 * alongside violations found in other stages of the same input.
 */
export function safeParseOatDispatchEvidenceEvent(
  value: unknown,
): z.SafeParseReturnType<unknown, OatDispatchEvidenceEvent> {
  return oatDispatchEvidenceEventSchema.safeParse(value);
}

function initialOatRecord(): PersistedOatDispatchRecordV1['oat'] {
  return {
    schemaVersion: 1,
    canonicalRole: null,
    preStartRejection: null,
    fallbackClaim: null,
    fallback: { status: 'not-applicable', reason: 'No fallback recorded.' },
    runtimeObservation: { status: 'not-reported' },
  };
}

function genericPart(
  record: GenericDispatchRecord | PersistedOatDispatchRecordV1,
): GenericDispatchRecord {
  const { oat: _oat, ...generic } = record as PersistedOatDispatchRecordV1;
  return parseGenericDispatchRecord(generic);
}

function oatPart(
  record: GenericDispatchRecord | PersistedOatDispatchRecordV1,
): PersistedOatDispatchRecordV1['oat'] {
  return 'oat' in record
    ? oatRecordSchema.parse(record.oat)
    : initialOatRecord();
}

function assertMatchingRequest(
  record: GenericDispatchRecord,
  requestId: string,
): void {
  if (record.request_id !== requestId) {
    throw new Error('OAT event request ID must match the generic record.');
  }
}

export function parsePersistedOatDispatchRecord(
  value: unknown,
): PersistedOatDispatchRecordV1 {
  assertNoSensitiveDispatchContent(value);
  assertBoundedDispatchRecordSize(value);
  const parsed = persistedOatDispatchRecordSchema.parse(value);
  const { oat, ...generic } = parsed;
  const sanitized = {
    ...parseGenericDispatchRecord(generic),
    // The namespaced augmentation is nested evidence throughout — rejection
    // reasons, fallback narration, observation values — so it is redacted
    // rather than rejected. The canonical `<tier>/agents/<role>.md` role form
    // is not an absolute path and survives untouched.
    oat: oatRecordSchema.parse(redactAbsolutePathsDeep(oat)),
  };
  // Same ordering rule as the generic record: the size check above ran on the
  // untransformed input, so it is re-run on the redacted result.
  assertBoundedDispatchRecordSize(sanitized);
  return sanitized;
}

export function augmentDispatchRecord(input: {
  record: GenericDispatchRecord | PersistedOatDispatchRecordV1;
  event: OatDispatchEvidenceEvent;
}): PersistedOatDispatchRecordV1 {
  assertNoSensitiveDispatchContent(input.event);
  const event = oatDispatchEvidenceEventSchema.parse(input.event);
  const record = genericPart(input.record);
  const oat = oatPart(input.record);
  assertMatchingRequest(record, event.requestId);

  switch (event.kind) {
    case 'canonical-role-resolution': {
      if (
        oat.canonicalRole !== null &&
        JSON.stringify(oat.canonicalRole) !== JSON.stringify(event.evidence)
      ) {
        throw new Error('Canonical role evidence is immutable once recorded.');
      }
      oat.canonicalRole = canonicalRoleSchema.parse(event.evidence);
      break;
    }
    case 'pre-start-rejection-attestation': {
      if (
        event.expectedLaunchStatus !== 'blocked-before-start' ||
        record.launch_status !== 'blocked-before-start'
      ) {
        throw new Error(
          'Pre-start rejection requires generic launch_status blocked-before-start.',
        );
      }
      if (
        oat.preStartRejection !== null &&
        JSON.stringify(oat.preStartRejection) !==
          JSON.stringify(event.rejection)
      ) {
        throw new Error(
          'Pre-start rejection evidence is immutable once recorded.',
        );
      }
      oat.preStartRejection = rejectionSchema.parse(event.rejection);
      break;
    }
    case 'runtime-observation':
      if (
        oat.runtimeObservation.status === 'reported' &&
        JSON.stringify(oat.runtimeObservation) !==
          JSON.stringify(event.observation)
      ) {
        throw new Error('Runtime observation is immutable once reported.');
      }
      oat.runtimeObservation = runtimeObservationSchema.parse(
        event.observation,
      );
      break;
  }

  return parsePersistedOatDispatchRecord({ ...record, oat });
}
