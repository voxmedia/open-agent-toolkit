---
oat_retro_project: review-gate-integrity-goal
oat_retro_generated: 2026-11-08T20:02:02Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: pr-progress-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: gate-analysis-outputs
    status: used
  - source: git-history
    status: used
  - source: session-transcript
    status: used
  - source: session-transcript-pre-handoff
    status: unavailable
oat_retro_promotions: complete
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: review-gate-integrity-goal

## Executive Summary

The goal shipped three milestones: m01 (#400), m02 (#403) and m03 (#407). It
was declared met on 2026-11-08 with Outcome 6 (p09) deferred to
BL-260820-track-pr-closeout-evidence. The receive and gate paths now settle
bookkeeping-only findings without a new gate. They also bind review events to
exact heads, list pending reviews before a PR opens, and report gate convergence
and finding classes.

The run was expensive for what it delivered. Two things drove the cost: rework
of gate and freshness checks, and hardening that went past what the observed
cases needed:

- The m01 exit gate ran five times, and only the first run found a code
  defect.
- The p02 verifier was built through four review rounds and then reverted.
- m03's p08 was over-built until the operator stopped the hardening on
  2026-11-08.
- One delivery (d01) closed with stale evidence that closeout cannot repair
  after a squash merge.

Next time, apply the scope check at every goal amendment, keep workflow-owned
commits from staling milestone evidence, and settle PR-bot findings before
merging.

## Evidence and Review Method

**Durable artifacts (all confirmed by direct reads):**

- `plan.md`: Goal, Outcomes, Decisions, Milestones and the `## Reviews` table.
- `state.md`: the delivery registry, `oat_goal_outcome_audit` and the
  milestone gate carriers.
- `implementation.md`: phase sections, recovery events, `## Reviews and Gates`,
  `## Deviations from Plan / Design` and `## Final Summary`.
- `summary.md`, the three `pr/progress-m0N-*.md` files, and git history on
  `main` and the closeout branch.
- `project-log.md`: 12 learnings and 57 structural entries. This project has
  no `oat-execution-learnings.md`.

**Local-only evidence (gitignored, never archived):**

- The 48 review artifacts under `reviews/archived/`. Only frontmatter and
  finding titles were read.
- The m01 gate envelopes and stderr under `analysis/`.

**Session evidence:**

- The main Claude Code session, `25cb0228…`, from 2026-11-02 to 2026-11-08,
  which went through 15 compactions.
- Six gate-child sessions.
- Only user-typed messages and question/answer pairs were extracted.
- The sessions that ran p01–p02 on 2026-11-01 come before the 2026-11-02
  handoff and are not in this worktree's transcript directory
  (`session-transcript-pre-handoff: unavailable`).
- Claims about those phases rest on the journal and the review artifacts.

**Method:**

- Three read-only reconnaissance lanes covered durable outcomes,
  log/review/gate taxonomy and session chronology.
- The root synthesized their reports and re-verified the load-bearing anchors
  against committed files.
- One lane claim was corrected during that check (see the Codex incident
  below).
- Labels: **Confirmed** means directly supported by durable evidence.
  **Hypothesis** means plausible but unproven. **Inconclusive** means the
  mechanism is not established.

## Outcome Snapshot

| Milestone / delivery | Phases                        | PR / squash      | First release     | Exit gate (accepted)                   |
| -------------------- | ----------------------------- | ---------------- | ----------------- | -------------------------------------- |
| m01 / d01            | p01, p02 (reverted), p10, p11 | #400 `c7cd3b715` | 0.3.44            | `f588e505` 0/0/0/1, run 5 of 5         |
| m02 / d02            | p07, p12, p13, p-rev1–p-rev3  | #403 `9da04ef1c` | 0.3.47 (with m03) | `81c12aac` 0/0/0/0, 1 refused + 3 runs |
| m03 / d03            | p08, p14, p15, p16            | #407 `1385637f5` | 0.3.47            | `9c23d08c` 0/0/0/0, 2 runs             |

- **Outcome audit:** `met_with_deferrals` (`state.md`
  `oat_goal_outcome_audit`). Outcomes 1–5 and 7 are met; Outcome 6 (p09) is
  deferred to the backlog.
- **Decision records:** DR-261102-bookkeeping-only-review,
  DR-261106-read-side-supersession, DR-261108-finding-classes-recorded-at and
  DR-261108-goal-exit-gate-resolves-final.
- **Closeout:** `closeout-check` still refuses because d01's evidence is
  stale. The operator accepted d01 as delivered (`919ae6a9d`). `complete-state`
  was not run. The closeout records are in PR #409.

## Current State

- **Promotions:** `complete`. RP-01 through RP-03 are `applied` (AGENTS.md);
  RP-04 is `applied` (BL-261103-codex-gate-target-loses).
- **Filing:** `complete`. UP-01 through UP-03 are `filed` as repository
  backlog items (destination commit `89cdeb15d`, unpushed):
  - UP-01: BL-261108-give-goal-closeout-a-recorded;
  - UP-02: BL-261108-stop-workflow-owned-commits;
  - UP-03: BL-261108-derive-first-release-versions.
- **Unsettled items:** none.

## What Went Well

- **The scope-down call on p02 was made early and paid off. Confirmed.** A
  complexity review of the built verifier showed it would have settled about 1
  of the 7 recorded incidents. The brief was amended to a prose-only rule
  (p10/p11), and the verifier was reverted rather than finished (`8427732e8`,
  inline exception p02-ie1). Its code stays recoverable from `7cb72f013`.
- **Branch-build probes caught behavior the installed toolchain could not
  show. Confirmed.** The gate's reviewers load the released skills. So the
  p08, p13 and p15 probes (`references/probes/`) were the only evidence that
  the new behavior worked before release.
- **Deferring nonblocking PR-bot findings kept d02's evidence fresh.
  Confirmed** (log `rgi-learning-m02-02`). d01 did the opposite and staled.
- **Fixture provenance held once enforced. Confirmed.** After p02's reviews,
  later phases took their fixtures from real output (for example, the m03
  fixtures derived from the captured m02 run). No invented-fixture finding
  recurred. The can-fail rule held less well: a guard with no test that fails
  without it came back at p08 (Medium) and p13 (Low).
- **The operator's own model pipeline was followed throughout. Confirmed**
  (session, 2026-11-02): Opus implements, Opus self-reviews, Sol gates.

## Challenges and Struggles

### m01 exit gate needed five runs; one found a code defect

- **What happened:**
  1. Run 1 (`d434e7e7`) found M1. The p11 Head anchor missed fix
     `395b90677`, so the head had to advance and the gate ran again.
  2. Run 2 (`48f5553c`, Codex/Sol) completed its review and committed a
     0/0/0/0 artifact. It then failed with `review_failed` /
     `unexpected_post_selection_failure`, because the route receipt was
     missing. Its stderr contains no emitted `Gate route: inline
(runtime=codex…)` line. A control Codex run (`goal-gate-amend-r1`) does
     emit one. Why the line was missing is **Inconclusive**: the reviewer may
     have skipped Step 6.1 or the route command may have failed silently.
  3. Run 3 (`0380f6e0`) passed but read stale. The gate CLI had committed run
     1's artifact (`40e839667`) after the reviewed head, and the delivery check
     counts that commit as a disallowed successor.
  4. Run 4 (`96d2da99`) passed. The m01 integrated review then found two Lows
     (fix p11-t07), which forced the head to advance again.
  5. Run 5 (`f588e505`) was accepted.
- **Impact:** about four reruns spent on process, not code, and a stranded
  `received` row. All accepted runs were same-family, because the one
  cross-family target was the run that failed.
- **Response:** filed BL-261103-codex-gate-target-loses and recorded learnings
  `rgi-m01-codex-route-receipt` and `rgi-m01-gate-artifact-freshness`.
- **Result:** m01 shipped. Confirmed by `implementation.md` "## Reviews and
  Gates" and `analysis/m01-exit-gate-attempt{1..5}*`.

### The p02 verifier consumed four review rounds before it was retired

- **What happened:** the reviews found 7 High, 7 Medium and 12 Low findings
  across four rounds. The causes were:
  - invented fixtures;
  - a self-attested "gate proof" format that no producer emits;
  - identity binding on date cells;
  - a catch-all neutralization proof where per-guard proofs were needed.
- **Response:** the complexity review above. The verifier was reverted.
- **Result:** the m01 brief was amended and the phase IDs retired. Confirmed by
  the `reviews/archived/p02-review-*` artifacts and "## Phase p02".

### m03 grew hardening no observed case needed

- **What happened:**
  - p08 added about 450 lines that infer plan-gate amendments from approval
    dates and carriers, for a case that had never happened (log
    `review-gate-integrity-goal-learning-m03-01`).
  - p14 accumulated Low-severity routing refinements.
  - On 2026-11-08 the operator asked what the milestones were still delivering
    and whether the work had become over-engineering.
- **Response:** the operator cut the p14 L1/L2/L3/L5 round and limited p15 to
  its stated intent ("## Phase p15 / Scope note"). The PR #407 self-review
  findings (C1–C3, T1–T4) went to BL-261108-simplify-m03-gate-convergence
  rather than into m03.
- **Contributing factor (Hypothesis):**
  - Of the 26 multiple-choice prompts in the session, one was rejected, one
    got a free-text answer, and every other one got the option marked
    "(Recommended)".
  - So amendment phases recommended by the agent were approved with little
    friction.
  - AGENTS.md Feature Planning Triage asks for exactly this scrutiny, but
    nothing reminded anyone to apply it at a goal re-alignment.

### Squash-merged d01 cannot be re-gated

- **What happened:** the Bugbot fix `4a870d471` landed after d01's gates, and
  #400 was merged without re-gating; the operator said "fix them and dont gate
  just merge the pr". Fresh evidence would have to bind that exact head, which
  after the squash merge is not an ancestor of `main`. The recovery owner,
  `oat-project-pr-progress`, could not be invoked by the model at the time.
- **Impact:** `closeout-check` refuses permanently, and `complete-state` was
  not run.
- **Result:** the operator accepted d01 by hand at closeout. The lifecycle
  files kept their pre-closeout state; see Remaining Boundaries. Confirmed
  (log `review-gate-integrity-goal-learning-closeout-01`).

### Workflow-owned commits staled milestone evidence

- **What happened:** a backlog commit under `.oat/repo` made after m02's
  reviewed head made `delivery check` report the exit gate and review stale.
- **Response:** the operator chose to drop the commit and refile the item from
  `main` (log `rgi-learning-m02-01`).
- **Knock-on effect:** three decision records then waited until summary time
  (`461985414`). That broke the brief's constraint that decision records ship
  with their delivery (plan.md Constraints). Confirmed.

### Smaller friction (all Confirmed)

- **Two recovery events with the same cause** (`rgi-p10-rec-01`,
  `rgi-p13-rec-01`). Edits to `.agents/docs/autonomy-contract.md` needed version
  bumps in skills that vendor it by symlink or through
  `references/gate-inventory.md`. `check:skill-bumps` diffs committed history
  only, so it passed before the commit and failed after.
- **`oat sync` from the installed CLI** deleted newer provider views on a
  branch that had merged a newer `main` (`rgi-p10-sync-gotcha`).
- **m02's exit gate refused `final`** (`788ae91a`), because the scope expanded
  across m01's squash-merged anchors. Each rerun needed manual range routing
  until p15.
- **Each m02 exit rerun found a new ledger-parsing Medium**, which led to
  three late-fix revision phases (p-rev1, p-rev2, p-rev3). p-rev3 then hit the
  three-cycle cap with one new Low edge case per round.
- **#405 shipped 0.3.46 before #403 merged** at the same version. So m02
  first released in 0.3.47, the generated summary got it wrong, and
  `31efee2f6` corrected it.
- **The p02 phase gate hit a weekly usage limit** (`c9c091b6`). It was
  reported as `unexpected_post_selection_failure`.

## Decision Register

| Decision                                                             | Record                                  | Consequence                                                              |
| -------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Bookkeeping-only findings are fixed at receive, recorded `passed`    | DR-261102-bookkeeping-only-review       | No re-gate for record corrections; doubtful findings are not bookkeeping |
| Supersession is computed on read, not repaired by a mutating command | DR-261106-read-side-supersession        | Replaced the operator's first choice after the m02 amendment review's H1 |
| Finding classes are recorded at receive                              | DR-261108-finding-classes-recorded-at   | `new-hardening` findings reach the operator before any fix work          |
| Goal exit gate resolves `final` to the milestone                     | DR-261108-goal-exit-gate-resolves-final | Ends manual range routing after squash merges                            |
| Accept d01 with stale evidence; defer p09                            | `implementation.md` Final Summary       | Goal `met_with_deferrals`; closeout-check refusal accepted               |

## Rejected or Superseded Alternatives

- **Rejected at the 2026-11-02 amendment:** finishing the p02 verifier, and
  adding a `resolved` review status (about 9 reader edits). The prose-only rule
  replaced both.
- **Superseded:** a bookkeeping-receive repair for stale events. It would have
  set another event to `passed`, so it gave way to read-side supersession.
- **Not tried:** stacked milestone branches. The plan chose a merged endpoint
  per milestone instead. That choice is the precondition for the squash-merge
  closeout gap.

## Where We Changed Course

| Trigger                                          | Changed direction                                                   | Outcome                              |
| ------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------ |
| p02 complexity review                            | Retire p03–p06, add p10/p11, revert verifier                        | m01 shipped as a prose rule (#400)   |
| #233 not bookkeeping-only                        | Use the wave-skills-promotion p05 gate as the Outcome 1 walkthrough | Operator accepted (Deviations row 2) |
| m02 exit-gate Mediums after p13 had a Base       | Late-fix revision phases p-rev1–p-rev3                              | m02 exit passed at `c08b2c054`       |
| `final` refused across squash-merged anchors     | Manual range routing, then p15 / BL-261104                          | Fixed in m03                         |
| Operator: is this over-engineering? (2026-11-08) | Stop hardening; cut p14 Lows; p15 intent only; defer simplification | m03 landed; BL-261108 filed          |
| Model-invocation gate on pr-progress and goal    | Separate T3 thread removed the gate                                 | #408 merged                          |
| p09 and d01 at declaration                       | Declare met with deferrals; accept d01                              | Closeout PR #409                     |

## Domain Learnings

- **Freshness checks see every commit after a reviewed head.** Gate artifacts,
  backlog writes and decision records all count unless the check excludes
  them. Decide where workflow-owned writes go before the milestone gates run,
  not after.
- **A squash merge ends the recovery window.** After it, evidence bound to a
  pre-merge head can never be re-bound. Re-gate a post-gate fix, or record a
  waiver for it, before the merge.
- **Released toolchain lags self-hosting work.** A project that changes the
  gate and review skills is gated by the previous release. Branch-build probes
  are the only proof of the new behavior until a release and
  `oat tools update`.
- **Low-severity edge cases do not converge on their own.** A parser over
  hand-edited ledgers yields a new malformed-row case on every review round.
  Cap them or defer them deliberately rather than chasing them to the cycle
  limit.

## Gotchas for Humans

- **Run `pnpm run check:skill-bumps` after committing, not before.** It diffs
  committed history only. When you edit any `.agents/docs/*.md` file, bump
  every skill that vendors it.
- **Do not run `oat tools update` during an active goal** unless you mean to
  change the skill versions its gates use. This run hit it on 2026-11-07.
- **Before merging a goal milestone PR,** re-gate any post-gate fix or record
  a waiver for it. Closeout cannot do it later.
- **"(Recommended)" options are the agent's judgment, not a scope check.** At
  each re-alignment, ask what observed incident each new phase addresses.

## Gotchas for Autonomous Agents

- **Never export `HOME` in a shared shell.** Prefix it inline on the one
  command that needs an isolated home (`rgi-learning-p01-home-leak`).
- **After merging a newer `main`, sync provider views with the branch build**
  (`node packages/cli/dist/index.js sync --scope project`), not the installed
  or `npx` CLI.
- **Keep `.oat/repo` backlog and decision writes off a milestone branch** once
  its gates have reviewed a head. Land them with the delivery's bookkeeping, or
  from `main`.
- **A green gate envelope from a fallback target is degraded evidence.**
  Report the same-family fallback rather than presenting it as cross-family
  review.

## Repo Improvements (Promotion Register)

### RP-01: Sync provider views with the branch build after merging a newer main

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** AGENTS.md
- **Disposition-note:** —

**Problem.** AGENTS.md "Keeping instructions current" tells agents to run
`npx @open-agent-toolkit/cli sync --scope project` after rule changes. On a
branch that has merged a `main` newer than the published CLI, that command
deleted main's newer provider views (`rgi-p10-sync-gotcha`). Only the branch
build regenerated them correctly.

**Proposed change.** Add one sentence after that instruction: on a branch whose
`main` is newer than the released CLI, run the branch build
(`node packages/cli/dist/index.js sync --scope project`, after `pnpm build`)
instead.

### RP-02: State that the skill-bump gate needs a commit and covers vendored docs

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** AGENTS.md
- **Disposition-note:** —

**Problem.** Two recovery events (`rgi-p10-rec-01`, `rgi-p13-rec-01`) had the
same cause:

- An edit to `.agents/docs/autonomy-contract.md` needed version bumps in skills
  that vendor it by symlink or through a reference file.
- `check:skill-bumps` passed before the commit and failed after, because it
  diffs committed history only.

**Proposed change.** Add to the Skills Discovery version-bump bullets:

- A file under `.agents/docs/` that skills vendor counts as a bundled file of
  every vendoring skill.
- `pnpm run check:skill-bumps` checks committed history only, so run it after
  committing.

### RP-03: Apply Feature Planning Triage at goal re-alignment

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** AGENTS.md
- **Disposition-note:** —

**Problem.** m03 added hardening phases (p08, p14) at re-alignment without the
triage AGENTS.md requires. p08's amendment inference addressed no observed
case. The operator had to stop the growth after the fact (2026-11-08). Goal
amendments are approved as recommendations, so the scope check has to happen
when the agent proposes the phase.

**Proposed change.** Add one sentence to "Feature Planning Triage": a goal
re-alignment or brief amendment that adds or widens a phase is a planning
change under this rule. The proposal names the observed incident each new phase
addresses and its estimated size before the operator is asked to approve.

### RP-04: Record the m01 attempt-2 diagnosis on the Codex route-receipt backlog item

- **Type:** docs
- **Disposition:** apply
- **Status:** applied
- **Target:** .oat/repo/pjm/backlog/items/BL-261103-codex-gate-target-loses.md
- **Applied-ref:** .oat/repo/pjm/backlog/items/BL-261103-codex-gate-target-loses.md
- **Disposition-note:** —

**Problem.** BL-261103's first acceptance criterion asks for the root cause of
the missing route receipt. This retro found evidence that narrows it, and the
item does not record it:

- The failing run's stderr (`48f5553c`) contains no emitted
  `Gate route: inline (runtime=codex…)` line.
- A successful Codex control run (`goal-gate-amend-r1`) emits two.

So the receipt was never written; it was not written and then lost.

**Proposed change.** Append a short "Diagnosis notes (2026-11-08)" paragraph to
the item's Description:

- the absent route line in the failing run versus its presence in the control;
- that the cause (the reviewer skipped Step 6.1, or the route command failed
  silently) is still inconclusive.

Do not change the acceptance criteria.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Give goal closeout a recorded path for a squash-merged delivery with stale evidence

- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-261108-give-goal-closeout-a-recorded.md
- **Destination-receipt:** 89cdeb15daae51b40539a223b79870599a42a4ee
- **Remote-visibility:** unpushed
- **Sanitized:** yes
- **Disposition-note:** Filed as a new high-priority backlog item; related BL-260820 and BL-261102 are distinct.

**Problem.** When a post-gate fix lands on a milestone PR and the PR is
squash-merged, the delivery's integrated review and exit gate read stale
forever:

- Fresh evidence must bind a head that is no longer an ancestor of `main`.
- `oat project closeout-check` refuses.
- The only remaining step is a manual acceptance outside the state machine.
- `complete-state` cannot run, so `state.md`, `implementation.md` and
  `plan.md` keep their pre-closeout status.

**Evidence.** d01 in review-gate-integrity-goal: post-gate fix `4a870d471`,
#400 squash-merged, operator acceptance `919ae6a9d`. BL-261102 covers a
different closeout gap, for legacy-shaped projects.

**Suggested direction.** Either refuse a goal milestone merge while
post-gate commits are unwaived (prevention), or accept a recorded operator
waiver for a stale delivery at closeout, so `closeout-check` and
`complete-state` can finish with the waiver in the audit.

### UP-02: Stop workflow-owned commits from staling milestone delivery evidence

- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-261108-stop-workflow-owned-commits.md
- **Destination-receipt:** 89cdeb15daae51b40539a223b79870599a42a4ee
- **Remote-visibility:** unpushed
- **Sanitized:** yes
- **Disposition-note:** Filed as a new high-priority backlog item.

**Problem.** `oat project delivery check` treats every commit after a reviewed
head as a disallowed successor, including commits the workflow itself makes:

- The gate CLI committed its own artifact after an advanced head, which staled
  m01 exit run 3.
- A `.oat/repo` backlog write after m02's reviewed head staled m02's evidence.

The workarounds were a rerun, and dropping and refiling the backlog commit,
which also pushed decision records past their delivery.

**Evidence.** Learnings `rgi-m01-gate-artifact-freshness` and
`rgi-learning-m02-01`; m01 exit run `0380f6e0` (successor `40e839667`). That
the `.oat/repo` case is unintended is a Hypothesis.

**Suggested direction.** Classify gate-artifact commits and `.oat/repo`
record writes as bookkeeping successors under brief contract section 12.8, or
record them explicitly as out of scope for freshness.

### UP-03: Derive release versions in the project summary from tags

- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-261108-derive-first-release-versions.md
- **Destination-receipt:** 89cdeb15daae51b40539a223b79870599a42a4ee
- **Remote-visibility:** unpushed
- **Sanitized:** yes
- **Disposition-note:** Filed as a new low-priority backlog item.

**Problem.** The generated summary stated the wrong first release for two
milestones (0.3.45 instead of 0.3.44 for m01, and 0.3.46 instead of 0.3.47 for
m02). The version in the PR's `package.json` is not the first release that
carries the change once another lockstep PR ships that version first. An
independent fact-check caught both errors, and `31efee2f6` fixed them.

**Suggested direction.** Have `oat-project-summary` derive "first released in"
from `git tag --contains <squash commit>` (the earliest release tag), or omit
the version when no tag carries the commit yet.

## Remaining Boundaries and Follow-Ups

- **Owner: operator.** Merge PR #409 (closeout records).
- **The project log's "End-of-run synthesis" was pending when this retro was
  generated.** `oat project log check` reported `synthesis_pending`. The log
  is not sealed. Whoever performs terminal completion owns writing it.
- **Lifecycle files were not moved to completion,** because `complete-state`
  was not run:
  - `state.md` body still read "Implement (m03)";
  - `implementation.md` still had `oat_status: in_progress`;
  - `plan.md` "## Implementation Complete" was unfilled.

  This depends on UP-01, or on a manual closeout the operator authorizes.

- **Open follow-ups:**
  - BL-261108-simplify-m03-gate-convergence: m03 simplification.
  - BL-260820-track-pr-closeout-evidence: Outcome 6 (p09).
  - BL-261103-codex-gate-target-loses: Codex route receipt.
- **A stale version reference to fix:**
  `.agents/skills/oat-project-review-receive/SKILL.md:151` says "older than
  0.3.46" and should say 0.3.47. Fixing it needs a skill version bump, so it
  was left out of #409.

## Reflections

- **What the run taught:**
  - Most of the cost came from proving the gate and freshness checks were
    satisfied, not from the behavior changes.
  - The project improved review integrity while its own runs kept hitting the
    unreleased gaps it was fixing: whole-project `final`, workflow-owned
    successors, and model-gated recovery skills.
- **Why the shipped result is trustworthy:**
  - Every accepted phase has a reviewed head.
  - Each milestone passed an exit gate and an integrated review at the head
    that merged. d01 is the exception: its post-gate Bugbot fix merged without
    re-gating.
  - Branch-build probes and can-fail proofs cover the behavior the released
    gate could not exercise.
- **What to do differently:**
  - Size each goal amendment against an observed incident.
  - Decide before the gates run where workflow-owned writes land.
  - Settle PR-bot findings before merging rather than at closeout.
  - When a reviewer turns up the third malformed-ledger edge case, stop and
    ask whether the parser should accept less input. Fixing one more case
    rarely ends the series.
