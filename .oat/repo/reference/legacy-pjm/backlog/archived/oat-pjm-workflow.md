---
id: bl-42f9
title: 'Add first-class OAT project/repo management workflow family (oat-pjm-* or oat-repo-reference-*)'
status: closed
priority: high
priority_reviewed: '2026-04-24'
scope: initiative
scope_estimate: XL
labels: ['workflow', 'project-management']
assignee: null
created: '2026-02-18T00:00:00Z'
updated: '2026-04-24T00:00:00Z'
closed: '2026-04-24T00:00:00Z'
closed_reason: completed
associated_issues:
  - type: project
    ref: 'local-project-management'
---

## Description

OAT has been running backlog capture, reference refresh, decision-record maintenance, and artifact cleanup flows ad hoc. This item tracks formalizing those operations into a first-class project/repo management workflow family with clear installation and execution paths.

Proposed change:

- Formalize backlog capture, review, completion, decision-record updates, reference refresh, and review/external-plan hygiene flows.
- Support both version-controlled and local-only operating modes for `.oat/` artifacts.
- Add explicit configuration for which `.oat/` directories are gitignored by policy and which should sync between local and worktree contexts.
- Prefer interactive multi-select flows when cleanup or archive decisions require user choice.

Links:

- Related backlog area: artifact cleanup and stale review/external-plan management
- Active project: `.oat/projects/shared/local-project-management`

## Acceptance Criteria

- Teams can run a repeatable PM/reference lifecycle with clear commands and skills.
- The same workflow supports both tracked and local-only artifact policies.
- Cleanup and archive flows reduce stale duplicates without losing important context.

## Closure Note (2026-04-24)

Closed as completed. All three acceptance criteria are covered by shipped work:

- **Repeatable PM/reference lifecycle** — `oat-pjm-add-backlog-item`, `oat-pjm-review-backlog`, and `oat-pjm-update-repo-reference` provide a consistent skill-first surface; `oat backlog init/regenerate-index/generate-id` backs the file-per-item structure.
- **Tracked and local-only modes** — `localPaths` config plus `oat local add/remove/apply/sync/status` give per-directory policy for which `.oat/` surfaces are gitignored vs synced.
- **Cleanup and archive flows** — `oat cleanup project` (stale pointers, missing state, lifecycle normalization) and `oat cleanup artifacts` (duplicate pruning for reviews and external plans) are in place.

Any future PM/reference polish will be tracked as discrete follow-on items rather than continued work on this umbrella initiative.
