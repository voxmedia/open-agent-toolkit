---
id: BL-260830-cli-flag-help-p2-p3-cleanup
title: CLI flag/help P2-P3 cleanup
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - cli
  - ux
  - tech-debt
  - dx
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:43.912Z
updated: 2026-08-30T22:30:43.912Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record BL-260627-cli-flag-p2-p3-cleanup. Re-audit residual dry-run, migration-semantics, exit-code, logger-routing, and naming inconsistencies after the shipped P0/P1 cleanup.

## Acceptance Criteria

- The residual P2/P3 inventory is revalidated against current CLI grammar and shipped behavior.
- Dry-run/apply migration semantics converge or every intentional exception is documented.
- Exit-code, logger-routing, JSON-status, and naming findings each receive an explicit ship or defer disposition.
- Changes preserve non-interactive output contracts and lockstep release policy.
