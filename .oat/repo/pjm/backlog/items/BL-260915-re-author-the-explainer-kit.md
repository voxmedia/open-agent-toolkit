---
id: BL-260915-re-author-the-explainer-kit
title: Re-author the explainer-kit program-recap fixture page against the live
  program material
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - explainer-kit
  - tests
  - ci
assignee: null
created: 2026-09-15T03:58:26.394Z
updated: 2026-09-15T03:58:26.394Z
associated_issues: []
external_plans: []
---

## Description

.agents/skills/explainer-kit/tests/flow.e2e.test.mjs 'real program material passes bundle, verify, record, package, and reuse' fails on origin/main since 81bf04c1e (PR #299): verify's ledgerToPage check reports cohesion-claim-unobserved for numericClaims.wave-1 through wave-4 because the checked-in authored fixture page no longer observes the wave numbers the live inputs (.oat/repo/reference/external-plans/2026-08-31-execution-program.md and the newest wave summaries) now carry. pnpm test:skills is red on main for this alone; it was observed at both phase gates of oat-doctor-router with the inputs byte-identical to main. Fix: re-author the fixture page from the current bundle (record its provenance header), or pin the test's inputs to tracked fixture copies so live edits to the program ledger cannot break a unit test.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
