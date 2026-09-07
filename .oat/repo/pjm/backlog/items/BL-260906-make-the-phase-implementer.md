---
id: BL-260906-make-the-phase-implementer
title: Make the phase-implementer sweep contract test negation-aware
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - contract-tests
assignee: null
created: 2026-09-06T13:43:59.257Z
updated: 2026-09-06T13:43:59.257Z
associated_issues: []
external_plans: []
---

## Description

p01 review m4 and the lane's own disclosure (wave 3). The cross-cutting sweep contract in post-implement-sequence-contracts.test.ts guards the stop-and-report duty with a sliced deny-list plus a bare-word negation lookbehind: a novel synonym still evades it, and a bolded negation (**Never** treat...) trips it (fail-closed). Replace the lookbehind with a markup-tolerant form, add a bolded green control, and consider the sentence-scoped negation/mutation-marker approach the explainer-kit contract test uses.

## Acceptance Criteria

- [ ] The stop-and-report deny-list in `post-implement-sequence-contracts.test.ts` tolerates markdown emphasis around a negation (`**Never** treat…` stays green) with a pinned control
- [ ] A novel-synonym softening (e.g. "continue silently") is rejected or the accepted gap is documented in the test with a pinned control
- [ ] The `probe()` helper still rejects missing anchors and no-op mutations
