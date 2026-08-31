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
      intent: {},
      expectedObservation: { fields: ['title'], requireIdentity: true },
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
    ).toThrow(/stale|mismatched/);
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
