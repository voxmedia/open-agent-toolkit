---
id: BL-261005-distinguish-stored-receipt
title: Distinguish stored receipt branch return from rewritten history
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - wave-5
  - review-follow-up
assignee: null
created: 2026-10-05T01:44:56.290Z
updated: 2026-10-05T01:44:56.290Z
associated_issues: []
external_plans: []
---

## Description

Wave 5 p03 gate M1 was explicitly deferred by delegated root judgment. Stored receipts outside current ancestry fail closed and preserve receipts/markers; returning to the original branch can recover, rewritten history requires separate provenance policy. Improve diagnostics without automatic receipt rewriting or identity replacement.

## Acceptance Criteria

- [ ] Capture real original-branch return and rewritten-history controls; retain categorical outcomes and provenance.
- [ ] Diagnostics distinguish returning to the receipt-owning branch from rewritten ancestry; neither silently changes receipt identity or data.
- [ ] Preserve fail-closed safety, pending markers and unrelated Git state; specify the operator recovery path.
