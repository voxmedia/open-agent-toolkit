---
id: BL-260903-pr-final-archives-reviews
title: pr-final archives reviews before a late final review exists
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - oat-upstream
  - workflow
  - pr-final
  - retro
assignee: null
created: 2026-09-03T17:54:40.503Z
updated: 2026-09-03T17:54:40.503Z
associated_issues: []
external_plans: []
---

## Description

OAT workflow feedback from the tool-pack-scope-provider-truthfulness retrospective (UP-01). Filed as a repo backlog item because no upstream GitHub destination is configured.

`oat-project-pr-final` Step 0.5 archives active review artifacts from `reviews/` into `reviews/archived/`, and Step 2 then checks the final review status in the plan ledger. When the final gate review runs late — the normal case for a long project — the review artifact is generated _after_ that preflight, so it stays in `reviews/` while a ledger row written for it points at `reviews/archived/`.

This produced a non-resolving ledger path in that project. It was caught only because an external reviewer checked whether the path existed; nothing in the skill validates it.

Suggested directions, either of which would close it: re-run the archive step after the final review row is recorded, or validate that every path referenced in the Reviews ledger resolves before `gh pr create` is invoked. The second is cheaper and catches the general class rather than this one ordering.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
