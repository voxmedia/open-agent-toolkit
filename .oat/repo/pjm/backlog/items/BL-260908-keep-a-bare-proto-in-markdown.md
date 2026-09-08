---
id: BL-260908-keep-a-bare-proto-in-markdown
title: Keep a bare __proto__ in Markdown prose from being formatted into bold
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - docs
  - tooling
  - wave-6-followup
assignee: null
created: 2026-09-08T05:08:04.732Z
updated: 2026-09-08T05:08:04.732Z
associated_issues: []
external_plans: []
---

## Description

oxfmt rewrites a bare `__proto__` in Markdown prose into bold `**proto**`, so decision records and docs that mention the key must keep it in backticks or the meaning is destroyed silently (wave-6 p03 verified 0 mangled / 7 backticked occurrences by hand). Add a guard: a markdownlint rule or a contract test over `.oat/repo/reference/decisions/**` and `apps/oat-docs/docs/**` that rejects `**proto**` and a bare `__proto__` outside code spans.

## Acceptance Criteria

- [ ] A lint rule or contract test fails on `**proto**` or a bare `__proto__` outside a code span in decision records and docs
- [ ] The existing decision record and docs pass it
