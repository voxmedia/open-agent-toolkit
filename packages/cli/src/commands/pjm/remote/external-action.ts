import { createHash } from 'node:crypto';

import { z } from 'zod';

import {
  requireCurrentOutboundSafety,
  type OutboundProjection,
  type OutboundProjectionSafetyResult,
} from './outbound-projection-safety';
import { RemoteAccountContextSchema } from './schema';

const MAX_OBSERVATION_BYTES = 65_536;
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

const ExternalObservationEnvelopeSchema = z
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

export type ExternalObservationEnvelope = z.infer<
  typeof ExternalObservationEnvelopeSchema
>;

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
  const actionWithoutDigest = {
    schemaVersion: 1 as const,
    operationId: input.operationId,
    stepId: input.stepId,
    provider: input.provider,
    semanticOperation: SemanticOperationSchema.parse(input.semanticOperation),
    context: RemoteAccountContextSchema.parse(input.context),
    intent: input.intent,
    expectedObservation: input.expectedObservation,
    outboundSafety,
  };
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
  return observation;
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
