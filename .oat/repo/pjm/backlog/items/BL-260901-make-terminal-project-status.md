---
id: BL-260901-make-terminal-project-status
title: Make terminal project status agree with completed revision plans
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - project-status
  - revisions
  - cli
assignee: null
created: 2026-09-01T20:03:37.272Z
updated: 2026-09-01T20:03:37.272Z
associated_issues: []
external_plans: []
---

## Description

Correct project status accounting when a completed plan contains ordinary and p-revN revision phases. Terminal projects must not report zero completed tasks or recommend renewed implementation after all tracked work and the phase state are complete.

## Acceptance Criteria

- A terminal project whose ordinary and `p-revN` task rows are all complete
  reports the correct completed-task count and no current task.
- Terminal phase state and completed task tables cannot produce a recommendation
  to resume `oat-project-implement` solely because revision phases exist.
- JSON and human-readable project status agree on phase state, task totals,
  completion totals, current work, and the recommended next action.
- A regression fixture covers a project with both ordinary phases and multiple
  completed corrective-revision phases.
- Existing in-progress, blocked, partially complete, and revision-resume status
  behavior remains unchanged and is covered by focused tests.
