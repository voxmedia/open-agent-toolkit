import { describe, expect, it } from 'vitest';

import {
  CLAUDE_OBSERVATION_SOURCE,
  extractClaudeRuntimeMetadata,
  parseClaudeRuntimeObservation,
} from './claude-runtime-observation';

const OBSERVED_AT = '2026-09-02T12:00:00.000Z';

const configured = {
  role: 'oat-phase-implementer',
  model: 'claude-opus-5',
  effort: 'high',
  serviceTier: 'standard',
};

function initEntry(fields: Record<string, unknown> = {}) {
  return {
    type: 'system',
    subtype: 'init',
    session_id: 'sess-claude-1',
    model: 'claude-opus-5',
    service_tier: 'standard',
    agent: 'oat-phase-implementer',
    ...fields,
  };
}

/**
 * A conversation entry whose `message` throws the moment it is read. The parser
 * must classify by `type` alone, so touching it is a test failure.
 */
function conversationEntry(type: string) {
  const entry = { type };
  Object.defineProperty(entry, 'message', {
    enumerable: true,
    get() {
      throw new Error(`Conversation content was read from a ${type} entry.`);
    },
  });
  return entry;
}

describe('extractClaudeRuntimeMetadata', () => {
  it('reads init metadata without touching conversation content', () => {
    expect(
      extractClaudeRuntimeMetadata([
        conversationEntry('user'),
        initEntry(),
        conversationEntry('assistant'),
      ]),
    ).toEqual({
      role: 'oat-phase-implementer',
      model: 'claude-opus-5',
      effort: 'not-exposed',
      serviceTier: 'standard',
      requestId: null,
    });
  });

  it('retains not-exposed for the unselectable native effort axis', () => {
    expect(extractClaudeRuntimeMetadata([initEntry()])?.effort).toBe(
      'not-exposed',
    );
    expect(
      extractClaudeRuntimeMetadata([initEntry({ reasoning_effort: 'high' })])
        ?.effort,
    ).toBe('high');
  });

  it('falls back to result model usage when init omits a field', () => {
    expect(
      extractClaudeRuntimeMetadata([
        initEntry({ model: undefined, service_tier: undefined }),
        {
          type: 'result',
          subtype: 'success',
          modelUsage: { 'claude-opus-5': { serviceTier: 'standard' } },
        },
      ]),
    ).toMatchObject({ model: 'claude-opus-5', serviceTier: 'standard' });
  });

  it('returns null when no Claude metadata entry is present', () => {
    expect(extractClaudeRuntimeMetadata([])).toBeNull();
    expect(
      extractClaudeRuntimeMetadata([
        conversationEntry('assistant'),
        { type: 'system', subtype: 'compact_boundary' },
      ]),
    ).toBeNull();
  });

  it('drops values that fail the bounded identifier shape', () => {
    expect(
      extractClaudeRuntimeMetadata([
        initEntry({ model: 'x'.repeat(300), agent: 'role with spaces' }),
      ]),
    ).toMatchObject({ model: null, role: null, serviceTier: 'standard' });
  });
});

describe('parseClaudeRuntimeObservation', () => {
  it('reports a source-qualified matching observation', () => {
    expect(
      parseClaudeRuntimeObservation({
        entries: [initEntry()],
        observedAt: OBSERVED_AT,
        configured,
      }),
    ).toEqual({
      status: 'reported',
      provider: 'claude',
      role: 'oat-phase-implementer',
      model: 'claude-opus-5',
      effort: 'not-exposed',
      serviceTier: 'standard',
      source: CLAUDE_OBSERVATION_SOURCE,
      observedAt: OBSERVED_AT,
      match: 'matching',
      comparedAxes: ['role', 'model', 'serviceTier'],
    });
  });

  it('never turns an unexposed effort axis into a mismatch', () => {
    expect(
      parseClaudeRuntimeObservation({
        entries: [initEntry()],
        observedAt: OBSERVED_AT,
        configured: { ...configured, effort: 'low' },
      }),
    ).toMatchObject({ match: 'matching', effort: 'not-exposed' });
  });

  it('reports a mismatching model without authorizing anything', () => {
    expect(
      parseClaudeRuntimeObservation({
        entries: [initEntry({ model: 'claude-haiku-5' })],
        observedAt: OBSERVED_AT,
        configured,
      }),
    ).toMatchObject({ match: 'mismatching', model: 'claude-haiku-5' });
  });

  it('never copies requested values when parsing finds nothing', () => {
    const observation = parseClaudeRuntimeObservation({
      entries: [conversationEntry('assistant')],
      observedAt: OBSERVED_AT,
      configured,
    });
    expect(observation).toEqual({ status: 'not-reported' });
    expect(JSON.stringify(observation)).not.toContain('claude-opus-5');
  });

  it('declines correlation when the session names a different request', () => {
    expect(
      parseClaudeRuntimeObservation({
        entries: [initEntry({ request_id: 'dispatch-other' })],
        observedAt: OBSERVED_AT,
        requestId: 'dispatch-native-1',
        configured,
      }),
    ).toEqual({ status: 'not-reported' });
  });
});
