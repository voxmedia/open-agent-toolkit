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
const OperationRecordClassSchema = z.union([
  OperationClassSchema,
  z.literal('composite'),
  z.null(),
]);
const DescriptionModeSchema = z.enum(['none', 'managed-section', 'replace']);
const MutationAuthoritySchema = z.enum([
  'read-only',
  'user-approved',
  'user-authorized',
  'autonomous',
]);
const OperationStateSchema = z.enum([
  'planned',
  'pending',
  'authorized',
  'attempt-started',
  'verification-pending',
  'blocked',
  'verified',
  'partial',
  'uncertain',
  'failed',
  'rejected',
]);
const LifecycleConditionSchema = z.enum([
  'active',
  'archived',
  'moved',
  'missing-or-invisible',
  'deleted-confirmed',
  'temporarily-unavailable',
]);
const READ_ONLY_LIFECYCLE_OPERATIONS = new Set([
  'intake',
  'refresh',
  'discussion',
]);
const ALLOWED_MUTATION_CLASSES_BY_LIFECYCLE: Readonly<
  Record<string, ReadonlySet<z.infer<typeof OperationClassSchema>>>
> = {
  publish: new Set(['create', 'update-fields']),
  reconcile: new Set(['update-fields', 'transition', 'delete']),
  relink: new Set(['relink']),
  detach: new Set(['detach']),
  recreate: new Set(['recreate']),
};

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

export const HistoricalRemoteIdentitySchema = z
  .object({
    provider: ProviderSchema,
    identity: RemoteIdentitySchema,
    replacedAt: TimestampSchema,
    replacedByOperationId: StableIdSchema,
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

export const PublicationProjectionSchema = z
  .object({
    title: z.enum(['frontmatter', 'plan', 'none']),
    description: z.enum(['description-section', 'summary', 'none']),
    priority: z.enum(['frontmatter', 'plan', 'none']),
  })
  .strict();

export const PlannedBindingCreateSchema = z
  .object({
    schemaVersion: z.literal(1),
    bindingId: StableIdSchema,
    operationId: StableIdSchema,
    provider: ProviderSchema,
    target: RemoteLocalTargetSchema,
    publicationProjection: PublicationProjectionSchema,
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
    identityHistory: z.array(HistoricalRemoteIdentitySchema).max(64),
    purposes: z
      .array(PurposeSchema)
      .min(1)
      .max(4)
      .refine((values) => new Set(values).size === values.length, {
        message: 'Binding purposes must be unique.',
      }),
    policyRestrictions: BindingPolicyRestrictionSchema,
    publicationProjection: PublicationProjectionSchema,
    provenanceToken: z.string().min(1).max(512),
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

const CapabilityReferenceSchema = z
  .object({
    provider: ProviderSchema,
    transport: z.string().min(1).max(255),
    context: RemoteAccountContextSchema,
    capabilityDigest: z.string().min(1).max(512),
  })
  .strict();

const CapabilitySnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    provider: ProviderSchema,
    transport: z.string().min(1).max(255),
    transportVersion: z.string().max(255).nullable(),
    catalogFingerprint: z.string().min(1).max(512),
    context: RemoteAccountContextSchema,
    availability: z.enum([
      'available',
      'authorization-required',
      'unsupported-or-unresolved',
    ]),
    permissions: z.enum(['known', 'unknown']),
    observedAt: TimestampSchema,
    evidenceDigest: z.string().min(1).max(512),
  })
  .strict();

const RemoteRevisionSchema = z
  .object({
    strength: z.enum(['token', 'updated-at-and-hash', 'hash-only', 'unknown']),
    token: z.string().max(4_096).nullable(),
    updatedAt: TimestampSchema.nullable(),
    contentHash: z.string().min(1).max(512),
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
    observedBy: CapabilityReferenceSchema,
    identity: RemoteIdentitySchema,
    revision: RemoteRevisionSchema,
    issue: CoreIssueSchema,
    lifecycle: LifecycleConditionSchema,
    contentRedacted: z.boolean(),
    redactionCount: z.number().int().min(0),
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
  .strict()
  .superRefine((record, context) => {
    if (record.observedBy.provider !== record.provider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['observedBy', 'provider'],
        message: 'Snapshot capability provider must match snapshot provider.',
      });
    }
    if (
      JSON.stringify(record.observedBy.context) !==
      JSON.stringify(record.identity.context)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['observedBy', 'context'],
        message:
          'Snapshot capability context must match remote identity context.',
      });
    }
    if (record.redactionCount !== record.redactions.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redactionCount'],
        message: 'Snapshot redactionCount must match retained redactions.',
      });
    }
  });

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
    acceptedByOperationId: StableIdSchema,
    localProjectionRevision: z.string().min(1).max(512),
    remoteRevision: RemoteRevisionSchema,
    fields: z
      .object({
        title: BaselineFieldSchema,
        description: BaselineFieldSchema,
        priority: BaselineFieldSchema,
      })
      .strict(),
  })
  .strict();

const LocalIssueProjectionSchema = z
  .object({
    title: z.string().max(8_192),
    description: z.string().nullable(),
    priority: z.string().max(255).nullable(),
    source: z.enum(['backlog-description', 'explicit-project-publication']),
    sourceRevision: z.string().min(1).max(512),
    observedAt: TimestampSchema,
  })
  .strict();

export const RemoteBindingStateSchema = z
  .object({
    recordType: z.literal('binding-state'),
    schemaVersion: z.literal(1),
    bindingId: StableIdSchema,
    provider: ProviderSchema,
    metadataUpdatedAt: TimestampSchema,
    localProjection: LocalIssueProjectionSchema,
    snapshot: RemoteSnapshotRecordSchema.nullable(),
    baseline: RemoteBaselineRecordSchema.nullable(),
    capability: CapabilitySnapshotSchema.nullable(),
    contentRedacted: z.boolean(),
    lifecycle: z.enum(['active', 'blocked', 'tombstoned']),
    lifecycleCondition: LifecycleConditionSchema,
    activeOperationIds: z.array(StableIdSchema).max(256),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict()
  .superRefine((record, context) => {
    if (record.snapshot && record.snapshot.bindingId !== record.bindingId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['snapshot', 'bindingId'],
        message: 'Snapshot bindingId must match binding state.',
      });
    }
    if (record.snapshot && record.snapshot.provider !== record.provider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['snapshot', 'provider'],
        message: 'Snapshot provider must match binding state provider.',
      });
    }
    if (record.baseline && record.baseline.bindingId !== record.bindingId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseline', 'bindingId'],
        message: 'Baseline bindingId must match binding state.',
      });
    }
    if (record.capability && record.capability.provider !== record.provider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['capability', 'provider'],
        message: 'Capability provider must match binding state provider.',
      });
    }
  });

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
    state: OperationStateSchema,
    actionDigest: z.string().min(1).max(512),
    previewDigest: z.string().min(1).max(512),
    authority: z
      .object({
        effective: MutationAuthoritySchema,
        sourceDigest: z.string().min(1).max(512),
      })
      .strict(),
    approvalRequirement: z.enum([
      'none',
      'explicit-instruction',
      'fresh-approval',
    ]),
    approval: z
      .object({
        previewDigest: z.string().min(1).max(512),
        approvedAt: TimestampSchema,
        source: z.string().min(1).max(255),
      })
      .strict()
      .nullable(),
    attempts: z.array(z.string().min(1).max(512)).max(32),
    verification: z.array(z.string().min(1).max(512)).max(64),
    retryDisposition: z.enum([
      'not-applicable',
      'safe-before-attempt',
      'reconcile-required',
    ]),
  })
  .strict();

const AuthorityDecisionSchema = z
  .object({
    effective: MutationAuthoritySchema,
    sourceDigest: z.string().min(1).max(512),
  })
  .strict();

const ApprovalEvidenceSchema = z
  .object({
    previewDigest: z.string().min(1).max(512),
    approvedAt: TimestampSchema,
    source: z.string().min(1).max(255),
  })
  .strict();

const OperationAttemptSchema = z
  .object({
    attemptId: StableIdSchema,
    startedAt: TimestampSchema,
    completedAt: TimestampSchema.nullable(),
    transport: CapabilityReferenceSchema,
    requestDigest: z.string().min(1).max(512),
    receiptDigest: z.string().min(1).max(512).nullable(),
  })
  .strict();

const ExternalObservationSchema = z
  .object({
    observedAt: TimestampSchema,
    classification: z.enum(['none', 'committed', 'not-committed', 'unknown']),
    evidenceDigest: z.string().min(1).max(512),
  })
  .strict();

const FieldVerificationSchema = z
  .object({
    field: z.string().min(1).max(255),
    expectedHash: z.string().min(1).max(512),
    observedHash: z.string().min(1).max(512).nullable(),
    status: z.enum(['verified', 'mismatch', 'unavailable']),
  })
  .strict();

const OperationPreviewSchema = z
  .object({
    digest: z.string().min(1).max(512),
    bindingId: StableIdSchema,
    provider: ProviderSchema,
    providerContext: RemoteAccountContextSchema,
    capabilityDigest: z.string().min(1).max(512),
    revisionDigest: z.string().min(1).max(512),
    policyDigest: z.string().min(1).max(512),
  })
  .strict();

export const RemoteOperationRecordSchema = z
  .object({
    recordType: z.literal('operation'),
    schemaVersion: z.literal(1),
    operationId: StableIdSchema,
    correlationId: StableIdSchema,
    bindingId: StableIdSchema,
    provider: ProviderSchema,
    providerContext: RemoteAccountContextSchema,
    lifecycleOperation: z.enum([
      'intake',
      'publish',
      'refresh',
      'reconcile',
      'closeout',
      'discussion',
      'relink',
      'detach',
      'recreate',
    ]),
    operationClass: OperationRecordClassSchema,
    state: OperationStateSchema,
    reason: z
      .object({
        code: z.string().min(1).max(255),
        message: z.string().min(1).max(8_192),
      })
      .strict()
      .nullable(),
    lastSafeStep: z.enum([
      'planned',
      'authorized',
      'attempt-started',
      'verification-pending',
      'complete',
    ]),
    preview: OperationPreviewSchema,
    authority: AuthorityDecisionSchema.nullable(),
    approval: ApprovalEvidenceSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    transport: z
      .object({ id: z.string().min(1).max(255), provider: ProviderSchema })
      .strict()
      .nullable(),
    selectedTransport: CapabilityReferenceSchema.nullable(),
    attempts: z.array(OperationAttemptSchema).max(32),
    observations: z.array(ExternalObservationSchema).max(64),
    verification: z.array(FieldVerificationSchema).max(64),
    retryDisposition: z.enum([
      'not-applicable',
      'safe-before-attempt',
      'reconcile-required',
    ]),
    steps: z.array(RemoteOperationStepSchema).max(64),
    outcome: RemoteOperationOutcomeSchema,
    createIntent: PlannedBindingCreateSchema.optional(),
  })
  .strict()
  .superRefine((record, context) => {
    const isReadOnlyLifecycle = READ_ONLY_LIFECYCLE_OPERATIONS.has(
      record.lifecycleOperation,
    );
    if (isReadOnlyLifecycle) {
      if (record.operationClass !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['operationClass'],
          message:
            'Read-only lifecycle operations require operationClass null.',
        });
      }
      if (record.operationClass === null && record.authority !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authority'],
          message: 'Read-only operations must not retain mutation authority.',
        });
      }
      if (record.operationClass === null && record.approval !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['approval'],
          message: 'Read-only operations must not retain mutation approval.',
        });
      }
      if (
        record.operationClass === null &&
        (record.attempts.length > 0 || record.steps.length > 0)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['attempts'],
          message:
            'Read-only operations must not retain mutation attempts or substeps.',
        });
      }
    } else if (record.lifecycleOperation === 'closeout') {
      if (record.operationClass !== 'composite') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['operationClass'],
          message:
            'Closeout lifecycle operations require operationClass composite.',
        });
      }
      if (record.operationClass === 'composite' && record.authority !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authority'],
          message: 'Composite parent authority must be null.',
        });
      }
      if (record.operationClass === 'composite' && record.approval !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['approval'],
          message: 'Composite parent approval must be null.',
        });
      }
      if (record.operationClass === 'composite' && record.steps.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps'],
          message: 'Composite operations require authoritative substeps.',
        });
      }
      if (record.operationClass === 'composite') {
        const semanticOperations = new Set<string>();
        for (const [index, step] of record.steps.entries()) {
          if (!['annotate', 'transition'].includes(step.semanticOperation)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['steps', index, 'semanticOperation'],
              message:
                'Composite closeout substeps must be annotate or transition.',
            });
          }
          if (semanticOperations.has(step.semanticOperation)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['steps', index, 'semanticOperation'],
              message: `Duplicate composite ${step.semanticOperation} substep.`,
            });
          }
          semanticOperations.add(step.semanticOperation);
        }
        if (
          record.steps[0]?.semanticOperation === 'transition' &&
          record.steps[1]?.semanticOperation === 'annotate'
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['steps'],
            message: 'Composite closeout annotation must precede transition.',
          });
        }
      }
    } else {
      if (record.operationClass === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lifecycleOperation'],
          message:
            'Read-only operation class is valid only for intake, refresh, or discussion lifecycle.',
        });
      } else if (record.operationClass === 'composite') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lifecycleOperation'],
          message: 'Composite operation lifecycle must be closeout.',
        });
      } else if (
        !ALLOWED_MUTATION_CLASSES_BY_LIFECYCLE[record.lifecycleOperation]?.has(
          record.operationClass,
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['operationClass'],
          message: `Lifecycle '${record.lifecycleOperation}' does not allow mutation class '${record.operationClass}'.`,
        });
      }
      if (record.operationClass !== null && record.authority === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authority'],
          message: 'Mutation operations require an authority decision.',
        });
      }
      if (record.steps.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps'],
          message: 'Non-composite operations must not contain substeps.',
        });
      }
    }
    if (
      record.approval &&
      record.approval.previewDigest !== record.preview.digest
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approval', 'previewDigest'],
        message: 'Operation approval preview digest must match the preview.',
      });
    }
    for (const [index, step] of record.steps.entries()) {
      if (step.approval && step.approval.previewDigest !== step.previewDigest) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'approval', 'previewDigest'],
          message: 'Substep approval preview digest must match its preview.',
        });
      }
    }
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
    if (record.preview.bindingId !== record.bindingId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preview', 'bindingId'],
        message: 'Operation preview bindingId must match operation bindingId.',
      });
    }
    if (record.preview.provider !== record.provider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preview', 'provider'],
        message: 'Operation preview provider must match operation provider.',
      });
    }
    if (
      JSON.stringify(record.preview.providerContext) !==
      JSON.stringify(record.providerContext)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preview', 'providerContext'],
        message: 'Operation preview provider context must match the operation.',
      });
    }
    if (
      record.selectedTransport &&
      record.selectedTransport.provider !== record.provider
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedTransport', 'provider'],
        message: 'Selected transport provider must match operation provider.',
      });
    }
    if (
      record.selectedTransport &&
      JSON.stringify(record.selectedTransport.context) !==
        JSON.stringify(record.providerContext)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedTransport', 'context'],
        message:
          'Selected transport context must match operation provider context.',
      });
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
      if (record.createIntent.provider !== record.provider) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['createIntent', 'provider'],
          message: 'Pre-create intent provider must match its journal.',
        });
      }
      if (
        JSON.stringify(record.createIntent.providerContext) !==
        JSON.stringify(record.providerContext)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['createIntent', 'providerContext'],
          message: 'Pre-create provider context must match its journal.',
        });
      }
    }
  });

const RemoteBatchMemberSchema = z
  .object({
    bindingId: StableIdSchema,
    operationId: StableIdSchema,
    bindingPreviewDigest: z.string().min(1).max(512),
  })
  .strict();

export const RemoteBatchRecordSchema = z
  .object({
    recordType: z.literal('batch'),
    schemaVersion: z.literal(1),
    batchId: StableIdSchema,
    lifecycleOperation: z.enum(['closeout', 'refresh', 'reconcile']),
    state: z.enum([
      'planned',
      'pending',
      'authorized',
      'in-progress',
      'complete',
      'partial',
      'uncertain',
      'blocked',
    ]),
    membershipDigest: z.string().min(1).max(512),
    previewDigest: z.string().min(1).max(512),
    authority: AuthorityDecisionSchema,
    approval: ApprovalEvidenceSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    members: z.array(RemoteBatchMemberSchema).min(1).max(512),
    outcomes: z.record(StableIdSchema, OperationStateSchema),
  })
  .strict()
  .superRefine((record, context) => {
    const operationIds = record.members.map((member) => member.operationId);
    if (new Set(operationIds).size !== operationIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['members'],
        message: 'Batch operation membership must be unique and immutable.',
      });
    }
    const outcomes = new Set(Object.keys(record.outcomes));
    if (
      operationIds.some((operationId) => !outcomes.has(operationId)) ||
      outcomes.size !== operationIds.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outcomes'],
        message: 'Batch outcomes must match immutable operation membership.',
      });
    }
  });

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
export type FieldVerification = z.infer<typeof FieldVerificationSchema>;
export type RemoteOperationRecord = z.infer<typeof RemoteOperationRecordSchema>;
export type RemoteBatchRecord = z.infer<typeof RemoteBatchRecordSchema>;
