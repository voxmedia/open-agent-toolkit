---
id: BL-260830-clarify-quick-mode-resume
title: Clarify quick-mode resume routing from oat-project-plan
status: open
priority: high
scope: feature
scope_estimate: S
labels:
  - workflow-project
  - routing
  - ux
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:42.099Z
updated: 2026-08-30T22:30:42.099Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-7e68. Align plan, progress, and next guidance so incomplete quick-workflow projects resume through oat-project-quick-start without a dead-end message.

## Acceptance Criteria

- Plan, progress, and next all route incomplete quick projects through `oat-project-quick-start`.
- Guidance explains why spec-driven planning stops and gives a recoverable continuation command.
- Tests cover quick projects with stub or non-implementation-ready plans.
