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
  - deferred
assignee: null
created: 2026-07-18T17:31:55.949Z
updated: 2026-11-01T16:05:00Z
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

Merged from BL-260718-rewrite-worktree-bootstrap (2026-11-01): porting the
shipped bash `bootstrap-group.sh` to a tested TypeScript
`oat worktree bootstrap-group` command is now an optional sub-slice of this
family and inherits its deferral trigger.

**Deferred (2026-11-01, operator):** Take up only on operator prioritization,
or after a repeated wave defect traced to skill-mechanics drift that a tested
CLI would have caught.

## Acceptance Criteria

- `oat wave new`, `oat wave refresh`, and `oat wave close` expose the proven
  execution-program lifecycle through tested CLI commands.
- The commands preserve coverage, refresh, closeout, and structured-output
  invariants from the promoted wave skills.
- Planning and delivery are coordinated with
  BL-260718-document-execution-program so the CLI consumes the agreed artifact
  contract.
- CLI reference documentation and command help cover the complete family.
- Optional sub-slice (from BL-260718-rewrite-worktree-bootstrap): a tested
  TypeScript `oat worktree bootstrap-group` preserves the bash script's
  bootstrap, validation, containment, and failure semantics; tests cover
  successful group setup, invalid inputs, partial failure, and rerun; the wave
  skills switch to it only after parity is shown, and the bash script retires
  only after migration verification passes.
