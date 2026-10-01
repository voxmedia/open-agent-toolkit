---
id: BL-261001-recover-recon-lanes-after
title: Recover recon lanes after a Codex agent-limit rejection
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - recon
  - skills
  - codex
assignee: null
created: 2026-10-01T04:38:13.286Z
updated: 2026-10-01T04:38:13.286Z
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
bounded recovery policy. Building the mixed-route continuation records adds
manifest machinery, so weigh it against the open question of how much recon
machinery earns its keep (see `BL-260928-settle-codex-read-authority`) before
committing to the full design.

## Acceptance Criteria

- The recon skill documents the Codex v2 residency and mailbox gotcha and
  distinguishes `interrupt_agent` from `close_agent`. It does not describe
  every limit failure as cumulative exhaustion and does not recommend archiving
  or deleting sessions.
- A pre-acceptance agent-limit rejection is recorded as a provider or dispatch
  failure, never a worker failure, and every accepted artifact is kept.
- Recovery is bounded and declared in the dispatch envelope before use: at
  most one admission retry after eligibility checks, and an alternate route
  only when one was already approved. Otherwise the skill asks for a concrete
  continuation amendment.
- No fallback silently changes model, effort, role behavior, data authority,
  output limits, or reviewer blindness. Fresh review lanes stay fresh.
- A mixed native and CLI wave is representable without rewriting the targets
  of completed lanes: approved intent stays immutable, and amendments and
  per-lane launch observations are appended.
- Tests simulate a pre-start rejection, show no accepted work is lost, and
  show recovery attempts are recorded before use.
