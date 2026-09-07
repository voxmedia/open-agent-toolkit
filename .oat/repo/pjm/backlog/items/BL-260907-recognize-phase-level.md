---
id: BL-260907-recognize-phase-level
title: Recognize phase-level completion records so bullet-list revision phases
  do not read as incomplete
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - control-plane
  - lifecycle
  - wave-5-followup
assignee: null
created: 2026-09-07T12:37:52.785Z
updated: 2026-09-07T12:37:52.785Z
associated_issues: []
external_plans: []
---

## Description

Wave-5 p10 (2026-09-04-make-terminal-project-status-agree-with-revision-plans.md) widened the task parser so revision phases written as '## Revision Phase p-revN:' are discovered. Archives whose implementation.md records completion at phase level (**Status:** complete, bullet lists, no '### Task' headings — e.g. workflow-friction: p-rev1 0/8, p-rev2 0/1 parsed) therefore surface those phases as incomplete: a project of that shape at oat_lifecycle active or paused now routes to oat-project-implement where it previously routed to oat-project-complete (the plan's out-of-scope completion-format class, written before the widening made it reachable through the revision-resume route; the p10 review graded it Important and ruled: do not weaken the widening, file this). Fix: a contract change to .oat/templates/implementation.md and the parser so phase-level completion (and/or bullet-list task records) is recognized, with the workflow-friction shape as a provenance-headed fixture; the p10 fix round pins the current interaction in router.test.ts.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
