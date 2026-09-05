import { describe, expect, it } from 'vitest';

import {
  closeoutBindings,
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
