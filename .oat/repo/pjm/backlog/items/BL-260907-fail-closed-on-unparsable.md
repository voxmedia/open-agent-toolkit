---
id: BL-260907-fail-closed-on-unparsable
title: Fail closed on unparsable program dates in the readiness contract
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - testing
  - skills
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:43.381Z
updated: 2026-09-07T14:05:43.381Z
associated_issues: []
external_plans: []
---

## Description

The readiness contract from wave-5 p07 selects legacy or contract mode from a plan's date, and for program documents falls back to `created`; a `created: 'not-a-date'` or missing value sorts a post-contract program document into legacy mode and accepts it (fail open; review round 2 m1). Make the program-document fallback fail closed with a fixture.

## Acceptance Criteria

- [ ] A program document with a missing or unparsable date is rejected by the contract test rather than sorted to legacy mode
- [ ] A provenance-headed fixture covers the malformed-date case and the accepted control still passes
