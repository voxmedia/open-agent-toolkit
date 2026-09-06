import { describe, expect, it } from 'vitest';

import {
  closeoutBindings,
  resumeCloseoutOperation,
  type CloseoutJournal,
  type CloseoutStore,
} from './closeout';

const NOW = '2026-09-05T12:00:00.000Z';

function memoryStore(): CloseoutStore & {
  operations: Map<string, CloseoutJournal>;
} {
  const operations = new Map<string, CloseoutJournal>();
  return {
    operations,
    async readOperation(operationId) {
      return operations.get(operationId) ?? null;
    },
    async writeOperation(operation) {
      operations.set(operation.operationId, operation);
    },
    async writeBatch() {},
  };
}

describe('per-binding composite closeout', () => {
  it('orders annotation before transition and binds per-substep authority', async () => {
    const store = memoryStore();
    const result = await closeoutBindings(
      {
        batchId: 'batch_closeout_001',
        projectPath: '.oat/projects/shared/example',
        now: NOW,
        plans: [
          {
            bindingId: 'bnd_closeout_001',
            operationId: 'op_closeout_001',
            provider: 'linear',
            purposes: ['source', 'planning'],
            annotation: {
              authority: 'user-approved',
              sourceDigest: 'sha256:annotation-policy',
              previewDigest: 'sha256:annotation-preview',
            },
            transition: {
              authority: 'autonomous',
              sourceDigest: 'sha256:transition-policy',
              previewDigest: 'sha256:transition-preview',
            },
          },
        ],
      },
      store,
    );

    expect(result.operations[0]?.substeps.map((step) => step.kind)).toEqual([
      'annotation',
      'transition',
    ]);
    expect(result.operations[0]?.substeps[1]?.dependsOn).toEqual([
      'op_closeout_001_annotation',
    ]);
    expect(
      result.operations[0]?.substeps.map((step) => step.authority),
    ).toEqual(['user-approved', 'autonomous']);
  });

  it.each(['annotation', 'transition'] as const)(
    'recovers a crash after verified %s without repeating it',
    async (crashKind) => {
      const store = memoryStore();
      const created = await closeoutBindings(
        {
          batchId: 'batch_closeout_001',
          projectPath: 'project',
          now: NOW,
          plans: [
            {
              bindingId: 'bnd_closeout_001',
              operationId: 'op_closeout_001',
              provider: 'linear',
              purposes: ['source', 'planning'],
              annotation: {
                authority: 'autonomous',
                sourceDigest: 'sha256:a',
                previewDigest: 'sha256:a-preview',
              },
              transition: {
                authority: 'autonomous',
                sourceDigest: 'sha256:t',
                previewDigest: 'sha256:t-preview',
              },
            },
          ],
        },
        store,
      );
      const calls: string[] = [];
      await expect(
        resumeCloseoutOperation(
          created.operations[0]!,
          store,
          async (step) => {
            calls.push(step.kind);
            return 'verified';
          },
          (point) => {
            if (point === `after-${crashKind}`) throw new Error('crash');
          },
        ),
      ).rejects.toThrow('crash');
      const persisted = store.operations.get('op_closeout_001')!;
      const completedBeforeRestart = persisted.substeps
        .filter((step) => step.state === 'verified')
        .map((step) => step.kind);
      const resumedCalls: string[] = [];
      const resumed = await resumeCloseoutOperation(
        persisted,
        store,
        async (step) => {
          resumedCalls.push(step.kind);
          return 'verified';
        },
      );

      expect(resumedCalls).not.toContain(crashKind);
      expect(
        resumed.substeps.filter((step) => step.state === 'verified'),
      ).toHaveLength(crashKind === 'annotation' ? 2 : 2);
      expect(completedBeforeRestart).toContain(crashKind);
    },
  );

  it('resumes a crash before annotation from the first unfinished safe step', async () => {
    const store = memoryStore();
    const created = await closeoutBindings(
      {
        batchId: 'batch_closeout_001',
        projectPath: 'project',
        now: NOW,
        plans: [
          {
            bindingId: 'bnd_closeout_001',
            operationId: 'op_closeout_001',
            provider: 'linear',
            purposes: ['source'],
            annotation: {
              authority: 'autonomous',
              sourceDigest: 'sha256:a',
              previewDigest: 'sha256:a-preview',
            },
          },
        ],
      },
      store,
    );
    await expect(
      resumeCloseoutOperation(
        created.operations[0]!,
        store,
        async () => 'verified',
        (point) => {
          if (point === 'before-annotation') throw new Error('crash');
        },
      ),
    ).rejects.toThrow('crash');
    const calls: string[] = [];
    await resumeCloseoutOperation(
      store.operations.get('op_closeout_001')!,
      store,
      async (step) => {
        calls.push(step.kind);
        return 'verified';
      },
    );
    expect(calls).toEqual(['annotation']);
  });

  it.each(['uncertain', 'rejected'] as const)(
    'does not retry an attempted %s substep and preserves partial state',
    async (terminalState) => {
      const store = memoryStore();
      const operation: CloseoutJournal = {
        schemaVersion: 1,
        operationId: 'op_closeout_001',
        bindingId: 'bnd_closeout_001',
        provider: 'linear',
        projectPath: 'project',
        previewDigest: 'sha256:preview',
        state: 'partial',
        substeps: [
          {
            stepId: 'op_closeout_001_annotation',
            kind: 'annotation',
            state: 'verified',
            previewDigest: 'sha256:a',
            authority: 'autonomous',
            authoritySourceDigest: 'sha256:a-policy',
            approvalRequirement: 'none',
            dependsOn: [],
          },
          {
            stepId: 'op_closeout_001_transition',
            kind: 'transition',
            state: terminalState,
            previewDigest: 'sha256:t',
            authority: 'autonomous',
            authoritySourceDigest: 'sha256:t-policy',
            approvalRequirement: 'none',
            dependsOn: ['op_closeout_001_annotation'],
          },
        ],
        createdAt: NOW,
        updatedAt: NOW,
      };
      store.operations.set(operation.operationId, operation);
      const calls: string[] = [];
      const resumed = await resumeCloseoutOperation(
        operation,
        store,
        async (step) => {
          calls.push(step.kind);
          return 'verified';
        },
      );

      expect(calls).toEqual([]);
      expect(resumed.state).toBe('partial');
      expect(resumed.substeps[1]?.state).toBe(terminalState);
    },
  );

  it('deduplicates a combined purpose into one composite operation', async () => {
    const result = await closeoutBindings(
      {
        batchId: 'batch_closeout_001',
        projectPath: 'project',
        now: NOW,
        plans: [
          {
            bindingId: 'bnd_closeout_001',
            operationId: 'op_closeout_001',
            provider: 'github',
            purposes: ['source', 'planning', 'source'],
            annotation: {
              authority: 'autonomous',
              sourceDigest: 'sha256:a',
              previewDigest: 'sha256:a-preview',
            },
            transition: {
              authority: 'autonomous',
              sourceDigest: 'sha256:t',
              previewDigest: 'sha256:t-preview',
            },
          },
        ],
      },
      memoryStore(),
    );

    expect(result.operations).toHaveLength(1);
    expect(result.batch.members).toHaveLength(1);
  });

  it('uses the strict purpose intersection for composite closeout', async () => {
    const result = await closeoutBindings(
      {
        batchId: 'batch_closeout_intersection',
        projectPath: 'project',
        now: NOW,
        plans: [
          {
            bindingId: 'bnd_closeout_intersection',
            operationId: 'op_closeout_intersection',
            provider: 'linear',
            purposes: ['planning', 'reference'],
            annotation: {
              authority: 'autonomous',
              sourceDigest: 'sha256:a',
              previewDigest: 'sha256:a-preview',
            },
            transition: {
              authority: 'autonomous',
              sourceDigest: 'sha256:t',
              previewDigest: 'sha256:t-preview',
            },
          },
        ],
      },
      memoryStore(),
    );

    expect(result.operations[0]).toMatchObject({
      state: 'blocked',
      substeps: [],
    });
  });

  it('requires fresh exact substep approval before execution', async () => {
    const store = memoryStore();
    const created = await closeoutBindings(
      {
        batchId: 'batch_closeout_approval',
        projectPath: 'project',
        now: NOW,
        plans: [
          {
            bindingId: 'bnd_closeout_approval',
            operationId: 'op_closeout_approval',
            provider: 'linear',
            purposes: ['source'],
            annotation: {
              authority: 'user-approved',
              sourceDigest: 'sha256:a',
              previewDigest: 'sha256:a-preview',
            },
          },
        ],
      },
      store,
    );
    await expect(
      resumeCloseoutOperation(
        created.operations[0]!,
        store,
        async () => 'verified',
      ),
    ).rejects.toThrow(/exact current composite preview/i);
    await expect(
      resumeCloseoutOperation(
        created.operations[0]!,
        store,
        async () => 'verified',
        undefined,
        () => NOW,
        {
          kind: 'approval',
          previewDigest: 'sha256:a-preview',
          authorizedAt: NOW,
          source: 'synthetic-test-approval',
        },
      ),
    ).resolves.toMatchObject({ state: 'verified' });
  });

  it('defers delivery closeout to provider automation', async () => {
    const result = await closeoutBindings(
      {
        batchId: 'batch_closeout_001',
        projectPath: 'project',
        now: NOW,
        plans: [
          {
            bindingId: 'bnd_closeout_001',
            operationId: 'op_closeout_001',
            provider: 'jira',
            purposes: ['delivery'],
            providerAutomation: true,
          },
        ],
      },
      memoryStore(),
    );

    expect(result.operations[0]?.state).toBe('verified');
    expect(result.operations[0]?.substeps).toEqual([]);
    expect(result.batch.state).toBe('complete');
  });

  it('rejects an incompatible provider-automation transition choice', async () => {
    await expect(
      closeoutBindings(
        {
          batchId: 'batch_closeout_001',
          projectPath: 'project',
          now: NOW,
          plans: [
            {
              bindingId: 'bnd_closeout_001',
              operationId: 'op_closeout_001',
              provider: 'jira',
              purposes: ['delivery'],
              providerAutomation: true,
              transition: {
                authority: 'autonomous',
                sourceDigest: 'sha256:t',
                previewDigest: 'sha256:t-preview',
              },
            },
          ],
        },
        memoryStore(),
      ),
    ).rejects.toThrow('provider automation');
  });

  it('reports partial when one binding is verified and another is blocked', async () => {
    const result = await closeoutBindings(
      {
        batchId: 'batch_closeout_001',
        projectPath: 'project',
        now: NOW,
        plans: [
          {
            bindingId: 'bnd_closeout_001',
            operationId: 'op_closeout_001',
            provider: 'jira',
            purposes: ['delivery'],
            providerAutomation: true,
          },
          {
            bindingId: 'bnd_closeout_002',
            operationId: 'op_closeout_002',
            provider: 'linear',
            purposes: ['planning'],
            transition: {
              authority: 'read-only',
              sourceDigest: 'sha256:t',
              previewDigest: 'sha256:t-preview',
            },
          },
        ],
      },
      memoryStore(),
    );

    expect(result.batch.state).toBe('partial');
    expect(result.batch.outcomes).toEqual({
      op_closeout_001: 'verified',
      op_closeout_002: 'blocked',
    });
  });
});
