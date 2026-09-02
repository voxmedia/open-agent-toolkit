import { describe, expect, it } from 'vitest';

import {
  extractCodexRuntimeMetadata,
  parseCodexRuntimeObservation,
  CODEX_OBSERVATION_SOURCE,
} from './codex-runtime-observation';

const OBSERVED_AT = '2026-09-02T12:00:00.000Z';

const configured = {
  role: 'oat-phase-implementer',
  model: 'gpt-5.6-sol',
  effort: 'high',
  serviceTier: 'priority',
};

function sessionMeta(payload: Record<string, unknown>) {
  return { timestamp: OBSERVED_AT, type: 'session_meta', payload };
}

function turnContext(payload: Record<string, unknown>) {
  return { timestamp: OBSERVED_AT, type: 'turn_context', payload };
}

/**
 * A conversation entry whose payload throws the moment anything reads it. The
 * parser must classify by `type` alone, so touching this payload is a test
 * failure rather than a silent content read.
 */
function conversationEntry(type = 'response_item') {
  const entry = { timestamp: OBSERVED_AT, type };
  Object.defineProperty(entry, 'payload', {
    enumerable: true,
    get() {
      throw new Error(`Conversation content was read from a ${type} entry.`);
    },
  });
  return entry;
}

function rootFixture() {
  return [
    sessionMeta({
      id: 'sess-root',
      originator: 'codex_cli_rs',
      cli_version: '0.42.0',
      role: 'oat-phase-implementer',
    }),
    turnContext({
      model: 'gpt-5.6-sol',
      effort: 'high',
      service_tier: 'priority',
    }),
    conversationEntry(),
  ];
}

function depthOneFixture() {
  return [
    ...rootFixture(),
    sessionMeta({
      id: 'sess-child',
      parent_id: 'sess-root',
      role: 'oat-recon-worker',
    }),
    turnContext({
      model: 'gpt-5.6-terra',
      effort: 'medium',
      service_tier: 'standard',
    }),
  ];
}

function depthTwoFixture() {
  return [
    ...depthOneFixture(),
    sessionMeta({
      id: 'sess-grandchild',
      parent_id: 'sess-child',
      role: 'oat-recon-worker',
    }),
    turnContext({ model: 'gpt-5.6-terra', effort: 'low' }),
  ];
}

describe('extractCodexRuntimeMetadata', () => {
  it('reads a fork-free root session without touching conversation content', () => {
    expect(extractCodexRuntimeMetadata(rootFixture())).toEqual({
      childLineage: 'root',
      role: 'oat-phase-implementer',
      model: 'gpt-5.6-sol',
      effort: 'high',
      serviceTier: 'priority',
      requestId: null,
      forked: false,
    });
  });

  it('reports depth-1 and depth-2 child lineage from the parent chain', () => {
    expect(extractCodexRuntimeMetadata(depthOneFixture())).toMatchObject({
      childLineage: 'depth-1',
      model: 'gpt-5.6-terra',
      effort: 'medium',
      serviceTier: 'standard',
    });
    expect(extractCodexRuntimeMetadata(depthTwoFixture())).toMatchObject({
      childLineage: 'depth-2',
      model: 'gpt-5.6-terra',
      effort: 'low',
    });
  });

  it('binds each turn context to the session it follows', () => {
    // The depth-1 child must not inherit the root's priority tier.
    expect(extractCodexRuntimeMetadata(depthOneFixture())?.serviceTier).toBe(
      'standard',
    );
    expect(extractCodexRuntimeMetadata(depthTwoFixture())?.serviceTier).toBe(
      null,
    );
  });

  it('uses the forked child rather than its embedded parent records', () => {
    const forked = [
      ...depthOneFixture(),
      sessionMeta({
        id: 'sess-fork',
        parent_id: 'sess-root',
        source: { type: 'fork', parent_session_id: 'sess-child' },
        role: 'oat-phase-implementer',
      }),
      turnContext({ model: 'gpt-5.6-sol', effort: 'high' }),
    ];
    expect(extractCodexRuntimeMetadata(forked)).toMatchObject({
      childLineage: 'depth-1',
      forked: true,
      model: 'gpt-5.6-sol',
      effort: 'high',
    });
  });

  it('reports depth-unknown when a named parent record is absent', () => {
    expect(
      extractCodexRuntimeMetadata([
        sessionMeta({ id: 'sess-child', parent_id: 'sess-elsewhere' }),
        turnContext({ model: 'gpt-5.6-sol' }),
      ])?.childLineage,
    ).toBe('depth-unknown');
  });

  it('returns null when no metadata entry is present', () => {
    expect(
      extractCodexRuntimeMetadata([
        conversationEntry('response_item'),
        conversationEntry('event_msg'),
        conversationEntry('compacted'),
      ]),
    ).toBeNull();
    expect(extractCodexRuntimeMetadata([])).toBeNull();
  });

  it('drops values that fail the bounded identifier shape', () => {
    const metadata = extractCodexRuntimeMetadata([
      sessionMeta({ id: 'sess-root', role: 'role\nwith\nnewlines' }),
      turnContext({
        model: 'a'.repeat(300),
        effort: 'high',
        service_tier: { nested: 'object' },
      }),
    ]);
    expect(metadata).toMatchObject({
      role: null,
      model: null,
      effort: 'high',
      serviceTier: null,
    });
  });
});

describe('parseCodexRuntimeObservation', () => {
  it('reports a source-qualified matching observation', () => {
    expect(
      parseCodexRuntimeObservation({
        entries: rootFixture(),
        observedAt: OBSERVED_AT,
        configured,
      }),
    ).toEqual({
      status: 'reported',
      provider: 'codex',
      childLineage: 'root',
      role: 'oat-phase-implementer',
      model: 'gpt-5.6-sol',
      effort: 'high',
      serviceTier: 'priority',
      source: CODEX_OBSERVATION_SOURCE,
      observedAt: OBSERVED_AT,
      match: 'matching',
    });
  });

  it('reports a mismatching observation without authorizing anything', () => {
    const observation = parseCodexRuntimeObservation({
      entries: depthOneFixture(),
      observedAt: OBSERVED_AT,
      configured,
    });
    expect(observation).toMatchObject({
      status: 'reported',
      match: 'mismatching',
      model: 'gpt-5.6-terra',
      childLineage: 'depth-1',
    });
  });

  it('reports not-comparable when no axis can be compared', () => {
    expect(
      parseCodexRuntimeObservation({
        entries: [sessionMeta({ id: 'sess-root' })],
        observedAt: OBSERVED_AT,
        configured,
      }),
    ).toMatchObject({ status: 'reported', match: 'not-comparable' });
  });

  it('never copies requested values when parsing finds nothing', () => {
    for (const entries of [
      [],
      [conversationEntry()],
      [{ type: 'session_meta' }],
      [{ type: 'session_meta', payload: 'not-an-object' }],
    ]) {
      const observation = parseCodexRuntimeObservation({
        entries,
        observedAt: OBSERVED_AT,
        configured,
      });
      expect(observation).toEqual({ status: 'not-reported' });
      expect(JSON.stringify(observation)).not.toContain('gpt-5.6-sol');
    }
  });

  it('declines correlation when the session names a different request', () => {
    const entries = [
      sessionMeta({ id: 'sess-root', request_id: 'dispatch-other' }),
      turnContext({ model: 'gpt-5.6-sol' }),
    ];
    expect(
      parseCodexRuntimeObservation({
        entries,
        observedAt: OBSERVED_AT,
        requestId: 'dispatch-native-1',
        configured,
      }),
    ).toEqual({ status: 'not-reported' });
    expect(
      parseCodexRuntimeObservation({
        entries: [
          sessionMeta({ id: 'sess-root', request_id: 'dispatch-native-1' }),
          turnContext({ model: 'gpt-5.6-sol' }),
        ],
        observedAt: OBSERVED_AT,
        requestId: 'dispatch-native-1',
        configured,
      }),
    ).toMatchObject({ status: 'reported', match: 'matching' });
  });

  it('refuses a non-datetime observation time and a non-array input', () => {
    expect(
      parseCodexRuntimeObservation({
        entries: rootFixture(),
        observedAt: 'yesterday',
        configured,
      }),
    ).toEqual({ status: 'not-reported' });
    expect(
      parseCodexRuntimeObservation({
        entries: 'rollout.jsonl' as unknown as readonly unknown[],
        observedAt: OBSERVED_AT,
        configured,
      }),
    ).toEqual({ status: 'not-reported' });
  });
});
