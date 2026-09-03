---
id: BL-260901-consolidate-terminal-remote
title: Consolidate terminal remote-ref advertisement parsing
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - cli
  - synced-projects
  - maintainability
assignee: null
created: 2026-09-01T21:57:20.746Z
updated: 2026-09-01T21:57:20.746Z
associated_issues: []
external_plans: []
---

## Description

Six terminal synced-project call sites independently parse git ls-remote advertisements. When one parser next changes, extract a shared typed parser that preserves fail-closed validation and each call site’s actionable diagnostics without broadening terminal-state policy.

## Acceptance Criteria

- A shared typed parser replaces the six terminal `git ls-remote`
  advertisement parsers when one of those call sites next requires change.
- The shared parser rejects malformed rows, duplicate exact-ref rows,
  unexpected refs, and transport failures while distinguishing verified
  absence.
- Each caller preserves its existing actionable, operation-specific diagnosis
  and terminal-state policy.
- Focused regression tests cover exact matches, verified absence, malformed and
  duplicate advertisements, unexpected refs, and lookup failures across the
  migrated call sites.
