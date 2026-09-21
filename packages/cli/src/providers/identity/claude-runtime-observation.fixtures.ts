/**
 * Captured Claude transcript metadata, sanitized.
 *
 * Derived from real on-disk transcripts under `~/.claude/projects/`, which is
 * the format Claude actually writes. Corpus counts below are
 * operator-environment observations (as of 2026-09-02, on the capturing operator's machine). They replaced hand-written fixtures built
 * around `system`/`init` and `result` records: a scan of all 2,725 local
 * transcripts found `"subtype":"init"` in zero of them, so the previous parser
 * returned `not-reported` against every real transcript while its own fixtures
 * agreed with it.
 *
 * Sanitization is allowlist-based. Retained: the entry-level metadata keys the
 * parser reads plus a few it does not (`version`, `userType`, `uuid`), so the
 * fixtures still demonstrate that unread keys are dropped. `message` is reduced
 * to the two explicit key paths the parser reaches — `message.model` and
 * `message.usage.service_tier`. Dropped outright: `message.content` (the
 * conversation), `cwd`, `gitBranch`, `slug`, `agentId`, and the remaining
 * `attribution*` fields.
 *
 * Structural facts these fixtures preserve, each load-bearing:
 * - `effort` is a real top-level field on an assistant entry. Claude does
 *   expose a selectable effort axis, so reporting `not-exposed` for it was
 *   wrong; observed values across 124,804 entries are `high`, `xhigh`,
 *   `medium`, and `max`.
 * - `attributionAgent` is the role identifier, and it is exactly the signal
 *   Codex carries as `agent_role`. It appears on subagent turns only: present
 *   on 114,600 of 114,657 sidechain entries and on none of the 26,497
 *   main-session entries. `SIDECHAIN_TRANSCRIPT` therefore carries it and
 *   `MAIN_SESSION_TRANSCRIPT` does not, which is the real distinction rather
 *   than a constructed one.
 * - `isSidechain` distinguishes a main session from a subagent turn. It is the
 *   only lineage signal present, and it is binary. Role names are not a depth
 *   signal and are never read as one.
 * - `sessionId` is constant within a transcript; every one of the 2,655 local
 *   transcripts that carries one carries exactly one.
 * - Model and service tier live only under `message`, never at the top level.
 */

export const MAIN_SESSION_TRANSCRIPT: readonly unknown[] = [
  {
    type: 'assistant',
    isSidechain: false,
    effort: 'high',
    sessionId: '88888888-8888-4888-8888-888888888888',
    requestId: 'req_corpus_main_01',
    uuid: '14c99a81-02ff-4153-8104-3e4d238451f9',
    parentUuid: '66d090ee-2e16-4b8d-bc67-bcb1027220cb',
    version: '2.1.234',
    userType: 'external',
    message: {
      model: 'claude-fable-5',
      usage: {
        service_tier: 'standard',
      },
    },
  },
  {
    type: 'assistant',
    isSidechain: false,
    effort: 'high',
    sessionId: '88888888-8888-4888-8888-888888888888',
    requestId: 'req_corpus_main_01',
    uuid: '50ef9865-24e6-4a77-9831-a01258db757f',
    parentUuid: '14c99a81-02ff-4153-8104-3e4d238451f9',
    version: '2.1.234',
    userType: 'external',
    message: {
      model: 'claude-fable-5',
      usage: {
        service_tier: 'standard',
      },
    },
  },
  {
    type: 'assistant',
    isSidechain: false,
    effort: 'high',
    sessionId: '88888888-8888-4888-8888-888888888888',
    requestId: 'req_corpus_main_01',
    uuid: '15864101-70c5-48fb-939f-679a458ba679',
    parentUuid: '50ef9865-24e6-4a77-9831-a01258db757f',
    version: '2.1.234',
    userType: 'external',
    message: {
      model: 'claude-fable-5',
      usage: {
        service_tier: 'standard',
      },
    },
  },
];

export const SIDECHAIN_TRANSCRIPT: readonly unknown[] = [
  {
    type: 'assistant',
    isSidechain: true,
    effort: 'high',
    attributionAgent: 'general-purpose',
    sessionId: '99999999-9999-4999-8999-999999999999',
    requestId: 'req_corpus_side_01',
    uuid: '0f106449-eeb9-475c-8186-d70b9d14a82c',
    parentUuid: '95017f46-0284-49e3-9a7c-597ad4364042',
    version: '2.1.220',
    userType: 'external',
    message: {
      model: 'claude-opus-5',
      usage: {
        service_tier: 'standard',
      },
    },
  },
  {
    type: 'assistant',
    isSidechain: true,
    effort: 'high',
    attributionAgent: 'general-purpose',
    sessionId: '99999999-9999-4999-8999-999999999999',
    requestId: 'req_corpus_side_01',
    uuid: '24c36d1b-c532-447f-9981-8f2b0d0988f8',
    parentUuid: '0f106449-eeb9-475c-8186-d70b9d14a82c',
    version: '2.1.220',
    userType: 'external',
    message: {
      model: 'claude-opus-5',
      usage: {
        service_tier: 'standard',
      },
    },
  },
  {
    type: 'assistant',
    isSidechain: true,
    effort: 'high',
    attributionAgent: 'general-purpose',
    sessionId: '99999999-9999-4999-8999-999999999999',
    requestId: 'req_corpus_side_01',
    uuid: 'd3453335-a00b-4716-95bf-6a7574903336',
    parentUuid: 'c0d14665-a467-46e5-abcd-85c3e15ba30e',
    version: '2.1.220',
    userType: 'external',
    message: {
      model: 'claude-opus-5',
      usage: {
        service_tier: 'standard',
      },
    },
  },
];

/**
 * Live effort-selection controls captured on 2026-09-20 with Claude Code
 * 2.1.278 from provider-written child transcripts in one isolated temporary
 * `CLAUDE_CONFIG_DIR`. The cases cover explicit effort, task-based selection,
 * failed accepted attempts, same-parent continuation, capped review, inherit,
 * environment override, and settings cap.
 *
 * Sanitization uses the same allowlist as the corpus fixtures above. It drops
 * prompts, responses, cwd, Git state, agentId, timestamps, attachments, and
 * UUID linkage. Request IDs are deterministic synthetic identifiers. Session
 * IDs are deterministic pseudonyms: the live session IDs were supplied to
 * the isolated CLI before capture, and every request ID was replaced after
 * capture while preserving the provider field shape. They preserve the real
 * same-parent relationship without exposing provider identifiers.
 * `sourceAssistantEntries` and
 * `acceptedOutcome` are sanitized provenance facts from the source child and
 * parent transcripts; neither is passed to the runtime parser.
 */

export interface LiveClaudeEffortCase {
  id: string;
  sourceAssistantEntries: number;
  acceptedOutcome: 'success' | 'failed';
  continuation: 'one-shot' | 'initial' | 'resume-read-edit' | 'resume-edit';
  configured: {
    role: readonly string[];
    model: readonly string[] | null;
    effort: string | null;
    serviceTier: string | null;
  };
  expectedMatch: 'matching' | 'mismatching';
  entries: readonly unknown[];
}

function liveEntry(input: {
  role: string;
  model: string;
  effort: string;
  sessionId: string;
  requestId: string;
}): readonly unknown[] {
  return [
    {
      type: 'assistant',
      isSidechain: true,
      effort: input.effort,
      attributionAgent: input.role,
      sessionId: input.sessionId,
      requestId: input.requestId,
      version: '2.1.278',
      userType: 'external',
      message: {
        model: input.model,
        usage: { service_tier: 'standard' },
      },
    },
  ];
}

const implementerMedium = {
  role: ['oat-phase-implementer', 'oat-phase-implementer-claude-sonnet-medium'],
  model: ['sonnet', 'claude-sonnet-5'],
  effort: 'medium',
  serviceTier: null,
} as const;

const implementerHigh = {
  role: ['oat-phase-implementer', 'oat-phase-implementer-claude-sonnet-high'],
  model: ['sonnet', 'claude-sonnet-5'],
  effort: 'high',
  serviceTier: null,
} as const;

const reviewerHigh = {
  role: ['oat-reviewer', 'oat-reviewer-claude-sonnet-high'],
  model: ['sonnet', 'claude-sonnet-5'],
  effort: 'high',
  serviceTier: null,
} as const;

export const LIVE_CLAUDE_EFFORT_CASES: readonly LiveClaudeEffortCase[] = [
  {
    id: 'explicit-implementer-medium',
    sourceAssistantEntries: 1,
    acceptedOutcome: 'success',
    continuation: 'one-shot',
    configured: implementerMedium,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-phase-implementer-claude-sonnet-medium',
      model: 'claude-sonnet-5',
      effort: 'medium',
      sessionId: '11111111-1111-4111-8111-111111111111',
      requestId: 'req_p03_live_01',
    }),
  },
  {
    id: 'explicit-reviewer-high',
    sourceAssistantEntries: 1,
    acceptedOutcome: 'success',
    continuation: 'one-shot',
    configured: reviewerHigh,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-reviewer-claude-sonnet-high',
      model: 'claude-sonnet-5',
      effort: 'high',
      sessionId: '22222222-2222-4222-8222-222222222222',
      requestId: 'req_p03_live_02',
    }),
  },
  {
    id: 'awareness-medium-no-file-tools',
    sourceAssistantEntries: 2,
    acceptedOutcome: 'failed',
    continuation: 'initial',
    configured: implementerMedium,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-phase-implementer-claude-sonnet-medium',
      model: 'claude-sonnet-5',
      effort: 'medium',
      sessionId: '33333333-3333-4333-8333-333333333333',
      requestId: 'req_p03_live_03',
    }),
  },
  {
    id: 'awareness-high-no-file-tools',
    sourceAssistantEntries: 3,
    acceptedOutcome: 'failed',
    continuation: 'initial',
    configured: implementerHigh,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-phase-implementer-claude-sonnet-high',
      model: 'claude-sonnet-5',
      effort: 'high',
      sessionId: '33333333-3333-4333-8333-333333333333',
      requestId: 'req_p03_live_04',
    }),
  },
  {
    id: 'awareness-medium-edit-denied',
    sourceAssistantEntries: 3,
    acceptedOutcome: 'failed',
    continuation: 'resume-read-edit',
    configured: implementerMedium,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-phase-implementer-claude-sonnet-medium',
      model: 'claude-sonnet-5',
      effort: 'medium',
      sessionId: '33333333-3333-4333-8333-333333333333',
      requestId: 'req_p03_live_05',
    }),
  },
  {
    id: 'awareness-high-resumed-success',
    sourceAssistantEntries: 2,
    acceptedOutcome: 'success',
    continuation: 'resume-read-edit',
    configured: implementerHigh,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-phase-implementer-claude-sonnet-high',
      model: 'claude-sonnet-5',
      effort: 'high',
      sessionId: '33333333-3333-4333-8333-333333333333',
      requestId: 'req_p03_live_06',
    }),
  },
  {
    id: 'awareness-medium-resumed-success',
    sourceAssistantEntries: 3,
    acceptedOutcome: 'success',
    continuation: 'resume-edit',
    configured: implementerMedium,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-phase-implementer-claude-sonnet-medium',
      model: 'claude-sonnet-5',
      effort: 'medium',
      sessionId: '33333333-3333-4333-8333-333333333333',
      requestId: 'req_p03_live_07',
    }),
  },
  {
    id: 'capped-reviewer-high',
    sourceAssistantEntries: 1,
    acceptedOutcome: 'success',
    continuation: 'one-shot',
    configured: reviewerHigh,
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-reviewer-claude-sonnet-high',
      model: 'claude-sonnet-5',
      effort: 'high',
      sessionId: '44444444-4444-4444-8444-444444444444',
      requestId: 'req_p03_live_08',
    }),
  },
  {
    id: 'default-inherit-high',
    sourceAssistantEntries: 1,
    acceptedOutcome: 'success',
    continuation: 'one-shot',
    configured: {
      role: [
        'oat-phase-implementer',
        'oat-phase-implementer-claude-sonnet-inherit',
      ],
      model: ['sonnet', 'claude-sonnet-5'],
      effort: null,
      serviceTier: null,
    },
    expectedMatch: 'matching',
    entries: liveEntry({
      role: 'oat-phase-implementer-claude-sonnet-inherit',
      model: 'claude-sonnet-5',
      effort: 'high',
      sessionId: '55555555-5555-4555-8555-555555555555',
      requestId: 'req_p03_live_09',
    }),
  },
  {
    id: 'environment-overrides-high-to-medium',
    sourceAssistantEntries: 1,
    acceptedOutcome: 'success',
    continuation: 'one-shot',
    configured: reviewerHigh,
    expectedMatch: 'mismatching',
    entries: liveEntry({
      role: 'oat-reviewer-claude-sonnet-high',
      model: 'claude-sonnet-5',
      effort: 'medium',
      sessionId: '66666666-6666-4666-8666-666666666667',
      requestId: 'req_p03_live_10',
    }),
  },
  {
    id: 'settings-cap-high-to-medium',
    sourceAssistantEntries: 1,
    acceptedOutcome: 'success',
    continuation: 'one-shot',
    configured: reviewerHigh,
    expectedMatch: 'mismatching',
    entries: liveEntry({
      role: 'oat-reviewer-claude-sonnet-high',
      model: 'claude-sonnet-5',
      effort: 'medium',
      sessionId: '77777777-7777-4777-8777-777777777777',
      requestId: 'req_p03_live_11',
    }),
  },
];

export const LIVE_MEDIUM_EFFORT_TRANSCRIPT =
  LIVE_CLAUDE_EFFORT_CASES[0]!.entries;

export const LIVE_HIGH_EFFORT_TRANSCRIPT = LIVE_CLAUDE_EFFORT_CASES[1]!.entries;
