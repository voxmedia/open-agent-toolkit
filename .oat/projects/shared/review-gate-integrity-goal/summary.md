---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-08
oat_generated: true
oat_summary_revision_count: 3
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3]
oat_summary_learnings_fingerprint: 5576b13a79e30221094e7afe901843d31f558711fd2005b073ea5207c0c45955
oat_summary_phase_fingerprint: d51e478e574974f2c0f1a49707c9d626b39b24915544f0716b1707ef2efd9695
---

# Summary: review-gate-integrity-goal

## Overview

Review and gate cycles spent reviewer runs and gate attempts on findings that could not change what ships. A stale Reviews cell or an archived-path reference started a new review cycle, and a blocking gate with only such findings used an attempt and relaunched (GitHub #233). Review rows and gate receipts were tied only by an unchecked (scope, type, artifact) convention, so stale or duplicate rows blocked closeout (#194, #305). An exhausted gate could not show whether it was converging (#327). This goal-mode project delivered fixes in three merged milestones. The goal was declared met on 2026-11-08 with one outcome deferred.

## What Was Implemented

**m01, d01 ([PR #400](https://github.com/voxmedia/open-agent-toolkit/pull/400), merged 2026-11-03, released in 0.3.44). Phases p01, p02, p10, p11.**

- **Shared definition.** `.agents/docs/bookkeeping-findings.md` defines a bookkeeping finding narrowly, with its exclusions and three limits on the fix.
  - Bookkeeping means correcting a record of existing evidence or state.
  - It excludes missing reviews, approvals, `**Status:**` markers, Reviewed Head cells and set-once delivery fields.
  - The fix touches tracking files only, makes only changes section 12.8 permits on goal paths, and sets `passed` only in the receive branch.
- **Receive rule.** Every project review and gate path now settles an all-bookkeeping result at receive. The paths are review-receive, implement's phase review, phase gate, final review and exit gate, the goal integrated review, and the planning skills' artifact reviews and lifecycle gates.
  - The receiver makes one fix commit with a note per finding and records `passed` with "bookkeeping-only fixes applied at receive".
  - There is no re-review and no cycle count. A blocking gate is satisfied without using an attempt, and its raw verdict stays in the receipt.
  - The rule is recorded in `DR-261102-bookkeeping-only-review`.
- **Verdict parser.** The gate verdict parser identifies findings by their bold titles instead of counting every bullet (the #339 slice).
  - It refuses an ambiguous or orphaned detail bullet, and it emits one record per finding.
  - Fixtures carry provenance headers.
- **Verifier reverted.** p02's clerical-resolution verifier was built and then reverted inside p02, under the 2026-11-02 amendment.

**m02, d02 ([PR #403](https://github.com/voxmedia/open-agent-toolkit/pull/403), merged 2026-11-06, first released in 0.3.47 with m03). Phases p07, p12, p13, p-rev1, p-rev2, p-rev3.**

- **One row per review event (p07).** The plan template carries a `plan` placeholder row. The quick, import and lite scaffolds no longer have unused `spec`/`design` rows.
- **Supersession (p07).** A `received` row is superseded on the read side by a later recorded row in the same Scope, Type and Invocation class, at the same or a descendant head.
  - The Invocation classes are gate and lifecycle.
  - Readers ignore superseded rows, and the read-only `oat review check` reports them along with duplicate keys.
- **Exact gate consumption (p12).** The gate result adds `reviewedHead`. Receive consumes the exact event the gate names, and fails closed when the event does not match.
- **Pending-review listing (p13).** `oat review pending` lists required reviews that are still `pending` or missing, and recorded waivers, before pr-progress or pr-final opens a PR. Each must be run, waived with a recorded `**Review waived:**` line, or the run stops.
- **Revision phases.**
  - p-rev1: `oat review resolve` refuses a malformed Reviewed Head.
  - p-rev2: synced-project review ancestry resolves in the source repository.
  - p-rev3: a retired waiver no longer hides a later pending review.

**m03, d03 ([PR #407](https://github.com/voxmedia/open-agent-toolkit/pull/407), merged 2026-11-08, version 0.3.47). Phases p08, p14, p15, p16.**

- **Convergence marks (p08).** On every rerun of a configured gate on one subject, each finding is marked new or carried over, through a stable finding key over the parser's records. The gate JSON and its review record report new, carried-over and resolved counts when the run could be compared, or a reason when it could not. A first run has no convergence fields.
  - The subject is the milestone for a goal exit gate, the amendment for a goal plan gate, and the scope elsewhere.
- **Finding classes (p14).** Every receive path records one class per finding in a `**Finding classes:**` line: `bookkeeping`, `regression`, `accepted-requirement` (with its contract source) or `new-hardening`.
  - A `new-hardening` finding reaches the operator before any fix task exists.
  - The complexity-review fallback reads the classes. The rule is also in root `AGENTS.md`.
- **Milestone-scoped exit gate (p15).** In a goal milestone closeout, a state-selected `final` resolves to the active milestone's accepted phases instead of refusing on a squash-merged milestone's anchors. An explicit whole-project `code final` keeps its meaning.
- **m02 follow-ups and exit-gate fixes (p16).**
  - `oat review check` and `oat review resolve` number rows by data line.
  - A contract test no longer simulates the row writer.
  - A blocked plan carrier is no longer read as an amendment approval.
  - A single-phase `final` keeps its milestone identity.

## Key Decisions

- **Bookkeeping-only review**: a prose rule rather than verified settlement (2026-11-02 amendment). A complexity review found that the built p02 verifier was far larger than the pain it fixed, and its closed repair kinds would have settled about one of seven recorded incidents. A bookkeeping-only result is recorded `passed` with a note instead of a new `resolved` status, so no reader changed. The cost is that the rule depends on the receiving agent's judgment against one narrow definition, with a doubtful finding treated as not bookkeeping.
- **Read-side supersession of received review rows** (m02). A stranded `received` row is superseded only on the read side, by a later recorded row in the same Invocation class at the same or a descendant head. Nothing edits, promotes or deletes it.
  - A bookkeeping repair was rejected: it would have set another event to `passed`, which m01's third limit forbids.
  - A mutating repair command was rejected too.
  - Rows from different classes never supersede each other, so a manual round cannot hide an unreceived gate row.
- **Finding classes recorded at receive** (m03). Each receive records one class per finding, and a `new-hardening` finding (no contract source) goes to the operator before any fix work exists. The classes and the convergence marks feed the existing exhaustion stop and complexity review. No authorization record or extra-cycle allowance was added.
- **Goal exit gate resolves final to the milestone** (m03). The configured `--review-scope final` gate, with its state-selection prompt, now reviews the active milestone's ordered accepted phases. The configured command did not change. Only an explicit whole-project request expands to the whole project.

## Design Deltas

- **Resume pointers count as bookkeeping (p10).** The bookkeeping definition admits a resume pointer corrected by copying state already recorded in the journal. A pointer inferred from commits stays excluded. The operator decided this on 2026-11-02, and the shipped definition is the source of truth.
- **Outcome 1 walkthrough (p11).** The #233 incident turned out not to be bookkeeping-only, so it is traced as a counter-example where today's flow correctly applies. The qualifying walkthrough is the wave-skills-promotion p05 phase gate (run `811c64e3`). The operator accepted this substitute on 2026-11-02.

## Notable Challenges

- **Squash merges.** Each squash merge made the goal branch's commits non-ancestors of main. Every later milestone needed a fresh branch cut from `origin/main`.
- **Exit-gate routing.** Until p15 shipped, the configured exit gate refused on m01's squash-merged anchors. The m02 and m03 exit runs had to be routed by hand to explicit phase ranges.
- **Released toolchain lag.** Gates run the installed CLI and user-scope skills, so each milestone's fixes governed this project only after a release and `oat tools update`.
  - The installed 0.3.42 Codex gate target lost its route receipt (Sol run `48f5553c`).
  - `oat-project-pr-progress` and `oat-project-goal` were not model-invokable, so every milestone handoff waited for a typed slash command.
- **d01 closeout coverage.** Cursor Bugbot reviewed PR #400 after its gates passed, and its fixes (`4a870d471`) were merged without re-gating. That staled d01's integrated review and exit gate.
  - Fresh evidence would have to bind `4a870d471`, which is not an ancestor of main.
  - `oat project closeout-check` therefore still refuses. The operator accepted d01 as delivered (see Integration Notes).

## Tradeoffs Made

- **Merged endpoint per milestone.** Each milestone merged and was re-aligned before the next one started, instead of stacking open branches over shared skill files and lockstep versions. This cost one release-and-install cycle per milestone.
- **Hardening stop.** Late in m03 the operator stopped hardening work. Several p14 Lows were cut, and the PR #407 simplification findings were deferred rather than fixed. Fixing either on the delivery branch would have staled the m03 exit gate and integrated review.
- **Late PR-bot findings.** From m02 onward, nonblocking late PR-bot findings were deferred in the journal instead of being fixed on the delivery branch. This kept d02's and d03's evidence fresh through merge.

## Integration Notes

- **Closeout without a passing check.** This project is closed out without a passing `closeout-check` (d01 coverage only). It is not archived through `oat project complete-state`. The operator's acceptance is recorded in `implementation.md` Final Summary.
- **Gates run released code.** Gate and review behavior changes must be probed with the branch build. Gates load the released CLI and user-scope skills, not the branch.
- **Repo-record writes stale milestone evidence.** A goal milestone's evidence goes stale from any `.oat/repo` write after its reviewed head. File backlog items and decision records after delivery, or on a separate branch.

## Autonomous Execution Learnings

### Agent-instruction updates

- Apply Feature Planning Triage at each phase start of a goal milestone, and include a complexity lens in per-phase reviews. p08's plan-gate amendment inference and p14's copied routing paragraph were found only at PR self-review, after both gates had passed. Source: oat-project:review-gate-integrity-goal#2026-11-08-feedback-m03-p08-was-over-built-before-the-hardening-stop-1
- Children must prefix `HOME=$(mktemp -d)` inline and never export `HOME`. The root should check `$HOME` after a child returns, before resolver calls and commits. A leaked `HOME` broke the dispatch resolver and gave one commit a fallback author. Source: oat-project:review-gate-integrity-goal#2026-11-01-friction-temporary-home-leaked-into-the-root-shell-1
- After merging a newer main, regenerate provider views with the branch build (`node packages/cli/dist/index.js sync`). The installed `oat sync` deleted newer Codex views. Source: oat-project:review-gate-integrity-goal#2026-11-02-friction-oat-sync-from-installed-cli-deletes-newer-provider-views-1

### Code follow-ups

- Fix the Codex gate target's missing route receipt (`OAT_GATE_ROUTE_RECEIPT_PATH` was empty after a completed Sol run). Until it is fixed, cross-family Sol gating falls back to same-family Opus. Source: oat-project:review-gate-integrity-goal#2026-11-02-bug-codex-gate-target-loses-the-branch-local-route-receipt-1
- Consider admitting `.oat/repo` paths as section 12.8 bookkeeping successors. A backlog commit after m02's reviewed head staled its evidence. Whether this is intended is unverified. Source: oat-project:review-gate-integrity-goal#2026-11-04-friction-repo-records-after-a-reviewed-head-stale-goal-milestone-evidence-1

### Workflow issues

- Re-gate any post-gate fix before a goal milestone PR merges, or record a waiver at that time. Fold PR-bot findings into the reviewed head (for example by opening the PR as a draft before the integrated review), and defer nonblocking ones in the journal. Closeout has no later recovery path for a squash-merged delivery. Sources:
  - oat-project:review-gate-integrity-goal#2026-11-08-friction-a-squash-merged-delivery-cannot-be-re-gated-1
  - oat-project:review-gate-integrity-goal#2026-11-03-friction-pr-bots-review-after-the-milestone-gates-and-can-force-post-gate-fixes-1
  - oat-project:review-gate-integrity-goal#2026-11-06-worked-well-deferring-nonblocking-pr-bot-findings-keeps-delivery-evidence-fresh-through-merge-1
- After each squash merge, cut the next milestone branch from `origin/main`. Release and run `oat tools update` before re-alignment, so the goal's own fixes govern its next milestone. Sources:
  - oat-project:review-gate-integrity-goal#2026-11-03-friction-squash-merge-requires-a-fresh-branch-for-the-next-milestone-1
  - oat-project:review-gate-integrity-goal#2026-11-08-friction-released-toolchain-lags-the-goal-s-own-fixes-1
- Advance a phase head before running the milestone exit gate. A gate artifact committed after a later reviewed head stales the exit carrier until the gate reruns. Source: oat-project:review-gate-integrity-goal#2026-11-02-friction-gate-committed-artifacts-break-freshness-after-a-late-head-advance-1
- Until a release carries p15, route each goal exit gate to the milestone's phase range and record the routing. Source: oat-project:review-gate-integrity-goal#2026-11-06-friction-the-configured-exit-gate-s-final-scope-refuses-after-a-squash-merged-milestone-1

## Follow-up Items

- **Outcome 6 / p09, non-goal closeout freshness: deferred by the operator** at the m03 re-alignment. `BL-260820-track-pr-closeout-evidence` (#201) stays open for a separate project.
- **`BL-261108-simplify-m03-gate-convergence`** covers four items:
  - simplify the plan-gate amendment inference in `gate/convergence.ts`;
  - replace the routing paragraph copied into 8 planning skills with a pointer;
  - drop the awk routing snippet and its tests;
  - fix the Bugbot classes-line contradiction, so operator decisions are appended beside the frozen `**Finding classes:**` line.
  - Source: the PR #407 self-review and Bugbot findings.
- **Open Low deferrals with triggers** (see `implementation.md` Deferred Findings):
  - p10 L1: a stale fallback after a bookkeeping-only receive;
  - p12 L2: gate event persistence across an interruption;
  - p14 L1, L2, L3, L5 and round-2 L1;
  - p-rev1 L1 and p-rev2 L1.
- **Partially shipped backlog items, still open:**
  - `BL-261003-diagnose-review-finding`: only the parser slice shipped;
  - `BL-260820-emit-source-qualified`: only `reviewedHead` shipped.

## Associated Issues

- **Satisfied and archived on 2026-11-08:**
  - `BL-260711-skip-re-review-for-bookkeeping`
  - `BL-260820-bind-each-gate-review`
  - `BL-260927-mark-gate-findings-as-new-or`
  - `BL-261013-classify-review-findings`
  - `BL-261104-goal-mode-exit-gate-resolve`
- **Closed with m02 on 2026-11-06:** `BL-261002-list-pending-required-reviews` (p13).
- **GitHub issues addressed:** #233, #194, #305, #327, and #339 (parser slice only). #201 is deferred with Outcome 6.

## Workflow Observations

- **2026-11-08 · feedback · m03 p08 was over-built before the hardening stop** (project, decision) `oat-project:review-gate-integrity-goal#2026-11-08-feedback-m03-p08-was-over-built-before-the-hardening-stop-1`
  p08 shipped plan-gate amendment inference (about 150 source and 300 test lines in gate/convergence.ts) for a case no recorded plan gate has hit, and p14 copied one routing paragraph into 8 planning skills; the operator stopped hardening only after p14, and the PR #407 self-review's testing and complexity lenses found the cost after both gates had passed.
  Uncertainty: per-phase reviews were not briefed with the complexity-review standard, so it is unknown whether they would have caught it earlier.
- **2026-11-08 · friction · A squash-merged delivery cannot be re-gated** (project, gotcha) `oat-project:review-gate-integrity-goal#2026-11-08-friction-a-squash-merged-delivery-cannot-be-re-gated-1`
  d01's post-gate fix 4a870d471 staled its integrated review and exit gate, and recovery needs evidence bound to that exact head, which after a squash merge exists only on the merged branch and is not an ancestor of main; the recovery record owner (oat-project-pr-progress) is also not model-invokable.
- **2026-11-08 · friction · Released toolchain lags the goal's own fixes** (project, environment-limited) `oat-project:review-gate-integrity-goal#2026-11-08-friction-released-toolchain-lags-the-goal-s-own-fixes-1`
  the m03 exit gate needed operator scope routing (p08-p16) because installed CLI 0.3.46 predates p15's milestone-scoped final; oat-project-pr-progress and oat-project-goal are not model-invokable, so each milestone handoff stopped for the user to type a slash command.
- **2026-11-06 · friction · The configured exit gate's final scope refuses after a squash-merged milestone** (project, gotcha) `oat-project:review-gate-integrity-goal#2026-11-06-friction-the-configured-exit-gate-s-final-scope-refuses-after-a-squash-merged-milestone-1`
  m02's configured implement exit gate (--review-scope final with the state-selection prompt) expanded to the whole project and refused on m01's squash-merged phase anchors (run 788ae91a); each m02 exit run had to be routed to an explicit phase range (p07-p13, p07-p-rev2, p07-p-rev3).
  Uncertainty: a fix in m03 only helps gates from the release that carries it, because gates run the installed CLI.
- **2026-11-06 · worked-well · Deferring nonblocking PR-bot findings keeps delivery evidence fresh through merge** (project, efficiency) `oat-project:review-gate-integrity-goal#2026-11-06-worked-well-deferring-nonblocking-pr-bot-findings-keeps-delivery-evidence-fresh-through-merge-1`
  PR 403's only post-gate bot finding (a nonblocking Warp test-hygiene suggestion) was deferred to p08 by the operator and recorded in a journal-only commit; oat project delivery check stayed ok and d02 merged with its exit gate and integrated review fresh, unlike d01, where post-gate Bugbot fixes staled both.
- **2026-11-04 · friction · Repo records after a reviewed head stale goal milestone evidence** (project, gotcha) `oat-project:review-gate-integrity-goal#2026-11-04-friction-repo-records-after-a-reviewed-head-stale-goal-milestone-evidence-1`
  a commit filing a backlog item (.oat/repo/pjm/backlog/) after m02's reviewed head made oat project delivery check report the exit carrier and integrated review stale (disallowed-path), although the implementation fingerprint excludes .oat/repo.
  Uncertainty: whether excluding .oat/repo from the successor rule is intended.
- **2026-11-03 · friction · PR bots review after the milestone gates and can force post-gate fixes** (project, gotcha) `oat-project:review-gate-integrity-goal#2026-11-03-friction-pr-bots-review-after-the-milestone-gates-and-can-force-post-gate-fixes-1`
  Cursor Bugbot reviewed PR 400 after the m01 exit gate and cycle-2 integrated review had passed with no findings, and raised two valid skill-prose findings (one High).
- **2026-11-03 · friction · Squash merge requires a fresh branch for the next milestone** (project, gotcha) `oat-project:review-gate-integrity-goal#2026-11-03-friction-squash-merge-requires-a-fresh-branch-for-the-next-milestone-1`
  PR 400 was squash-merged, so the 126 goal-branch commits are not ancestors of main even though the trees match.
- **2026-11-02 · bug · Codex gate target loses the branch-local route receipt** (general, gotcha) `oat-project:review-gate-integrity-goal#2026-11-02-bug-codex-gate-target-loses-the-branch-local-route-receipt-1`
  oat gate review --target codex-6-sol-xhigh (installed CLI 0.3.42) ran the Sol reviewer to completion and committed a 0/0/0/0 artifact, then failed review_failed at target-dispatch: 'Branch-local gate route did not return JSON.' The route receipt at OAT_GATE_ROUTE_RECEIPT_PATH was missing or empty after the child exited (run 48f5553c).
- **2026-11-02 · friction · Gate-committed artifacts break freshness after a late head advance** (general, gotcha) `oat-project:review-gate-integrity-goal#2026-11-02-friction-gate-committed-artifacts-break-freshness-after-a-late-head-advance-1`
  The gate CLI commits its review artifact right after each run.
- **2026-11-02 · friction · oat sync from installed CLI deletes newer provider views** (general, gotcha) `oat-project:review-gate-integrity-goal#2026-11-02-friction-oat-sync-from-installed-cli-deletes-newer-provider-views-1`
  Running the installed oat sync on a branch that merged a newer main deleted main's gpt-6-1-terra Codex views and left four reviewer views stale; regenerating with the branch build (node packages/cli/dist/index.js sync) was correct.
- **2026-11-01 · friction · Temporary HOME leaked into the root shell** (general, gotcha) `oat-project:review-gate-integrity-goal#2026-11-01-friction-temporary-home-leaked-into-the-root-shell-1`
  after the p01 phase implementer ran isolated-HOME test suites, the root shell's HOME pointed at a mktemp directory, so the dispatch resolver lost the user-scope ladder and one root commit got a hostname fallback author email.

Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.
