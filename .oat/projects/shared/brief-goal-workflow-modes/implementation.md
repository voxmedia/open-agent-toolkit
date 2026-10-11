---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-11
oat_current_task_id: p06-t01
oat_generated: false
---

# Implementation: brief-goal-workflow-modes

**Started:** 2026-10-11
**Last Updated:** 2026-10-11

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, fill the Final Summary (for PR/docs) section below with what was actually implemented.

## Progress Overview

| Phase    | Status      | Tasks | Completed |
| -------- | ----------- | ----- | --------- |
| Phase 1  | complete    | 6     | 6/6       |
| Phase 2  | complete    | 5     | 5/5       |
| Phase 3  | complete    | 3     | 3/3       |
| Phase 4  | complete    | 6     | 6/6       |
| Phase 5  | in_progress | 2     | 2/2       |
| Phase 6  | pending     | 3     | 0/3       |
| Phase 7  | pending     | 3     | 0/3       |
| Phase 8  | pending     | 6     | 0/6       |
| Phase 9  | pending     | 2     | 0/2       |
| Phase 10 | pending     | 3     | 0/3       |
| Phase 11 | pending     | 2     | 0/2       |
| Phase 12 | pending     | 1     | 0/1       |

**Total:** 22/42 tasks completed

---

## Phase 1: Control-plane registry, phase-unit contract and readiness clause

**Status:** completed
**Started:** 2026-10-11

**Base:** 8f8465b957d6beaf414a2cfb90c61195a9129951
**Head:** 522659033bbb2cf95565b83acf1e37915687494e
**Executor:** phase-implementer:impl-p01-6392fd49 (oat-phase-implementer-claude-claude-opus-5-5-high)

### Phase Summary (fill when phase is complete)

- **Outcome:** accepted. Root review round 1 (Fable 5.1 high, auto) passed with 1 medium / 2 low → fix tasks p01-t05, p01-t06 (same implementer handle, fix mode); round 2 passed with 0 critical / 0 high / 0 medium / 1 low (bookkeeping, resolved here). Fix-loop count: 1. `brief` registered in `WORKFLOW_MODES` with `isBriefMode`; phase-unit parsing (`parsePhaseMarkers`, `parseProvisionalPhaseIds`, `phaseUnits` option) with strict journal markers; `selectPhaseUnits` seam and brief-aware readers; readiness clause 6 (`promotion-pending-phases`) with its router reason-map entry.
- **Verification:** phase-wide: control-plane suite 180/180; CLI suite 8363/8363 after a control-plane build (isolated HOME); `pnpm check` pass. Root re-ran the control-plane suite (180/180) and `pnpm type-check` (pass) before bookkeeping.
- **Notes:** report status DONE_WITH_CONCERNS (informational concerns only; no recovery attempts, 0/10).

### Task p01-t01: Register `brief` and the mode-family predicate

**Status:** completed
**Commit:** b1b134917

- **Files changed:** packages/control-plane/src/types.ts, packages/control-plane/src/state/parser.test.ts, packages/control-plane/README.md, packages/cli/src/commands/project/new/scaffold.ts, packages/cli/src/commands/project/new/index.test.ts, packages/cli/src/commands/help-snapshots.test.ts
- **Verification:** RED confirmed (3 failing in parser.test.ts); parser.test.ts 40/40; control-plane build; CLI new/index.test.ts + help-snapshots.test.ts 80/80; pnpm type-check 11/11.

### Task p01-t02: Phase-unit parsing with strict markers and public fields

**Status:** completed
**Commit:** ff024a0bd

- **Files changed:** packages/control-plane/src/types.ts, packages/control-plane/src/state/tasks.ts, packages/control-plane/src/state/tasks.test.ts, packages/control-plane/src/state/quick-plan-readiness.ts (export of readRecordLines; mechanical in-phase addition)
- **Verification:** RED confirmed (10 new failing); tasks.test.ts 22/22; control-plane check; type-check. Prove-it-can-fail cycles (a)–(e) below.
- **Prove-it-can-fail evidence** (mutate `tasks.ts`, run `tasks.test.ts`, restore from backup, `cmp` byte-identical): (a) disabled the heading reset in `parsePhaseMarkers` → "ends phase marker ownership at any heading" failed (1/21), restore 22/22; (b) removed `!provisional &&` → "lets a provisional plan phase override a journal completion" failed, restore 22/22; (c) made plan `### Task` lines add to `total` → "ignores plan task headings for totals" failed, restore 22/22; (d) dropped the `$` anchor from `STATUS_MARKER_PATTERN` → "rejects a status marker with trailing text" failed, restore 22/22; (e) removed the `phaseId !== null` filter → the new taskless-phase pin and the existing "keeps adjacent large phase ordinals distinct" failed, restore 22/22.

### Task p01-t03: Scope seam and reader wiring

**Status:** completed
**Commit:** 38512dbf1

- **Files changed:** packages/control-plane/src/state/tasks.ts, packages/control-plane/src/project.ts, packages/control-plane/src/project.test.ts, packages/control-plane/src/state/tasks.test.ts
- **Verification:** RED confirmed (5 failing); project.test.ts + tasks.test.ts 38/38; full control-plane suite 175/175 with isolated HOME.

### Task p01-t04: Readiness clause for promoted briefs

**Status:** completed
**Commit:** 81cfbd853

- **Files changed:** packages/control-plane/src/types.ts, packages/control-plane/src/recommender/router.ts, packages/control-plane/src/state/quick-plan-readiness.ts, packages/control-plane/src/state/quick-plan-readiness.test.ts, packages/control-plane/src/recommender/router.test.ts
- **Verification:** RED confirmed (4 failing); quick-plan-readiness.test.ts + router.test.ts 76/76; type-check.

### Task p01-t05: (review) Export the phase-unit parser surface from the package barrel

**Status:** completed
**Commit:** af7d01fbd

- **Files changed:** packages/control-plane/src/index.ts, packages/control-plane/src/state/parser.test.ts, packages/control-plane/README.md
- **Verification:** RED first (1 failed/40); parser.test.ts 41/41; control-plane build; dist probe [true,true,true,true]; control-plane check.
- **Continuation:** cont-brief-goal-workflow-modes-p01-fix-1 (resumed original handle impl-p01-6392fd49, mode fix)

### Task p01-t06: (review) Read block lists across blank and comment lines in readiness clause 6

**Status:** completed
**Commit:** 522659033

- **Files changed:** packages/control-plane/src/state/quick-plan-readiness.ts, packages/control-plane/src/state/quick-plan-readiness.test.ts
- **Verification:** RED first (2 failed/30); quick-plan-readiness.test.ts 32/32; pnpm type-check; control-plane check.
- **Continuation:** cont-brief-goal-workflow-modes-p01-fix-1 (resumed original handle impl-p01-6392fd49, mode fix)

### Review Received: p01

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p01-review-2026-10-11T024911Z.md
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p01-b6195573`, invocation auto, reviewed head 2ac285d80a0035837150bd77943331a86f51db29, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 1, Low 2 → phase review passes (no blocking findings); auto-disposition mode (review invocation `auto`).

- M1 `index.ts` barrel does not export the phase-unit parser surface → converted: p01-t05 (Task Scope: Minor). Agree: p04 needs the strict grammar through the barrel.
- L1 clause 6 fail-open across blank/comment lines → converted: p01-t06 (Task Scope: Minor). Agree: p06-t03 mirrors this clause into bash.
- L2 ledger hygiene (Progress Overview stale, Deviations rows under-padded, template log stanzas) → resolved by root in this bookkeeping commit; no task.

**New tasks added:** p01-t05, p01-t06
**Next:** done. Fix continuation landed af7d01fbd and 522659033; round-2 review (reviews/archived/p01-review-2026-10-11T030140Z.md, head f73b4e904b96de4be741daf526d0afcacfdbe05c) passed: 0/0/0/1 (L: Progress Overview row, abbreviated SHAs — corrected in this bookkeeping). Both p01 review events are `passed`.

---

## Phase 2: Router and dashboard routes

**Status:** completed
**Started:** 2026-10-11

**Base:** 212e1bdc0718d5f5dba02898826abb2201368afc
**Head:** d0e1f817ec779d27af4accf8882090d817083c5d
**Executor:** phase-implementer:impl-p02-a7c1a9c0 (oat-phase-implementer-claude-claude-opus-5-5-high) in worktree brief-goal-workflow-modes/p02; merged into root at cf5cae32a (no-ff)

### Phase Summary (fill when phase is complete)

- **Outcome:** accepted. Round-1 root review (Fable 5.1 high, auto; head 2826da694; C/H/M/L 0/0/1/1) passed and queued review-fix tasks on the same implementer handle; round-2 review (head d0e1f817e; C/H/M/L 0/0/0/0) passed. Fix-loop count 1.
- **Verification:** lane verification per task below; integration verification on the merged head 97d8f986f: control-plane 200/200, CLI 410 files / 8422 tests (isolated HOME), forced type-check 11/11.
- **Notes:** review artifacts reviews/archived/p02-review-2026-10-11T031650Z.md, reviews/archived/p02-review-2026-10-11T032434Z.md.

### Task p02-t01: Brief routes and mode-aware planning ownership

**Status:** completed
**Commit:** 32a502de3

- **Files changed:** packages/control-plane/src/recommender/router.ts, router.test.ts
- **Verification:** router.test 53/53 (RED first, 4 failures)

### Task p02-t02: Brief-unit guard before post-implementation routing

**Status:** completed
**Commit:** b7d8516a5

- **Files changed:** router.ts, router.test.ts
- **Verification:** router.test 60/60 (RED first, 3 failures); type-check; prove-it-can-fail: phase condition and lifecycle clause each fail exactly one test when removed, restored byte-identical

### Task p02-t03: Dashboard route map, help text and bounded parity

**Status:** completed
**Commit:** 2826da694

- **Files changed:** packages/cli/src/commands/state/generate.ts, generate.test.ts, packages/cli/src/commands/project/status.test.ts
- **Verification:** generate + status 73/73 after control-plane build (RED first, 6 failures); CLI check; type-check

### Task p02-t04: (review fix)

**Status:** completed
**Commit:** 8595e103e

- **Files changed:** router.test.ts
- **Verification:** router.test 60/60; neutralizing the provisional clause fails exactly the provisional case (59/60), restored byte-identical

### Task p02-t05: (review fix)

**Status:** completed
**Commit:** d0e1f817e

- **Files changed:** generate.ts, generate.test.ts
- **Verification:** generate.test 48/48 after build; CLI check

### Review Received: p02 (parallel group 1, pre-fan-in)

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p02-review-2026-10-11T031650Z.md (produced in the p02 worktree; copied into the root archive at fan-in)
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p02-c0d68110`, invocation auto, reviewed head 2826da694b6dce2df126f36599d97b7daecac265, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 1, Low 1 → phase review passes; auto-disposition mode.

- M1 provisional-unit guard clause not proven by its test (fixture always `completed: 0`) → converted: p02-t04 (Minor). Agree: a test that cannot fail is not evidence.
- L1 router-authority note printed in every brief phase → converted: p02-t05 (Negligible).

**New tasks added:** p02-t04, p02-t05. **Fix continuation:** cont-brief-goal-workflow-modes-p02-fix-1 on the original handle → 8595e103e (p02-t04), d0e1f817e (p02-t05); root re-verified router.test 60/60 and generate.test 48/48. **Round 2:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p02-r2-766d0616`, reviewed head d0e1f817ec779d27af4accf8882090d817083c5d, artifact reviews/archived/p02-review-2026-10-11T032434Z.md, reconnaissance not-attempted): 0 critical, 0 high, 0 medium, 0 low. **Lane verdict:** pass at d0e1f817e; fix-loop count 1; ledger rows and Reviews dispositions at fan-in.

---

## Phase 3: Templates and scaffold

**Status:** completed
**Started:** 2026-10-11

**Base:** 212e1bdc0718d5f5dba02898826abb2201368afc
**Head:** ca17285004fa03fc011272636199a6efce891a9c
**Executor:** phase-implementer:impl-p03-735f410f (oat-phase-implementer-claude-claude-opus-5-5-high) in worktree brief-goal-workflow-modes/p03; merged into root at 44523a3ae (no-ff)

### Phase Summary (fill when phase is complete)

- **Outcome:** accepted. Round-1 root review (Fable 5.1 high, auto; head 2a5c52f24; C/H/M/L 0/0/0/2) passed and queued review-fix tasks on the same implementer handle; round-2 review (head ca1728500; C/H/M/L 0/0/0/0) passed. Fix-loop count 1.
- **Verification:** lane verification per task below; integration verification on the merged head 97d8f986f: control-plane 200/200, CLI 410 files / 8422 tests (isolated HOME), forced type-check 11/11.
- **Notes:** review artifacts reviews/archived/p03-review-2026-10-11T032218Z.md, reviews/archived/p03-review-2026-10-11T033254Z.md.

### Task p03-t01: Brief plan and journal templates with bundle registration

**Status:** completed
**Commit:** b3e2abf40

- **Files changed:** .oat/templates/plan-brief.md (new), implementation-brief.md (new), state.md, plan.md; packages/cli/assets/templates/{plan-brief,implementation-brief}.md (force-added); packages/cli/scripts/bundle-inputs.mjs; packages/cli/src/commands/tools/shared/pack-manifest.ts (+test); packages/cli/src/commands/project/new/scaffold.test.ts
- **Verification:** scoped vitest 90/90 and 95/95; CLI build; template resolve plan-brief → repository tier; committed with plain git add -f + git commit (commit-paths refuses ignored paths)

### Task p03-t02: Scaffold behavior for brief projects

**Status:** completed
**Commit:** 2a5c52f24

- **Files changed:** scaffold.ts, scaffold.test.ts
- **Verification:** RED (missing references/research/.gitkeep) then 77/77; oat_template re-add proven by test

### Task p03-t03: (review fix)

**Status:** completed
**Commit:** ca1728500

- **Files changed:** .oat/templates/plan-brief.md, implementation-brief.md and bundled copies
- **Verification:** bundle + cmp identical; project/new + tools/shared 329/329; parser probe 2 units, p02 provisional

### Review Received: p03 (parallel group 1, pre-fan-in)

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p03-review-2026-10-11T032218Z.md (produced in the p03 worktree; copied into the root archive at fan-in)
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p03-2f0c98db`, invocation auto, reviewed head 2a5c52f241e48395054efb6399b101a257eaa801, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 0, Low 2 → phase review passes; auto-disposition mode.

- L1 `implementation-brief.md` lists `extracted` without the `**Extracted to:**` companion → converted: p03-t03 (Negligible).
- L2 grammar example in an HTML comment with bare marker lines → converted: p03-t03 (fence it) (Negligible).
- Cross-lane notes for p06/p07 (renamed Progress Overview and Deviations columns in the brief journal template; `[] = none` relies on plan-and-resume Step 2.5) carried to those phases.

**New tasks added:** p03-t03. **Fix continuation:** cont-brief-goal-workflow-modes-p03-fix-1 on the original handle → ca1728500 (p03-t03); root re-verified the scoped suite (329/329) and byte-identical bundled copies. **Round 2:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p03-r2-9ea8d283`, reviewed head ca17285004fa03fc011272636199a6efce891a9c, artifact reviews/archived/p03-review-2026-10-11T033254Z.md, reconnaissance not-attempted): 0 critical, 0 high, 0 medium, 0 low. **Lane verdict:** pass at ca1728500; fix-loop count 1; ledger rows and Reviews dispositions at fan-in.

---

## Phase 4: Plan profiles and promotion

**Status:** completed
**Started:** 2026-10-11

**Base:** 212e1bdc0718d5f5dba02898826abb2201368afc
**Head:** df13e2b71
**Executor:** phase-implementer:impl-p04-a8c76fdd (oat-phase-implementer-claude-claude-opus-5-5-high) in worktree brief-goal-workflow-modes/p04; merged into root at 97d8f986f (no-ff)

### Phase Summary (fill when phase is complete)

- **Outcome:** accepted. Round-1 root review (Fable 5.1 high, auto; head 449cdc606; C/H/M/L 0/0/2/3) passed and queued review-fix tasks on the same implementer handle; round-2 review (head 7e3966dcc; C/H/M/L 0/0/0/2) passed. Fix-loop count 1. Round-2 Low L1 executed as p04-t06 on the same handle and verified by root; L2 deferred with rationale (Deferred Findings).
- **Verification:** lane verification per task below; integration verification on the merged head 97d8f986f: control-plane 200/200, CLI 410 files / 8422 tests (isolated HOME), forced type-check 11/11.
- **Notes:** review artifacts reviews/archived/p04-review-2026-10-11T033122Z.md, reviews/archived/p04-review-2026-10-11T035054Z.md.

### Task p04-t01: Plan profiles in validate-plan

**Status:** completed
**Commit:** 5fdcbf020

- **Files changed:** validate-plan/{profiles.ts (new), profiles.test.ts (new), frontmatter.ts (new), validate-plan.ts, validate-plan.test.ts, index.ts, index.test.ts}
- **Verification:** validate-plan suite 62/62; oxlint/oxfmt/tsc clean

### Task p04-t02: Promote brief → quick

**Status:** completed
**Commit:** 449cdc606

- **Files changed:** promote/promote.ts, promote.brief.test.ts (new), validate-plan/profiles.ts (exports)
- **Verification:** promote suite 43/43 (36 lite unchanged); project suite 1373/1373; type-check; help-snapshots unchanged

### Task p04-t03: (review fix)

**Status:** completed
**Commit:** e028bb016

- **Files changed:** promote.ts, promote.brief.test.ts
- **Verification:** promote 43/43; review rows byte-identical incl. pending placeholders; one provenance line

### Task p04-t04: (review fix)

**Status:** completed
**Commit:** 1f0eb78a7

- **Files changed:** control-plane quick-plan-readiness.ts (+test), index.ts (lane widened); profiles.ts; promote.ts (import line)
- **Verification:** quick-plan-readiness 35/35 with fence-length and indent pins; validate-plan + promote 105/105; type-check; no local recordLineMask

### Task p04-t05: (review fix)

**Status:** completed
**Commit:** 7e3966dcc

- **Files changed:** profiles.ts (+test), promote.ts (+test)
- **Verification:** validate-plan + promote 108/108; one new case per finding

### Task p04-t06: (review fix)

**Status:** completed
**Commit:** df13e2b71

- **Files changed:** promote.ts, promote.brief.test.ts
- **Verification:** promote 46/46; type-check; fenced ### line survives, real ### Design demoted

### Review Received: p04 (parallel group 1, pre-fan-in)

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p04-review-2026-10-11T033122Z.md (produced in the p04 worktree; copied into the root archive at fan-in)
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p04-22f99828`, invocation auto, reviewed head 449cdc606a162b5e90966114e35479843c8c7506, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 2, Low 3 → phase review passes; auto-disposition mode.

- M1 `(pre-promotion, brief)` written into review-row Scope cells breaks Scope+Type+artifact identity → converted: p04-t03 (Minor). Agree. design.md "Promote brief → quick" wording ("annotated") is corrected at fan-in to a provenance line.
- M2 `recordLineMask` duplicates control-plane's fence reader; an index-preserving export is needed → converted: p04-t04 (Minor), with the p04 lane boundary widened to `quick-plan-readiness.ts`, its test and the barrel (no sibling lane touches them).
- L1 `**Provisional:**yes` accepted by the validator but not the parser → converted: p04-t05 (Negligible).
- L2 accepted phase without `**Head:**` synthesizes `**Commit:** -` → converted: p04-t05 (refuse with `missing-phase-head`).
- L3 `## Approach` dropped from working artifacts → converted: p04-t05 (render into discovery Solution Space).

**New tasks added:** p04-t03, p04-t04, p04-t05. **Fix continuation:** cont-brief-goal-workflow-modes-p04-fix-1 on the original handle → e028bb016 (p04-t03), 1f0eb78a7 (p04-t04, lane widened to control-plane `quick-plan-readiness.ts`, its test and the barrel), 7e3966dcc (p04-t05); root re-verified control-plane 186/186 and validate-plan + promote 108/108, no local `recordLineMask`. Deferred to p08: docs for `missing-phase-head` and the optional `phases` refusal field; standalone `## Out of Scope` routing into discovery (round-1 note, outside the fix scope). **Round 2:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p04-r2-e5d8f2bd`, reviewed head 7e3966dcc47c53dbdd6a693789fb82c96c6bc936, artifact reviews/archived/p04-review-2026-10-11T035054Z.md, reconnaissance not-attempted): 0 critical, 0 high, 0 medium, 2 low → pass; all round-1 findings verified closed (M2 equivalence probe 0 mismatches over 1.46M lines).

- R2-L1 Approach heading demotion not fence-aware → converted: p04-t06 (Negligible); executed on the same handle and verified by root, no third review round (passing review stands; Step 7b queued-task rule).
- R2-L2 standalone `## Out of Scope` routing into discovery → **deferred with rationale**: additive discovery rendering, the archived brief preserves the text, and the design lists the rendered sections explicitly; follow-up filed as a backlog item at p08-t05.
  **Lane verdict:** pass at the p04-t06 head (recorded at fan-in); fix-loop count 1.

---

## Phase 5: Brief entry skill and planning surfaces

**Status:** complete
**Started:** 2026-10-11
**Completed:** 2026-10-11

**Base:** 305ede50c3453cc43ef941b2033f4482d988be15
**Head:** c86f8558cf466eb04136039a667fa542126154e4
**Executor:** phase-implementer:impl-p05-50ae8921 (oat-phase-implementer-claude-claude-opus-5-5-high), root checkout (group 2 sequential); host session restarted after p05-t01, continued through the same handle

### Task p05-t01: `oat-project-brief` skill, shared contract, gate registration and autonomy entries

**Status:** completed
**Commit:** d4a1d4fc6

- **Files changed:** .agents/skills/oat-project-brief/{SKILL.md, references/brief-contract.md, references/docs/{autonomy-contract,gate-approval-record}.md symlinks}; .agents/docs/{autonomy-contract,gate-approval-record}.md; packages/cli/src/commands/shared/frontmatter.ts; pack-manifest.ts (+test); bundle-inputs.mjs; autonomy-gate-inventory.test.ts (17 roots); apps/oat-docs/skill-docs.json; starting-projects.md; docs/skills/index.md
- **Verification:** validate-skills, format:root, docs:skills:check, scoped vitest 269/269 (pack-manifest, autonomy inventory, bundled-docs, gate-record, preflight, frontmatter), gate-aware pin (`skills.test.ts` live pin) and the override-parser probe (the earlier `gate resolve … → not_configured` line was non-discriminating and is withdrawn as evidence)

### Task p05-t02: Planning-surface skills recognize brief

**Status:** completed
**Commit:** 31c4e56a3

- **Files changed:** fourteen planning-surface SKILL.md files
- **Verification:** order-independent rg sweep prints nothing; validate-skills; format:root; no autonomy re-keys (inventory test green)

### Task p05-t03: (review) Carry the brief contract in the review payload and state the promotion precondition once

**Status:** completed
**Commit:** c86f8558c

- **Files changed:** .agents/skills/oat-project-brief/SKILL.md (Step 3.6 `artifact_paths.brief_contract` payload entry keyed off `$BRIEF_SKILL_DIR` so user-scope installs resolve; Step 2 "Promotion precondition" paragraph; Step 3.7 option 3 ends with the quick-start hand-off); .agents/docs/autonomy-contract.md (BRIEF-04 cell mirrors the precondition; site line unchanged, no re-keys)
- **Verification:** fix continuation `cont-brief-goal-workflow-modes-p05-fix-1` on handle impl-p05-50ae8921; root re-ran validate-skills, format:root and autonomy-gate-inventory (5/5, 17 roots) — all exit 0; tree clean
- **Review:** no re-review round (passing review, Low fixes on the same handle per Step 7b); root read the diff

### Review Received: p05

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p05-review-2026-10-11T043436Z.md
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p05-86782b59`, invocation auto, reviewed head a4585a9cbe09a2208b54f3f38c3c4cf523cc04e8, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 0, Low 3 → phase review passes; auto-disposition mode. Only the three expected-red tests fail (p08-t01).

- L1 Step 3.6 promises the reviewer receives `brief-contract.md` but the payload has no carrier → converted: p05-t03 (Negligible).
- L2 promotion precondition and hand-off under-specified (SKILL.md, BRIEF-04) → converted: p05-t03 (Negligible).
- L3 plan verify clause `gate resolve oat-project-brief` is non-discriminating → resolved by root: plan p05-t01 verify clause replaced with the gate-aware pin and the override-parser probe; ledger evidence corrected below.

**New tasks added:** p05-t03 (same handle, fix mode; no re-review round for a passing review per Step 7b's queued-task rule; root verifies the prose change).

**Disposition:** passed at c86f8558c; artifact archived at reviews/archived/p05-review-2026-10-11T043436Z.md.

---

## Phase 6: Execution skills and agent roles

**Status:** complete
**Started:** 2026-10-11
**Completed:** 2026-10-11

**Base:** a4d7768d5ecf76482168e7bcdabf542c595d59d2
**Head:** 1e2ff01dd (fix round 2; candidate head d1969527b2e806ec5f5ee75d4bf3f69786ba2138 at review round 1, 578e88b0c at round 2)
**Executor:** phase-implementer:impl-p06-ba2fb5ee (oat-phase-implementer-claude-claude-opus-5-5-high), root checkout (group 2 sequential)

### Task p06-t01: Implement references for brief execution

**Status:** completed
**Commit:** 296a62f4e

- **Files changed:** .agents/skills/oat-project-implement/references/{plan-and-resume,phase-execution,completion-and-closeout}.md; `oat-project-implement/SKILL.md` left unchanged (a note there tripped the 251-line entry-size pin at `skills.test.ts:2913`; the note lives at `plan-and-resume.md:22-25`)
- **Verification:** validate-skills, format:root exit 0; design read-through file:line list — plan-and-resume.md :8 brief-family loads the contract, :81 resume reconciles open records against git log and live handles, :101 Step 2 reads the whole brief, :148 Step 2.2 document order and provisional-made-concrete, :182/:195 Step 2.5 `[]`/absent = no checkpoints, :385 Step 3 first incomplete phase-unit and finalization only when every unit is accepted, :416/:445 Step 4 implementation-brief template; phase-execution.md :18-138 brief-mode execution (requirement source :27, precedence ladder :33, independence test :51, phase-start record :60, execution records with lookahead :84, Head capture :100, fresh reviewer on anchors :107, late-fix rule :117, root-owned acceptance :125, journal ownership :130), :194 `workflow_mode` adds brief, :243 brief Phase Scope fields, :851 per-phase review pointer, :1042 parallel group, :1096 Step 7a, :1173 Step 7b, :1204 Step 8; completion-and-closeout.md :38 blockers, :48 Step 11 precondition, :61 completion audited against Outcomes, :122 progress lines, :177 final scope from anchors, :942 non-lite sequence and approval path with `pr` → `oat-project-pr-final`, :1332 output summary
- **Implementer-chosen contract (design gap, flagged for review):** the root writes and commits the phase-start record (`chore(oat): start pNN`) before dispatch and passes `anchor_base` plus the after-commit `phase_base_head`; the phase owner opens each record, makes one implementation commit excluding the journal, closes the record in a journal-only commit, and writes `**Head:**`; only the root writes `**Status:** completed`; in a parallel group the root writes the fork base and the integration-merge heads at fan-in

### Task p06-t02: Agent roles, regenerated projections and sync manifest

**Status:** completed
**Commit:** b260b9063

- **Files changed:** .agents/agents/oat-phase-implementer.md, .agents/agents/oat-reviewer.md (no `version:` bump, p08-t06); 130 regenerated projections under .codex/agents and .cursor/agents (implementer and reviewer variants only)
- **Verification:** validate-skills, format:root; `skills.test.ts -t "pins portable user-default agents"` pass (root re-ran: 1 passed); autonomy inventory 5/5 (no re-keys); `git diff --stat` shows only the regenerated agent files
- **Deviation:** `.oat/sync/manifest.json` is not in the commit. `oat sync --scope project` also created the `.claude/skills/oat-project-brief` link and a matching manifest entry (plus `lastUpdated`); both belong to p08-t02, so the implementer restored the manifest and removed the untracked link rather than commit them. p08-t02 re-runs sync and commits the manifest

### Task p06-t03: Quick-start promoted-brief resume and dispatch example

**Status:** completed
**Commit:** d1969527b

- **Files changed:** .agents/skills/oat-project-quick-start/SKILL.md (Step 0.5 promoted-brief resume; `quick_plan_ready` clause 6; Step 3 provenance note; the Step 3.7 disposition is the sign-off for the newly authored tasks), .agents/skills/oat-project-dispatch-subagents/SKILL.md (example accepts `workflow_mode: brief` with a phase ID scope)
- **Verification:** extracted `quick_plan_ready` probe under `mktemp -d` (deleted): `oat_promotion_pending_phases: ['p02']` exit 1, key absent exit 0, plus seven edge fixtures (`[]` 0, block list 1, bare key + comment + item 1, `null` then another key 0, bare key last line 0, duplicated key 1, scalar 1) agreeing with the built `evaluateQuickPlanReadiness` on all nine; negative control: pre-phase guard exits 0 on the `['p02']` fixture; guard-harness tests `review-skill-contracts.test.ts -t quick` 7/7; validate-skills, format:root

### Task p06-t04: (review) Pin the per-phase review range for parallel-group members

**Status:** completed
**Commit:** e2fd29c93

- **Files changed:** phase-execution.md ("Fresh reviewer on anchors" and the Parallel Group Execution brief note carry the group-member range sentence), oat-phase-implementer.md ("Journal ownership" names the reported worktree head as the per-phase review head), 65 regenerated implementer projections; manifest and the `oat-project-brief` link left to p08-t02
- **Verification:** fix continuation `cont-brief-goal-workflow-modes-p06-fix-1`; validate-skills, format:root exit 0; sync dry-run filtered prints only the deferred `create_symlink claude/oat-project-brief`; root re-ran all three plus the agents pin (1 passed), tree clean

### Task p06-t05: (review) Remove the stale `[]` sentence and the duplicated import bullet

**Status:** completed
**Commit:** 578e88b0c

- **Files changed:** plan-and-resume.md:169-172 (task modes read `[]` as every phase; brief modes as none), oat-phase-implementer.md (one `import` bullet), 65 regenerated projections
- **Verification:** `grep -c` import bullet = 1; the only "empty list means every phase" match is the reworded sentence; validate-skills, format:root, agents pin, inventory 5/5; no `version:` changes

### Task p06-t06: (review) Scope the anchor pre-check to sequential phases

**Status:** completed
**Commit:** 1e2ff01dd

- **Files changed:** phase-execution.md "Fresh reviewer on anchors" (sequential pre-check; group member uses step 3's descent check; the range stated once for both cases; fan-in anchors govern `pNN-pMM` and `final`)
- **Verification:** fix continuation `cont-brief-goal-workflow-modes-p06-fix-2`; validate-skills, format:root exit 0 (root re-ran); tree clean; no re-review (Low-only on a passing round)

### Review Received: p06

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p06-review-2026-10-11T051021Z.md
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p06-dc4c4725`, invocation auto, reviewed head 95a3a0bfa1dacc87935512dab62308a04338dacc, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 1, Low 4 → fixes required (Medium); auto-disposition mode. Only the three expected-red tests fail (p08-t01); sync dry-run shows every projection in sync with only the deferred `oat-project-brief` link pending.

- M1 parallel-group members have no reviewable anchors at per-phase review time → converted: p06-t04 (Important). Root decision: per-phase review stays before fan-in with range `EXPECTED_HEAD..<reported worktree head>`, as group 1 ran; fan-in anchors govern `pNN-pMM` and `final` scopes.
- L1 record-and-anchor ownership decision consistent but stated only in the references → design.md "Agent roles" sentence corrected in this bookkeeping; `brief-contract.md:72` wording carried to p08-t02 (outside p06's write set).
- L2 stale "empty list means every phase" sentence in plan-and-resume.md → converted: p06-t05 (Negligible).
- L3 duplicated `import` bullet in the implementer role and its projections → converted: p06-t05 (Negligible).
- L4 `implementation-brief.md` lacks an `**Outcomes audit:**` slot and its `**Head:**` placeholder says "when the phase is accepted" → carried to p08-t02 (p03 template, outside p06's write set).

**New tasks added:** p06-t04, p06-t05 (same handle, fix mode; re-review round 2 scoped to the fix commits because a Medium was converted).

### Review Received: p06 (round 2)

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p06-review-2026-10-11T052142Z.md
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p06-dc4c4725` round 2, invocation auto, reviewed head eebab37c3aa981c0f773ae85f39d5b9e7e7d29f2, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 0, Low 2 → phase review passes; round-1 M1, L2, L3 resolved with evidence; auto-disposition mode.

- L1 the anchor pre-check sentence at phase-execution.md:109 is still unqualified for group members → converted: p06-t06 (Negligible; same handle, no re-review).
- L2 brief-contract.md:214-230 and design.md "Parallel continuity" have no rung for the pre-fan-in member review → design.md sentence added in this bookkeeping; brief-contract.md:224 sentence carried to p08-t02 (outside p06's write set).

**New tasks added:** p06-t06.

**Disposition:** passed at 1e2ff01dd; artifacts archived under reviews/archived/ (rounds 1 and 2).

---

## Phase 7: Review, record and closeout skills

**Status:** complete
**Started:** 2026-10-11
**Completed:** 2026-10-11

**Base:** 57a8858ca740372cb0824569d47606806f45842c
**Head:** b65dbad794dfd041bc16a1091d084876d84e335f (fix round 1; candidate head d1e2a93c1f080f7399aa7768af9c3417e526550c at review)
**Executor:** phase-implementer:impl-p07-d224f8e5 (oat-phase-implementer-claude-claude-opus-5-5-high), root checkout (group 2 sequential)

### Task p07-t01: Review scope from anchors in review-provide

**Status:** completed
**Commit:** 4d26e567f

- **Files changed:** .agents/skills/oat-project-review-provide/SKILL.md (Step 3.0 "Brief-Mode Anchor Resolution" at :350 with the bash resolver `brief_resolve_anchors` at :436; brief required artifacts, artifact file set, rendering and the seven artifact record fields; additions beyond the design: anchored aggregate head must be on the reviewed branch, brief Step 3a narrowing measures from the aggregate head, a `pNN-tNN` token is not an anchored brief scope, explicit-range reviews record phase IDs from commit labels; "parallel member head must be a merge commit" dropped because step 7 may integrate by cherry-pick); .agents/docs/autonomy-contract.md (new prompt site `e3c08ecdab17 -> REVIEWPROVIDE-06` mapped in the same commit; resolver header comments moved to prose because the inventory scanner is not fence-aware)
- **Verification:** validate-skills, format:root; scripted check (resolver extracted verbatim, byte-identical to the committed block, one `mktemp -d` repo per case under bash 3.2): (1) linear A→B→C control → accepted, `anchors`, A..C; (2) decreasing heads p01 A..C, p02 A..B → reconcile (sequential continuity); neutralizing sequential-only or aggregate-only guards still rejects, both → wrongly accepted with range A..B omitting C; (3) bookkeeping commit K between phases → accepted, K inside `rev-list A..C`; (4) parallel group [p02,p03] with integration merges → `final` A..M3 listing M3, M2; `p02-p03` F..M3; control with p03 base ≠ fork → reconcile; fork-base guard neutralized → wrongly accepted; (5) missing p02 Head → `merge-base-range` / `missing-anchors`; detection removed → the existence check still fails closed to reconcile; (6) nonexistent p02 Head SHA → reconcile (existence); existence+ancestry+aggregate guards each still reject, all four → wrongly accepted with an invalid range; (7) 60 p01 commits + 5 later → anchor range covers 60, documented grep found 0 (git regex error, see Deferred Findings), corrected grep over `HEAD~50..HEAD` found 45; extras: `p02-p01` → invalid-scope; late fix moving p01 Head after p02 took its Base → reconcile; `p-rev1` after p02 → accepted in `final` and alone

### Task p07-t02: Review-receive and reconcile brief branches

**Status:** completed
**Commit:** f808aa33e

- **Files changed:** oat-project-review-receive/SKILL.md (:388 brief branch, reviewed phase from `oat_review_phase_ids`; :398 late-fix rule reopens `completed` → `in_progress`; :405-418 `## Phase p-revN:` with `**Corrects:** pNN` in plan and journal; :456 record IDs from the journal; :510-519 `(review)` records with `**Status:** pending` and `**Source review:**`; :552-563 event provenance and anchor record fields preserved, corrected phase's event moves to `passed` when the `p-revN` review passes; :644 pointer); oat-project-reconcile/SKILL.md (:135 brief branch; :148 anchor check, correction only after user confirmation and correcting an accepted phase's anchor reopens it; :161 records from the journal; :165-169 commits → records by `(pNN-tNN)` then phases by anchors, unmatched → `**Executor:** reconciled`; :175 live handles checked before closing; :179-187 never writes `completed` or a missing Head; pointer to first incomplete unit)
- **Verification:** validate-skills; read-through against design "Reconcile and review-receive" (lines above)

### Task p07-t03: Summary, PR, revise, complete, document and brainstorm

**Status:** completed
**Commit:** d1e2a93c1

- **Files changed:** summary (:25, :123 one accepted phase-unit prerequisite; :140 brief source table; :255-318 fingerprint fragment, invariant under whitespace and Intent edits, changes on acceptance, review rows, Outcomes; :495 frontmatter, `oat_summary_last_task` omitted), pr-progress (:158 scope from anchors; artifact set), pr-final (:32 summary required as in quick; :183 reduced-assurance note names the brief; :287 sources), revise (:202 `p-revN` with Intent and Exit evidence, no tasks; :236 pointer and journal section), complete (:393 staleness by fingerprint; archive References brief set), document (:220 brief artifact set), oat-brainstorm/SKILL.md (:404, :513 promote offers brief; :555 brief promote branch; :616-617 fold-back to `plan.md`, import fallback; :764-775 handoff rows), references/destinations.md (:125-126, :135, :166-172 lite/import/brief rows)
- **Verification:** validate-skills, format:root; read-through recorded above; scoped vitest 1289 passed / 4 failed, all expected reds; root re-ran validate-skills, format:root and the three pin suites (355/358, exactly the expected reds), tree clean

### Task p07-t04: (review) Review-provide label format, continuity notes and the brainstorm checklist

**Status:** completed
**Commit:** b65dbad79

- **Files changed:** oat-project-review-provide/SKILL.md (:364 and :532 labels `(pNN-` or `(prevN-` listed as `p-revN`; :570 resolver checks fork base and member-head order only, merge-commit property not enforced because step 7 may cherry-pick; :573 single member after fan-in resolves to `fork..<its integration head>` and carries earlier siblings' commits, prefer `pNN-pMM` or the pre-fan-in range, list siblings as context); oat-brainstorm/SKILL.md (:849 promotion writes discovery.md for quick/spec-driven, plan.md for lite, a references/research note for brief, never design.md). `brief_resolve_anchors` unchanged (hash-identical).
- **Verification:** fix continuation `cont-brief-goal-workflow-modes-p07-fix-1`; validate-skills, format:root, inventory 5/5 exit 0 (root re-ran all three); no re-key; tree clean; no re-review (Low-only on a passing review)

### Review Received: p07

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p07-review-2026-10-11T060048Z.md
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p07-8b097c29`, invocation auto, reviewed head f2cb39c80effd19effb9f49a05c9053be7cc299c, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 0, Low 4 → phase review passes; auto-disposition mode. The reviewer re-ran the scripted anchor check (cases 1–7 and the three extras) with outcomes matching the ledger, reproduced the pre-existing commit-grep bug and agrees it is outside p07 scope; only the three expected-red tests fail (p08-t01).

- L1 explicit-range label pattern `(p-revN-` never matches (`prevN-tNN` commits) → converted: p07-t04 (Negligible).
- L2 parallel-continuity prose promises a merge-commit head the resolver does not check → converted: p07-t04 (one sentence); brief-contract §10 and phase-execution.md:136-144 wording carried to p08-t02.
- L3 single group member reviewed after fan-in carries siblings' integration commits (documentation gap) → converted: p07-t04 (Negligible).
- L4 brainstorm success-criteria bullet contradicts the brief promote branch → converted: p07-t04 (Negligible).

**New tasks added:** p07-t04 (same handle, fix mode; no re-review round for a passing review per Step 7b; root verifies the prose).

**Disposition:** passed at b65dbad79; artifact archived at reviews/archived/p07-review-2026-10-11T060048Z.md.

---

## Phase 8: Contracts, integration, docs, records and the v1 progress PR

**Status:** complete
**Started:** 2026-10-11
**Completed:** 2026-10-11

**Base:** f5481541727e021804b19595bbb732b2ecd448f1
**Head:** 5b334a4e79c3630067fd159425f72bcda8e0ddbd (fix round 1; candidate head 6d60af35bb29566b61ab095094c5fe63750aefad at review)
**Executor:** phase-implementer:impl-p08-057027cb (oat-phase-implementer-claude-claude-opus-5-5-high), root checkout (fan-in after group 2); origin/main (0.3.18, #358, #359) merged at bf6c60c49 before launch, no file overlap

### Task p08-t01: Skill contract tests and autonomy coverage for brief

**Status:** completed
**Commit:** 57dec6702

- **Files changed:** named-skill-load-contract.test.ts (31 new rows, `oat-project-brief` added to 7 rows incl. the gate-inventory symlink rows :141/:291; `report.unclassified` empty), skills.test.ts (five-mode pins; new `brief mode skill contracts` block: entry surfaces, quick/spec-driven/lite-also-names-brief inventory guard, gateable, roles), review-skill-contracts.test.ts:4720, project-start-preflight-contracts.test.ts (`PROJECT_START_SKILLS`, `GATE_POSTURE_CALLER_SKILLS`), gate-approval-record-contracts.test.ts (`VENDORING_SKILLS`), post-implement-sequence-contracts.test.ts, .agents/docs/autonomy-contract.md (`9b3abe616c5d -> BRIEF-08`); earlier-phase prose edits required by the new pins: oat-project-brief/SKILL.md:352-368 (Step 3.57 shared posture-contract wording), oat-project-pr-progress/SKILL.md:19,:316 and oat-project-review-provide/SKILL.md:881-882 (mode lists name brief)
- **Verification:** scoped vitest 1285/1285; validate-skills, format:root, oxlint; prove-it-can-fail: removing the brief mention at oat-project-capture/SKILL.md:32 failed 2 of the 4 brief tests (entry surfaces, inventory guard), restored → 4/4

### Task p08-t02: Sync output, end-to-end integration tests and deferred snapshot edits

**Status:** completed
**Commit:** 5f27b8bc3

- **Files changed:** .claude/skills/oat-project-brief (tracked link), .oat/sync/manifest.json, commands.integration.test.ts (`project new --mode brief` → `oat-project-brief` route; promote brief → quick; readiness reason), promote.ts description + help-snapshots.test.ts, .oat/templates/state.md (`oat_brief_gate` block), .oat/templates/implementation-brief.md and the bundled `packages/cli/assets/templates/` copy (`**Outcomes audit:**` slot; Head placeholder "recorded when the phase's work ends, before its review"), brief-contract.md (:79 marker ownership stated once; :229-232 §10 resolver checks fork base and member-head order only; :235 pre-fan-in member-review sentence), phase-execution.md:141-147 (same alignment), oat-project-progress/SKILL.md (`Brief Gate:` line, with pins in gate-approval-record-contracts.test.ts and skills.test.ts)
- **Verification:** `git ls-files .claude/skills/oat-project-brief` lists the link; integration + help-snapshot suites 92/92; scoped suites 2596/2596; commit made with `git add -f` for the gitignored-but-tracked bundled template (same exception p03-t01 recorded)

### Task p08-t03: Real-artifact probe

**Status:** completed
**Commit:** ce7c57cf8

- **Probe setup:** `pnpm build` exit 0; one isolated `HOME=$(mktemp -d)` for the whole probe; scratch `mktemp -d` repo (deleted after): `git init` + empty initial commit, `node "$CLI" --cwd "$SCRATCH" init --scope project --no-project-guidance --no-hook` exit 0, `node "$CLI" --cwd "$SCRATCH" --json project new brief-probe --mode brief --scope shared` exit 0 (`status: ok`, `mode: brief`, scaffold commit; `--scope shared` added because the default synced scope refuses without an origin remote). The scaffolded journal carries the reworded `**Head:**` placeholder from the bundled template.
- **Authored artifacts:** a two-phase brief (p01 Alpha, p02 Beta, both taskless, `**Provisional:** no`, `oat_plan_parallel_groups: [['p01', 'p02']]`, plan review row passed, frontmatter complete → `oat-project-implement`); commits fork F `0cc7787` (brief approval), p01 head `69d6070`, p02 head `7efb73b` (integration by cherry-pick order, not merge commits); journal with both phases `**Status:** completed`, `**Base:** F`, their heads, `**Executor:** root`, and an `**Outcomes audit:**` block; committed as `chore(oat): fan-in p01-p02`.
- **`project status --json --project-path`:** exit 0; `workflowMode: brief`, `progress.total 2, completed 2`, each phase `unit: phase`, `total 1/completed 1`, `provisional: false`, `taskRecords 0/0`; recommendation `oat-project-implement` (plan pointer; state.md still at plan) — expected.
- **`project validate-plan --project-path`:** valid (exit 0) with the taskless group when the path is absolute or the process cwd is the scratch repo. Negative control: `[['p01']]` → exit 1 with the singleton-group error; restored → valid. Observation (pre-existing since 2026-04, not brief-introduced): with `--cwd "$SCRATCH"` and a relative `--project-path`, validate-plan reads `plan.md` relative to the process cwd and exits 2 (`ENOENT`); backlog item filed in p08-t05.
- **`state refresh`:** exit 0 at `plan/in_progress` → dashboard `oat-project-brief — Continue the project brief`; after setting state.md to `implement/complete` → exit 0, dashboard `oat-project-document` with the brief-unit authority note printed (the documented bounded parity: the dashboard has no phase-unit progress).
- **Control-plane `getProjectState` (imported from `packages/control-plane/dist/index.js` by absolute path):** `workflowMode brief`, units `p01`/`p02` each `unit: phase`, `1/1`, not provisional, total 2/2; router recommends `oat-project-review-provide` (`code final`, "Final code review is required"). Negative control: p02 `**Status:** in_progress` → `completed 1`, router `oat-project-implement` "Incomplete phase-units remain in the active scope"; restored → 2/2.
- **Result:** every probed command returned its expected categorical result; no owning-phase fix was needed.

### Task p08-t04: Docs, lane diagrams and root AGENTS.md

**Status:** completed
**Commit:** b322db3c1

- **Files changed:** 21 docs pages (choose-workflow, lifecycle incl. "Promoting a brief project to quick" with the `missing-phase-head` refusal and optional `phases` field, project-state-machine, project-artifacts, oat-directory-structure, cli-reference, approvals-and-automation, starting-projects, …), `public/diagrams/project-lifecycle-8-brief-lane-{light,dark}.svg` (new) and both state-machine SVGs, root AGENTS.md (Workflow Options adds brief, goal noted as v1.5; heuristic row), docs/skills/index.md and apps/oat-docs/index.md regenerated; oat-project-brief/SKILL.md:547-548 Step 5 `**Head:**` wording
- **Verification:** `pnpm --filter oat-docs check` 0; `pnpm build:docs` 0; `index.md` diff holds only the two generated description lines

### Task p08-t05: Decision records and backlog items

**Status:** completed
**Commit:** 0349cdd45

- **Files changed:** decision records DR-261011-brief-mode-family, DR-261011-phase-unit-progress-contract, DR-261011-anchor-based-review-scope, DR-261011-tasks-are-execution-records, DR-261011-brief-to-quick-promotion (IDs derive from titles; the plan's slugs were suggestions); backlog BL-261011-add-brief-to-the-legacy (generate-oat-state.sh mode table), BL-261011-route-a-standalone-out (`## Out of Scope` routing), BL-261011-fix-the-phase-commit-grep (pre-existing review-provide/pr-progress `\(` regex bug), BL-261011-resolve-validate-plan-project (probe finding: `validate-plan` ignores `--cwd` with a relative `--project-path`); both indexes regenerated
- **Caller check (copied from the backlog item body):** `grep -rn "generate-oat-state" --include=*.ts --include=*.mjs --include=*.md --include=*.sh . | grep -v node_modules` → 25 hits, all packaging and tests; no skill or CLI runtime path invokes the script (the plan's note that skills reference it did not hold)
- **Verification:** `pjm doctor` `adoption.state: declared` (explicit adoption, `pjm.initialized: true`, doctor passes); decision index regenerates with no diff after the commit; tree clean

### Task p08-t06: Version bumps and the full gate run

**Status:** completed
**Commit:** 6d60af35b

- **Files changed:** lockstep 0.3.18 → 0.3.19 in the five public `package.json` files and `public-package-versions.json` (origin/main re-fetched: still 0.3.18 at 417a34c57); roles `oat-phase-implementer` 1.1.7 → 1.1.8, `oat-reviewer` 1.2.11 → 1.2.12; 27 skill `metadata.version` bumps (brainstorm 1.3.9, docs 1.0.5, pjm-review-backlog 1.6.4, autonomous 1.0.20, capture 1.0.5, complete 1.7.16, discover 2.2.10, dispatch-subagents 1.1.8, document 1.8.9, implement 2.3.19, import-plan 1.4.21, lite 1.1.9, new 1.4.4, next 1.1.6, plan 1.4.18, plan-writing 1.2.36, pr-final 1.6.10, pr-progress 1.3.3, progress 1.4.6, promote-spec-driven 1.2.6, quick-start 2.3.20, reconcile 1.0.5, review-provide 1.5.14, review-receive 1.6.10, revise 1.0.6, summary 1.5.9, wave-execute 1.9.8; oat-project-brief new at 1.0.0); 56 version pins (54 skills.test.ts, 2 review-skill-contracts.test.ts; coincidental same-number pins for worktree-bootstrap(-auto), wrap-up and recon left alone); projections regenerated, manifest `oatVersion` 0.3.19
- **Verification (gate table, explicit exit codes):** check 0 · type-check 0 · test 0 · build 0 · check:skill-bumps 0 (30 changed skills/roles) · release:check-versions 0 · release:validate 0 (5 packages) · build:docs 0 (cache replay; forced rerun 0 cached also 0) · forced turbo test 0 (0 cached, no FULL TURBO; CLI 8465, control-plane 200) · test:smoke 0 (163) · test:skills 0 (700) · test:scripts 0 (1) · lint 0 · format 0; check:skill-bumps, release:check-versions and oat:validate-skills re-run green at HEAD; free disk ≥ 3.5 GB throughout; root confirmed the gate logs' tails and `FULL TURBO` count 0 in the forced test log

### Task p08-t07: (review) Brief arrival point in the brainstorm docs and the gate template comment

**Status:** completed
**Commit:** 5b334a4e7

- **Files changed:** apps/oat-docs/docs/workflows/projects/lifecycle.md:673 (Brief users arrive at `oat-project-brief` with the research note and the scaffolded plan.md); .oat/templates/state.md:85 ("read back by no route"); `packages/cli/assets/templates/state.md` is gitignored (not one of the force-tracked brief templates) and was refreshed locally only
- **Verification:** fix continuation `cont-brief-goal-workflow-modes-p08-fix-1`; `pnpm --filter oat-docs check`, gate-approval-record + help-snapshot suites (75/75), validate-skills, format:root — exit 0 (root re-ran all four); tree clean; no re-review (Low-only on a passing review); no version bump (lockstep already above origin/main)

### Review Received: p08

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p08-review-2026-10-11T070155Z.md
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p08-6b8f9c86`, invocation auto, reviewed head 7b268c896b86b8efd20486a2cacb8d2909821b6a, reconnaissance not-attempted)

**Findings:** Critical 0, High 0, Medium 0, Low 2 → phase review passes; auto-disposition mode. The reviewer independently re-proved the brief contract block can fail on a different p05 mention, confirmed every former expected-red pin is now the five-mode form, checked the tracked link and a clean sync dry-run ("No changes to apply"), `check:skill-bumps` (30 changed) and `release:check-versions` after a fresh fetch, all exit 0.

- L1 lifecycle.md:673 brainstorm entry paragraph lists three arrival points for four lanes → converted: p08-t07 (Negligible).
- L2 `.oat/templates/state.md:85` `oat_brief_gate` comment "read back by nothing" contradicts the progress skill's `Brief Gate:` line → converted: p08-t07 (Negligible).

**New tasks added:** p08-t07 (same handle, fix mode; no re-review for a passing review per Step 7b; root verifies).

**Disposition:** passed at 5b334a4e7; artifact archived at reviews/archived/p08-review-2026-10-11T070155Z.md. v1 (brief) is complete at this head; the progress PR for p01–p08 is opened through `oat-project-pr-progress` (user-invoked) and the Astra v1.5 plan-revision round precedes p09.

---

## Phase 9: Goal registration and control-plane transitions (v1.5)

**Status:** complete
**Started:** 2026-10-11
**Completed:** 2026-10-11

**Base:** 3eaa3b16afd9c18646413278f9a8a8150cbcd6e5
**Head:** 611596345 (fix round 1; candidate head 17a996a2e35235a2fd4f2e4bf61eba763723a6a8 at review round 1)
**Executor:** phase-implementer:impl-p09-16dc82a3 (oat-phase-implementer-claude-claude-opus-5-5-high), root checkout (v1.5 sequential)

### Task p09-t01: Register `goal`, extraction parsing and goal state fields

**Status:** completed
**Commit:** ab17cbd35

- **Files changed:** control-plane `types.ts` (goal in `WORKFLOW_MODES`/`BRIEF_MODES`; `extracted`; goal state fields incl. audit shape with per-phase `{disposition, reason, scope_decision_ref}`, `goalRecovery`, deliveries with reciprocal links and endpoint-attainment history, `milestoneGates` with nullable `reviewed_head`, subject binding, `exit.freshness`/`freshness_reason`), `state/parser.ts` (+test), new `state/milestones.ts` (+test; header `| Milestone | Phases |`, comma lists, backticks allowed, IDs normalized, exported `MILESTONES_TABLE_HEADER`), new `state/goal-audit.ts` (+test; `validateGoalOutcomeAudit` over the full phase inventory), `state/tasks.ts` (+test; `selectPhaseUnits` contract kept; extracted units goal-only via `extractedUnits`, brief still reads `extracted` as pending), `project.ts` (+test; both readers expose membership with errors, recovery, audit result), `index.ts` barrel, `README.md`; CLI `new/scaffold.ts` (`oat_plan_source: goal`, Milestones header substituted), `new/index.test.ts`, `new/scaffold.test.ts` (real-template read-back; widened), `help-snapshots.test.ts`; widened: `recommender/router.ts` one line (brief family routed through `BRIEF_ROUTES` so goal no longer fell through to the spec-driven table; `router.test.ts:1190` loops every mode)
- **Verification:** control-plane check/type-check/build + full vitest; CLI type-check + scoped vitest (new/, help snapshots, generate, status, validate-plan: 303); temp CLI import of every new barrel export type-checks; guard `goal-membership-reader` triple through `getProjectState` (malformed row / unknown `p09` / two-milestone `p02` silently vanish with the reader neutralized; restored → `milestones-malformed`, `phase-without-milestone`, `milestone-unknown-phase`, `phase-in-multiple-milestones`; well-formed two-milestone control exact in both runs)

### Task p09-t02: Goal routing priority and transition table

**Status:** completed
**Commit:** 17a996a2e

- **Files changed:** control-plane `recommender/router.ts` (+test; goal block after `getHillOverride`, before `getBriefUnitGuard`; `GOAL_ROUTES`; four-step priority, status table, recovery routes by missing evidence, explicit `mNN/dNN: ordered phases` contexts, `delivered` vs `at_endpoint`; approval = `plan.md` `oat_status: complete`; exit carriers must read `freshness: fresh`, null fails; registry integrated review counts only for its own artifact when its frozen scope covers every target phase), CLI `state/generate.ts` (+test); widened: `types.ts`, `project.ts`, `README.md` (goal-only `planParallelGroups` so the router can see the next dispatched group for the next-group-member-concrete check)
- **Verification:** full control-plane vitest 270/270 (root re-ran: 270/270; CLI scoped 219/219); guard triples recorded by the implementer — `goal-activation-prerequisites` (6 refusals + pending carrier + activation after declaration all flip when neutralized; valid control `ready to activate`), `goal-recovery-evidence` (five sub-guards: exit-carrier, `fixes_completed`, exact artifact, registry scope coverage, recovery routing; clean receive → `pr-progress deliver m01/d01` with m02 untouched), A1, A3 (audit repair reasons `audit-phase-omitted`/`audit-outcome-omitted`/`audit-missing`; counts unchanged), B4 (merged endpoint blocks activation, `open` permits), placement (block moved after the brief guard misroutes both controls to implement; brief-guard tests unchanged), stage walk (each owner once; disabling implement's stage write repeats the route)

### Task p09-t03: (review) Newest passed review wins over a stale registry entry; tolerant scope labels; normalized id lists

**Status:** completed
**Commit:** 611596345

- **Files changed:** control-plane `recommender/router.ts` (+test: newest `code` row by label resolved first, registry disposition governs only when the artifact matches; Scope cell `<id>` or `<id>: …`; real-reader cycle test in both registry-disposition variants), `state/parser.ts` (+test: `normalizePhaseId` over recovery, delivery, integrated-review and carrier-subject lists)
- **Verification:** fix continuation `cont-brief-goal-workflow-modes-p09-fix-1`; control-plane build, full vitest 275/275, type-check (root re-ran: 275/275, exit 0); tree clean; re-review round 2 on the fix range (High converted)

### Review Received: p09

**Date:** 2026-10-11
**Review artifact:** reviews/archived/p09-review-2026-10-11T090259Z.md
**Reviewer dispatch:** `oat-reviewer-claude-claude-fable-5-1-high` (request `rev-p09-6d0ca3c4`, invocation auto, reviewed head 29a4b914f311343c4f51e6431874d72e56814cb5, reconnaissance not-attempted)

**Findings:** Critical 0, High 1, Medium 2, Low 3 → fixes required (High); auto-disposition mode.

- H1 a registered delivery's recorded `integrated_review` shadows a newer passed review in every status-table route → converted: p09-t03 (Important).
- M1 the Reviews-table Scope cell contract for goal reviews was unrecorded → design "Explicit goal review scopes" now states the bare-id rule and the newest-row-wins rule; p09-t03 makes the router tolerant of `<id>: …`; p11-t01 carries the contract text and review-receive's `integrated_review` rewrite (p11-t02).
- M2 approval evidenced by `plan.md` `oat_status: complete` changes the activation contract for re-alignment → recorded in design "Router placement and evidence access"; p11-t01 owns the `plan`-carrier write order.
- L1 Milestones table grammar implementation-defined → carried to p11-t01 (brief-contract §12 verbatim) and p10-t01 (codes mapped onto the reader's errors).
- L2 exit-carrier `freshness: null` fails while plan-carrier null passes → design sentence recorded (every exit carrier producer writes `freshness: fresh`).
- L3 persisted phase-id lists read verbatim → converted: p09-t03 (normalize in `parser.ts`); p10-t01 reports non-canonical ids.

**New tasks added:** p09-t03 (same handle, fix mode; re-review round 2 on the fix range because a High was converted).

**Round 2:** `reviews/archived/p09-review-2026-10-11T091238Z.md` at 8113ced43 — 0/0/0/0; H1, M1 (code side) and L3 resolved with evidence; the second ordering fix (queued fixes before the stale-registry check) confirmed against A1.

**Disposition:** passed at 611596345; artifacts archived (rounds 1 and 2).

---

## Phase 10: Goal CLI: validation, delivery registry, refresh and closeout (v1.5)

**Status:** in_progress
**Started:** 2026-10-11

**Base:** 0cc095c5ae394a782efcec066880375f6725ddd1
**Head:** 97f2f1a32 (p10-t01 only; phase paused)
**Executor:** phase-implementer:impl-p10-7ff59906 (oat-phase-implementer-claude-claude-opus-5-5-high), root checkout (v1.5 sequential)

### Task p10-t01: Goal validation profile

**Status:** completed
**Commit:** 97f2f1a32

- **Files changed:** `validate-plan/profiles.ts` (+test; twelve goal codes: the nine planned plus `goal-milestones-malformed`, `goal-milestone-empty` (one-to-one with the reader's error codes, `GOAL_MEMBERSHIP_RULE_CODES`) and `goal-noncanonical-phase-id` (p09 review L3)); widened: `validate-plan/index.ts` (+test; reads `implementation.md` for the goal profile so journal-extracted phases are not reported by `goal-phase-without-milestone`). The design's "existing checkpoint rule" has no validate-plan counterpart and was not added.
- **Verification:** validate-plan vitest 83/83, CLI type-check 0, oxlint 0/0; guard `goal-profile-rules`: each code filtered out one at a time makes its rejection fixture validate (1–3 failures per code), restored 45/45; the shared valid fixture returns `[]`; the B2 append-to-recovery-milestone case passes

### Task p10-t02: Delivery registry types and `oat project delivery refresh`

**Status:** pending
**Commit:** -

### Task p10-t03: Closeout boundary inputs, coverage predicate and gate carriers

**Status:** pending
**Commit:** -

### Task p10-t04: Goal → quick promotion at a settled delivery boundary (B3)

**Status:** pending
**Commit:** -

---

## Phase 11: Goal skills and roles (v1.5)

**Status:** pending
**Started:** -

### Task p11-t01: `oat-project-goal` skill and goal sections of the brief contract

**Status:** pending
**Commit:** -

### Task p11-t02: Delivery registration, terminal delivery and review-loop owners

**Status:** pending
**Commit:** -

### Task p11-t03: Planning surfaces and summary recognize goal

**Status:** pending
**Commit:** -

---

## Phase 12: Goal contracts, docs, records and the final PR (v1.5)

**Status:** pending
**Started:** -

### Task p12-t01: Skill contract tests and autonomy coverage for goal

**Status:** pending
**Commit:** -

### Task p12-t02: Real-artifact goal probe

**Status:** pending
**Commit:** -

### Task p12-t03: Docs, lane diagram and root AGENTS.md for goal

**Status:** pending
**Commit:** -

### Task p12-t04: Decision records and backlog for goal

**Status:** pending
**Commit:** -

### Task p12-t05: Version bumps and the full gate run for goal

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1

**Started:** 2026-10-11
**Tier:** 1 (subagents) · **Provider:** claude · **Dispatch policy:** frontier (project state)

#### Phase p01 implementation dispatch

- Request ID: `impl-p01-6392fd49`
- Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` (native Agent, effort-pinned generated variant)
- Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0
- Selection reason: native-catalog · Candidates considered: `claude-opus-5-5/high` (requested candidate under the frontier ceiling)
- Task class: default-implementation (classification source: phase scope analysis; parser contract change inside one bounded package set, dispersed test pins)
- Managed Claude record: `oat project dispatch record` → validated-only
- Dispatch stamp: `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Launch status: accepted (native Agent launch, background) → child outcome: completed, report status DONE_WITH_CONCERNS; phase head 81cfbd853b23e0ce6e7057e67b7199cfadf63b3b; commits b1b134917, ff024a0bd, 38512dbf1, 81cfbd853; recovery attempts 0/10; optional nested dispatches: none
- Runtime confirmation: not-observable (no independent runtime identity captured)

#### Phase p01 review dispatch

- Request ID: `rev-p01-b6195573` · Dispatch target: `oat-reviewer-claude-claude-fable-5-1-high` (native Agent, effort-pinned) · Model axis: `selected:claude-fable-5-1` · Effort axis: `selected:high` · Selection mode: review-target · Selection reason: gate-target · Candidates: `oat-reviewer-claude-claude-fable-5-1-high`
- Managed Claude record: validated-only · Dispatch stamp: `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-fable-5-1 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-reviewer-claude-claude-fable-5-1-high`
- Launch status: accepted → child outcome: completed; artifact reviews/archived/p01-review-2026-10-11T024911Z.md; 0 critical, 0 high, 1 medium, 2 low; reconnaissance not-attempted (no `## Review Orchestration`, no project-log entry)

#### Phase p01 fix continuation

- Continuation event `cont-brief-goal-workflow-modes-p01-fix-1` on the original handle (request `impl-p01-6392fd49`, mode fix, target unchanged): commits af7d01fbd (p01-t05), 522659033 (p01-t06); report DONE; root re-verified (control-plane 183/183, forced type-check).

#### Phase p01 review dispatch (round 2)

- Request ID: `rev-p01-r2-294cf72e` · Dispatch target: `oat-reviewer-claude-claude-fable-5-1-high` · Model axis: `selected:claude-fable-5-1` · Effort axis: `selected:high` · Selection mode: review-target · Selection reason: gate-target · Managed Claude record: validated-only · Dispatch stamp: `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-fable-5-1 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-reviewer-claude-claude-fable-5-1-high`
- Launch status: accepted → first turn terminated by a transient gateway HTTP 503 (auth_unavailable) before any artifact; continued through the same accepted handle (no replacement launch) → child outcome: completed; artifact reviews/archived/p01-review-2026-10-11T030140Z.md; 0 critical, 0 high, 0 medium, 1 low; reconnaissance not-attempted
- Phase outcome: pass; fix iterations: 1; optional nested dispatches: none; worktrees: root; outstanding items: none

#### Phase p02 implementation dispatch (parallel group 1)

- Request ID: `impl-p02-a7c1a9c0` · Worktree: `.worktrees/brief-goal-workflow-modes-p02` (branch `brief-goal-workflow-modes/p02`, base 212e1bdc0718d5f5dba02898826abb2201368afc) · Parallel group: [p02, p03, p04]
- Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high`
- Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Bootstrap: success (strict; worktree HEAD = base 212e1bdc0; repository init pass; git clean; sync commit skipped) · Launch status: accepted (native Agent, background, concurrent with the group)

#### Phase p03 implementation dispatch (parallel group 1)

- Request ID: `impl-p03-735f410f` · Worktree: `.worktrees/brief-goal-workflow-modes-p03` (branch `brief-goal-workflow-modes/p03`, base 212e1bdc0718d5f5dba02898826abb2201368afc) · Parallel group: [p02, p03, p04]
- Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high`
- Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Bootstrap: success (strict; worktree HEAD = base 212e1bdc0; repository init pass; git clean; sync commit skipped) · Launch status: accepted (native Agent, background, concurrent with the group)

#### Phase p04 implementation dispatch (parallel group 1)

- Request ID: `impl-p04-a8c76fdd` · Worktree: `.worktrees/brief-goal-workflow-modes-p04` (branch `brief-goal-workflow-modes/p04`, base 212e1bdc0718d5f5dba02898826abb2201368afc) · Parallel group: [p02, p03, p04]
- Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high`
- Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Bootstrap: success (strict; worktree HEAD = base 212e1bdc0; repository init pass; git clean; sync commit skipped) · Launch status: accepted (native Agent, background, concurrent with the group)

#### Group 1 fan-in

- Lane verdicts: p02 pass at d0e1f817e (fix continuation cont-…-p02-fix-1; reviews rounds 1–2), p03 pass at ca1728500 (cont-…-p03-fix-1; rounds 1–2), p04 pass at df13e2b71 (cont-…-p04-fix-1 and -fix-2; rounds 1–2). Review dispatches recorded under each phase's "Review Received" section.
- Merges (plan order, `git merge --no-ff`): p02 → cf5cae32a, p03 → 44523a3ae, p04 → 97d8f986f; no conflicts (merge-tree dry run clean for all three). The first merge attempt was rejected by commitlint for the `merge(...)` type and completed with a `chore(pNN)` subject.
- Integration verification on 97d8f986f: control-plane build; control-plane 200/200; CLI build; CLI 410 files / 8422 tests (isolated HOME); forced turbo type-check 11/11 — all exit 0. The first attempt failed with `disk I/O error` because the volume was full; the three merged lane worktrees (5.5 GB) were removed and the pnpm store pruned before the rerun.
- Worktrees: all three removed after merge (artifacts copied to reviews/archived first); lane branches deleted after this bookkeeping.
- Outstanding items: none for group 1. Carried to p08: docs for the promote `missing-phase-head` reason and optional `phases` field; backlog item for standalone `## Out of Scope` routing; mode-list prose pins (expected-red list) belong to group 2 and p08.

#### Group 2 bootstrap preflight (strict) — degraded to sequential

- `oat-worktree-bootstrap-auto` preflight for [p05, p06, p07]: the volume had 3.3 GB free after group-1 cleanup; three lanes with the repository init (install + build) need about 5 GB (group 1 reclaimed 3.5 GB real when its three worktrees were removed). Pre-authorized reclaim (inactive worktrees' node_modules, brew, pnpm store) yields about 1 GB. Reason: `insufficient-disk` (strict policy, fail fast before creating any worktree). Per the Parallel Group Execution contract the group degrades to sequential, target-preserving execution in the root checkout: p05 → review → p06 → review → p07 → review, one implementer per phase at the unchanged target. Recorded as a deviation; the operator was asked to free space for later groups.

#### Phase p05 implementation dispatch (sequential, root checkout)

- Request ID: `impl-p05-50ae8921` · Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high` · Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Launch status: accepted → child outcome: completed (DONE); head 31c4e56a3; commits d4a1d4fc6, 31c4e56a3; the launching host session restarted after p05-t01 and the same handle was continued (no replacement)
- Review round 1 (rev-p05-86782b59, Fable 5.1 high at the frontier cap): pass with 3 Low; fix continuation `cont-brief-goal-workflow-modes-p05-fix-1` → c86f8558c; phase p05 closed at c86f8558c

#### Phase p06 implementation dispatch (sequential, root checkout)

- Request ID: `impl-p06-ba2fb5ee` · Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high` · Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p06 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Launch status: planned (base a4d7768d5ecf76482168e7bcdabf542c595d59d2, p05 closeout; the dispatch-plan commit sits between base and the first task commit; p06-t01..t03 in the root checkout after p05 closed at c86f8558c)
- Launch status: accepted → child outcome: completed (DONE_WITH_CONCERNS); head d1969527b; commits 296a62f4e, b260b9063, d1969527b; concerns: manifest deferred to p08-t02, implement SKILL.md note relocated to plan-and-resume.md (entry-size pin), extra named-skill-load sentences for p08-t01, implementer-chosen record-ownership contract flagged for review
- Review round 1 (rev-p06-dc4c4725, Fable 5.1 high at the frontier cap): 0/0/1/4; fix continuation `cont-brief-goal-workflow-modes-p06-fix-1` → e2fd29c93, 578e88b0c; round 2 (0/0/0/2 Low) passed; `cont-brief-goal-workflow-modes-p06-fix-2` → 1e2ff01dd; phase p06 closed at 1e2ff01dd

#### Phase p07 implementation dispatch (sequential, root checkout)

- Request ID: `impl-p07-d224f8e5` · Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high` · Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p07 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Launch status: planned (base 57a8858ca740372cb0824569d47606806f45842c, p06 closeout; the dispatch-plan commit sits between base and the first task commit; p07-t01..t03 in the root checkout after p06 closed at 1e2ff01dd)
- Launch status: accepted → child outcome: completed (DONE_WITH_CONCERNS); head d1e2a93c1; commits 4d26e567f, f808aa33e, d1e2a93c1; concerns: autonomy re-key mapped in-commit, pre-existing non-brief commit-grep regex bug left for triage, `final` scope checks accepted phases only (per design)
- Review round 1 (rev-p07-\*, Fable 5.1 high at the frontier cap): 0/0/0/4 Low → pass; `cont-brief-goal-workflow-modes-p07-fix-1` → b65dbad79; phase p07 closed at b65dbad79

#### Group 2 fan-in (sequential degradation)

- No lane merges: p05, p06 and p07 ran sequentially in the root checkout at the unchanged target, each with its own implementer handle and fresh reviewer (p05 1 round, p06 2 rounds, p07 1 round). Phase heads: p05 c86f8558c, p06 1e2ff01dd, p07 b65dbad79.
- Integration verification deferred to p08-t06's full gate run (the group's edits are prose and tests; validate-skills, format:root and the pin suites were green at every closeout with exactly the three expected reds).
- Carried to p08: p08-t01 expected reds plus the new named-skill-load sentences from p05–p07; p08-t02 the manifest and `oat-project-brief` link, `implementation-brief.md` Outcomes-audit slot and Head wording, brief-contract :72, :224 and §10 wording, phase-execution.md:136-144 wording; p08-t05 backlog item for the pre-existing review-provide/pr-progress commit-grep regex bug.
- Disk: 71 stale isolated-HOME temp dirs (3.3 GB) removed between p06 and p07; later phases use one fake HOME per run.

#### Phase p08 implementation dispatch (fan-in, root checkout)

- Request ID: `impl-p08-057027cb` · Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high` · Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p08 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Launch status: planned (base f5481541727e021804b19595bbb732b2ecd448f1, p07 closeout plus the friction log; the dispatch-plan commit sits between base and the first task commit; p08-t01..t06 in the root checkout)
- Launch status: accepted → child outcome: completed (DONE); head 6d60af35b; commits 57dec6702, 5f27b8bc3, ce7c57cf8, b322db3c1, 0349cdd45, 6d60af35b; earlier-phase files edited for pin consistency are listed per task
- Review round 1 (rev-p08-6b8f9c86, Fable 5.1 high at the frontier cap): 0/0/0/2 Low → pass; `cont-brief-goal-workflow-modes-p08-fix-1` → 5b334a4e7; phase p08 closed at 5b334a4e7 (v1 brief seam complete)

#### Phase p09 implementation dispatch (sequential, root checkout)

- Request ID: `impl-p09-16dc82a3` · Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high` · Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p09 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Launch status: planned (base 3eaa3b16afd9c18646413278f9a8a8150cbcd6e5, the plan-gate closeout; the dispatch-plan commit sits between base and the first task commit; p09-t01..t02 in the root checkout against design rev 4.0 / plan rev 5)
- Launch status: accepted → child outcome: completed (DONE_WITH_CONCERNS); head 17a996a2e; commits ab17cbd35, 17a996a2e; concerns: two widened edits (router.ts one line in t01; `planParallelGroups` in t02), four design-gap decisions (table grammar, extracted goal-only, approval = plan complete, freshness null fails) flagged for review; parser drops a delivery without `delivery_id` and reads an unparseable recovery as null (p10 validation)
- Review round 1 (rev-p09-6d0ca3c4, Fable 5.1 high at the frontier cap): 0/1/2/3; fix continuation `cont-brief-goal-workflow-modes-p09-fix-1` → 611596345; round 2 (0/0/0/0) passed; phase p09 closed at 611596345

#### Phase p10 implementation dispatch (sequential, root checkout)

- Request ID: `impl-p10-7ff59906` · Dispatch target: `oat-phase-implementer-claude-claude-opus-5-5-high` · Model axis: `selected:claude-opus-5-5` · Effort axis: `selected:high` · Selection mode: candidate · Route level: 0 · Selection reason: native-catalog · Candidates: `claude-opus-5-5/high` · Task class: default-implementation (phase scope analysis) · Managed Claude record: validated-only
- Dispatch stamp: `Dispatch: scope=p10 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Launch status: planned (base 0cc095c5ae394a782efcec066880375f6725ddd1, p09 closeout; the dispatch-plan commit sits between base and the first task commit; p10-t01..t04 in the root checkout; disk under 1 GB free with a 700 MB stop rule in the brief)
- Launch status: accepted → child outcome: NEEDS_CONTEXT (disk 558 MB < 650 MB stop rule) after p10-t01 (97f2f1a32); p10-t02 work captured as `references/p10-t02-recovered.patch`; p10-t03/t04 not started; resume from p10-t02 with base 97f2f1a32 and `recovered_patch` once free space exceeds about 1.5 GB

<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-10-11 (group 1)

- p02, p03, p04 implemented in parallel worktrees by Opus 5.5 high implementers; each reviewed twice (round 1 with fix tasks, round 2 clean/low-only); merged no-ff (cf5cae32a/44523a3ae/97d8f986f); integration verification green on 97d8f986f.

### 2026-10-11 (p01)

- p01 implemented by `oat-phase-implementer-claude-claude-opus-5-5-high` (request impl-p01-6392fd49): 4 tasks, 4 commits, verification green; root re-verified; ledger recorded before review (Step 7a).
- p01 reviewed (auto, Fable 5.1 high): pass with 1 medium, 2 low; M1 and L1 converted to p01-t05/p01-t06; L2 fixed in bookkeeping.
- p01 fix continuation (cont-brief-goal-workflow-modes-p01-fix-1, same handle): p01-t05 af7d01fbd, p01-t06 522659033; root re-verified control-plane 183/183 and forced type-check; event → fixes_completed; re-review round 2 dispatched.
- p01 round-2 review passed (0/0/0/1, bookkeeping low fixed here); phase p01 complete; both review events `passed`.

Chronological log of implementation progress.

## Deferred Findings

- p04 round 2, Low: route a standalone `## Out of Scope` brief section into discovery on promotion. Rationale: additive rendering; the archived brief (`references/brief-archive.md`) preserves the text; design lists the rendered sections explicitly. Follow-up: backlog item at p08-t05.
- (p07) Pre-existing bug outside brief scope: review-provide's quick/spec-driven commit grep `git log --oneline --grep="\(p${PHASE}-" HEAD~50..HEAD` (~:696-707) errors with `parentheses not balanced` under git's default basic regex, so that path finds 0 commits; pr-progress's `--grep="\\(${PHASE}-"` likely shares it. Carried to p08 as a backlog item (fix changes non-brief behavior).

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact                                                                                                     | Planned / Documented | Actual / Accepted                                                                                                                                                      | Reason | Source of Truth | Follow-up                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------- | ----------------------------------------------------------------------------------------------- |
| p01-t02       | design.md names the journal status type `PhaseStatus`; that name is already the dashboard type                      | -                    | Named the journal enum `JournalPhaseStatus` and the record `PhaseMarkers` (exported from tasks.ts)                                                                     | -      | implementation  | implementation is source of truth; design naming note to be reconciled at p08 docs/records      |
| p01-t02       | `readRecordLines` in quick-plan-readiness.ts was private                                                            | -                    | Exported it (export keyword only) so brief-mode scans reuse the exact fence/indent exclusion the design cites                                                          | -      | implementation  | in-phase mechanical addition, reported by the implementer                                       |
| p01           | plan step 3 says prove-it-can-fail cycles are recorded in implementation.md by the implementer                      | -                    | Implementer returned them in its report; root copied them into the p01-t02 task row                                                                                    | -      | implementation  | bookkeeping is root-owned under the implement contract                                          |
| p01           | global `oat` 0.3.16 lacks `internal commit-paths`                                                                   | -                    | Task commits made with the branch build `node packages/cli/dist/index.js internal commit-paths` (hooks on; same primitive)                                             | -      | implementation  | none                                                                                            |
| run           | operator asked for Opus 5.5 high subagents; the reviewer resolver refuses candidate overrides under a capped policy | -                    | Implementers run Opus 5.5 high via the exact-candidate branch; root-owned phase reviewers run the configured frontier cap `oat-reviewer-claude-claude-fable-5-1-high`  | -      | implementation  | the frontier ceiling the operator set is preserved; review rung is policy-bound for determinism |
| -             | -                                                                                                                   | -                    | -                                                                                                                                                                      | -      | -               | -                                                                                               |
| p04-t03       | design.md said historical review rows are "annotated `(pre-promotion, brief)`"                                      | -                    | p04 review showed a Scope-cell annotation breaks review-event identity; the promotion now writes one provenance line under `## Reviews` and leaves rows untouched      | -      | implementation  | design.md corrected in revision 3.2 (same fan-in)                                               |
| p03-t01       | plan commit route via `internal commit-paths`                                                                       | -                    | `commit-paths` refuses gitignored bundled template copies even after `git add -f`; committed with plain `git add -f` + `git commit` (hooks on)                         | -      | implementation  | none; later bundled-copy commits use the same route                                             |
| p04-t04       | p04 lane write set (validate-plan, promote)                                                                         | -                    | Lane widened by the root to control-plane `quick-plan-readiness.ts`, its test and the barrel to share one index-preserving fence reader (no sibling lane touches them) | -      | implementation  | none                                                                                            |
| group 1       | merge commits `merge(pNN): …`                                                                                       | -                    | commitlint rejects the `merge` type; fan-in merges use `chore(pNN): merge parallel-group phase …`                                                                      | -      | implementation  | none                                                                                            |
| group 1       | three concurrent lane worktrees each with a full install and build                                                  | -                    | Filled the volume (118 MiB free) and broke the first integration run; merged worktrees removed before rerun                                                            | -      | implementation  | group 2 needs ~6 GB free before bootstrap; see root judgment log                                |
| group 2       | plan declares `['p05','p06','p07']` as a parallel worktree group                                                    | -                    | Degraded to sequential root execution after a strict bootstrap preflight failure (`insufficient-disk`); targets, reviews and gates unchanged                           | -      | implementation  | restore parallel groups once the volume has headroom (operator asked)                           |

**Plan revision 5 / design revision 4.0 (2026-10-11):** after p08 closed, Astra v1.5 round 1 (`references/astra-v15-round-1.md`) resolved the four carried objections (A1–A4) and surfaced four contradictions with the landed v1 (B1–B4); design.md "Goal transition contract", "Review scope from anchors", "Promote brief → quick", "Delivery registry and closeout boundary", "Error Handling" and "Carried to the v1.5 review" were revised and p09–p12 re-planned with named negative controls plus the new task p10-t04. The first delegate (approval-required runtime mode) blocked on its first command and was cancelled; the retry ran in auto mode. The revision goes through one artifact review and an Astra confirmation round before p09 launches.

**Plan revision 5 artifact review (2026-10-11):** Opus 5.5 high structured plan review of p09–p12 at 58a721556 (`reviews/archived/plan-review-2026-10-11T074747Z.md`): 0 critical, 3 high, 7 medium, 6 low. All sixteen applied in root bookkeeping: router placement before the brief-unit guard (H1), new p11-t03 for the orphaned planning surfaces (H2), recovery producers named (H3), the v1.5 expected-red list (M1), `oat project delivery check` as the evaluator surface (M2), `selectPhaseUnits` contract kept (M3), barrel and README exports (M4), one audit predicate (M5), membership and profile guard triples (M6), p12 split into five tasks with the bump base and the PR relation (M7), and the six Lows (paths, references and codes, promotion vocabulary, Milestones placeholder, p11-t02 verify and sync scope; L3 was already fixed by Astra round 2). Astra round 2 had reached the two-round plan cap, so its five edits were applied verbatim rather than opening a third round. Re-review round 2 (0/1/2/3 at aca271b65) found the recovery stage progression had no owners, a transition-table contradiction, p11-t03's autonomy ownership, a wrong pack-manifest path with an undefined `$FH`, a mis-ordered Verify block and a missing persisted carrier-freshness field; all six applied in root bookkeeping. Round 3 (the cap, 0/0/0/1 Low at dc9409c6a) confirmed all six resolved; the Low (refresh listed as a writer of `exit.freshness`) applied in root bookkeeping. Plan revision 5 is approved by the orchestrator per the run rules (Astra alignment, artifact review, no further gate rerun: the lifecycle gate posture recorded at plan approval is unchanged by a phase-scoped revision) and p09 launches from it once the configured plan gate passes. Gate rerun attempt 1 (headless, Codex gpt-6.1-sol xhigh, `reviews/archived/artifact-plan-review-2026-10-11T080913Z.md`) returned 0/2/2/0: H1 `oat-project-revise` had no goal owner, H2 `oat-project-complete` could still create a second delivery PR, M1 pr-progress's status write was not scoped to the active milestone, M2 `oat-project-document` was not in the goal consumer inventory. All four applied (p11-t02, p11-t03, p12-t02, the guard supplement and design.md "Recovery producers"); gate attempt 2 (`reviews/archived/artifact-plan-review-2026-10-11T081731Z.md`, run 1fa1e354) passed with 0/0/0/0 at 1de4aac68; `oat_quick_start_gate` refreshed to that head. The first attempt-2 invocation was rejected as `gate-recursion` while attempt 1 still held its claim lock; it was rerun after attempt 1 exited.

**Goal approval evidence (p09 review M2):** the router evidences brief approval by `plan.md` `oat_status: complete`, written once by `oat-project-goal` after the first approval; each re-alignment's approval is evidenced only by that milestone's `oat_milestone_gates[mNN].plan` carrier, written `allowed` with a `plan` subject bound to the milestone's membership only after that milestone's artifact review, gate and user approval (p11-t01 owns the write order).

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                        | Passed | Failed | Coverage |
| ----- | ---------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | control-plane 180, CLI 8363 (post-build), type-check, pnpm check | all    | 0      | -        |
| 2     | control-plane 197, CLI generate+status 73                        | all    | 0      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`

## Quick-start record (2026-10-10)

- Design aligned with Astra (gpt-6-astra, high) in three delegated rounds: v1 ALIGNED WITH CHANGES (applied, design revision 3.1); v1.5 NOT ALIGNED, four items carried to the plan-revision review before p09.
- Dispatch policy: frontier (`oat_dispatch_policy` in state.md); reviewer ladder complete; implementers and reviewers for this run are Claude Opus 5.5 at high effort.
- Phase gate review: disabled (non-interactive; no selection recorded); Phase gate review remains disabled. Qualifying targets existed (claude-opus-5-5-high, codex-6-sol-xhigh, cursor variants) but no selection was recorded in autonomous planning.
- Lifecycle gate posture: no `oat_skill_gate_overrides` map written (non-interactive); configured gates for oat-project-quick-start (plan artifact review, block, 2 attempts) and oat-project-implement (final code review, block, 2 attempts) stay in force.
- HiLL: `oat_plan_hill_phases: ['p12']` (quick mode has no representation for none; `[]` would mean every phase). Under OAT_AUTONOMOUS the checkpoint auto-reviews and continues.
- Operating rules from Thomas: self-approve the plan after review and gate; at a review cap run the complexity review, apply its recommendation, log and continue; open PRs, never merge.

### Review Received: plan (artifact, gate)

**Date:** 2026-10-11
**Review artifact:** reviews/archived/artifact-plan-review-2026-10-11T014430Z.md

**Findings:** Critical 0, High 0, Medium 0, Low 0. Gate run `3d1ca87b-c858-497a-b529-d73f88974327`, target `codex-6-sol-xhigh` (gpt-6.1-sol, xhigh), envelope `status: ok`, `receiveEligible: true`, reviewed baseline `3f164e0c0`. No artifact edits; plan artifact event recorded `passed`. Quick-start gate persisted in state.md as `allowed/passed`.

**Plan artifact review ladder:** structured in-memory reviews by oat-reviewer (Claude Opus 5.5 high): initial (H1–H4, M1–M7, L1–L3), retry 1 (H1–H4, M1–M2, L1–L3), retry 2 (M1, L1–L3); retry bound exhausted; all findings applied (plan revisions 2–4). Astra (gpt-6-astra, high) plan round 1: ALIGNED WITH CHANGES, applied in revision 2. Plan approved by Claude under Thomas's 2026-10-10 delegation (self-approve after review and gate).

## Implement run preflight (2026-10-11)

- Tier 1 (subagents): oat-phase-implementer and oat-reviewer available without auth. Gate IMPLEMENT-08: delegation authorized for this run (Thomas, 2026-10-10) for both roles across every phase.
- Gate IMPLEMENT-09: dispatch policy resolved from project state: managed, frontier (source project-state).
- Gate IMPLEMENT-03: `oat_plan_hill_phases: ['p12']` present and valid; preserved as confirmed (Thomas: no checkpoints beyond the final-phase default). Gate IMPLEMENT-04: `oat_auto_review_at_hill_checkpoints: true` written.
- Phase review gate: absent (disabled). Lifecycle gate posture: configured implement exit gate in force.
- Schedule: [p01] → [p02, p03, p04] (worktrees) → [p05, p06, p07] (worktrees) → [p08] → [p09] → [p10] → [p11] → [p12]. Resuming from p01-t01.
- Implementer target for this run: Claude Opus 5.5 at high effort under the frontier ceiling (operator choice), resolved per phase through the exact-candidate branch.
