import { describe, expect, it } from 'vitest';

import type { GenericDispatchRecord } from './generic-dispatch-record';
import {
  normalizeRuntimeObservation,
  parseRuntimeObservationEnvelope,
  providerSupportsRuntimeObservation,
} from './runtime-observation';

const OBSERVED_AT = '2026-09-02T12:00:00.000Z';

function genericRecord(
  overrides: Partial<GenericDispatchRecord> = {},
): GenericDispatchRecord {
  return {
    request_id: 'dispatch-native-1',
    caller: 'oat-project-implement',
    scope: 'p07',
    objective: 'Implement runtime observation',
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
    payload: { task: 'p07' },
    launch_status: 'accepted',
    child_outcome: 'completed',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
    ...overrides,
  };
}

// Real Codex 0.152.1 shapes; see codex-runtime-observation.fixtures.ts.
function codexSessionMeta(agentRole: string) {
  return {
    ordinal: 0,
    type: 'session_meta',
    payload: {
      session_id: '01a06402-2861-7421-821a-137187a03f7f',
      id: '01a06402-4d66-74f1-a706-f69cde1516f6',
      parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
      thread_source: 'subagent',
      agent_role: agentRole,
      source: {
        subagent: {
          thread_spawn: {
            parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
            depth: 1,
            agent_role: agentRole,
          },
        },
      },
    },
  };
}

const codexEntries = [
  codexSessionMeta('oat-phase-implementer'),
  {
    ordinal: 7,
    type: 'turn_context',
    payload: { model: 'gpt-5.6-sol', effort: 'high' },
  },
];

// Real on-disk Claude transcript shape; see
// claude-runtime-observation.fixtures.ts.
const claudeEntries = [
  {
    type: 'assistant',
    isSidechain: true,
    effort: 'high',
    sessionId: '19c78382-cceb-45ab-bf24-bb8aa284d96b',
    requestId: 'req_011CdSgeEdPwRsUpVTCihKmV',
    message: {
      model: 'claude-opus-5',
      usage: { service_tier: 'standard' },
    },
  },
];

describe('providerSupportsRuntimeObservation', () => {
  it('gates observation on provider capability', () => {
    expect(providerSupportsRuntimeObservation('codex')).toBe(true);
    expect(providerSupportsRuntimeObservation('claude')).toBe(true);
    expect(providerSupportsRuntimeObservation('cursor')).toBe(false);
    expect(providerSupportsRuntimeObservation('some-future-host')).toBe(false);
  });
});

describe('parseRuntimeObservationEnvelope', () => {
  it('accepts a metadata-only envelope', () => {
    expect(
      parseRuntimeObservationEnvelope({
        provider: 'codex',
        observedAt: OBSERVED_AT,
        entries: codexEntries,
      }).entries,
    ).toHaveLength(2);
  });

  it('bounds the envelope by serialized size as well as entry count', () => {
    expect(() =>
      parseRuntimeObservationEnvelope({
        provider: 'codex',
        observedAt: OBSERVED_AT,
        entries: [
          {
            type: 'session_meta',
            payload: { id: 'x'.repeat(17 * 1024 * 1024) },
          },
        ],
      }),
    ).toThrow(/bytes|size/i);
  });

  it('rejects unknown keys, bad shapes, and content-bearing envelopes', () => {
    expect(() =>
      parseRuntimeObservationEnvelope({
        provider: 'codex',
        observedAt: OBSERVED_AT,
        entries: codexEntries,
        transcript: 'the whole conversation',
      }),
    ).toThrow();
    expect(() =>
      parseRuntimeObservationEnvelope({
        provider: 'codex',
        observedAt: 'yesterday',
        entries: [],
      }),
    ).toThrow();
    expect(() =>
      parseRuntimeObservationEnvelope({
        provider: 'codex',
        observedAt: OBSERVED_AT,
        entries: 'rollout.jsonl',
      }),
    ).toThrow();
    expect(() =>
      parseRuntimeObservationEnvelope({
        provider: 'codex',
        observedAt: OBSERVED_AT,
        entries: Array.from({ length: 5001 }, () => ({ type: 'event_msg' })),
      }),
    ).toThrow(/entries/i);
  });
});

describe('normalizeRuntimeObservation', () => {
  it('routes Codex metadata to a matching observation', () => {
    expect(
      normalizeRuntimeObservation({
        record: genericRecord(),
        envelope: {
          provider: 'codex',
          observedAt: OBSERVED_AT,
          entries: codexEntries,
        },
      }),
    ).toMatchObject({
      status: 'reported',
      provider: 'codex',
      match: 'matching',
      model: 'gpt-5.6-sol',
      childLineage: 'depth-1',
    });
  });

  it('routes Claude metadata and reports its real effort axis', () => {
    // Claude exposes a selectable effort axis on a real transcript, so the
    // observation carries the observed value rather than `not-exposed`.
    expect(
      normalizeRuntimeObservation({
        record: genericRecord({
          provider: 'claude',
          model_selector: 'claude-opus-5',
          effort_selector: 'high',
          service_tier_selector: 'standard',
          role_selector: 'oat-phase-implementer',
        }),
        envelope: {
          provider: 'claude',
          observedAt: OBSERVED_AT,
          entries: claudeEntries,
        },
      }),
    ).toMatchObject({
      status: 'reported',
      provider: 'claude',
      effort: 'high',
      childLineage: 'depth-unknown',
      match: 'matching',
      comparedAxes: ['model', 'effort', 'serviceTier'],
    });
  });

  it('preserves Cursor not-reported even with rich metadata', () => {
    expect(
      normalizeRuntimeObservation({
        record: genericRecord({
          provider: 'cursor',
          role_selector: 'generalPurpose',
        }),
        envelope: {
          provider: 'cursor',
          observedAt: OBSERVED_AT,
          entries: [...codexEntries, ...claudeEntries],
        },
      }),
    ).toEqual({ status: 'not-reported' });
  });

  it('declines an envelope whose provider is not the recorded provider', () => {
    expect(
      normalizeRuntimeObservation({
        record: genericRecord(),
        envelope: {
          provider: 'claude',
          observedAt: OBSERVED_AT,
          entries: claudeEntries,
        },
      }),
    ).toEqual({ status: 'not-reported' });
  });

  it('accepts the canonical role name or the materialized selector', () => {
    expect(
      normalizeRuntimeObservation({
        record: genericRecord(),
        envelope: {
          provider: 'codex',
          observedAt: OBSERVED_AT,
          entries: [codexSessionMeta('oat-phase-implementer-gpt-5-6-sol-high')],
        },
      }),
    ).toMatchObject({ match: 'matching' });
    expect(
      normalizeRuntimeObservation({
        record: genericRecord(),
        envelope: {
          provider: 'codex',
          observedAt: OBSERVED_AT,
          entries: [codexSessionMeta('oat-reviewer')],
        },
      }),
    ).toMatchObject({ match: 'mismatching' });
  });

  it('never lets a requested argument or materialized pin become an observation', () => {
    const record = genericRecord();
    const before = JSON.stringify(record);
    const observation = normalizeRuntimeObservation({
      record,
      envelope: { provider: 'codex', observedAt: OBSERVED_AT, entries: [] },
    });
    expect(observation).toEqual({ status: 'not-reported' });
    expect(JSON.stringify(record)).toBe(before);
    const serialized = JSON.stringify(observation);
    for (const requested of [
      'gpt-5.6-sol',
      'oat-phase-implementer-gpt-5-6-sol-high',
      'priority',
      'high',
    ]) {
      expect(serialized).not.toContain(requested);
    }
  });

  it('stores no prompt, message, or transcript body from the entries', () => {
    const observation = normalizeRuntimeObservation({
      record: genericRecord(),
      envelope: {
        provider: 'codex',
        observedAt: OBSERVED_AT,
        entries: [
          {
            ordinal: 0,
            type: 'session_meta',
            payload: {
              session_id: '01a06402-2861-7421-821a-137187a03f7f',
              id: '01a06402-4d66-74f1-a706-f69cde1516f6',
              parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
              thread_source: 'subagent',
              base_instructions: 'SECRET-SYSTEM-PROMPT',
              agent_role: 'oat-phase-implementer',
              source: {
                subagent: {
                  thread_spawn: {
                    parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
                    depth: 1,
                  },
                },
              },
            },
          },
          {
            ordinal: 3,
            type: 'response_item',
            payload: { content: 'SECRET-USER-MESSAGE' },
          },
          {
            ordinal: 7,
            type: 'turn_context',
            payload: { model: 'gpt-5.6-sol' },
          },
        ],
      },
    });
    const serialized = JSON.stringify(observation);
    expect(serialized).not.toContain('SECRET-SYSTEM-PROMPT');
    expect(serialized).not.toContain('SECRET-USER-MESSAGE');
    expect(observation).toMatchObject({ status: 'reported' });
  });
});
