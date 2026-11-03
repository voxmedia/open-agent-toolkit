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

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
