---
id: BL-261109-recover-invalid-review
title: Recover invalid review artifacts under bounded autonomous authority
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - reviews
  - gates
  - autonomy
  - recovery
assignee: null
created: 2026-11-09T00:54:55.346Z
updated: 2026-11-09T00:54:55.346Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/344
external_plans: []
---

## Description

Successor to the invalid-artifact recovery slice of BL-260711-skip-re-review-for-bookkeeping (GitHub #344, approved operational recovery refinement of 2026-10-03). review-gate-integrity m01 (#400) delivered that item's finding-disposition criteria (bookkeeping-only findings are fixed at receive with no re-review), but its brief explicitly excluded this autonomous recovery slice and kept it open. The criteria below are moved here unchanged so the work stays in the active backlog. Neither slice fabricates a reviewer pass.

## Acceptance Criteria

- Grant bounded standing authority for defined, mechanically verified artifact-formatting repairs and unambiguous ledger/reference corrections to uniquely identifiable existing evidence.
- Preserve originals and canonical findings/counts, verdict, status, scope and provenance.
- Each repair category requires an equivalence verifier, exact-validator success, and a distinct recorded recovery.
- Reversibility alone is insufficient; ambiguity or failed repair stops execution under existing recovery limits.
- No fabricated reviewer pass or new reviewer evidence.
- Exclude workflow mode, phase, task identity, plan structure, review status changes and anchor stripping from bookkeeping repair.
- Bind reference corrections to the same scope/type/run evidence, including archived files; filename uniqueness alone is insufficient.
