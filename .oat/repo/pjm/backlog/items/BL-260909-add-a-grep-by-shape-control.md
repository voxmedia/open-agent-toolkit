---
id: BL-260909-add-a-grep-by-shape-control
title: Add a grep-by-shape control for own-key sweeps keyed to variable names
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - testing
  - hardening
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:37.731Z
updated: 2026-09-09T08:35:37.731Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p05 (`2026-09-08-guard-against-inherited-prototype-keys.md`) lesson: a Step-5-style sweep keyed to variable names (`in` / `hasOwnProperty` sites) missed shape-based lookups such as `REGISTERED_ADAPTERS[provider]` and `cursor[part]`, and the real cause sat at `registry.ts:219`. Add a repo-wide control that finds dynamic-key indexing of plain-object maps by shape (bracket access with a non-literal key on a map that is not `Object.create(null)` / `Map`), either as an oxlint rule configuration or a scripted grep control in `tools/smoke`, with an allowlist for reviewed sites.

## Acceptance Criteria

- A control enumerates every dynamic-key indexing site on a prototype-bearing object map and fails on an unreviewed addition.
- The four sites p05 hardened are the seed allowlist and are documented as such.
- The control runs inside an existing gate (`pnpm check` or `pnpm test:smoke`).
