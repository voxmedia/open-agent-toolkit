---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-11-01
---

# Project Log: review-gate-integrity-goal

Append-only evidence of what broke, surprised, or worked: write entries only with `oat project log append` (see its `--help`), never edit a prior entry, and never record secret values.
Contract, entry grammar and roll-up: https://voxmedia.github.io/open-agent-toolkit/workflows/projects/execution/project-log

## Entries

### 2026-11-01 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/artifact-plan-review-2026-11-01T214129Z.md run=5e3ad377-2f84-4f4d-8906-f8577b7a604e

### 2026-11-01 · structural · oat-project-goal · m01

Activated m01 (p01, p02, p03, p04, p05); review-gate-integrity-goal-activate-m01

### 2026-11-01 · structural · oat-project-implement · p01

p01 accepted: per-phase review passed in round 2 (round 1 0C/0H/4M/4L, one fix loop p01-t02; round 2 0C/0H/0M/2L, Lows deferred); head ded0985d59ee8039415ad163c750cb9abe2f2c08; no phase gate selected for p01. rgi-p01-outcome-20261101

### 2026-11-01 · general · friction · Temporary HOME leaked into the root shell

**Category:** gotcha
**Source:** rgi-learning-p01-home-leak
**Origin:** oat-project-implement
**Recorded:** 2026-11-01T22:25:24Z

Observation: after the p01 phase implementer ran isolated-HOME test suites, the root shell's HOME pointed at a mktemp directory, so the dispatch resolver lost the user-scope ladder and one root commit got a hostname fallback author email. rgi-learning-p01-home-leak
Impact: the fix-dispatch resolve failed with a misleading 'requires a configured high candidate ladder' error, and a commit author had to be reset.
Recommendation: children must use an inline HOME=$(mktemp -d) prefix, never export HOME; the root should check $HOME before resolver calls and commits after a child returns.

### 2026-11-02 · structural · oat-project-implement · p02

p02 per-phase review passed in round 3 after two fix rounds (r1 0C/4H/5M/4L, r2 0C/3H/1M/2L, r3 0C/0H/1M/4L; Medium and Lows deferred or handed to p03/p04); head 9ef1fcb89807a67dd9da78bbe4b6b8e45810116c; selected phase gate pending. rgi-p02-review-outcome-20261101

### 2026-11-02 · structural · oat gate review · p02

target=claude-opus-5-5-high threshold=high exit=1 status=review_failed run=c9c091b6-d051-428b-a998-a95b68b37d78

### 2026-11-02 · structural · oat-project-implement · p02

STOP at p02 phase gate: target claude-opus-5-5-high usage-limited (weekly limit, resets 11am America/Chicago); gate run c9c091b6-d051-428b-a998-a95b68b37d78 review_failed with no artifact; no retry consumed; operator direction needed. rgi-p02-gate-stop-20261101

### 2026-11-02 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/artifact-plan-review-2026-11-02T155547Z.md run=803a6f3e-a36a-4bd8-a4d8-fc2047ee60aa

### 2026-11-02 · structural · oat-project-implement · p02

p02 accepted: verifier retired by revert 8427732e8 (inline p02-ie1); review round 4 passed (0/0/0/2, Lows addressed now); no phase gate (dropped by the 2026-11-02 amendment); rgi-p02-outcome-20261102

### 2026-11-02 · structural · oat-project-implement · p10

p10 accepted at cf26ae9c9: three review rounds (1/2/3, 1/1/2, 0/0/0/2); fix tasks p10-t04 and p10-t05; round-3 Lows fixed at receive as bookkeeping; operator decided journal-copied pointers are bookkeeping (round-2 receipt); one recovery (rgi-p10-rec-01, 1/10); no phase gate. rgi-p10-outcome-20261102

### 2026-11-02 · general · friction · oat sync from installed CLI deletes newer provider views

**Category:** gotcha
**Source:** rgi-p10-sync-gotcha
**Origin:** oat-project-implement
**Recorded:** 2026-11-02T19:34:40Z

Running the installed oat sync on a branch that merged a newer main deleted main's gpt-6-1-terra Codex views and left four reviewer views stale; regenerating with the branch build (node packages/cli/dist/index.js sync) was correct. rgi-p10-sync-gotcha

### 2026-11-02 · structural · oat-project-implement · p11

p11 accepted at 395b90677: one review round (0/0/0/4), Lows addressed now by the root; #233 traced as a counter-example and the wave-skills-promotion p05 gate accepted as the qualifying walkthrough (operator, recorded as a deviation); release 0.3.44 and DR-261102-bookkeeping-only-review; no phase gate. rgi-p11-outcome-20261102

### 2026-11-02 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/final-review-2026-11-02T211656Z.md run=d434e7e7-9a58-43f4-9e0c-e95a543e865d

### 2026-11-02 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high exit=1 status=review_failed run=48f5553c-f8fa-4f17-be77-7461789a416c

### 2026-11-02 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/final-review-2026-11-02T233110Z.md run=0380f6e0-36ff-47cc-bf80-bc951388df6a

### 2026-11-02 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/final-review-2026-11-02T233729Z.md run=96d2da99-c2db-41e5-9361-f98e0eed24b0

### 2026-11-02 · general · bug · Codex gate target loses the branch-local route receipt

**Category:** gotcha
**Source:** rgi-m01-codex-route-receipt
**Origin:** oat-project-implement
**Recorded:** 2026-11-02T23:39:20Z

oat gate review --target codex-6-sol-xhigh (installed CLI 0.3.42) ran the Sol reviewer to completion and committed a 0/0/0/0 artifact, then failed review_failed at target-dispatch: 'Branch-local gate route did not return JSON.' The route receipt at OAT_GATE_ROUTE_RECEIPT_PATH was missing or empty after the child exited (run 48f5553c). Claude targets completed normally in the same session. rgi-m01-codex-route-receipt

### 2026-11-02 · general · friction · Gate-committed artifacts break freshness after a late head advance

**Category:** gotcha
**Source:** rgi-m01-gate-artifact-freshness
**Origin:** oat-project-implement
**Recorded:** 2026-11-02T23:39:20Z

The gate CLI commits its review artifact right after each run. When a phase head is advanced past a fix commit that predates an earlier gate run, that earlier artifact commit lands after the new reviewed head; section 12.8 admits a gate artifact only when its row's Reviewed Head equals the carrier's, so the exit carrier reads stale until the head advances past every gate commit and the gate reruns. Advance a phase head before running the milestone exit gate. rgi-m01-gate-artifact-freshness

### 2026-11-02 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/final-review-2026-11-02T235632Z.md run=f588e505-bf2e-4904-b833-d054ccee624a

### 2026-11-03 · structural · oat-project-implement · m01

rgi-m01-closeout-c2: m01 closeout. Exit gate attempt 5 passed at 5599af21d (0/0/0/1, Low deferred); integrated review cycle 2 passed 0/0/0/0 (reviews/archived/m01-review-2026-11-03T000239Z.md); delivery check ok; milestone moves to delivering. Fix loops: one integrated-review fix task (p11-t07).

### 2026-11-03 · structural · oat-project-pr-progress · d01

Registered d01 for m01 (p01, p02, p10, p11) at https://github.com/voxmedia/open-agent-toolkit/pull/400; review-gate-integrity-goal-register-d01

### 2026-11-03 · structural · oat-project-goal · m01

Re-alignment entry for m01: d01 (PR 400) observed merged at its endpoint (squash c7cd3b715); integrated review and exit gate stale by operator-directed post-gate Bugbot fixes (4a870d471); review-gate-integrity-goal-realign-m01

### 2026-11-03 · project · friction · PR bots review after the milestone gates and can force post-gate fixes

**Category:** gotcha
**Source:** review-gate-integrity-goal-learning-m01-01
**Origin:** oat-project-goal
**Recorded:** 2026-11-03T02:05:12Z

Observation: Cursor Bugbot reviewed PR 400 after the m01 exit gate and cycle-2 integrated review had passed with no findings, and raised two valid skill-prose findings (one High). The operator had them fixed on the delivery branch without re-gating, which staled d01's integrated review and the m01 exit carrier at the merge.
Impact: The goal's evidence chain ends stale for m01 even though the merged code is better than what was gated; each later milestone can repeat this.
Recommendation: For m02 onward, open the delivery PR (draft) before the integrated review so PR-bot findings fold into the reviewed head, or agree up front that post-gate bot fixes merge without re-gating and record them as operator-accepted staleness.

### 2026-11-03 · project · friction · Squash merge requires a fresh branch for the next milestone

**Category:** gotcha
**Source:** review-gate-integrity-goal-learning-m01-02
**Origin:** oat-project-goal
**Recorded:** 2026-11-03T02:05:12Z

Observation: PR 400 was squash-merged, so the 126 goal-branch commits are not ancestors of main even though the trees match. Continuing on goal/review-gate-integrity would carry duplicate history into the m02 PR.
Impact: Each milestone after a squash merge needs a new head branch cut from the observed integration base.
Recommendation: Cut goal/review-gate-integrity-m02 (and later mNN branches) from origin/main after each endpoint observation; d01's lookup keys keep the old head branch, which refresh resolves by PR URL.

### 2026-11-03 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/artifact-plan-review-2026-11-03T023206Z.md run=6cf18b35-39f7-4103-9625-ad09950fd3c7

### 2026-11-03 · structural · oat-project-goal · m02

Activated m02 (p07, p12, p13); review-gate-integrity-goal-activate-m02

### 2026-11-03 · structural · oat-project-implement · p07

p07 accepted: review round 1 passed (0C/0H/1M/3L, fixes p07-t05..t07), round 2 re-review of the fix range passed (0/0/0/1, Low deferred to p12); 1 fix loop; head 34ebd3ef9. rgi-p07-outcome-20261103

### 2026-11-03 · structural · oat-project-implement · p12

Made p12 concrete before dispatch (plan-and-resume Step 2.2), within Outcome 4 and Decision (3) gap-only provenance: the gate captures and emits reviewedHead; a read-only resolver binds and validates the gate-named Reviews event and fails closed; receive Step 1 accepts the gate event; adopting paths settled as every gate-then-receive path (implement exit gate, phase gate, eight planning gates); artifact-gate rows record Invocation gate and the gate target; folds in the p07 re-review L1 deferral. No Outcome, Constraint, Decision, endpoint or Approach changed. rgi-p12-concrete-20261103

### 2026-11-03 · structural · oat-project-implement · p12

Amended p12's concrete Intent after the implementer showed the dispatch HEAD differs from the Reviews row's Reviewed Head (the reviewed range end) on every anchored gate: reviewedHead is the artifact's oat_review_head_sha when present, else the dispatch HEAD; the gate's corroboration reports match/ancestor/mismatch/unavailable against the dispatch HEAD; the resolver keeps exact equality. Within Outcome 4; no Outcome, Constraint or Decision changed. rgi-p12-head-amend-20261103

### 2026-11-03 · structural · oat-project-implement · p12

p12 accepted: review round 1 passed (0C/0H/1M/4L, fixes p12-t06..t07; L2 deferred, L3 accepted and reported, L4 corrected), round 2 re-review of the fix range passed (0/0/0/0); 1 fix loop; head 8016d7d98. rgi-p12-outcome-20261103

### 2026-11-03 · structural · oat-project-implement · p13

Made p13 concrete before dispatch (plan-and-resume Step 2.2), within Outcome 4: a read-only oat review pending command lists required pending rows per PR scope (phase code rows in scope, plan artifact for project scope unless skip-lined; never spec, design, final or mNN); the Known Unknown settles on the journal slot (row stays pending, one appended **Review waived:** line in ## Reviews and Gates, user-written only), because a Reviews cell would break the Outcome 4 event key or be overwritten; pr-progress and pr-final list before PR creation with run, waive or stop, non-interactive stop, new PRFINAL-06 row. Departs from the backlog item's 'recorded in the Reviews table' wording, as the Known Unknown permits. Seeded the p13 code Reviews row. rgi-p13-concrete-20261103

### 2026-11-03 · structural · oat-project-implement · p13

p13 review M1 (a concrete phase with no Reviews row escapes the pending listing) extended the literal Intent, so it went to the operator before any fix task; the operator chose a separate missing list that both PR skills treat like pending (2026-11-03). Recorded in the p13 Intent and Exit evidence; fix tasks p13-t05..t07. rgi-p13-m1-decision-20261103

### 2026-11-03 · structural · oat-project-implement · p13

p13 accepted: review round 1 passed (0C/0H/1M/3L; M1 put to the operator, who chose the missing list; fixes p13-t05..t07; L3 deferred to the backlog item's closure), round 2 re-review of the fix range passed (0/0/0/1 bookkeeping, fixed at receive); 1 fix loop; head 2375b77bd. m02 phases p07, p12, p13 all accepted. rgi-p13-outcome-20261103

### 2026-11-03 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high exit=1 status=review_failed run=788ae91a-3479-436f-8d7d-08bfa2e064f8

### 2026-11-03 · structural · oat gate review · p07-p13

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-03T215601Z.md run=93e1b0a1-9b04-4c31-9aa2-e032b9820a9d

### 2026-11-03 · structural · oat-project-implement · m02

m02 exit gate (run 93e1b0a1, scope p07-p13, Sol xhigh cross-family) passed its threshold with M1 (resolve accepts a malformed Reviewed Head) and M2 (synced-project ancestry runs in the nested checkout). Later phases have bases, so per the late-fix rule both go to appended revision phases inside m02: p-rev1 corrects p12, p-rev2 corrects p07; milestone row now p07, p12, p13, p-rev1, p-rev2. The gate reruns over p07-p-rev2 after both are accepted. rgi-m02-exit1-revisions-20261103

### 2026-11-03 · structural · oat-project-implement · p-rev1

p-rev1 accepted (corrects p12, m02 exit gate M1): review passed 0/0/0/1, Low deferred; 0 fix loops; head 2c341cff5. rgi-prev1-outcome-20261103

### 2026-11-03 · structural · oat-project-implement · p-rev2

p-rev2 accepted (corrects p07, m02 exit gate M2): review passed 0/0/0/1, Low deferred; 0 fix loops; head d128a4118. All m02 phase-units accepted; the exit gate reruns over p07-p-rev2. rgi-prev2-outcome-20261103

### 2026-11-03 · structural · oat-project-review-provide · p07-p-rev2

Completed one read-only reconnaissance wave with two native gpt-6.1-terra medium lanes; primary verified their evidence and wrote reviews/range-review-2026-11-03T224623Z.md with 0 Critical, 0 High, 1 Medium and 0 Low findings. d738cd0e-5795-48ef-a387-e3ec184f90e5-review-recon

### 2026-11-03 · structural · oat gate review · p07-p-rev2

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-03T224623Z.md run=d738cd0e-5795-48ef-a387-e3ec184f90e5

### 2026-11-03 · structural · oat-project-implement · m02

m02 exit gate rerun (run d738cd0e, scope p07-p-rev2, Sol xhigh) passed its threshold; the first run's M1 and M2 are resolved; new M1: a retired waiver reapplies to a later pending row. Appended revision phase p-rev3 (corrects p13); the gate reruns over p07-p-rev3. rgi-m02-exit2-revision-20261103

### 2026-11-04 · structural · oat-project-implement · p-rev3

p-rev3 reached the 3-cycle review cap with one Low (the PR skills omit the unparsed-row waiver case). The operator chose to fix it as p-rev3-t04 and let the m02 exit gate rerun over p07-p-rev3 review it, with no fourth p-rev3 cycle. rgi-prev3-cap-20261103

### 2026-11-04 · structural · oat-project-implement · p-rev3

p-rev3 accepted (corrects p13, m02 exit gate rerun M1): review cycles 1-3 passed 0/0/0/1 each with fixes t02, t03, t04; t04 accepted at the cycle cap by operator decision and reviewed by the next exit gate rerun; head c08b2c054. All m02 phase-units accepted; the exit gate reruns over p07-p-rev3. rgi-prev3-outcome-20261103

### 2026-11-04 · structural · oat-project-review-provide · p07-p-rev3

Completed read-only mechanical test reconnaissance for reviews/range-review-2026-11-04T015726Z.md; root reconciled evidence inline; 81c12aac-482e-4ffd-93f3-b796e9c4ae76-review-orchestration

### 2026-11-04 · structural · oat gate review · p07-p-rev3

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-04T015726Z.md run=81c12aac-482e-4ffd-93f3-b796e9c4ae76

### 2026-11-04 · structural · oat-project-implement · m02

m02 exit gate rerun 81c12aac (p07-p-rev3, codex-6-sol-xhigh) passed 0/0/0/0 after three runs; exit carrier allowed and fresh at c08b2c054; m02 moved to reviewing. rgi-m02-exit-allowed-20261104

### 2026-11-04 · project · friction · Repo records after a reviewed head stale goal milestone evidence

**Category:** gotcha
**Source:** rgi-learning-m02-01
**Origin:** oat-project-implement
**Recorded:** 2026-11-04T16:05:36Z

Observation: a commit filing a backlog item (.oat/repo/pjm/backlog/) after m02's reviewed head made oat project delivery check report the exit carrier and integrated review stale (disallowed-path), although the implementation fingerprint excludes .oat/repo.
Impact: a goal milestone can lose fresh gate and review evidence from a repo-record write unrelated to its code.
Recommendation: file backlog items and decision records for a milestone on a separate branch, or after delivery; consider admitting .oat/repo paths as section 12.8 bookkeeping successors.
Uncertainty: whether excluding .oat/repo from the successor rule is intended.

### 2026-11-05 · structural · oat-project-pr-progress · d02

Registered d02 for m02 (p07, p12, p13, p-rev1, p-rev2, p-rev3) at https://github.com/voxmedia/open-agent-toolkit/pull/403; rgi-register-d02

### 2026-11-06 · structural · oat-project-goal · m02

Re-alignment entry for m02: d02 (PR 403) observed merged at its endpoint (squash 9da04ef1c); integrated review and exit gate still fresh at the merged head 247bdb3db (only a journal deferral followed the reviewed head); review-gate-integrity-goal-realign-m02

### 2026-11-06 · project · worked-well · Deferring nonblocking PR-bot findings keeps delivery evidence fresh through merge

**Category:** efficiency
**Source:** rgi-learning-m02-02
**Origin:** oat-project-goal
**Recorded:** 2026-11-06T20:53:34Z

Observation: PR 403's only post-gate bot finding (a nonblocking Warp test-hygiene suggestion) was deferred to p08 by the operator and recorded in a journal-only commit; oat project delivery check stayed ok and d02 merged with its exit gate and integrated review fresh, unlike d01, where post-gate Bugbot fixes staled both.
Impact: a milestone delivery keeps its review evidence when late PR-bot findings are dispositioned as approved deferrals rather than fixed on the delivery branch.
Recommendation: at land time, fix only blocking PR-bot findings on the delivery branch; route nonblocking ones to the next milestone as journal deferrals, and run oat project delivery check after the bookkeeping commit before merging.

### 2026-11-06 · project · friction · The configured exit gate's final scope refuses after a squash-merged milestone

**Category:** gotcha
**Source:** rgi-learning-m02-03
**Origin:** oat-project-goal
**Recorded:** 2026-11-06T20:53:35Z

Observation: m02's configured implement exit gate (--review-scope final with the state-selection prompt) expanded to the whole project and refused on m01's squash-merged phase anchors (run 788ae91a); each m02 exit run had to be routed to an explicit phase range (p07-p13, p07-p-rev2, p07-p-rev3).
Impact: every goal milestone after the first needs operator scope routing at its exit gate, which the closeout contract discourages.
Recommendation: resolve a state-selected final hint to the active milestone's ordered accepted phases (BL-261104-goal-mode-exit-gate-resolve). Until a released CLI ships the fix, route each exit run to the milestone's phase range and record the routing.
Uncertainty: a fix in m03 only helps gates from the release that carries it, because gates run the installed CLI.

### 2026-11-06 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/artifact-plan-review-2026-11-06T222001Z.md run=0d1fa309-a0e6-45a0-b4a9-c319f0fe3fa3

### 2026-11-06 · structural · oat-project-goal · m03

Activated m03 (p08, p14, p15, p16); review-gate-integrity-goal-activate-m03

### 2026-11-08 · structural · oat-project-implement · p08

p08 accepted (gate convergence visibility, Outcome 5): review cycles 1-3 found 0/1/2/1, 0/0/0/2, 0/0/0/0; fix loop 1 of 2 blocking rounds (t04-t06), post-pass Low fixes in t07; head dc43fa5b9. rgi-p08-outcome-20261108

### 2026-11-08 · structural · oat-project-implement · p14

p14 accepted (finding classification at receive, Outcome 5): review cycles 1-2 found 0/0/2/6, 0/0/0/1; fix loop 1 of 2 (t07: operator decision on uncited Medium/Low under autonomy, plus L4, L6); operator cut L1-L3, L5 and round-2 L1 as unwanted hardening; head 27f118621. rgi-p14-outcome-20261108

### 2026-11-08 · structural · oat-project-implement · p15

p15 accepted (goal milestone exit gate scope, Outcome 7): one review cycle, 0/0/0/0; no fix loop; prose rule in review-provide, no CLI helper; head a7e16e0a1. rgi-p15-outcome-20261108

### 2026-11-08 · structural · oat-project-implement · p16

p16 accepted (m02 review-ledger follow-ups, Outcome 4 upkeep): one review cycle, 0/0/0/0; no fix loop; check/resolve/pending number rows by data line, test-local writer removed; head b538b09ea. rgi-p16-outcome-20261108

### 2026-11-08 · structural · oat-project-review-provide · p08-p16

Review .oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-08T051752Z.md used one awaited intelligent-recon wave (gpt-6.1-terra medium); root reconciled its observations and independently reproduced 2 Medium convergence defects. 10ed9157-p14-recon-1

### 2026-11-08 · structural · oat gate review · p08-p16

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-08T051752Z.md run=10ed9157-0fdf-4981-b9b1-1ca3dffc673f

### 2026-11-08 · structural · oat-project-review-receive · p08-p16

m03 exit gate run 10ed9157 (p08-p16, codex-6-sol-xhigh) received: 0/0/2/0, both accepted-requirement under Outcome 5; fix records p16-t03, p16-t04 queued under p16 by the late-fix rule; exit gate reruns after p16 re-acceptance; rgi-m03-exit-r1-receive-20261108

### 2026-11-08 · structural · oat-project-implement · p16

p16 re-accepted at b2f6b3b44 after m03 exit gate fixes (p16-t03, p16-t04) and a root-inline Low fix (p16-t05); 2 review cycles, round 2 0/0/0/0; rgi-p16-outcome-r2-20261108

### 2026-11-08 · structural · oat gate review · p08-p16

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/review-gate-integrity-goal/reviews/range-review-2026-11-08T054348Z.md run=9c23d08c-eb00-40f7-930d-082fe2eece46

### 2026-11-08 · structural · oat-project-implement · m03

m03 exit gate rerun 9c23d08c (p08-p16, codex-6-sol-xhigh) passed 0/0/0/0 at b2f6b3b44; carrier m03.exit allowed/passed; rgi-m03-exit-carrier-20261108

### 2026-11-08 · structural · oat-project-review-receive · m03

m03 integrated review passed (0/0/0/2, bookkeeping-only fixes at receive, artifact m03-review-2026-11-08T055143Z); delivery check ok; m03 reviewing -> delivering; rgi-m03-int-receive-20261108

### 2026-11-08 · structural · oat-project-pr-progress · d03

Registered d03 for m03 (p08, p14, p15, p16) at https://github.com/voxmedia/open-agent-toolkit/pull/407; review-gate-integrity-goal-register-d03

### 2026-11-08 · structural · oat-project-goal · m03

Re-alignment entry for m03 (p08, p14, p15, p16): d03 (PR #407) observed merged at its agreed endpoint; review-gate-integrity-goal-realign-m03

### 2026-11-08 · project · feedback · m03 p08 was over-built before the hardening stop

**Category:** decision
**Source:** review-gate-integrity-goal-learning-m03-01
**Origin:** oat-project-goal
**Recorded:** 2026-11-08T16:48:19Z

Observation: p08 shipped plan-gate amendment inference (about 150 source and 300 test lines in gate/convergence.ts) for a case no recorded plan gate has hit, and p14 copied one routing paragraph into 8 planning skills; the operator stopped hardening only after p14, and the PR #407 self-review's testing and complexity lenses found the cost after both gates had passed.
Impact: the m03 delivery carries machinery the brief did not need, and fixing it now would have staled the exit gate and integrated review, so it was deferred to a backlog simplification item.
Recommendation: apply Feature Planning Triage at each phase start of a goal milestone (name the observed case each new mechanism serves), and run a complexity lens in the per-phase review rather than first at PR self-review.
Uncertainty: per-phase reviews were not briefed with the complexity-review standard, so it is unknown whether they would have caught it earlier.

### 2026-11-08 · project · friction · Released toolchain lags the goal's own fixes

**Category:** environment-limited
**Source:** review-gate-integrity-goal-learning-m03-02
**Origin:** oat-project-goal
**Recorded:** 2026-11-08T16:48:20Z

Observation: the m03 exit gate needed operator scope routing (p08-p16) because installed CLI 0.3.46 predates p15's milestone-scoped final; oat-project-pr-progress and oat-project-goal are not model-invokable, so each milestone handoff stopped for the user to type a slash command.
Impact: every milestone closeout of this goal paid manual routing and handoff steps that the shipped behavior removes only after release.
Recommendation: release and run oat tools update after each milestone merge before re-alignment; the invocation gate change is in progress in a separate PR modeled on #387.

### 2026-11-08 · project · friction · A squash-merged delivery cannot be re-gated

**Category:** gotcha
**Source:** review-gate-integrity-goal-learning-closeout-01
**Origin:** oat-project-goal
**Recorded:** 2026-11-08T18:20:00Z

Observation: d01's post-gate fix 4a870d471 staled its integrated review and exit gate, and recovery needs evidence bound to that exact head, which after a squash merge exists only on the merged branch and is not an ancestor of main; the recovery record owner (oat-project-pr-progress) is also not model-invokable.
Impact: the goal could not pass closeout-check; the operator accepted d01 as delivered and closed out by hand.
Recommendation: re-gate any post-gate fix before a goal milestone PR merges, or accept it with a recorded waiver at that time; closeout has no later path for a squash-merged delivery.

### 2026-11-08 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/review-gate-integrity-goal/references/project-retro.md evidence_used=archived-review-markdown,gate-analysis-outputs,git-history,lifecycle-artifacts,pr-progress-artifacts,project-log,session-transcript evidence_unavailable=oat-execution-learnings,session-transcript-pre-handoff promotions=4 upstream=3 apply=performed filing=performed

## End-of-run synthesis

Verdict: goal declared met 2026-11-08 with deferrals (Outcome 6 / p09 to BL-260820). Three milestones shipped (#400, #403, #407). Closed out manually on operator direction: closeout-check and complete-state refuse on d01 (stale after post-gate fix 4a870d471 was squash-merged), so state.md was rendered to the completed shape with the CLI's own renderer and the journal pointers cleared; the completion journal check passes. Adopted adjustments: four AGENTS.md / backlog retro promotions (RP-01 to RP-04). Graduated: general learnings rolled into project-observations; follow-ups filed as BL-261108-give-goal-closeout-a-recorded, BL-261108-stop-workflow-owned-commits, BL-261108-derive-first-release-versions and BL-261108-simplify-m03-gate-convergence; BL-261103-codex-gate-target-loses stays open.
