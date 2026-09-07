import { describe, expect, it } from 'vitest';

import {
  CLAUDE_ASSISTANT_KEYS,
  CLAUDE_INIT_KEYS,
  extractClaudeRuntimeMetadata,
  observeClaudeRuntimeFacts,
} from './claude-runtime-observation';
import {
  MAIN_SESSION_TRANSCRIPT,
  SIDECHAIN_TRANSCRIPT,
} from './claude-runtime-observation.fixtures';

/** A real-shaped assistant entry. `message` is built by the caller. */
function assistantEntry(
  overrides: Record<string, unknown> = {},
  message: Record<string, unknown> | null = {
    model: 'claude-opus-5',
    usage: { service_tier: 'standard' },
  },
) {
  const entry: Record<string, unknown> = {
    type: 'assistant',
    isSidechain: true,
    effort: 'high',
    attributionAgent: 'oat-phase-implementer',
    sessionId: '19c78382-cceb-45ab-bf24-bb8aa284d96b',
    requestId: 'req_011CdSgeEdPwRsUpVTCihKmV',
    uuid: '0f106449-eeb9-475c-8186-d70b9d14a82c',
    parentUuid: '95017f46-0284-49e3-9a7c-597ad4364042',
    ...overrides,
  };
  if (message !== null) entry.message = message;
  return entry;
}

/**
 * An assistant entry whose `message.content` throws the moment it is read.
 * The parser must reach `message.model` and `message.usage.service_tier` by
 * explicit key path, so it must never spread, enumerate, or filter `message`.
 */
function contentTrapEntry(overrides: Record<string, unknown> = {}) {
  const message: Record<string, unknown> = {
    model: 'claude-opus-5',
    usage: { service_tier: 'standard' },
    id: 'msg_01',
    role: 'assistant',
  };
  Object.defineProperty(message, 'content', {
    enumerable: true,
    get() {
      throw new Error('Conversation content was read from message.content.');
    },
  });
  return assistantEntry(overrides, message);
}

/** A conversation entry whose whole body throws if touched. */
function conversationEntry(type: string) {
  const entry = { type };
  for (const key of ['message', 'content', 'toolUseResult']) {
    Object.defineProperty(entry, key, {
      enumerable: true,
      get() {
        throw new Error(`Conversation content was read from a ${type} entry.`);
      },
    });
  }
  return entry;
}

describe('extractClaudeRuntimeMetadata against captured transcripts', () => {
  it('reads a real main-session transcript as root', () => {
    // A main session carries no attributionAgent, so role stays unreported
    // rather than being filled in from anywhere.
    expect(extractClaudeRuntimeMetadata(MAIN_SESSION_TRANSCRIPT)).toEqual({
      childLineage: 'root',
      role: null,
      model: 'claude-fable-5',
      effort: 'high',
      serviceTier: 'standard',
      requestId: null,
      sessionId: '7f9d5ab4-3b08-4a21-adb5-405c04af2d89',
    });
  });

  it('reads a real sidechain transcript as a child of undetermined depth', () => {
    // `isSidechain` proves this is a subagent turn. No depth, nesting, or
    // ancestry field exists on any of 141,078 captured assistant entries, so
    // depth is reported unknown rather than invented.
    expect(extractClaudeRuntimeMetadata(SIDECHAIN_TRANSCRIPT)).toMatchObject({
      childLineage: 'depth-unknown',
      role: 'general-purpose',
      model: 'claude-opus-5',
      effort: 'high',
      serviceTier: 'standard',
    });
  });

  it('reports the real effort axis instead of claiming it is unexposed', () => {
    expect(extractClaudeRuntimeMetadata([assistantEntry()])?.effort).toBe(
      'high',
    );
    expect(
      extractClaudeRuntimeMetadata([assistantEntry({ effort: 'xhigh' })])
        ?.effort,
    ).toBe('xhigh');
    // Absent means unknown, not "the provider has no such axis".
    expect(
      extractClaudeRuntimeMetadata([assistantEntry({ effort: undefined })])
        ?.effort,
    ).toBeNull();
    expect(
      JSON.stringify(extractClaudeRuntimeMetadata([assistantEntry()])),
    ).not.toContain('not-exposed');
  });

  it('reports the role from attribution metadata, or nothing when absent', () => {
    expect(extractClaudeRuntimeMetadata([assistantEntry()])?.role).toBe(
      'oat-phase-implementer',
    );
    // Every value observed across the corpus, including the capitalized one.
    for (const role of [
      'workflow-subagent',
      'general-purpose',
      'oat-phase-implementer',
      'oat-reviewer',
      'Explore',
      'claude',
      'claude-code-guide',
      'fork',
    ]) {
      expect(
        extractClaudeRuntimeMetadata([
          assistantEntry({ attributionAgent: role }),
        ])?.role,
        role,
      ).toBe(role);
    }
    // Absent means unreported, never filled in — the same rule as `effort`.
    expect(
      extractClaudeRuntimeMetadata([
        assistantEntry({ attributionAgent: undefined }),
      ])?.role,
    ).toBeNull();
    // A role name is not a depth signal and must not become one.
    expect(
      extractClaudeRuntimeMetadata([
        assistantEntry({ attributionAgent: 'oat-reviewer' }),
      ])?.childLineage,
    ).toBe('depth-unknown');
  });

  it('drops a role that is not a provider identifier', () => {
    for (const role of ['a role with spaces', '/Users/x', 'a'.repeat(300)]) {
      expect(
        extractClaudeRuntimeMetadata([
          assistantEntry({ attributionAgent: role }),
        ])?.role,
        role,
      ).toBeNull();
    }
  });

  it('never reads message.content while reaching model and service tier', () => {
    expect(extractClaudeRuntimeMetadata([contentTrapEntry()])).toMatchObject({
      model: 'claude-opus-5',
      serviceTier: 'standard',
      effort: 'high',
      // The new entry-level key does not change the guarantee: reaching it
      // still never touches `message.content`.
      role: 'oat-phase-implementer',
    });
  });

  it('never opens a conversation entry of another type', () => {
    expect(
      extractClaudeRuntimeMetadata([
        conversationEntry('user'),
        conversationEntry('attachment'),
        contentTrapEntry(),
        conversationEntry('file-history-snapshot'),
      ])?.model,
    ).toBe('claude-opus-5');
  });

  it('uses the most recent turn and fills gaps from earlier ones', () => {
    expect(
      extractClaudeRuntimeMetadata([
        assistantEntry({ effort: 'medium' }),
        assistantEntry({ effort: 'xhigh' }, { model: 'claude-sonnet-5' }),
      ]),
    ).toMatchObject({
      effort: 'xhigh',
      model: 'claude-sonnet-5',
      // Carried from the earlier turn, which is the only one that reported it.
      serviceTier: 'standard',
    });
  });

  it('declines a transcript that mixes sessions', () => {
    // Every captured transcript carries exactly one sessionId, so more than one
    // means the envelope was assembled from several sessions and no single
    // applicable child exists.
    expect(
      extractClaudeRuntimeMetadata([
        assistantEntry(),
        assistantEntry({ sessionId: '00000000-0000-4000-8000-000000000000' }),
      ]),
    ).toBeNull();
  });

  it('drops values that are not provider identifiers', () => {
    expect(
      extractClaudeRuntimeMetadata([
        assistantEntry({}, { model: '<synthetic>' }),
      ])?.model,
    ).toBeNull();
    expect(
      extractClaudeRuntimeMetadata([
        assistantEntry({}, { model: 'a'.repeat(300) }),
      ])?.model,
    ).toBeNull();
  });

  it('returns null when no assistant metadata is present', () => {
    expect(extractClaudeRuntimeMetadata([])).toBeNull();
    expect(
      extractClaudeRuntimeMetadata([
        conversationEntry('user'),
        conversationEntry('queue-operation'),
      ]),
    ).toBeNull();
  });
});

describe('declared read surface', () => {
  it('is sufficient on its own and is the whole surface', () => {
    // An entry carrying only the declared keys plus the two message paths must
    // extract completely. If the parser ever needs more, this fails first.
    const minimal: Record<string, unknown> = {
      type: 'assistant',
      isSidechain: true,
      effort: 'high',
      attributionAgent: 'oat-reviewer',
      sessionId: '19c78382-cceb-45ab-bf24-bb8aa284d96b',
      requestId: 'req_1',
      message: { model: 'claude-opus-5', usage: { service_tier: 'standard' } },
    };
    expect(
      Object.keys(minimal)
        .filter((key) => key !== 'message')
        .sort(),
    ).toEqual(
      [...CLAUDE_ASSISTANT_KEYS].filter((k) => k !== 'session_id').sort(),
    );
    expect(extractClaudeRuntimeMetadata([minimal])).toMatchObject({
      childLineage: 'depth-unknown',
      role: 'oat-reviewer',
      model: 'claude-opus-5',
      effort: 'high',
      serviceTier: 'standard',
    });
    // The stream-json surface is retained but unverified; it must stay small.
    expect(CLAUDE_INIT_KEYS.length).toBeLessThanOrEqual(10);
  });
});

describe('observeClaudeRuntimeFacts', () => {
  it('emits only neutral facts, never the transcript shape', () => {
    const facts = observeClaudeRuntimeFacts([contentTrapEntry()]);
    expect(Object.keys(facts ?? {}).sort()).toEqual([
      'correlation',
      'effort',
      'lineage',
      'model',
      'role',
      'serviceTier',
    ]);
    // The provider's own key names never escape this module.
    const serialized = JSON.stringify(facts);
    for (const providerKey of ['sessionId', 'session_id', 'message', 'uuid']) {
      expect(serialized, providerKey).not.toContain(providerKey);
    }
  });

  it('reads model and tier without touching message.content', () => {
    expect(observeClaudeRuntimeFacts([contentTrapEntry()])).toMatchObject({
      model: 'claude-opus-5',
      serviceTier: 'standard',
      role: 'oat-phase-implementer',
    });
  });

  it('returns nothing for a conversation-only transcript', () => {
    expect(observeClaudeRuntimeFacts([conversationEntry('user')])).toBeNull();
  });
});
