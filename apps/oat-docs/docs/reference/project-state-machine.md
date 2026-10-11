---
title: State Machine
description: 'Workflow and review state transitions across lifecycle phases and checkpoints.'
---

# State Machine

This page is the compact contract for how project lifecycle state and review state advance across a tracked OAT project.

## Quick Look

- What it does: defines the allowed lifecycle and review-state transitions recorded in `state.md` and `plan.md`.
- When to use it: when you need to debug lifecycle routing, review posture, or why a project is not advancing to the next phase.
- Primary artifacts: `state.md`, `plan.md`, `implementation.md`

## State Transition Map

=== "Diagram"

    ![Project state machine: discovery, spec, design, plan and implementation phases, then PR open and complete; a review loop returns to implementation, a revise loop runs from PR open and back, and lite, brief and goal enter at planning](/diagrams/project-state-machine-light.svg)
    ![Project state machine: discovery, spec, design, plan and implementation phases, then PR open and complete; a review loop returns to implementation, a revise loop runs from PR open and back, and lite, brief and goal enter at planning](/diagrams/project-state-machine-dark.svg)

=== "Mermaid source"

    ```mermaid
    flowchart TD
      D["Discovery in progress"] --> RS["Ready for spec"]
      RS --> S["Spec in progress"] --> RD["Ready for design"]
      RD --> G["Design in progress"] --> RP["Ready for plan"]
      RP --> P["Plan in progress"] --> RI["Ready for implement"]
      RI --> I["Implement in progress"] --> IC["Implement complete"]
      IC --> PRO["PR open (pr_open)"]
      PRO --> REV["Revise (in_progress)"]
      REV --> PRO
      PRO --> C["Complete"]

      I --> RV["Review received"]
      RV --> FA["Fixes added"]
      FA --> FC["Fixes completed"]
      FC --> PASSED["Review passed"]
      PASSED --> I

      LITE["Lite: batched interview\n(no discovery/spec/design)"] -. entry point .-> P
      BRIEF["Brief or goal: interview\n(one Project Brief)"] -. entry point .-> P
    ```

The solid chain is the spec-driven progression. Lite, brief and goal enter at
**Plan in progress** and never set `oat_phase` to `discovery`, `spec`, or
`design`; quick and import projects also skip part of the leading chain. Goal
adds a milestone state machine inside implementation, described under
[Goal progression](#goal-progression).

## Phase status values

`oat_phase_status` in `state.md`:

- `in_progress` — phase is actively being worked on
- `complete` — phase is finished
- `pr_open` — post-PR review posture. Set by `oat-project-pr-final`. Agents should route to `oat-project-revise` (for feedback) or `oat-project-complete` (when approved).

`pr_open` is not the source of truth for actual PR existence. That is tracked separately in `state.md` via:

- `oat_pr_status` — PR lifecycle state (`ready`, `open`, `closed`, `merged`)
- `oat_pr_url` — tracked PR URL when a PR exists

## Lifecycle progression

Typical progression:

1. Discovery in progress
2. Ready for spec
3. Spec in progress
4. Ready for design
5. Design in progress
6. Ready for plan
7. Plan in progress
8. Ready for implement
9. Implement in progress
10. Implement complete (final review passed)
11. PR open (`pr_open`) — post-PR review posture; actual PR existence is tracked via `oat_pr_status` / `oat_pr_url`
12. Revision loop (optional): `pr_open` → revise → `in_progress` → implement → `pr_open`
13. Complete

Lite progression:

1. Plan in progress (`oat_workflow_mode: lite`, `oat_phase: plan`)
2. Ready for implement (one approval; no discovery, spec, or design states)
3. Implement in progress (single phase, no HiLL checkpoint pauses)
4. Implement complete (final review passed)
5. PR open (`pr_open`) — lite closeout routes straight to `oat-project-pr-final`
6. Complete

A lite project that outgrows one sitting can move to the quick chain with `oat
project promote <project-path> --to quick`, which flips `oat_workflow_mode` to
`quick` and sets `oat_phase: discovery` with `oat_phase_status: complete`. See
[Lifecycle](../workflows/projects/lifecycle.md#promoting-a-lite-project-to-quick).

Brief progression:

1. Plan in progress (`oat_workflow_mode: brief`, `oat_phase: plan`) — `oat-project-brief` owns the interview, the artifact review, any configured gate, and the single approval
2. Ready for implement (`plan.md` complete and pointing to `oat-project-implement`)
3. Implement in progress — progress counts phase-units; a phase is accepted only by `**Status:** completed` under its heading in `implementation.md`
4. Implement complete (final review passed). While any phase-unit is provisional or unaccepted, the router's brief-unit guard sends the project back to `oat-project-implement` ("Incomplete phase-units remain in the active scope") before every later check
5. PR open (`pr_open`) through the same post-implementation sequence as quick
6. Complete

A brief project can move to the quick chain with `oat project promote
<project-path> --to quick`; quick plan readiness stays false while
`oat_promotion_pending_phases` lists phases that still need tasks. See
[Lifecycle](../workflows/projects/lifecycle.md#promoting-a-brief-project-to-quick).

### Goal progression

A goal project runs the brief chain once per milestone. `oat_phase` and
`oat_phase_status` keep their meaning; the milestone loop lives in its own
`state.md` fields, owned as follows:

| `oat_milestone_status` | Meaning                                                  | Next owner and transition                                                                                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aligning`             | The next milestone is being planned or awaits activation | `oat-project-goal` activates it (`implementing`) after review, its `plan` carrier, approval, and the previous delivery observed at its agreed endpoint                                                                                                                                                           |
| `implementing`         | The milestone's phase-units are executing                | Implement's milestone closeout runs the `exit` gate and writes `reviewing`                                                                                                                                                                                                                                       |
| `reviewing`            | The exit carrier is fresh; the integrated review is next | `oat-project-review-receive` writes `delivering` on a clean receive of the integrated review, or `implementing` when fixes are queued                                                                                                                                                                            |
| `delivering`           | A passed, fresh integrated review and exit carrier       | `oat-project-pr-progress` registers the delivery (`dNN`) and writes `delivered`; stale evidence sends it back to `reviewing`; `oat-project-review-receive` returns it to `implementing` when a delivery-time review queues fixes                                                                                 |
| `delivered`            | The delivery is registered, open and review-ready        | `oat-project-goal` re-aligns (`aligning` for the next milestone) once the delivery reaches its endpoint, or records the terminal declaration; `oat-project-pr-progress` returns it to `reviewing` when `oat-project-goal` hands back a stale delivery whose integrated review or exit carrier is no longer fresh |

`oat_goal_status` is `active` until the user declares the goal met
(`declared_met`) with an exhaustive `oat_goal_outcome_audit`. Recovery of an
older milestone's delivery is recorded in `oat_goal_recovery` and never moves
`oat_milestone` or its status. `oat-project-revise` may return the active
milestone from `delivered` or `delivering` to `implementing` for inline
feedback. The router reads only these persisted fields; delivery freshness
comes from `oat project delivery refresh` and `oat project delivery check`.

`delivered` and the registry's `at_endpoint` are different: `delivered` means
the pull request is registered and open, `at_endpoint` means it has reached
the agreed endpoint (`open` or `merged`). Re-alignment may draft and approve
the next milestone while a `merged` endpoint is pending, but activation waits
for it. Terminal closeout (`oat project closeout-check`,
`oat project complete-state`) requires the declaration, the audit and delivery
coverage of every accepted phase. A goal project can move to quick at a settled
delivery boundary; see
[Lifecycle](../workflows/projects/lifecycle.md#promoting-a-goal-project-to-quick).

## Review progression

In `plan.md` Reviews table:

- `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

## Guardrail

Do not move to the next lifecycle state if review/state artifacts indicate unresolved gates.

## Reference artifacts

- `.oat/projects/<scope>/<project>/state.md`
- `.oat/projects/<scope>/<project>/plan.md` (`## Reviews`, and `## Milestones` for goal)
- `.oat/projects/<scope>/<project>/implementation.md`
