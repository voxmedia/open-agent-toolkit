import { createHash } from 'node:crypto';

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

/**
 * Immutable configured controls across a fallback link.
 *
 * The rule, so a newly added generic field has a default: a field is immutable
 * when it describes the configured selection, the authorization for that
 * selection, or the evidence that justified it. A field is mutable when it
 * describes this record's own identity, how the work is briefed to its own
 * child, its own launch lifecycle, or its own child's observed behaviour. When
 * a new field is ambiguous, treat it as immutable — a false "controls
 * preserved" claim is worse than a false mismatch.
 *
 * All 46 generic fields are accounted for. The 31 immutable ones are listed
 * below. The 15 mutable ones, each with its reason:
 * - `request_id`: the fallback is a distinct request and must have its own ID.
 * - `caller`: the adapter layer that launches the fallback may differ.
 * - `objective`: a canonical-instruction fallback necessarily rebriefs the work
 *   for a generic child rather than a resolved role.
 * - `role_name`, `role_selector`: the fallback deliberately targets a generic
 *   worker; substituting the role is the whole point of the approximation, and
 *   the resolved role identity is bound separately through `roleInstructions`.
 * - `candidates_considered`: the fallback evaluated a different candidate set.
 * - `selection_reason`: constrained separately — a fallback must declare
 *   `pre-start-rejection`, which by definition differs from the trigger's.
 * - `launch_status`, `child_outcome`: each record's own lifecycle state.
 * - `runtime_confirmation`: observation of that record's own child. The
 *   fallback is a different child, so equality would be a false assertion.
 * - `diagnostics`: per-record narration. A fallback legitimately explains why
 *   it exists.
 * - `continuation_events`: continuation linkage belongs to the record that
 *   owns the handle.
 * - `expected_output`, `verification_evidence`, `escalate_when`: the brief
 *   given to this record's own child, in the same class as `objective`.
 *
 * Included even though they are evidence rather than controls, because they
 * record why the preserved selection was allowed:
 * - `configured_invocation_evidence`: names the configuration that authorized
 *   the preserved route.
 * - `catalog_snapshot`: names the catalog the selection was made against.
 * - `guidance_reference`, `guidance_version`, `guidance_verified_at`,
 *   `guidance_status`: name the dated model guidance behind the selection and
 *   how fresh it was; a fallback restating `stale` as `fresh` would misstate
 *   provenance for a preserved target.
 * - `classification_reason`: the rationale for `task_class`, which is itself a
 *   compared authorization control.
 */
export const IMMUTABLE_FALLBACK_CONTROL_FIELDS = [
  'provider',
  'selection_source',
  'model_selector',
  'model_selector_granularity',
  'effort_selector',
  'reasoning_mode_selector',
  'service_tier_selector',
  'selected_route',
  'authority',
  'authorization_scope',
  'deadline_seconds',
  'retry_limit',
  'payload',
  'fallback',
  'catalog_snapshot',
  'configured_invocation_evidence',
  'guidance_reference',
  'guidance_version',
  'guidance_verified_at',
  'guidance_status',
  'dispatch_context',
  'dispatch_policy',
  'dispatch_ceiling',
  'scope',
  'action',
  'role_class',
  'task_class',
  'model_class_floor',
  'classification_source',
  'classification_reason',
  'floor_satisfaction',
] as const satisfies readonly (keyof GenericDispatchRecord)[];

/**
 * The mutable complement, kept executable rather than only described above so a
 * newly added generic field fails `covers every generic dispatch field` until
 * somebody records a decision for it.
 */
export const MUTABLE_FALLBACK_CONTROL_FIELDS = [
  'request_id',
  'caller',
  'objective',
  'role_name',
  'role_selector',
  'candidates_considered',
  'selection_reason',
  'launch_status',
  'child_outcome',
  'runtime_confirmation',
  'diagnostics',
  'continuation_events',
  'expected_output',
  'verification_evidence',
  'escalate_when',
] as const satisfies readonly (keyof GenericDispatchRecord)[];

export function canonicalEvidenceJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalEvidenceJson).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(
        ([key, entry]) =>
          `${JSON.stringify(key)}:${canonicalEvidenceJson(entry)}`,
      )
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

function controlProjection(
  record: GenericDispatchRecord,
): Record<string, unknown> {
  return Object.fromEntries(
    IMMUTABLE_FALLBACK_CONTROL_FIELDS.map((field) => [
      field,
      record[field] ?? null,
    ]),
  );
}

export function configuredControlDigest(record: GenericDispatchRecord): string {
  return `sha256:${createHash('sha256')
    .update(canonicalEvidenceJson(controlProjection(record)))
    .digest('hex')}`;
}

function differingControlFields(
  left: GenericDispatchRecord,
  right: GenericDispatchRecord,
): string[] {
  const leftControls = controlProjection(left);
  const rightControls = controlProjection(right);
  return IMMUTABLE_FALLBACK_CONTROL_FIELDS.filter(
    (field) =>
      canonicalEvidenceJson(leftControls[field]) !==
      canonicalEvidenceJson(rightControls[field]),
  );
}

const redactedPathSchema = z
  .string()
  .regex(/^<(?:loaded|user|project)>\/agents\/[a-z0-9][a-z0-9_-]*\.md$/);
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
    contentDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
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
 * The rejected trigger owns the single-fallback right. Publishing a fallback
 * record requires this durable claim on the trigger first, so two concurrent
 * callers cannot each observe "no fallback yet" and then create their own.
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
      kind: z.literal('fallback-claim'),
      requestId: z.string().min(1),
      source: z.literal('provider-wrapper'),
      claim: fallbackClaimSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('fallback-link'),
      requestId: z.string().min(1),
      source: z.literal('provider-wrapper'),
      evidence: fallbackDispatchSchema,
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

function targetFor(record: GenericDispatchRecord): ExactTargetRef {
  return {
    provider: record.provider,
    modelSelector: record.model_selector,
    effortSelector: record.effort_selector,
    reasoningModeSelector: record.reasoning_mode_selector ?? null,
    serviceTierSelector: record.service_tier_selector ?? null,
    selectedRoute: record.selected_route,
  };
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
  return {
    ...parseGenericDispatchRecord(generic),
    // The namespaced augmentation is nested evidence throughout — rejection
    // reasons, fallback narration, observation values — so it is redacted
    // rather than rejected. The canonical `<tier>/agents/<role>.md` role form
    // is not an absolute path and survives untouched.
    oat: oatRecordSchema.parse(redactAbsolutePathsDeep(oat)),
  };
}

export function augmentDispatchRecord(input: {
  record: GenericDispatchRecord | PersistedOatDispatchRecordV1;
  event: OatDispatchEvidenceEvent;
  triggerRecord?: PersistedOatDispatchRecordV1;
  relatedRecords?: readonly PersistedOatDispatchRecordV1[];
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
    case 'fallback-claim': {
      const claim = event.claim;
      if (record.launch_status !== 'blocked-before-start') {
        throw new Error(
          'Only a request blocked before start can claim a fallback.',
        );
      }
      if (oat.preStartRejection === null) {
        throw new Error(
          'A fallback claim requires proven pre-start rejection evidence.',
        );
      }
      if (
        oat.canonicalRole === null ||
        oat.canonicalRole.status !== 'resolved'
      ) {
        throw new Error(
          'A fallback claim requires resolved canonical role evidence.',
        );
      }
      if (
        oat.fallbackClaim !== null &&
        oat.fallbackClaim.fallbackRequestId !== claim.fallbackRequestId
      ) {
        throw new Error('The rejected request already has a fallback.');
      }
      oat.fallbackClaim = claim;
      break;
    }
    case 'fallback-link': {
      const trigger = input.triggerRecord
        ? parsePersistedOatDispatchRecord(input.triggerRecord)
        : null;
      if (!trigger) {
        throw new Error('Fallback requires the rejected trigger record.');
      }
      const evidence = fallbackDispatchSchema.parse(event.evidence);
      if (
        evidence.triggerRequestId !== trigger.request_id ||
        evidence.fallbackRequestId !== record.request_id ||
        trigger.launch_status !== 'blocked-before-start' ||
        trigger.oat.preStartRejection === null ||
        evidence.rejection.source !== 'provider-wrapper' ||
        evidence.rejection.code !== trigger.oat.preStartRejection.code ||
        evidence.rejection.rejectedAt !==
          trigger.oat.preStartRejection.rejectedAt ||
        evidence.rejection.provesNoChildStarted !== true
      ) {
        throw new Error(
          'Fallback lacks matching pre-start rejection evidence.',
        );
      }
      if (record.selection_reason !== 'pre-start-rejection') {
        throw new Error(
          'A fallback record must state selection_reason pre-start-rejection.',
        );
      }
      if (
        canonicalEvidenceJson(evidence.preservedTarget) !==
          canonicalEvidenceJson(targetFor(record)) ||
        canonicalEvidenceJson(targetFor(trigger)) !==
          canonicalEvidenceJson(targetFor(record))
      ) {
        throw new Error(
          'Fallback must preserve the exact target and controls.',
        );
      }
      const changedControls = differingControlFields(trigger, record);
      if (changedControls.length > 0) {
        throw new Error(
          `Fallback must preserve the exact target and controls; ${changedControls.join(', ')} changed.`,
        );
      }
      if (
        configuredControlDigest(trigger) !== configuredControlDigest(record)
      ) {
        throw new Error(
          'Fallback must preserve the exact target and controls; the configured control digest changed.',
        );
      }
      if (
        trigger.oat.fallbackClaim === null ||
        trigger.oat.fallbackClaim.fallbackRequestId !== record.request_id
      ) {
        throw new Error(
          'The rejected trigger must durably claim this fallback request before the fallback can publish.',
        );
      }
      const triggerRole = trigger.oat.canonicalRole;
      if (triggerRole === null || triggerRole.status !== 'resolved') {
        throw new Error(
          'Fallback requires resolved canonical role evidence on the rejected trigger.',
        );
      }
      if (
        canonicalEvidenceJson(evidence.roleInstructions) !==
        canonicalEvidenceJson(triggerRole)
      ) {
        throw new Error(
          "Fallback role evidence must equal the trigger's resolved canonical role evidence exactly.",
        );
      }
      if (
        (input.relatedRecords ?? [])
          .map(parsePersistedOatDispatchRecord)
          .some(
            (related) =>
              related.oat.fallback.status === 'fallback-dispatch' &&
              related.oat.fallback.triggerRequestId === trigger.request_id,
          ) ||
        oat.fallback.status === 'fallback-dispatch'
      ) {
        throw new Error('The rejected request already has a fallback.');
      }
      oat.fallback = evidence;
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
