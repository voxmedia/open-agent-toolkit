import { describe, expect, it } from 'vitest';

import {
  CODEX_OBSERVATION_SOURCE,
  extractCodexRuntimeMetadata,
  parseCodexRuntimeObservation,
} from './codex-runtime-observation';
import {
  DEPTH_1_ROLLOUT,
  DEPTH_2_ROLLOUT,
  ROOT_ROLLOUT,
} from './codex-runtime-observation.fixtures';

const OBSERVED_AT = '2026-09-02T12:00:00.000Z';

const ROOT_ID = '01a06402-2861-7421-821a-137187a03f7f';
const DEPTH_1_ID = '01a06402-4d66-74f1-a706-f69cde1516f6';
const DEPTH_2_ID = '01a06402-65ec-7f21-97e4-f49ad8600c84';

/** A subagent `session_meta` in the shape Codex 0.152.1 actually emits. */
function subagentMeta(
  overrides: {
    id?: string;
    parentThreadId?: string | null;
    depth?: unknown;
    agentPath?: string | null;
    agentRole?: string | null;
    requestId?: string;
  } = {},
) {
  const {
    id = DEPTH_2_ID,
    parentThreadId = DEPTH_1_ID,
    agentPath = '/root/depth_1_lineage_test/depth_2_lineage_test',
    agentRole = 'oat-reviewer-gpt-5-6-luna-high',
    requestId,
  } = overrides;
  // `in` rather than a destructuring default, so an explicit `undefined`
  // omits `depth` instead of silently restoring the default.
  const depth = 'depth' in overrides ? overrides.depth : 2;
  const threadSpawn: Record<string, unknown> = {};
  if (parentThreadId !== null) threadSpawn.parent_thread_id = parentThreadId;
  if (depth !== undefined) threadSpawn.depth = depth;
  if (agentPath !== null) threadSpawn.agent_path = agentPath;
  if (agentRole !== null) threadSpawn.agent_role = agentRole;
  const payload: Record<string, unknown> = {
    session_id: ROOT_ID,
    id,
    thread_source: 'subagent',
    source: { subagent: { thread_spawn: threadSpawn } },
  };
  if (parentThreadId !== null) payload.parent_thread_id = parentThreadId;
  if (agentRole !== null) payload.agent_role = agentRole;
  if (agentPath !== null) payload.agent_path = agentPath;
  if (requestId !== undefined) payload.request_id = requestId;
  return { ordinal: 0, type: 'session_meta', payload };
}

function rootMeta(id = ROOT_ID) {
  return {
    ordinal: 1,
    type: 'session_meta',
    payload: {
      session_id: id,
      id,
      thread_source: 'user',
      source: 'exec',
      originator: 'codex_exec',
    },
  };
}

function turnContext(
  payload: Record<string, unknown>,
  ordinal = 7,
): Record<string, unknown> {
  return { ordinal, type: 'turn_context', payload };
}

/** An entry whose payload throws the moment anything reads it. */
function conversationEntry(type = 'response_item') {
  const entry = { ordinal: 3, type };
  Object.defineProperty(entry, 'payload', {
    enumerable: true,
    get() {
      throw new Error(`Conversation content was read from a ${type} entry.`);
    },
  });
  return entry;
}

describe('extractCodexRuntimeMetadata against captured rollouts', () => {
  it('reads a real root session', () => {
    expect(extractCodexRuntimeMetadata(ROOT_ROLLOUT)).toEqual({
      childLineage: 'root',
      role: null,
      model: 'gpt-5.6-sol',
      effort: 'medium',
      // No captured Codex turn_context carries a service tier.
      serviceTier: null,
      requestId: null,
      threadSource: 'user',
      forkedFromId: null,
    });
  });

  it('reads real depth-1 and depth-2 subagent lineage and role', () => {
    expect(extractCodexRuntimeMetadata(DEPTH_1_ROLLOUT)).toEqual({
      childLineage: 'depth-1',
      role: 'oat-phase-implementer-gpt-5-6-terra-high',
      model: 'gpt-5.6-terra',
      effort: 'high',
      serviceTier: null,
      requestId: null,
      threadSource: 'subagent',
      forkedFromId: ROOT_ID,
    });
    expect(extractCodexRuntimeMetadata(DEPTH_2_ROLLOUT)).toEqual({
      childLineage: 'depth-2',
      role: 'oat-reviewer-gpt-5-6-luna-high',
      model: 'gpt-5.6-luna',
      effort: 'high',
      serviceTier: null,
      requestId: null,
      threadSource: 'subagent',
      forkedFromId: null,
    });
  });

  it('uses the applicable session, not the embedded parent history', () => {
    // The depth-1 rollout carries its own session_meta first and its parent's
    // second, and the parent's turn_context precedes its own.
    const metadata = extractCodexRuntimeMetadata(DEPTH_1_ROLLOUT);
    expect(metadata?.model).not.toBe('gpt-5.6-sol');
    expect(metadata?.role).not.toBeNull();
    expect(metadata?.childLineage).toBe('depth-1');
  });

  it('never treats a subagent session_id as its own identity', () => {
    // On a subagent, session_id is the root's id. Reading it as identity would
    // classify every subagent as a root.
    const metadata = extractCodexRuntimeMetadata(DEPTH_2_ROLLOUT);
    expect(metadata?.childLineage).not.toBe('root');
    expect(metadata?.threadSource).toBe('subagent');
  });

  it('never reads a conversation payload', () => {
    expect(
      extractCodexRuntimeMetadata([
        conversationEntry('response_item'),
        subagentMeta(),
        conversationEntry('event_msg'),
        turnContext({ model: 'gpt-5.6-luna', effort: 'high' }),
        conversationEntry('world_state'),
      ])?.model,
    ).toBe('gpt-5.6-luna');
  });
});

describe('codex lineage resolution', () => {
  it('prefers the provider-declared depth over the chain walk', () => {
    // The parent is absent from this file, so a chain walk could not resolve a
    // depth; the declared depth still does.
    expect(
      extractCodexRuntimeMetadata([subagentMeta({ depth: 2 })])?.childLineage,
    ).toBe('depth-2');
  });

  it('refuses a declared depth that disagrees with agent_path', () => {
    expect(
      extractCodexRuntimeMetadata([
        subagentMeta({ depth: 5, agentPath: '/root/only_one_level' }),
      ])?.childLineage,
    ).toBe('depth-unknown');
  });

  it('refuses a malformed declared depth', () => {
    for (const depth of [-1, 1.5, '2', null, Number.NaN]) {
      expect(
        extractCodexRuntimeMetadata([subagentMeta({ depth, agentPath: null })])
          ?.childLineage,
      ).toBe('depth-unknown');
    }
  });

  it('walks the parent chain when no depth is declared', () => {
    expect(
      extractCodexRuntimeMetadata([
        subagentMeta({
          id: DEPTH_1_ID,
          parentThreadId: ROOT_ID,
          depth: undefined,
          agentPath: null,
        }),
        rootMeta(),
      ])?.childLineage,
    ).toBe('depth-1');
  });

  it('reports depth-unknown when a named parent is absent', () => {
    expect(
      extractCodexRuntimeMetadata([
        subagentMeta({
          parentThreadId: '01a06402-0000-0000-0000-000000000000',
          depth: undefined,
          agentPath: null,
        }),
      ])?.childLineage,
    ).toBe('depth-unknown');
  });

  it('never classifies a subagent as root', () => {
    // thread_source alone is enough; a subagent without a declared depth or a
    // resolvable parent is unknown, never root.
    expect(
      extractCodexRuntimeMetadata([
        subagentMeta({
          parentThreadId: null,
          depth: undefined,
          agentPath: null,
        }),
      ])?.childLineage,
    ).toBe('depth-unknown');
  });

  it('returns null when no session metadata is present', () => {
    expect(extractCodexRuntimeMetadata([])).toBeNull();
    expect(
      extractCodexRuntimeMetadata([conversationEntry(), conversationEntry()]),
    ).toBeNull();
  });

  it('drops values that fail the bounded identifier shape', () => {
    const metadata = extractCodexRuntimeMetadata([
      subagentMeta({ agentRole: 'role with spaces' }),
      turnContext({ model: 'a'.repeat(300), effort: 'high' }),
    ]);
    expect(metadata).toMatchObject({ role: null, model: null, effort: 'high' });
  });

  it('drops paths and URLs in every spelling', () => {
    // NFR1 holds for all of these, not only the POSIX absolute spelling.
    for (const model of [
      '/Users/someone/secret',
      'C:/Users/someone/secret',
      'c:/windows/system32',
      'https://evil.example/x',
      'file:///Users/someone/secret',
      'Users/someone/secret/deeply/nested/path/segment/chain/that/keeps/going',
    ]) {
      expect(
        extractCodexRuntimeMetadata([
          subagentMeta(),
          turnContext({ model, effort: 'high' }),
        ])?.model,
        model,
      ).toBeNull();
    }
  });
});

describe('parseCodexRuntimeObservation against captured rollouts', () => {
  const configuredDepth1 = {
    role: 'oat-phase-implementer-gpt-5-6-terra-high',
    model: 'gpt-5.6-terra',
    effort: 'high',
    serviceTier: null,
  };

  it('reports a matching depth-1 observation', () => {
    expect(
      parseCodexRuntimeObservation({
        entries: DEPTH_1_ROLLOUT,
        observedAt: OBSERVED_AT,
        configured: configuredDepth1,
      }),
    ).toEqual({
      status: 'reported',
      provider: 'codex',
      childLineage: 'depth-1',
      role: 'oat-phase-implementer-gpt-5-6-terra-high',
      model: 'gpt-5.6-terra',
      effort: 'high',
      source: CODEX_OBSERVATION_SOURCE,
      observedAt: OBSERVED_AT,
      match: 'matching',
      comparedAxes: ['role', 'model', 'effort'],
    });
  });

  it('reports a mismatch when the real child is not the configured one', () => {
    expect(
      parseCodexRuntimeObservation({
        entries: DEPTH_2_ROLLOUT,
        observedAt: OBSERVED_AT,
        configured: configuredDepth1,
      }),
    ).toMatchObject({ match: 'mismatching', model: 'gpt-5.6-luna' });
  });

  it('never copies requested values when parsing finds nothing', () => {
    const observation = parseCodexRuntimeObservation({
      entries: [conversationEntry()],
      observedAt: OBSERVED_AT,
      configured: configuredDepth1,
    });
    expect(observation).toEqual({ status: 'not-reported' });
    expect(JSON.stringify(observation)).not.toContain('gpt-5.6-terra');
  });

  it('declines correlation when the session names a different request', () => {
    expect(
      parseCodexRuntimeObservation({
        entries: [subagentMeta({ requestId: 'dispatch-other' })],
        observedAt: OBSERVED_AT,
        requestId: 'dispatch-native-1',
        configured: configuredDepth1,
      }),
    ).toEqual({ status: 'not-reported' });
  });

  it('refuses a non-datetime observation time and a non-array input', () => {
    expect(
      parseCodexRuntimeObservation({
        entries: ROOT_ROLLOUT,
        observedAt: 'yesterday',
      }),
    ).toEqual({ status: 'not-reported' });
    expect(
      parseCodexRuntimeObservation({
        entries: 'rollout.jsonl' as unknown as readonly unknown[],
        observedAt: OBSERVED_AT,
      }),
    ).toEqual({ status: 'not-reported' });
  });
});
