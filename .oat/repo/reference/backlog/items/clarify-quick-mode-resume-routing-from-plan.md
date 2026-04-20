---
id: bl-7e68
title: 'Clarify quick-mode resume routing from oat-project-plan'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels:
  - workflow/project
  - topic/routing
  - topic/ux
assignee: null
created: '2026-04-20T18:23:29Z'
updated: '2026-04-20T18:23:29Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

Tighten the quick-mode recovery UX when a user runs `oat-project-plan` against a project that still belongs to the quick workflow.

The current behavior is directionally correct: quick-mode planning is owned by `oat-project-quick-start`, and `oat-project-plan` stops rather than generating a spec-driven plan. The problem is discoverability. In practice, the stop message can feel like a dead end even when the intended recovery path already exists.

This item should keep the workflow semantics intact:

- quick-mode projects continue through `oat-project-quick-start`
- `oat-project-plan` remains the spec-driven planning skill

The work is to make the handoff obvious and consistent, especially when a quick project has accumulated more design depth than expected but has not yet produced an executable plan.

## Acceptance Criteria

- `oat-project-plan` makes it explicit that quick-mode projects should resume through `oat-project-quick-start`, phrased as continuation rather than failure.
- The quick-mode stop message clearly explains why `oat-project-plan` is stopping and what the next command should be.
- Routing and copy are aligned across the surrounding workflow helpers that surface next-step guidance, including:
  - `oat-project-plan`
  - `oat-project-progress`
  - `oat-project-next`
- If the project is in quick mode and the current `plan.md` is still a stub or otherwise not implementation-ready, the guidance remains recoverable and does not imply that the user should jump straight to `oat-project-implement`.
- Tests cover the clarified routing/messaging behavior so the quick-mode recovery path stays consistent.
