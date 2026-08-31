import { describe, expect, it, vi } from 'vitest';

import {
  createAndBindRemoteIssue,
  type BindingCreateIntent,
  type CreateBindingDependencies,
} from './create-binding';
import { assessOutboundProjectionSafety } from './outbound-projection-safety';

const projection = { title: 'Published title', description: 'Public summary' };
const safety = assessOutboundProjectionSafety(projection, {
  assessedAt: '2026-08-31T12:00:00.000Z',
});
const intent: BindingCreateIntent = {
  bindingId: 'bnd_create_001',
  operationId: 'op_create_001',
  provider: 'linear',
  context: { workspaceId: 'workspace-1', teamId: 'team-1' },
  target: { kind: 'backlog', id: 'item-1', scope: 'shared' },
  projection,
  previewDigest: 'sha256:preview',
  projectionDigest: safety.projectionDigest,
  safetyResultDigest: safety.resultDigest,
  provenanceToken: 'oat-binding:bnd_create_001',
};

function harness(
  crashAt?: Parameters<NonNullable<CreateBindingDependencies['crash']>>[0],
) {
  const calls: string[] = [];
  let persisted: BindingCreateIntent | null = null;
  const dependencies: CreateBindingDependencies = {
    reserveIntent: vi.fn(async (value) => {
      calls.push('intent');
      persisted = value;
    }),
    readIntent: vi.fn(async () => persisted),
    recordAction: vi.fn(async () => {
      calls.push('action');
    }),
    recordTerminal: vi.fn(async () => {
      calls.push('terminal');
    }),
    materialize: vi.fn(async () => {
      calls.push('materialize');
    }),
    writeAssociation: vi.fn(async () => {
      calls.push('association');
    }),
    crash: (point) => {
      if (point === crashAt) throw new Error(`crash:${point}`);
    },
  };
  return {
    dependencies,
    calls,
    setPersisted(value: BindingCreateIntent) {
      persisted = value;
    },
  };
}

function observation(
  action: Awaited<ReturnType<typeof prepare>>['action'],
  classification: 'observed' | 'rejected' | 'unknown' = 'observed',
) {
  return {
    schemaVersion: 1,
    operationId: action.operationId,
    stepId: action.stepId,
    actionDigest: action.actionDigest,
    observedAt: '2026-08-31T12:01:00.000Z',
    surfaceKind: 'connector',
    capabilityEvidenceDigest: 'sha256:capability',
    provider: 'linear',
    context: intent.context,
    outcome: {
      classification,
      identity:
        classification === 'observed'
          ? { stableId: 'issue-1', aliases: ['ENG-1'] }
          : null,
      fields: classification === 'observed' ? projection : {},
      revisionDigest: classification === 'observed' ? 'sha256:revision' : null,
      diagnosticCode: classification === 'observed' ? null : classification,
    },
  };
}

async function prepare(h = harness()) {
  const result = await createAndBindRemoteIssue(
    { intent, safety },
    h.dependencies,
  );
  if (result.status !== 'pending') throw new Error('expected pending create');
  return result;
}

describe('initial remote binding creation', () => {
  it.each(['backlog', 'project'] as const)(
    'persists %s intent before emitting one digest-bound create action',
    async (kind) => {
      const h = harness();
      const result = await createAndBindRemoteIssue(
        { intent: { ...intent, target: { ...intent.target, kind } }, safety },
        h.dependencies,
      );
      expect(result.status).toBe('pending');
      expect(h.calls).toEqual(['intent', 'action']);
      if (result.status === 'pending') {
        expect(result.action.outboundSafety).toEqual({
          projectionDigest: safety.projectionDigest,
          resultDigest: safety.resultDigest,
        });
        expect(result.action.intent).toMatchObject({
          provenanceToken: intent.provenanceToken,
        });
      }
    },
  );

  it('creates no action when safety evidence is absent, blocked, stale, or mismatched', async () => {
    for (const unsafe of [
      null,
      { ...safety, verdict: 'blocked' as const },
      { ...safety, projectionDigest: 'sha256:stale' },
    ]) {
      const h = harness();
      await expect(
        createAndBindRemoteIssue({ intent, safety: unsafe }, h.dependencies),
      ).rejects.toThrow(/missing|blocks|stale|mismatch/);
      expect(h.calls).toEqual(['intent']);
    }
  });

  it('verifies create readback, then materializes binding before compact association', async () => {
    const h = harness();
    h.setPersisted(intent);
    const pending = await prepare(h);
    const result = await createAndBindRemoteIssue(
      {
        intent,
        safety,
        continuation: {
          action: pending.action,
          observation: observation(pending.action),
        },
      },
      h.dependencies,
    );
    expect(result).toEqual({ status: 'verified', bindingId: intent.bindingId });
    expect(h.calls.slice(-2)).toEqual(['materialize', 'association']);
  });

  it.each(['rejected', 'unknown'] as const)(
    'does not materialize a %s create and never retries',
    async (classification) => {
      const h = harness();
      h.setPersisted(intent);
      const pending = await prepare(h);
      const result = await createAndBindRemoteIssue(
        {
          intent,
          safety,
          continuation: {
            action: pending.action,
            observation: observation(pending.action, classification),
          },
        },
        h.dependencies,
      );
      expect(result.status).toBe(
        classification === 'rejected' ? 'rejected' : 'uncertain',
      );
      expect(h.calls).not.toContain('materialize');
      expect(h.calls).not.toContain('association');
    },
  );

  it.each(['after-intent', 'after-observation', 'after-materialize'] as const)(
    'exposes crash boundary %s without reordering durable steps',
    async (crashAt) => {
      const h = harness(crashAt);
      if (crashAt === 'after-intent') {
        await expect(
          createAndBindRemoteIssue({ intent, safety }, h.dependencies),
        ).rejects.toThrow(/crash/);
        expect(h.calls).toEqual(['intent']);
        return;
      }
      h.setPersisted(intent);
      const pending = await prepare();
      await expect(
        createAndBindRemoteIssue(
          {
            intent,
            safety,
            continuation: {
              action: pending.action,
              observation: observation(pending.action),
            },
          },
          h.dependencies,
        ),
      ).rejects.toThrow(/crash/);
      if (crashAt === 'after-materialize')
        expect(h.calls).toContain('materialize');
      expect(h.calls).not.toContain('association');
    },
  );
});
