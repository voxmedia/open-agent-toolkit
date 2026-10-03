---
id: BL-261002-serialize-stale-gate-claim
title: Serialize stale gate-claim recovery
status: closed
priority: low
scope: task
scope_estimate: S
labels:
  - gates
  - reliability
assignee: null
created: 2026-10-02T23:29:11.674Z
updated: '2026-10-03T15:22:51Z'
associated_issues: []
external_plans: []
---

## Description

Found by the backlog-wave-4 p02 gate (M1) and the wave 4 final review (L1). oat gate review treats a claim as stale from one read (packages/cli/src/commands/gate/index.ts, claim recovery around the rename-aside), then renames the claim aside unconditionally and restores it with a link whose EEXIST is dropped. With an orphaned claim and three simultaneous launches for the same project, review type, and scope, one contender can rename a fresh live claim aside while a third acquires, admitting two runs (schedule: stale S; A reads S and pauses; B recovers and acquires; A renames B's live claim aside; C links and acquires; A's restore fails and A deletes B's claim). Two contenders are safe. workflow-gates.md now states the limit.

## Acceptance Criteria

- Stale-claim recovery is serialized per claim identity (for example a
  per-identity `mkdir` recovery lock taken before the rename and released
  after the restore), so at most one live run holds a claim even under
  concurrent recovery.
- A regression test reproduces the A/B/C schedule above and fails without the
  fix; the existing nested, simultaneous, and dead-owner cases still pass.
- The `workflow-gates.md` caveat about concurrent recovery is removed.
