import { describe, expect, it } from 'vitest';

import {
  acceptExternalObservation,
  buildExternalAction,
} from './external-action';
import { assessOutboundProjectionSafety } from './outbound-projection-safety';

const context = { workspaceId: 'workspace-1', teamId: 'team-1' };
const projection = { title: 'Safe title', description: 'Public description' };
const safety = assessOutboundProjectionSafety(projection, {
  assessedAt: '2026-08-31T12:00:00.000Z',
});
const action = buildExternalAction({
  operationId: 'op-1',
  stepId: 'step-1',
  provider: 'linear',
  semanticOperation: 'update',
  context,
  intent: { stableId: 'issue-1', fields: projection },
  expectedObservation: {
    fields: ['title', 'description'],
    requireIdentity: true,
    stableId: 'issue-1',
    capabilityEvidenceDigest: 'sha256:capability',
  },
  persistedPreview: {
    projectionDigest: safety.projectionDigest,
    safetyResultDigest: safety.resultDigest,
  },
  projection,
  outboundSafety: safety,
});

function observation(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    operationId: action.operationId,
    stepId: action.stepId,
    actionDigest: action.actionDigest,
    observedAt: '2026-08-31T12:01:00.000Z',
    surfaceKind: 'connector',
    capabilityEvidenceDigest: 'sha256:capability',
    provider: 'linear',
    context,
    outcome: {
      classification: 'observed',
      identity: { stableId: 'issue-1', aliases: ['ENG-1'] },
      fields: { title: 'Safe title' },
      revisionDigest: 'sha256:revision',
      diagnosticCode: null,
    },
    ...overrides,
  };
}

describe('external action protocol', () => {
  it('builds a provider-neutral digest-bound mutation action', () => {
    expect(action.actionDigest).toMatch(/^sha256:/);
    expect(action.outboundSafety).toEqual({
      projectionDigest: safety.projectionDigest,
      resultDigest: safety.resultDigest,
    });
    expect(Object.keys(action).sort()).toEqual([
      'actionDigest',
      'context',
      'expectedObservation',
      'intent',
      'operationId',
      'outboundSafety',
      'provider',
      'schemaVersion',
      'semanticOperation',
      'stepId',
    ]);
  });

  it('rejects missing, blocked, stale, and mismatched mutation safety evidence', () => {
    const input = {
      operationId: 'op-2',
      stepId: 'step-2',
      provider: 'linear' as const,
      semanticOperation: 'create' as const,
      context,
      intent: {
        target: { kind: 'backlog', scope: 'shared', id: 'item-1' },
        fields: projection,
        provenanceToken: 'oat-binding:bnd-1',
      },
      expectedObservation: {
        fields: ['title'],
        requireIdentity: true,
        stableId: null,
        capabilityEvidenceDigest: 'sha256:capability',
      },
      persistedPreview: {
        projectionDigest: safety.projectionDigest,
        safetyResultDigest: safety.resultDigest,
      },
      projection,
    };
    expect(() => buildExternalAction(input)).toThrow(/missing/);
    expect(() =>
      buildExternalAction({
        ...input,
        outboundSafety: { ...safety, verdict: 'blocked' },
      }),
    ).toThrow(/blocks/);
    expect(() =>
      buildExternalAction({
        ...input,
        projection: { title: 'Changed' },
        outboundSafety: safety,
      }),
    ).toThrow(/stale|mismatched|exactly match/);
    expect(() =>
      buildExternalAction({
        ...input,
        persistedPreview: {
          ...input.persistedPreview,
          safetyResultDigest: 'sha256:other',
        },
        outboundSafety: safety,
      }),
    ).toThrow(/persisted preview/);
  });

  it('accepts bounded matching observations as evidence, not success', () => {
    expect(
      acceptExternalObservation({ action, observation: observation() }).outcome
        .classification,
    ).toBe('observed');
  });

  it('rejects open or native action intent shapes', () => {
    expect(() =>
      buildExternalAction({
        ...action,
        intent: {
          stableId: 'issue-1',
          fields: projection,
          invocation: { executable: 'forbidden-native-surface' },
        },
        persistedPreview: {
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
        },
        projection,
        outboundSafety: safety,
      }),
    ).toThrow(/unrecognized/i);
  });

  it('requires the exact closed writable projection before action digesting', () => {
    expect(() =>
      buildExternalAction({
        ...action,
        intent: {
          stableId: 'issue-1',
          fields: { ...projection, priority: 'high' },
        },
        persistedPreview: {
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
        },
        projection,
        outboundSafety: safety,
      }),
    ).toThrow(/exactly match/i);
    const revisionProjection = { ...projection, sourceRevision: 'rev-1' };
    const revisionSafety = assessOutboundProjectionSafety(revisionProjection, {
      assessedAt: '2026-08-31T12:00:00.000Z',
    });
    expect(() =>
      buildExternalAction({
        ...action,
        intent: { stableId: 'issue-1', fields: revisionProjection },
        persistedPreview: {
          projectionDigest: revisionSafety.projectionDigest,
          safetyResultDigest: revisionSafety.resultDigest,
        },
        projection: revisionProjection,
        outboundSafety: revisionSafety,
      }),
    ).toThrow(/unrecognized/i);
    expect(() =>
      buildExternalAction({
        ...action,
        expectedObservation: {
          ...action.expectedObservation,
          fields: ['title', 'title'],
        },
        persistedPreview: {
          projectionDigest: safety.projectionDigest,
          safetyResultDigest: safety.resultDigest,
        },
        projection,
        outboundSafety: safety,
      }),
    ).toThrow(/unique and bounded/i);
  });

  it.each([
    [
      'transition',
      { stableId: 'issue-1', transition: 'closed' },
      { status: 'open' },
      ['status'],
    ],
    [
      'annotate',
      { stableId: 'issue-1', body: 'different token payload' },
      { annotation: 'approved-safe' },
      ['annotation'],
    ],
  ] as const)(
    'requires %s intent to equal its operation-discriminated projection',
    (semanticOperation, intent, writableProjection, fields) => {
      const writableSafety = assessOutboundProjectionSafety(
        writableProjection,
        { assessedAt: '2026-08-31T12:00:00.000Z' },
      );
      expect(() =>
        buildExternalAction({
          ...action,
          semanticOperation,
          intent,
          expectedObservation: {
            ...action.expectedObservation,
            fields: [...fields],
          },
          persistedPreview: {
            projectionDigest: writableSafety.projectionDigest,
            safetyResultDigest: writableSafety.resultDigest,
          },
          projection: writableProjection,
          outboundSafety: writableSafety,
        }),
      ).toThrow(/exactly match/i);
    },
  );

  it('enforces the observation field and identity contract and suppresses whole sensitive fields', () => {
    expect(() =>
      acceptExternalObservation({
        action,
        observation: observation({
          outcome: {
            ...observation().outcome,
            fields: { title: 'Safe', unexpected: 'synthetic-token-signal' },
          },
        }),
      }),
    ).toThrow(/unexpected field/);
    expect(() =>
      acceptExternalObservation({
        action,
        observation: observation({
          outcome: { ...observation().outcome, identity: null },
        }),
      }),
    ).toThrow(/required identity/);
    const accepted = acceptExternalObservation({
      action,
      observation: observation({
        outcome: {
          ...observation().outcome,
          fields: { title: 'Authorization: Bearer synthetic-secret-value' },
        },
      }),
    });
    expect(accepted.outcome.fields.title).toBe(
      '[SUPPRESSED:SENSITIVE-CONTENT]',
    );
    expect(accepted.outcome.suppressedFields).toEqual([
      { kind: 'core', name: 'title' },
    ]);
  });

  it('carries typed suppression evidence for an allowlisted adapter extension', () => {
    const extensionAction = buildExternalAction({
      ...action,
      expectedObservation: {
        ...action.expectedObservation,
        extensionFields: ['workflow'],
      },
      persistedPreview: {
        projectionDigest: safety.projectionDigest,
        safetyResultDigest: safety.resultDigest,
      },
      projection,
      outboundSafety: safety,
    });
    const accepted = acceptExternalObservation({
      action: extensionAction,
      observation: {
        ...observation(),
        actionDigest: extensionAction.actionDigest,
        outcome: {
          ...observation().outcome,
          extensions: { workflow: 'api key extension-private-tail' },
        },
      },
    });
    expect(accepted.outcome.extensions).toEqual({
      workflow: '[SUPPRESSED:SENSITIVE-CONTENT]',
    });
    expect(accepted.outcome.suppressedFields).toEqual([
      { kind: 'extension', key: 'workflow' },
    ]);
    expect(JSON.stringify(accepted)).not.toContain('extension-private-tail');
  });

  it('pins stable identity and capability evidence across read-back', () => {
    expect(() =>
      acceptExternalObservation({
        action,
        observation: observation({
          capabilityEvidenceDigest: 'sha256:other-capability',
        }),
      }),
    ).toThrow(/capability evidence/i);
    expect(() =>
      acceptExternalObservation({
        action,
        observation: observation({
          outcome: {
            ...observation().outcome,
            identity: { stableId: 'issue-2', aliases: [] },
          },
        }),
      }),
    ).toThrow(/stable identity/i);
  });

  it('rejects unsafe stable identity, alias, and provider context evidence', () => {
    const createProjection = { title: 'Safe title' };
    const createSafety = assessOutboundProjectionSafety(createProjection, {
      assessedAt: '2026-08-31T12:00:00.000Z',
    });
    const createAction = buildExternalAction({
      ...action,
      semanticOperation: 'create',
      intent: {
        target: { kind: 'backlog', scope: 'shared', id: 'item-1' },
        fields: createProjection,
        provenanceToken: 'oat-binding:bnd-1',
      },
      expectedObservation: {
        fields: ['title'],
        requireIdentity: true,
        stableId: null,
        capabilityEvidenceDigest: 'sha256:capability',
      },
      persistedPreview: {
        projectionDigest: createSafety.projectionDigest,
        safetyResultDigest: createSafety.resultDigest,
      },
      projection: createProjection,
      outboundSafety: createSafety,
    });
    for (const identity of [
      {
        stableId: 'Authorization Bearer private-tail',
        aliases: ['ENG-1'],
      },
      { stableId: 'issue-1', aliases: ['api key private-tail'] },
    ]) {
      expect(() =>
        acceptExternalObservation({
          action: createAction,
          observation: {
            ...observation(),
            actionDigest: createAction.actionDigest,
            operationId: createAction.operationId,
            stepId: createAction.stepId,
            outcome: { ...observation().outcome, identity },
          },
        }),
      ).toThrow(/identity evidence is unsafe/i);
    }

    const unsafeContext = {
      workspaceId: 'Authorization Bearer private-tail',
    };
    const unsafeContextAction = buildExternalAction({
      ...action,
      context: unsafeContext,
      expectedObservation: {
        ...action.expectedObservation,
        stableId: 'issue-1',
      },
      persistedPreview: {
        projectionDigest: safety.projectionDigest,
        safetyResultDigest: safety.resultDigest,
      },
      projection,
      outboundSafety: safety,
    });
    expect(() =>
      acceptExternalObservation({
        action: unsafeContextAction,
        observation: {
          ...observation(),
          actionDigest: unsafeContextAction.actionDigest,
          operationId: unsafeContextAction.operationId,
          stepId: unsafeContextAction.stepId,
          context: unsafeContext,
        },
      }),
    ).toThrow(/context evidence is unsafe/i);
  });

  it.each([
    [observation({ stepId: 'old-step' }), /stale|mismatched/],
    [observation({ provider: 'jira' }), /provider context/],
    [observation({ context: { workspaceId: 'other' } }), /provider context/],
    [observation({ unexpectedInvocation: { opaque: true } }), /unrecognized/i],
    [observation({ catalog: ['forbidden'] }), /unrecognized/i],
  ])(
    'rejects stale, mismatched, or native durable evidence %#',
    (value, message) => {
      expect(() =>
        acceptExternalObservation({ action, observation: value }),
      ).toThrow(message);
    },
  );

  it('rejects duplicates and oversized observations', () => {
    expect(() =>
      acceptExternalObservation({
        action,
        observation: observation(),
        acceptedStepDigests: new Set([action.actionDigest]),
      }),
    ).toThrow(/duplicates/);
    expect(() =>
      acceptExternalObservation({
        action,
        observation: { ...observation(), padding: 'x'.repeat(70_000) },
      }),
    ).toThrow(/size limit/);
  });
});
