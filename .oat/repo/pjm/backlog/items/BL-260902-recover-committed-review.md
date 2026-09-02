---
id: BL-260902-recover-committed-review
title: Recover committed review artifacts from post-selection gate failures
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - gate
  - review
  - cli
  - reliability
assignee: null
created: 2026-09-02T23:48:30.479Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/232
external_plans: []
---

## Description

`oat gate review` can return `review_failed` with `outcome: unexpected_post_selection_failure` and `artifactPath: null` after the dispatched reviewer already wrote, validated, and committed a passing artifact; the catch-all in `packages/cli/src/commands/gate/index.ts` names no failing sub-step. Treat a committed artifact at the expected path that passes validation as authoritative, return it with its real outcome, and name the post-selection sub-step in the envelope so callers can route deterministically. Source: GitHub issue #232.

## Acceptance Criteria

- When post-selection corroboration throws but a review artifact exists at the expected path and passes artifact validation, `oat gate review` returns that artifact with `outcome: passed|blocked` per its findings instead of `review_failed`.
- A `review_failed` envelope names the failing post-selection sub-step and underlying error code (for example `postSelection.step: artifact-corroboration`) in both JSON and human output.
- The gate contract documents that a `review_failed` envelope with a committed, validating artifact is recovered by re-validating the artifact, never by re-dispatching the review.
- Focused gate tests cover: committed artifact plus corroboration failure (recovered), no artifact plus corroboration failure (named sub-step), and an invalid artifact (still `review_failed` with the validation cause).
- Existing `artifact_missing` and structured-command contracts from PR #246 are preserved byte-for-byte in their outputs.
