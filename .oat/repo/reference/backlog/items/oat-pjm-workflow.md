---
id: bl-42f9
title: 'Add first-class OAT project/repo management workflow family (oat-pjm-* or oat-repo-reference-*)'
status: in_progress
priority: high
scope: initiative
scope_estimate: XL
labels: ['workflow', 'project-management']
assignee: null
created: '2026-02-18T00:00:00Z'
updated: '2026-03-15T22:50:13Z'
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
