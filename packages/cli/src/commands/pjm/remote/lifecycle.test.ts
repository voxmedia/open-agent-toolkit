import { describe, expect, it, vi } from 'vitest';

import {
  intakeRemoteIssue,
  publishBinding,
  publishUnboundBinding,
  reconcileRemoteBinding,
  refreshBinding,
  type LifecycleBinding,
  type LifecycleDependencies,
} from './lifecycle';
import { assessOutboundProjectionSafety } from './outbound-projection-safety';
import {
  semanticDigest,
  type ProviderAdapter,
  type SanitizedProviderObservation,
} from './provider';
import { validateSemanticObservation } from './provider-conformance';
import { WHOLE_FIELD_SUPPRESSION_MARKER } from './schema';

const now = '2026-08-31T12:00:00.000Z';
const context = { workspaceId: 'workspace-1', teamId: 'team-1' };
const observation: SanitizedProviderObservation = {
  provider: 'linear',
  context,
  identity: { stableId: 'issue-1', aliases: ['ENG-1'] },
  fields: {
    title: 'Remote title',
    description: 'Remote description',
    priority: 'high',
    status: 'open',
  },
  revision: { contentDigest: 'sha256:remote' },
  capabilityEvidenceDigest: 'sha256:capability',
};
const adapter: ProviderAdapter = {
  provider: 'linear',
  normalize(value) {
    return {
      provider: 'linear',
      context,
      stableId: value.identity.stableId,
      aliases: value.identity.aliases,
      title: String(value.fields.title),
      description: String(value.fields.description),
      priority: String(value.fields.priority),
      status: String(value.fields.status),
      revisionDigest: semanticDigest(value.revision),
      extensions: {},
    };
  },
  plan(operation, intent) {
    return { provider: 'linear', operation, context, intent };
  },
  validateObservation(action, value) {
    const reasons = validateSemanticObservation(action, value);
    return { valid: reasons.length === 0, reasons };
  },
  verificationFields() {
    return ['title', 'description'];
  },
  verify() {
    return [];
  },
};

function createHarness(description = 'Remote description') {
  const binding: LifecycleBinding = {
    bindingId: 'bnd_binding_001',
    provider: 'linear',
    context,
    localTargetId: 'item-1',
    snapshot: null,
    baseline: null,
  };
  const commitRefresh = vi.fn();
  const commitIntake = vi.fn();
  const read = vi.fn(async () => ({
    observation: {
      ...observation,
      fields: { ...observation.fields, description },
    },
    snapshot: {
      snapshotId: 'snap_snapshot_001',
      bindingId: binding.bindingId,
      provider: 'linear' as const,
      observedAt: now,
      observedBy: {
        provider: 'linear' as const,
        surfaceKind: 'connector' as const,
        context,
        evidenceDigest: 'sha256:capability',
        semanticCapabilities: ['read'],
      },
      identity: { stableId: 'issue-1', context, aliases: [] },
      revision: {
        strength: 'hash-only' as const,
        token: null,
        updatedAt: now,
        contentHash: 'sha256:remote',
      },
      issue: {
        title: 'Remote title',
        description,
        priority: 'high',
        status: 'open',
      },
      lifecycle: 'active' as const,
    },
  }));
  const dependencies: LifecycleDependencies = {
    store: { readBinding: async () => binding, commitRefresh, commitIntake },
    provider: { adapter, read },
    now: () => now,
  };
  return { binding, commitRefresh, commitIntake, read, dependencies };
}

describe('remote lifecycle reads', () => {
  it('refreshes and atomically persists a bounded snapshot without mutation', async () => {
    const harness = createHarness();
    const result = await refreshBinding(
      'bnd_binding_001',
      harness.dependencies,
    );
    expect(result.snapshot.issue.title).toBe('Remote title');
    expect(harness.commitRefresh).toHaveBeenCalledOnce();
    expect(harness.read).toHaveBeenCalledOnce();
  });

  it.each(['create', 'enrich'] as const)(
    'intakes a remote issue in %s mode with its initial baseline',
    async (mode) => {
      const harness = createHarness();
      const result = await intakeRemoteIssue(
        {
          binding: {
            bindingId: 'bnd_binding_001',
            provider: 'linear',
            context,
            localTargetId: 'item-1',
          },
          mode,
          localRevision: 'sha256:local',
        },
        harness.dependencies,
      );
      expect(result.baseline.fields.title).toBe('Remote title');
      expect(harness.commitIntake).toHaveBeenCalledWith(
        expect.objectContaining({ mode }),
      );
    },
  );

  it('suppresses the entire signaled inbound field and marks the snapshot incomplete', async () => {
    const harness = createHarness(
      'token=synthetic_inbound_value and trailing text',
    );
    const result = await refreshBinding(
      'bnd_binding_001',
      harness.dependencies,
    );
    expect(result.snapshot.issue.description).toBe(
      WHOLE_FIELD_SUPPRESSION_MARKER,
    );
    expect(result.snapshot.contentRedacted).toBe(true);
    expect(JSON.stringify(result.snapshot)).not.toContain(
      'synthetic_inbound_value',
    );
  });

  it('leaves local PJM untouched when the provider read fails offline', async () => {
    const harness = createHarness();
    harness.read.mockRejectedValueOnce(new Error('offline'));
    await expect(
      refreshBinding('bnd_binding_001', harness.dependencies),
    ).rejects.toThrow('offline');
    expect(harness.commitRefresh).not.toHaveBeenCalled();
    expect(harness.commitIntake).not.toHaveBeenCalled();
  });
});

function createMutationHarness() {
  const readHarness = createHarness();
  const projection = { title: 'Published title' };
  const safety = assessOutboundProjectionSafety(projection, {
    assessedAt: now,
  });
  const persistPlanned = vi.fn();
  const markAttemptStarted = vi.fn();
  const markTerminal = vi.fn();
  const execute = vi.fn(async () => ({
    classification: 'committed' as const,
    evidenceDigest: 'sha256:attempt',
  }));
  const readBack = vi.fn(async () => ({
    fields: projection,
    revisionDigest: 'sha256:readback',
  }));
  const input = {
    operationId: 'op_publish_001',
    stepId: 'step_publish_001',
    binding: readHarness.binding,
    operation: 'update' as const,
    projection,
    outboundSafety: safety,
    preview: {
      digest: 'sha256:preview',
      observedRevisionDigest: 'sha256:observed',
      projectionDigest: safety.projectionDigest,
      safetyResultDigest: safety.resultDigest,
    },
    authority: {
      mode: 'user-approved' as const,
      approvalPreviewDigest: 'sha256:preview',
    },
  };
  const dependencies = {
    store: { persistPlanned, markAttemptStarted, markTerminal },
    preRead: vi.fn(async () => ({ revisionDigest: 'sha256:observed' })),
    execute,
    readBack,
  };
  return {
    input,
    dependencies,
    persistPlanned,
    markAttemptStarted,
    markTerminal,
    execute,
    readBack,
  };
}

describe('remote lifecycle mutations', () => {
  it('delegates unbound publication to the create-and-bind transaction', async () => {
    const createAndBind = vi.fn(async () => ({ status: 'pending' }));
    await expect(
      publishUnboundBinding({ target: 'item-1' }, { createAndBind }),
    ).resolves.toEqual({ status: 'pending' });
    expect(createAndBind).toHaveBeenCalledWith({ target: 'item-1' });
  });
  it('persists intent, pre-reads, attempts once, and verifies pinned readback', async () => {
    const harness = createMutationHarness();
    await expect(
      publishBinding(harness.input, harness.dependencies),
    ).resolves.toMatchObject({ status: 'verified' });
    expect(harness.persistPlanned).toHaveBeenCalledOnce();
    expect(harness.markAttemptStarted).toHaveBeenCalledOnce();
    expect(harness.execute).toHaveBeenCalledOnce();
    expect(harness.readBack).toHaveBeenCalledOnce();
  });

  it.each([
    [{ mode: 'read-only' as const }, /read-only/],
    [
      {
        mode: 'user-authorized' as const,
        instructionDigest: 'sha256:wrong',
        expectedInstructionDigest: 'sha256:expected',
      },
      /instruction/,
    ],
    [
      { mode: 'user-approved' as const, approvalPreviewDigest: 'sha256:stale' },
      /approval/,
    ],
    [
      {
        mode: 'autonomous' as const,
        workflowId: 'workflow-1',
        workflowRevision: 'rev-1',
        active: false,
      },
      /active-workflow/,
    ],
  ])(
    'blocks absent or stale caller authority %#',
    async (authority, message) => {
      const harness = createMutationHarness();
      await expect(
        publishBinding({ ...harness.input, authority }, harness.dependencies),
      ).rejects.toThrow(message);
      expect(harness.persistPlanned).not.toHaveBeenCalled();
      expect(harness.execute).not.toHaveBeenCalled();
    },
  );

  it('allows matching explicit instruction and current autonomous workflow evidence', async () => {
    const instruction = createMutationHarness();
    await expect(
      publishBinding(
        {
          ...instruction.input,
          authority: {
            mode: 'user-authorized',
            instructionDigest: 'sha256:instruction',
            expectedInstructionDigest: 'sha256:instruction',
          },
        },
        instruction.dependencies,
      ),
    ).resolves.toMatchObject({ status: 'verified' });
    const autonomous = createMutationHarness();
    await expect(
      publishBinding(
        {
          ...autonomous.input,
          authority: {
            mode: 'autonomous',
            workflowId: 'workflow-1',
            workflowRevision: 'rev-1',
            active: true,
          },
        },
        autonomous.dependencies,
      ),
    ).resolves.toMatchObject({ status: 'verified' });
  });

  it('blocks stale revisions and conflicts without a host attempt or transitive propagation', async () => {
    const stale = createMutationHarness();
    stale.dependencies.preRead.mockResolvedValueOnce({
      revisionDigest: 'sha256:changed',
    });
    await expect(
      publishBinding(stale.input, stale.dependencies),
    ).resolves.toEqual({ status: 'blocked' });
    expect(stale.execute).not.toHaveBeenCalled();
    const conflict = createMutationHarness();
    await expect(
      reconcileRemoteBinding(
        { ...conflict.input, conflicts: ['title'] },
        conflict.dependencies,
      ),
    ).resolves.toEqual({ status: 'blocked' });
    expect(conflict.persistPlanned).not.toHaveBeenCalled();
    expect(conflict.execute).not.toHaveBeenCalled();
  });

  it('rejects stale safety digests before persistence or host execution', async () => {
    const harness = createMutationHarness();
    await expect(
      publishBinding(
        {
          ...harness.input,
          preview: {
            ...harness.input.preview,
            safetyResultDigest: 'sha256:stale',
          },
        },
        harness.dependencies,
      ),
    ).rejects.toThrow(/stale|mismatched/);
    expect(harness.persistPlanned).not.toHaveBeenCalled();
    expect(harness.execute).not.toHaveBeenCalled();
  });

  it('marks ambiguous attempts and unavailable readback uncertain without retry', async () => {
    const ambiguous = createMutationHarness();
    ambiguous.execute.mockResolvedValueOnce({
      classification: 'unknown',
      evidenceDigest: 'sha256:unknown',
    });
    await expect(
      publishBinding(ambiguous.input, ambiguous.dependencies),
    ).resolves.toMatchObject({ status: 'uncertain' });
    expect(ambiguous.execute).toHaveBeenCalledOnce();
    expect(ambiguous.readBack).not.toHaveBeenCalled();
    const unavailable = createMutationHarness();
    unavailable.readBack.mockRejectedValueOnce(new Error('offline'));
    await expect(
      publishBinding(unavailable.input, unavailable.dependencies),
    ).resolves.toMatchObject({ status: 'uncertain' });
    expect(unavailable.execute).toHaveBeenCalledOnce();
  });
});
