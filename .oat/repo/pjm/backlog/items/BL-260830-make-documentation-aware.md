---
id: BL-260830-make-documentation-aware
title: Make documentation-aware discovery prerequisites configurable
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - cli
  - config
  - staleness
  - knowledge-index
  - docs
  - legacy-promoted
assignee: null
created: 2026-08-30T22:30:47.499Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/205
external_plans: []
---

## Description

Promoted and broadened from legacy backlog record bl-b5af using verified GitHub issue #205 evidence. Replace hardcoded staleness and prerequisite behavior with a truthful documentation-aware discovery policy.

## Acceptance Criteria

- Discovery prerequisite policy distinguishes repository instructions, generated knowledge, and authored documentation.
- Staleness thresholds and required-document classes are configurable without hardcoded repository assumptions.
- Missing, intentionally absent, stale, and fresh documentation yield truthful and test-covered outcomes.
- The implementation resolves GitHub #205's docs-free repository case without weakening required-instruction checks.
