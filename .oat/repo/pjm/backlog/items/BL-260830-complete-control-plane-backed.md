---
id: BL-260830-complete-control-plane-backed
title: Complete control-plane-backed lifecycle reads
status: open
priority: medium
scope: initiative
scope_estimate: M
labels:
  - skills
  - control-plane
  - cli
  - refactor
  - cloud
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:56.885Z
updated: 2026-08-30T22:30:56.885Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-281c. Complete the residual plan and implementation read surfaces after the shipped state-read migration, without duplicating cloud fallback logic.

## Acceptance Criteria

- Residual pure readers of `plan.md` and `implementation.md` use a CLI-owned structured read surface or receive an explicit direct-read disposition.
- Named bootstrap-heavy lifecycle skills are audited for duplicated parsing and dead fallbacks.
- Cloud environments use one documented checkout-local fallback contract rather than per-skill branches.
- Tests lock the structured fields consumed by migrated skills.
