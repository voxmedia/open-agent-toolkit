---
id: BL-260830-add-strict-yaml-validation
title: Add strict YAML validation to oat skill validation
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - tooling
  - validation
  - developer-experience
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:58.743Z
updated: 2026-08-30T22:30:58.743Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-f19a. Parse SKILL.md frontmatter as strict YAML and fail clearly on syntax or schema errors that raw scalar extraction currently misses.

## Acceptance Criteria

- Skill validation fails on invalid YAML with the offending path and parser location.
- Parsed frontmatter is validated against the required field types without replacing existing semantic checks.
- A regression fixture covers a bare colon in an unquoted scalar.
- All currently valid canonical skills continue to pass.
