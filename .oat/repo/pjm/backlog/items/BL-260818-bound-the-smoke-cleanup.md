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
updated: 2026-08-18T00:00:47.143Z
associated_issues: []
external_plans: []
---

## Description

During explainer-improvements-v2 final review round 5, `pnpm test` wedged for ~35 minutes inside `tools/smoke/runner/cleanup.test.mjs`'s SIGTERM harness; killing and rerunning completed cleanly. Pre-existing and untouched by that project's range. A hang that long inside a signal harness suggests a missed-signal race with no timeout. Source: explainer-improvements-v2 retro RP-03.

## Acceptance Criteria

- The SIGTERM harness has a bounded timeout that fails the test rather than hanging the suite.
- The missed-signal race is reproduced and fixed, or the timeout is documented as the accepted mitigation.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
