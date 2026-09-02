import type { CanonicalRoleEvidence } from '@agents/canonical';
import { describe, expect, it } from 'vitest';

import type { GenericDispatchRecord } from './generic-dispatch-record';
import {
  augmentDispatchRecord,
  parsePersistedOatDispatchRecord,
  type ExactTargetRef,
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

const target: ExactTargetRef = {
  provider: 'codex',
  modelSelector: 'gpt-5.6-sol',
  effortSelector: 'high',
  reasoningModeSelector: null,
  serviceTierSelector: 'priority',
  selectedRoute: 'native',
};

function rejectedTrigger(
  claimFor: string | null = 'dispatch-fallback-1',
  overrides: Partial<GenericDispatchRecord> = {},
) {
  const blocked = genericRecord({
    launch_status: 'blocked-before-start',
    child_outcome: 'not-started',
    ...overrides,
  });
  const rejected = augmentDispatchRecord({
    record: augmentDispatchRecord({
      record: blocked,
      event: {
        kind: 'canonical-role-resolution',
        requestId: blocked.request_id,
        source: 'canonical-role-resolver',
        evidence: roleEvidence,
      },
    }),
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
  if (claimFor === null) return rejected;
  return augmentDispatchRecord({
    record: rejected,
    event: {
      kind: 'fallback-claim',
      requestId: rejected.request_id,
      source: 'provider-wrapper',
      claim: {
        fallbackRequestId: claimFor,
        claimedAt: '2026-09-02T00:00:02.000Z',
      },
    },
  });
}

function fallbackRecord(overrides: Partial<GenericDispatchRecord> = {}) {
  return genericRecord({
    request_id: 'dispatch-fallback-1',
    role_selector: 'generalPurpose',
    selection_reason: 'pre-start-rejection',
    ...overrides,
  });
}

function fallbackEvent() {
  return {
    kind: 'fallback-link' as const,
    requestId: 'dispatch-fallback-1',
    source: 'provider-wrapper' as const,
    evidence: {
      status: 'fallback-dispatch' as const,
      triggerRequestId: 'dispatch-native-1',
      fallbackRequestId: 'dispatch-fallback-1',
      trigger: 'pre-start-rejection' as const,
      fallbackReason: 'Native role rejected before start',
      kind: 'canonical-instruction-fresh-child' as const,
      approximation: true as const,
      preservedTarget: target,
      rejection: {
        source: 'provider-wrapper' as const,
        code: 'native-role-unavailable',
        rejectedAt: '2026-09-02T00:00:01.000Z',
        provesNoChildStarted: true as const,
      },
      roleInstructions: roleEvidence,
    },
  };
}

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

  it('links one fresh exact-target approximation to the rejected request', () => {
    const trigger = rejectedTrigger();
    const fallback = fallbackRecord();
    const linked = augmentDispatchRecord({
      record: fallback,
      triggerRecord: trigger,
      relatedRecords: [],
      event: fallbackEvent(),
    });
    expect(linked.oat.fallback).toMatchObject({
      status: 'fallback-dispatch',
      approximation: true,
      triggerRequestId: trigger.request_id,
    });
    const secondFallbackEvent = {
      ...fallbackEvent(),
      requestId: 'dispatch-fallback-2',
      evidence: {
        ...fallbackEvent().evidence,
        fallbackRequestId: 'dispatch-fallback-2',
      },
    };
    expect(() =>
      augmentDispatchRecord({
        record: { ...fallback, request_id: 'dispatch-fallback-2' },
        triggerRecord: trigger,
        relatedRecords: [linked],
        event: secondFallbackEvent,
      }),
    ).toThrow(/must durably claim this fallback request/i);
    expect(() =>
      augmentDispatchRecord({
        record: { ...fallback, request_id: 'dispatch-fallback-2' },
        triggerRecord: rejectedTrigger('dispatch-fallback-2'),
        relatedRecords: [linked],
        event: secondFallbackEvent,
      }),
    ).toThrow(/already has a fallback/i);
  });

  it('requires the trigger to durably claim exactly this fallback first', () => {
    expect(() =>
      augmentDispatchRecord({
        record: fallbackRecord(),
        triggerRecord: rejectedTrigger(null),
        relatedRecords: [],
        event: fallbackEvent(),
      }),
    ).toThrow(/must durably claim this fallback request/i);

    expect(() =>
      augmentDispatchRecord({
        record: rejectedTrigger('dispatch-fallback-1'),
        event: {
          kind: 'fallback-claim',
          requestId: 'dispatch-native-1',
          source: 'provider-wrapper',
          claim: {
            fallbackRequestId: 'dispatch-fallback-2',
            claimedAt: '2026-09-02T00:00:03.000Z',
          },
        },
      }),
    ).toThrow(/already has a fallback/i);

    expect(
      rejectedTrigger('dispatch-fallback-1').oat.fallbackClaim,
    ).toMatchObject({ fallbackRequestId: 'dispatch-fallback-1' });
  });

  it('refuses a fallback claim without proven rejection or resolved role evidence', () => {
    const accepted = genericRecord();
    expect(() =>
      augmentDispatchRecord({
        record: accepted,
        event: {
          kind: 'fallback-claim',
          requestId: accepted.request_id,
          source: 'provider-wrapper',
          claim: {
            fallbackRequestId: 'dispatch-fallback-1',
            claimedAt: '2026-09-02T00:00:03.000Z',
          },
        },
      }),
    ).toThrow(/blocked before start can claim a fallback/i);

    const blocked = genericRecord({
      launch_status: 'blocked-before-start',
      child_outcome: 'not-started',
    });
    expect(() =>
      augmentDispatchRecord({
        record: blocked,
        event: {
          kind: 'fallback-claim',
          requestId: blocked.request_id,
          source: 'provider-wrapper',
          claim: {
            fallbackRequestId: 'dispatch-fallback-1',
            claimedAt: '2026-09-02T00:00:03.000Z',
          },
        },
      }),
    ).toThrow(/proven pre-start rejection evidence/i);
  });

  it.each([
    [
      'payload',
      { payload: { sandbox: 'danger-full-access', tools: ['Bash'] } },
    ],
    ['provider', { provider: 'claude' }],
    ['model_selector', { model_selector: 'gpt-5.6-sol-mini' }],
    [
      'model_selector_granularity',
      { model_selector_granularity: 'opaque' as const },
    ],
    ['effort_selector', { effort_selector: 'low' }],
    ['reasoning_mode_selector', { reasoning_mode_selector: 'pro' }],
    ['service_tier_selector', { service_tier_selector: 'standard' }],
    ['selected_route', { selected_route: 'cli' }],
    ['authority', { authority: 'read-only' }],
    ['authorization_scope', { authorization_scope: 'widened' }],
    ['deadline_seconds', { deadline_seconds: 1200 }],
    ['retry_limit', { retry_limit: 3 }],
    ['dispatch_context', { dispatch_context: 'nested-native' }],
    ['dispatch_policy', { dispatch_policy: 'economy' }],
    ['dispatch_ceiling', { dispatch_ceiling: 'consequential' }],
    ['scope', { scope: 'p07' }],
    ['action', { action: 'review' }],
    ['role_class', { role_class: 'recon' }],
  ])('rejects a fallback that widens %s', (_field, override) => {
    const trigger = rejectedTrigger();
    const widened = fallbackRecord(override as Partial<GenericDispatchRecord>);
    const preservedTarget = {
      ...target,
      provider: widened.provider,
      modelSelector: widened.model_selector,
      effortSelector: widened.effort_selector,
      reasoningModeSelector: widened.reasoning_mode_selector ?? null,
      serviceTierSelector: widened.service_tier_selector ?? null,
      selectedRoute: widened.selected_route,
    };
    expect(() =>
      augmentDispatchRecord({
        record: widened,
        triggerRecord: trigger,
        relatedRecords: [],
        event: {
          ...fallbackEvent(),
          evidence: { ...fallbackEvent().evidence, preservedTarget },
        },
      }),
    ).toThrow(/preserve the exact target and controls/i);
  });

  it.each([
    [
      'fallback.allow_below_task_class_floor false to true',
      {
        fallback: {
          mode: 'caller-inline',
          allow_below_task_class_floor: false,
        },
      },
      {
        fallback: {
          mode: 'nested-dispatch',
          target: 'weak-worker',
          allow_below_task_class_floor: true,
        },
      },
    ],
    [
      'fallback introduced by the fallback record alone',
      {},
      {
        fallback: {
          mode: 'nested-dispatch',
          allow_below_task_class_floor: true,
        },
      },
    ],
    [
      'selection_source',
      { selection_source: 'policy-resolved' as const },
      { selection_source: 'explicit-user' as const },
    ],
    [
      'configured_invocation_evidence',
      { configured_invocation_evidence: ['dispatch ceiling resolver'] },
      { configured_invocation_evidence: ['agent proposed this route'] },
    ],
  ])(
    'rejects a fallback that changes %s',
    (_label, triggerOverride, fallbackOverride) => {
      const trigger = rejectedTrigger(
        'dispatch-fallback-1',
        triggerOverride as Partial<GenericDispatchRecord>,
      );
      expect(() =>
        augmentDispatchRecord({
          record: fallbackRecord({
            ...triggerOverride,
            ...fallbackOverride,
          } as Partial<GenericDispatchRecord>),
          triggerRecord: trigger,
          relatedRecords: [],
          event: fallbackEvent(),
        }),
      ).toThrow(/preserve the exact target and controls/i);
    },
  );

  it('allows a fallback to carry its own diagnostics and runtime confirmation', () => {
    const linked = augmentDispatchRecord({
      record: fallbackRecord({
        diagnostics: ['native role rejected before start'],
        runtime_confirmation: 'reported',
      }),
      triggerRecord: rejectedTrigger(),
      relatedRecords: [],
      event: fallbackEvent(),
    });
    expect(linked.oat.fallback).toMatchObject({ status: 'fallback-dispatch' });
  });

  it('rejects a fallback whose class floor evidence differs from the trigger', () => {
    const classFields = {
      task_class: 'consequential' as const,
      model_class_floor: 'consequential',
      classification_source: 'caller' as const,
      classification_reason: 'Security boundary review.',
      floor_satisfaction: 'satisfied' as const,
    };
    expect(() =>
      augmentDispatchRecord({
        record: fallbackRecord(classFields),
        triggerRecord: rejectedTrigger(),
        relatedRecords: [],
        event: fallbackEvent(),
      }),
    ).toThrow(/preserve the exact target and controls/i);
  });

  it('rejects a fallback that does not declare pre-start-rejection selection', () => {
    expect(() =>
      augmentDispatchRecord({
        record: fallbackRecord({ selection_reason: 'inherit' }),
        triggerRecord: rejectedTrigger(),
        relatedRecords: [],
        event: fallbackEvent(),
      }),
    ).toThrow(/selection_reason pre-start-rejection/i);
  });

  it('requires the trigger to carry resolved canonical role evidence', () => {
    const blocked = genericRecord({
      launch_status: 'blocked-before-start',
      child_outcome: 'not-started',
    });
    const roleless = augmentDispatchRecord({
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
    expect(roleless.oat.canonicalRole).toBeNull();
    // A tampered journal that carries a claim without resolved role evidence
    // must still fail; the claim event itself can never produce this state.
    const tamperedClaim = {
      fallbackRequestId: 'dispatch-fallback-1',
      claimedAt: '2026-09-02T00:00:02.000Z',
    };
    expect(() =>
      augmentDispatchRecord({
        record: fallbackRecord(),
        triggerRecord: {
          ...roleless,
          oat: { ...roleless.oat, fallbackClaim: tamperedClaim },
        },
        relatedRecords: [],
        event: fallbackEvent(),
      }),
    ).toThrow(/resolved canonical role evidence on the rejected trigger/i);

    const missingRole = augmentDispatchRecord({
      record: blocked,
      event: {
        kind: 'canonical-role-resolution',
        requestId: blocked.request_id,
        source: 'canonical-role-resolver',
        evidence: {
          status: 'missing',
          dependency: 'workflows',
          canonicalRole: 'oat-phase-implementer',
          candidateMisses: [],
          recovery: [{ command: 'oat tools install workflows' }],
        },
      },
    });
    expect(() =>
      augmentDispatchRecord({
        record: fallbackRecord(),
        triggerRecord: {
          ...missingRole,
          oat: {
            ...missingRole.oat,
            preStartRejection: roleless.oat.preStartRejection,
            fallbackClaim: tamperedClaim,
          },
        },
        relatedRecords: [],
        event: fallbackEvent(),
      }),
    ).toThrow(/resolved canonical role evidence on the rejected trigger/i);
  });

  it.each([
    ['dependency', { dependency: 'utility' }],
    ['canonicalRole', { canonicalRole: 'unrelated-role' }],
    ['tier', { tier: 'project' as const }],
    ['validation', { validation: 'exact-canonical-symlink' as const }],
    [
      'canonicalPath',
      { canonicalPath: '<project>/agents/oat-phase-implementer.md' },
    ],
    [
      'selectedPath',
      { selectedPath: '<project>/agents/oat-phase-implementer.md' },
    ],
    ['roleVersion', { roleVersion: '9.9.9' }],
    ['contentDigest', { contentDigest: `sha256:${'b'.repeat(64)}` }],
    [
      'candidateMisses',
      {
        candidateMisses: [
          {
            tier: 'loaded' as const,
            candidate: '<loaded>/agents/oat-phase-implementer.md',
            outcome: 'missing' as const,
          },
        ],
      },
    ],
  ])(
    'rejects fallback role evidence that substitutes %s',
    (_field, override) => {
      expect(() =>
        augmentDispatchRecord({
          record: fallbackRecord(),
          triggerRecord: rejectedTrigger(),
          relatedRecords: [],
          event: {
            ...fallbackEvent(),
            evidence: {
              ...fallbackEvent().evidence,
              roleInstructions: { ...roleEvidence, ...override },
            },
          },
        }),
      ).toThrow(/role evidence must equal the trigger/i);
    },
  );

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
