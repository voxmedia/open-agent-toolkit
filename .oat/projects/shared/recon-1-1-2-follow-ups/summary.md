---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-15
oat_generated: true
oat_summary_last_task: p01-t14
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: recon-1-1-2-follow-ups

## Overview

This Lite project addressed seven remaining reliability and clarity issues from
a real Cursor recon run against recon 1.1.2 and recon-worker 1.0.1. The work
focused on durable background execution, authoritative artifact outcomes,
reliable CLI entry, closed worker contracts, and simpler reconciliation without
adding locator-repair or controller-retry state machines.

## What Was Implemented

- Released the canonical recon skill as 1.1.3 and recon-worker as 1.0.2.
- Made every Cursor recon leaf a background task, including the approved generic
  fallback, while preserving the distinction between a materialized role and
  live Task-catalog availability.
- Made a schema-valid, lane-matching approved-path artifact authoritative over a
  later provider stream-close diagnostic, without permitting a replacement
  launch.
- Centralized realpath-aware direct-entry detection across all six bundled recon
  CLIs and kept imported modules side-effect free.
- Required exact contiguous source excerpts, string-only unresolved issues,
  closed per-review examples, and same-task worker self-validation.
- Replaced the reconciliation worker with one manifest-bound deterministic
  controller stage that validates two named outputs and atomically promotes only
  the candidate ledger.
- Bound reconciliation inputs to canonical paths and digests, contained all
  manifest-directed writes, canonicalized review ordering, and required the
  thorough redundant-verification artifact before output.
- Updated the public recon guide, provider projection, triage record, tests, and
  lockstep package release metadata.

## Key Decisions

- **Separate Cursor installation from launchability.** A materialized
  `recon-worker` file is configuration, not proof that the current Cursor Task
  catalog exposes the role. All Cursor recon leaves run in the background, and
  the visible generic fallback remains the supported route when the live role is
  absent.
- **Additive post-selection recovery envelopes.** Recon applies the existing
  durable-recovery decision at its artifact boundary: once the approved artifact
  passes identity, schema, byte, and digest validation, a later stream-close is
  diagnostic only. Workers may repair their own candidate within the same
  accepted task, but terminal invalid output remains `PASS_FAILED` and never
  authorizes controller retry or replacement.
- **Restore economical recon routing and caller-owned judgment.** Reconciliation
  is deterministic and controller-owned; semantic judgment remains in approved
  evidence/review lanes. The controller consumes exact manifest-bound inputs,
  emits the candidate ledger and reconciliation record, and caps each standard
  or thorough run at one conditional contradiction wave rather than introducing
  another orchestration state machine.

## Design Deltas

Final gate review exposed a mismatch between thorough routing and the closed
reconciliation schema: routing allowed two contradiction conditions while the
schema could consume one result. The project chose the lower-complexity fix and
capped thorough at one condition. Later review also required import-safe CLI
entry detection and earlier rejection when thorough redundant verification is
missing.

## Notable Challenges

The first configured exit-gate review found one Important and two Minor issues,
all of which were fixed before an independent final re-review. The second and
explicitly final gate attempt passed at the Important threshold; its remaining
Minor public-doc alignment was resolved during receive. A fresh recon run also
found one stale diagnostic expectation, which was corrected without changing
product behavior.

## Tradeoffs Made

- Locator repair remains out of scope; stale or paraphrased excerpts fail closed
  before review instead of creating a mutable evidence-repair revision.
- Controller schema retry remains out of scope; same-task self-validation gives
  workers one contained correction opportunity without creating replacement-lane
  state.
- OAT documents and tests Cursor's live-catalog boundary but does not claim to
  force Cursor to expose a custom Task type or require a volatile live probe in
  this project.

## Integration Notes

Focused suites passed with 300 fresh recon tests and 242 Cursor/CLI validation
tests. Check, type-check, build, release validation, docs build, lint, format,
phase review, final review, and the cross-family implementation gate passed.
The full workspace test remained at 7,389/7,390 because of one unchanged
baseline assertion in `review-skill-contracts.test.ts`.

PR #302 is open. PR #301 advanced `main` and the lockstep release files after
the final gate, so the PR currently requires integration conflict resolution.
That resolution must preserve the reviewed behavior and follow the repository's
version and review/gate policy.

## Follow-up Items

- Revisit post-reconciliation locator repair only with a design that preserves
  byte-frozen evidence identity.
- Revisit controller retry only if a future contract can distinguish same-task
  correction from forbidden accepted-lane replacement without adding ambiguous
  orchestration state.
- Treat live Cursor Task exposure as provider-owned; continue using the approved
  background generic fallback when `recon-worker` is absent from the live
  catalog.

## Explainer Outcome

- **project-recap:** skipped — the optional completion recap was not selected.

## Workflow Observations

### 2026-09-15 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:2,medium:3,minor:2 exit=1 status=blocked artifact=.oat/projects/shared/recon-1-1-2-follow-ups/reviews/artifact-plan-review-2026-09-15T042341Z.md run=928567ff-e70a-4d5a-b2cc-4d208e621edf

### 2026-09-15 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/recon-1-1-2-follow-ups/reviews/artifact-plan-review-2026-09-15T043825Z.md run=f0f323e4-a4a0-4513-b19e-8eaf638b3464

### 2026-09-15 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:2,minor:0 exit=0 status=ok artifact=.oat/projects/shared/recon-1-1-2-follow-ups/reviews/artifact-plan-review-2026-09-15T045555Z.md run=3639c19e-7405-49b6-a071-dd52e230e639

### 2026-09-15 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:0,minor:2 exit=1 status=blocked artifact=.oat/projects/shared/recon-1-1-2-follow-ups/reviews/final-review-2026-09-15T063725Z.md run=8147baea-2a6b-4da5-9b26-9a018e5d45e4

### 2026-09-15 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/recon-1-1-2-follow-ups/reviews/final-review-2026-09-15T070929Z.md run=9eec5f13-a6eb-4116-927b-8eb1278faed3
