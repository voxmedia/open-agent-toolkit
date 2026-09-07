---
id: BL-260826-emit-the-dispatch-stamp-from
title: Emit the dispatch stamp from the dispatch-ceiling resolver
status: closed
priority: low
scope: task
scope_estimate: XS
labels:
  - cli
  - dispatch
  - wave-2-follow-up
assignee: null
created: 2026-08-26T22:57:19.455Z
updated: '2026-09-06T19:21:07Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-30-emit-dispatch-stamp-with-resolver-json.md
---

## Description

oat project dispatch-ceiling resolve returns JSON, but producing the stamp line for briefs requires a tsx shim over formatDispatchStamp (packages/cli/src/providers/identity/stamp.ts). Add a --stamp flag (or a stamp field in the JSON) so orchestrators need no out-of-tree shim.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
