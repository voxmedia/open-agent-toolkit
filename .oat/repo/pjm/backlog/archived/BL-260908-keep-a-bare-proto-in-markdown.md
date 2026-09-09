---
id: BL-260908-keep-a-bare-proto-in-markdown
title: Keep a bare `__proto__` in Markdown prose from being formatted into bold
status: closed
priority: medium
scope: task
scope_estimate: XS
labels:
  - docs
  - tooling
  - wave-6-followup
assignee: null
created: 2026-09-08T05:08:04.732Z
updated: '2026-09-09T10:16:44Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-guard-bare-proto-in-markdown-records.md
---

## Description

oxfmt rewrites a bare `__proto__` in Markdown prose into bold `**proto**`, so decision records and docs that mention the key must keep it in backticks or the meaning is destroyed silently (wave-6 p03 verified 0 mangled / 7 backticked occurrences by hand). Add a guard: a markdownlint rule or a contract test over `.oat/repo/reference/decisions/**` and `apps/oat-docs/docs/**` that rejects `**proto**` and a bare `__proto__` outside code spans.

## Triage widening (2026-09-08)

Already recurred: `.oat/repo/reference/decisions/DR-260908-a-stop-whose-remedy-lies.md:14`, `.oat/repo/pjm/backlog/completed.md:14`, and the generated backlog `index.md` (item titles) carry the mangled form. The guard covers `.oat/repo/pjm/**` as well as decisions and docs, and the existing corruption is repaired in the same change.

## Acceptance Criteria

- [ ] A lint rule or contract test fails on `**proto**` or a bare `__proto__` outside a code span in decision records and docs
- [ ] The existing decision record and docs pass it
