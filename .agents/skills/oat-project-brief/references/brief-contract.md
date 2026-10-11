# Brief Contract

This is the shared contract for brief-family workflow modes. `brief` delivers
once; `goal` (many milestones) will extend this contract and its sections are
reserved below. Lifecycle skills and agent roles that read a brief project
follow these rules; where a skill restates a rule, this file wins.

## 1. The Project Brief

A brief project has one authored artifact: `plan.md`, titled "Project Brief",
scaffolded from the `plan-brief` template. Its frontmatter is the ordinary plan
frontmatter with `oat_plan_source: brief`, so plan consumers keep working.
Only the body differs. Sections, in order:

| Section                         | Content                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Goal                            | The outcome and why it matters.                                                                           |
| Outcomes                        | Numbered observable outcomes, each naming its intended evidence. Completion is audited against this list. |
| Approach                        | The agreed architecture. An optional `### Design` subsection; longer notes go in `references/`.           |
| Constraints and Out of Scope    | Rules the work respects and adjacent work excluded.                                                       |
| Decisions                       | One line and rationale per decision, including the alternatives rejected.                                 |
| Known Unknowns                  | Deliberately open questions, each with the phase that settles it.                                         |
| Delivery endpoint and authority | What "delivered" means, who approves what, what the agent decides alone. Recorded once and reused.        |
| Milestones                      | Reserved for goal mode; brief projects leave it empty.                                                    |
| Phases                          | `## Phase pNN:` blocks (section 2).                                                                       |
| Parallelism                     | Declared phase groups (`oat_plan_parallel_groups`).                                                       |
| Reviews                         | The review table, preserved row by row.                                                                   |
| Implementation Complete         | Filled at closeout.                                                                                       |
| References                      | Journal, research, and project log locations.                                                             |

Planned proof lives in the brief; observed evidence lives in
`implementation.md`. The brief has no Status paragraph and no Continuations
section, and never carries `### Task` headings.

## 2. Phase grammar

Each phase is one `## Phase pNN: <name>` heading, a blank line, and these exact
lines:

```markdown
**Intent:** what this phase changes and why
**Exit evidence:** the verification that shows the phase is done
**Provisional:** no
```

- `**Intent:**` and `**Exit evidence:**` are required and non-empty.
- `**Provisional:**` takes `yes` or `no`; absent means `no`. The first phase is
  never provisional. Only the next phase must be concrete.
- Phase IDs are stable and never reused. Document order, not numeric order,
  governs execution and review ranges. Revision phases use `p-revN`.
- Validation is strict and fence-aware: `oat project validate-plan` applies the
  brief profile and reports `brief-no-phases`, `brief-duplicate-phase`,
  `brief-phase-missing-intent`, `brief-phase-missing-exit-evidence`,
  `brief-provisional-invalid`, `brief-first-phase-provisional`, and
  `brief-malformed-phase-heading` as errors, and `brief-task-headings-ignored`
  as a warning.

Within the approved outcomes, constraints, authority, and evidence, the agent
may add, split, or reorder phases and make provisional phases concrete without
re-approval, logging each change in `project-log.md` when the project log is
enabled (otherwise in the journal). Parallel groups may be declared whenever
their phases become concrete.

## 3. Journal and progress

`implementation.md` is the per-phase journal. Each `## Phase pNN:` heading in
the brief is one **phase-unit**. Progress counts units, not tasks.

**Phase markers** are exact lines directly under the journal's phase heading:

- `**Status:** pending | in_progress | completed | failed | extracted`
- `**Base:** <full SHA>`, captured before phase work starts
- `**Head:** <full SHA>`, the candidate head captured when the phase ends
- `**Executor:** root | phase-implementer:<id> | worker:<id> | inline:<exception-ref> | reconciled`
- `**Extracted to:** <slug>`, required with `extracted` (goal mode only);
  `extracted` without it reads as `pending`
- `**Corrects:** pNN` on a revision phase

Phase ownership ends at the next line starting with `#`, including a
`### Task` heading, so a task record's status is never read as its phase's
status.

**Unit precedence**, per phase: extracted (excluded from totals); provisional
(always incomplete, regardless of any marker); accepted (`**Status:**
completed`); otherwise incomplete. `**Status:** completed` means accepted:
verification, review dispositions, queued fixes, and selected gates are
settled. Finalization requires every unit in scope to be accepted.

## 4. Readiness and the design strand

The interview is conversational and runs in readiness rounds. Batch
independent questions, sequence dependent ones, and ask a single question when
its answer reshapes the rest. Each question carries a recommendation and its
tradeoff.

- **Facts** that code, docs, or research can settle are the agent's job and
  never become questions; resolve them without blocking the round.
- **Decisions** belong to the user.
- **Design strand**, proportional to the work: architecture (components,
  boundaries, interfaces, data shapes, where the work sits); behavior (what a
  user or caller observes, captured as Outcomes); alternatives and tradeoffs
  for each consequential decision, with a recommendation and its cost;
  risks and unknowns, which become research or prototype phases.
- Questions that matter inside one phase go to Known Unknowns with the phase
  that settles them; only decisions that change the brief or the phase split
  stay in the interview.

**Readiness** is design alignment, not a round count: outcome, boundaries,
approach, evidence, and remaining uncertainty are understood and the user has
explicitly accepted the design. Brief approval confirms a design the user has
already agreed to; it is never the first time the user sees it. Interview
length alone never forces a different workflow.

**Realignment.** A material change (to an Outcome, a Constraint, the
authority, the endpoint, a reversal of a Decision, or a departure from the
Approach) triggers a short, focused realignment with the user before work
continues. Phase-local design inside the agreed Approach is the agent's
decision and is logged.

## 5. Review ladder

Before implementation:

1. The brief is written and committed.
2. Independent artifact review of the committed brief. The reviewer gets the
   brief and this contract, not the session. Minor findings are folded;
   material findings return to the user as a focused realignment.
3. The configured gate for `oat-project-brief` runs on the committed bundle
   (reruns bounded by its `maxAttempts`). Its outcome is recorded as
   `oat_brief_gate` with the core fields of the gate approval record.
4. One user approval of the reviewed brief.

During implementation:

1. Author self-check with fresh verification evidence, and outcomes re-read
   against the brief.
2. A fresh independent review of each phase on its anchored range.
3. The optional `oat_phase_review_gate`, unchanged and off by default.
4. A final integrated independent review.
5. The configured implement exit gate.

Exhausted correction rounds never convert blocking findings into acceptance.

## 6. Execution precedence

Project scheduling is separate from phase execution:

1. Run ready, concrete, declared parallel phase groups (worktree per phase,
   merged back in document order).
2. For a non-group phase, fan out from the root when at least two bounded
   slices pass the independence test.
3. Otherwise delegate one phase implementer.
4. Work inline only through an exception recorded before editing that holds
   for the whole phase: no new surface, no unresolved design, no consequential
   change, and one existing proof command. File count alone is not a
   predicate; reclassify when scope grows.

**Independence test** for phases and slices alike: no shared files, state,
generated files, lockfiles, formatter or build output, fixtures, or services,
and no sequential dependency. A parallel phase is also a coherent deliverable
on its own.

There is one committing owner per worktree: the root for a root fan-out, the
phase implementer for its phase worktree. Nested workers return edits on owned
paths and never commit. Parallel phase worktrees write phase-local records;
the root reconciles them into `implementation.md` at fan-in. The phase-start
record names the executor, worktree, committing owner, and the parallelism
assessment.

## 7. Execution records

Tasks are execution records, never a plan:

- Open a record when work starts, under its phase in `implementation.md`:
  `### Task pNN-tNN: <name>` with intent, files, proof command, executor, and
  the live handle while in flight.
- Close it when its implementation commit lands, with the commit SHA and
  `**Status:** completed`, or with a terminal status (`failed`, `cancelled`,
  `no-change`) and no fabricated commit. Bookkeeping and merge commits are
  separate from the one implementation commit.
- Whoever executes creates the record. Commit messages keep `(pNN-tNN)`.
- Records are coherent units tied to a commit; not every command or edit
  becomes a record.
- Lookahead is allowed: the root may sketch several independent records before
  dispatching them together. A maintained, approved up-front task plan is a
  promotion to quick, not lookahead.
- Records never change phase totals. Task completion is committed execution;
  phase completion is accepted evidence.
- Resume reconciles open records against `git log` and live handles before any
  redispatch.

## 8. Pointer interpretation

`oat_current_task_id` in `implementation.md` may hold a task ID or a phase ID.
Brief-mode resume resolves a task ID to its phase, a phase ID to itself, and
`null`, an unknown ID, or an extracted or accepted unit to the first incomplete
unit in document order within the active scope.

## 9. Record ownership

| Record                 | Owns                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plan.md` (the brief)  | Intent: outcomes, approach, decisions, phases, review table.                                                                           |
| `state.md`             | Routing, dispatch policy, gate overrides, and the `oat_brief_gate` record.                                                             |
| `implementation.md`    | The per-phase journal: status, anchors, verification results, review disposition, authority changes, deviations, next action, records. |
| `project-log.md`       | Observations and phase amendments, when the project log is enabled.                                                                    |
| `references/research/` | Research and imported material.                                                                                                        |

`pr/` and archived reviews are gitignored; nothing authoritative lives only
there.

## 10. Anchors and review scope

Per-phase review scope comes from the recorded `**Base:**` and `**Head:**`
anchors, not from task-message commit inference. For a requested scope
(`pNN`, a contiguous document-order run `pNN-pMM`, or `final` for every
accepted non-extracted phase including revision phases):

- every base and head exists, and each base is an ancestor of its head;
- the aggregate head is the last selected phase's head, and every selected
  phase head is contained in it;
- sequential phases continue: the next base equals or descends from the
  previous head (bookkeeping commits between phases sit inside the range);
- a parallel group shares its fork base, and each phase head is its
  integration merge on the project branch;
- the range is the first base through the aggregate head.

Missing anchors widen the range to the confirmed merge-base range, using
`(pNN-` commit-message matches only to label commits, never to narrow. Invalid
or contradictory anchors stop and route to `oat-project-reconcile`.

**Late-fix rule.** Fix commits may advance a phase's `**Head:**`, base
unchanged, only while no later phase has a `**Base:**`. Once a later phase has
started, corrections are recorded as an appended revision phase
`## Phase p-revN:` with its own anchors and `**Corrects:** pNN`; the corrected
phase keeps its anchors and its review row is re-evaluated by the revision's
review.

## 11. Promotion to quick

Mode changes are manual. A brief becomes a quick project only through:

```bash
oat project promote "$PROJECT_PATH" --to quick --json
```

There is no reverse direction. Promotion migrates by phase state:

- **Accepted** phases keep their completed execution records, copied into
  `plan.md` as `### Task` entries with the same IDs; failed, cancelled, and
  no-change records stay in the journal and are listed as historical. An
  accepted phase with no completed record gets one synthesized
  `Accepted via phase evidence` task against its phase head.
- **Active** phases keep completed records; unfinished records become the
  first authored tasks during the promoted-brief resume. No acceptance task is
  synthesized for an unaccepted phase.
- **Pending or provisional** phases stay taskless and need authored tasks.

Promotion sets `oat_promoted_from: brief` and lists every phase still needing
tasks in `oat_promotion_pending_phases`; quick plan readiness stays false until
that list is empty. The brief's Goal, Outcomes, Approach, Decisions,
Constraints, Known Unknowns, and delivery endpoint and authority are rendered
into `discovery.md`; the original brief is
archived to `references/brief-archive.md`; existing `## Reviews` rows keep
their cells, and one provenance line under `## Reviews` states that rows dated
on or before the promotion were recorded under workflow mode brief.
`oat-project-quick-start` resumes the promoted project and authors the
pending tasks.

Promotion refuses, writing nothing, with:

- `brief-archive-exists`: `references/brief-archive.md` already exists;
- `extracted-phases`: a journal phase is `extracted`;
- `invalid-brief-plan`: the brief has no parseable phases;
- `missing-phase-head`: an accepted phase has no completed record and no
  `**Head:**` anchor to synthesize from (the refused phases are listed).

## 12. Goal mode (reserved)

Goal mode adds a `## Milestones` index, milestone state, a delivery registry,
milestone-scoped gates, re-alignment at each delivered milestone, and terminal
closeout by verified delivery coverage. It is not registered yet; its
sections will be added here when it ships.
