---
id: BL-260830-cli-flag-help-p2-p3-cleanup
title: Re-audit CLI grammar across current command tree
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
updated: 2026-11-01T16:05:00Z
associated_issues: []
external_plans: []
---

## Description

Re-audit CLI grammar across the current command tree, including commands
added since the June 2026 audit (`pjm`, `backlog`, `decision`, `gate`,
`docs` and others): dry-run coverage, dry-run/apply migration semantics, exit
codes, logger routing, JSON status shapes, and naming.

**Reframed (2026-11-01, operator):** Originally promoted from legacy backlog
record BL-260627-cli-flag-p2-p3-cleanup. The residual P2/P3 inventory from the
June audit (`20260628-cli-help-flag-coverage.md`) predates much of the
current command tree and is not carried forward; this item is the fresh audit,
and each confirmed defect becomes its own backlog item.

## Acceptance Criteria

- A fresh audit covers every current `oat` command group for dry-run
  coverage, migration semantics, exit codes, logger routing, JSON status and
  naming, without relying on the legacy P2/P3 inventory.
- Each confirmed defect is filed as its own backlog item with the command,
  observed behavior and expected contract; intentional exceptions are
  documented instead.
- The audit report is recorded and this item closes when the follow-up items
  exist.
