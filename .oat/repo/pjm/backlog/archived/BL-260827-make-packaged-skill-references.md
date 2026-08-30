---
id: BL-260827-make-packaged-skill-references
title: Make packaged skill references scope-portable
status: closed
priority: medium
scope: feature
scope_estimate: M
labels:
  - skills
  - portability
  - user-scope
assignee: null
created: 2026-08-27T21:29:42.075Z
updated: '2026-08-28T01:58:20Z'
associated_issues: []
external_plans: []
---

## Description

Replace remaining bare repository-relative cross-skill references with installed-scope-aware resolution, update the brainstorm reference paths, and strengthen the ratchet so future packaged skills cannot reintroduce unsupported links.

## Acceptance Criteria

- The five packaged skills named by the user-scope-tool-packs final review no
  longer depend on bare repository-relative sibling-skill paths; their links
  resolve from the installed scope without breaking repository installs.
- The remaining `oat-brainstorm` reference paths are converted to the same
  portable contract.
- The ratchet scans the relevant canonical skill and reference surfaces with
  syntax-robust matching, rejects new unsupported cross-skill paths, and
  preserves an explicit baseline only for any deliberately retained cases.
- Every changed canonical skill receives exactly one PR-scoped version bump,
  the public package lockstep version is advanced as required, and focused
  validation plus the complete release gate sequence pass.
