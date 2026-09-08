---
id: BL-260907-re-resolve-project-path-after
title: Re-resolve PROJECT_PATH after quick-start scaffolds a fresh project
status: closed
priority: medium
scope: task
scope_estimate: XS
labels:
  - skills
  - lifecycle
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:46.524Z
updated: '2026-09-07T23:19:36Z'
associated_issues: []
external_plans: []
---

## Description

oat-project-quick-start Step 0.5 resolves `PROJECT_PATH` from `activeProject` before `oat project new` runs on the fresh-project branch; the scaffold updates `activeProject` in config but cannot update the already-set shell variable, so Step 1's `Update "$PROJECT_PATH/state.md"` (and the `absorbed_*` fields wave-5 p11 added to that same write) can target the previous active project. Confirmed pre-existing at the wave-5 base (no reassignment between the Step 0.5 read and the Step 1 write); rejected as out of scope by the p11 lane twice in Codex review and confirmed by the root review.

## Acceptance Criteria

- [ ] Quick-start re-reads `PROJECT_PATH` from the scaffold's reported path (or `oat config get activeProject`) after `oat project new` and before any state.md write
- [ ] A load-contract or skill-contract test pins the reassignment sentence and `oat-project-quick-start` is bumped once
