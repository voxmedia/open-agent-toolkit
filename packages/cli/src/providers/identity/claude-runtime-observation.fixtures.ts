/**
 * Captured Claude transcript metadata, sanitized.
 *
 * Derived from real on-disk transcripts under `~/.claude/projects/`, which is
 * the format Claude actually writes. They replaced hand-written fixtures built
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
 * conversation), `cwd`, `gitBranch`, `slug`, `agentId`, and every `attribution*`
 * field.
 *
 * Structural facts these fixtures preserve, each load-bearing:
 * - `effort` is a real top-level field on an assistant entry. Claude does
 *   expose a selectable effort axis, so reporting `not-exposed` for it was
 *   wrong; observed values across 124,804 entries are `high`, `xhigh`,
 *   `medium`, and `max`.
 * - `isSidechain` distinguishes a main session from a subagent turn. It is the
 *   only lineage signal present, and it is binary.
 * - `sessionId` is constant within a transcript; every one of the 2,655 local
 *   transcripts that carries one carries exactly one.
 * - Model and service tier live only under `message`, never at the top level.
 */

export const MAIN_SESSION_TRANSCRIPT: readonly unknown[] = [
  {
    type: 'assistant',
    isSidechain: false,
    effort: 'high',
    sessionId: '7f9d5ab4-3b08-4a21-adb5-405c04af2d89',
    requestId: 'req_011Ce9GB4DvzreK2hzChvmgy',
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
    sessionId: '7f9d5ab4-3b08-4a21-adb5-405c04af2d89',
    requestId: 'req_011Ce9GB4DvzreK2hzChvmgy',
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
    sessionId: '7f9d5ab4-3b08-4a21-adb5-405c04af2d89',
    requestId: 'req_011Ce9GB4DvzreK2hzChvmgy',
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
    sessionId: '19c78382-cceb-45ab-bf24-bb8aa284d96b',
    requestId: 'req_011CdSgeEdPwRsUpVTCihKmV',
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
    sessionId: '19c78382-cceb-45ab-bf24-bb8aa284d96b',
    requestId: 'req_011CdSgeEdPwRsUpVTCihKmV',
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
    sessionId: '19c78382-cceb-45ab-bf24-bb8aa284d96b',
    requestId: 'req_011CdSgeEdPwRsUpVTCihKmV',
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
