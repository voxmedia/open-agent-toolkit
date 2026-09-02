/**
 * Captured Codex rollout metadata, sanitized.
 *
 * These fixtures are derived from three real Codex 0.152.1 rollouts produced by
 * one live nested dispatch on 2026-09-02: a root `exec` session, a depth-1
 * subagent, and a depth-2 subagent. They replaced hand-written fixtures that
 * had been constructed from assumption — those fixtures passed while the parser
 * did not work against any real rollout, which is exactly the failure mode
 * captured evidence prevents.
 *
 * Sanitization is allowlist-based, so a new upstream field cannot silently
 * appear here. Only `session_meta` and `turn_context` payloads are retained,
 * restricted to lineage, identity, and selection keys. Every non-metadata entry
 * keeps its `type` and `ordinal` and carries no payload at all. Dropped
 * outright: `base_instructions`, `git`, `cwd`, `workspace_roots`,
 * `sandbox_policy`, `permission_profile`, and `collaboration_mode` — that is,
 * every instruction, conversation, absolute-path, and repository-identifying
 * field.
 *
 * Structural facts these fixtures preserve, each load-bearing for the parser:
 * - A root declares `thread_source: "user"`, a plain string `source`, and no
 *   `parent_thread_id`.
 * - A subagent declares `thread_source: "subagent"`, a tagged
 *   `source.subagent.thread_spawn` object with an authoritative `depth`, and a
 *   `parent_thread_id` at both the top level and inside `thread_spawn`.
 * - On a subagent, `session_id` is the *root's* id, not its own. Only `id`
 *   identifies the session itself.
 * - The depth-1 rollout embeds its parent's history: its own `session_meta` is
 *   first at ordinal 0, the parent's `session_meta` follows, and the parent's
 *   `turn_context` (`gpt-5.6-sol`) precedes its own (`gpt-5.6-terra`).
 *   `subagent_history_start_ordinal` marks where its own records begin.
 * - No real `turn_context` carries a service tier.
 */

export const ROOT_ROLLOUT: readonly unknown[] = [
  {
    ordinal: 0,
    type: 'session_meta',
    payload: {
      session_id: '01a06402-2861-7421-821a-137187a03f7f',
      id: '01a06402-2861-7421-821a-137187a03f7f',
      thread_source: 'user',
      originator: 'codex_exec',
      cli_version: '0.152.1',
      model_provider: 'openai',
      history_mode: 'paginated',
      source: 'exec',
    },
  },
  {
    ordinal: 1,
    type: 'event_msg',
  },
  {
    ordinal: 2,
    type: 'response_item',
  },
  {
    ordinal: 3,
    type: 'response_item',
  },
  {
    ordinal: 4,
    type: 'response_item',
  },
  {
    ordinal: 5,
    type: 'response_item',
  },
  {
    ordinal: 6,
    type: 'world_state',
  },
  {
    ordinal: 7,
    type: 'turn_context',
    payload: {
      turn_id: '01a06402-2a15-75a2-b365-0d732121aad8',
      model: 'gpt-5.6-sol',
      effort: 'medium',
      summary: 'auto',
      approval_policy: 'never',
      current_date: '2026-09-02',
      timezone: 'America/Chicago',
      personality: 'pragmatic',
      multi_agent_version: 'v2',
      realtime_active: false,
    },
  },
  {
    ordinal: 8,
    type: 'response_item',
  },
  {
    ordinal: 9,
    type: 'event_msg',
  },
  {
    ordinal: 10,
    type: 'event_msg',
  },
  {
    ordinal: 11,
    type: 'response_item',
  },
  {
    ordinal: 12,
    type: 'response_item',
  },
  {
    ordinal: 13,
    type: 'event_msg',
  },
  {
    ordinal: 14,
    type: 'response_item',
  },
  {
    ordinal: 15,
    type: 'event_msg',
  },
  {
    ordinal: 16,
    type: 'world_state',
  },
  {
    ordinal: 17,
    type: 'event_msg',
  },
  {
    ordinal: 18,
    type: 'response_item',
  },
  {
    ordinal: 19,
    type: 'response_item',
  },
  {
    ordinal: 20,
    type: 'event_msg',
  },
  {
    ordinal: 21,
    type: 'event_msg',
  },
  {
    ordinal: 22,
    type: 'response_item',
  },
  {
    ordinal: 23,
    type: 'event_msg',
  },
  {
    ordinal: 24,
    type: 'inter_agent_communication_metadata',
  },
  {
    ordinal: 25,
    type: 'response_item',
  },
  {
    ordinal: 26,
    type: 'event_msg',
  },
  {
    ordinal: 27,
    type: 'response_item',
  },
  {
    ordinal: 28,
    type: 'response_item',
  },
  {
    ordinal: 29,
    type: 'response_item',
  },
  {
    ordinal: 30,
    type: 'event_msg',
  },
  {
    ordinal: 31,
    type: 'event_msg',
  },
  {
    ordinal: 32,
    type: 'response_item',
  },
  {
    ordinal: 33,
    type: 'event_msg',
  },
  {
    ordinal: 34,
    type: 'response_item',
  },
  {
    ordinal: 35,
    type: 'event_msg',
  },
  {
    ordinal: 36,
    type: 'event_msg',
  },
];

export const DEPTH_1_ROLLOUT: readonly unknown[] = [
  {
    ordinal: 0,
    type: 'session_meta',
    payload: {
      session_id: '01a06402-2861-7421-821a-137187a03f7f',
      id: '01a06402-4d66-74f1-a706-f69cde1516f6',
      parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
      forked_from_id: '01a06402-2861-7421-821a-137187a03f7f',
      thread_source: 'subagent',
      originator: 'codex_exec',
      cli_version: '0.152.1',
      agent_role: 'oat-phase-implementer-gpt-5-6-terra-high',
      agent_nickname: 'Mencius',
      agent_path: '/root/depth_1_lineage_test',
      model_provider: 'openai',
      history_mode: 'paginated',
      subagent_history_start_ordinal: 10,
      multi_agent_version: 'v2',
      source: {
        subagent: {
          thread_spawn: {
            parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
            depth: 1,
            agent_path: '/root/depth_1_lineage_test',
            agent_nickname: 'Mencius',
            agent_role: 'oat-phase-implementer-gpt-5-6-terra-high',
          },
        },
      },
    },
  },
  {
    ordinal: 1,
    type: 'session_meta',
    payload: {
      session_id: '01a06402-2861-7421-821a-137187a03f7f',
      id: '01a06402-2861-7421-821a-137187a03f7f',
      thread_source: 'user',
      originator: 'codex_exec',
      cli_version: '0.152.1',
      model_provider: 'openai',
      history_mode: 'paginated',
      source: 'exec',
    },
  },
  {
    ordinal: 2,
    type: 'event_msg',
  },
  {
    ordinal: 3,
    type: 'response_item',
  },
  {
    ordinal: 4,
    type: 'response_item',
  },
  {
    ordinal: 5,
    type: 'world_state',
  },
  {
    ordinal: 6,
    type: 'turn_context',
    payload: {
      turn_id: '01a06402-2a15-75a2-b365-0d732121aad8',
      model: 'gpt-5.6-sol',
      effort: 'medium',
      summary: 'auto',
      approval_policy: 'never',
      current_date: '2026-09-02',
      timezone: 'America/Chicago',
      personality: 'pragmatic',
      multi_agent_version: 'v2',
      realtime_active: false,
    },
  },
  {
    ordinal: 7,
    type: 'response_item',
  },
  {
    ordinal: 8,
    type: 'response_item',
  },
  {
    ordinal: 9,
    type: 'response_item',
  },
  {
    ordinal: 10,
    type: 'event_msg',
  },
  {
    ordinal: 11,
    type: 'event_msg',
  },
  {
    ordinal: 12,
    type: 'response_item',
  },
  {
    ordinal: 13,
    type: 'response_item',
  },
  {
    ordinal: 14,
    type: 'world_state',
  },
  {
    ordinal: 15,
    type: 'turn_context',
    payload: {
      turn_id: '01a06402-4e7a-7ee1-8e69-3dcb7174f9f3',
      model: 'gpt-5.6-terra',
      effort: 'high',
      summary: 'auto',
      approval_policy: 'never',
      current_date: '2026-09-02',
      timezone: 'America/Chicago',
      personality: 'pragmatic',
      multi_agent_version: 'v2',
      realtime_active: false,
    },
  },
  {
    ordinal: 16,
    type: 'inter_agent_communication_metadata',
  },
  {
    ordinal: 17,
    type: 'response_item',
  },
  {
    ordinal: 18,
    type: 'event_msg',
  },
  {
    ordinal: 19,
    type: 'response_item',
  },
  {
    ordinal: 20,
    type: 'response_item',
  },
  {
    ordinal: 21,
    type: 'event_msg',
  },
  {
    ordinal: 22,
    type: 'response_item',
  },
  {
    ordinal: 23,
    type: 'event_msg',
  },
  {
    ordinal: 24,
    type: 'world_state',
  },
  {
    ordinal: 25,
    type: 'event_msg',
  },
  {
    ordinal: 26,
    type: 'event_msg',
  },
  {
    ordinal: 27,
    type: 'response_item',
  },
  {
    ordinal: 28,
    type: 'event_msg',
  },
  {
    ordinal: 29,
    type: 'inter_agent_communication_metadata',
  },
  {
    ordinal: 30,
    type: 'response_item',
  },
  {
    ordinal: 31,
    type: 'event_msg',
  },
  {
    ordinal: 32,
    type: 'response_item',
  },
  {
    ordinal: 33,
    type: 'response_item',
  },
  {
    ordinal: 34,
    type: 'response_item',
  },
  {
    ordinal: 35,
    type: 'event_msg',
  },
  {
    ordinal: 36,
    type: 'event_msg',
  },
  {
    ordinal: 37,
    type: 'response_item',
  },
  {
    ordinal: 38,
    type: 'event_msg',
  },
  {
    ordinal: 39,
    type: 'response_item',
  },
  {
    ordinal: 40,
    type: 'event_msg',
  },
  {
    ordinal: 41,
    type: 'event_msg',
  },
];

export const DEPTH_2_ROLLOUT: readonly unknown[] = [
  {
    ordinal: 0,
    type: 'session_meta',
    payload: {
      session_id: '01a06402-2861-7421-821a-137187a03f7f',
      id: '01a06402-65ec-7f21-97e4-f49ad8600c84',
      parent_thread_id: '01a06402-4d66-74f1-a706-f69cde1516f6',
      thread_source: 'subagent',
      originator: 'codex_exec',
      cli_version: '0.152.1',
      agent_role: 'oat-reviewer-gpt-5-6-luna-high',
      agent_nickname: 'Pascal',
      agent_path: '/root/depth_1_lineage_test/depth_2_lineage_test',
      model_provider: 'openai',
      history_mode: 'paginated',
      multi_agent_version: 'v2',
      source: {
        subagent: {
          thread_spawn: {
            parent_thread_id: '01a06402-4d66-74f1-a706-f69cde1516f6',
            depth: 2,
            agent_path: '/root/depth_1_lineage_test/depth_2_lineage_test',
            agent_nickname: 'Pascal',
            agent_role: 'oat-reviewer-gpt-5-6-luna-high',
          },
        },
      },
    },
  },
  {
    ordinal: 1,
    type: 'event_msg',
  },
  {
    ordinal: 2,
    type: 'response_item',
  },
  {
    ordinal: 3,
    type: 'response_item',
  },
  {
    ordinal: 4,
    type: 'response_item',
  },
  {
    ordinal: 5,
    type: 'response_item',
  },
  {
    ordinal: 6,
    type: 'world_state',
  },
  {
    ordinal: 7,
    type: 'turn_context',
    payload: {
      turn_id: '01a06402-6667-7432-956b-16fe6a47d981',
      model: 'gpt-5.6-luna',
      effort: 'high',
      summary: 'auto',
      approval_policy: 'never',
      current_date: '2026-09-02',
      timezone: 'America/Chicago',
      personality: 'pragmatic',
      multi_agent_version: 'v2',
      realtime_active: false,
    },
  },
  {
    ordinal: 8,
    type: 'inter_agent_communication_metadata',
  },
  {
    ordinal: 9,
    type: 'response_item',
  },
  {
    ordinal: 10,
    type: 'event_msg',
  },
  {
    ordinal: 11,
    type: 'response_item',
  },
  {
    ordinal: 12,
    type: 'event_msg',
  },
  {
    ordinal: 13,
    type: 'response_item',
  },
  {
    ordinal: 14,
    type: 'event_msg',
  },
  {
    ordinal: 15,
    type: 'event_msg',
  },
];
