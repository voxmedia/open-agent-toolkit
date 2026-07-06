---
id: DR-260706-phase-review-gate-is-non
title: Phase review gate is non-pausing and separates verdict from disposition
date: 2026-07-06
status: accepted
legacy_id: null
---

# Phase review gate is non-pausing and separates verdict from disposition

## Context

`oat-project-implement` runs an in-session per-phase reviewer. We wanted an
optional, independent cross-provider review after each phase (via `oat gate
review`) without turning it into another human pause point, and without letting
it silently drop sub-threshold findings. Two axes were being conflated: whether
a phase should _stop_, and how each finding should be _dispositioned_.

## Decision

The phase review gate (`oat_phase_review_gate` in `plan.md`) runs after the
standard reviewer passes and bookkeeping is committed. It is **non-pausing** and
independent of HiLL checkpoints — it never pauses on a pass and never touches
`oat_hill_completed` / `oat_plan_hill_phases`.

The gate **verdict** (`exit_nonzero_on`, default `important`) decides only
whether the phase stops. It does **not** decide whether sub-threshold findings
are ignored. Disposition forks on the verdict, and the produced artifact is
always consumed by `oat-project-review-receive`:

- **Passing gate** → non-pausing judgment sweep: defer Medium/Minor to final by
  default, address-now only for small/contained/low-risk fixes (no re-review),
  or reject with rationale.
- **Blocking gate** → convert to fix tasks and re-run reviewer + gate, bounded
  by `oat_orchestration_retry_limit`.

Rejected alternatives: a pausing gate (HiLL already owns human pauses);
record-counts-and-continue on pass (strands Medium/Minor findings and leaves a
re-hijackable top-level artifact); convert-everything on pass (nullifies the
`exit_nonzero_on` threshold by generating fix tasks for non-blocking findings).

## Consequences

A recurring cross-provider check runs every phase without adding pauses, and no
finding evaporates: blocking findings gate the phase, sub-threshold findings
become durable deferrals swept at final review. Gate-originated artifacts are
excluded from the same-scope review-cycle cap so the cap measures failed fix
rounds, not artifact volume. Orchestrators must drive gates through `oat gate
review` rather than hand-rolled provider invocation. See
[DR-260706-gate-completion-is-signaled-by](DR-260706-gate-completion-is-signaled-by.md) and
[DR-260706-review-artifacts-use-seconds](DR-260706-review-artifacts-use-seconds.md).
