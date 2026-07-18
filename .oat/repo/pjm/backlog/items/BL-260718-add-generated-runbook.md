---
id: BL-260718-add-generated-runbook
title: Add generated-runbook verification command pass
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - docs
  - runbooks
  - verification
assignee: null
created: 2026-07-18T17:36:38.126Z
updated: 2026-07-18T17:36:38.126Z
associated_issues: []
external_plans: []
---

## Description

Generated runbooks inherit documentation drift because their verification
commands are not executed before handoff. Add a generation or validation pass
that checks runbook commands against the current CLI and repository surface.
Evidence: stoa program ledger W3 signal remained OPEN at program end.

## Acceptance Criteria

- Generated runbooks expose their verification commands in a machine-readable
  or reliably extractable form.
- A validation pass executes safe commands and statically validates commands
  that cannot run in the generation environment.
- Generation fails with command-level evidence when a verification command is
  stale or invalid.
- Tests include flag-placement drift and a command removed from current CLI
  help.
