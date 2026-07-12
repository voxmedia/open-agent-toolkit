---
id: BL-260712-serialize-cli-asset-bundling
title: 'Serialize CLI asset bundling with atomic staging'
status: open
priority: high
scope: task
scope_estimate: S
labels: [build, reliability, multi-agent]
assignee: null
created: '2026-07-12T20:32:24Z'
updated: '2026-07-12T20:32:24Z'
associated_issues: []
external_plans: []
---

## Description

`packages/cli/scripts/bundle-assets.sh` regenerates `packages/cli/assets/` in place, and every `pnpm run cli -- …` invocation, CLI build, validator, and release check triggers it with no concurrency protection. Concurrent invocations interleave the delete/copy sequence.

Five incidents on 2026-07-12: (1) concurrent CLI invocations failed a backlog-index regeneration; (2) the skill validator collided with a concurrent CLI build; (3) an interleaved delete/copy left `assets/migration/pjm-restructure.md` silently missing from the bundle until `release:validate` caught it; (4) two agents nearly raced the same regeneration during a backlog capture; (5) parallel validation commands reproduced the collision (format and type-check failed only in the shared generator).

The failure has two modes: loud transient errors, and — worse — silently incomplete generated state. Multi-agent workflows running concurrent CLI invocations in one worktree make this routine rather than rare.

## Acceptance Criteria

- `bundle-assets.sh` (or a Node replacement) stages output into a temporary directory and swaps it into place atomically, so readers never observe a partially populated `packages/cli/assets/` tree.
- Concurrent regenerators serialize via a lock (portable on macOS, e.g. `mkdir`-based mutex with stale-lock/pid detection); waiters queue with a bounded timeout rather than skip-if-recent.
- Existing cleanup behavior and output contents are preserved byte-for-byte for a single invocation.
- A concurrency regression test spawns multiple concurrent invocations and asserts the final asset tree is complete against canonical sources with zero failed invocations (asserting integrity, not timing).
- Lockstep public package versions bumped and `pnpm release:validate` passes.
