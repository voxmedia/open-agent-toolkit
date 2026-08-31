import { describe, expect, it } from 'vitest';

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
