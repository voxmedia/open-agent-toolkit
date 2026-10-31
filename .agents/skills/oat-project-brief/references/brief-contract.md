# Brief Contract

This is the shared contract for brief-family workflow modes. `brief` delivers
once; `goal` delivers in many milestones and extends this contract in section 12. Lifecycle skills and agent roles that read a brief or goal project follow
these rules; where a skill restates a rule, this file wins.

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
| Milestones                      | Goal mode's canonical milestone table (section 12.1); brief projects leave it empty.                      |
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

**Marker ownership.** The root writes `**Base:**` in the phase-start commit
before dispatch; the committing owner writes `**Head:**` when the phase's work
ends, before its review; only the root writes `**Status:** completed`, at
acceptance.

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

Goal mode runs this ladder once for the brief and once for each amendment, and
reorders the end of the implementation ladder for milestone delivery (section
12.5).

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

| Record                 | Owns                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plan.md` (the brief)  | Intent: outcomes, approach, decisions, phases, review table.                                                                                                                                                                                                                                                                                                                                                                      |
| `state.md`             | Routing, dispatch policy, gate overrides, and the `oat_brief_gate` record.                                                                                                                                                                                                                                                                                                                                                        |
| `implementation.md`    | The per-phase journal: status, anchors, verification results, review disposition, authority changes, next action, records; fixed slots `## Orchestration Runs` (one run line per request id), `## Reviews and Gates` (multi-phase receipts, gate lines), `## Deferred Findings` (approved deferrals, excluded phases, unmerged worktrees), `## Deviations from Plan / Design` (deviations, override lines), `## References` last. |
| `project-log.md`       | Observations and phase amendments, when the project log is enabled.                                                                                                                                                                                                                                                                                                                                                               |
| `references/research/` | Research and imported material.                                                                                                                                                                                                                                                                                                                                                                                                   |

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
- a parallel group shares its fork base, and member heads advance in document
  order on the project branch; each head is the member's integration head,
  normally a merge commit, but the merge-commit property is not enforced
  because a member may be integrated by cherry-pick;
- the range is the first base through the aggregate head.

A group member's per-phase review runs before fan-in on
`EXPECTED_HEAD..<worktree head>` with `oat_review_scope_source: anchors`; the
fan-in anchors govern `pNN-pMM` and `final`.

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

**Goal promotion.** A goal project promotes the same way, only at a settled
delivery boundary: `oat_milestone_status: delivered`, every `oat_deliveries`
entry `at_endpoint` or `superseded` (none `registering` or `open`), no pending
`oat_goal_recovery`, and no extracted phase. Promotion writes
`oat_promoted_from: goal`; the provenance line under `## Reviews` names
workflow mode goal; `oat_deliveries`, `oat_milestone_gates` and
`oat_goal_outcome_audit` stay in the promoted `state.md` and are copied into
`references/brief-archive.md` under the archived brief. The promoted-brief
resume and its `oat_promotion_pending_phases` readiness clause are shared;
there is no second readiness predicate. A goal that is not settled refuses,
writing nothing, with:

- `goal-milestone-active`: the active milestone is not `delivered`;
- `goal-delivery-unsettled`: a delivery is `registering` or `open` (the
  unsettled delivery IDs are listed), or the milestone is `delivered` while
  `oat_deliveries` is empty or missing: `delivered` means a registered delivery
  exists (section 12.7), so an empty registry is contradictory, never vacuously
  settled;
- `goal-recovery-pending`: `oat_goal_recovery` is not null;
- `extracted-phases`: as above, matching the migration's refusal of every
  extracted phase.

## 12. Goal mode

A goal project (`oat_workflow_mode: goal`, `oat_plan_source: goal`) is a brief
that delivers in milestones. Sections 1–11 apply to goal unless this section
says otherwise. `oat-project-goal` owns the brief, each milestone's
re-alignment and activation, and the terminal declaration; the review, delivery
and implement skills own the transitions named in section 12.3.

### 12.1 Milestones table

The brief's `## Milestones` section holds one canonical table. One shared
reader (`readMilestoneMembership` in control-plane `state/milestones.ts`) reads
it for both project readers, the router, `oat project validate-plan` and the
delivery commands, so a membership error is reported once and never dropped.
The grammar is fence-aware (fenced and indented code is ignored):

- exactly one `## Milestones` heading; the section ends at the next line
  starting with `#`;
- prose, blank lines and HTML comments in the section are ignored, and the
  first `|` line opens the one table; a second table is malformed;
- the header's first two cells are exactly `Milestone` and `Phases`, followed by
  a separator row of `---` cells; the scaffold renders exactly
  `| Milestone | Phases |` and `| --------- | ------ |`;
- each row names one milestone ID (`m01`; `m1` normalizes to `m01`) and a
  comma-separated list of phase IDs, each optionally in backticks (`p01`,
  `p-rev1`), normalized on read;
- the list order is the milestone's ordered phase set; trailing columns after
  `Phases` are ignored.

```markdown
| Milestone | Phases             |
| --------- | ------------------ |
| m01       | p01, p02, `p-rev1` |
| m02       | p03                |
```

Membership is checked against the brief's full phase inventory. Every
executable phase, revision phases included, belongs to exactly one milestone. A
phase the journal marks `extracted` is exempt from `phase-without-milestone`.
The seven reader error codes:

| Code                           | Meaning                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `milestones-missing`           | The brief has no `## Milestones` section.                                                                                             |
| `milestones-malformed`         | A second heading or table, a non-canonical header, no separator row, a row naming no milestone ID, or a token that is not a phase ID. |
| `milestone-duplicate`          | A milestone is declared more than once.                                                                                               |
| `milestone-empty`              | A milestone row lists no phases.                                                                                                      |
| `milestone-unknown-phase`      | A row lists a phase the brief does not declare.                                                                                       |
| `phase-in-multiple-milestones` | A phase is listed twice, in one milestone or in two.                                                                                  |
| `phase-without-milestone`      | An executable phase belongs to no milestone.                                                                                          |

`oat project validate-plan` applies the goal profile on top of the brief
profile: each reader code is reported as its `goal-` counterpart
(`goal-milestones-missing`, `goal-milestones-malformed`,
`goal-duplicate-milestone`, `goal-milestone-empty`,
`goal-milestone-unknown-phase`, `goal-phase-in-multiple-milestones`,
`goal-phase-without-milestone`), plus `goal-plan-source`,
`goal-shipped-milestone-changed` and `goal-delivered-scope-changed` (a
registered delivery's frozen scope or milestone no longer matches the table),
`goal-group-crosses-milestone` (a parallel group spans milestones) and
`goal-noncanonical-phase-id` (a persisted phase-ID list is not canonical).
Appending a correction phase to a milestone is permitted; removing or
reassigning a phase frozen in a registered delivery is refused.

### 12.2 Milestone and goal state

`oat-project-goal` initializes and owns these `state.md` fields:

- `oat_milestone: mNN`, the active milestone;
- `oat_milestone_status: aligning | implementing | reviewing | delivering | delivered`;
- `oat_goal_status: active | declared_met`;
- `oat_goal_outcome_audit: null` until the terminal declaration (section 12.9);
- `oat_goal_recovery: null` until a recovery is opened (section 12.6);
- `oat_milestone_gates: { mNN: { plan, exit } }`, one entry per milestone;
- `oat_deliveries: []`, the delivery registry (section 12.7).

`oat_current_task_id` keeps the section 8 meaning, scoped to the active
milestone's ordered phase set.

### 12.3 Transitions and owners

| From → To                              | Owner                                 | Prerequisite                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| new → aligning                         | `oat-project-goal`                    | scaffold rendered `oat_plan_source: goal`                                                                                                                                                                                                                                                                                                                                  |
| aligning → implementing                | `oat-project-goal`                    | artifact review passed, `plan` carrier `allowed`, approval, and the next phase and every member of the next dispatched group concrete                                                                                                                                                                                                                                      |
| implementing → reviewing               | implement milestone closeout          | every unit in the milestone scope accepted; `exit` carrier `allowed` and fresh                                                                                                                                                                                                                                                                                             |
| reviewing → delivering                 | `oat-project-review-receive`          | clean receive of the exact integrated review (`passed`) with scope, revisions and exit carrier still valid                                                                                                                                                                                                                                                                 |
| reviewing → implementing               | `oat-project-review-receive`          | fixes queued from the integrated review                                                                                                                                                                                                                                                                                                                                    |
| delivering → implementing              | `oat-project-review-receive`          | fixes queued from a delivery-time review                                                                                                                                                                                                                                                                                                                                   |
| delivered \| delivering → implementing | `oat-project-revise`                  | inline feedback with an explicit active-milestone target; the appended `p-revN` joins the milestone row; delivery evidence invalidated (writes status and pointer)                                                                                                                                                                                                         |
| delivering → reviewing                 | `oat-project-pr-progress`             | `oat project delivery refresh` reports the integrated review or `exit` carrier stale for the active milestone's delivery                                                                                                                                                                                                                                                   |
| delivered → reviewing                  | `oat-project-pr-progress`             | `oat-project-goal` hands back a stale `delivered` milestone (Step 5.5 item 3a) and refresh or check reports its registered delivery's integrated review or `exit` carrier not fresh; `oat_phase_status` is left for the next activation to reset                                                                                                                           |
| delivering → delivered                 | `oat-project-pr-progress`             | delivery registered, members open, review fresh; for an already-registered delivery, a deliverable check of that `dNN` (no new registration)                                                                                                                                                                                                                               |
| delivered → aligning                   | `oat-project-goal`                    | learnings captured (section 12.10: the categorized project-log write, or its warned attempt when the log is disabled and absent) and fresh observations establish the previous delivery at its agreed endpoint; the activation that follows also writes `oat_phase_status: in_progress` and projects `oat_pr_status`/`oat_pr_url` from the latest member's observed status |
| delivered → terminal                   | `oat-project-goal` (user declaration) | exhaustive outcome audit recorded (section 12.9)                                                                                                                                                                                                                                                                                                                           |

Review-provide records its Reviews event as `received` and never writes
`delivering`; `fixes_completed` is not a passed review. The router reads only
persisted state and never evaluates Git.

**`delivered` versus `at_endpoint`.** `delivered` means the milestone's
delivery is registered, open and review-ready. `at_endpoint` is the registry's
separately observed endpoint condition: an agreed endpoint of `open` holds when
every member is `open` or `merged`, `merged` when every member is `merged`.
Re-alignment may draft, review and approve the next milestone while awaiting
the endpoint; it never overwrites `oat_milestone` or writes `implementing`
until fresh observations show the previous delivery at its agreed endpoint.
For an agreed endpoint of `open`, the same observation permits activation.

### 12.4 Approval evidence and gate carriers

**Approval write order.** The first approval of the brief is evidenced by
`plan.md` `oat_status: complete`, written once by `oat-project-goal` after the
first artifact review, gate and user approval. Every later approval (each
re-alignment's amendment) is evidenced only by that milestone's `plan` carrier:
`oat-project-goal` writes `oat_milestone_gates[mNN].plan` with `status: allowed`
only after that milestone's artifact review, its gate and its user approval,
in that order. A carrier written earlier is not approval, and `plan.md`
`oat_status` is never rewritten to signal a later approval.

**Carriers.** Each carrier keeps the gate approval record core (`status`,
`disposition`, `config_fingerprint`, `reviewed_head`, `decided_at`) and adds
`resolution` (`configured`, `no_gate`, `project_disabled`), a `subject`
binding, and derived `freshness` (`fresh | stale`) with `freshness_reason`.
Freshness is derived state, never a replacement `status` value.

- `plan` is the milestone-scoped plan gate for the brief or its amendment, run
  by `oat-project-goal` through the configured `oat-project-goal` lifecycle
  gate. Its subject is `{ kind: plan, scope: [the milestone's ordered phase
set], ref: <approved brief or amendment commit> }`. It binds the approved
  brief or amendment and the milestone membership at activation, never a later
  implementation head, so implementation bookkeeping does not invalidate it.
  It carries `freshness` only when a producer marks it `stale`. An amendment
  needs its own artifact review, gate resolution and approval.
- `exit` is the milestone-scoped implement exit gate, run by implement's
  milestone closeout against the milestone scope and required `allowed` and
  fresh before delivery. Its subject is `{ kind: code, scope: [ordered phase
set] }`. Every exit carrier producer writes `freshness: fresh`, `no_gate`
  and `project_disabled` included; an exit carrier with no recorded freshness
  is not fresh.

`reviewed_head` is nullable. A configured gate keeps the head it actually
reviewed. For `no_gate` and `project_disabled`, `reviewed_head` is null because
no review occurred; the resolution and the subject binding together say what
the outcome applies to. Changed gate configuration, override or subject
requires reevaluation and never inherits a fabricated reviewed SHA. The
project-level `oat_implement_exit_gate` is used only at terminal closeout.

### 12.5 Goal exception to the shared ladder

For goal milestone delivery the end of the section 5 implementation ladder is
reordered: the milestone exit gate (`exit` carrier) runs **before** the
integrated delivery review, and queued fixes invalidate both the
integrated-review and the exit-gate evidence, so the gate runs again before the
next integrated review. Routing follows the missing evidence:

1. queued fixes → `oat-project-implement` on the fix scope;
2. a missing, blocked, stale or subject-mismatched exit carrier →
   `oat-project-implement` scoped milestone closeout;
3. with the carrier allowed and fresh, a missing or stale integrated review →
   `oat-project-review-provide`;
4. a produced, unreceived review → `oat-project-review-receive`;
5. a received `passed` review with a fresh allowed carrier → delivery.

Per-phase reviews, the optional phase gate and the author self-check are
unchanged. Terminal closeout runs the ordinary post-implement sequence, with
one goal deferral: while `oat project closeout-check` still reports
`phase-uncovered`, a `summary` step before `pr` writes only project-directory
files and defers its repo-level ledger and decision-record writes until `pr`
has registered the terminal delivery (the summary skill's Step 6, Goal
terminal deferral).

### 12.6 Explicit review scopes and recovery

**Explicit goal review scopes.** A goal integrated review request carries an
explicit milestone or delivery identity and its ordered phase set, for example
`code m01: p01, p02, p-rev1` or `code m01/d01: p01, p02, p-rev1`. That exact
semantic set is preserved in review provenance (`oat_review_phase_ids`); the Git
range may be wider and the review discloses the intervening changes. Membership
is never derived by first–last expansion or commit labels: with m01 owning
`p01, p02, p-rev1` and m02 owning `p03`, a `p01-p-rev1` range would mislabel
`p03`. Pre-fan-in member reviews are member evidence only; delivery evidence
uses integration heads. A late correction is assigned explicitly to its
recovery milestone without moving the active one, and frozen delivery scopes
stay immutable: appending a correction phase never mutates an earlier
delivery's scope.

**Scope cell.** A goal integrated review's `## Reviews` Scope cell is exactly
the milestone ID (`mNN`) or, for a registered delivery, the delivery ID
(`dNN`). The ordered phase set lives in the artifact's `oat_review_phase_ids`
and the request context, never in the Scope cell (readers tolerate a cell of
the form `<id>: …`). The newest `code` row for that label governs; a registered
delivery's recorded `integrated_review` governs only while it names that row's
artifact, and a clean receive rewrites it (`artifact`, `scope`,
`disposition: passed`).

**Recovery record.** Interrupted recovery is persisted as
`oat_goal_recovery: { milestone, delivery_id, phase_ids, stage,
review_artifact }`, where `delivery_id` and `review_artifact` may be null and
`stage` is `implementing | exit_gate | reviewing | receiving | delivering`.
Recovery of an older delivery never changes `oat_milestone`, its status or the
active execution pointer; resume uses the record until it is cleared. Only the
root commits shared routing, registry, gate and acceptance records.

| Owner                        | Recovery action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat-project-review-receive` | Creates the record (stage `implementing`) when fixes target an older delivery; on a clean receive advances it to `delivering`, or back to `implementing` when fixes are queued.                                                                                                                                                                                                                                                                                                                       |
| `oat-project-revise`         | For inline feedback on an older delivery: creates or advances the record (stage `implementing`) with a phase-only `p-revN` assigned to that milestone; never writes the active pointer or status. For an active-milestone target it writes `oat_milestone_status: implementing` and the pointer (the `delivered \| delivering → implementing` row of section 12.3): the one status write revise owns.                                                                                                 |
| `oat-project-implement`      | Fixes accepted → `exit_gate`; scoped closeout carrier `allowed` and fresh → `reviewing`.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `oat-project-review-provide` | Artifact recorded `received` → `receiving`, with `review_artifact` set.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `oat-project-pr-progress`    | For the active milestone's stale delivery: writes `oat_milestone_status: reviewing` and the record, stage by the missing-evidence order of section 12.5, and stops before registration. For an older milestone's delivery: writes only the record. Clears it once the targeted delivery is refreshed fresh; for the active milestone's own delivery, clearing the record and writing `oat_milestone_status: delivered` are one step, and a registered delivery is re-checked, never registered again. |
| `oat-project-reconcile`      | Repairs an interrupted record; never creates one for the active milestone.                                                                                                                                                                                                                                                                                                                                                                                                                            |

`oat project delivery refresh` never writes `oat_milestone_status` or
`oat_goal_recovery`.

### 12.7 Delivery registry

`oat_deliveries` entries carry `delivery_id` (`dNN`, unique), `milestone`, a
`scope` frozen on registration, the agreed `endpoint` (`open | merged`),
`kind: pr | stack`, `status`
(`registering | open | at_endpoint | superseded`), the
supersession links `superseded_by` and `covers_scope_of`, an additive
`corrects_delivery_id`, persisted `lookup` keys (`repository`, `head_branch`,
`head_sha_at_registration`), `members` (`url`, `base`, `reviewed_head`,
`observed_head`, `observed_base`, `status`), the `integrated_review`
(`artifact`, `scope`, `bound_revisions`, `disposition`), the accepted exit-gate
binding `exit_gate`, and the first observed `endpoint_attainment`.

- **Idempotent registration.** The registration owner writes the entry with
  `status: registering` and its `lookup` keys. For `kind: pr`, it commits
  before creating the pull request, then records the URL and `status: open`; on
  resume, `gh pr list --repo <repository> --head <head_branch> --state all
--json url,headRefOid` attaches exactly one match, creates once for zero
  matches, and stops for more than one. For `kind: stack`, registration is
  attach-only: the `registering` write records every existing member URL in
  base-to-tip order, and resume re-checks each URL rather than creating a
  stack. For a PR lookup, more than one stops and routes to
  `oat-project-reconcile`; a missing, closed-unmerged or re-targeted stack
  layer follows the same stop-and-route.
- **Stacked deliveries.** A stack records members base to tip. Its exit carrier
  is judged against the tip member's observed head, and every lower member's
  observed head must be an ancestor of the tip (`stack-order` otherwise); the
  integrated review remains per member. Post-review bookkeeping lands on the
  tip member's branch, because a commit on a lower layer changes upper members'
  bases and stales their review. A misordered stack is never repaired in place:
  replace it through supersession with `covers_scope_of`.
- **Prerequisites.** Before registration the owner runs
  `oat project delivery refresh --project <path>` and
  `oat project delivery check --project <path> --subject <mNN|dNN> --json`; it
  registers only when the check reports `status: ok` (deliverable: a passed,
  fresh integrated review and an allowed, fresh exit carrier). An undeliverable
  subject reports `status: undeliverable` with the full report and exits 1.
- **Supersession.** A replacement names its one direct predecessor in
  `covers_scope_of`, and that predecessor's `superseded_by` points back; the
  registration owner writes both links together. Only a delivery that never
  reached its agreed endpoint may be replaced; the first observed endpoint
  attainment is preserved, and later corrections of such a delivery are
  additive (`corrects_delivery_id`, new phase IDs, no inherited coverage).
- **Shared members.** Terminal deliveries registered from one head branch
  share their member pull request (`gh` allows one open pull request per head
  and base), so one member URL may appear in several deliveries. Coverage
  judges each delivery's own frozen scope and bound evidence, never the shared
  member alone; `oat_pr_url` and `oat_pr_status` project the latest member,
  which is the tip member for a stack.
- **Evidence capture.** The exit-gate result accepted for the delivery is
  persisted as its `exit_gate` with the delivery evidence; overwriting the
  milestone's working carrier for a correction never relabels another
  delivery's historical evidence. Review-receive persists the authoritative
  scope, revision and disposition evidence in tracked records before local
  archival; archived review files are optional local history.
- **Two exit-carrier consumers.** `oat project delivery check` judges the
  milestone's current working exit carrier, `oat_milestone_gates[mNN].exit`,
  and reports it as `exit.source: milestone-carrier`. The closeout boundary
  (`oat project closeout-check`, `oat project complete-state`) judges the exit
  gate persisted with each delivery (`oat_deliveries[].exit_gate`). The two
  consumers are distinct: a fresh working carrier does not repair a stale
  delivery binding, and a correction's new carrier does not rewrite a historical
  binding.
- **Observation.** `oat project delivery refresh` observes members with
  `gh pr view <url> --json state,headRefOid,baseRefOid` and persists only
  observations, endpoint attainment and derived staleness
  (`integrated_review.disposition: stale`, the milestone exit carrier's
  `freshness: stale` with `freshness_reason`). It never rewrites a reviewed
  revision, a member base or the first endpoint attainment, and never
  manufactures a passed review or a fresh carrier. The closeout boundary obtains
  the same observations read-only.

### 12.8 Bookkeeping-successor freshness

Keep `reviewed_head`, the review row's `Reviewed Head`, artifact revision
fields and bound review revisions equal to the revisions actually reviewed;
never advance them because registration, receive or publication advanced HEAD.
Evidence reviewed at R covers a published head H only when R = H, or R is an
ancestor of H and every intervening commit, merge-introduced changes included,
changes only permitted bookkeeping:

- **Paths:** this project's `state.md`, `plan.md`, `implementation.md`,
  `project-log.md`, `summary.md`, and the exact review artifacts belonging to
  the evidence being recorded or archived, and, for a delivery whose member
  pull request is shared (12.7, Shared members), the review artifacts recorded
  for the deliveries that share it; each delivery is still judged on its own
  frozen scope, reviewed revisions and `exit_gate`. `summary.md` is derived
  institutional memory, never the authority for outcomes, approach,
  constraints, decisions or endpoint, which live in the brief; any change to
  it is bookkeeping. Path membership alone is insufficient for the other
  paths.
- **Permitted changes:** routing and progress updates, evidence recording,
  review dispositions, registration and observation metadata, and append-only
  execution observations.
- **Substantive changes:** approved outcomes, approach, constraints, decisions,
  endpoint or authority, phase intent or exit evidence, milestone membership,
  frozen delivery scope, or existing evidence identities and revisions. Added
  evidence must refer to the unchanged subject it records. Executable code,
  tests, configuration, templates, skills and product documentation are never
  bookkeeping.

A substantive change followed by its revert is not a bookkeeping successor.
Missing Git objects, failed inspection, unknown paths or disallowed edits fail
closed. A member base change (`observed_base` differs from `base`) invalidates
delivery evidence independently. Historical deliveries are checked against
their own observed member revisions, never the branch's latest HEAD. Unequal
heads alone never invalidate evidence. A delivery's persisted `exit_gate`,
its `integrated_review` identity (`artifact`, `scope`, `bound_revisions`) and
its `members[].reviewed_head` are set once and are replaced only by a commit
that records a review naming a different artifact of that delivery (an
artifact and its `reviews/archived/` counterpart are the same artifact; a
sharing sibling's artifact never counts; the delivery's own review artifacts
are those its Reviews rows record), with each `reviewed_head` equal to
the head the new `bound_revisions` binds for that member. A bound revision
that disagrees with its member's `reviewed_head` is not fresh
(`bound-revision-mismatch`).

The unlock for those set-once fields, the delivery's own review-artifact set,
is read only from the delivery's append-only Reviews rows, never from
`integrated_review.artifact` or any other registry or brief field the judged
commit can rewrite; bound revisions, member reviewed heads and the exit gate
move only with that unlock. Negative controls for this rule run through the
production scope builder and the built CLI, not a hand-assembled scope.

The shared evaluator (`delivery/evidence.ts`) implements this rule for
`delivery check`, `delivery refresh` and the closeout boundary. It accepts two
deliberate leniencies:

- a modified review artifact is accepted without a frontmatter identity check,
  because the tracked records (the Reviews row and the registry's
  `integrated_review`) are authoritative; and
- a recorded `**Head:**` may be rewritten in a bookkeeping commit under the
  section 10 late-fix rule.

### 12.9 Terminal declaration and outcome audit

Only `oat-project-goal`, after the user's explicit declaration, writes
`oat_goal_status: declared_met` and `oat_goal_outcome_audit`. Implement
consumes the declaration and never declares the goal met. Declaration prevents
activation of another milestone; it does not imply delivery readiness.

```yaml
oat_goal_outcome_audit:
  disposition: met # met | met_with_deferrals
  decided_at: '2026-10-11T12:00:00Z'
  declaration_ref: <where the user's declaration is recorded>
  brief_identity: <approved brief commit>
  phases:
    p01: { disposition: accepted, reason: null, scope_decision_ref: null }
  outcomes:
    '1':
      {
        disposition: met,
        evidence_or_ref: <observed evidence>,
        text: <outcome text as written>,
      }
```

- **Phases.** Every phase in the full inventory has exactly one disposition:
  `accepted` (the phase-unit contract reports acceptance; the phase stays
  subject to delivery coverage), `extracted` (matching brief and journal targets
  and a child with the matching `oat_extracted_from` backlink), `deferred` or
  `retired` (non-empty `reason` and `scope_decision_ref`; the phase stays
  historically incomplete and the audit never fabricates `**Status:**
completed`).
- **Extracted-child deferral.** An extracted phase whose child project is not
  complete keeps disposition `extracted` and records a non-empty `reason` and
  `scope_decision_ref` for the approved deferral of the child's outstanding
  obligation. The audit is then `met_with_deferrals`; under `met` closeout
  refuses with `child-deferral-under-met`.
- **Outcomes.** Every numbered outcome has exactly one disposition, keyed by
  its number and bound to its exact text: `met` with observed evidence,
  `extracted` with the validated child obligation, or `deferred`/`retired` with
  an approved scope decision. Renumbering or changing an outcome's text
  invalidates the audit.
- `met` is permitted only when no obligation is deferred or retired;
  otherwise the audit is `met_with_deferrals`. Unknown, duplicate, omitted or
  contradictory phase or outcome references invalidate it.

**Terminal routing and coverage.** After declaration the router validates the
audit first, then repairs review, gate and delivery obligations through the
owners above, then routes uncovered accepted phases to
`oat-project-pr-final`, which registers the terminal delivery (`kind: pr`,
scope = those phases) through the section 12.7 contract: one terminal
delivery per milestone that owns uncovered phases, because a frozen delivery
scope never spans milestones, all sharing the head branch's member pull
request (section 12.7, Shared members). Audited `deferred`
and `retired` phases leave the terminal execution scope without changing
ordinary progress counts. Declaration opens closeout; coverage completes it:
`oat project closeout-check` and `oat project complete-state` require a valid
declaration, an exhaustive audit and delivery coverage before either
snapshot success or `not_required`, refuse without writing on unreadable
inputs or a failed member observation, and name the next owner in
`nextOwner.skill`.

**Snapshot `pr` step.** When execution of the configured post-implement
sequence reaches the `pr` step's position and coverage holds, implement's
closeout records that step complete with
`satisfied_by: { pr: delivery-coverage }` in the snapshot. The field is goal
only, names only the `pr` step, and is valid only once `pr` is in the completed
prefix; every other configured step runs unchanged.

### 12.10 Re-alignment, project log and learnings

At `delivered`, `oat-project-goal` re-aligns: it runs
`oat project delivery refresh`, captures learnings, runs a delta interview,
amends the brief in place, appends the next milestone's phases and its
`## Milestones` row, repeats the section 5 ladder for the amendment (artifact
review, the next milestone's `plan` carrier, one approval), and activates only
once the previous delivery is observed at its agreed endpoint.

**Learnings captured** (the `delivered → aligning` prerequisite) is a concrete
write, not a reflection: at least one category-bearing judgment entry through
`oat project log append` with `--category`, a stable per-observation
`--source` reused as `--idempotency-key`, and `--origin oat-project-goal`
(the goal skill's learning write). The append consults `workflow.projectLog` only while `project-log.md` does
not exist. When the project log is disabled and absent the append skips
(`status: skipped`); the producer prints one warning line and continues, and
the attempt satisfies the prerequisite. An existing `project-log.md` keeps
accepting the write whatever the flag says
(`DR-260718-automatic-create-on-first`). No producer creates
`oat-execution-learnings.md`.

**Structural log entries.** `oat-project-goal` appends exactly one structural
entry with `oat project log append --structural --producer oat-project-goal
--ref mNN` at each milestone activation and one at each re-alignment entry.
The delivery registration owners append one per registration (section 12.7
owners: `--producer oat-project-pr-progress --ref dNN` or
`--producer oat-project-pr-final --ref dNN`). Skills do not read `workflow.projectLog` themselves: the append creates no
log while it is disabled, and an existing log keeps accepting entries.

### 12.11 Extraction

Extraction is manual in v1.5 and is not `oat-project-split`. A transferred
phase gets `**Extracted to:** <slug>` in the brief and the journal marker pair
`**Status:** extracted` / `**Extracted to:** <slug>`; the child records
`oat_extracted_from: <goal slug>` and the transferred outcome text. The outcome
stays in the goal brief, and the audit requires the child complete or an
approved deferral (section 12.9). Goal promotion to quick refuses any extracted
phase (section 11).
