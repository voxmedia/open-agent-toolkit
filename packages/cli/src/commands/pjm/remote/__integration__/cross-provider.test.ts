import { describe, expect, it } from 'vitest';

import {
  closeoutBindings,
  type CloseoutJournal,
  type CloseoutStore,
} from '../closeout';
import type { RemoteBatchRecord } from '../schema';

type Provider = 'github' | 'linear' | 'jira';
type Purpose = 'source' | 'planning' | 'delivery';

interface BindingFixture {
  bindingId: string;
  provider: Provider;
  remoteId: string;
  purposes: Purpose[];
  extensions: Record<string, unknown>;
}

class WorkflowFixture {
  readonly bindings: BindingFixture[] = [];
  readonly publications: Array<{ from: string; to: string }> = [];

  intake(binding: BindingFixture) {
    this.bindings.push(structuredClone(binding));
  }

  publish(fromBindingId: string, binding: BindingFixture) {
    if (
      !this.bindings.some((candidate) => candidate.bindingId === fromBindingId)
    ) {
      throw new Error(`Unknown publication source '${fromBindingId}'.`);
    }
    if (
      this.bindings.some(
        (candidate) => candidate.bindingId === binding.bindingId,
      )
    ) {
      throw new Error(`Duplicate binding '${binding.bindingId}'.`);
    }
    this.bindings.push(structuredClone(binding));
    this.publications.push({ from: fromBindingId, to: binding.bindingId });
  }

  async closeout() {
    const operations = new Map<string, CloseoutJournal>();
    let batch: RemoteBatchRecord | null = null;
    const store: CloseoutStore = {
      async readOperation(operationId) {
        return operations.get(operationId) ?? null;
      },
      async writeOperation(operation) {
        operations.set(operation.operationId, operation);
      },
      async writeBatch(value) {
        batch = value;
      },
    };
    const result = await closeoutBindings(
      {
        batchId: 'batch_cross_provider_001',
        projectPath: 'shared/cross-provider',
        now: '2026-09-05T12:00:00.000Z',
        plans: this.bindings.map((binding, index) => ({
          bindingId: binding.bindingId,
          operationId: `op_cross_provider_00${index + 1}`,
          provider: binding.provider,
          purposes: binding.purposes,
          providerAutomation: binding.purposes.includes('delivery'),
          ...(binding.purposes.includes('source')
            ? {
                annotation: {
                  authority: 'autonomous' as const,
                  sourceDigest: 'sha256:annotation-policy',
                  previewDigest: 'sha256:annotation-preview',
                },
              }
            : {}),
          ...(binding.purposes.includes('planning')
            ? {
                transition: {
                  authority:
                    binding.provider === 'jira'
                      ? ('read-only' as const)
                      : ('autonomous' as const),
                  sourceDigest: 'sha256:transition-policy',
                  previewDigest: 'sha256:transition-preview',
                },
              }
            : {}),
        })),
      },
      store,
    );
    expect(batch).toEqual(result.batch);
    return result;
  }
}

function sourceBinding(): BindingFixture {
  return {
    bindingId: 'bnd_github_source_001',
    provider: 'github',
    remoteId: 'issue-1',
    purposes: ['source'],
    extensions: { milestone: 'M1' },
  };
}

describe('representative cross-provider workflows', () => {
  it('uses one GitHub binding for combined source and planning purposes', async () => {
    const flow = new WorkflowFixture();
    flow.intake({ ...sourceBinding(), purposes: ['source', 'planning'] });
    const result = await flow.closeout();
    expect(flow.bindings).toHaveLength(1);
    expect(result.batch.members).toHaveLength(1);
    expect(flow.bindings[0]?.extensions).toEqual({ milestone: 'M1' });
  });

  it.each([
    ['linear', { estimate: 3 }],
    ['jira', { issueType: 'Task' }],
  ] as const)(
    'publishes GitHub source explicitly to %s planning without transitive mirroring',
    async (provider, extensions) => {
      const flow = new WorkflowFixture();
      flow.intake(sourceBinding());
      flow.publish('bnd_github_source_001', {
        bindingId: `bnd_${provider}_planning_001`,
        provider,
        remoteId: `${provider}-1`,
        purposes: ['planning'],
        extensions,
      });

      expect(flow.publications).toEqual([
        { from: 'bnd_github_source_001', to: `bnd_${provider}_planning_001` },
      ]);
      expect(flow.bindings.map((binding) => binding.provider)).toEqual([
        'github',
        provider,
      ]);
      expect(flow.bindings[1]?.extensions).toEqual(extensions);
      const result = await flow.closeout();
      expect(result.batch.members).toHaveLength(2);
      expect(result.batch.outcomes.op_cross_provider_002).toBe(
        provider === 'jira' ? 'blocked' : 'pending',
      );
    },
  );

  it('retains provider-native delivery automation as an independent outcome', async () => {
    const flow = new WorkflowFixture();
    flow.intake(sourceBinding());
    flow.publish('bnd_github_source_001', {
      bindingId: 'bnd_linear_delivery_001',
      provider: 'linear',
      remoteId: 'linear-2',
      purposes: ['delivery'],
      extensions: { estimate: 5 },
    });
    const result = await flow.closeout();
    expect(result.batch.outcomes.op_cross_provider_002).toBe('verified');
    expect(result.batch.outcomes.op_cross_provider_001).toBe('pending');
  });
});
