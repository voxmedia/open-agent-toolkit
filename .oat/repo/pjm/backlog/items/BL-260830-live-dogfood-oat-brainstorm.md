---
id: BL-260830-live-dogfood-oat-brainstorm
title: Live dogfood oat-brainstorm destination and fold-back safety
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - dogfood
  - brainstorming
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:49.370Z
updated: 2026-08-30T22:30:49.370Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-7d5b. Run live Git-state scenarios across the supported brainstorm destinations and verify fold-back commit safety rather than relying only on simulations.

## Acceptance Criteria

- Live runs cover all supported destination families on real Git state.
- Fold-back preserves unrelated work and commits only the intended brainstorm artifacts.
- Evidence records command, destination, resulting files, commit state, and any recovery path.
