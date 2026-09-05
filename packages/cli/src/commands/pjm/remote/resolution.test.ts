import { describe, expect, it } from 'vitest';

import {
  detachBinding,
  recreateBinding,
  relinkBinding,
  type ResolutionBinding,
  type ResolutionJournal,
  type ResolutionStore,
} from './resolution';

const NOW = '2026-09-05T12:00:00.000Z';
const binding: ResolutionBinding = {
  bindingId: 'bnd_resolution_001',
  provider: 'linear',
  targetRef: 'backlog:item-1',
  remoteIdentity: {
    stableId: 'old-1',
    context: { workspaceId: 'ws-1' },
    aliases: [],
  },
  identityHistory: [],
  lifecycle: 'blocked',
  snapshotDigest: 'sha256:last-complete-snapshot',
};

function memoryStore(): ResolutionStore & {
  bindingWrites: ResolutionBinding[];
  associationWrites: Array<{
    targetRef: string;
    bindingId: string | null;
    referenceRef: string | null;
  }>;
  journals: Map<string, ResolutionJournal>;
} {
  const bindingWrites: ResolutionBinding[] = [];
  const associationWrites: Array<{
    targetRef: string;
    bindingId: string | null;
    referenceRef: string | null;
  }> = [];
  const journals = new Map<string, ResolutionJournal>();
  return {
    bindingWrites,
    associationWrites,
    journals,
    async findByIdentity() {
      return null;
    },
    async writeBinding(value) {
      bindingWrites.push(structuredClone(value));
    },
    async writeAssociation(value) {
      associationWrites.push(structuredClone(value));
    },
    async readJournal(operationId) {
      return journals.get(operationId) ?? null;
    },
    async writeJournal(journal) {
      journals.set(journal.operationId, structuredClone(journal));
    },
  };
}

const approval = {
  previewDigest: 'sha256:resolution-preview',
  approvedAt: NOW,
  source: 'operator',
};

describe('remote anomaly resolution', () => {
  it('relinks only to a verified stable replacement and retains history/snapshot', async () => {
    const store = memoryStore();
    const result = await relinkBinding(
      {
        operationId: 'op_relink_001',
        binding,
        now: NOW,
        previewDigest: approval.previewDigest,
        approval,
        replacement: {
          identity: {
            stableId: 'new-1',
            context: { workspaceId: 'ws-1' },
            aliases: [{ kind: 'key', value: 'NEW-1' }],
          },
          verifiedAt: NOW,
          evidenceDigest: 'sha256:verified-identity',
        },
      },
      store,
    );
    expect(result.binding.remoteIdentity.stableId).toBe('new-1');
    expect(result.binding.identityHistory[0]?.identity.stableId).toBe('old-1');
    expect(result.binding.snapshotDigest).toBe(binding.snapshotDigest);
    expect(store.associationWrites[0]?.bindingId).toBe(binding.bindingId);
  });

  it('rejects duplicate replacement identities', async () => {
    const store = memoryStore();
    store.findByIdentity = async () => 'bnd_resolution_other';
    await expect(
      relinkBinding(
        {
          operationId: 'op_relink_001',
          binding,
          now: NOW,
          previewDigest: approval.previewDigest,
          approval,
          replacement: {
            identity: {
              stableId: 'new-1',
              context: { workspaceId: 'ws-1' },
              aliases: [],
            },
            verifiedAt: NOW,
            evidenceDigest: 'sha256:verified',
          },
        },
        store,
      ),
    ).rejects.toThrow('already bound');
  });

  it.each([undefined, { ...approval, previewDigest: 'sha256:stale' }])(
    'requires fresh exact approval %#',
    async (candidate) => {
      await expect(
        relinkBinding(
          {
            operationId: 'op_relink_001',
            binding,
            now: NOW,
            previewDigest: approval.previewDigest,
            approval: candidate,
            replacement: {
              identity: {
                stableId: 'new-1',
                context: { workspaceId: 'ws-1' },
                aliases: [],
              },
              verifiedAt: NOW,
              evidenceDigest: 'sha256:verified',
            },
          },
          memoryStore(),
        ),
      ).rejects.toThrow('fresh approval');
    },
  );

  it('tombstones detach state while retaining evidence and optional reference', async () => {
    const store = memoryStore();
    const result = await detachBinding(
      {
        operationId: 'op_detach_001',
        binding,
        now: NOW,
        previewDigest: approval.previewDigest,
        approval,
        keepReference: true,
      },
      store,
    );
    expect(result.binding.lifecycle).toBe('tombstoned');
    expect(result.binding.snapshotDigest).toBe(binding.snapshotDigest);
    expect(store.associationWrites[0]).toEqual({
      targetRef: binding.targetRef,
      bindingId: null,
      referenceRef: 'linear:old-1',
    });
  });

  it('repairs only the compact link after a crash following durable binding transition', async () => {
    const store = memoryStore();
    await expect(
      relinkBinding(
        {
          operationId: 'op_relink_001',
          binding,
          now: NOW,
          previewDigest: approval.previewDigest,
          approval,
          replacement: {
            identity: {
              stableId: 'new-1',
              context: { workspaceId: 'ws-1' },
              aliases: [],
            },
            verifiedAt: NOW,
            evidenceDigest: 'sha256:verified',
          },
          crash: (point) => {
            if (point === 'after-binding') throw new Error('crash');
          },
        },
        store,
      ),
    ).rejects.toThrow('crash');
    expect(store.bindingWrites).toHaveLength(1);
    expect(store.associationWrites).toHaveLength(0);

    await relinkBinding(
      {
        operationId: 'op_relink_001',
        binding,
        now: NOW,
        previewDigest: approval.previewDigest,
        approval,
        replacement: {
          identity: {
            stableId: 'new-1',
            context: { workspaceId: 'ws-1' },
            aliases: [],
          },
          verifiedAt: NOW,
          evidenceDigest: 'sha256:verified',
        },
      },
      store,
    );
    expect(store.bindingWrites).toHaveLength(1);
    expect(store.associationWrites).toHaveLength(1);
  });
});

describe('duplicate-safe recreate', () => {
  it('reconciles a capability-found existing replacement without creating', async () => {
    const store = memoryStore();
    let creates = 0;
    const result = await recreateBinding(
      {
        operationId: 'op_recreate_001',
        binding,
        now: NOW,
        previewDigest: approval.previewDigest,
        approval,
        searchDuplicates: async () => ({
          kind: 'found-existing',
          replacement: {
            identity: {
              stableId: 'found-1',
              context: { workspaceId: 'ws-1' },
              aliases: [],
            },
            verifiedAt: NOW,
            evidenceDigest: 'sha256:found',
          },
        }),
        createReplacement: async () => {
          creates += 1;
          return { kind: 'uncertain' };
        },
      },
      store,
    );
    expect(result.status).toBe('verified');
    expect(result.binding.remoteIdentity.stableId).toBe('found-1');
    expect(creates).toBe(0);
  });

  it.each(['search-unavailable', 'ambiguous'] as const)(
    'blocks recreate when duplicate search is %s',
    async (kind) => {
      const store = memoryStore();
      let creates = 0;
      const result = await recreateBinding(
        {
          operationId: 'op_recreate_001',
          binding,
          now: NOW,
          previewDigest: approval.previewDigest,
          approval,
          searchDuplicates: async () =>
            kind === 'ambiguous'
              ? { kind, candidates: ['candidate-1', 'candidate-2'] }
              : { kind },
          createReplacement: async () => {
            creates += 1;
            return { kind: 'uncertain' };
          },
        },
        store,
      );
      expect(result.status).toBe('blocked');
      expect(creates).toBe(0);
    },
  );

  it('persists intent, creates once, and adopts a verified replacement', async () => {
    const store = memoryStore();
    const result = await recreateBinding(
      {
        operationId: 'op_recreate_001',
        binding,
        now: NOW,
        previewDigest: approval.previewDigest,
        approval,
        searchDuplicates: async () => ({ kind: 'no-match' }),
        createReplacement: async () => ({
          kind: 'committed',
          replacement: {
            identity: {
              stableId: 'created-1',
              context: { workspaceId: 'ws-1' },
              aliases: [],
            },
            verifiedAt: NOW,
            evidenceDigest: 'sha256:created',
          },
        }),
      },
      store,
    );
    expect(result.status).toBe('verified');
    expect(result.journal.createIntentPersisted).toBe(true);
    expect(result.journal.createAttempted).toBe(true);
    expect(result.binding.remoteIdentity.stableId).toBe('created-1');
  });

  it('freezes an uncertain create and never blindly retries after restart', async () => {
    const store = memoryStore();
    let creates = 0;
    const input = {
      operationId: 'op_recreate_001',
      binding,
      now: NOW,
      previewDigest: approval.previewDigest,
      approval,
      searchDuplicates: async () => ({ kind: 'no-match' as const }),
      createReplacement: async () => {
        creates += 1;
        return { kind: 'uncertain' as const };
      },
    };
    const first = await recreateBinding(input, store);
    const resumed = await recreateBinding(input, store);
    expect(first.status).toBe('uncertain');
    expect(resumed.status).toBe('uncertain');
    expect(resumed.binding.lifecycle).toBe('blocked');
    expect(creates).toBe(1);
  });

  it('requires the immutable fresh-approval floor for recreate', async () => {
    await expect(
      recreateBinding(
        {
          operationId: 'op_recreate_001',
          binding,
          now: NOW,
          previewDigest: approval.previewDigest,
          searchDuplicates: async () => ({ kind: 'no-match' }),
          createReplacement: async () => ({ kind: 'uncertain' }),
        },
        memoryStore(),
      ),
    ).rejects.toThrow('fresh approval');
  });
});
