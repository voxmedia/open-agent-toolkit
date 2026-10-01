import type { CanonicalRoleEvidence } from '@agents/canonical';
import { describe, expect, it } from 'vitest';

import type { GenericDispatchRecord } from './generic-dispatch-record';
import {
  augmentDispatchRecord,
  buildRuntimeObservation,
  compareObservedRuntimeMetadata,
  configuredInvocationForObservation,
  parsePersistedOatDispatchRecord,
  safeParseOatDispatchEvidenceEvent,
} from './oat-dispatch-record';

function genericRecord(
  overrides: Partial<GenericDispatchRecord> = {},
): GenericDispatchRecord {
  return {
    request_id: 'dispatch-native-1',
    caller: 'oat-project-implement',
    scope: 'p06',
    objective: 'Implement dispatch provenance',
    action: 'implementation',
    role_name: 'oat-phase-implementer',
    role_class: 'implementation',
    provider: 'codex',
    dispatch_context: 'root-native',
    dispatch_policy: 'high',
    dispatch_ceiling: 'high',
    catalog_snapshot: {
      id: 'catalog-1',
      source: 'tool-schema',
      observed_at: '2026-09-02T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: 'oat-phase-implementer-gpt-5-6-sol-high',
    model_selector: 'gpt-5.6-sol',
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: 'high',
    reasoning_mode_selector: null,
    service_tier_selector: 'priority',
    selection_source: 'policy-resolved',
    candidates_considered: ['oat-phase-implementer-gpt-5-6-sol-high'],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    deadline_seconds: 600,
    retry_limit: 0,
    payload: { task: 'p06' },
    launch_status: 'accepted',
    child_outcome: 'completed',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
    ...overrides,
  };
}

const roleEvidence: CanonicalRoleEvidence = {
  status: 'resolved',
  dependency: 'workflows',
  canonicalRole: 'oat-phase-implementer',
  tier: 'user',
  validation: 'direct-canonical',
  canonicalPath: '<user>/agents/oat-phase-implementer.md',
  selectedPath: '<user>/agents/oat-phase-implementer.md',
  roleVersion: '1.2.3',
  contentDigest: `sha256:${'a'.repeat(64)}`,
  candidateMisses: [],
};

describe('augmentDispatchRecord', () => {
  it('adds strict canonical role evidence without changing generic fields', () => {
    const generic = genericRecord();
    const augmented = augmentDispatchRecord({
      record: generic,
      event: {
        kind: 'canonical-role-resolution',
        requestId: generic.request_id,
        source: 'canonical-role-resolver',
        evidence: roleEvidence,
      },
    });
    expect(augmented).toMatchObject({
      ...generic,
      oat: { schemaVersion: 1, canonicalRole: roleEvidence },
    });
    expect(
      Object.fromEntries(
        Object.entries(augmented).filter(([key]) => key !== 'oat'),
      ),
    ).toEqual(generic);
  });

  it('requires a proven pre-start rejection and rejects post-acceptance replacement', () => {
    const blocked = genericRecord({
      launch_status: 'blocked-before-start',
      child_outcome: 'not-started',
    });
    const rejected = augmentDispatchRecord({
      record: blocked,
      event: {
        kind: 'pre-start-rejection-attestation',
        requestId: blocked.request_id,
        source: 'provider-wrapper',
        expectedLaunchStatus: 'blocked-before-start',
        rejection: {
          code: 'native-role-unavailable',
          rejectedAt: '2026-09-02T00:00:01.000Z',
          provesNoChildStarted: true,
        },
      },
    });
    expect(rejected.oat.preStartRejection).toMatchObject({
      code: 'native-role-unavailable',
      provesNoChildStarted: true,
    });
    expect(() =>
      augmentDispatchRecord({
        record: genericRecord(),
        event: {
          kind: 'pre-start-rejection-attestation',
          requestId: 'dispatch-native-1',
          source: 'provider-wrapper',
          expectedLaunchStatus: 'blocked-before-start',
          rejection: {
            code: 'native-role-unavailable',
            rejectedAt: '2026-09-02T00:00:01.000Z',
            provesNoChildStarted: true,
          },
        },
      }),
    ).toThrow(/blocked-before-start/i);
  });

  it.each([
    ['timeout', /timeout outcome is not a pre-start/i],
    ['deadline-exceeded', /timeout outcome is not a pre-start/i],
    ['BLOCKED', /BLOCKED outcome is not a pre-start/i],
    ['child-blocked', /BLOCKED outcome is not a pre-start/i],
    ['contract-refusal', /refusal outcome is not a pre-start/i],
    ['child-refused', /refusal outcome is not a pre-start/i],
    ['interruption', /interruption outcome is not a pre-start/i],
    ['run-cancelled', /interruption outcome is not a pre-start/i],
    ['invalid-run-abort', /interruption outcome is not a pre-start/i],
    ['runtime-mismatch', /runtime mismatch outcome is not a pre-start/i],
    ['missing-telemetry', /missing telemetry outcome is not a pre-start/i],
    ['malformed-output', /malformed output outcome is not a pre-start/i],
    ['post-acceptance-failure', /post-acceptance outcome is not a pre-start/i],
  ])('never accepts %s as a pre-start rejection', (code, message) => {
    const blocked = genericRecord({
      launch_status: 'blocked-before-start',
      child_outcome: 'not-started',
    });
    expect(() =>
      augmentDispatchRecord({
        record: blocked,
        event: {
          kind: 'pre-start-rejection-attestation',
          requestId: blocked.request_id,
          source: 'provider-wrapper',
          expectedLaunchStatus: 'blocked-before-start',
          rejection: {
            code,
            rejectedAt: '2026-09-02T00:00:01.000Z',
            provesNoChildStarted: true,
          },
        },
      }),
    ).toThrow(message);
  });

  it.each([
    ['wrapper-launch-refused', true],
    ['wrapper-launch-failure', false],
  ])(
    'treats the closed qualifying set as authoritative for %s',
    (code, qualifying) => {
      const blocked = genericRecord({
        launch_status: 'blocked-before-start',
        child_outcome: 'not-started',
      });
      const attest = () =>
        augmentDispatchRecord({
          record: blocked,
          event: {
            kind: 'pre-start-rejection-attestation',
            requestId: blocked.request_id,
            source: 'provider-wrapper',
            expectedLaunchStatus: 'blocked-before-start',
            rejection: {
              code,
              rejectedAt: '2026-09-02T00:00:01.000Z',
              provesNoChildStarted: true,
            },
          },
        });
      if (qualifying) {
        expect(attest().oat.preStartRejection).toMatchObject({ code });
      } else {
        // A "launch failure" can describe a post-spawn failure, so the name is
        // no longer part of the pre-start set.
        expect(attest).toThrow(/qualifying codes/i);
      }
    },
  );

  it('rejects an unrecognized rejection code outside the closed qualifying set', () => {
    const blocked = genericRecord({
      launch_status: 'blocked-before-start',
      child_outcome: 'not-started',
    });
    expect(() =>
      augmentDispatchRecord({
        record: blocked,
        event: {
          kind: 'pre-start-rejection-attestation',
          requestId: blocked.request_id,
          source: 'provider-wrapper',
          expectedLaunchStatus: 'blocked-before-start',
          rejection: {
            code: 'something-else-entirely',
            rejectedAt: '2026-09-02T00:00:01.000Z',
            provesNoChildStarted: true,
          },
        },
      }),
    ).toThrow(/qualifying codes/i);
  });

  it('rejects mismatched controls, request IDs, sources, and runtime content', () => {
    expect(() =>
      parsePersistedOatDispatchRecord({
        ...genericRecord(),
        oat: {
          schemaVersion: 1,
          canonicalRole: null,
          preStartRejection: null,
          fallback: { status: 'not-applicable', reason: 'native' },
          runtimeObservation: {
            status: 'reported',
            provider: 'codex',
            source: 'runtime-observer',
            observedAt: '2026-09-02T00:00:00.000Z',
            match: 'matching',
            prompt: 'secret',
          },
        },
      }),
    ).toThrow();
    expect(() =>
      augmentDispatchRecord({
        record: genericRecord(),
        event: {
          kind: 'runtime-observation',
          requestId: 'different-request',
          source: 'runtime-observer',
          observation: { status: 'not-reported' },
        },
      }),
    ).toThrow(/request id/i);
  });
});

describe('runtime observation construction', () => {
  const configured = {
    role: 'oat-phase-implementer',
    model: 'gpt-5.6-sol',
    effort: 'high',
    serviceTier: 'priority',
  };

  it('compares only axes both sides report', () => {
    expect(compareObservedRuntimeMetadata({}, configured)).toBe(
      'not-comparable',
    );
    expect(
      compareObservedRuntimeMetadata({ childLineage: 'root' }, configured),
    ).toBe('not-comparable');
    expect(
      compareObservedRuntimeMetadata({ model: 'gpt-5.6-sol' }, configured),
    ).toBe('matching');
    expect(
      compareObservedRuntimeMetadata({ model: 'GPT-5.6-Sol ' }, configured),
    ).toBe('matching');
    expect(
      compareObservedRuntimeMetadata({ model: 'gpt-5.6-terra' }, configured),
    ).toBe('mismatching');
    expect(compareObservedRuntimeMetadata({ model: 'gpt-5.6-sol' }, null)).toBe(
      'not-comparable',
    );
  });

  it('treats an unexposed or unreported axis as not comparable', () => {
    expect(
      compareObservedRuntimeMetadata({ effort: 'not-exposed' }, configured),
    ).toBe('not-comparable');
    expect(
      compareObservedRuntimeMetadata({ effort: 'not-reported' }, configured),
    ).toBe('not-comparable');
    expect(
      compareObservedRuntimeMetadata(
        { effort: 'not-exposed', model: 'gpt-5.6-sol' },
        configured,
      ),
    ).toBe('matching');
  });

  it('builds a reported observation without copying configured values', () => {
    expect(
      buildRuntimeObservation({
        provider: 'codex',
        source: 'codex-rollout-metadata',
        observedAt: '2026-09-02T12:00:00.000Z',
        metadata: { model: 'gpt-5.6-sol', childLineage: 'depth-1' },
        configured,
      }),
    ).toEqual({
      status: 'reported',
      provider: 'codex',
      childLineage: 'depth-1',
      model: 'gpt-5.6-sol',
      source: 'codex-rollout-metadata',
      observedAt: '2026-09-02T12:00:00.000Z',
      match: 'matching',
      comparedAxes: ['model'],
    });
  });

  it('returns not-reported for absent, empty, or invalid metadata', () => {
    const base = {
      provider: 'codex',
      source: 'codex-rollout-metadata',
      observedAt: '2026-09-02T12:00:00.000Z',
      configured,
    };
    expect(buildRuntimeObservation({ ...base, metadata: null })).toEqual({
      status: 'not-reported',
    });
    expect(buildRuntimeObservation({ ...base, metadata: {} })).toEqual({
      status: 'not-reported',
    });
    expect(
      buildRuntimeObservation({
        ...base,
        observedAt: 'not-a-timestamp',
        metadata: { model: 'gpt-5.6-sol' },
      }),
    ).toEqual({ status: 'not-reported' });
    expect(
      buildRuntimeObservation({
        ...base,
        metadata: { model: 'a'.repeat(300) },
      }),
    ).toEqual({ status: 'not-reported' });
  });

  it('records which axes the verdict actually rests on', () => {
    // `matching` must never be read as agreement about an axis nobody reported.
    expect(
      buildRuntimeObservation({
        provider: 'codex',
        source: 'codex-rollout-metadata',
        observedAt: '2026-09-02T12:00:00.000Z',
        metadata: { serviceTier: 'priority', effort: 'not-exposed' },
        configured,
      }),
    ).toMatchObject({ match: 'matching', comparedAxes: ['serviceTier'] });

    expect(
      buildRuntimeObservation({
        provider: 'codex',
        source: 'codex-rollout-metadata',
        observedAt: '2026-09-02T12:00:00.000Z',
        metadata: { model: 'gpt-5.6-sol', role: 'oat-phase-implementer' },
        configured,
      }),
    ).toMatchObject({
      match: 'matching',
      comparedAxes: ['role', 'model'],
    });

    expect(
      buildRuntimeObservation({
        provider: 'codex',
        source: 'codex-rollout-metadata',
        observedAt: '2026-09-02T12:00:00.000Z',
        metadata: { childLineage: 'root' },
        configured,
      }),
    ).toMatchObject({ match: 'not-comparable', comparedAxes: [] });
  });

  it('rejects an observation carrying sensitive content', () => {
    expect(() =>
      buildRuntimeObservation({
        provider: 'codex',
        source: 'codex-rollout-metadata',
        observedAt: '2026-09-02T12:00:00.000Z',
        metadata: {
          model: 'gpt-5.6-sol',
          prompt: 'you are a helpful assistant',
        } as never,
        configured,
      }),
    ).toThrow(/sensitive/i);
  });

  it('bounds every observation string at the identifier limit', () => {
    expect(() =>
      parsePersistedOatDispatchRecord({
        ...genericRecord(),
        oat: {
          schemaVersion: 1,
          canonicalRole: null,
          preStartRejection: null,
          fallbackClaim: null,
          fallback: { status: 'not-applicable', reason: 'native' },
          runtimeObservation: {
            status: 'reported',
            provider: 'codex',
            model: 'a'.repeat(300),
            source: 'codex-rollout-metadata',
            observedAt: '2026-09-02T12:00:00.000Z',
            match: 'matching',
          },
        },
      }),
    ).toThrow();
  });
});

describe('configuredInvocationForObservation', () => {
  it('projects only the immutable configured selection axes', () => {
    expect(configuredInvocationForObservation(genericRecord())).toEqual({
      role: ['oat-phase-implementer', 'oat-phase-implementer-gpt-5-6-sol-high'],
      model: 'gpt-5.6-sol',
      effort: 'high',
      serviceTier: 'priority',
    });
  });

  it('reports an absent selector as null rather than inventing one', () => {
    expect(
      configuredInvocationForObservation(
        genericRecord({
          role_selector: null,
          model_selector: null,
          effort_selector: null,
          service_tier_selector: null,
        }),
      ),
    ).toEqual({
      role: ['oat-phase-implementer'],
      model: null,
      effort: null,
      serviceTier: null,
    });
  });

  it('matches an observation against any configured spelling of an axis', () => {
    const configured = configuredInvocationForObservation(genericRecord());
    expect(
      compareObservedRuntimeMetadata(
        { role: 'oat-phase-implementer-gpt-5-6-sol-high' },
        configured,
      ),
    ).toBe('matching');
    expect(
      compareObservedRuntimeMetadata(
        { role: 'oat-phase-implementer' },
        configured,
      ),
    ).toBe('matching');
    expect(
      compareObservedRuntimeMetadata({ role: 'oat-reviewer' }, configured),
    ).toBe('mismatching');
    expect(
      compareObservedRuntimeMetadata({ role: 'anything' }, { role: [] }),
    ).toBe('not-comparable');
  });
});

describe('dispatch evidence pattern messages', () => {
  function canonicalRoleEvent(evidence: Record<string, unknown>) {
    return {
      kind: 'canonical-role-resolution',
      requestId: 'dispatch-native-1',
      source: 'canonical-role-resolver',
      evidence: { ...roleEvidence, ...evidence },
    };
  }

  function issuesFor(value: unknown) {
    const parsed = safeParseOatDispatchEvidenceEvent(value);
    return parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
  }

  it('states the redacted role path form a malformed path must take', () => {
    expect(
      issuesFor(
        canonicalRoleEvent({
          canonicalPath: '<repo>/agents/oat-phase-implementer.md',
          selectedPath: '/Users/alice/.agents/agents/oat-phase-implementer.md',
        }),
      ),
    ).toEqual([
      {
        path: 'evidence.canonicalPath',
        message: 'expected <loaded|user|project>/agents/<name>.md',
      },
      {
        path: 'evidence.selectedPath',
        message: 'expected <loaded|user|project>/agents/<name>.md',
      },
    ]);
  });

  it('states the digest form a malformed content digest must take', () => {
    expect(
      issuesFor(canonicalRoleEvent({ contentDigest: 'sha256:ABC' })),
    ).toEqual([
      {
        path: 'evidence.contentDigest',
        message: 'expected sha256:<64 lowercase hex>',
      },
    ]);
  });

  it('carries the expected form through the throwing augmentation path', () => {
    expect(() =>
      augmentDispatchRecord({
        record: genericRecord(),
        event: canonicalRoleEvent({
          canonicalPath: '<repo>/agents/oat-phase-implementer.md',
        }) as never,
      }),
    ).toThrow('expected <loaded|user|project>/agents/<name>.md');
  });

  it('accepts a well-formed canonical role event', () => {
    expect(issuesFor(canonicalRoleEvent({}))).toEqual([]);
  });
});
