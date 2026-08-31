import { describe, expect, it, vi } from 'vitest';

import {
  intakeRemoteIssue,
  refreshBinding,
  type LifecycleBinding,
  type LifecycleDependencies,
} from './lifecycle';
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
