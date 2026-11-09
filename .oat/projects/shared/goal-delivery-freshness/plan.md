---
oat_template: false
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-11-09
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # [] = none for brief modes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: brief
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_auto_review_at_hill_checkpoints: false # brief: no checkpoints
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

1. **Workflow-owned writes stay bookkeeping.** A successor commit keeps a
   delivery's integrated review and exit carrier fresh when every path it
   changes is admitted bookkeeping, now including any file directly under this
   project's `reviews/` or `reviews/archived/` (whichever evidence it belongs
   to) and any file under `.oat/repo/pjm/backlog/`. A successor that also
   touches code, tests, skills, docs or a decision record stays stale, and the
   existing guards still stop a sibling artifact from moving a delivery's
   review identity or revisions. Evidence: `delivery/evidence.test.ts` cases
   for each, including one mixed-path commit; a can-fail proof for the new
   branches; and a branch-build probe on a scratch goal repo.
2. **Operator waiver for head-movement staleness.** `oat project delivery
waive` appends a waiver to one registered delivery (who, why, when, and the
   waived head for each member, observed live) and, in the same `state.md`
   write, restores that delivery's stored `integrated_review.disposition` to `passed`, records the live observations it made, sets `oat_milestone_gates[mNN].exit.freshness` to `fresh` (clearing `freshness_reason`) when the delivery is its milestone's latest registered delivery, never touches the set-once `exit_gate`, and clears an
   `oat_goal_recovery` record that targets it. It refuses under
   `OAT_AUTONOMOUS=1`, when live observation fails, for a delivery that is
   already fresh, and unless the delivery's governing Reviews row names its
   recorded integrated-review artifact with status `passed` and every carrier a consumer judges for it (the milestone working carrier and the delivery's `exit_gate`) has outcome `allowed`. Refusals carry a stable code under `--json`. The freshness evaluator then judges commits
   after the reviewed head from the waived head instead, leaving every other
   check unchanged, so a waiver covers head movement only and never a missing
   or failed review or a missing, blocked or reconfigured carrier. With no
   further change, `delivery check --subject dNN` reports `status: ok`, the
   router stops routing the delivery to recovery, and `closeout-check` and
   `complete-state` succeed; closeout lists the waiver. A later commit after a waived head that is not bookkeeping, or a later review that queues fixes, stales the delivery again; a later passed review or carrier at a descendant head is judged from its own reviewed head as today. Evidence: evaluator and CLI tests with negative
   controls (a later substantive commit, a waived head that is not the observed
   head, an autonomous run, a waiver on a sibling delivery, a governing row
   with fixes queued, a blocked carrier, a base change, an edited earlier waiver entry, a waiver followed by a new passed review at a descendant head that stays fresh, plus an unwaived control), a can-fail proof per clause, and a
   branch-build probe that refreshes a squash-merged stale delivery, waives it,
   checks that the router and closeout clear, and completes the project.
3. **Prevention and routing.** `oat-project-pr-progress` tells whoever merges
   a goal milestone PR to run `oat project delivery check --subject dNN`
   first and re-gate or waive when it is stale, in its registration report and
   in the milestone PR body. Where its `dNN` re-checks (items 3a and 8) find a
   delivery stale past its endpoint, they offer the operator the waiver instead
   of a recovery that cannot complete. Evidence: skill contract tests over the
   new sentences, and the routed skill prose.
4. **Contracts and docs agree.** Brief contract sections 12.6 (recovery
   clearing), 12.7 (the delivery entry and "deliverable"), 12.8 (bookkeeping
   paths) and 12.9 (closeout coverage), the delivery and closeout docs pages
   and the CLI reference describe the new bookkeeping paths and the waiver.
   Evidence: the doc and contract diffs, the skill-contract vitest suites,
   `pnpm check`, the skill-bump gate and the lockstep version gates.

## Approach

Both changes sit in the shared delivery-evidence evaluator
(`packages/cli/src/commands/project/delivery/evidence.ts`), which `delivery
check`, `delivery refresh` and `closeout-check` all route through, plus the new
`delivery waive` command. The waiver restores the delivery's stored record when
it is written, so the readers of that record (the control-plane router, the
`deliverable` predicate in `delivery/check.ts`, `evaluateGoalCoverage` in
`closeout-check/closeout-invariant.ts`, and `complete-state` through
`checkProjectCloseout`) need no waiver logic of their own.

### Design

- **Bookkeeping paths (p01).** `classifyPath` returns `review-artifact` for any
  single file directly under the project's `reviews/` or `reviews/archived/`,
  not only the evidence's own artifacts. Before its project-directory check it
  returns a new `backlog` kind for paths under `.oat/repo/pjm/backlog/`, and
  `judgeBookkeepingChange` accepts additions, modifications and deletions for
  that kind (`inspectCommit` diffs with `--no-renames`, so a rename arrives as
  a deletion plus an addition). Each changed path is judged on its own. The
  own-evidence and review-row identity guards stay as they are: path
  membership admits a commit, and the identity guards still judge what it does
  to the delivery record.
- **Waiver record (p02).** `GoalDelivery.freshness_waivers` is an append-only
  list of `{ waived_by, reason, waived_at, members: [{ url, waived_head }] }`,
  following `DR-260927-operator-waiver-for-test-only`. The control-plane types
  and state parser carry it. The evaluator's delivery-record rules admit
  appending an entry, together with the restored disposition and carrier
  freshness, as a bookkeeping change, and treat an edit to an earlier entry as
  substantive. For a merged delivery, whose member range no longer changes,
  git history is the audit trail.
- **Waiver consumption (p02).** In the review and exit-carrier freshness
  evaluations, when the latest waiver names a member and the walk's own anchor (the member's reviewed head, or the carrier's reviewed head) equals or is an ancestor of its `waived_head`, the successor walk for that member starts at the `waived_head`; otherwise a newer review or carrier supersedes the waiver and the walk starts at its own anchor, as today. All
  other checks (review presence, scope, bound revisions, base, carrier
  outcome, subject, override and configuration) run unchanged, for the
  carrier each consumer already judges (the working carrier for `delivery
check` and `refresh`, the delivery's `exit_gate` for closeout). The waiver
  is honored for `--subject dNN`; the `--subject mNN` path judges an
  unregistered milestone and has no waiver.
- **Waive command (p02).** `oat project delivery waive --project <path>
--delivery dNN --reason <text> [--by <name>]` observes the members live, as
  `delivery refresh` does, checks the refusals in Outcome 2, and writes the waiver, the observations and the restored record in one `state.md` write. A missing local
  object for a member head refuses with a hint to fetch the PR head.

## Constraints and Out of Scope

- **Constraint:** the waiver is operator-only: no skill or autonomous run
  issues one on its own. The command enforces this (`OAT_AUTONOMOUS=1`
  refuses); consumers do not try to tell a hand-written entry from a
  command-written one.
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
- **Out of scope:** changing when or how the gate CLI commits its artifacts,
  and moving decision-record commits earlier in the workflow (the
  decision-record half of BL-261108-stop-workflow-owned-commits stays a
  workflow practice).
- **Out of scope:** an OAT-enforced merge block; merges happen outside OAT.

## Decisions

- **Backlog writes count as bookkeeping** (operator, 2026-11-09): items and the
  generated index are tracking records that never ship. Rejected: `reviews/`
  only, which keeps the m02 failure.
- **The waiver is a structured record on the delivery** (operator,
  2026-11-09), so all three evaluators read the same record. Rejected: a
  `Delivery waived:` journal line, which code would have to parse from prose.
  It is an append-only list, as in DR-260927, so earlier waivers stay
  auditable.
- **Any stale delivery may be waived, bound to the exact waived heads**
  (operator, 2026-11-09). Limiting it to merged deliveries protects nothing,
  because the operator can merge and then waive; the head binding stops a
  waiver from covering later pushes. Rejected: endpoint-only eligibility.
  This departs from DR-260927's commit-range binding, because a squash merge
  leaves no range on `main` to name.
- **A waiver covers head movement only** (operator, 2026-11-09): it never
  replaces a missing or failed review or a missing, blocked or invalid exit
  carrier. Rejected: covering any not-fresh evidence.
- **Prevention is prose, not a gate** (operator, 2026-11-09): pr-progress and
  the milestone PR body name the pre-merge `delivery check`. Rejected: no
  prevention.
- **A `delivery waive` command writes the waiver** (operator, 2026-11-09), so
  it is validated when it is written. Rejected: hand-editing `state.md`.
- **The waiver restores the stored record** (operator, 2026-11-09, after brief
  review round 2): `delivery waive` is the one sanctioned writer that moves a
  stale disposition back to `passed`, so the router, check and closeout need
  no waiver logic. Rejected: teaching every reader of the stale record about
  waivers, which needed five consumers changed.
- **One delivery: one PR to main** (operator, 2026-11-09). Rejected: shipping
  UP-02 as its own PR first.
- **Brief workflow fits:** one delivery with a design agreed in conversation;
  phases need intent and exit evidence, not an up-front task plan.

## Known Unknowns

- Whether the backlog index regeneration writes outside
  `.oat/repo/pjm/backlog/` — Settled by: p01
- Whether a waiver also appears in `oat_goal_outcome_audit` (as
  BL-261108-give-goal-closeout-a-recorded's acceptance asks) or only in the
  closeout output, summary and PR body; any departure from the backlog
  criterion is recorded in the journal's Deviations — Settled by: p02
- Where in pr-progress items 3a and 8 (and `oat-project-goal`'s hand-back)
  the waiver offer belongs — Settled by: p03

## Delivery endpoint and authority

- **Endpoint:** merged — one PR to `main`, merged by the operator.
- **Authority:** the operator approves the brief, any change to Outcomes,
  Constraints or Decisions, and the merge. The agent decides phase-local
  design inside the Approach and logs it.
- **Brief approved:** 2026-11-09 by user at b17ce58a9cf7ed38a9a44a325b0b561a3e85ce47

## Milestones

<!-- Reserved for goal mode. Brief projects deliver once and leave this section empty. -->

## Phase p01: Workflow-owned writes stay bookkeeping

**Intent:** Admit this project's `reviews/` and `reviews/archived/` files and `.oat/repo/pjm/backlog/` paths as bookkeeping successors in `classifyPath`, keeping the identity guards, and update brief contract section 12.8 to match (the skill version bump lands in p03). Incident: m01 exit run 3 (gate artifact commit) and the m02 backlog write. Size: S.
**Exit evidence:** New `delivery/evidence.test.ts` cases (a sibling review artifact stays fresh, a backlog add or archive stays fresh, a mixed commit of `state.md`, a sibling artifact and a backlog add stays fresh, a code or decision-record successor stays stale, a sibling artifact still cannot move review identity), with the identity and stale controls run through `deliveryEvidenceScope` and repeated with the built CLI (`node packages/cli/dist/index.js project delivery check`) on a scratch goal repo beside an accepted control; each new branch shown able to fail; and the focused delivery and closeout suites and `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation` green.
**Provisional:** no

## Phase p02: Head-bound freshness waiver

**Intent:** Add `freshness_waivers` to the delivery schema and parser; re-anchor the review and exit-carrier successor walks on a member's waived head; admit an appended waiver with its restored record as bookkeeping; add the operator-only `oat project delivery waive` command that appends the waiver, restores the stored disposition and, for the milestone's latest delivery, the working carrier's freshness, and clears a targeting recovery; and update brief contract sections 12.6, 12.7 and 12.9. Incident: d01 (#400) could never close out. Size: M.
**Exit evidence:** Evaluator and CLI tests with the Outcome 2 negative controls, a can-fail proof per clause, router and `complete-state` tests on a fixture whose only refusal was a waived delivery, the skill-contract vitest suites green, and a closeout-output assertion that names the waiver, and a branch-build probe that refreshes a squash-merged stale delivery, waives it, and completes the project.
**Provisional:** yes

## Phase p03: Pre-merge prose, waiver routing and docs

**Intent:** Add the pre-merge `delivery check` instruction to `oat-project-pr-progress` (registration report and milestone PR body), accept a waived delivery in its registration, 3a and recovery-target steps, route a delivery that is stale past its endpoint to the waiver, update the delivery and closeout docs and CLI reference, and make the skill and lockstep version bumps. Incident: d01. Size: S.
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

| Scope | Type     | Status  | Date       | Artifact                                                                                                                                                | Reviewed Head                            | Invocation | Gate Target                              |
| ----- | -------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ---------------------------------------- |
| plan  | artifact | passed  | 2026-11-09 | structured (3 attempts, retry bound reached; round 3 H1 waiver re-anchor, M1 carrier write, L1-L3 folded; verified by configured gate (passed 0/0/0/0)) | 5358b2a8a                                | auto       | oat-reviewer-claude-claude-opus-5-5-high |
| p01   | code     | passed  | 2026-11-09 | reviews/archived/p01-review-2026-11-09T032005Z.md                                                                                                       | 7b061c1af55fdca4a71526401d1e04c32b25c0e7 | auto       | oat-reviewer-claude-claude-opus-5-5-high |
| final | code     | pending | -          | -                                                                                                                                                       | -                                        | -          | -                                        |
| plan  | artifact | passed  | 2026-11-09 | reviews/archived/artifact-plan-review-2026-11-09T024116Z.md                                                                                             | 03985c62aa51ed152bd2c5ea04e0cd071df7c451 | gate       | codex-6-sol-xhigh                        |

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
