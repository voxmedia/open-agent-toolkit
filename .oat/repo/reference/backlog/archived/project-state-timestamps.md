---
id: bl-d9d7
title: 'Add timestamp frontmatter to project state documents'
status: closed
priority: high
scope: feature
scope_estimate: M
labels: ['tooling', 'state']
assignee: null
created: '2026-03-08T00:00:00Z'
updated: '2026-03-10T00:00:00Z'
associated_issues: []
---

## Description

Delivered project-state lifecycle timestamps so OAT projects can record creation, completion, and last-update metadata consistently across scaffolders and skills.

Key outcomes:

- Added `oat_project_created`, `oat_project_completed`, and `oat_project_state_updated` to the state template.
- Updated project scaffolding and downstream state-writing skills to maintain the timestamp fields.
- Preserved compatibility for older projects by allowing the new fields to default to `null`.

Links:

- Templates: `.oat/templates/state.md`, `packages/cli/assets/templates/state.md`
- Scaffolder: `packages/cli/src/commands/project/new/scaffold.ts`
- Test: `packages/cli/src/commands/project/new/scaffold.test.ts`

## Acceptance Criteria

- Added three lifecycle timestamp fields to the `state.md` template.
- Updated scaffolding and state mutation paths to maintain the timestamps.
- Existing projects continue to work without backfilling the new fields immediately.
