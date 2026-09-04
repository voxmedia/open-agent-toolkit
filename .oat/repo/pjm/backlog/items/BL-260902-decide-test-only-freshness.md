---
id: BL-260902-decide-test-only-freshness
title: Decide test-only freshness exception for the implement exit gate
status: open
priority: medium
scope: idea
scope_estimate: S
labels:
  - gate
  - freshness
  - policy
  - needs-discussion
assignee: null
created: 2026-09-02T23:48:33.763Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/237
external_plans: []
---

## Description

`oat-project-implement` closeout treats any test-file descendant as `stale` and demands a new configured exit-gate generation, even for a four-line test-harness mock with no shipped behavior change. Decide between a closeout-only or test-only freshness exception and an explicit human-waiver field that keeps `allowed` without rewriting provenance. This is a policy decision; do not plan implementation until it is made. Source: GitHub issue #237 (retro item UP-01 of synced-project-scope).

## Acceptance Criteria

- A recorded decision chooses between a closeout-only or test-only freshness exception and an explicit human-waiver field that keeps `allowed` without rewriting provenance, or declines both with rationale.
- The decision names the exact stale-classification code path and states how BL-260719, BL-260820-track-pr-closeout-evidence, and BL-260826-decide-whether-test-only-paths relate without overlapping.
- Only after the decision is recorded does this item become plan-eligible; the `needs-discussion` label is removed at that point.
