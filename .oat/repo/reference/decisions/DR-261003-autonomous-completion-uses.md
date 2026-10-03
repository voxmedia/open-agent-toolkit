---
id: DR-261003-autonomous-completion-uses
title: Autonomous completion uses a standing opt-in and named requesting steps
date: 2026-10-03
status: accepted
legacy_id: null
---

# Autonomous completion uses a standing opt-in and named requesting steps

## Context

Amends DR-260720-autonomous-closeout-requires. That record deferred oat-project-complete-auto behind a three-layer guard: a per-program opt-in, a single human-gated program-end checkpoint, and never firing from task completion alone. The companion shipped in backlog-wave-4 (BL-260720-add-oat-project-complete-auto) with a different first two layers. oat-wave-execute closeout step 8 already completes each wave wrapper before its merge handoff, so a program-end-only guard would have left every wrapper lifecycle-complete but unarchived until program close, which is the gap the Orc audit reported.

## Decision

The opt-in is standing configuration, not per program: workflow.autonomousComplete (default false), set per repository with --shared or --local rather than at user level. The companion runs only when a recognized workflow step names it through --requested-by, and there are two working routes. (1) oat-wave-execute closeout step 8 completes one wave wrapper before its PR merges; the open PR must be the project's tracked PR, and a completion-before-merge exception is written to implementation.md before any other write. (2) The oat-wave-program completion checkpoint completes the deferred wrappers in one batch after the operator's yes, recorded as a ledger reference; every project needs a merged PR and no exception is available. The third layer is unchanged: the companion never fires from task completion or on the agent's own initiative, and the OAT_AUTONOMOUS lifecycle route refuses until a lifecycle skill names it. Each project passes an objective preflight, and any completion question without a recorded answer refuses that project instead of assuming one.

## Consequences

With the opt-in set, a wave is archived without a human prompt at that wave's closeout; the human gate at program end applies only to wrappers that were deferred. A repository that wants the DR-260720 behavior leaves the opt-in false, so every wave defers to the interactive oat-project-complete. The companion never creates a PR. Provenance is carried by the run report and the completion commit body (Requested-by, plus the exception line when one was recorded).
