import { createHash } from 'node:crypto';

import { z } from 'zod';

import {
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
  'wrapper-launch-failure',
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
    const prohibited = prohibitedRejectionCategory(code);
    if (prohibited !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A ${prohibited} outcome is not a pre-start native-selection rejection and never authorizes fallback or replacement.`,
      });
      return;
    }
    if (
      !(QUALIFYING_PRE_START_REJECTION_CODES as readonly string[]).includes(
        code,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Pre-start rejection code must be one of the qualifying codes: ${QUALIFYING_PRE_START_REJECTION_CODES.join(', ')}.`,
      });
    }
  });

/**
 * Immutable configured controls. A fallback approximates the role instruction
 * surface only; every configured control below must survive byte-identically,
 * including the complete generic `payload` that owns sandbox and tool grants.
 */
export const IMMUTABLE_FALLBACK_CONTROL_FIELDS = [
  'provider',
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
  'dispatch_context',
  'dispatch_policy',
  'dispatch_ceiling',
  'scope',
  'action',
  'role_class',
  'task_class',
  'model_class_floor',
  'classification_source',
  'floor_satisfaction',
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

const runtimeObservationSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not-reported') }).strict(),
  z
    .object({
      status: z.literal('reported'),
      provider: z.string().min(1),
      childLineage: z.string().min(1).optional(),
      role: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
      effort: z.string().min(1).optional(),
      serviceTier: z.string().min(1).optional(),
      source: z.string().min(1),
      observedAt: z.string().datetime(),
      match: z.enum(['matching', 'mismatching', 'not-comparable']),
    })
    .strict(),
]);

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
  const parsed = persistedOatDispatchRecordSchema.parse(value);
  const { oat, ...generic } = parsed;
  return {
    ...parseGenericDispatchRecord(generic),
    oat: oatRecordSchema.parse(oat),
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
