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
updated: 2026-09-07T01:12:43Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-03-validate-review-ledger-paths-before-final-pr.md
---

## Description

OAT workflow feedback from the tool-pack-scope-provider-truthfulness retrospective (UP-01). Filed as a repo backlog item because no upstream GitHub destination is configured.

`oat-project-pr-final` Step 0.5 archives active review artifacts from `reviews/` into `reviews/archived/`, and Step 2 then checks the final review status in the plan ledger. When the final gate review runs late — the normal case for a long project — the review artifact is generated _after_ that preflight, so it stays in `reviews/` while a ledger row written for it points at `reviews/archived/`.

This produced a non-resolving ledger path in that project. It was caught only because an external reviewer checked whether the path existed; nothing in the skill validates it.

Suggested directions, either of which would close it: re-run the archive step after the final review row is recorded, or validate that every path referenced in the Reviews ledger resolves before `gh pr create` is invoked. The second is cheaper and catches the general class rather than this one ordering.

## Acceptance Criteria

- Before `gh pr create`, PR-final validates that every path referenced by the
  plan Reviews ledger resolves to an existing active or archived review
  artifact. It blocks with the missing path when validation fails.
- A test covers a final review created after the initial archive pass. PR-final
  archives or otherwise reconciles that artifact and leaves the ledger path
  resolvable before PR creation.
- A test moves a tracked review into the ignored `reviews/archived/` directory,
  runs the repository formatter and staging hooks, and proves the committed
  destination remains present without reporting a false archival failure.
