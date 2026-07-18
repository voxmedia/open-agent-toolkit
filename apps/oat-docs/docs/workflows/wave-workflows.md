---
title: Wave Workflows
description: How OAT coordinates a corpus of external plans into waves while preserving project-lifecycle ownership and human judgment.
---

# Wave Workflows

A wave is a program layer above the per-project OAT lifecycle. It groups external implementation plans into an ordered delivery unit, then runs that unit as a wrapper OAT project. The wrapper uses the normal project lifecycle rather than replacing it.

Use wave workflows when a plan corpus is too large to execute as one project and needs durable sequencing across multiple projects, worktree groups, and merges.

## The Two Wave Skills

The workflow pack provides two complementary skills:

- `oat-wave-program` 1.1.0 maintains the durable execution-program artifact over the full plan corpus. Its `new` mode inventories the corpus, verifies the coverage invariant, and records the orchestrator-composed, operator-approved first program; `refresh` adds newly landed plans to the artifact and records the orchestrator's re-composition of waves not yet started; and `wave-close` records a completed wave. Composing waves is the orchestrating agent's judgment; the skill records the result.
- `oat-wave-execute` 1.5.0 runs one wave. It owns the repeatable mechanical layer: wrapper-project scaffolding, branch conventions, worktree bootstrap, briefs, gates, merge choreography, bookkeeping cadence, and closeout order.

`oat-wave-program` records which plans belong to each wave. `oat-wave-execute` consumes that mapping and executes one wave through the project lifecycle.

## Mechanical Work and Judgment

The ownership split is load-bearing. The skills automate mechanics, but the orchestrator retains judgment.

The skills own:

- integration and phase branch naming
- wrapper-project scaffolding
- worktree bootstrap
- merge choreography
- artifact and ledger bookkeeping
- repeatable verification and closeout sequencing

The orchestrator owns:

- wave and parallel-group composition
- review-finding dispositions
- verification of load-bearing worker claims
- merge-order decisions under live drift
- cross-lane and end-of-run synthesis
- all user checkpoints

Do not treat a generated grouping or a mechanically successful lane as a substitute for these decisions.

## Composition With Project Implementation

Each wave is scaffolded as a quick-mode wrapper project. Its plan points to the source plans while preserving their requirements, and `oat-project-implement` remains the lifecycle owner for phase execution, independent review, bounded fixes, checkpoints, and project state.

For plan-declared parallel groups, `oat-wave-execute` invokes its bundled `scripts/bootstrap-group.sh` helper. The helper wraps the standard worktree bootstrap flow, creates phase worktrees at an explicit base, initializes each worktree, checks provider-view parity, and reports structured status. `oat-project-implement` then dispatches and verifies each phase in its assigned worktree. The wave layer owns the serialized fan-in and integration gates after those phases pass.

This composition keeps the responsibilities separate:

1. `oat-wave-program` records the program and wave membership.
2. `oat-wave-execute` scaffolds and coordinates one wrapper project.
3. `oat-project-implement` executes that project's phases.
4. `oat-wave-program wave-close` updates the durable program after the wave merges.

## Execution-Program Artifact Format

The execution-program artifact is durable reference material under `.oat/repo/reference/external-plans/`. It is not an executable plan or an `oat-project-import-plan` target.

The current format contains:

- **Wave table:** one row per source plan, including its link, source index, assigned wave, ordering or dependency notes, and status (`pending`, `in-wave`, `done`, `deferred`, or `dropped`).
- **Coverage invariant:** every plan in every source plan index appears in exactly one row. A deferred or dropped plan includes a reason and re-entry trigger; an omitted plan is an error.
- **Wave sections:** the theme, lane list, intra-wave ordering, and cross-wave prerequisites for each wave.
- **Status ledger:** each wave advances from composed to in-progress to merged, with the wrapper-project link, PR, merge SHA, and completion-record link recorded as they become available.

> **Important:** This format is documented as a description, not a stable contract. Contract work is deferred in **BL-260718-document-execution-program — Document execution-program artifact as stable OAT contract**, grouped with **BL-260718-add-oat-wave-lifecycle-cli — Add oat wave lifecycle CLI command family**.

Until that grouped work ships, consumers should follow the bundled skill and template rather than depending on an independently versioned schema.

## Related

- [Project lifecycle](projects/lifecycle.md)
- [Implementation execution](projects/implementation-execution.md)
- [Project artifacts](projects/artifacts.md)
