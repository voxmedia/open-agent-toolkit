---
id: bl-b3f7
title: 'Add idea promotion and auto-discovery flow to oat-project-new'
status: open
priority: medium
scope: feature
scope_estimate: L
labels: ['skills', 'ideas']
assignee: null
created: '2026-02-14T00:00:00Z'
updated: '2026-02-14T00:00:00Z'
associated_issues: []
---

## Description

`oat-project-new` should be able to promote already-summarized ideas into projects and optionally trigger discovery immediately, so users do not have to re-explain idea context or manually stitch together the next workflow step.

Proposed change:

- Detect summarized ideas in `{IDEAS_ROOT}` and let the user choose between creating a brand new project or promoting an existing idea.
- When promoting, seed `oat-project-discover` with the selected idea's summary so discovery starts with existing context.
- Offer auto-triggering discovery from `oat-project-new` instead of only printing the next command.
- Archive the promoted idea entry with a `promoted to project` reason.
- Support both project-level and user-level ideas.

Links:

- Current skill: `.agents/skills/oat-project-new/SKILL.md`
- Promotion contract: `.agents/skills/oat-idea-summarize/SKILL.md`
- Discovery skill: `.agents/skills/oat-project-discover/SKILL.md`

## Acceptance Criteria

- `oat-project-new` detects summarized ideas and offers to promote one.
- The promoted idea summary is passed into discovery as seed context.
- The ideas backlog is updated when an idea is promoted to a project.
- Users can still create a brand new project without any idea connection.
- Discovery auto-triggering remains optional.
