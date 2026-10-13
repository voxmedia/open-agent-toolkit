---
id: BL-261013-documentation-sync-after
title: Documentation sync after closeout silently stales the exit gate
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - retro
  - gates
  - closeout
assignee: null
created: 2026-10-13T03:25:54.807Z
updated: 2026-10-13T03:25:54.807Z
associated_issues: []
external_plans: []
---

## Description

OAT workflow feedback from the artifact-cleanup retrospective (UP-03). Running oat-project-document after the closeout snapshot is complete writes documentation outside the effective-delta exclusion set, so the passed implementation exit gate no longer covers HEAD. oat project closeout-check still reports complete and oat-project-complete does not re-check gate freshness, so the drift is silent unless the operator notices. In artifact-cleanup a two-sentence CLI-reference update needed an operator waiver to keep the gate's pass valid. Related: BL-260820-track-pr-closeout-evidence (closeout evidence vs current head) and BL-260903-project-document-should-prompt (re-running document after contract changes).

## Acceptance Criteria

- Documentation written by `oat-project-document` after the closeout snapshot is complete either counts as a closeout-only descendant when a corroborating transition owns it, or the skill detects a passed exit gate whose freshness it would break and offers the operator waiver before committing
- `oat-project-complete` (or `closeout-check`) reports a passed gate that no longer covers HEAD instead of passing silently
- A fixture covers a docs-only commit after a passed gate: the stale state is reported, and a recorded waiver clears it
