---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-11
oat_generated: true
oat_summary_last_task: p03-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: post-implementation-sequencing

## Overview

`BL-260709-split-post-implementation` extends OAT's post-implementation
workflow preference so projects can express work that belongs before versus
after final human approval. It preserves the existing string values so current
repositories retain their established behavior.

## What Was Implemented

- Added a validated `WorkflowPostImplementSequence` union: the four legacy
  strings or a structured object with ordered `preApproval` and `postApproval`
  arrays using `summary`, `document`, and `pr`.
- Kept structured values atomic across user, shared, and local config layers;
  plain CLI retrieval emits compact JSON and JSON retrieval preserves the
  object.
- Added an approval-aware final-closeout contract: final verification and review
  precede pre-approval work, final HiLL approval is recorded before any
  post-approval work, and an immutable state snapshot makes interruption safe.
- Updated PR-final and project-next contracts to preserve and resume incomplete
  closeout state, and clarified Phase gate review terminology across plan paths.
- Documented the behavior, regenerated shipped skill assets, bumped the five
  lockstep public packages to `0.1.49`, and archived the completed backlog item.

## Key Decisions

- **Use one atomic legacy-or-structured workflow preference.** The new object
  form is resolved as a single leaf, avoiding invalid boundary-array merges
  while retaining every legacy string exactly as users already configured it.
- **Make final-closeout state immutable after it begins.** The persisted
  snapshot, its completed-step lists, and explicit approval status make resume
  behavior deterministic even if configuration changes mid-closeout.
- **Name the optional reviewer boundary “Phase gate review.”** This distinguishes
  an automated non-pausing gate from both HiLL approval and artifact review.

## Integration Notes

`workflow.postImplementSequence: docs-pr` remains compatible and normalizes to
pre-approval `summary → document → pr`; structured values may place any valid,
non-duplicated steps on either side of final approval.

## Associated Issues

- `BL-260709-split-post-implementation` — completed and archived.
