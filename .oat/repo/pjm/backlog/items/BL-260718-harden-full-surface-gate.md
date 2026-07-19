---
id: BL-260718-harden-full-surface-gate
title: Harden full-surface gate reviews against budget and recursive dispatch
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - gate
  - reviews
  - reliability
assignee: null
created: 2026-07-18T17:36:37.972Z
updated: 2026-07-18T17:36:37.972Z
associated_issues: []
external_plans: []
---

## Description

The original configurable per-target timeout request is implemented on current
main through target `timeoutMs`, `workflow.gateTimeouts`, and `--timeout-ms`,
but fresh evidence leaves two operational gaps. Stoa hit the former fixed
900-second budget. In this project, max-effort full-surface plan gate reviews
exceeded 900 seconds and delta-scoping was the workaround; gate prompts naming
a reviewer-dispatching skill also recursed into concurrent nested gate runs,
with two runs observed in one gate window on 2026-07-18. Preserve explicit
timeout configuration while making full-surface reviews and nested invocation
safe.

## Acceptance Criteria

- Full-surface plan reviews have a documented or automatically selected budget
  that does not silently retain the 900-second artifact default.
- Gate execution rejects or safely reuses a matching in-flight run instead of
  recursively launching a second reviewer-dispatching gate.
- Tests cover timeout precedence, a long full-surface review envelope, and
  same-window nested invocation.
- Run markers and JSON output make the selected budget and recursion decision
  observable.
