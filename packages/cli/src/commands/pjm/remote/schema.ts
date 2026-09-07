import { basename } from 'node:path';

import { z } from 'zod';

import {
  containsSensitiveContentSignal,
  containsSensitiveContentSignalInValue,
} from './credential-safety';

export const MAX_REMOTE_DESCRIPTION_BYTES = 1_048_576;
export const MAX_PROVIDER_EXTENSION_BYTES = 16_384;
export const MAX_SNAPSHOT_SUPPRESSION_EVIDENCE = 16;
export const WHOLE_FIELD_SUPPRESSION_MARKER = '[SUPPRESSED:SENSITIVE-CONTENT]';

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

const CurrentPlannedBindingCreateSchema = z
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
    localProjection: LocalIssueProjectionSchema.optional(),
    projectionStatus: z.enum(['complete', 'reconcile-required']).optional(),
    createdAt: TimestampSchema,
  })
  .strict()
  .superRefine((intent, context) => {
    if (intent.target.kind !== 'project') return;
    if (
      intent.projectionStatus !== 'complete' ||
      intent.localProjection?.source !== 'explicit-project-publication'
    ) {
      if (
        intent.projectionStatus !== 'reconcile-required' ||
        intent.localProjection !== undefined
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['localProjection'],
          message:
            'Project create requires a complete explicit local publication projection.',
        });
      }
    }
  });

export const PlannedBindingCreateSchema: z.ZodType<
  z.infer<typeof CurrentPlannedBindingCreateSchema>
> = z.preprocess(
  markIncompleteProjectCreate,
  CurrentPlannedBindingCreateSchema,
) as z.ZodType<z.infer<typeof CurrentPlannedBindingCreateSchema>>;

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

const SnapshotExtensionKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/);

const SnapshotSuppressedFieldSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('core'),
      name: z.enum(['title', 'description', 'priority', 'status']),
    })
    .strict(),
  z
    .object({
      kind: z.literal('extension'),
      key: SnapshotExtensionKeySchema,
    })
    .strict(),
]);

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

const CurrentCapabilityReferenceSchema = z
  .object({
    provider: ProviderSchema,
    surfaceKind: z.enum(['connector', 'configured-cli', 'legacy-observation']),
    context: RemoteAccountContextSchema,
    evidenceDigest: z.string().min(1).max(512),
    semanticCapabilities: z.array(z.string().min(1).max(128)).max(32),
  })
  .strict();

const CurrentCapabilitySnapshotSchema = z
  .object({
    schemaVersion: z.literal(2),
    provider: ProviderSchema,
    surfaceKind: z.enum(['connector', 'configured-cli', 'legacy-observation']),
    context: RemoteAccountContextSchema,
    availability: z.enum([
      'available',
      'authorization-required',
      'unsupported-or-unresolved',
    ]),
    permissions: z.enum(['known', 'unknown']),
    semanticCapabilities: z.array(z.string().min(1).max(128)).max(32),
    observedAt: TimestampSchema,
    evidenceDigest: z.string().min(1).max(512),
  })
  .strict();

const CapabilitySnapshotSchema: z.ZodType<
  z.infer<typeof CurrentCapabilitySnapshotSchema>
> = z.preprocess(
  migrateLegacyCapabilitySnapshot,
  CurrentCapabilitySnapshotSchema,
) as z.ZodType<z.infer<typeof CurrentCapabilitySnapshotSchema>>;

const RemoteRevisionSchema = z
  .object({
    strength: z.enum(['token', 'updated-at-and-hash', 'hash-only', 'unknown']),
    token: z.string().max(4_096).nullable(),
    updatedAt: TimestampSchema.nullable(),
    contentHash: z.string().min(1).max(512),
  })
  .strict();

const RemoteSnapshotCommonShape = {
  recordType: z.literal('snapshot'),
  snapshotId: StableIdSchema,
  bindingId: StableIdSchema,
  provider: ProviderSchema,
  observedAt: TimestampSchema,
  observedBy: z.preprocess(
    migrateLegacyCapabilityReference,
    CurrentCapabilityReferenceSchema,
  ),
  identity: RemoteIdentitySchema,
  revision: RemoteRevisionSchema,
  issue: CoreIssueSchema,
  lifecycle: LifecycleConditionSchema,
  contentRedacted: z.boolean(),
  redactionCount: z.number().int().min(0),
  extensions: ProviderExtensionsSchema.optional(),
};

const LegacyRemoteSnapshotRecordBaseSchema = z
  .object({
    ...RemoteSnapshotCommonShape,
    schemaVersion: z.literal(1),
    redactions: z
      .array(
        z
          .object({
            field: z.enum(['title', 'description', 'priority', 'status']),
            reason: z.enum(['credential', 'policy']),
          })
          .strict(),
      )
      .max(MAX_SNAPSHOT_SUPPRESSION_EVIDENCE),
  })
  .strict();

type LegacyRemoteSnapshotRecord = z.infer<
  typeof LegacyRemoteSnapshotRecordBaseSchema
>;

const LegacyRemoteSnapshotRecordSchema =
  LegacyRemoteSnapshotRecordBaseSchema.superRefine((record, context) => {
    if (record.redactionCount !== record.redactions.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redactionCount'],
        message: 'Legacy snapshot redactionCount must match redactions.',
      });
    }
    if (!record.contentRedacted && record.redactions.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contentRedacted'],
        message:
          'Legacy snapshot redaction evidence must mark content redacted.',
      });
    }
    if (
      record.contentRedacted &&
      record.redactions.length === 0 &&
      !snapshotContainsSensitiveSignal(record)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contentRedacted'],
        message:
          'Legacy snapshot has incomplete redaction evidence and requires refresh.',
      });
    }
  });

const CurrentRemoteSnapshotRecordBaseSchema = z
  .object({
    ...RemoteSnapshotCommonShape,
    schemaVersion: z.literal(2),
    redactions: z
      .array(
        z
          .object({
            field: SnapshotSuppressedFieldSchema,
            reason: z.enum(['sensitive-content', 'policy']),
            representation: z.literal('whole-field-marker'),
          })
          .strict(),
      )
      .max(MAX_SNAPSHOT_SUPPRESSION_EVIDENCE),
  })
  .strict();

type CurrentRemoteSnapshotRecord = z.infer<
  typeof CurrentRemoteSnapshotRecordBaseSchema
>;

const CurrentRemoteSnapshotRecordSchema =
  CurrentRemoteSnapshotRecordBaseSchema.superRefine(
    validateCurrentRemoteSnapshot,
  );

const RemoteSnapshotRecordCompatibilitySchema = z.union([
  CurrentRemoteSnapshotRecordSchema,
  LegacyRemoteSnapshotRecordSchema.transform(migrateLegacyRemoteSnapshot).pipe(
    CurrentRemoteSnapshotRecordSchema,
  ),
]);

// Runtime reads accept legacy v1 records, but callers and writes use only the
// canonical v2 output shape produced by the compatibility parser.
export const RemoteSnapshotRecordSchema: z.ZodType<CurrentRemoteSnapshotRecord> =
  RemoteSnapshotRecordCompatibilitySchema as z.ZodType<CurrentRemoteSnapshotRecord>;

const CORE_SNAPSHOT_FIELDS = [
  'title',
  'description',
  'priority',
  'status',
] as const;

function validateCurrentRemoteSnapshot(
  record: CurrentRemoteSnapshotRecord,
  context: z.RefinementCtx,
): void {
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
  if (record.contentRedacted !== record.redactions.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contentRedacted'],
      message:
        'Snapshot contentRedacted must match field suppression evidence.',
    });
  }

  const evidenceByField = new Map<string, number>();
  for (const [index, redaction] of record.redactions.entries()) {
    const fieldId = suppressionFieldId(redaction.field);
    if (evidenceByField.has(fieldId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redactions', index, 'field'],
        message: 'Snapshot suppression evidence fields must be unique.',
      });
    }
    evidenceByField.set(fieldId, index);

    const retainedValue =
      redaction.field.kind === 'core'
        ? record.issue[redaction.field.name]
        : record.extensions?.[record.provider]?.[redaction.field.key];
    if (retainedValue !== WHOLE_FIELD_SUPPRESSION_MARKER) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redactions', index, 'field'],
        message:
          'Snapshot suppression evidence requires the whole-field suppression marker.',
      });
    }
  }

  for (const field of CORE_SNAPSHOT_FIELDS) {
    validateRetainedSnapshotField(
      record.issue[field],
      `core:${field}`,
      ['issue', field],
      evidenceByField,
      context,
    );
  }

  for (const [provider, payload] of Object.entries(record.extensions ?? {})) {
    if (provider !== record.provider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extensions', provider],
        message: 'Snapshot extensions must match the snapshot provider.',
      });
      continue;
    }
    for (const [key, value] of Object.entries(payload ?? {})) {
      validateRetainedSnapshotField(
        value,
        `extension:${key}`,
        ['extensions', provider, key],
        evidenceByField,
        context,
      );
    }
  }
}

function validateRetainedSnapshotField(
  value: unknown,
  fieldId: string,
  path: Array<string | number>,
  evidenceByField: ReadonlyMap<string, number>,
  context: z.RefinementCtx,
): void {
  const hasEvidence = evidenceByField.has(fieldId);
  if (value === WHOLE_FIELD_SUPPRESSION_MARKER) {
    if (!hasEvidence) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message:
          'Snapshot contains an unpaired whole-field suppression marker.',
      });
    }
    return;
  }
  if (containsSensitiveContentSignalInValue(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message:
        'Snapshot retained field contains a sensitive-content signal without whole-field suppression.',
    });
  }
}

function migrateLegacyRemoteSnapshot(
  record: LegacyRemoteSnapshotRecord,
): CurrentRemoteSnapshotRecord {
  const coreReasons = new Map<
    (typeof CORE_SNAPSHOT_FIELDS)[number],
    'sensitive-content' | 'policy'
  >();
  for (const redaction of record.redactions) {
    coreReasons.set(
      redaction.field,
      redaction.reason === 'policy' ? 'policy' : 'sensitive-content',
    );
  }
  for (const field of CORE_SNAPSHOT_FIELDS) {
    const value = record.issue[field];
    if (
      typeof value === 'string' &&
      containsSensitiveContentSignal(value) &&
      !coreReasons.has(field)
    ) {
      coreReasons.set(field, 'sensitive-content');
    }
  }

  const issue = { ...record.issue };
  const redactions: CurrentRemoteSnapshotRecord['redactions'] = [];
  for (const field of CORE_SNAPSHOT_FIELDS) {
    const reason = coreReasons.get(field);
    if (!reason) continue;
    issue[field] = WHOLE_FIELD_SUPPRESSION_MARKER;
    redactions.push({
      field: { kind: 'core', name: field },
      reason,
      representation: 'whole-field-marker',
    });
  }

  const extensions = record.extensions ? { ...record.extensions } : undefined;
  const providerExtensions = record.extensions?.[record.provider];
  if (extensions && providerExtensions) {
    const migratedExtensions = { ...providerExtensions };
    extensions[record.provider] = migratedExtensions;
    for (const [key, value] of Object.entries(providerExtensions)) {
      if (!containsSensitiveContentSignalInValue(value)) continue;
      migratedExtensions[key] = WHOLE_FIELD_SUPPRESSION_MARKER;
      redactions.push({
        field: { kind: 'extension', key },
        reason: 'sensitive-content',
        representation: 'whole-field-marker',
      });
    }
  }

  return {
    ...record,
    schemaVersion: 2,
    issue,
    extensions,
    contentRedacted: redactions.length > 0,
    redactionCount: redactions.length,
    redactions,
  };
}

function snapshotContainsSensitiveSignal(
  record: LegacyRemoteSnapshotRecord,
): boolean {
  return (
    CORE_SNAPSHOT_FIELDS.some((field) => {
      const value = record.issue[field];
      return typeof value === 'string' && containsSensitiveContentSignal(value);
    }) ||
    Object.values(record.extensions?.[record.provider] ?? {}).some((value) =>
      containsSensitiveContentSignalInValue(value),
    )
  );
}

function suppressionFieldId(
  field: z.infer<typeof SnapshotSuppressedFieldSchema>,
): string {
  return field.kind === 'core'
    ? `core:${field.name}`
    : `extension:${field.key}`;
}

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

const CurrentRemoteBindingStateSchema = z
  .object({
    recordType: z.literal('binding-state'),
    schemaVersion: z.literal(2),
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

export const RemoteBindingStateSchema: z.ZodType<
  z.infer<typeof CurrentRemoteBindingStateSchema>
> = z.preprocess(
  migrateLegacyBindingState,
  CurrentRemoteBindingStateSchema,
) as z.ZodType<z.infer<typeof CurrentRemoteBindingStateSchema>>;

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
    approvalPreview: z.lazy(() => ApprovalPreviewSchema).optional(),
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
    operationClass: OperationClassSchema.optional(),
    approvedAt: TimestampSchema,
    actor: z.string().min(1).max(255).optional(),
    source: z.string().min(1).max(255),
  })
  .strict();

const OperationAttemptSchema = z
  .object({
    attemptId: StableIdSchema,
    startedAt: TimestampSchema,
    completedAt: TimestampSchema.nullable(),
    execution: CurrentCapabilityReferenceSchema,
    requestDigest: z.string().min(1).max(512),
    receiptDigest: z.string().min(1).max(512).nullable(),
  })
  .strict();

const ExternalObservationSchema = z
  .object({
    observedAt: TimestampSchema,
    classification: z.enum(['none', 'committed', 'not-committed', 'unknown']),
    evidenceDigest: z.string().min(1).max(512),
    actionDigest: z.string().min(1).max(512).optional(),
  })
  .strict();

const DurableVerificationReadActionSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: StableIdSchema,
    stepId: StableIdSchema,
    actionDigest: z.string().min(1).max(512),
    provider: ProviderSchema,
    semanticOperation: z.literal('read'),
    context: RemoteAccountContextSchema,
    intent: z.object({ stableId: z.string().min(1).max(512) }).strict(),
    expectedObservation: z
      .object({
        fields: z
          .array(
            z
              .string()
              .min(1)
              .max(64)
              .regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
          )
          .max(64),
        extensionFields: z
          .array(
            z
              .string()
              .min(1)
              .max(64)
              .regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
          )
          .max(32)
          .optional(),
        requireIdentity: z.literal(true),
        stableId: z.string().min(1).max(512),
        capabilityEvidenceDigest: z.string().min(1).max(512),
      })
      .strict(),
    outboundSafety: z.null(),
  })
  .strict();

const DurableVerificationHandoffSchema = z
  .object({
    acceptedMutation: z
      .object({
        actionDigest: z.string().min(1).max(512),
        observedAt: TimestampSchema,
        evidenceDigest: z.string().min(1).max(512),
        stableId: z.string().min(1).max(512),
      })
      .strict(),
    verificationAction: DurableVerificationReadActionSchema,
  })
  .strict()
  .superRefine((handoff, context) => {
    if (
      handoff.verificationAction.intent.stableId !==
        handoff.acceptedMutation.stableId ||
      handoff.verificationAction.expectedObservation.stableId !==
        handoff.acceptedMutation.stableId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['verificationAction', 'intent', 'stableId'],
        message:
          'Verification action identity must match accepted mutation evidence.',
      });
    }
  });

const FieldVerificationSchema = z
  .object({
    field: z.string().min(1).max(255),
    expectedHash: z.string().min(1).max(512),
    observedHash: z.string().min(1).max(512).nullable(),
    status: z.enum(['verified', 'mismatch', 'unavailable']),
  })
  .strict();

const MaterializationStepSchema = z
  .object({
    step: z.enum([
      'journal',
      'action-pointer',
      'target',
      'metadata',
      'state',
      'snapshot',
      'baseline',
      'association',
    ]),
    completedAt: TimestampSchema,
    evidenceDigest: z.string().min(1).max(512),
  })
  .strict();

const MaterializationPlanSchema = z
  .object({
    kind: z.enum(['create', 'intake-create', 'intake-enrich', 'update']),
    metadata: RemoteBindingMetadataSchema,
    finalState: RemoteBindingStateSchema,
    association: z
      .object({
        provider: ProviderSchema,
        ref: z.string().min(1).max(2_048),
        bindingId: StableIdSchema,
        target: RemoteLocalTargetSchema,
        seedContent: z.string().max(1_048_576).nullable(),
        resolutionBindingId: StableIdSchema.nullable().optional(),
        resolutionReferenceRef: z
          .string()
          .min(1)
          .max(2_048)
          .nullable()
          .optional(),
      })
      .strict()
      .nullable(),
    resolutionEvidence: z
      .object({
        schemaVersion: z.literal(1),
        formerSnapshot: RemoteSnapshotRecordSchema,
        replacementSnapshot: RemoteSnapshotRecordSchema,
        journalDigest: z.string().min(1).max(512),
      })
      .strict()
      .optional(),
    retireAction: z
      .object({
        stepId: StableIdSchema,
        actionDigest: z.string().min(1).max(512),
      })
      .strict()
      .optional(),
    terminal: z
      .object({
        state: z.enum(['verified', 'uncertain', 'rejected', 'blocked']),
        message: z.string().max(8_192).nullable(),
        verifiedAt: TimestampSchema.nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();

const ApprovalRevisionEvidenceSchema = z
  .object({
    source: z.enum(['remote', 'remote-unobserved', 'local-source-unbound']),
    strength: z.enum(['token', 'updated-at-and-hash', 'hash-only', 'unknown']),
    updatedAt: TimestampSchema.nullable(),
    observedAt: TimestampSchema.nullable(),
  })
  .strict();

const OperationPreviewSchema = z
  .object({
    digest: z.string().min(1).max(512),
    bindingId: StableIdSchema,
    provider: ProviderSchema,
    providerContext: RemoteAccountContextSchema,
    capabilityEvidenceDigest: z.string().min(1).max(512),
    revisionDigest: z.string().min(1).max(512),
    revisionEvidence: ApprovalRevisionEvidenceSchema.optional(),
    policyDigest: z.string().min(1).max(512),
    projectionDigest: z.string().min(1).max(512).nullable().optional(),
    safetyResultDigest: z.string().min(1).max(512).nullable().optional(),
  })
  .strict();

const ApprovalPreviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    digest: z.string().min(1).max(512),
    bindingId: StableIdSchema,
    provider: ProviderSchema,
    operationClass: OperationClassSchema,
    fieldMask: z
      .array(z.enum(['title', 'description', 'priority']))
      .min(1)
      .max(3),
    createdAt: TimestampSchema,
    componentDigests: z
      .object({
        target: z.string().min(1).max(512),
        baseline: z.string().min(1).max(512),
        revision: z.string().min(1).max(512),
        capability: z.string().min(1).max(512),
        policy: z.string().min(1).max(512),
        projection: z.string().min(1).max(512),
        outboundSafety: z.string().min(1).max(512),
      })
      .strict(),
    revisionEvidence: ApprovalRevisionEvidenceSchema.optional(),
    renderedFields: z.record(
      z.enum(['title', 'description', 'priority']),
      z.union([
        z
          .object({
            kind: z.literal('value'),
            value: z.string().nullable(),
          })
          .strict(),
        z
          .object({
            kind: z.literal('hash'),
            digest: z.string().min(1).max(512),
            bytes: z.number().int().nonnegative().max(1_048_576),
          })
          .strict(),
      ]),
    ),
  })
  .strict();

const CurrentRemoteOperationRecordSchema = z
  .object({
    recordType: z.literal('operation'),
    schemaVersion: z.literal(2),
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
    approvalPreview: ApprovalPreviewSchema.optional(),
    descriptionMode: DescriptionModeSchema.optional(),
    authority: AuthorityDecisionSchema.nullable(),
    approval: ApprovalEvidenceSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    selectedExecution: CurrentCapabilityReferenceSchema.nullable(),
    attempts: z.array(OperationAttemptSchema).max(32),
    observations: z.array(ExternalObservationSchema).max(64),
    verification: z.array(FieldVerificationSchema).max(64),
    retryDisposition: z.enum([
      'not-applicable',
      'safe-before-attempt',
      'reconcile-required',
    ]),
    steps: z.array(RemoteOperationStepSchema).max(64),
    materializationSteps: z.array(MaterializationStepSchema).max(8).optional(),
    materializationPlan: MaterializationPlanSchema.optional(),
    currentAction: DurableVerificationReadActionSchema.optional(),
    verificationHandoff: DurableVerificationHandoffSchema.optional(),
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
      record.approvalPreview &&
      (record.approvalPreview.digest !== record.preview.digest ||
        record.approvalPreview.bindingId !== record.bindingId ||
        record.approvalPreview.provider !== record.provider ||
        record.approvalPreview.operationClass !== record.operationClass)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvalPreview'],
        message: 'Approval preview must match its persisted operation.',
      });
    }
    if (
      record.approvalPreview &&
      ((record.approvalPreview.revisionEvidence === undefined) !==
        (record.preview.revisionEvidence === undefined) ||
        (record.approvalPreview.revisionEvidence !== undefined &&
          JSON.stringify(record.approvalPreview.revisionEvidence) !==
            JSON.stringify(record.preview.revisionEvidence)))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvalPreview', 'revisionEvidence'],
        message:
          'Approval revision freshness evidence must match its digest-bound operation preview.',
      });
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
    if (
      (record.preview.projectionDigest == null) !==
      (record.preview.safetyResultDigest == null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preview'],
        message:
          'Operation preview projection and safety-result digests must be persisted together.',
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
      if (
        step.approvalPreview &&
        (step.approvalPreview.digest !== step.previewDigest ||
          step.approvalPreview.bindingId !== record.bindingId ||
          step.approvalPreview.provider !== record.provider ||
          step.approvalPreview.operationClass !== step.semanticOperation)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'approvalPreview'],
          message: 'Substep approval preview must match its persisted step.',
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
    const materializationSeen = new Set<string>();
    for (const [index, step] of (record.materializationSteps ?? []).entries()) {
      if (materializationSeen.has(step.step)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['materializationSteps', index, 'step'],
          message: `Duplicate materialization step '${step.step}'.`,
        });
      }
      materializationSeen.add(step.step);
    }
    if (record.materializationPlan) {
      if (
        record.materializationPlan.metadata.bindingId !== record.bindingId ||
        record.materializationPlan.finalState.bindingId !== record.bindingId
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['materializationPlan'],
          message: 'Materialization plan binding must match its operation.',
        });
      }
      const evidence = record.materializationPlan.resolutionEvidence;
      if (
        evidence &&
        (evidence.formerSnapshot.bindingId !== record.bindingId ||
          evidence.replacementSnapshot.bindingId !== record.bindingId ||
          evidence.formerSnapshot.provider !== record.provider ||
          evidence.replacementSnapshot.provider !== record.provider)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['materializationPlan', 'resolutionEvidence'],
          message:
            'Resolution snapshot evidence must match its persisted operation.',
        });
      }
      if (record.state === 'verified') {
        const required = new Set<string>([
          'journal',
          ...(record.materializationPlan.retireAction
            ? ['action-pointer']
            : []),
          ...(record.materializationPlan.association?.seedContent
            ? ['target']
            : []),
          ...(record.materializationPlan.kind === 'update' ? [] : ['metadata']),
          'state',
          'snapshot',
          'baseline',
          ...(record.materializationPlan.association ? ['association'] : []),
        ]);
        const completed = new Set<string>(
          (record.materializationSteps ?? []).map((step) => step.step),
        );
        if ([...required].some((step) => !completed.has(step))) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['materializationSteps'],
            message:
              'Verified materialization requires every planned local step.',
          });
        }
      }
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
      record.selectedExecution &&
      record.selectedExecution.provider !== record.provider
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedExecution', 'provider'],
        message: 'Selected execution provider must match operation provider.',
      });
    }
    if (
      record.selectedExecution &&
      JSON.stringify(record.selectedExecution.context) !==
        JSON.stringify(record.providerContext)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedExecution', 'context'],
        message:
          'Selected execution context must match operation provider context.',
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
    if (record.verificationHandoff) {
      const handoff = record.verificationHandoff;
      if (
        !record.currentAction ||
        JSON.stringify(record.currentAction) !==
          JSON.stringify(handoff.verificationAction)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['currentAction'],
          message:
            'Verification-pending evidence requires the exact canonical current action.',
        });
      }
      if (
        handoff.verificationAction.operationId !== record.operationId ||
        handoff.verificationAction.provider !== record.provider ||
        JSON.stringify(handoff.verificationAction.context) !==
          JSON.stringify(record.providerContext)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verificationHandoff', 'verificationAction'],
          message:
            'Verification handoff action must match its persisted operation.',
        });
      }
      const acceptedObservation = record.observations.find(
        (item) =>
          item.actionDigest === handoff.acceptedMutation.actionDigest &&
          item.evidenceDigest === handoff.acceptedMutation.evidenceDigest &&
          item.observedAt === handoff.acceptedMutation.observedAt,
      );
      if (
        !acceptedObservation ||
        acceptedObservation.classification !== 'committed'
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verificationHandoff', 'acceptedMutation'],
          message:
            'Verification handoff requires matching committed mutation evidence.',
        });
      }
      const acceptedAttempt = record.attempts.find(
        (attempt) =>
          attempt.requestDigest === handoff.acceptedMutation.actionDigest &&
          attempt.completedAt !== null &&
          attempt.receiptDigest === handoff.acceptedMutation.evidenceDigest,
      );
      if (!acceptedAttempt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verificationHandoff', 'acceptedMutation'],
          message:
            'Verification handoff requires matching completed attempt evidence.',
        });
      }
      if (
        !['verification-pending', 'verified', 'partial', 'uncertain'].includes(
          record.state,
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verificationHandoff'],
          message:
            'Verification handoff is valid only after the mutation attempt.',
        });
      }
    }
    if (record.currentAction && !record.verificationHandoff) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentAction'],
        message:
          'Canonical current action requires its matching verification handoff.',
      });
    }
  });

export const RemoteOperationRecordSchema: z.ZodType<
  z.infer<typeof CurrentRemoteOperationRecordSchema>
> = z.preprocess(
  migrateLegacyOperationRecord,
  CurrentRemoteOperationRecordSchema,
) as z.ZodType<z.infer<typeof CurrentRemoteOperationRecordSchema>>;

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

function migrateLegacyCapabilityReference(value: unknown): unknown {
  if (!isPlainRecord(value) || !('transport' in value)) return value;
  return {
    provider: value.provider,
    surfaceKind: 'legacy-observation',
    context: value.context,
    evidenceDigest: value.capabilityDigest,
    semanticCapabilities: [],
  };
}

function migrateLegacyCapabilitySnapshot(value: unknown): unknown {
  if (!isPlainRecord(value) || !('transport' in value)) return value;
  return {
    schemaVersion: 2,
    provider: value.provider,
    surfaceKind: 'legacy-observation',
    context: value.context,
    availability: 'unsupported-or-unresolved',
    permissions: 'unknown',
    semanticCapabilities: [],
    observedAt: value.observedAt,
    evidenceDigest: value.evidenceDigest,
  };
}

function migrateLegacyBindingState(value: unknown): unknown {
  if (!isPlainRecord(value) || value.recordType !== 'binding-state')
    return value;
  if (value.schemaVersion !== 1) return value;
  return {
    ...value,
    schemaVersion: 2,
    capability: migrateLegacyCapabilitySnapshot(value.capability),
  };
}

function migrateLegacyOperationRecord(value: unknown): unknown {
  if (!isPlainRecord(value) || value.recordType !== 'operation') return value;
  if (value.schemaVersion !== 1) return value;
  const preview = isPlainRecord(value.preview)
    ? {
        ...value.preview,
        capabilityEvidenceDigest:
          value.preview.capabilityEvidenceDigest ??
          value.preview.capabilityDigest,
        projectionDigest: value.preview.projectionDigest ?? null,
        safetyResultDigest: value.preview.safetyResultDigest ?? null,
      }
    : value.preview;
  if (isPlainRecord(preview)) delete preview.capabilityDigest;
  const selectedExecution = migrateLegacyCapabilityReference(
    value.selectedExecution ?? value.selectedTransport,
  );
  const attempts = Array.isArray(value.attempts)
    ? value.attempts.map((attempt) => {
        if (!isPlainRecord(attempt)) return attempt;
        const execution = migrateLegacyCapabilityReference(
          attempt.execution ?? attempt.transport,
        );
        const migrated: Record<string, unknown> = { ...attempt, execution };
        delete migrated.transport;
        return migrated;
      })
    : value.attempts;
  const migrated: Record<string, unknown> = {
    ...value,
    schemaVersion: 2,
    preview,
    selectedExecution,
    attempts,
  };
  delete migrated.transport;
  delete migrated.selectedTransport;
  return migrated;
}

function markIncompleteProjectCreate(value: unknown): unknown {
  if (!isPlainRecord(value) || value.schemaVersion !== 1) return value;
  if (value.projectionStatus !== undefined) return value;
  const target = isPlainRecord(value.target) ? value.target : null;
  const localProjection = isPlainRecord(value.localProjection)
    ? value.localProjection
    : null;
  return {
    ...value,
    projectionStatus:
      target?.kind === 'project' && localProjection === null
        ? 'reconcile-required'
        : 'complete',
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
