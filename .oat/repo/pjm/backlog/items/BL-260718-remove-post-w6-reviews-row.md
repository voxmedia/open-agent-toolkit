---
id: BL-260718-remove-post-w6-reviews-row
title: Remove post-W6 reviews-row restore watch
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - wave
  - reviews
  - cleanup
assignee: null
created: 2026-07-18T17:31:56.421Z
updated: 2026-07-18T17:31:56.421Z
associated_issues: []
external_plans: []
---

## Description

Delete promoted-skill step 6.5's reviews-row restore watch after stoa W6
supplies one more clean final-gate observation reported through the W6 handoff
runbook. Evidence: wave-skills promotion packet section 3 row 4 and ledger
signal "2nd consecutive clean gate."

**Owner:** the repo operator is the accountable owner for confirming the W6
observation and removing the watch.

## Acceptance Criteria

- The W6 handoff records one additional clean final-gate observation with no
  reviews-row restore regression.
- Step 6.5's restore-watch language is removed from the canonical promoted
  skill.
- The skill version is bumped, provider views are refreshed, and skill
  validation passes.
