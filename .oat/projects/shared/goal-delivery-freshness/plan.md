---
oat_template: true
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-09
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # [] = none for brief modes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: brief
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Project Brief: goal-delivery-freshness

> Execute this brief using `oat-project-implement`. Phases are the units of
> progress: each `## Phase pNN:` block carries intent and exit evidence instead
> of planned tasks, and only the next phase must be concrete. Execution records
> (`### Task pNN-tNN:`) live in `implementation.md`, never here.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

**Phase block grammar (strict):** each phase is one `## Phase pNN: <name>`
heading followed by a blank line and these exact lines:

```markdown
**Intent:** one or more non-empty lines
**Exit evidence:** one or more non-empty lines
**Provisional:** no
```

Phase IDs are stable and document order governs execution. `**Provisional:**`
accepts `yes` or `no`; absent means `no`. The first phase must not be
provisional. Do not add `### Task` headings to phases.

## Goal

Make goal mode usable through a whole run: the workflow's own commits must not
stale milestone delivery evidence, and an operator must be able to record why
a stale delivery is accepted so `closeout-check` and `complete-state` can still
finish. Both gaps blocked review-gate-integrity-goal: m01's exit gate and m02's
evidence went stale from workflow-owned commits, and d01 (#400) could never
close out after a post-gate fix was squash-merged
(BL-261108-stop-workflow-owned-commits, BL-261108-give-goal-closeout-a-recorded).

## Outcomes

1. **Workflow-owned writes stay bookkeeping.** A successor commit that changes
   only files directly under this project's `reviews/` or `reviews/archived/`,
   or only files under `.oat/repo/pjm/backlog/`, keeps a delivery's integrated
   review and exit carrier fresh, whichever evidence the review artifact
   belongs to. A successor that also touches code, tests, skills, docs or a
   decision record stays stale, and the existing guards still stop a sibling
   artifact from moving a delivery's review identity or revisions. Evidence:
   `delivery/evidence.test.ts` cases for each, a can-fail proof for the new
   branches, and a branch-build probe on a scratch goal repo.
2. **Operator waiver for a stale delivery.** `oat project delivery waive`
   records a `freshness_waiver` on one delivery (who, why, when, and the
   waived head for each member). `oat project delivery check`, `delivery
refresh` and `oat project closeout-check` then report that delivery
   `waived` rather than stale and print the waiver; a commit after a waived
   head that is not bookkeeping stales it again. The command refuses under
   `OAT_AUTONOMOUS=1`, for a head that is not the member's observed head, and
   for a delivery that is already fresh. Writing the waiver into `state.md` is
   a bookkeeping change. `oat project complete-state` succeeds on a project
   whose only closeout refusals were waived deliveries. Evidence: CLI and
   evaluator tests with negative controls (later substantive commit, wrong
   head, autonomous run, waiver on a sibling delivery, unwaived control), a
   can-fail proof per clause, and a branch-build probe that waives a
   squash-merged stale delivery and completes the project.
3. **Prevention and routing.** `oat-project-pr-progress` tells whoever merges
   a goal milestone PR to run `oat project delivery check --subject dNN`
   first and re-gate or waive when it is stale, in its registration report and
   in the milestone PR body. When a delivery is stale after reaching its
   endpoint, the recovery route offers the waiver instead of a recovery that
   cannot complete. Evidence: skill contract tests over the new sentences, and
   the routed skill prose.
4. **Contracts and docs agree.** Brief contract section 12.8, the delivery and
   closeout docs pages and the CLI reference describe the new bookkeeping paths
   and the waiver. Evidence: the doc diffs, `pnpm check`, the skill-bump gate
   and the lockstep version gates.

## Approach

Both changes sit in the shared delivery-evidence evaluator
(`packages/cli/src/commands/project/delivery/evidence.ts`), which `delivery
check`, `delivery refresh` and `closeout-check` already share, so one change
keeps all three consistent. `complete-state` refuses through
`checkProjectCloseout`, so it needs no change of its own.

### Design

- **Bookkeeping paths (p01).** `classifyPath` returns `review-artifact` for any
  single file directly under the project's `reviews/` or `reviews/archived/`,
  not only the evidence's own artifacts. Before its project-directory check it
  returns a new `backlog` kind for paths under `.oat/repo/pjm/backlog/`, and
  `judgeBookkeepingChange` accepts additions, modifications, deletions and
  renames for that kind. The own-evidence and review-row identity guards stay
  as they are: path membership admits a commit, and the identity guards still
  judge what it does to the delivery record.
- **Waiver record (p02).** `GoalDelivery.freshness_waiver` is
  `{ waived_by, reason, waived_at, members: [{ url, waived_head }] }`.
  The control-plane types and state parser carry it, and the evaluator's
  delivery-record rules admit adding or replacing it as a bookkeeping change.
- **Waiver consumption (p02).** When a delivery's review or exit evidence is
  stale, the evaluator checks the waiver. It covers the delivery when every
  member's observed head equals its waived head, or descends from it through
  bookkeeping commits only. A covered delivery reports `waived`, with the
  waiver, in all three commands. `closeout-check` treats it as covered and
  lists it, so the closeout output stays an audit trail.
- **Waive command (p02).** `oat project delivery waive --project <path>
--delivery dNN --reason <text> [--by <name>]` writes the waiver for the
  member heads currently observed, refusing as Outcome 2 lists. It replaces an
  earlier waiver on the same delivery.

## Constraints and Out of Scope

- **Constraint:** the waiver is operator-only: no skill or autonomous run
  issues one on its own (`OAT_AUTONOMOUS=1` refuses), matching
  `DR-260927-operator-waiver-for-test-only`.
- **Constraint:** a waiver is bound to exact heads; it never covers a later
  substantive commit.
- **Constraint:** decision records and other `.oat/repo` paths stay
  substantive for freshness.
- **Out of scope:** first-release versions in summaries
  (`BL-261108-derive-first-release-versions`).
- **Out of scope:** reopening or re-completing review-gate-integrity-goal,
  which was closed out manually.
- **Out of scope:** exit-gate freshness for brief and quick projects
  (`BL-260820-track-pr-closeout-evidence`).
- **Out of scope:** changing when or how the gate CLI commits its artifacts.
- **Out of scope:** an OAT-enforced merge block; merges happen outside OAT.

## Decisions

- **Backlog writes count as bookkeeping** (operator, 2026-11-09): items and the
  generated index are tracking records that never ship. Rejected: `reviews/`
  only, which keeps the m02 failure.
- **The waiver is a structured field on the delivery** (operator,
  2026-11-09), so all three evaluators read the same record. Rejected: a
  `Delivery waived:` journal line, which code would have to parse from prose.
- **Any stale delivery may be waived, bound to the exact waived heads**
  (operator, 2026-11-09). Limiting it to merged deliveries protects nothing,
  because the operator can merge and then waive; the head binding stops a
  waiver from covering later pushes. Rejected: endpoint-only eligibility.
- **Prevention is prose, not a gate** (operator, 2026-11-09): pr-progress and
  the milestone PR body name the pre-merge `delivery check`. Rejected: no
  prevention.
- **A `delivery waive` command writes the waiver** (operator, 2026-11-09), so
  it is validated when it is written. Rejected: hand-editing `state.md`.
- **One delivery: one PR to main** (operator, 2026-11-09). Rejected: shipping
  UP-02 as its own PR first.
- **Brief workflow fits:** one delivery with a design agreed in conversation;
  phases need intent and exit evidence, not an up-front task plan.

## Known Unknowns

- Whether the backlog index regeneration writes outside
  `.oat/repo/pjm/backlog/` — Settled by: p01
- Whether a waiver should also appear in `oat_goal_outcome_audit`, or only in
  the closeout output — Settled by: p02
- Which goal or pr-progress step hands a stale delivery that is past its
  endpoint to recovery today, and where the waiver offer belongs — Settled
  by: p03

## Delivery endpoint and authority

- **Endpoint:** merged — one PR to `main`, merged by the operator.
- **Authority:** the operator approves the brief, any change to Outcomes,
  Constraints or Decisions, and the merge. The agent decides phase-local
  design inside the Approach and logs it.

## Milestones

<!-- Reserved for goal mode. Brief projects deliver once and leave this section empty. -->

## Phase p01: Workflow-owned writes stay bookkeeping

**Intent:** Admit this project's `reviews/` and `reviews/archived/` files and `.oat/repo/pjm/backlog/` paths as bookkeeping successors in `classifyPath`, keeping the identity guards, and update brief contract section 12.8 to match. Incident: m01 exit run 3 (gate artifact commit) and the m02 backlog write. Size: S.
**Exit evidence:** New `delivery/evidence.test.ts` cases (a sibling review artifact stays fresh, a backlog add or archive stays fresh, a code or decision-record successor stays stale, a sibling artifact still cannot move review identity), each new branch shown able to fail, the focused CLI suites green, and a branch-build probe on a scratch goal repo.
**Provisional:** no

## Phase p02: Head-bound freshness waiver

**Intent:** Add `freshness_waiver` to the delivery schema and parser, consume it in the shared evaluator so `delivery check`, `delivery refresh` and `closeout-check` report waived deliveries, admit the waiver write as bookkeeping, and add the operator-only `oat project delivery waive` command. Incident: d01 (#400) could never close out. Size: M.
**Exit evidence:** Evaluator and CLI tests with the Outcome 2 negative controls, a can-fail proof per clause, `complete-state` succeeding on a fixture whose only refusal is waived, and a branch-build probe that waives a squash-merged stale delivery and completes the project.
**Provisional:** yes

## Phase p03: Pre-merge prose, waiver routing and docs

**Intent:** Add the pre-merge `delivery check` instruction to `oat-project-pr-progress` (registration report and milestone PR body), route a delivery that is stale past its endpoint to the waiver, update the delivery and closeout docs and CLI reference, and make the skill and lockstep version bumps. Incident: d01. Size: S.
**Exit evidence:** Skill contract tests pinning the new sentences, the doc diffs, and the full Definition of Done gate list green.
**Provisional:** yes

---

## Parallelism

Phases that have no overlapping file modifications may run concurrently. To declare parallelism:

```yaml
oat_plan_parallel_groups: [['p02', 'p03']]
```

Each inner array is a group of phases that execute in parallel (each in its own worktree) and merge back in plan order after all pass. Groups may be declared whenever the phases become concrete.

Default is `[]` (fully sequential, no worktrees).

---

## Reviews

| Scope | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| plan  | artifact | pending | -    | -        | -             | -          | -           |
| p01   | code     | pending | -    | -        | -             | -          | -           |
| final | code     | pending | -    | -        | -             | -          | -           |

Add one `code` row per phase as phases become concrete. For code-review events,
`Reviewed Head` is the full 40-character SHA at the head of the reviewed range.
Writers must preserve every existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase p01: [Description]

**Total: [N] phases**

Ready for final code review and PR preparation.

---

## References

- Journal: `implementation.md`
- Research: `references/research/`
- Project log: `project-log.md` (when enabled)
