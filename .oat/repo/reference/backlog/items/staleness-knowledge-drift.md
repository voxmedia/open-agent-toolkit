---
id: bl-f9bd
title: 'Deeper staleness detection and strict-mode enforcement'
status: open
priority: low
priority_reviewed: '2026-04-24'
scope: feature
scope_estimate: L
labels: ['workflow', 'staleness']
assignee: null
created: '2026-03-15T22:59:28Z'
updated: '2026-04-24T00:00:00Z'
associated_issues: []
---

## Description

Deeper, longer-horizon staleness work: diff-based detection and hard-blocking strict mode. Immediate user-configurable thresholds are tracked separately in `bl-b5af` (configurable staleness threshold in `oat config`), which is the near-term priority.

This item covers the remaining Phase 5 roadmap work:

- Add a full diff-based staleness detection option in addition to age and scoped file/line counts.
- Add a strict staleness mode that can hard-block downstream phases when knowledge is stale or missing (vs the current warn-only default and user-configurable threshold from `bl-b5af`).
- Document thresholds, fallback behavior, and edge cases such as non-git directories, shallow clones, and detached HEAD states.

When to start:

- After `bl-b5af` ships and real-world threshold tuning has surfaced where the warn-only / soft-threshold model breaks down.
- Before using OAT on high-risk changes where stale context would be costly enough to justify hard blocking.

## Acceptance Criteria

- OAT supports an optional full diff-based staleness detection mode.
- OAT supports a strict freshness mode that can block downstream workflow phases.
- Documentation explains thresholds and fallback behavior for common git edge cases.

## Priority Review (2026-04-24)

Dropped from medium to low. The small, near-term piece (user-configurable threshold) was extracted into `bl-b5af` because it's a quick win with clear demand. The fuller diff-based detection and strict-blocking work remains directional — only pursue after real threshold tuning surfaces a hard-block use case.
