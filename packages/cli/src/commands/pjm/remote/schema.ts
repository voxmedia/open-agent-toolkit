import { basename } from 'node:path';

import { z } from 'zod';

export const MAX_REMOTE_DESCRIPTION_BYTES = 1_048_576;
export const MAX_PROVIDER_EXTENSION_BYTES = 16_384;

const StableIdSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9][A-Za-z0-9_-]*)+$/);
const TimestampSchema = z.string().datetime({ offset: true });
const ProviderSchema = z.enum(['github', 'linear', 'jira']);
const PurposeSchema = z.enum(['source', 'planning', 'delivery', 'reference']);
const OperationClassSchema = z.enum([
  'create',
  'update-fields',
  'transition',
  'annotate',
  'delete',
  'relink',
  'detach',
  'recreate',
]);
const DescriptionModeSchema = z.enum(['none', 'managed-section', 'replace']);
const MutationAuthoritySchema = z.enum([
  'read-only',
  'user-approved',
  'user-authorized',
  'autonomous',
]);

export const RemoteAliasSchema = z
  .object({
    kind: z.enum(['url', 'display', 'key']),
    value: z.string().min(1).max(2_048),
  })
  .strict();

export const RemoteAccountContextSchema = z
  .object({
    host: z.string().min(1).max(255).optional(),
    owner: z.string().min(1).max(255).optional(),
    repositoryId: z.string().min(1).max(255).optional(),
    workspaceId: z.string().min(1).max(255).optional(),
    teamId: z.string().min(1).max(255).optional(),
    cloudId: z.string().min(1).max(255).optional(),
    siteId: z.string().min(1).max(255).optional(),
    projectId: z.string().min(1).max(255).optional(),
  })
  .strict();

export const RemoteIdentitySchema = z
  .object({
    stableId: z.string().min(1).max(512),
    context: RemoteAccountContextSchema,
    aliases: z.array(RemoteAliasSchema).max(64),
  })
  .strict();

export const VerifiedDurableRemoteIdentitySchema = z
  .object({
    provider: ProviderSchema,
    stableId: z.string().min(1).max(512),
    verifiedAt: TimestampSchema,
    evidenceDigest: z.string().min(1).max(512),
  })
  .strict();

export const RemoteLocalTargetSchema = z
  .object({
    kind: z.enum(['backlog', 'project']),
    scope: z.enum(['shared', 'synced', 'local']),
    id: z.string().min(1).max(255),
    path: z.string().min(1).max(4_096),
  })
  .strict();

export const BindingPolicyRestrictionSchema = z
  .object({
    description: DescriptionModeSchema.optional(),
    authority: z
      .object({
        default: MutationAuthoritySchema.optional(),
        operations: z
          .record(OperationClassSchema, MutationAuthoritySchema)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const PlannedBindingCreateSchema = z
  .object({
    schemaVersion: z.literal(1),
    bindingId: StableIdSchema,
    operationId: StableIdSchema,
    provider: ProviderSchema,
    target: RemoteLocalTargetSchema,
    publicationProjection: z
      .object({
        title: z.enum(['frontmatter', 'plan', 'none']),
        description: z.enum(['description-section', 'summary', 'none']),
        priority: z.enum(['frontmatter', 'plan', 'none']),
      })
      .strict(),
    providerContext: RemoteAccountContextSchema,
    purposes: z.array(PurposeSchema).min(1).max(4),
    policyRestrictions: BindingPolicyRestrictionSchema,
    provenanceToken: z.string().min(1).max(512),
    createdAt: TimestampSchema,
  })
  .strict();

export const RemoteBindingMetadataSchema = z
  .object({
    recordType: z.literal('binding-metadata'),
    schemaVersion: z.literal(1),
    bindingId: StableIdSchema,
    provider: ProviderSchema,
    target: RemoteLocalTargetSchema,
    remoteIdentity: RemoteIdentitySchema,
    purposes: z.array(PurposeSchema).min(1).max(4),
    policyRestrictions: BindingPolicyRestrictionSchema,
    lifecycle: z.enum(['active', 'blocked', 'tombstoned']),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

const ExtensionPayloadSchema = z
  .record(z.unknown())
  .superRefine((value, context) => {
    const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (bytes > MAX_PROVIDER_EXTENSION_BYTES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Provider extension exceeds ${MAX_PROVIDER_EXTENSION_BYTES} byte limit.`,
      });
    }
  });

const ProviderExtensionsSchema = z
  .object({
    github: ExtensionPayloadSchema.optional(),
    linear: ExtensionPayloadSchema.optional(),
    jira: ExtensionPayloadSchema.optional(),
  })
  .strict();

const CoreIssueSchema = z
  .object({
    title: z.string().max(8_192),
    description: z
      .string()
      .refine(
        (value) =>
          Buffer.byteLength(value, 'utf8') <= MAX_REMOTE_DESCRIPTION_BYTES,
        `Remote description exceeds ${MAX_REMOTE_DESCRIPTION_BYTES} byte limit.`,
      ),
    priority: z.string().max(255).nullable(),
    status: z.string().min(1).max(255),
  })
  .strict();

export const RemoteSnapshotRecordSchema = z
  .object({
    recordType: z.literal('snapshot'),
    schemaVersion: z.literal(1),
    snapshotId: StableIdSchema,
    bindingId: StableIdSchema,
    provider: ProviderSchema,
    observedAt: TimestampSchema,
    revision: z
      .object({
        token: z.string().max(4_096).nullable(),
        strength: z.enum(['strong', 'weak', 'unknown']),
      })
      .strict(),
    issue: CoreIssueSchema,
    contentRedacted: z.boolean(),
    redactions: z
      .array(
        z
          .object({
            field: z.enum(['title', 'description', 'priority', 'status']),
            reason: z.enum(['credential', 'policy']),
          })
          .strict(),
      )
      .max(16),
    extensions: ProviderExtensionsSchema.optional(),
  })
  .strict();

const BaselineFieldSchema = z
  .object({
    value: z.string().nullable(),
    hash: z.string().min(1).max(512),
  })
  .strict();

export const RemoteBaselineRecordSchema = z
  .object({
    recordType: z.literal('baseline'),
    schemaVersion: z.literal(1),
    baselineId: StableIdSchema,
    bindingId: StableIdSchema,
    agreedAt: TimestampSchema,
    fields: z
      .object({
        title: BaselineFieldSchema,
        description: BaselineFieldSchema,
        priority: BaselineFieldSchema,
      })
      .strict(),
  })
  .strict();

export const RemoteBindingStateSchema = z
  .object({
    recordType: z.literal('binding-state'),
    schemaVersion: z.literal(1),
    bindingId: StableIdSchema,
    metadataUpdatedAt: TimestampSchema,
    snapshot: RemoteSnapshotRecordSchema.nullable().optional(),
    baseline: RemoteBaselineRecordSchema.nullable().optional(),
    lifecycle: z.enum(['active', 'blocked', 'tombstoned']),
    activeOperationIds: z.array(StableIdSchema).max(256),
    updatedAt: TimestampSchema,
  })
  .strict();

export const RemoteOperationOutcomeSchema = z
  .object({
    classification: z.enum([
      'pending',
      'verified',
      'partial',
      'uncertain',
      'rejected',
      'blocked',
    ]),
    message: z.string().max(8_192).nullable(),
    verifiedAt: TimestampSchema.nullable(),
  })
  .strict();

export const RemoteOperationStepSchema = z
  .object({
    stepId: StableIdSchema,
    semanticOperation: OperationClassSchema,
    state: z.enum([
      'planned',
      'authorized',
      'attempt-started',
      'verified',
      'partial',
      'uncertain',
      'rejected',
      'blocked',
    ]),
    actionDigest: z.string().min(1).max(512),
  })
  .strict();

export const RemoteOperationRecordSchema = z
  .object({
    recordType: z.literal('operation'),
    schemaVersion: z.literal(1),
    operationId: StableIdSchema,
    bindingId: StableIdSchema,
    operationClass: OperationClassSchema,
    state: z.enum([
      'planned',
      'authorized',
      'attempt-started',
      'verified',
      'partial',
      'uncertain',
      'rejected',
      'blocked',
    ]),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    transport: z
      .object({ id: z.string().min(1).max(255), provider: ProviderSchema })
      .strict()
      .nullable(),
    steps: z.array(RemoteOperationStepSchema).max(64),
    outcome: RemoteOperationOutcomeSchema,
    createIntent: PlannedBindingCreateSchema.optional(),
  })
  .strict()
  .superRefine((record, context) => {
    const seen = new Set<string>();
    for (const [index, step] of record.steps.entries()) {
      if (seen.has(step.stepId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'stepId'],
          message: `Duplicate stepId '${step.stepId}'.`,
        });
      }
      seen.add(step.stepId);
    }
    if (record.createIntent) {
      if (record.operationClass !== 'create') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['createIntent'],
          message: 'A pre-create intent requires a create operation.',
        });
      }
      if (record.createIntent.operationId !== record.operationId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['createIntent', 'operationId'],
          message: 'Pre-create intent operationId must match its journal.',
        });
      }
      if (record.createIntent.bindingId !== record.bindingId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['createIntent', 'bindingId'],
          message: 'Pre-create intent bindingId must match its journal.',
        });
      }
    }
  });

const RemoteBatchMemberSchema = z
  .object({
    bindingId: StableIdSchema,
    operationId: StableIdSchema,
    outcome: RemoteOperationOutcomeSchema,
  })
  .strict();

export const RemoteBatchRecordSchema = z
  .object({
    recordType: z.literal('batch'),
    schemaVersion: z.literal(1),
    batchId: StableIdSchema,
    state: z.enum(['planned', 'running', 'verified', 'partial', 'blocked']),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    members: z.array(RemoteBatchMemberSchema).min(1).max(512),
  })
  .strict();

export function assertRecordIdMatchesFilename(
  filePath: string,
  recordId: string,
): void {
  const filenameId = basename(filePath, '.json');
  if (filenameId !== recordId) {
    throw new Error(
      `Remote record filename '${filenameId}' does not match stable ID '${recordId}'.`,
    );
  }
}

export type RemoteAlias = z.infer<typeof RemoteAliasSchema>;
export type VerifiedDurableRemoteIdentity = z.infer<
  typeof VerifiedDurableRemoteIdentitySchema
>;
export type PlannedBindingCreate = z.infer<typeof PlannedBindingCreateSchema>;
export type RemoteBindingMetadata = z.infer<typeof RemoteBindingMetadataSchema>;
export type RemoteSnapshotRecord = z.infer<typeof RemoteSnapshotRecordSchema>;
export type RemoteBaselineRecord = z.infer<typeof RemoteBaselineRecordSchema>;
export type RemoteBindingState = z.infer<typeof RemoteBindingStateSchema>;
export type RemoteOperationStep = z.infer<typeof RemoteOperationStepSchema>;
export type RemoteOperationOutcome = z.infer<
  typeof RemoteOperationOutcomeSchema
>;
export type RemoteOperationRecord = z.infer<typeof RemoteOperationRecordSchema>;
export type RemoteBatchRecord = z.infer<typeof RemoteBatchRecordSchema>;
