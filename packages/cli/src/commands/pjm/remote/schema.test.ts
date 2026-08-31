import { describe, expect, it } from 'vitest';

import {
  MAX_PROVIDER_EXTENSION_BYTES,
  PlannedBindingCreateSchema,
  RemoteBaselineRecordSchema,
  RemoteBatchRecordSchema,
  RemoteBindingMetadataSchema,
  RemoteBindingStateSchema,
  RemoteOperationRecordSchema,
  RemoteSnapshotRecordSchema,
  VerifiedDurableRemoteIdentitySchema,
  assertRecordIdMatchesFilename,
} from './schema';

const target = {
  kind: 'backlog' as const,
  scope: 'shared' as const,
  id: 'item-123',
  path: '.oat/repo/pjm/backlog/item-123.md',
};

const identity = {
  stableId: 'issue-node-123',
  context: {
    host: 'github.com',
    owner: 'voxmedia',
    repositoryId: 'repo-123',
  },
  aliases: [{ kind: 'url' as const, value: 'https://github.com/a/b/issues/1' }],
};
const timestamp = '2026-08-31T00:00:00.000Z';
const providerContext = identity.context;
const capabilityReference = {
  provider: 'github' as const,
  transport: 'gh',
  context: providerContext,
  capabilityDigest: 'sha256:capability',
};
const revision = {
  strength: 'token' as const,
  token: 'W/"123"',
  updatedAt: timestamp,
  contentHash: 'sha256:remote-content',
};
const publicationProjection = {
  title: 'frontmatter' as const,
  description: 'description-section' as const,
  priority: 'frontmatter' as const,
};
const authority = {
  effective: 'user-approved' as const,
  sourceDigest: 'sha256:policy',
};

describe('remote record schemas', () => {
  it('rejects records missing durable identity, lifecycle, operation, or batch evidence', () => {
    expect(() =>
      RemoteBindingMetadataSchema.parse({
        recordType: 'binding-metadata',
        schemaVersion: 1,
        bindingId: 'bnd_binding_123',
        provider: 'github',
        target,
        remoteIdentity: identity,
        purposes: ['source'],
        policyRestrictions: {},
        lifecycle: 'active',
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      }),
    ).toThrow(/identityHistory|publicationProjection|provenance/i);
    expect(() =>
      RemoteOperationRecordSchema.parse({
        recordType: 'operation',
        schemaVersion: 1,
        operationId: 'op_operation_123',
        bindingId: 'bnd_binding_123',
        operationClass: 'update-fields',
        state: 'planned',
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
        transport: null,
        steps: [],
        outcome: { classification: 'pending', message: null, verifiedAt: null },
      }),
    ).toThrow(/correlationId|lifecycleOperation|retryDisposition/i);
    expect(() =>
      RemoteBatchRecordSchema.parse({
        recordType: 'batch',
        schemaVersion: 1,
        batchId: 'batch_batch_123',
        state: 'planned',
        members: [
          {
            bindingId: 'bnd_binding_123',
            operationId: 'op_operation_123',
            outcome: {
              classification: 'pending',
              message: null,
              verifiedAt: null,
            },
          },
        ],
        createdAt: '2026-08-31T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      }),
    ).toThrow(/membershipDigest|previewDigest|authority/i);
  });

  it('parses strict portable binding metadata with aliases and policy restrictions', () => {
    const parsed = RemoteBindingMetadataSchema.parse({
      recordType: 'binding-metadata',
      schemaVersion: 1,
      bindingId: 'bnd_binding_123',
      provider: 'github',
      target,
      remoteIdentity: identity,
      identityHistory: [],
      purposes: ['source', 'planning'],
      policyRestrictions: {
        description: 'managed-section',
        authority: { default: 'user-approved' },
      },
      publicationProjection,
      provenanceToken: 'oat-binding:bnd_binding_123',
      lifecycle: 'active',
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });

    expect(parsed.bindingId).toBe('bnd_binding_123');
    expect(() =>
      RemoteBindingMetadataSchema.parse({ ...parsed, description: 'secret' }),
    ).toThrow();
  });

  it('parses binding state, snapshots, and baselines with bounded core content', () => {
    const snapshot = RemoteSnapshotRecordSchema.parse({
      recordType: 'snapshot',
      schemaVersion: 1,
      snapshotId: 'snap_snapshot_123',
      bindingId: 'bnd_binding_123',
      provider: 'github',
      observedAt: '2026-08-31T00:00:00.000Z',
      observedBy: capabilityReference,
      identity,
      revision,
      issue: {
        title: 'Remote title',
        description: '[REDACTED]',
        priority: 'high',
        status: 'open',
      },
      lifecycle: 'active',
      contentRedacted: true,
      redactionCount: 1,
      redactions: [{ field: 'description', reason: 'credential' }],
      extensions: { github: { milestone: 'M1' } },
    });
    const baseline = RemoteBaselineRecordSchema.parse({
      recordType: 'baseline',
      schemaVersion: 1,
      baselineId: 'base_baseline_123',
      bindingId: 'bnd_binding_123',
      agreedAt: '2026-08-31T00:00:00.000Z',
      acceptedByOperationId: 'op_operation_123',
      localProjectionRevision: 'sha256:local-revision',
      remoteRevision: revision,
      fields: {
        title: { value: 'Remote title', hash: 'sha256:title' },
        description: { value: '[REDACTED]', hash: 'sha256:body' },
        priority: { value: 'high', hash: 'sha256:priority' },
      },
    });
    const state = RemoteBindingStateSchema.parse({
      recordType: 'binding-state',
      schemaVersion: 1,
      bindingId: 'bnd_binding_123',
      provider: 'github',
      metadataUpdatedAt: '2026-08-31T00:00:00.000Z',
      localProjection: {
        title: 'Local title',
        description: 'Local description',
        priority: 'high',
        source: 'backlog-description',
        sourceRevision: 'sha256:local-revision',
        observedAt: timestamp,
      },
      snapshot,
      baseline,
      capability: {
        schemaVersion: 1,
        provider: 'github',
        transport: 'gh',
        transportVersion: '2.0.0',
        catalogFingerprint: 'sha256:catalog',
        context: providerContext,
        availability: 'available',
        permissions: 'known',
        observedAt: timestamp,
        evidenceDigest: 'sha256:probe-evidence',
      },
      contentRedacted: true,
      lifecycle: 'active',
      lifecycleCondition: 'active',
      activeOperationIds: ['op_operation_123'],
      createdAt: timestamp,
      updatedAt: '2026-08-31T00:00:00.000Z',
    });

    expect(state.snapshot?.contentRedacted).toBe(true);
    expect(() =>
      RemoteBindingStateSchema.parse({
        ...state,
        snapshot: { ...snapshot, provider: 'linear' },
      }),
    ).toThrow(/snapshot provider/i);
    expect(() =>
      RemoteBindingStateSchema.parse({
        ...state,
        baseline: { ...baseline, bindingId: 'bnd_binding_456' },
      }),
    ).toThrow(/baseline bindingId/i);
    expect(() =>
      RemoteSnapshotRecordSchema.parse({
        ...snapshot,
        observedBy: {
          ...snapshot.observedBy,
          context: { host: 'other.example.test' },
        },
      }),
    ).toThrow(/capability context/i);
  });

  it('parses operations, unique substeps, batches, and independent outcomes', () => {
    const operation = RemoteOperationRecordSchema.parse({
      recordType: 'operation',
      schemaVersion: 1,
      operationId: 'op_operation_123',
      correlationId: 'corr_operation_123',
      bindingId: 'bnd_binding_123',
      provider: 'github',
      providerContext,
      lifecycleOperation: 'reconcile',
      operationClass: 'update-fields',
      state: 'attempt-started',
      reason: { code: 'local-change', message: 'Local fields changed.' },
      lastSafeStep: 'attempt-started',
      preview: {
        digest: 'sha256:preview',
        bindingId: 'bnd_binding_123',
        provider: 'github',
        providerContext,
        capabilityDigest: 'sha256:capability',
        revisionDigest: 'sha256:revision',
        policyDigest: 'sha256:policy',
      },
      authority,
      approval: {
        previewDigest: 'sha256:preview',
        approvedAt: timestamp,
        source: 'test approval',
      },
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      transport: { id: 'gh', provider: 'github' },
      selectedTransport: capabilityReference,
      attempts: [
        {
          attemptId: 'attempt_update_123',
          startedAt: timestamp,
          completedAt: null,
          transport: capabilityReference,
          requestDigest: 'sha256:request',
          receiptDigest: null,
        },
      ],
      observations: [
        {
          observedAt: timestamp,
          classification: 'unknown',
          evidenceDigest: 'sha256:observation',
        },
      ],
      verification: [],
      retryDisposition: 'reconcile-required',
      steps: [
        {
          stepId: 'step_update_123',
          semanticOperation: 'update-fields',
          state: 'attempt-started',
          actionDigest: 'sha256:action',
          previewDigest: 'sha256:preview',
          authority,
          approvalRequirement: 'fresh-approval',
          approval: {
            previewDigest: 'sha256:preview',
            approvedAt: timestamp,
            source: 'test approval',
          },
          attempts: ['attempt_update_123'],
          verification: [],
          retryDisposition: 'reconcile-required',
        },
      ],
      outcome: { classification: 'pending', message: null, verifiedAt: null },
    });
    const batch = RemoteBatchRecordSchema.parse({
      recordType: 'batch',
      schemaVersion: 1,
      batchId: 'batch_batch_123',
      lifecycleOperation: 'reconcile',
      state: 'partial',
      membershipDigest: 'sha256:membership',
      previewDigest: 'sha256:batch-preview',
      authority,
      approval: null,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      members: [
        {
          bindingId: 'bnd_binding_123',
          operationId: operation.operationId,
          bindingPreviewDigest: 'sha256:binding-preview-123',
        },
        {
          bindingId: 'bnd_binding_456',
          operationId: 'op_operation_456',
          bindingPreviewDigest: 'sha256:binding-preview-456',
        },
      ],
      outcomes: {
        op_operation_123: 'verified',
        op_operation_456: 'blocked',
      },
    });

    expect(batch.outcomes).toEqual({
      op_operation_123: 'verified',
      op_operation_456: 'blocked',
    });
    expect(() =>
      RemoteOperationRecordSchema.parse({
        ...operation,
        steps: [operation.steps[0], operation.steps[0]],
      }),
    ).toThrow(/duplicate stepId/i);
    expect(() =>
      RemoteOperationRecordSchema.parse({
        ...operation,
        preview: { ...operation.preview, bindingId: 'bnd_binding_456' },
      }),
    ).toThrow(/preview bindingId/i);
    expect(() =>
      RemoteOperationRecordSchema.parse({
        ...operation,
        selectedTransport: {
          ...operation.selectedTransport!,
          context: { host: 'other.example.test' },
        },
      }),
    ).toThrow(/transport context/i);
    expect(() =>
      RemoteBatchRecordSchema.parse({
        ...batch,
        outcomes: { op_operation_123: 'verified' },
      }),
    ).toThrow(/outcomes.*membership/i);
  });

  it('rejects unsupported independent schema versions and unstable IDs', () => {
    expect(() =>
      RemoteSnapshotRecordSchema.parse({
        recordType: 'snapshot',
        schemaVersion: 2,
        snapshotId: 'snap_snapshot_123',
      }),
    ).toThrow();
    expect(() =>
      RemoteBindingMetadataSchema.parse({
        recordType: 'binding-metadata',
        schemaVersion: 1,
        bindingId: '../escape',
      }),
    ).toThrow();
  });

  it('enforces adapter extension allowlists and byte limits', () => {
    const base = {
      recordType: 'snapshot' as const,
      schemaVersion: 1 as const,
      snapshotId: 'snap_snapshot_123',
      bindingId: 'bnd_binding_123',
      provider: 'github' as const,
      observedAt: '2026-08-31T00:00:00.000Z',
      observedBy: capabilityReference,
      identity,
      revision: { ...revision, token: null, strength: 'unknown' as const },
      issue: {
        title: 'Remote title',
        description: 'Body',
        priority: null,
        status: 'open',
      },
      lifecycle: 'active' as const,
      contentRedacted: false,
      redactionCount: 0,
      redactions: [],
    };
    expect(() =>
      RemoteSnapshotRecordSchema.parse({
        ...base,
        extensions: { unknown: { value: true } },
      }),
    ).toThrow();
    expect(() =>
      RemoteSnapshotRecordSchema.parse({
        ...base,
        extensions: {
          github: { milestone: 'x'.repeat(MAX_PROVIDER_EXTENSION_BYTES) },
        },
      }),
    ).toThrow(/byte limit/i);
  });

  it('requires record IDs to match stable filenames', () => {
    expect(() =>
      assertRecordIdMatchesFilename(
        '/state/operations/op_operation_123.json',
        'op_operation_123',
      ),
    ).not.toThrow();
    expect(() =>
      assertRecordIdMatchesFilename(
        '/state/operations/op_other_456.json',
        'op_operation_123',
      ),
    ).toThrow(/filename/i);
  });

  it('defines pre-create intent without a remote identity and explicit publication projection', () => {
    const intent = PlannedBindingCreateSchema.parse({
      schemaVersion: 1,
      bindingId: 'bnd_binding_789',
      operationId: 'op_operation_789',
      provider: 'linear',
      target: {
        kind: 'project',
        scope: 'synced',
        id: 'project-demo',
        path: '.oat/projects/synced/demo',
      },
      publicationProjection: {
        title: 'plan',
        description: 'summary',
        priority: 'none',
      },
      providerContext: { workspaceId: 'workspace-1', teamId: 'team-1' },
      purposes: ['planning'],
      policyRestrictions: { authority: { default: 'user-approved' } },
      provenanceToken: 'oat-create:project-demo:bnd_binding_789',
      createdAt: '2026-08-31T00:00:00.000Z',
    });

    expect(intent).not.toHaveProperty('remoteIdentity');
    expect(() =>
      PlannedBindingCreateSchema.parse({
        ...intent,
        remoteIdentity: identity,
      }),
    ).toThrow();
    expect(() =>
      PlannedBindingCreateSchema.parse({
        ...intent,
        publicationProjection: undefined,
      }),
    ).toThrow();
  });

  it('requires explicit durable-identity verification evidence for materialization', () => {
    expect(() =>
      VerifiedDurableRemoteIdentitySchema.parse({
        provider: 'github',
        stableId: 'issue-node-123',
      }),
    ).toThrow();
    expect(
      VerifiedDurableRemoteIdentitySchema.parse({
        provider: 'github',
        stableId: 'issue-node-123',
        verifiedAt: '2026-08-31T00:01:00.000Z',
        evidenceDigest: 'sha256:verified-readback',
      }),
    ).toMatchObject({ provider: 'github', stableId: 'issue-node-123' });
  });
});
