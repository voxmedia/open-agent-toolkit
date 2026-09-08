---
id: BL-260907-record-absorbed-projects
title: Record absorbed projects and backlog items for Lite consolidations
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - lifecycle
  - lite
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:44.959Z
updated: 2026-09-07T14:05:44.959Z
associated_issues: []
external_plans: []
---

## Description

Wave-5 p11 (2026-09-02-make-consolidated-project-retirement-semantic.md) made oat-project-complete's retirement sweep read `absorbed_projects` / `absorbed_backlog_ids` from state.md, but only oat-project-quick-start records those fields; the plan's Outcome is scoped to quick-start and its 2026-09-07 refresh did not extend it to the Lite workflow (PR #264, in the wave-5 base). A Lite project that consolidates earlier scaffolds records nothing, so the sweep degrades to `Retirement sweep: no absorbed projects recorded.` and stale ownership claims stand — the issue #250 class reached through a different entry path (p11 review Medium, ruled a plan-scope gap).

## Acceptance Criteria

- [ ] `oat-project-lite` records `absorbed_projects` and `absorbed_backlog_ids` in state.md when it consolidates earlier scaffolds, with the same field shapes quick-start writes
- [ ] A `review-skill-contracts.test.ts` case pins the Lite recording paragraph and a scratch-tree probe shows a Lite consolidation reaches the sweep's semantic checks
- [ ] `lifecycle.md` drops the quick-mode-only qualifier added at wave-5 p11
