---
id: BL-260830-add-per-claude-md-adoption-opt
title: Add per-CLAUDE.md adoption opt-out for instruction sync
status: open
priority: low
scope: feature
scope_estimate: M
labels:
  - provider-sync
  - instructions
  - claude
  - ux
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:40.300Z
updated: 2026-08-30T22:30:40.300Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-c745. Define a predictable per-path or per-run policy for intentionally Claude-only instruction files that must not be adopted into canonical AGENTS.md.

## Acceptance Criteria

- The supported per-run, per-path, or per-file opt-out model and its precedence are explicit.
- Non-interactive sync, dry-run, recursive scans, and validation report intentional Claude-only files consistently.
- Existing canonical instruction adoption remains backward compatible unless an operator selects the new policy.
