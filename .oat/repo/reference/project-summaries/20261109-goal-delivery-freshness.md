---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-09
oat_generated: true
oat_template: false
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
oat_summary_learnings_fingerprint: 1739723efca50756480119575c4a91a2b395ec9600d88789a113d80f0627e688
oat_summary_phase_fingerprint: d6fcfc38706a1dafccfb2453737526475b5bd84b71c77155d14f61977912367a
---

# Summary: goal-delivery-freshness

## Overview

Goal mode could not get through a whole run. The workflow's own commits (gate artifacts archived by review-receive, backlog writes) staled milestone delivery evidence. There was also no way to record why a stale delivery was accepted, so `closeout-check` and `complete-state` could never finish. Both gaps blocked review-gate-integrity-goal: m01's exit gate and m02's evidence went stale from workflow-owned commits, and d01 (#400) could not close out after a post-gate fix was squash-merged. This brief project fixed both in one delivery (one PR to `main`).

## What Was Implemented

All three phase-units were accepted. Audited against the brief's four Outcomes:

1. **Workflow-owned writes stay bookkeeping (p01).** `classifyPath` in `packages/cli/src/commands/project/delivery/evidence.ts` now admits any single file directly under the project's `reviews/` or `reviews/archived/` as a review artifact. It also admits paths under `.oat/repo/pjm/backlog/` through a new `backlog` kind (add, modify and delete). A successor commit that touches only these paths and other admitted bookkeeping keeps a delivery's integrated review and exit carrier fresh. Code, tests, skills, docs, decision records and other `.oat/repo` paths stay substantive. The own-evidence and review-row identity guards are unchanged. Ten existing negative controls that encoded the old allowlist flipped to fresh and were renamed to state what they still prove.
2. **Head-bound operator waiver (p02, p03-t01, p03-t07, p03-t09).** `GoalDelivery.freshness_waivers` is an append-only list of `{waived_by, reason, waived_at, members: [{url, waived_head}]}`, carried in the control-plane types and parser. The review and exit-carrier successor walks re-anchor on a member's waived head only while no newer review or carrier supersedes it. A missing waived object fails closed. The new `oat project delivery waive --project <path> --delivery dNN --reason <text> [--by <name>]` command observes the members live. In one `state.md` write it then appends the waiver and records the observations. In the same write it restores `integrated_review.disposition: passed`, restores the working carrier's freshness for the milestone's latest delivery, and clears a targeting `oat_goal_recovery`. Every refusal has a stable `--json` code:
   - `autonomous` (under `OAT_AUTONOMOUS=1`)
   - live-observation failure, and a missing local head (with a fetch hint)
   - `already-fresh`, plus a review-recovery message when the record is stored-stale but the live evidence reads fresh
   - a governing Reviews row that is not a passed review of the recorded artifact
   - a carrier whose outcome is not `allowed`
   - `not-head-movement`
   - `configuration-changed`
   - the input refusals

   The readers (router, `delivery check`'s `deliverable`, `evaluateGoalCoverage`, `complete-state`) gained no waiver logic. `closeout-check` and `complete-state` list the waivers of the terminal deliveries they judged.

3. **Prevention and routing (p03).** `oat-project-pr-progress` tells whoever merges a goal milestone PR to first run `oat project delivery refresh` and then `delivery check --subject <dNN>`. It says this in the registration report, in the milestone PR body and in a new template `## Before Merging` section. The merger stops when the refresh fails to observe a member, and re-gates or waives a stale delivery. Step 5.5 accepts a waived delivery. Items 3a and 8 offer the waiver for a delivery that is stale past its endpoint, and only on the user's explicit choice. `oat-project-goal`'s Step 8.1 hand-back names that offer and never waives.
4. **Contracts and docs agree (p01–p03).** Brief contract sections 12.6–12.9 were updated, along with `completion-and-closeout.md` step 1 and the control-plane and CLI READMEs. The docs pages updated are the CLI reference (new `delivery waive` entry and the `waivers` fields), project artifacts, project state machine, workflow gates, closeout skills, PR flow and lifecycle. Versions: lockstep packages 0.3.49; skills oat-project-brief 1.0.10, oat-project-goal 1.0.7, oat-project-implement 2.3.29, oat-project-pr-progress 1.3.10.

**Verification:**

- The full Definition of Done passed at `4ad61dccb`, including forced `pnpm test:evidence` (cli 9688 tests, control-plane 320, docs packages 85).
- At `320f394e2`, after the exit-gate fixes, these ran clean: `pnpm check`, type-check, lint, format, build, `check:skill-bumps`, the docs build and the index freshness check. The delivery suites (170 tests) and skill-contract suites (1270 tests) also passed.
- Every new clause has a can-fail proof.
- Built-CLI probes against released 0.3.46 showed the pre-fix bad state accepted before the fix and handled correctly after it. They covered a mixed bookkeeping commit, a squash-merged stale delivery waived through to `complete-state`, and stacked and reconfigured carriers.

## Key Decisions

All are operator decisions from 2026-11-09, recorded in the brief.

- **Backlog writes count as bookkeeping.** Backlog items and the generated index are tracking records that never ship. Admitting only `reviews/` would have kept the m02 failure.
- **The waiver is a structured, append-only record on the delivery,** so all three evaluators read the same record and earlier waivers stay auditable (following DR-260927). A `Delivery waived:` journal line was rejected because code would have to parse it from prose.
- **Any stale delivery may be waived, bound to the exact waived heads.** Limiting waivers to merged deliveries protects nothing, because an operator can merge and then waive. The head binding stops a waiver from covering later pushes. This departs from DR-260927's commit-range binding, because a squash merge leaves no range on `main` to name.
- **A waiver covers head movement only.** It never stands in for a missing or failed review, or for a missing, blocked or reconfigured exit carrier.
- **A dedicated `delivery waive` command writes the waiver, and it restores the stored record.** The waiver is therefore validated when it is written. It is the one sanctioned writer that moves a stale disposition back to `passed`, so the router, check and closeout need no waiver logic. The rejected alternative needed five consumers changed.
- **Prevention is prose, not a gate.** pr-progress and the milestone PR body name the pre-merge check. Merges happen outside OAT, so there is no OAT-enforced merge block.
- **One delivery: one PR to main.** Shipping UP-02 as its own PR first was rejected.

## Design Deltas

- **KU2: closeout output, not the outcome audit.** `closeout-check --json` (on success and refusal) and `complete-state --json` (on success) carry `waivers`, and both human outputs print one line per waiver. `oat_goal_outcome_audit` is unchanged. This departs from BL-261108-give-goal-closeout-a-recorded's audit criterion: the outcome audit records per-outcome dispositions, not delivery freshness.
- **Extra refusals on `delivery waive`.**
  - `not-head-movement`: a consumer would still read the delivery stale after the observed heads are waived, for example after a base change.
  - The input refusals `unknown-delivery`, `delivery-not-observable`, `reason-missing` and `author-missing`, and a recorded `failed` disposition.

  These follow from "covers head movement only" and "restores the stored record". Writing `passed` while the delivery still reads stale would record a false state.

- **`configuration-changed` (exit gate H1).** `waive` refuses when the exit gate's current resolution differs from the carriers' resolution. It also refuses when the tracked `.oat/config.json` changed between a judged walk anchor and the observed head, even for an unrelated key. That case is followed by a re-gate. The guard reuses the existing resolver and adds no new fingerprint infrastructure.
- **Where waivers appear (p02 review L3).** The pr-progress local progress PR description lists waivers when it is regenerated for a registered delivery. The posted PR body is written before any waiver can exist. `oat-project-summary` and `oat-project-pr-final` were not extended, because closeout output already lists waivers (contract 12.9).
- **Pre-merge sequence.** The brief's pre-merge `delivery check` became `delivery refresh` followed by `delivery check` (exit gate M1). For a registered delivery, `delivery check` reads the observations stored in `state.md`, so it misses a commit pushed after the gate until a refresh.

## Notable Challenges

- **Exit gate attempt 1 was blocked: 1 High and 1 Medium** (`codex-6-sol-xhigh`, run `fc15f453`). H1: `waive` passed no current gate resolution to the carrier evaluator, so it would waive a reconfigured carrier as head movement. M1: the pre-merge check read stale stored observations. These were fixed as p03-t07 and p03-t08, and a fix-scoped re-review passed.
- **Exit gate attempt 2 passed with 1 Medium** (run `bdd9fc61`). p03-t07's `.oat/config.json` guard compared every carrier's reviewed head with every member's observed head. For a stack whose upper layer configured the gate before its review, it therefore refused a valid tip-only waiver. This was fixed as p03-t09 (`320f394e2`): the comparisons now follow the judged walk pairs. Because this commit landed after the gate, it needed the operator waiver below.
- **Broken `state.md` YAML.** A receive-correlation bookkeeping write (`a323ee7ce`) landed under a commented template line and broke the YAML. It was repaired in the receive commit without changing any field values.
- **A weak refusal fixture.** A can-fail proof showed that the fixes-queued fixture refused for a different reason (it also changed the artifact). The fixture was split so that each refusal is proven by the case named for it.

## Integration Notes

- The shared delivery-evidence evaluator (`delivery/evidence.ts`) is the single place where freshness is judged. `delivery check`, `delivery refresh` and `closeout-check` all route through it, so a change to its path allowlist can flip existing negative controls in all four suites.
- Freshness waivers on goal deliveries are distinct from implementation exit-gate waivers in `state.md`. This project shipped the former and used the latter once (below).

## Autonomous Execution Learnings

### Agent-instruction updates

- **Run the existing suites before writing new tests when widening a path allowlist in `delivery/evidence.ts`, then rename each test that flips to say what it still proves.** Widening it flipped ten existing negative controls from stale to fresh with no identity risk. oat-archive:20261109-goal-delivery-freshness#2026-11-09-worked-well-delivery-evidence-allowlist-changes-1
- **When proving that a refusal can fail, check which refusal the fixture actually trips, not only that it refuses.** Disabling the clauses one at a time exposed a fixture named for one refusal that was tripping another. oat-archive:20261109-goal-delivery-freshness#2026-11-09-worked-well-can-fail-proofs-on-refusal-fixtures-1

## Exit-Gate Waivers

- `a323ee7ce..320f394e2` (effective-delta-v2) waived by Thomas Stang at 2026-11-09T12:40:48Z: address-now fix of exit gate attempt 2 Medium (stacked-carrier config regression); tested with can-fail proof and built-CLI probe
- `4d5ae5d00..77d1cb270` (effective-delta-v2) waived by Thomas Stang at 2026-11-09T13:41:50Z: PR self-review fixes (tests, bound-revision anchor, docs), reviewed in a confirmation round
- `0010d0330..14ffc93e0` (effective-delta-v2) waived by Thomas Stang at 2026-11-09T14:02:30Z: PR self-review C1/C3/T2 fixes made at operator direction, reviewed in confirmation round 2; final small fixes N1–N3 tested

PR #417 was squash-merged to `main` as `f0793b652` on 2026-11-09.

## Follow-up Items

- **Not built (`new-hardening`, reported to the operator):** letting `delivery waive` restore a delivery whose stored disposition is stale while its live evidence reads fresh. The refusal message names the review recovery instead (a new integrated review received clean).
- **Known limit:** a configured→configured gate change made only in the untracked user or local config layer is not detected by `waive`, because the CLI has no producer for the skills' `config_fingerprint`. A change between `configured` and `no_gate` in any layer is still caught.
- **Open option:** the operator may later ask for waiver listings in `oat-project-summary` and `oat-project-pr-final`.
- **Out of scope:**
  - first-release versions in summaries (BL-261108-derive-first-release-versions)
  - exit-gate freshness for brief and quick projects (BL-260820-track-pr-closeout-evidence)
  - the decision-record half of BL-261108-stop-workflow-owned-commits, which stays a workflow practice
  - reopening review-gate-integrity-goal

## Associated Issues

- BL-261108-stop-workflow-owned-commits: the review-artifact and backlog bookkeeping half is addressed by p01. The decision-record half remains a workflow practice.
- BL-261108-give-goal-closeout-a-recorded: addressed by the operator waiver (p02). Waivers are listed in closeout output rather than in the outcome audit (see Design Deltas).

## Workflow Observations

- **2026-11-09 · worked-well · can-fail proofs on refusal fixtures** (general, gotcha) `oat-archive:20261109-goal-delivery-freshness#2026-11-09-worked-well-can-fail-proofs-on-refusal-fixtures-1`
  gdf-p02-weak-fixture: disabling each refusal clause one at a time exposed a fixture that refused for a different reason than the one it was named for.
- **2026-11-09 · worked-well · delivery evidence allowlist changes** (general, gotcha) `oat-archive:20261109-goal-delivery-freshness#2026-11-09-worked-well-delivery-evidence-allowlist-changes-1`
  gdf-p01-flipped-controls: widening a path allowlist in delivery/evidence.ts flipped ten existing negative controls from stale to fresh with no identity risk.

Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.
