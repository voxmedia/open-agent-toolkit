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
            code: 'timeout',
            rejectedAt: '2026-09-02T00:00:01.000Z',
            provesNoChildStarted: true,
          },
        },
      }),
    ).toThrow(/blocked-before-start/i);
  });

  it('links one fresh exact-target approximation to the rejected request', () => {
    const blocked = genericRecord({
      launch_status: 'blocked-before-start',
      child_outcome: 'not-started',
    });
    const trigger = augmentDispatchRecord({
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
    const fallback = genericRecord({
      request_id: 'dispatch-fallback-1',
      role_selector: 'generalPurpose',
      selection_reason: 'pre-start-rejection',
    });
    const linked = augmentDispatchRecord({
      record: fallback,
      triggerRecord: trigger,
      relatedRecords: [],
      event: {
        kind: 'fallback-link',
        requestId: fallback.request_id,
        source: 'provider-wrapper',
        evidence: {
          status: 'fallback-dispatch',
          triggerRequestId: trigger.request_id,
          fallbackRequestId: fallback.request_id,
          trigger: 'pre-start-rejection',
          fallbackReason: 'Native role rejected before start',
          kind: 'canonical-instruction-fresh-child',
          approximation: true,
          preservedTarget: target,
          rejection: {
            source: 'provider-wrapper',
            code: 'native-role-unavailable',
            rejectedAt: '2026-09-02T00:00:01.000Z',
            provesNoChildStarted: true,
          },
          roleInstructions: roleEvidence,
        },
      },
    });
    expect(linked.oat.fallback).toMatchObject({
      status: 'fallback-dispatch',
      approximation: true,
      triggerRequestId: trigger.request_id,
    });
    expect(() =>
      augmentDispatchRecord({
        record: { ...fallback, request_id: 'dispatch-fallback-2' },
        triggerRecord: trigger,
        relatedRecords: [linked],
        event: {
          kind: 'fallback-link',
          requestId: 'dispatch-fallback-2',
          source: 'provider-wrapper',
          evidence: {
            ...linked.oat.fallback,
            status: 'fallback-dispatch',
            fallbackRequestId: 'dispatch-fallback-2',
          },
        },
      }),
    ).toThrow(/already has a fallback/i);
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
