---
id: BL-261001-recover-recon-lanes-after
title: Document the Codex agent-limit gotcha in recon and allow one bounded retry
status: closed
priority: high
scope: feature
scope_estimate: S
labels:
  - recon
  - skills
  - codex
assignee: null
created: 2026-10-01T04:38:13.286Z
updated: '2026-10-01T19:47:54Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/333
external_plans: []
---

## Description

In the run behind GitHub issue #333, a native Codex spawn for the third gather
lane was rejected before any child was accepted (`collab spawn failed: agent
thread limit reached`), although the advertised concurrency had room. The
operator approved finishing the remaining lanes as ephemeral `codex exec`
sessions, but the schema-v2 manifest cannot represent a gather wave that is
partly native and partly CLI, and `prepare-routing` correctly flagged the
route change as `CONSTRUCTED_TARGET_MISMATCH`.

Primary-source follow-up in the issue: Codex v2 automatically unloads eligible
completed residents before returning `AgentLimitReached`, but a completed
agent with an active-turn cleanup, pending mailbox items, or a residency lock
is not eligible. The v2 tools expose `interrupt_agent`, which does not
unregister an agent; older toolsets expose `close_agent`. Queue-only messages
to a completed v2 agent can pin it (openai/codex#32353). The exact blocker in
this run was not established.

The issue's author (the operator) asked for a recon-skill note on this and a
bounded recovery policy. Decided 2026-10-01 (operator): this item covers the
note and the bounded retry and joins the next backlog wave. Recording mixed
native and CLI continuations in the manifest is deferred to
`BL-261001-record-mixed-native-and-cli` until the friction recurs.

## Acceptance Criteria

- The recon skill documents the Codex v2 residency and mailbox gotcha and
  distinguishes `interrupt_agent` from `close_agent`. It does not describe
  every limit failure as cumulative exhaustion, does not recommend archiving
  or deleting sessions, and warns that queue-only messages to completed agents
  can pin them.
- A pre-acceptance agent-limit rejection is recorded as a provider or dispatch
  failure, never a worker failure, and every accepted artifact is kept.
- At most one admission retry, after checking that completed agents are
  eligible to be unloaded, and only when the dispatch envelope allows it. The
  current zero-retry default is not silently overridden.
- If the retry fails, the controller uses an alternate route only when one was
  already approved. Otherwise it stops with a partial run and asks for a
  concrete continuation amendment instead of inventing fallback authority.
- No fallback silently changes model, effort, role behavior, data authority,
  output limits, or reviewer blindness. Fresh review lanes stay fresh, and an
  accepted lane is never rerun to free capacity.
- `recon` `metadata.version` bumped (shared with any other recon change in the
  same PR).
