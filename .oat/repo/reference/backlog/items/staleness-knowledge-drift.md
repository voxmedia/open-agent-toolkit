---
id: bl-f9bd
title: 'Staleness + knowledge drift upgrades'
status: open
priority: medium
scope: feature
scope_estimate: L
labels: ['workflow', 'staleness']
assignee: null
created: '2026-03-15T22:59:28Z'
updated: '2026-03-15T22:59:28Z'
associated_issues: []
---

## Description

OAT currently warns when context may be stale, but it does not yet support stronger enforcement or richer drift-detection modes. This item tracks the next step in freshness and knowledge-drift handling once more dogfood projects have exercised the current warning-only behavior.

Proposed change:

- Add a full diff-based staleness detection option in addition to age and scoped file/line counts.
- Add a strict staleness mode that can block downstream phases when knowledge is stale or missing.
- Document thresholds, fallback behavior, and edge cases such as non-git directories, shallow clones, and detached HEAD states.

When to start:

- After one or two dogfood projects where staleness signals felt noisy.
- Before using OAT on high-risk changes where stale context would be costly.

## Acceptance Criteria

- OAT supports an optional full diff-based staleness detection mode.
- OAT supports a strict freshness mode that can block downstream workflow phases.
- Documentation explains thresholds and fallback behavior for common git edge cases.
