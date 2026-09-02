import { z } from 'zod';

import {
  assertNoSensitiveDispatchContent,
  genericDispatchRecordSchema,
  parseGenericDispatchRecord,
  type GenericDispatchRecord,
} from './generic-dispatch-record';

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
    code: z.string().min(1),
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

const oatRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    canonicalRole: canonicalRoleSchema.nullable(),
    preStartRejection: rejectionSchema.nullable(),
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
      if (
        JSON.stringify(evidence.preservedTarget) !==
          JSON.stringify(targetFor(record)) ||
        JSON.stringify(targetFor(trigger)) !==
          JSON.stringify(targetFor(record)) ||
        trigger.authority !== record.authority ||
        trigger.deadline_seconds !== record.deadline_seconds ||
        trigger.retry_limit !== record.retry_limit
      ) {
        throw new Error(
          'Fallback must preserve the exact target and controls.',
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
