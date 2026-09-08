import { describe, expect, it } from 'vitest';

import { selectHostExecution } from '../host-execution';
import { migrateRemoteAssociations } from '../migrate';
import { assessOutboundProjectionSafety } from '../outbound-projection-safety';
import { renderRemoteCommand } from '../output';
import { buildSharedStoragePreview } from '../shared-storage';
import { sanitizeRemoteSnapshot } from '../snapshot';
import {
  FakeLifecycleStore,
  GenericHostExecutor,
  LifecycleHarness,
} from './lifecycle-harness';

const NOW = '2026-09-05T12:00:00.000Z';

function assertFixtureOwnedNoLeak(
  sensitiveValue: string,
  surfaces: readonly unknown[],
): void {
  for (const surface of surfaces) {
    if (JSON.stringify(surface).includes(sensitiveValue)) {
      throw new Error(
        'Synthetic sensitive value leaked into fixture-owned output.',
      );
    }
  }
}

describe('offline, safety, and recovery guarantees', () => {
  it.each(['github', 'linear', 'jira'] as const)(
    'fails closed when every %s host execution capability is unavailable',
    (provider) => {
      expect(
        selectHostExecution({
          provider,
          context: {},
          operation: 'read',
          candidates: [],
          attemptStarted: false,
        }),
      ).toEqual({ selected: false, reason: 'unavailable' });
    },
  );

  it('restarts an interrupted operation without a second effect attempt', async () => {
    const store = new FakeLifecycleStore();
    const executor = new GenericHostExecutor();
    const harness = new LifecycleHarness({ store, executor });
    const input = {
      operationId: 'op_safety_restart_001',
      bindingId: 'bnd_safety_restart_001',
      provider: 'linear' as const,
      context: { workspaceId: 'workspace-1' },
      projection: { title: 'Safe title' },
      previewDigest: 'sha256:preview',
      approvalDigest: 'sha256:preview',
      capabilityEvidenceDigest: 'sha256:capability',
    };
    await expect(
      harness.publish({ ...input, crashAt: 'after-attempt-started' }),
    ).rejects.toThrow('crash');
    const resumed = await harness.publish(input);
    expect(resumed.state).toBe('uncertain');
    expect(executor.calls).toBe(0);
  });

  it('surfaces concurrent reviewed intents for reconciliation', async () => {
    const store = new FakeLifecycleStore();
    const first = new LifecycleHarness({ store });
    const second = new LifecycleHarness({ store });
    const base = {
      bindingId: 'bnd_concurrent_001',
      provider: 'github' as const,
      context: { repositoryId: 'repo-1' },
      projection: { title: 'Safe title' },
      previewDigest: 'sha256:preview',
      approvalDigest: 'sha256:preview',
      capabilityEvidenceDigest: 'sha256:capability',
      crashAt: 'after-planned' as const,
    };
    await expect(
      first.publish({ ...base, operationId: 'op_concurrent_001' }),
    ).rejects.toThrow('crash');
    await expect(
      second.publish({ ...base, operationId: 'op_concurrent_002' }),
    ).rejects.toThrow('crash');
    const active = [...store.operations.values()].filter(
      (operation) =>
        operation.bindingId === base.bindingId && operation.state === 'planned',
    );
    expect(active).toHaveLength(2);
    expect(new Set(active.map((operation) => operation.operationId)).size).toBe(
      2,
    );
  });

  it('keeps a synthetic sensitive value out of every explicit fixture-owned surface', () => {
    const sensitiveValue = 'api key fixture-sensitive-value';
    const safety = assessOutboundProjectionSafety(
      { description: sensitiveValue },
      { assessedAt: NOW },
    );
    const snapshot = sanitizeRemoteSnapshot({
      snapshotId: 'snap_safety_001',
      bindingId: 'bnd_safety_001',
      provider: 'linear',
      observedAt: NOW,
      observedBy: {
        provider: 'linear',
        surfaceKind: 'connector',
        context: { workspaceId: 'ws-1' },
        evidenceDigest: 'sha256:evidence',
        semanticCapabilities: ['read'],
      },
      identity: {
        stableId: 'issue-1',
        context: { workspaceId: 'ws-1' },
        aliases: [],
      },
      revision: {
        strength: 'hash-only',
        token: null,
        updatedAt: NOW,
        contentHash: 'sha256:content',
      },
      issue: {
        title: 'Safe title',
        description: sensitiveValue,
        priority: null,
        status: 'open',
      },
      lifecycle: 'active',
    });
    const journal = {
      operationId: 'op_safety_001',
      safetyResultDigest: safety.resultDigest,
    };
    const receipt = {
      classification: 'blocked',
      evidenceDigest: 'sha256:receipt',
    };
    const preview = { verdict: safety.verdict, reasons: safety.reasons };
    const rendered = renderRemoteCommand(
      {
        schemaVersion: 1,
        status: 'uncertain',
        operation: 'publish',
        projectRoot: '/fixture',
        persisted: true,
        results: [
          {
            bindingId: 'bnd_safety_001',
            provider: 'linear',
            target: 'issue-1',
            status: 'uncertain',
            freshness: 'stale',
            authority: 'blocked',
            diagnosticCode: 'sensitive-content',
          },
        ],
        externalAction: null,
        recovery: [
          {
            code: 'reconcile-required',
            instruction: 'Review sanitized evidence.',
          },
        ],
      },
      { json: false },
    );
    const diagnostics = { code: 'sensitive-content', field: 'description' };

    expect(safety.verdict).toBe('blocked');
    expect(snapshot.issue.description).toBe('[SUPPRESSED:SENSITIVE-CONTENT]');
    assertFixtureOwnedNoLeak(sensitiveValue, [
      safety,
      snapshot,
      journal,
      receipt,
      preview,
      rendered.stdout,
      rendered.stderr,
      diagnostics,
    ]);
  });

  it('refuses shared storage for a local project target', () => {
    expect(() =>
      buildSharedStoragePreview({
        repositoryFingerprint: 'sha256:repo',
        configTarget: '.oat/config.json',
        targetKind: 'project',
        projectScope: 'local',
        currentMode: 'local',
        retainedDataWarning:
          'Sanitized operational data enters version control.',
        proposedPaths: ['.oat/repo/pjm/remote/state'],
        createdAt: NOW,
      }),
    ).toThrow('Local project targets');
  });

  it('keeps local-only operations available and renders freshness/redaction/uncertainty visibly', () => {
    const local = migrateRemoteAssociations({
      mode: 'check',
      associatedIssues: ['opaque-local-reference'],
    });
    const rendered = renderRemoteCommand(
      {
        schemaVersion: 1,
        status: 'uncertain',
        operation: 'refresh',
        projectRoot: '/fixture',
        persisted: true,
        results: [
          {
            bindingId: 'bnd_offline_001',
            provider: 'jira',
            target: 'J-1',
            status: 'uncertain',
            freshness: 'stale',
            authority: 'read-only',
            diagnosticCode: 'redacted-evidence',
          },
        ],
        externalAction: null,
        recovery: [],
      },
      { json: false },
    );
    expect(local.changed).toBe(false);
    expect(rendered.stdout).toMatch(
      /uncertain.*freshness=stale.*redacted-evidence/s,
    );
  });
});
