---
id: BL-260927-mark-gate-findings-as-new-or
title: Mark gate findings as new or carried over between attempts
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - gates
  - review-cap
  - cli
assignee: null
created: 2026-09-27T13:44:46.186Z
updated: 2026-09-27T13:44:46.186Z
associated_issues: []
external_plans: []
---

## Description

Carve-out from the review-cap consolidation (2026-09-27). When a configured gate runs more than once (maxAttempts > 1), each attempt's envelope lists findings with no link to the previous attempt, so an exhausted gate that is converging (the same findings, shrinking) cannot be told apart from one that is stuck (new findings each attempt). The operator has to diff review prose by hand before deciding whether to override. Source: GitHub issue #327 (third gap). The umbrella item BL-260818-distinguish-operator-directed needs this classification for its consolidated decision at the cap (#207), but the marking is useful on its own for every exhausted gate today. Surface: `packages/cli/src/commands/gate/` (review envelope and verdict), gate review artifacts, and the `oat-project-review-provide` finding format if the match needs a stable finding key.

## Acceptance Criteria

- For every attempt after the first, each gate finding is marked `new` or `carried-over` (with the earlier attempt's finding reference) in the structured gate result and in the review artifact.
- The gate result reports per-attempt counts (new, carried over, resolved since the previous attempt), so an exhausted gate shows whether it was converging.
- Matching is deterministic and documented (for example a stable finding key from file, category, and normalized summary); an unmatched finding is `new`, never silently merged.
- Tests cover a converging sequence (same findings shrinking), a stuck sequence (new findings each attempt), and a reworded carried-over finding that the key rule treats as documented.
- First attempts and single-attempt gates are unchanged.
