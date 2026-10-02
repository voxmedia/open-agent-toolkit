---
id: BL-261002-route-validated-archive
title: Route validated archive receipts from oat-project-complete-auto to the
  interactive resume tail
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - lifecycle-skills
  - autonomy
  - workflow-integrity
assignee: null
created: 2026-10-02T23:29:11.448Z
updated: 2026-10-02T23:29:11.448Z
associated_issues: []
external_plans: []
---

## Description

Found by the backlog-wave-4 p05 gate (M1) and the wave 4 final review (M1). oat-project-complete-auto preflights with oat project closeout-check against the original project path, which reports Project not found once a synced or shared archive has moved the directory. When an archive succeeds and a later step (push, PR description sync, bookkeeping) fails, every later companion run refuses at preflight:1 and never reaches oat-project-complete's archive-resume branches. Wave 4 made the skill honest: the refusal reason is 'project directory absent (archived?); resume with oat-project-complete', and oat-wave-execute names oat-project-complete as the next owner. The full fix lets the companion recognize a validated archive receipt for the requested project and continue through the interactive skill's resume tail without a human.

## Acceptance Criteria

- When the requested project's directory is absent and a validated archive
  receipt for it exists, the companion continues through the interactive
  skill's archive-resume tail instead of refusing at `preflight:1`; every
  other guard (opt-in, activation, the remaining preflight checks against the
  archived record) still applies.
- Without a validated receipt, the absent-directory refusal and its
  `oat-project-complete` next owner are unchanged.
- A contract or composed test covers archive-then-push-failure recovery, and
  `oat-wave-execute` step 8 no longer stops at a boundary for that case.
