---
id: BL-260827-correct-scope-and-adoption
title: Correct scope and adoption diagnostics
status: closed
priority: medium
scope: feature
scope_estimate: M
labels:
  - diagnostics
  - pjm
  - user-scope
assignee: null
created: 2026-08-27T21:29:49.762Z
updated: '2026-08-30T23:04:38Z'
associated_issues: []
external_plans: []
---

## Description

Correct the remaining scope and adoption edge cases in PJM migration and tool diagnostics, including provider-aware user-agent materialization, shared-owner attribution, inventory-failure behavior, and the associated small output and test-quality cleanup.

## Acceptance Criteria

- `oat pjm migrate` derives repository adoption from the canonical PJM
  adoption contract rather than project-pack intent, with declared, inferred,
  partial, and absent-state regression coverage.
- `user-agent-unmaterialized` diagnostics account for the active provider
  materialization contract and name genuinely missing managed agents without
  false positives on providers that do not materialize them.
- Shared-owner observations identify only applicable installed/intended packs;
  `oat status` degrades safely on inventory failure; and doctor output cannot
  misparse values containing the current separator.
- The final review's two test-quality follow-ups are resolved, focused command
  and diagnostic suites pass, required lockstep package versions are advanced,
  and the complete release gate sequence passes.
