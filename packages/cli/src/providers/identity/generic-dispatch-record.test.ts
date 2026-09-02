import { describe, expect, it } from 'vitest';

import {
  parseGenericDispatchRecord,
  type GenericDispatchRecord,
} from './generic-dispatch-record';

export function genericRecord(
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

describe('parseGenericDispatchRecord', () => {
  it('preserves the neutral snake-case schema without OAT fields', () => {
    const record = genericRecord();
    expect(parseGenericDispatchRecord(record)).toEqual(record);
    expect(parseGenericDispatchRecord(record)).not.toHaveProperty('oat');
  });

  it('rejects unknown fields and sensitive content recursively', () => {
    expect(() =>
      parseGenericDispatchRecord({ ...genericRecord(), oat: {} }),
    ).toThrow(/unrecognized key/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        payload: { nested: { prompt: 'secret instructions' } },
      }),
    ).toThrow(/sensitive dispatch content/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        diagnostics: ['Authorization: Bearer secret-token'],
      }),
    ).toThrow(/sensitive dispatch content/i);
  });

  it('requires stable contained request IDs and valid launch state', () => {
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        request_id: '../outside',
      }),
    ).toThrow(/request_id/i);
    expect(() =>
      parseGenericDispatchRecord({
        ...genericRecord(),
        launch_status: 'accepted',
        child_outcome: null,
      }),
    ).toThrow(/accepted dispatch/i);
  });
});
