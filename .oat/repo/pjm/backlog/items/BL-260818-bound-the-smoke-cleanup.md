---
id: BL-260818-bound-the-smoke-cleanup
title: Bound the smoke cleanup SIGTERM harness with a timeout
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - testing
  - flake
  - smoke
assignee: null
created: 2026-08-18T00:00:47.143Z
updated: 2026-08-20T02:37:32Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-19-bound-smoke-cleanup-signal-wait.md
---

## Description

During explainer-improvements-v2 final review round 5, `pnpm test` wedged for ~35 minutes inside `tools/smoke/runner/cleanup.test.mjs`'s SIGTERM harness; killing and rerunning completed cleanly. Pre-existing and untouched by that project's range. A hang that long inside a signal harness suggests a missed-signal race with no timeout. Source: explainer-improvements-v2 retro RP-03.

## Acceptance Criteria

- The SIGTERM harness has a bounded timeout that fails the test rather than hanging the suite.
- The missed-signal race is reproduced and fixed, or the timeout is documented as the accepted mitigation.
- A timed-out child is force-killed and reaped before the harness removes its
  temporary directories.
- Timeout failures identify the paused stage and include captured stdout and
  stderr so the missed signal remains diagnosable.
