---
id: BL-261001-downgrade-claims-that-thorough
title: Downgrade claims that thorough-profile reviews leave without a disposition
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - recon
  - skills
assignee: null
created: 2026-10-01T23:28:16.954Z
updated: 2026-10-01T23:28:16.954Z
associated_issues: []
external_plans: []
---

## Description

Found while fixing `BL-261001-list-thorough-review-omissions` (follow-up to
Wave 3, PR #336). When only a thorough-profile redundant-verification review
leaves a claim without a disposition, `reconcile-ledger.mjs` still marks the
claim `verified`, because its downgrade logic checks only the semantic,
adversarial, and coverage reviews. Publication then rejects the packet with
`MISSING_INDEPENDENT_REVIEW`, so assurance is never inflated, but the run fails
instead of publishing an honest `partial`, and `packet-contract.md` (around
line 396) says an undisposed claim "stays `unresolved`", which holds only for
the core reviews. The renderer now lists such omissions under Review
Downgrades.

## Acceptance Criteria

- The reconciler treats a missing disposition from any required review kind
  (thorough kinds included) like `uncertain`: the claim stays `unresolved` and
  the packet can publish as an honest partial.
- Reconciliation and publication agree for thorough-profile omissions, with a
  production-helper test; `packet-contract.md` states the rule for every review
  kind.
