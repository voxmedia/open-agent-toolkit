---
id: BL-260906-give-project-state-frontmatter
title: Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - project-state
  - cli
  - wave-4-followup
assignee: null
created: 2026-09-06T19:21:31.267Z
updated: 2026-09-06T19:21:31.267Z
associated_issues: []
external_plans: []
---

## Description

packages/cli/src/commands/shared/frontmatter.ts exports PROJECT_STATE_FRONTMATTER_FIELDS and isProjectStateFrontmatterField, but no production code calls them; preserve-on-write for project state.md keys (including the wave-4 oat_skill_gate_overrides map) holds only because real writers upsert single lines or round-trip YAML. Wave 4 pinned the property with an executable writer test; either wire the predicate into a writer or remove the misleading seam. From the wave-4 p01 review (Medium).

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
