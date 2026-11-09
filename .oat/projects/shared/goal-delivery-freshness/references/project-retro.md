---
oat_retro_project: goal-delivery-freshness
oat_retro_generated: 2026-11-09T21:17:00Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: gate-receipts
    status: used
  - source: git-history
    status: used
  - source: session-transcript
    status: unavailable
oat_retro_promotions: complete
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: goal-delivery-freshness

## Executive Summary

A three-phase brief project went from approved brief to merged PR (#417, `f0793b652`) in one day. Every phase passed its first review with no fix loop. The cost sat after implementation. Exit gate attempt 1 blocked on a High and a Medium. Attempt 2 passed with a Medium that was fixed after the gate. Two PR self-review fix rounds followed. Each of those three post-gate fixes made the exit gate stale again, and each needed an operator waiver that the agent wrote into `state.md` by hand. The main change for future runs is to give implementation exit-gate waivers a CLI writer, as `delivery waive` already is for goal deliveries.

## Evidence and Review Method

- **Used:**
  - `project-log.md`: 13 structural entries and 2 general `worked-well` judgments.
  - The lifecycle artifacts: `plan.md`, `implementation.md` (phase records, Orchestration Runs, Reviews and Gates, Deviations), `state.md` and `summary.md`.
  - The archived review markdown under `reviews/archived/` and the gate stdout receipts.
  - Git history, `e12ed2d93..d8dc1a9de` and squash merge `f0793b652`.
- **Unavailable:**
  - `oat-execution-learnings.md`. It is absent, which is normal, because the learnings live in the log.
  - The original session transcript. It was not re-read. Operator directives are cited only where the journal receipts record them.
- **Labels:** claims below are **Confirmed** unless they are marked **Hypothesis**.

## Outcome Snapshot

| Area         | Result                                                                                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope        | All four Outcomes delivered: review and backlog writes count as bookkeeping (p01); a head-bound freshness waiver and the `oat project delivery waive` command (p02); pre-merge prose and waiver routing (p03); contracts and docs aligned. Lockstep packages went to 0.3.49, with four skill bumps |
| Phase review | p01, p02 and p03 each passed round 1 (0 C/H/M)                                                                                                                                                                                                                                                     |
| Exit gate    | Attempt 1 blocked (1 High, 1 Medium; run `fc15f453`). Attempt 2 passed with 1 Medium (run `bdd9fc61`)                                                                                                                                                                                              |
| Post-gate    | 1 gate-fix commit and 2 PR self-review fix rounds, covered by 3 operator exit-gate waivers                                                                                                                                                                                                         |
| Delivery     | PR #417 squash-merged as `f0793b652`. CI, the release dry-run and Cursor Bugbot passed. Bugbot's one thread was resolved by fix C3                                                                                                                                                                 |

## Current State

- **Promotions:** `complete`. RP-01 was applied (`c485da505`).
- **Filing:** `proposed`. UP-01, UP-02 and UP-03 are proposed, with no destination set.
- **Unsettled items:** UP-01 to UP-03. The next action is the operator-chosen follow-up brief projects: one for UP-02 and UP-03 together, one for UP-01.

## What Went Well

- **Phase work was clean on the first pass.** Each phase implementer (Opus high, or medium for p03) produced work that its reviewer passed in round 1, and the deferred Lows were folded into the next phase's Intent rather than spawning fix loops.
- **Can-fail proofs found real defects.** Disabling each refusal clause one at a time exposed a fixture that refused for the wrong reason (`gdf-p02-weak-fixture`). Neutralizing waive's observation writes proved that the N1 test could fail.
- **Built-CLI probes against the released 0.3.46** showed the pre-fix bad state accepted and the post-fix state handled correctly. That is the negative-control evidence the AGENTS.md Definition of Done requires for assurance-bearing contracts.
- **The cross-family exit gate earned its cost.** The Sol gate (`codex-6-sol-xhigh`) found H1 and both Mediums after Opus phase and final reviews had passed. All three were real defects.

## Challenges and Struggles

- **Exit gate attempt 1 blocked (Confirmed).**
  - _What happened:_ H1 was that `waive` gave the carrier evaluator no current gate resolution, so it would have waived a reconfigured carrier as if only the head had moved. M1 was that the pre-merge `delivery check` read observations already stored in `state.md`, so it missed commits pushed after the gate.
  - _Response and result:_ both were fixed as p03-t07 and p03-t08, a fix-scoped re-review passed, and attempt 2 ran.
- **Attempt 2's Medium landed after the gate (Confirmed).**
  - _What happened:_ p03-t07's `.oat/config.json` guard compared every carrier's reviewed head with every member's observed head. For a stack whose upper layer configured the gate before its review, it therefore refused a valid waiver of only the tip.
  - _Response and result:_ p03-t09 (`320f394e2`) made the comparisons follow the judged walk pairs. Because the fix came after the gate, operator waiver 1 covered it.
- **PR self-review fixes made the exit gate stale twice more (Confirmed).**
  - _What happened:_ round 1 fixed 12 non-blocking findings and round 2 fixed C1, C3 and T2. The operator chose to fix these rather than track them. Each round's fix commits were substantive descendants of the allowed gate generation.
  - _Response and result:_ each round needed its own operator waiver (waivers 2 and 3). The agent hand-computed every waiver's `covered_fingerprint` (`effective-delta-v2`), checking its method by reproducing an earlier waiver's value, because no CLI command writes these waivers.
- **`state.md` YAML broke on a bookkeeping write.**
  - _What happened (Confirmed):_ commit `a323ee7ce` persisted exit gate attempt 2's result and the receive intent. Its write landed under a commented template line and made the frontmatter invalid.
  - _Response and result (Confirmed):_ it was repaired in the receive commit with no field values changed.
  - _Mechanism (Hypothesis):_ the long commented example blocks in the state template invite writes that indent into a comment. A parse-after-write check would have caught it at the write.
- **Completion arrived after a squash merge (Confirmed).** The PR merged before completion ran. Commits on the merged branch could never reach `main`, so completion ran on a fresh branch from `origin/main`. `state.md` still read `oat_pr_status: open`.

## Where We Changed Course

- **The pre-merge check:** after exit gate M1, a bare `delivery check` became `delivery refresh` followed by `delivery check`.
- **Waiver scope:** after exit gate H1, `waive` gained a `configuration-changed` refusal and covers only head movement.
- **Self-review follow-ups:** after the operator's direction to fix rather than file, findings C1, C3 and T2 were fixed in the PR instead of becoming backlog items. That cost one more waiver.

## Domain Learnings

- **Freshness is judged in one place.** The path allowlist in `delivery/evidence.ts` is shared by `delivery check`, `delivery refresh` and `closeout-check`, so widening it flips negative controls in all of their suites at once.
- **Gate freshness and review-driven fixes interact.** Any substantive fix made after the gate, including fixes from review that happens after the PR opens, needs either a re-gate or an operator waiver. The more review a PR gets after its gate, the more waivers it collects.
- **A squash merge leaves no commit range on `main`.** That is why the delivery waiver binds to the exact waived heads, not to a commit range.

## Gotchas for Humans

- If you merge before running `oat-project-complete`, run completion on a new branch from the base and open a small follow-up PR. Commits on the merged branch never reach `main`.
- Deciding to fix PR self-review findings after the exit gate also commits you to one more exit-gate waiver per fix round.

## Gotchas for Autonomous Agents

- After any write to `state.md`, parse the frontmatter, for example with node `require('yaml')` from `packages/cli`, before committing.
- When you prove a refusal can fail, confirm the fixture trips the clause it is named for, not only that it refuses.
- Never self-issue an exit-gate waiver. When the operator authorizes one, compute `covered_fingerprint` with the documented method, and check the method by reproducing an existing waiver's value first.

## Repo Improvements (Promotion Register)

### RP-01: Require can-fail proofs to fail for the named clause

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** `c485da505f261aec926aee021f7ba0c6578b5a3c`
- **Disposition-note:** Approved by the operator during completion on 2026-11-09; applied to the Definition of Done paragraph.

Under the Definition of Done, the paragraph that begins "When a test is the evidence that a P0 requirement holds, prove it can fail" checks only that the test breaks. In p02, a fixture named for one refusal was failing because of a different refusal, and the can-fail pass still looked green (`gdf-p02-weak-fixture`). Add one sentence: confirm that the failure comes from the neutralized clause, for example by checking the refusal code, and not merely that the test fails.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Add a CLI writer for implementation exit-gate waivers

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** Operator chose (2026-11-09, at completion) to address this in a follow-up brief project rather than file it: UP-02 and UP-03 together, UP-01 separately.

**Problem:** `oat_implement_exit_gate.waivers` entries (`waived_by`, `reason`, `from_commit`, `to_commit`, `covered_fingerprint`, `waived_at`) have no CLI producer. No non-test source under `packages/cli/src` writes `covered_fingerprint`.

**Evidence:** in this project the agent hand-wrote three waivers. For each it computed sha256 over `effective-delta-v2\0` plus a raw diff with exclusions, and checked the method by reproducing an earlier waiver's value. The delivery-side equivalent, `oat project delivery waive`, validates its record as it writes it. The exit gate has no counterpart.

**Direction:** add an operator-only command, for example `oat project exit-gate waive --from <sha> --to <sha> --reason <text> --by <name>`, that refuses under `OAT_AUTONOMOUS=1`. It would compute the fingerprint, append the entry, and confirm that the exit gate reads `allowed` afterwards.

### UP-02: Support merge-before-completion branch landing in oat-project-complete

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** Operator chose (2026-11-09, at completion) to address this in a follow-up brief project rather than file it: UP-02 and UP-03 together, UP-01 separately.

**Problem:** `oat-project-complete` says it supports "merge before completion", but its bookkeeping commit and archive go on the current branch. After a squash merge, that branch can never reach the base. The skill also keeps `oat_pr_status: open` and would sync the body of an already-merged PR.

**Evidence:** completion of this project had to cut a fresh branch from `origin/main` (whose project tree was identical to the merged branch) and open a follow-up PR.

**Direction:** detect a merged tracked PR (with `gh pr view --json state`). Record `oat_pr_status: merged` before completion. Offer to run the completion on a new branch from the base, with a follow-up PR. Skip syncing the body of a merged PR.

### UP-03: Validate state.md frontmatter after lifecycle bookkeeping writes

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** Operator chose (2026-11-09, at completion) to address this in a follow-up brief project rather than file it: UP-02 and UP-03 together, UP-01 separately.

**Problem:** a bookkeeping write that persisted an exit-gate result and a receive intent landed under a commented example line in the `state.md` template, which made the YAML invalid.

**Evidence:** commit `a323ee7ce`, repaired in the next receive commit. The mechanism (comment-adjacent indentation) is a hypothesis.

**Direction:** have the lifecycle skills that edit `state.md` frontmatter by hand parse it after the write and stop on failure. Alternatively, move those writes to CLI setters. Consider shortening the commented example blocks in the template.

## Remaining Boundaries and Follow-Ups

The follow-ups are those already recorded in `summary.md`:

- A `new-hardening` item reported to the operator: restoring a delivery that is stored as stale but reads fresh live.
- A known limit: a configured→configured change made only in the untracked config layer goes undetected by `waive`.
- An open option to list waivers in the summary and pr-final.

## Reflections

The brief format worked here. Phases settled their own known unknowns, and later phases took on the earlier phases' deferred Lows without extra rounds. The result is trustworthy because the Opus phase reviews were followed by an independent gate from a different model family, and because the contract claims carry negative controls built on the released CLI. What the run exposed is cost after the gate. Each round of post-gate polish needed a waiver, and the bookkeeping for each waiver was manual. Future runs should either finish PR-level review before the exit gate or have a CLI writer that makes post-gate waivers cheap and checked.
