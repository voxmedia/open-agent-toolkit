---
id: bl-b5af
title: 'Add configurable staleness threshold to oat config'
status: open
priority: medium
priority_reviewed: '2026-04-24'
scope: feature
scope_estimate: S
labels: ['cli', 'config', 'staleness', 'knowledge-index']
assignee: null
created: '2026-04-24T00:00:00Z'
updated: '2026-04-24T00:00:00Z'
associated_issues: []
oat_template: false
---

## Description

Today OAT warns when the knowledge index appears stale using hardcoded thresholds. Users have different tolerance levels for staleness — some want to be warned aggressively, some only when the index is genuinely unreliable. Add a config key so the threshold is user-tunable without code changes.

This is the quick-win piece extracted from the broader Phase 5 "staleness + knowledge drift upgrades" item (`bl-f9bd`). The fuller diff-based detection and strict-blocking work stays deferred under `bl-f9bd`; this item ships the small, high-value config surface first.

### Rough shape

- Add a config key (suggested: `workflow.stalenessThreshold`, possibly with sub-fields for age / file-count / line-count axes) under the existing `workflow.*` surface.
- Supported values depend on what the current staleness detection measures — at minimum, "days since last knowledge-index refresh," since that's the most visible user-facing signal today.
- `oat config get/set/unset` all work for the key (unset falls back to the hardcoded default).
- Staleness-detecting skills (`oat-project-discover`, `oat-repo-knowledge-index`, etc.) honor the config value when deciding whether to warn.
- Document the default, the unit, and the interaction with future strict-mode work (`bl-f9bd`).

### Why this is worth doing now

- Matches the pattern established by other `workflow.*` preferences (archiveOnComplete, postImplementSequence, autoReviewAtHillCheckpoints) — low-ceremony, user-owned.
- User has explicit demand: they want to tune their own tolerance rather than wait for the full diff-based overhaul.
- Composes with `bl-af93` (`oat config unset`) — both retire sharp edges in the same config UX.
- Unblocks reasoning about whether the fuller `bl-f9bd` work is even needed. If users can tune the threshold themselves, hard-blocking may only matter for narrow high-risk workflows.

## Acceptance Criteria

- A `workflow.stalenessThreshold` (or equivalent) config key exists with clear units and a documented default.
- `oat config get/set/unset` all function for the new key under the existing surface precedence rules.
- Staleness-detecting skills resolve the threshold from config, falling back to the current hardcoded default when unset.
- Docs explain the key, its units, how to tune it, and how it relates to the deferred `bl-f9bd` strict-mode work.
- Tests cover: default behavior, explicit user override, unset path, and at least one staleness-detecting skill honoring the config.

## Priority Review (2026-04-24)

New item at medium priority. Small enough to ship in the next "workflow friction polish" batch alongside `bl-af93` and `bl-7e68`. Extracted from `bl-f9bd` because the broader Phase 5 work is not urgent but this specific config key has direct user demand.
