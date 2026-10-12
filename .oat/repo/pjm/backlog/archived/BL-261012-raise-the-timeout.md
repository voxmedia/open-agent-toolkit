---
id: BL-261012-raise-the-timeout
title: Raise the timeout of the review-ledger path guard contract test
status: closed
priority: low
scope: task
scope_estimate: XS
labels:
  - ci
  - flaky
assignee: null
created: 2026-10-12T15:34:45.409Z
updated: '2026-10-12T17:34:08Z'
associated_issues: []
external_plans: []
---

## Description

review-skill-contracts.test.ts 'validates absent review-ledger paths in every project scope' scaffolds three projects (shared, local, synced with a bare origin) through the built CLI and takes ~5s locally; under CI contention it exceeded vitest's 30s testTimeout on feat/artifact-cleanup heads 731a5d781 and 4acebec12 while passing on others. The branch did not slow project creation (3.6s for three oat project new runs on both the branch build and the installed 0.3.18). Give that test (and any sibling that spawns several CLI processes) an explicit per-test timeout, e.g. 120_000, or split the three scopes into separate tests.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
