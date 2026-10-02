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

- [Project lifecycle](../projects/lifecycle.md)
- [Implementation execution](../projects/execution/implementation-execution.md)
- [Project artifacts](../../reference/project-artifacts.md)

## oat-wave-program

Use program to record which external plans belong in each wave. The
orchestrator composes the waves and retains dependency, risk, and concurrency
judgment. The skill maintains the inventory and approved result.

**Invocation:** Select `new`, `refresh`, or `wave-close <wave-id>` as the
situation requires. These are agent-skill requests, not `oat` CLI commands.
Providers with `$` syntax use `$oat-wave-program` instead of the slash name.

```text
/oat-wave-program new
```

```text
/oat-wave-program refresh
```

```text
/oat-wave-program wave-close wave-2
```

**Prerequisites:** Project applicability is `none`. New mode needs the external
plan indexes and their actual plan files, not an active lifecycle project.
Refresh needs the live execution-program artifact and current indexes.
Wave-close needs the completed wave's merge and completion evidence. Missing
indexed files stop the flow rather than being guessed from names.

**Example scenario:** Twelve reviewed external plans include a shared API
foundation, client changes, and independent documentation work. Use `new` to
inventory every indexed plan and record an operator-approved sequence. When
three more plans arrive, use `refresh` to recompose only unstarted waves. After
wave two merges, use `wave-close wave-2` to record that boundary instead of
inventing another execution program.

**Expected output:** A dated execution-program artifact under
`.oat/repo/reference/external-plans/`, with exactly one row per indexed plan,
explicit deferral reasons, ordered waves, dependencies, and a current status
ledger. Started waves cannot be reshuffled, and merged membership is frozen
history. Plan rows can become `done`; wave-ledger states are `composed`,
`in-progress`, and `merged`.

At final program close, recap and deferred wrapper completion receive explicit
dispositions. The completion-tail checkpoint remains human-gated, including
autonomous runs. Program bookkeeping is not an executable project plan or an
import target.

**Next step:** Invoke `oat-wave-execute` for an approved wave. Record each merge
through wave-close, and resolve any program-end completion deferral with its
named owner.

## oat-wave-execute

Use execute for one wave, not for composing the whole corpus. It prepares and
coordinates a quick wrapper project while the normal project lifecycle owns
phase implementation and review.

**Invocation:** Name the wave. Its lanes normally resolve from the live program
artifact, with plan-index hints used only when no program exists.

```text
/oat-wave-execute wave-2
```

**Prerequisites:** Project applicability is `none`. A pre-existing active
project is unnecessary because execute scaffolds the wrapper. The named source
plans must exist, the repository baseline must be usable, and source-plan drift
checks must permit the lanes to proceed. You also need the authorized concurrency
ceiling, worktree tooling, review capabilities, and permissions for the planned
operations. The default ceiling is three worktrees, subject to operator choice.

**Example scenario:** The approved second wave contains client changes after
its API foundation merged. Execute refreshes drift against the current base,
intersects every plan's write set, and records safe groups in the wrapper plan.
Overlapping files force separate groups even when the plans looked independent
when authored. Choose execute rather than program because wave membership is
already approved and now needs verified delivery.

**Expected output:** A `wave-N-execution` wrapper with source-plan pointers,
drift evidence, a plan, discovery, and an orchestration log. Passing lanes produce
verified task commits and review dispositions in isolated worktrees. Serialized
fan-in is followed by integration gates, so individual lane passes are not
presented as proof the integrated tree passes.

Closeout writes end-of-run synthesis before archive work. Autonomous execution
can defer a wrapper's archive tail to program close only with an explicit
ledger disposition. That deferral does not satisfy the full completion tail.
Source-plan requirements remain intact even when live drift changes a mechanism.

**Next step:** Follow the wave's reported review and merge boundary. After the
operator merges, reconcile the result and invoke program wave-close. Do not mark
an unmerged wave `merged` or treat a deferred archive as completed.
