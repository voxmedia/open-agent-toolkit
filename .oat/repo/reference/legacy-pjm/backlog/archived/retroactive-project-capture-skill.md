---
id: bl-1008
title: 'Add retroactive project capture skill (`oat-project-capture`)'
status: closed
priority: high
scope: feature
scope_estimate: L
labels: ['skills', 'project']
assignee: null
created: '2026-03-09T00:00:00Z'
updated: '2026-03-14T00:00:00Z'
associated_issues: []
---

## Description

Delivered `oat-project-capture`, a skill for creating an OAT project around work that already happened on an existing branch.

Key outcomes:

- Uses conversation context and commit history to scaffold a quick-mode project around existing work.
- Populates `discovery.md` and `implementation.md` from the recovered context instead of starting from an empty project.
- Leaves lifecycle state selection to the user based on whether the captured work is complete or still in progress.

Links:

- Skill: `.agents/skills/oat-project-capture/SKILL.md`
- Project: `.oat/projects/archived/retroactive-project-capture/`
- PR: `#68`

## Acceptance Criteria

- Added `oat-project-capture` for retroactive project creation from untracked work.
- Uses quick-mode project scaffolding and commit analysis for artifact generation.
- Supports appropriate lifecycle state selection after capture.
