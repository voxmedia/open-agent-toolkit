---
id: BL-260718-add-oat-wave-lifecycle-cli
title: Add oat wave lifecycle CLI command family
status: open
priority: high
scope: feature
scope_estimate: L
labels:
  - wave
  - cli
  - orchestration
assignee: null
created: 2026-07-18T17:31:55.949Z
updated: 2026-07-18T17:31:55.949Z
associated_issues: []
external_plans: []
---

## Description

Absorb the proven oat-wave-program mechanics into an oat wave
new/refresh/close command family. Group this work with
BL-260718-document-execution-program. Trigger: operator prioritization after
stoa W6 validation. Evidence: wave-skills promotion packet section 3 row 1.

**Owner:** the repo operator is the accountable owner for prioritizing and
scheduling this deferred work.

## Acceptance Criteria

- `oat wave new`, `oat wave refresh`, and `oat wave close` expose the proven
  execution-program lifecycle through tested CLI commands.
- The commands preserve coverage, refresh, closeout, and structured-output
  invariants from the promoted wave skills.
- Planning and delivery are coordinated with
  BL-260718-document-execution-program so the CLI consumes the agreed artifact
  contract.
- CLI reference documentation and command help cover the complete family.
