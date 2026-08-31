import { createHash } from 'node:crypto';

import { z } from 'zod';

import {
  containsSensitiveContentSignal,
  containsSensitiveContentSignalInValue,
} from './credential-safety';
import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from './outbound-projection-safety';
import {
  RemoteAccountContextSchema,
  WHOLE_FIELD_SUPPRESSION_MARKER,
} from './schema';

const MAX_ACTION_BYTES = 65_536;
const MAX_OBSERVATION_BYTES = 65_536;
const MAX_VALUE_DEPTH = 6;
const SemanticFieldNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const ProviderSchema = z.enum(['github', 'linear', 'jira']);
const SemanticOperationSchema = z.enum([
  'read',
  'read-discussion',
  'search-duplicates',
  'create',
  'update',
  'transition',
  'annotate',
]);

export const ExternalObservationEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: z.string().min(1).max(128),
    stepId: z.string().min(1).max(128),
    actionDigest: z.string().min(1).max(512),
    observedAt: z.string().datetime({ offset: true }),
    surfaceKind: z.enum(['connector', 'configured-cli']),
    capabilityEvidenceDigest: z.string().min(1).max(512),
    provider: ProviderSchema,
    context: RemoteAccountContextSchema,
    outcome: z
      .object({
        classification: z.enum([
          'observed',
          'not-committed',
          'unknown',
          'rejected',
        ]),
        identity: z
          .object({
            stableId: z.string().min(1).max(512),
            aliases: z.array(z.string().max(2_048)).max(64),
          })
          .strict()
          .nullable(),
        fields: z.record(
          z.union([z.string(), z.number(), z.boolean(), z.null()]),
        ),
        revisionDigest: z.string().min(1).max(512).nullable(),
        diagnosticCode: z.string().min(1).max(128).nullable(),
      })
      .strict(),
  })
  .strict();

export interface ExternalActionEnvelope {
  schemaVersion: 1;
  operationId: string;
  stepId: string;
  actionDigest: string;
  provider: 'github' | 'linear' | 'jira';
  semanticOperation: z.infer<typeof SemanticOperationSchema>;
  context: z.infer<typeof RemoteAccountContextSchema>;
  intent: Record<string, unknown>;
  expectedObservation: { fields: string[]; requireIdentity: boolean };
  outboundSafety: {
    projectionDigest: string;
    resultDigest: string;
  } | null;
}

const ScalarSchema = z.union([
  z.string().max(1_048_576),
  z.number(),
  z.boolean(),
  z.null(),
]);
const ProjectionSchema = z.record(ScalarSchema);
const IdentityIntentSchema = z
  .object({
    stableId: z.string().min(1).max(512),
    localTarget: z
      .object({
        kind: z.literal('backlog'),
        scope: z.literal('shared'),
        id: z.string().min(1).max(255),
        path: z.string().min(1).max(4_096),
      })
      .strict()
      .optional(),
  })
  .strict();
const ActionIntentSchemas: Record<
  ExternalActionEnvelope['semanticOperation'],
  z.ZodType<Record<string, unknown>>
> = {
  read: IdentityIntentSchema,
  'read-discussion': z
    .object({
      stableId: z.string().min(1).max(512),
      cursor: z.string().max(512).optional(),
    })
    .strict(),
  'search-duplicates': z
    .object({ query: z.string().min(1).max(8_192) })
    .strict(),
  create: z
    .object({
      target: z
        .object({
          kind: z.enum(['backlog', 'project']),
          id: z.string().min(1).max(255),
          scope: z.enum(['shared', 'synced', 'local']),
        })
        .strict(),
      fields: ProjectionSchema,
      provenanceToken: z.string().min(1).max(512),
    })
    .strict(),
  update: z
    .object({
      stableId: z.string().min(1).max(512).nullable().optional(),
      fields: ProjectionSchema,
    })
    .strict(),
  transition: z
    .object({
      stableId: z.string().min(1).max(512),
      transition: z.string().min(1).max(255),
    })
    .strict(),
  annotate: z
    .object({
      stableId: z.string().min(1).max(512),
      body: z.string().max(1_048_576),
    })
    .strict(),
};

export type ExternalObservationEnvelope = z.infer<
  typeof ExternalObservationEnvelopeSchema
>;

const ExternalActionBaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: z.string().min(1).max(128),
    stepId: z.string().min(1).max(128),
    actionDigest: z.string().min(1).max(512),
    provider: ProviderSchema,
    semanticOperation: SemanticOperationSchema,
    context: RemoteAccountContextSchema,
    intent: z.record(z.unknown()),
    expectedObservation: z
      .object({
        fields: z.array(SemanticFieldNameSchema).max(64),
        requireIdentity: z.boolean(),
      })
      .strict(),
    outboundSafety: z
      .object({
        projectionDigest: z.string().min(1).max(512),
        resultDigest: z.string().min(1).max(512),
      })
      .strict()
      .nullable(),
  })
  .strict();

export function parseExternalAction(value: unknown): ExternalActionEnvelope {
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_ACTION_BYTES) {
    throw new Error('External action exceeds the size limit.');
  }
  const action = ExternalActionBaseSchema.parse(value);
  assertDepth(action.intent, 0);
  ActionIntentSchemas[action.semanticOperation].parse(action.intent);
  const { actionDigest, ...body } = action;
  if (digest(body) !== actionDigest) {
    throw new Error('External action digest is stale or mismatched.');
  }
  return action as ExternalActionEnvelope;
}

export function buildExternalAction(input: {
  operationId: string;
  stepId: string;
  provider: ExternalActionEnvelope['provider'];
  semanticOperation: ExternalActionEnvelope['semanticOperation'];
  context: ExternalActionEnvelope['context'];
  intent: Record<string, unknown>;
  expectedObservation: ExternalActionEnvelope['expectedObservation'];
  persistedPreview: {
    projectionDigest?: string | null;
    safetyResultDigest?: string | null;
  };
  projection?: OutboundProjection;
  outboundSafety?: OutboundProjectionSafetyResult | null;
}): ExternalActionEnvelope {
  const mutation = ['create', 'update', 'transition', 'annotate'].includes(
    input.semanticOperation,
  );
  let outboundSafety: ExternalActionEnvelope['outboundSafety'] = null;
  if (mutation) {
    if (!input.projection)
      throw new Error(
        'Mutation action requires an explicit outbound projection.',
      );
    requireCurrentOutboundSafety(input.projection, input.outboundSafety);
    if (
      input.persistedPreview.projectionDigest !==
        input.outboundSafety.projectionDigest ||
      input.persistedPreview.safetyResultDigest !==
        input.outboundSafety.resultDigest
    ) {
      throw new Error(
        'Mutation action safety evidence does not match the persisted preview.',
      );
    }
    outboundSafety = {
      projectionDigest: input.outboundSafety.projectionDigest,
      resultDigest: input.outboundSafety.resultDigest,
    };
  }
  assertDepth(input.intent, 0);
  const intent = ActionIntentSchemas[input.semanticOperation].parse(
    input.intent,
  );
  const expectedFields = input.expectedObservation.fields.map((field) =>
    SemanticFieldNameSchema.parse(field),
  );
  if (
    expectedFields.length !== input.expectedObservation.fields.length ||
    expectedFields.length > 64
  ) {
    throw new Error(
      'External action expected fields must be unique and bounded.',
    );
  }
  if (
    mutation &&
    expectedFields.some((field) => !Object.hasOwn(input.projection!, field))
  ) {
    throw new Error(
      'Mutation action expected fields must match its projection.',
    );
  }
  const actionWithoutDigest = {
    schemaVersion: 1 as const,
    operationId: input.operationId,
    stepId: input.stepId,
    provider: input.provider,
    semanticOperation: SemanticOperationSchema.parse(input.semanticOperation),
    context: RemoteAccountContextSchema.parse(input.context),
    intent,
    expectedObservation: {
      ...input.expectedObservation,
      fields: expectedFields,
    },
    outboundSafety,
  };
  if (
    Buffer.byteLength(canonicalJson(actionWithoutDigest), 'utf8') >
    MAX_ACTION_BYTES
  ) {
    throw new Error('External action exceeds the size limit.');
  }
  return { ...actionWithoutDigest, actionDigest: digest(actionWithoutDigest) };
}

export function acceptExternalObservation(input: {
  action: ExternalActionEnvelope;
  observation: unknown;
  acceptedStepDigests?: ReadonlySet<string>;
}): ExternalObservationEnvelope {
  const bytes = Buffer.byteLength(JSON.stringify(input.observation), 'utf8');
  if (bytes > MAX_OBSERVATION_BYTES)
    throw new Error('External observation exceeds the size limit.');
  const observation = ExternalObservationEnvelopeSchema.parse(
    input.observation,
  );
  if (input.acceptedStepDigests?.has(observation.actionDigest)) {
    throw new Error('External observation duplicates an accepted action.');
  }
  if (
    observation.operationId !== input.action.operationId ||
    observation.stepId !== input.action.stepId ||
    observation.actionDigest !== input.action.actionDigest
  ) {
    throw new Error('External observation is stale or mismatched.');
  }
  if (
    observation.provider !== input.action.provider ||
    canonicalJson(observation.context) !== canonicalJson(input.action.context)
  ) {
    throw new Error('External observation provider context is mismatched.');
  }
  const expected = new Set(input.action.expectedObservation.fields);
  const actual = Object.keys(observation.outcome.fields);
  if (actual.some((field) => !expected.has(field))) {
    throw new Error('External observation contains an unexpected field.');
  }
  if (
    observation.outcome.classification === 'observed' &&
    input.action.expectedObservation.requireIdentity &&
    !observation.outcome.identity
  ) {
    throw new Error('External observation is missing required identity.');
  }
  if (
    observation.outcome.identity?.aliases.some((value) =>
      containsSensitiveContentSignal(value),
    ) ||
    (observation.outcome.diagnosticCode &&
      containsSensitiveContentSignal(observation.outcome.diagnosticCode))
  ) {
    throw new Error('External observation identity evidence is unsafe.');
  }
  const fields = Object.fromEntries(
    actual.map((field) => {
      const value = observation.outcome.fields[field] ?? null;
      return [
        field,
        typeof value === 'string' &&
        containsSensitiveContentSignalInValue(value)
          ? WHOLE_FIELD_SUPPRESSION_MARKER
          : value,
      ];
    }),
  );
  return { ...observation, outcome: { ...observation.outcome, fields } };
}

function assertDepth(value: unknown, depth: number): void {
  if (depth > MAX_VALUE_DEPTH)
    throw new Error('External action exceeds the depth limit.');
  if (!value || typeof value !== 'object') return;
  for (const item of Object.values(value)) assertDepth(item, depth + 1);
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [
              key,
              item && typeof item === 'object'
                ? JSON.parse(canonicalJson(item))
                : item,
            ]),
        )
      : value,
  );
}
