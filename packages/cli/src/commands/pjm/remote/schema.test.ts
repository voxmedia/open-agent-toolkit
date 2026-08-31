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

describe('remote record schemas', () => {
  it('parses strict portable binding metadata with aliases and policy restrictions', () => {
    const parsed = RemoteBindingMetadataSchema.parse({
      recordType: 'binding-metadata',
      schemaVersion: 1,
      bindingId: 'bnd_binding_123',
      provider: 'github',
      target,
      remoteIdentity: identity,
      purposes: ['source', 'planning'],
      policyRestrictions: {
        description: 'managed-section',
        authority: { default: 'user-approved' },
      },
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
      revision: { token: 'W/"123"', strength: 'strong' },
      issue: {
        title: 'Remote title',
        description: '[REDACTED]',
        priority: 'high',
        status: 'open',
      },
      contentRedacted: true,
      redactions: [{ field: 'description', reason: 'credential' }],
      extensions: { github: { milestone: 'M1' } },
    });
    const baseline = RemoteBaselineRecordSchema.parse({
      recordType: 'baseline',
      schemaVersion: 1,
      baselineId: 'base_baseline_123',
      bindingId: 'bnd_binding_123',
      agreedAt: '2026-08-31T00:00:00.000Z',
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
      metadataUpdatedAt: '2026-08-31T00:00:00.000Z',
      snapshot,
      baseline,
      lifecycle: 'active',
      activeOperationIds: ['op_operation_123'],
      updatedAt: '2026-08-31T00:00:00.000Z',
    });

    expect(state.snapshot?.contentRedacted).toBe(true);
  });

  it('parses operations, unique substeps, batches, and independent outcomes', () => {
    const operation = RemoteOperationRecordSchema.parse({
      recordType: 'operation',
      schemaVersion: 1,
      operationId: 'op_operation_123',
      bindingId: 'bnd_binding_123',
      operationClass: 'update-fields',
      state: 'attempt-started',
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      transport: { id: 'gh', provider: 'github' },
      steps: [
        {
          stepId: 'step_update_123',
          semanticOperation: 'update-fields',
          state: 'attempt-started',
          actionDigest: 'sha256:action',
        },
      ],
      outcome: { classification: 'pending', message: null, verifiedAt: null },
    });
    const batch = RemoteBatchRecordSchema.parse({
      recordType: 'batch',
      schemaVersion: 1,
      batchId: 'batch_batch_123',
      state: 'partial',
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      members: [
        {
          bindingId: 'bnd_binding_123',
          operationId: operation.operationId,
          outcome: {
            classification: 'verified',
            message: 'updated',
            verifiedAt: '2026-08-31T00:01:00.000Z',
          },
        },
        {
          bindingId: 'bnd_binding_456',
          operationId: 'op_operation_456',
          outcome: {
            classification: 'blocked',
            message: 'approval required',
            verifiedAt: null,
          },
        },
      ],
    });

    expect(
      batch.members.map((member) => member.outcome.classification),
    ).toEqual(['verified', 'blocked']);
    expect(() =>
      RemoteOperationRecordSchema.parse({
        ...operation,
        steps: [operation.steps[0], operation.steps[0]],
      }),
    ).toThrow(/duplicate stepId/i);
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
      revision: { token: null, strength: 'unknown' as const },
      issue: {
        title: 'Remote title',
        description: 'Body',
        priority: null,
        status: 'open',
      },
      contentRedacted: false,
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
