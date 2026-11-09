---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-09
oat_current_task_id: p03
oat_generated: false
oat_template: false
---

# Implementation: goal-delivery-freshness

**Started:** 2026-11-09
**Last Updated:** 2026-11-09

> This journal records execution of the Project Brief in `plan.md` and is used
> to resume interrupted sessions.
>
> Conventions:
>
> - Progress counts phase-units: each `## Phase pNN:` in `plan.md` is one unit,
>   accepted only by the exact line `**Status:** completed` in its section here.
>   A provisional phase never counts as complete.
> - `oat_current_task_id` points at the **next unit to do**: a phase ID (`p02`)
>   or an open execution record (`p02-t03`). Set it to `null` when every phase
>   is accepted.
> - Marker lines are exact, one per line, directly under the phase heading:
>   `**Status:** pending | in_progress | completed | failed | extracted`,
>   `**Base:** <full SHA>`, `**Head:** <full SHA>`, and
>   `**Executor:** root | phase-implementer:<id> | worker:<id> | inline:<exception-ref> | reconciled`.
>   `**Status:** extracted` always pairs with `**Extracted to:** <slug>` naming
>   the linked project; without it the phase reads as `pending`.
>   Phase ownership ends at the next heading, so a task record's status is never
>   read as its phase's status.
> - `### Task pNN-tNN:` blocks are execution records, opened when work starts
>   and closed at commit with the SHA or a terminal status
>   (`completed | failed | cancelled | no-change`). They never change phase totals.
> - Reviews are **not** units. Track review status in `plan.md` under `## Reviews`.

## Progress Overview

| Phase | Status      | Units | Accepted |
| ----- | ----------- | ----- | -------- |
| p01   | completed   | 1     | 1/1      |
| p02   | completed   | 1     | 1/1      |
| p03   | in_progress | 1     | 0/1      |

**Total:** 2/3 phases accepted

---

## Phase p01: Workflow-owned writes stay bookkeeping

**Status:** completed
**Base:** 6989fdfb7217864378a7d2721cb942b26c07a653
**Head:** 7b061c1af55fdca4a71526401d1e04c32b25c0e7
**Executor:** phase-implementer:gdf-p01-impl-20261109

Phase verification at `7b061c1af` (clean tree): focused delivery and closeout suites exit 0 (7 files, 226 tests); skill-contract suites `src/commands/init/tools/shared src/validation` exit 0 (31 files, 1260 tests); `pnpm --filter @open-agent-toolkit/cli type-check` exit 0; `pnpm lint` exit 0; `pnpm format` exit 0 (turbo replayed unchanged packages; root oxlint and `format:root` ran). Can-fail proofs and the built-CLI probe are in p01-t01.

Worktree: `goal-review-gate-integrity` (branch `brief/goal-delivery-freshness`); committing owner: the phase implementer. Parallelism assessment: rung 3 (one phase implementer). No parallel group is declared (rung 1), and p01's slices (`classifyPath` change, its tests, contract 12.8 prose) share `delivery/evidence.ts` and its test file, so they fail the independence test for a root fan-out (rung 2). The phase adds new evaluator branches with negative controls, so the inline exception (rung 4) does not hold.

### Task p01-t01: Admit project review files and backlog paths as bookkeeping

**Status:** completed
**Commit:** 5606c3a0e9ce69020426f35a87e10eaf050251be
**Executor:** phase-implementer:gdf-p01-impl-20261109

- Intent: `classifyPath` returns `review-artifact` for any single file directly under this project's `reviews/` or `reviews/archived/`, and a new `backlog` kind (checked before the project-directory check) for paths under `.oat/repo/pjm/backlog/`; `judgeBookkeepingChange` accepts add/modify/delete for `backlog`. Own-evidence and review-row identity guards unchanged.
- Files: `packages/cli/src/commands/project/delivery/evidence.ts`, `packages/cli/src/commands/project/delivery/evidence.test.ts`, plus existing delivery/closeout tests whose expectations encoded the old reviews/ allowlist.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check`, can-fail proofs per new branch, and a built-CLI probe on a scratch goal repo.
- Result: focused delivery and closeout suites exit 0 (7 files, 226 tests, 11 new); `pnpm --filter @open-agent-toolkit/cli type-check` and `lint` exit 0.
- Changed expectations: ten existing tests encoded the old rule that an unlisted file under `reviews/` is a disallowed path (a gate artifact whose row is manual, mismatched, placeholder or artifact-typed; an unlisted `reviews/other-review.md`). Under Outcome 1 they now read fresh: `evidence.test.ts` gate-admission cases still assert the scope builder keeps those artifacts out of shared and own evidence; `check.test.ts` (3), `refresh.test.ts` (1) and `goal-boundary.test.ts` (1) flip to ok/fresh/complete; the unknown-path control now uses nested `reviews/nested/…`, `reviews/archived/nested/…` and another project's `reviews/` file. The `design.md` gate-row control stays disallowed.
- Can-fail proofs (each neutralized in `evidence.ts`, `evidence.test.ts` run, file restored byte-identical): review-file branch disabled → sibling-artifact, mixed, gate-admission and stale cases fail (12); backlog classification disabled → backlog, mixed and stale cases fail (7); backlog judged as refused → the same 7 fail; review regex widened to any depth under `reviews/` → nested unknown-path control fails; backlog prefix widened to `.oat/repo/` → decision-record, other `.oat/repo` and prefix-sibling stale cases fail; backlog prefix without its trailing slash → `.oat/repo/pjm/backlog-notes.md` stale case fails; identity guard's own-artifact requirement removed → the new sibling-identity case and three existing identity cases fail.
- Built-CLI probe (`pnpm build` exit 0, then `node packages/cli/dist/index.js --json project delivery check --project .oat/projects/shared/goal --subject d01` in scratch goal repos under the session scratchpad, built from the `__tests__/goal-repo.ts` fixtures with the member's observation committed; released `oat` 0.3.46 run beside it): accepted control (observed head = reviewed) → branch `ok` exit 0, released `ok`; mixed commit (state.md routing + `reviews/archived/d02-review.md` + backlog item and index) → branch `ok` exit 0, released `undeliverable` exit 1 (`disallowed-path … reviews/archived/d02-review.md`), the pre-fix bad state; same plus `src/app.ts` → branch `undeliverable` exit 1 `disallowed-path … src/app.ts`; same plus `.oat/repo/reference/decisions/DR-261109-demo.md` → branch `undeliverable` exit 1 `disallowed-path … DR-261109-demo.md`; sibling d02 artifact and row recorded while d01's pointer and heads move to an unreviewed fix → branch `undeliverable` exit 1 `substantive-change … state.md: delivery d01 member 0 changed its reviewed_head without recording a new review artifact`.
- KU1 (settled): `oat backlog regenerate-index` writes only `backlog/index.md`; `oat backlog new` writes `backlog/items/<id>.md` and the index; `oat backlog archive` moves `items/<id>.md` to `archived/<id>.md` and writes `completed.md` and the index, all under `.oat/repo/pjm/backlog/`, but it also rewrites inbound references to the item in Markdown anywhere under `.oat/repo` (`backlog/rewrite-references.ts`, scan root `.oat/repo`). Those reference rewrites outside the backlog stay substantive, as the brief's constraint on other `.oat/repo` paths requires.

### Task p01-t02: Brief contract 12.8 bookkeeping paths

**Status:** completed
**Commit:** 10a67cd00406ae9de4e503c4a0a55d77a12e80d3
**Executor:** phase-implementer:gdf-p01-impl-20261109

- Intent: section 12.8 Paths names any file directly under `reviews/` or `reviews/archived/` and paths under `.oat/repo/pjm/backlog/`, keeping decision records and other `.oat/repo` paths substantive and the identity rules unchanged. No skill version bump (p03).
- Files: `.agents/skills/oat-project-brief/references/brief-contract.md`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`, `pnpm lint`, `pnpm format`.
- Result: skill-contract suites exit 0 (31 files, 1260 tests); `pnpm lint` exit 0; `pnpm format` exit 0; `pnpm oat:validate-skills` exit 0. The gate-row shared-evidence sentence is kept, now framed as evidence-scope membership rather than path admission.

### Review Received: p01

**Review:** `gdf-p01-review-20261109` (oat-reviewer-claude-claude-opus-5-5-high), code `p01` on anchors `6989fdfb..7b061c1a`; artifact `reviews/archived/p01-review-2026-11-09T032005Z.md` (local-only).
**Findings:** 0 critical, 0 high, 0 medium, 1 low.
**Reconnaissance:** not-attempted.

- L1 (Low): three docstrings in `delivery/evidence.ts` (`EvidenceScope.evidenceArtifacts`, `deliveryEvidenceArtifacts`, `gateEvidenceArtifacts`) still describe the evidence-artifact list as the review-path allowlist; wording only, no behavior change → deferred to p02, which edits `evidence.ts` (trigger: p02's first `evidence.ts` record rewords them).
- Reviewer confirmed the ten flipped negative-control tests are sanctioned by Outcome 1 (each asserted only path refusal; the own/shared-evidence protection is still asserted), re-ran the focused and skill-contract suites and the built-CLI probes against released 0.3.46.

**Outcome:** passed (no Critical/High/Medium). Phase accepted.

---

## Phase p02: Head-bound freshness waiver

**Status:** completed
**Base:** 80557f121f03b31fb49cead40788f9e35bb60200
**Head:** 7e84086e245cd4428d40c0a4019ad6a92a5909ee
**Executor:** phase-implementer:gdf-p02-impl-20261109

Phase verification at `7e84086e2` (clean tree, isolated `HOME`): focused delivery, closeout-check and complete-state suites exit 0 (11 files, 298 tests); control-plane vitest exit 0 (14 files, 320 tests); skill-contract suites `src/commands/init/tools/shared src/validation` exit 0 (31 files, 1260 tests); full CLI vitest exit 0 (448 files, 9677 tests); `pnpm type-check` exit 0 (11 tasks, 0 cached); `pnpm lint` exit 0 and `pnpm format` exit 0 (cli and control-plane ran; the five untouched packages replayed from cache; root oxlint and `format:root` ran); `pnpm build` exit 0 (cache replay; its inputs are unchanged since the fresh post-t02 build that backed the branch-build probe). Can-fail proofs and the probe are in p02-t01 and p02-t02.

Worktree: `goal-review-gate-integrity` (branch `brief/goal-delivery-freshness`); committing owner: the phase implementer. Parallelism assessment: rung 3 (one phase implementer). No parallel group is declared (rung 1); the schema/parser, evaluator re-anchoring, record-restore rules and `delivery waive` command share `delivery/evidence.ts`, the control-plane delivery types and the delivery test fixtures, so slices fail the independence test (rung 2); the phase adds a new command surface, so the inline exception (rung 4) does not hold.

### Task p02-t01: Waiver record and head re-anchoring in the shared evaluator

**Status:** completed
**Commit:** 36687c58274afa794c2033431a16f8ccedc3a0b5
**Executor:** phase-implementer:gdf-p02-impl-20261109

- Intent: `GoalDelivery.freshness_waivers` (append-only `{ waived_by, reason, waived_at, members: [{ url, waived_head }] }`) in the control-plane types and parser; the review and exit-carrier successor walks start at a member's `waived_head` when the latest waiver names it and the walk's own anchor equals or is an ancestor of it; `judgeDeliveries` treats an edit to or removal of an earlier waiver entry as substantive and admits appends; reword the three evidence-artifact docstrings (p01 review L1).
- Files: `packages/control-plane/src/types.ts`, `packages/control-plane/src/state/parser.ts`, `packages/control-plane/src/state/parser.test.ts`, `packages/cli/src/commands/project/delivery/evidence.ts`, `packages/cli/src/commands/project/delivery/evidence.test.ts`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery`, control-plane parser tests, can-fail proofs per new clause.
- Result: focused delivery, closeout and complete-state suites exit 0 (10 files, 281 tests; 11 new waiver cases); control-plane vitest exit 0 (14 files, 318 tests; 1 new parser case); CLI and control-plane `tsc --noEmit` exit 0; oxlint 0/0.
- Design (phase-local): `evaluateSuccessor` takes an optional `waivedHead`; a waived head missing locally fails closed (`missing-object`), an inspection error is `inspection-failed`, and only the latest entry is read (`latestWaivedHeads`, matched by member URL). The stack carrier passes the tip member's waived head. `freshness_waivers` is optional on the `GoalDelivery` type (the reader always supplies a list) so existing literal fixtures need no change. Control-plane README names the field.
- Can-fail proofs (each neutralized in `evidence.ts`, the waiver suite run, file restored byte-identical by checksum): re-anchoring disabled → 7 fail; supersession disabled (a non-ancestor anchor still moved to the waived head) → the descendant-review and unrelated-head cases fail; missing waived object treated as no waiver → the missing-object case fails; `at(-1)` → `at(0)` → latest-only fails; carrier walk ignores waived heads → 4 fail; stack tip waiver dropped → stack case fails; review walk ignores waived heads → 6 fail; append-only rule disabled → edited/removed-entry case fails. The sibling-delivery and base-change clauses are structural (no code reads another delivery's waivers; the base check runs before the walk and is unchanged); their tests assert the outcome.

### Task p02-t02: Operator-only `oat project delivery waive` and closeout waiver listing

**Status:** completed
**Commit:** c79c2059ef67ef0ed94f27e8c3da40ed15c8b2bc
**Executor:** phase-implementer:gdf-p02-impl-20261109

- Intent: `oat project delivery waive --project <path> --delivery dNN --reason <text> [--by <name>]` observes the delivery's members live, refuses with a stable `--json` code (autonomous, live-observation failure, a missing local head with a fetch hint, already fresh, a governing Reviews row that is not a passed review of the recorded artifact, a carrier whose outcome is not `allowed`), and in one `state.md` write appends the waiver, records the observations, restores `integrated_review.disposition: passed`, sets the working carrier fresh for the milestone's latest delivery and clears a targeting `oat_goal_recovery` (with `oat_milestone_status: delivered` for the active milestone's own delivery). `closeout-check` and `complete-state` list the waivers of the terminal deliveries they judged (KU2). CLI registration and help snapshots.
- Files: `packages/cli/src/commands/project/delivery/waive.ts` (new), `waive.test.ts` (new), `delivery/index.ts`, `delivery/refresh.ts` (export `resolvePath`), `closeout-check/index.ts`, `complete-state/index.ts`, `closeout-check/goal-boundary.test.ts`, `commands/help-snapshots.test.ts`, `packages/control-plane/src/recommender/router.test.ts`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check src/commands/project/complete-state src/commands/help-snapshots.test.ts`, control-plane vitest, can-fail proofs per refusal and write clause.
- Result: those CLI suites exit 0 (12 files, 369 tests; `waive.test.ts` 16 cases, one new goal-boundary closeout/complete-state case, help snapshots updated plus a new `waive --help` snapshot); control-plane vitest exit 0 (14 files, 320 tests; 2 new router cases); CLI `tsc --noEmit` exit 0; `pnpm --filter …cli lint` and `…control-plane lint` exit 0.
- Design (phase-local, within the Decisions "A waiver covers head movement only" and "The waiver restores the stored record"): besides the brief's refusals, the command refuses `not-head-movement` when, with the observed heads waived, any consumer (the review under the `check`/`refresh` and closeout evidence scopes, the working carrier, the delivery `exit_gate`) still reads stale, because restoring `passed` or `fresh` then would record a false disposition (a base change takes this code). It also refuses `unknown-delivery`, `delivery-not-observable` (not open or at endpoint), `reason-missing` and `author-missing` (input validation); `--by` defaults to `git config user.name`. The governing row is the newest `code` row labelled with the delivery ID or its milestone (as the router and contract 12.6 read it); a recorded disposition `failed` also refuses. Observation also derives `status: at_endpoint` and the first `endpoint_attainment` exactly as refresh does. The command never commits and prints the commit/check next step.
- Readers unchanged: router (`recommendSkill`), `delivery check`'s `deliverable`, `evaluateGoalCoverage` and `complete-state` gained no waiver logic; the router tests show a waiver-restored record routes identically with and without `freshness_waivers`, and a waiver entry on a still-stale record still routes to review-provide.
- KU2 (settled): closeout lists the waiver in its own output, not in `oat_goal_outcome_audit`. `checkProjectCloseout` returns `waivers` (every waiver, oldest first, on the terminal deliveries whose evidence the boundary evaluated); `closeout-check --json` carries `waivers` on success and refusal, `complete-state --json` on success, and both human outputs print one `freshness waiver on dNN: <by> at <when>, <reason> (<url> @ <head>)` line per waiver. This departs from BL-261108-give-goal-closeout-a-recorded's audit criterion; handed to the root for the `## Deviations from Plan / Design` table (root-owned). The summary and PR body mention is p03 prose.
- Can-fail proofs (each neutralized in `waive.ts` or `closeout-check/index.ts`, `waive.test.ts` + `goal-boundary.test.ts` run, files restored byte-identical by checksum): autonomous check disabled → autonomous case fails; observation failures ignored → observation case fails; local-object check disabled → missing-object case fails; already-fresh check disabled → already-fresh case fails; post-waiver freshness check disabled → base-change case fails; carrier-outcome check disabled → blocked-carrier case fails; row-status check disabled → fixes-queued case fails; row-artifact match disabled → newer-artifact case fails; recovery clearing disabled → main flow fails; milestone-status restore disabled → main flow fails; latest-delivery condition forced true → later-delivery case fails; disposition restore removed → 5 cases fail; closeout listing emptied → goal-boundary waiver case fails. A first run showed the row-status neutralization surviving (the fixes-queued fixture also changed the artifact); the fixture now queues fixes on the recorded artifact and a separate newer-artifact case covers the match.
- Branch-build probe (`pnpm build` exit 0, CLI and control-plane rebuilt; then in a scratch goal repo under the session scratchpad `probe/repo2`, built by `probe/build-repo.sh`: d01 reviewed at R with configured working carrier and `exit_gate` bound to R, a post-gate fix F on `feat/goal`, `git merge --squash` into main; a fake `gh` on PATH reports `MERGED`, head F, base unchanged; `HOME` isolated): `node packages/cli/dist/index.js --json project delivery refresh` exit 0 (disposition → stale); recovery record written as pr-progress item 3 would and committed; `project status` → `oat-project-implement` "Goal recovery for m01/d01 needs its milestone exit gate"; `delivery waive --delivery d01 --reason … --by Operator` exit 0 (`restoredWorkingCarrier: true`, `clearedRecovery: true`, `restoredMilestoneStatus: delivered`, waived head F); `project status` → out of recovery (`oat-project-review-provide` "Final code review is required", the scratch brief's missing `final` row); `delivery check --subject d01` exit 0; `closeout-check` exit 0 `complete` listing `d01@F`; `complete-state` exit 0, `oat_lifecycle: complete`. In the first scratch repo (`probe/repo`): `OAT_AUTONOMOUS=1 … waive` exit 1 `autonomous`, tree unchanged; a second waive exit 1 `already-fresh`; released `oat` 0.3.46 on the waived state: `delivery check` exit 1 `undeliverable` and `closeout-check` exit 1 `review-not-fresh` (the pre-fix behavior), branch `closeout-check` exit 0 with the human waiver line.

### Task p02-t03: Brief contract 12.6, 12.7, 12.8 and 12.9 for the waiver

**Status:** completed
**Commit:** 271d990b8e628c18bcf969f3f88f701eb4624620
**Executor:** phase-implementer:gdf-p02-impl-20261109

- Intent: 12.6 names `delivery waive` as a recovery-clearing writer; 12.7 adds `freshness_waivers` to the entry, the Operator waiver contract (refusals, the one write, the only sanctioned writer that restores `passed`) and what "deliverable" means for a waived delivery; 12.8 states the re-anchoring rule and the append-only waiver record; 12.9 says closeout lists waivers and the outcome audit does not. No skill version bump (p03).
- Files: `.agents/skills/oat-project-brief/references/brief-contract.md`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`, `pnpm lint`, `pnpm format`.
- Result: skill-contract suites exit 0 (31 files, 1260 tests); `pnpm oat:validate-skills` exit 0 (68 skills); `oxfmt` clean. 12.6 adds the waive command's recovery clearing beside refresh's never-writes sentence; 12.7 adds `freshness_waivers` to the entry, a waived delivery's "deliverable" reading, and the Operator waiver bullet (every refusal code, the one write, the only sanctioned writer restoring `passed`/`fresh`); 12.8 adds the Operator waiver paragraph (latest-entry re-anchoring with supersession, missing waived head fails closed, stack tip, unchanged checks per consumer, `dNN` only, append-only record); 12.9 says closeout lists waivers and the audit does not.

### Review Received: p02

**Review:** `gdf-p02-review-20261109` (oat-reviewer-claude-claude-opus-5-5-high), code `p02` on anchors `80557f12..7e84086e`; artifact `reviews/archived/p02-review-2026-11-09T040231Z.md` (local-only).
**Findings:** 0 critical, 0 high, 0 medium, 3 low.
**Reconnaissance:** not-attempted.

- L1 (Low): a delivery whose stored disposition is `stale` while its live evidence reads fresh gets `undeliverable` from `delivery check` and "nothing to waive" from `delivery waive` → in-scope part (refusal message and contract 12.7 wording) deferred to p03; letting waive restore the record in that state has no contract source (`new-hardening`) and goes to the operator, not built.
- L2 (Low): contract 12.9 says both commands list waivers but `complete-state` lists them only on success; 12.7 omits four refusal codes (`unknown-delivery`, `delivery-not-observable`, `reason-missing`, `author-missing`); the control-plane README says only the evaluator reads `freshness_waivers` → deferred to p03 (docs/contract alignment).
- L3 (Low): the p02-t02 hand-off that p03 mentions waivers in the summary and PR body lived only in the journal → folded into p03's Intent.
- Reviewer judged `not-head-movement` a consequence of Outcome 2 (not new hardening) and the KU2 closeout-output settlement acceptable; reran the focused CLI (369), control-plane (320) and skill-contract (1260) suites and the branch-build probe.

**Outcome:** passed (no Critical/High/Medium). Phase accepted.

---

## Phase p03: Pre-merge prose, waiver routing and docs

**Status:** in_progress
**Base:** a650db90a6fb468499f6881075b526da92c0b896
**Executor:** phase-implementer:gdf-p03-impl-20261109

Worktree: `goal-review-gate-integrity` (branch `brief/goal-delivery-freshness`); committing owner: the phase implementer. Parallelism assessment: rung 3 (one phase implementer). No parallel group is declared (rung 1); skill prose, docs, the generated docs index, skill contract tests and the lockstep version files are coupled through the release and skill-bump gates, so slices fail the independence test (rung 2); the phase spans several surfaces and a release bump, so the inline exception (rung 4) does not hold.

### Task p03-t01: Name the review recovery in waive's stored-stale refusal

**Status:** completed
**Commit:** 0420cde65b7174320351a6db0dcc53fac991b5d5
**Executor:** phase-implementer:gdf-p03-impl-20261109

- Intent: p02 review L1 in-scope part. When every consumer's live evaluation reads fresh but the stored `integrated_review.disposition` is not `passed`, `delivery waive` still refuses `already-fresh` and writes nothing, but its message says the record is stale, that `delivery check` still reports it undeliverable, and names the recovery (a new integrated review received clean); waive does not restore the record (operator `new-hardening`, not built).
- Files: `packages/cli/src/commands/project/delivery/waive.ts`, `packages/cli/src/commands/project/delivery/waive.test.ts`.
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery/waive.test.ts`, a can-fail proof, CLI type-check and lint.
- Handle: gdf-p03-impl-20261109.
- Result: `waive.test.ts` exit 0 (17 tests, 1 new: a delivery staled earlier whose live evidence reads fresh again; `delivery check` reports it undeliverable and waive refuses `already-fresh` with the review-provide/review-receive recovery and without "nothing to waive", writing nothing); CLI `type-check` and `lint` exit 0. Can-fail: the message condition forced to the old wording → the new case fails (exit 1); file restored byte-identical by checksum. The review's suggested `delivery refresh` hint was not used: refresh never writes `passed` (contract 12.7, Observation), so the only recovery is a new review received clean (contract 12.6).

### Task p03-t02: pr-progress waiver routing and pre-merge prose, goal hand-back, contract and closeout alignment, skill bumps

**Status:** completed
**Commit:** c2a7ef5f6b6f3caa85beddaa7935ee61f3a68f08
**Executor:** phase-implementer:gdf-p03-impl-20261109

- Intent: Outcome 3 and the p02 review L1/L2/L3 prose. `oat-project-pr-progress` Step 5.5 accepts a waived delivery on the ordinary `status: ok` branch, items 3a and 8 offer the operator-only waiver for a delivery stale past its endpoint, a new "Before merging" paragraph puts the pre-merge `delivery check` instruction in the registration report and the PR body, and the template gains `## Before Merging` and a waiver listing; `oat-project-goal` Step 8.1 names the owner's offer and never waives; contract 12.7 names every refusal code and the stored-stale `already-fresh` recovery, 12.9 says `complete-state` lists waivers on success; `completion-and-closeout.md` step 1 states p01's path rule apart from shared-evidence membership; the control-plane README names the closeout listing; skill bumps brief 1.0.10, goal 1.0.7, implement 2.3.29, pr-progress 1.3.10.
- Files: `.agents/skills/oat-project-pr-progress/SKILL.md`, `.agents/skills/oat-project-goal/SKILL.md`, `.agents/skills/oat-project-brief/SKILL.md`, `.agents/skills/oat-project-brief/references/brief-contract.md`, `.agents/skills/oat-project-implement/SKILL.md`, `.agents/skills/oat-project-implement/references/completion-and-closeout.md`, `packages/control-plane/README.md`, `packages/cli/src/commands/init/tools/shared/goal-delivery-waiver-contracts.test.ts` (new), `packages/cli/src/validation/skills.test.ts` (version pins).
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`, `pnpm oat:validate-skills`, can-fail proofs for the new pins.
- Handle: gdf-p03-impl-20261109.
- Result: skill-contract suites exit 0 (32 files, 1270 tests; new `goal-delivery-waiver-contracts.test.ts` 10 cases; eight implement and one pr-progress version pins in `skills.test.ts` moved to the bumped versions); `pnpm oat:validate-skills` exit 0; oxfmt clean. Can-fail: each pinned file's sentence altered in turn (pr-progress pre-merge/3a/non-interactive wording, goal "Never run the waiver", closeout "bookkeeping by path", contract `author-missing`) → 2, 1, 1 and 1 cases fail (exit 1); each file restored byte-identical by checksum. Named-skill-load contract unchanged (no new execution pointer).
- KU3 (settled): the waiver offer belongs in pr-progress Step 5.5, as one shared "Stale past its endpoint: offer the waiver" paragraph that items 3a and 8 call when their `dNN` re-check reads not fresh for a delivery observed `at_endpoint` with its members merged (no fix can be pushed, so re-review and re-gating cannot complete). Item 3a offers it before applying item 3; item 8 offers it instead of the push-and-recheck, leaving the record on a declined or refused waiver. `oat-project-goal` keeps pr-progress as the owner at its Step 8.1 hand-back and only names the offer; it never runs the waiver. The waiver runs only on the user's explicit choice with the user's reason; non-interactive runs never run it.
- Scope note: the "summary and PR body" waiver mention (p02 review L3) is the pr-progress PR description (template Reviews waiver bullets); `oat-project-summary`'s `summary.md` and `oat-project-pr-final`'s body were not changed (closeout output already lists waivers, contract 12.9).

### Task p03-t03: Docs for bookkeeping paths, the freshness waiver and closeout waivers

**Status:** completed
**Commit:** e8b6eadc932d33b72fabf54604c60b97b0c2b338
**Executor:** phase-implementer:gdf-p03-impl-20261109

- Intent: Outcome 4 docs. CLI reference: `delivery check` names p01's bookkeeping paths and the waiver re-anchoring, a new `delivery waive` entry (writes, refusal codes, JSON), `closeout-check` and `complete-state` name the `waivers` field (closeout-check on success and refusal, complete-state on success; KU2 Deviations follow-up). Workflow and reference pages that describe delivery freshness, bookkeeping successors and closeout (`lifecycle.md`, `workflow-gates.md`, `closeout-skills.md`, `pr-flow.md`, `project-artifacts.md`, `project-state-machine.md`) and the CLI README gain the waiver, the pre-merge check and the path rule. Docs index regenerated.
- Files: `apps/oat-docs/docs/reference/cli-reference.md`, `apps/oat-docs/docs/reference/project-artifacts.md`, `apps/oat-docs/docs/reference/project-state-machine.md`, `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`, `apps/oat-docs/docs/workflows/projects/closeout/closeout-skills.md`, `apps/oat-docs/docs/workflows/projects/closeout/pr-flow.md`, `apps/oat-docs/docs/workflows/projects/lifecycle.md`, `packages/cli/README.md`.
- Proof: oxfmt, `pnpm --filter oat-docs docs:check`, the docs index regeneration and `git diff --exit-code -- apps/oat-docs/index.md`.
- Handle: gdf-p03-impl-20261109.
- Result: oxfmt clean; `pnpm --filter oat-docs docs:check` exit 0 (0 errors; the `[provenance]` warnings on the edited reference pages are the page-wide `.oat/repo` path pattern those pages already carried); index regeneration exit 0 with no diff to `apps/oat-docs/index.md` (the generated inventory lists pages, not their body text).

### Task p03-t04: Lockstep public package bump to 0.3.49

**Status:** completed
**Commit:** b823bb091ea018474bf7f95112e7b641f7322dc4
**Executor:** phase-implementer:gdf-p03-impl-20261109

- Intent: the branch changes shipped CLI and control-plane code and bundled skills and docs, so all five lockstep public packages move from `origin/main`'s 0.3.48 to 0.3.49, with the CLI's bundled `public-package-versions.json`.
- Files: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`, `packages/cli/assets/public-package-versions.json`.
- Proof: `git fetch origin main`, `pnpm release:check-versions`, `pnpm release:validate`.
- Handle: gdf-p03-impl-20261109.
- Result: after `git fetch origin main` (main unchanged since the branch base), `pnpm release:check-versions` exit 0 ("version bump check passed"); `pnpm release:validate` runs in the phase verification below.

### Task p03-t05: Correct the stale-past-endpoint rationale in pr-progress

**Status:** completed
**Commit:** ef10c5cb7240b5b809fb4547ce0495e2358fca14
**Executor:** phase-implementer:gdf-p03-impl-20261109

- Intent: self-review of p03-t02. The waiver paragraph said re-review and re-gating "cannot produce a deliverable record" for a merged delivery, which overstates: a merged head can still be re-gated when the review queues no fixes. It now says a recovery that queues fixes cannot land them on that pull request and that declining the waiver keeps the item's ordinary recovery path.
- Files: `.agents/skills/oat-project-pr-progress/SKILL.md` (already bumped to 1.3.10 in this PR).
- Proof: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`, oxfmt.
- Handle: gdf-p03-impl-20261109.
- Result: skill-contract suites exit 0 (32 files, 1270 tests); oxfmt clean.

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=gdf-p01-impl-20261109 · scope=p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=gdf-p01-review-20261109 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=gdf-p02-impl-20261109 · scope=p02 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=gdf-p02-review-20261109 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

<!-- orchestration-runs-end -->

## Reviews and Gates

<!-- Receipts for final, milestone and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- p02 review L1 in-scope part, L2 and L3 (Low): deferred to p03's docs and contract alignment, which edits the same contract and docs; trigger: p03 records. L1's restore-on-stale-but-live-fresh option is `new-hardening`, reported to the operator, not scheduled.
- p01 review L1 (Low, stale `evidence.ts` docstrings): deferred to p02 because p02 edits the same file; root disposition at receive (Low, non-blocking); trigger: p02's first `evidence.ts` record.
- p01 implementer concern: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` step 1 still says gate artifacts are "admitted as carrier bookkeeping only when" the reviewed head matches; carried into p03's docs alignment (it needs its own skill bump).

## Deviations from Plan / Design

Document any intentional deviations from the brief. Include accepted review findings where the shipped implementation is source of truth and the brief needs alignment.

| Phase / Review | Source Artifact                                            | Planned / Documented                                                  | Actual / Accepted                                                                                                                                                                                                                                                                      | Reason                                                                                                                                                    | Source of Truth | Follow-up                         |
| -------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------- |
| p02 (KU2)      | plan.md Outcome 2; BL-261108-give-goal-closeout-a-recorded | Closeout lists the waiver (backlog criterion named the outcome audit) | `closeout-check --json` and `complete-state --json` carry `waivers`, and both human outputs print one line per waiver; `oat_goal_outcome_audit` is unchanged                                                                                                                           | KU2 settled by p02: closeout output is where the waiver is read at completion; the outcome audit records per-outcome dispositions, not delivery freshness | implementation  | p03 docs name the `waivers` field |
| p02            | plan.md Outcome 2 refusals                                 | Refusals listed in Outcome 2                                          | Waive also refuses `not-head-movement` (a consumer would still read the delivery stale after the observed heads are waived, e.g. a base change) plus input refusals (`unknown-delivery`, `delivery-not-observable`, `reason-missing`, `author-missing`, recorded `failed` disposition) | Follows from "covers head movement only" and "restores the stored record": writing `passed`/`fresh` while still stale would record a false state          | implementation  | none                              |

## Final Summary (for PR/docs)

**What shipped:**

- [capability 1]

**Behavioral changes (user-facing):**

- [bullet]

**Key files / modules:**

- `[path]` - [purpose]

**Verification performed:**

- [tests/lint/typecheck/build/manual steps]

**Outcomes audit:**

- Outcome 1: [observed evidence (accepted phase, commit, or verification result) or the recorded deferral]

**Brief deltas (if any):**

- [what changed vs plan.md and why]

## References

- Brief: `plan.md`
- Research: `references/research/`
