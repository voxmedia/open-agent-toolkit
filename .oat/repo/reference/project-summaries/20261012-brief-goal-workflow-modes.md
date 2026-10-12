---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-11
oat_generated: true
oat_summary_last_task: p12-t11
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: brief-goal-workflow-modes

## Overview

OAT's workflow modes (spec-driven, quick, import, lite) all front-load planning into task-level artifacts, which fits bounded work badly: either the plan is written before the work is understood or the lifecycle is skipped. This project added two modes that replace up-front task planning with one reviewed Project Brief and record tasks as execution happens: `brief` for a single delivery and `goal` for a greenfield effort delivered in milestones, each ending in its own pull request and re-aligned between deliveries. The design was co-authored with Astra (gpt-6-astra) over seven brainstorm rounds plus five alignment rounds, and the project ran autonomously under the frontier dispatch ceiling with Opus 5.5 implementers and Fable 5.1 reviewers.

## What Was Implemented

- **Mode family (p01–p04):** `brief` and `goal` in `WORKFLOW_MODES` behind one `isBriefMode` seam; phase-unit progress parsing with strict journal markers and the `promotion-pending-phases` readiness clause; brief routes and the brief-unit guard in the router; `plan-brief.md` and `implementation-brief.md` templates with scaffold support; validate-plan profiles for brief; `oat project promote --to quick` with disposition-aware review-row migration.
- **Brief lifecycle skills (p05–p07):** `oat-project-brief` (readiness-round interview, one-pass brief, artifact review and configured gate) and the shared `brief-contract.md`; brief branches in implement, quick-start, review-provide (anchor-based review scope with the commit-grep fallback), review-receive, reconcile, summary, PR, revise, complete, document and brainstorm; agent-role branches.
- **v1 fan-in (p08):** contract tests, sync links, real-artifact probe, docs and diagrams, five decision records, lockstep 0.3.19; shipped as PR #361 from `feat/brief-workflow-mode-v1`.
- **Goal control plane (p09):** `## Milestones` reader, `oat_milestone`/`oat_milestone_status`/`oat_deliveries`/`oat_milestone_gates`/`oat_goal_recovery` state, the goal outcome-audit validator, and `GOAL_ROUTES` with newest-row-wins review lookup.
- **Goal CLI (p10):** twelve goal validate-plan codes; `oat project delivery refresh` and `delivery check` with the shared bookkeeping-successor evidence evaluator; closeout coverage predicate with transitive supersession and the terminal declaration boundary; goal → quick promotion at a settled boundary.
- **Goal skills (p11):** `oat-project-goal`, brief-contract §12, delivery registration and the review-loop owners across pr-progress, pr-final, review-provide, review-receive, reconcile, revise and complete, planning surfaces, summary fingerprint and document.
- **Goal fan-in (p12):** six-mode contract pins, a 22-row real-artifact probe (three probe-driven fixes), docs, six decision records and four backlog items, lockstep 0.3.20, the full gate run, and six evaluator hardening fixes from the p12 and final reviews.

Sixty-four tasks across twelve phases; every phase passed an independent review (nineteen rounds in total); the final integrated review passed at round four with every Definition-of-Done gate green.

## Key Decisions

- **Brief mode family and isBriefMode predicate:** `brief` and `goal` are one family selected by a single predicate at the two project readers, so every consumer branches once.
- **Phase-unit progress contract for brief modes:** a taskless phase is one unit completed by a phase-level status line; review scope comes from recorded base/head anchors; finalization needs every unit complete.
- **Tasks are execution records in brief modes:** tasks are opened at work start and closed at commit, supplementing the phase contract rather than replacing it.
- **Anchor-based review scope for brief modes:** per-phase reviews resolve from `**Base:**`/`**Head:**` anchors with the `(pNN-tNN)` grep as fallback.
- **Brief to quick promotion migrates by phase state:** `oat project promote --to quick` preserves phases, reviews and approvals; no reverse direction.
- **Goal mode delivers one Project Brief in milestones:** the brief carries a Milestones index over global phase ids; re-alignment amends it in place between deliveries.
- **Goal deliveries are registered and delivery coverage closes the goal:** `oat_deliveries` is the registry; terminal closeout satisfies the snapshot `pr` step by verified coverage.
- **Bookkeeping successors keep goal delivery evidence fresh:** reviewed revisions never advance; successor commits are inspected against a confined allowlist (including `summary.md` and sibling artifacts on a shared member PR); review identity and member revisions are set-once and move only with the delivery's own new review artifact.
- **Goal completion requires a declaration and an exhaustive outcome audit:** only the user declares the goal met; implement consumes the declaration and never issues it.
- **Terminal goal deliveries from one head branch share their member PR:** frozen scopes stay per milestone, so terminal deliveries share the branch's single PR and coverage judges each delivery's own scope.
- **Goal milestone extraction is manual in v1.5:** extraction into a linked structured project is a user action; automation is backlog.

## Design Deltas

- The goal declaration lives in the journal's Final Summary rather than the brief's endpoint paragraph (p12 probe fix): a declaration must not count as a substantive brief edit.
- `summary.md` is a bookkeeping path, and goal-mode summaries defer repo-level writes (observations ledger, decision promotion, index) while closeout still reports `phase-uncovered` (p12 reviews).
- Revise owns the `delivered | delivering → implementing` transition for an explicit active-milestone target; pr-progress re-checks an already-registered active delivery before allocating a new one (p11 reviews).
- p10-t01 shipped three validation codes beyond the plan's nine, mapped one-to-one onto the Milestones reader; accepted by review.
- The final review's three evaluator fixes replaced the "any evidence commit unlocks identity fields" rule with set-once identity gated on the delivery's own Reviews rows.

## Notable Challenges

- Disk exhaustion twice stalled dispatch (parallel group 2 degraded to sequential; p10 paused with its half-written task parked as a tracked patch and resumed cleanly).
- A T3 server restart killed the p12 implementer and the artifact-cleanup plan reviewer mid-run; both were resumed from what had landed, with a fresh prove-it-can-fail for the orphaned task.
- The delivery-evidence evaluator took three successive final-review rounds to harden: each fix exposed an adjacent trust input derived from the state being judged.

## Tradeoffs Made

- Goal is excluded from autonomous runs: activation, re-alignment and the terminal declaration need the user.
- The configured plan gate was capped at two reruns and the per-phase review at three rounds, with the complexity disposition logged at each cap, trading exhaustive convergence for bounded cost.
- Reviews stay out of archives by design; journal and plan records carry findings and dispositions so they stand alone.

## Integration Notes

- The v1 seam is PR #361 (`feat/brief-workflow-mode-v1`, lockstep 0.3.19); the goal seam ships as a PR stacked on it at lockstep 0.3.20, with every changed skill and role bumped once against both bases.
- Existing modes are gated at every reader; only pins and mode-list literals changed in pre-existing tests.
- Review artifacts are local-only citations; the archived project will not contain them.

## Follow-up Items

- BL-261011-persist-pre-registration: a persisted marker for pre-registration review staleness.
- BL-261011-guard-goal-brief-amendments: a guard against amendment commits on an open delivery's head branch (prose-only today).
- BL-261011-re-project-oat-pr-status-from: project `oat_pr_status` from the latest member after activation.
- BL-261011-automate-goal-phase-extraction: automate milestone extraction.
- BL-261011-route-a-standalone-out: route a standalone `## Out of Scope` brief section into discovery on promotion.
- BL-261011-add-brief-to-the-legacy: legacy mode-list surfaces for brief and goal.
- The `artifact-cleanup` project (planned, not active) carries the lifecycle-artifact noise fixes identified during this run.

## Workflow Observations

### 2026-10-11 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/brief-goal-workflow-modes/reviews/artifact-plan-review-2026-10-11T014430Z.md run=3d1ca87b-c858-497a-b529-d73f88974327

### 2026-10-11 · structural · oat-project-implement · p01

Phase p01 outcome: pass. Root review round 1 (auto, oat-reviewer-claude-claude-fable-5-1-high) 0C/0H/1M/2L → fix tasks p01-t05, p01-t06 on the original implementer handle; round 2 0C/0H/0M/1L (bookkeeping). Fix-loop count 1. Review artifacts: reviews/archived/p01-review-2026-10-11T024911Z.md, reviews/archived/p01-review-2026-10-11T030140Z.md. Key p01-outcome-run1-f73b4e904.

### 2026-10-11 · general · friction · reviewer child terminated by gateway 503 before artifact

The round-2 p01 reviewer (accepted native launch) was terminated by a transient inference-gateway HTTP 503 before writing anything. Continued through the same accepted handle rather than launching a replacement; the continuation completed normally. Key p01-review2-503-continuation.

### 2026-10-11 · general · friction · reviewer resolver refuses candidate overrides under a capped policy

Operator asked for Opus 5.5 high subagents under a frontier ceiling; dispatch-ceiling resolve rejects --candidate-model for the reviewer role, so root-owned phase reviewers run the cap (claude-fable-5-1/high) while implementers run Opus 5.5 high via the exact-candidate branch. Recorded as a run deviation rather than lowering the ceiling. Key p01-reviewer-cap-deviation.

### 2026-10-11 · structural · oat-project-implement · p02

Phase p02 outcome: pass (parallel group 1, worktree lane). Root reviews: round 1 passed with queued fix tasks, round 2 passed. Fix-loop count 1. Key group1-p02-outcome-97d8f986f0f13c7334746b4bd0ec871057c7848d.

### 2026-10-11 · structural · oat-project-implement · p03

Phase p03 outcome: pass (parallel group 1, worktree lane). Root reviews: round 1 passed with queued fix tasks, round 2 passed. Fix-loop count 1. Key group1-p03-outcome-97d8f986f0f13c7334746b4bd0ec871057c7848d.

### 2026-10-11 · structural · oat-project-implement · p04

Phase p04 outcome: pass (parallel group 1, worktree lane). Root reviews: round 1 passed with queued fix tasks, round 2 passed. Fix-loop count 1. Key group1-p04-outcome-97d8f986f0f13c7334746b4bd0ec871057c7848d.

### 2026-10-11 · structural · oat-project-implement · group-1

Parallel group 1 fan-in: merged p02 (cf5cae32a), p03 (44523a3ae), p04 (97d8f986f) no-ff without conflicts; integration verification green (control-plane 200, CLI 8422, forced type-check). Key group1-merge-97d8f986f0f13c7334746b4bd0ec871057c7848d.

### 2026-10-11 · general · friction · disk full during parallel-group fan-in

Three concurrent lane worktrees with full installs and builds filled the volume (118 MiB free) and the first integration build died with disk I/O error. Removing the merged worktrees and pruning the pnpm store recovered 3.6 GB; group 2 needs more headroom before bootstrapping three lanes. Key group1-disk-full-97d8f986f0f13c7334746b4bd0ec871057c7848d.

### 2026-10-11 · general · friction · parallel group degraded to sequential: insufficient disk

Group 2 [p05,p06,p07] bootstrap preflight failed closed on free space (3.3 GB free, ~5 GB needed for three lanes). Degraded to sequential target-preserving execution in the root checkout; no worktree was created. Key group2-degrade-insufficient-disk.

### 2026-10-11 · structural · oat-project-implement · c86f8558c

Phase p05 review round 1 passed (0/0/0/3 Low); two Lows converted to p05-t03 and fixed on the same implementer handle at c86f8558c; one Low (non-discriminating plan verify clause) corrected in root bookkeeping. Phase p05 closed. Key p05-review-pass-c86f8558c.

### 2026-10-11 · structural · oat-project-implement · 1e2ff01dd

Phase p06 review round 1 (0/0/1/4) converted the Medium and two Lows into p06-t04/t05; round 2 (0/0/0/2 Low) passed with p06-t06 fixed on the same handle at 1e2ff01dd. Two contract/template alignment items carried to p08-t02; design.md updated in root bookkeeping. Phase p06 closed. Key p06-review-pass-1e2ff01dd.

### 2026-10-11 · structural · oat-project-implement · b65dbad79

Phase p07 review round 1 passed (0/0/0/4 Low); all four Lows fixed as p07-t04 on the same handle at b65dbad79. Group 2 [p05,p06,p07] closed sequentially in the root checkout; cross-phase wording items and a pre-existing commit-grep bug carried to p08. Key p07-review-pass-b65dbad79.

### 2026-10-11 · general · friction · isolated-HOME temp growth fills the volume

Each HOME=$(mktemp -d) vitest run leaves about 48 MB of cache under $TMPDIR; 87 such dirs (3.3 GB) brought the volume to 370 MiB free mid-group-2. Swept 71 stale ones; later briefs mandate one fake HOME per run. Candidate guidance for the implement skill and AGENTS.md. Key friction-isolated-home-tmp-growth.

### 2026-10-11 · structural · oat-project-implement · 5b334a4e7

Phase p08 review round 1 passed (0/0/0/2 Low); both Lows fixed as p08-t07 on the same handle at 5b334a4e7. All gates green at 0.3.19 (origin/main 0.3.18 merged at bf6c60c49). v1 brief seam complete; progress PR for p01–p08 awaits the user-invoked oat-project-pr-progress; Astra v1.5 round 1 dispatched. Key p08-review-pass-5b334a4e7.

### 2026-10-11 · structural · oat-project-implement · plan-revision-5

Astra v1.5 round 1 (gpt-6-astra high, read-only delegate) resolved carried objections A1–A4 and surfaced B1–B4; applied as design revision 4.0 and plan revision 5 (p09–p12 re-planned, p10-t04 added). Report kept at references/astra-v15-round-1.md. Key astra-v15-round-1-applied.

### 2026-10-11 · structural · oat-project-implement · plan-revision-5

Astra v1.5 round 2 returned NOT ALIGNED with five paste-ready edits (read-only closeout observation, recovery isolation in reconcile/review-receive, audit phase-entry shape, observed endpoint for activation, goal guard verification supplement); the two-round plan cap was reached, so the edits were applied verbatim as Astra's own text. Report at references/astra-v15-round-2.md. Key astra-v15-round-2-applied.

### 2026-10-11 · structural · oat-project-implement · plan-revision-5

Plan revision 5 artifact review (Opus 5.5 high): 0/3/7/6; all findings applied (router placement, p11-t03, recovery producers, expected-red list, delivery check, p12 split into five tasks, Low wording). Artifact archived; round-2 re-review of the fixes next. Key plan-rev5-artifact-review-applied.

### 2026-10-11 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:2,medium:2,low:0 exit=1 status=blocked artifact=.oat/projects/shared/brief-goal-workflow-modes/reviews/artifact-plan-review-2026-10-11T080913Z.md run=b28524f9-7d10-4c30-8adb-18944a25be3a

### 2026-10-11 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/brief-goal-workflow-modes/reviews/artifact-plan-review-2026-10-11T081731Z.md run=1fa1e354-b677-4571-a2df-0431666fd2f2

### 2026-10-11 · structural · oat-project-implement · plan-revision-5

Configured plan gate on revision 5: attempt 1 0/2/2/0 (applied at 1de4aac68), attempt 2 0/0/0/0 passed; oat_quick_start_gate refreshed to 1de4aac68. v1.5 plan approved for execution; p09 launches next. Key plan-rev5-gate-passed.

### 2026-10-11 · structural · oat-project-implement · 611596345

Phase p09 review round 1 (0/1/2/3) converted the High, a Medium's code side and a Low into p09-t03; round 2 (0/0/0/0) passed. Contract sentences (Scope cell, approval evidence, exit-carrier freshness) recorded in design.md; Milestones grammar and code mapping carried to p11-t01/p10-t01. Phase p09 closed at 611596345. Key p09-review-pass-611596345.

### 2026-10-11 · general · friction · disk space pause

p10 paused after p10-t01 (97f2f1a32): free space fell to 558 MB against the 650 MB stop rule. The p10-t02 working tree is parked as references/p10-t02-recovered.patch. Growth sources are outside the pre-authorized cleanup set (~/.t3/userdata/statev2.sqlite 3.5 GB, ~/.t3/worktrees 8.8 GB, ~/.codex/sessions 6.4 GB, ~/.cache/codex-runtimes 1.5 GB). Resume p10 from p10-t02 once about 1.5 GB is free. Key p10-paused-disk.

### 2026-10-11 · structural · oat-project-pr-progress · https://github.com/voxmedia/open-agent-toolkit/pull/361

Progress PR #361 opened for v1 (p01–p08) from feat/brief-workflow-mode-v1 cut at ebccf5ba3; goal phases continue on feat/freestyle-project-workflow. Key pr-progress-p01-p08-361.

### 2026-10-11 · structural · oat-project-implement · p10

Phase p10 passed review at 675d5bd27 after two rounds (0/0/2/6 then 0/0/0/1); fixes p10-t05 and p10-t06; plan amendment 5.1 applied. Key p10-review-passed-675d5bd27.

### 2026-10-11 · structural · oat-project-implement · p11

Phase p11 passed review at 80282f21b after two rounds (0/1/2/5 then 0/0/0/1); fix p11-t04; one Low carried to p12-t04. Key p11-review-passed-80282f21b.

### 2026-10-11 · general · friction · review-cap p12

p12 reached the three-round review cap with a one-clause prose residual (goal terminal deferral condition). Disposition: fix as p12-t08, root-verified; the final integrated review over the whole branch is the independent check instead of a fourth p12 round.

### 2026-10-11 · structural · oat-project-implement · p12

Phase p12 passed review at da60988b8 after three rounds (0/1/2/4, 0/0/1/1, 0/0/1/2); fixes p12-t06..t08; all twelve phases complete at lockstep 0.3.20. Key p12-review-passed-da60988b8.

### 2026-10-11 · general · friction · review-cap final

The final integrated review reached three rounds; each fix to the delivery-evidence evaluator surfaced an adjacent bypass (same-artifact rebind, set-once member revisions, own-artifact set from the judged state). Disposition: a known evaluator bypass cannot ship, so one more narrow fix (p12-t11, reviewer-verified counterfactual) and a round 4 limited to that guard; lesson for artifact-cleanup and future evaluators: derive trust sets from immutable records (Reviews rows), never from the state being judged.

### 2026-10-11 · structural · oat-project-implement · final

Final integrated review passed at 9881971ba after four rounds (0/1/0/2, 0/1/0/1, 0/1/0/0, 0/0/0/0); fixes p12-t09..t11 to the delivery-evidence evaluator; implementation complete. Key final-review-passed-9881971ba.

### 2026-10-11 · structural · oat-project-pr-final · https://github.com/voxmedia/open-agent-toolkit/pull/362

Stack #363 landed: #361 (v1 brief) merged at 3352af96e with a merge commit, #362 (goal) merged at 573d5b820; both via the asynchronous stack merge endpoint. Key pr-final-362-merged.

### 2026-10-11 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/brief-goal-workflow-modes/references/project-retro.md evidence_used=archived-review-markdown,astra-alignment-reports,lifecycle-artifacts,project-log,session-transcript evidence_unavailable=oat-execution-learnings promotions=5 upstream=1 apply=performed filing=performed
