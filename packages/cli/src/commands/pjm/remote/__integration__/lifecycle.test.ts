import { describe, expect, it } from 'vitest';

import {
  acceptExternalObservation,
  buildExternalAction,
} from '../external-action';
import { WHOLE_FIELD_SUPPRESSION_MARKER } from '../schema';
import { sanitizeRemoteSnapshot } from '../snapshot';
import {
  FakeLifecycleStore,
  GenericHostExecutor,
  LifecycleHarness,
  type CrashPoint,
} from './lifecycle-harness';

const base = {
  operationId: 'op_harness_001',
  bindingId: 'bnd_harness_001',
  provider: 'linear' as const,
  context: { workspaceId: 'workspace-1', teamId: 'team-1' },
  projection: { title: 'Published title' },
  previewDigest: 'sha256:preview',
  approvalDigest: 'sha256:preview',
  capabilityEvidenceDigest: 'sha256:capability',
};

describe('lifecycle integration harness', () => {
  it('carries one generic adapter extension suppression pair into a snapshot', () => {
    const action = buildExternalAction({
      operationId: 'op_extension_001',
      stepId: 'step_extension_001',
      provider: 'linear',
      semanticOperation: 'read',
      context: base.context,
      intent: { stableId: 'issue-1' },
      expectedObservation: {
        fields: ['title', 'description', 'priority', 'status'],
        extensionFields: ['workflow'],
        requireIdentity: true,
        stableId: 'issue-1',
        capabilityEvidenceDigest: base.capabilityEvidenceDigest,
      },
      persistedPreview: {},
    });
    const accepted = acceptExternalObservation({
      action,
      observation: {
        schemaVersion: 1,
        operationId: action.operationId,
        stepId: action.stepId,
        actionDigest: action.actionDigest,
        observedAt: '2026-08-31T12:01:00.000Z',
        surfaceKind: 'connector',
        capabilityEvidenceDigest: base.capabilityEvidenceDigest,
        provider: 'linear',
        context: base.context,
        outcome: {
          classification: 'observed',
          identity: { stableId: 'issue-1', aliases: [] },
          fields: {
            title: 'Remote title',
            description: 'Remote description',
            priority: null,
            status: 'open',
          },
          extensions: { workflow: 'api key adapter-private-tail' },
          revisionDigest: 'sha256:revision',
          diagnosticCode: null,
        },
      },
    });
    const snapshot = sanitizeRemoteSnapshot(
      {
        snapshotId: 'snap_extension_001',
        bindingId: 'bnd_extension_001',
        provider: 'linear',
        observedAt: accepted.observedAt,
        observedBy: {
          provider: 'linear',
          surfaceKind: accepted.surfaceKind,
          context: base.context,
          evidenceDigest: accepted.capabilityEvidenceDigest,
          semanticCapabilities: ['read'],
        },
        identity: {
          stableId: 'issue-1',
          context: base.context,
          aliases: [],
        },
        revision: {
          strength: 'hash-only',
          token: null,
          updatedAt: accepted.observedAt,
          contentHash: 'sha256:revision',
        },
        issue: {
          title: String(accepted.outcome.fields.title),
          description: String(accepted.outcome.fields.description),
          priority: null,
          status: String(accepted.outcome.fields.status),
        },
        extensions: accepted.outcome.extensions,
        lifecycle: 'active',
      },
      {
        allowedExtensionKeys: action.expectedObservation.extensionFields,
        suppressedFields: accepted.outcome.suppressedFields,
      },
    );
    expect(snapshot.extensions?.linear?.workflow).toBe(
      WHOLE_FIELD_SUPPRESSION_MARKER,
    );
    expect(snapshot.redactions).toEqual([
      {
        field: { kind: 'extension', key: 'workflow' },
        reason: 'sensitive-content',
        representation: 'whole-field-marker',
      },
    ]);
    expect(JSON.stringify(snapshot)).not.toContain('adapter-private-tail');
  });
  it.each(['after-planned', 'after-observation'] as CrashPoint[])(
    'restarts after %s without repeating completed transitions',
    async (crashAt) => {
      const store = new FakeLifecycleStore();
      const executor = new GenericHostExecutor();
      const first = new LifecycleHarness({ store, executor });
      await expect(first.publish({ ...base, crashAt })).rejects.toThrow(
        `crash:${crashAt}`,
      );
      const resumed = new LifecycleHarness({ store, executor });
      await expect(resumed.publish(base)).resolves.toMatchObject({
        state: 'verified',
      });
      expect(executor.calls).toBe(1);
    },
  );

  it.each([
    'after-metadata',
    'after-state',
    'after-snapshot',
    'after-baseline',
    'after-association',
    'after-terminal',
  ] as CrashPoint[])(
    'resumes materialization after %s without another host execution',
    async (crashAt) => {
      const store = new FakeLifecycleStore();
      const executor = new GenericHostExecutor();
      await expect(
        new LifecycleHarness({ store, executor }).publish({ ...base, crashAt }),
      ).rejects.toThrow(`crash:${crashAt}`);
      const operation = store.operations.get(base.operationId)!;
      if (crashAt === 'after-terminal') {
        expect(operation.state).toBe('verified');
      } else {
        await expect(
          new LifecycleHarness({ store, executor }).publish(base),
        ).resolves.toMatchObject({ state: 'verified' });
      }
      expect(executor.calls).toBe(1);
      expect(operation.materializationSteps).toEqual([
        'metadata',
        'state',
        'snapshot',
        'baseline',
        'association',
      ]);
    },
  );

  it('freezes restart after attempt-started as uncertain instead of blind retry', async () => {
    const store = new FakeLifecycleStore();
    const executor = new GenericHostExecutor();
    await expect(
      new LifecycleHarness({ store, executor }).publish({
        ...base,
        crashAt: 'after-attempt-started',
      }),
    ).rejects.toThrow(/crash/);
    await expect(
      new LifecycleHarness({ store, executor }).publish(base),
    ).resolves.toMatchObject({ state: 'uncertain' });
    expect(executor.calls).toBe(0);
  });

  it('blocks stale approval and changed pinned semantic capability evidence', async () => {
    const stale = new LifecycleHarness();
    await expect(
      stale.publish({ ...base, approvalDigest: 'sha256:stale' }),
    ).resolves.toMatchObject({ state: 'blocked', action: null });
    expect(stale.executor.calls).toBe(0);
    const store = new FakeLifecycleStore();
    await expect(
      new LifecycleHarness({ store }).publish({
        ...base,
        crashAt: 'after-planned',
      }),
    ).rejects.toThrow(/crash/);
    await expect(
      new LifecycleHarness({ store }).publish({
        ...base,
        capabilityEvidenceDigest: 'sha256:changed',
      }),
    ).resolves.toMatchObject({ state: 'blocked' });
  });

  it('marks unknown execution and unavailable readback uncertain', async () => {
    const unknown = new LifecycleHarness({
      executor: new GenericHostExecutor({
        classification: 'unknown',
        observationDigest: 'sha256:unknown',
      }),
    });
    await expect(unknown.publish(base)).resolves.toMatchObject({
      state: 'uncertain',
    });
    const unreadable = new LifecycleHarness({
      readback: async () => {
        throw new Error('offline');
      },
    });
    await expect(unreadable.publish(base)).resolves.toMatchObject({
      state: 'uncertain',
    });
  });

  it('returns a terminal local journal result without another host execution', async () => {
    const store = new FakeLifecycleStore();
    const executor = new GenericHostExecutor();
    const harness = new LifecycleHarness({ store, executor });
    await expect(harness.publish(base)).resolves.toMatchObject({
      state: 'verified',
    });
    await expect(
      new LifecycleHarness({ store, executor }).publish(base),
    ).resolves.toMatchObject({ state: 'verified' });
    expect(executor.calls).toBe(1);
  });
});
