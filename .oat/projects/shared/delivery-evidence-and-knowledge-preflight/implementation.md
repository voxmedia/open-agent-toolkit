---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-30
oat_current_task_id: null
oat_generated: false
---

# Implementation: delivery-evidence-and-knowledge-preflight

**Started:** 2026-10-30
**Last Updated:** 2026-10-30

This journal resumes interrupted implementation sessions. Every plan task has one block in its phase; `oat project journal check` validates it.

## Progress Overview

| Phase         | Status   | Tasks | Completed |
| ------------- | -------- | ----- | --------- |
| Phase 1 (p01) | complete | 7     | 7/7       |
| Phase 2 (p02) | complete | 7     | 7/7       |
| Phase 3 (p03) | complete | 7     | 7/7       |
| Phase 4 (p04) | complete | 8     | 8/8       |
| Phase 5 (p05) | complete | 3     | 3/3       |

**Total:** 32/32 tasks completed

---

## Phase 1: Stack-aware delivery exit carriers (#383)

**Status:** completed
**Started:** 2026-10-30

### Task p01-t01: Add a stack-aware exit-carrier wrapper

**Status:** completed
**Commit:** ddead69d44a61addba9efd7bba6e403b5a4b862a

**Outcome (required when completed):**

- Stacked (`kind: stack`) deliveries now judge their exit carrier at the tip member's observed head, after verifying every lower member is the tip or its ancestor (`stack-order` stale otherwise); a stack with no members is stale `member-missing`.
- Every other delivery kind keeps every-member evaluation unchanged.

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.ts` - `evaluateDeliveryExitCarrier` wrapper
- `packages/cli/src/commands/project/delivery/evidence.test.ts` - stack, unobserved, empty-stack and `kind: pr` cases
- `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts` - multi-member and `kind` fixture options

**Verification:** delivery evidence suite 45 passed; scoped oxlint clean; CLI type-check passed.

### Task p01-t02: Use the wrapper in check, refresh and closeout; align the milestone subject scope

**Status:** completed
**Commit:** 60c9e8bd26ebb4b5f97af13305bc9a4a43e12feb

**Outcome (required when completed):**

- `delivery check`, `delivery refresh` and the closeout check all evaluate exit carriers through the wrapper; `publishedHeads` still reports every member head.
- The milestone subject builds its evidence scope from the latest observable (`open`/`at_endpoint`) delivery, so milestone and delivery subjects agree; refresh selects from its freshly observed copies.

**Files changed:**

- `packages/cli/src/commands/project/delivery/check.ts`, `refresh.ts`, `evidence.ts` - wrapper adoption and `latestDeliveryForMilestone`
- `packages/cli/src/commands/project/closeout-check/index.ts` - wrapper adoption
- `check.test.ts`, `refresh.test.ts`, `closeout-check/goal-boundary.test.ts` - command-level positive and negative controls

**Verification:** delivery and closeout-check suites 158 passed (root rerun matched); type-check passed.

### Task p01-t03: Document stacked deliveries and their registration

**Status:** completed
**Commit:** f52f9f5c3a77b711a890bcd35fea0eb0ae77b9d6

**Outcome (required when completed):**

- Brief contract §12.7 documents `kind: pr | stack`, tip evaluation, ancestor order, tip-branch bookkeeping and supersession for mis-ordered stacks.
- pr-progress registers stacks attach-only, recording every member URL base to tip in the `registering` write and re-checking each on resume; the CLI reference notes tip judgment.

**Files changed:**

- `.agents/skills/oat-project-brief/references/brief-contract.md`
- `.agents/skills/oat-project-pr-progress/SKILL.md`
- `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:** shared and validation contract suites 1,088 passed; docs markdownlint, `pnpm lint` and `pnpm format` passed.

**Can-fail proofs (p01):** each guard was neutralized, its focused test failed, and the guard was restored: stack tip selection (linear stack went stale `not-ancestor`); stack-order wrapper (non-ancestor case went falsely fresh); check, refresh and closeout call sites (each expected `stack-order`, received legacy `not-ancestor`); milestone/delivery agreement (milestone went stale on the delivery's own new artifact).

**Built-CLI controls (p01):** linear stack → exit 0, `status: ok`, fresh; mis-ordered stack → exit 1, `status: undeliverable`, `stack-order`.

**Built-CLI controls (p01, reproducible):** build with `pnpm --filter @open-agent-toolkit/cli build`; fixtures come from `registeredStack('linear' | 'misordered' | 'unobserved')` in `packages/cli/src/commands/project/delivery/check.test.ts` (the `goal-repo.ts` builder with `registryYaml({ kind: 'stack', members })`); from inside each scratch repository run `node "$REPO/packages/cli/dist/index.js" --json project delivery check --project .oat/projects/shared/goal --subject d01`. Expected and observed: linear → exit 0, `status: ok`, fresh; mis-ordered → exit 1, `status: undeliverable`, stale `stack-order`; unobserved → exit 1, `status: undeliverable`, stale `member-unobserved`.

**Can-fail neutralizations (p01):** tip selection — evaluate every head instead of `[tip]` (linear cases red at all four sites); order check — skip the lower-member loop (mis-ordered cases red at evidence, check, refresh, closeout); refresh copies — evaluate raw registry entries instead of `observedById` (both stack refresh tests red); milestone alignment — always use the `mNN`-row scope (agreement test red); kind dispatch — route every kind through the stack path (multi-member `pr` test red). Disabling only the `code === 1` branch stayed green, which review finding M1 queues as p01-t04.

### Task p01-t04: (review) Classify stack inspection failures separately from stack-order

**Status:** completed
**Commit:** a93758aa5230846da70951826e81b0530a5f62e9

**Outcome (required when completed):**

- Stack ancestry now resolves member heads first (`missing-object` for an unavailable commit), maps other Git failures to `inspection-failed`, and reserves `stack-order` for a genuine non-ancestor.
- A `null` or unreviewed-resolution carrier on a stack is evaluated exactly as on `kind: pr`, before any topology check.

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.ts` - head resolution, failure classification, carrier-first precedence
- `packages/cli/src/commands/project/delivery/evidence.test.ts` - missing tip and lower head, null and `no_gate` carrier parity

**Verification:** delivery and closeout suites 163 passed; focused evidence 50 passed; type-check and oxlint passed. Can-fail: disabling only the `code === 1` branch turned all four mis-ordered tests red.

**Notes / Decisions:**

- Review-fix task for p01 review M1 and L1 (fix request `dedkp-p01-fix-1`, continuation `cont-delivery-evidence-p01-fix-1`).

### Task p01-t05: (review) Align contract registration wording for stacked deliveries

**Status:** completed
**Commit:** 7fb2b4d4b23730fc3d9e9f899ba3dbc3a05a9ea4

**Outcome (required when completed):**

- §12.7 Idempotent registration now covers stacks (attach-only, every member URL in the `registering` write, per-URL resume re-check); pr-progress names `oat-project-reconcile` and projects `oat_pr_url` from the tip member.

**Files changed:**

- `.agents/skills/oat-project-brief/references/brief-contract.md`
- `.agents/skills/oat-project-pr-progress/SKILL.md`

**Verification:** shared and validation contract suites 1,088 passed; `pnpm lint` and `pnpm format` passed.

**Notes / Decisions:**

- Review-fix task for p01 review L2. An exact-text contract pin required keeping the phrase "more than one stops and routes"; semantics unchanged.

### Task p01-t06: (review) Pin latestDeliveryForMilestone exclusions

**Status:** completed
**Commit:** cff5bf2db6ce10bc6b479d25bb42d91de51820ae

**Outcome (required when completed):**

- `latestDeliveryForMilestone` is pinned to skip `registering` and `superseded` entries and to select `at_endpoint`.

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Verification:** focused evidence 52 passed; delivery and closeout suites 165 passed (root rerun matched).

**Notes / Decisions:**

- Review-fix task for p01 review L3.

### Review Received: p01

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p01-review-2026-10-31T002508Z.md

**Findings:** Critical 0 · High 0 · Medium 2 · Low 3

- M1 (Medium): stack ancestry inspection failures are reported as `stack-order` and tests cannot distinguish them → fix task p01-t04; an unfetched commit must not steer an operator to supersession.
- M2 (Medium): the built-CLI controls and can-fail proofs lacked commands and fixture provenance → resolved in this journal (artifact alignment; the reproducible commands and neutralizations above).
- L1 (Low): stack topology checks precede the carrier's own checks, diverging from `kind: pr` for null and unreviewed carriers → fix task p01-t04 (same function as M1).
- L2 (Low): §12.7 Idempotent registration and pr-progress items 5–6 wording lags stack registration → fix task p01-t05.
- L3 (Low): `latestDeliveryForMilestone` exclusions are unpinned → fix task p01-t06.

**Outcome:** fixes completed: p01-t04, p01-t05, p01-t06; awaiting re-review. Original queue: p01-t04, p01-t05, p01-t06 (auto-disposition; reviewer request `dedkp-p01-review-1`, `oat-reviewer-claude-opus-5-5-high`, 0 Critical / 0 High — phase gate passed).

### Task p01-t07: (review) Scope the stack-order rule to configured code carriers in docs

**Status:** completed
**Commit:** a18cb86f62c4157623ab05fe4678135523d6e80e

**Outcome (required when completed):**

- Brief contract §12.7 and the `delivery check` CLI reference scope the tip/ancestor rule to configured code carriers bound to a reviewed head; null and unreviewed-resolution carriers are evaluated exactly as for `kind: pr`.

**Files changed:**

- `.agents/skills/oat-project-brief/references/brief-contract.md`
- `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:** shared and validation contract suites 1,088 passed; docs markdownlint passed.

**Notes / Decisions:**

- Review-fix task for p01 round-2 L1 (fix request `dedkp-p01-fix-2`).

### Review Received: p01 (round 2)

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p01-review-2026-10-31T004233Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

- Round-1 M1, M2, L1, L2 and L3 verified resolved; probe M1 (only `code === 1` disabled) now fails at all four call sites, and missing tip or lower heads report `missing-object`.
- L1 (Low): §12.7, the `delivery check` CLI reference and `design.md` still say every mis-ordered stack is refused, but null and unreviewed-resolution carriers are now evaluated as on `kind: pr` → fix task p01-t07 (contract and CLI reference); `design.md` aligned by the root in this bookkeeping commit.

**Outcome:** passed (reviewer request `dedkp-p01-review-2`); Low converted to p01-t07, completed in a18cb86.

**Phase p01 outcome:** complete. Root-owned review round 1 (`dedkp-p01-review-1`) 0C/0H/2M/3L → 3 fix tasks; round 2 (`dedkp-p01-review-2`) 0C/0H/0M/1L → passed, 1 fix task; every review disposition is settled and no phase gate is selected. Phase range `6d40f5f10431c3f427d6cfb2aa938410a842bcd7..a18cb86f62c4157623ab05fe4678135523d6e80e`; fix rounds used 2 of `oat_orchestration_retry_limit` 2 (round 2 was a passing review's Low conversion, not a blocking loop); recovery attempts 0/10.

---

## Phase 2: Gate-originated artifact admission (#384)

**Status:** completed
**Started:** 2026-10-31

### Task p02-t01: Admit the exit gate's own artifact as bookkeeping

**Status:** completed
**Commit:** ab6878c9a0f38fa6469b0c3b2e773d737405626f

**Outcome (required when completed):**

- A configured exit gate's own artifact commit is now a bookkeeping successor of the carrier it produced: the artifact of a Type `code`, Invocation `gate` Reviews row whose Reviewed Head equals the carrier's `reviewed_head` joins `evidenceArtifacts` only.
- Gate rows never enter `ownEvidenceArtifacts` or integrated-review selection; manual `final` rows, mismatched heads, placeholder heads and non-code gate rows stay `disallowed-path`; callers without a carrier keep their scope.
- Milestone-subject checks for a registered stack delivery evaluate the carrier through `evaluateDeliveryExitCarrier` (see deviation).

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.ts` - `gateEvidenceArtifacts`, optional carrier input to `deliveryEvidenceScope`
- `packages/cli/src/commands/project/delivery/check.ts`, `refresh.ts`, `closeout-check/index.ts` - carrier supplied per consumer
- `evidence.test.ts`, `check.test.ts`, `refresh.test.ts`, `closeout-check/goal-boundary.test.ts`, `__tests__/goal-repo.ts` - cases (a)-(g) and the Invocation-column fixture

**Verification:** focused suites 1,264 passed; delivery and closeout suites 176 passed (root rerun matched); type-check, build, `pnpm check`, `pnpm lint`, `pnpm format` passed.

### Task p02-t02: Reconcile goal exit-gate guidance

**Status:** completed
**Commit:** eea398036d498deadc13a0bbb624f20f0753ac66

**Outcome (required when completed):**

- Goal-mode exit-gate guidance states the verbatim `--review-scope final` command, the gate-row bookkeeping admission and its isolation, and that no placeholder row is required; §12.8 lists the admission.

**Files changed:**

- `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- `.agents/skills/oat-project-brief/references/brief-contract.md`
- `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`

**Verification:** shared and validation contract suites passed; workflow-gates markdownlint passed.

**Can-fail neutralizations (p02):** gate head binding — removed `review.reviewedHead === carrier.reviewed_head` from `gateEvidenceArtifacts`; the mismatched-head check, refresh and closeout tests failed by accepting the artifact. Own-evidence isolation — concatenated `gateEvidenceArtifacts(...)` into each `ownEvidenceArtifacts` value; the isolation assertion failed because `reviews/final-gate-review.md` entered d01's own evidence. Both restored.

**Built-CLI controls (p02, reproducible):** build with `pnpm --filter @open-agent-toolkit/cli build`; from inside each scratch repository run `node "$REPO/packages/cli/dist/index.js" --json project delivery check --project .oat/projects/shared/goal --subject m01`. Fixtures: `createGoalRepo` + `gateArtifactScenario()` (commits: implementation, carrier, final gate review) → exit 0, `ok`, fresh; same with `{ invocation: 'manual' }` → exit 1, `undeliverable`, `disallowed-path`; same with `{ reviewedHead: 'mismatched' }` → exit 1, `undeliverable`, `disallowed-path`; `createGoalRepo` with an unrelated lower-layer commit, a main tip commit and `registryYaml({ kind: 'stack' })` → exit 1, `undeliverable`, `stack-order`. Observed equals expected for all four.

### Task p02-t03: (review) Revert the milestone-subject stack carrier deviation

**Status:** completed
**Commit:** d76e41b0504292a55054ea546c66aa05eacb5ac0

**Outcome (required when completed):**

- Milestone subjects judge the exit carrier against local `HEAD` for every delivery kind again; a registered stack with an ungated substantive commit and a passing re-review is `undeliverable` (`disallowed-path`).

**Files changed:**

- `packages/cli/src/commands/project/delivery/check.ts`
- `packages/cli/src/commands/project/delivery/check.test.ts`

**Verification:** regression and delivery/closeout suites passed; type-check passed. Can-fail: restoring the milestone stack wrapper made the regression report `ok`/deliverable.

**Notes / Decisions:**

- Review-fix for p02 review H1; retracts the p02-t01 deviation. Stack built-CLI control now runs with `--subject d01`.

### Task p02-t04: (review) Cover the unregistered milestone gate path and own-evidence effect

**Status:** completed
**Commit:** 82a102162b705227fcddbb9d5d0e055ff9b86e27

**Outcome (required when completed):**

- The pre-registration milestone gate path is covered (`--subject m01` matching → ok/fresh; manual and mismatched → `disallowed-path`), and a behavioral control proves a swap of `d01`'s integrated review to the gate artifact stays `substantive-change`.

**Files changed:**

- `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts`
- `packages/cli/src/commands/project/delivery/check.test.ts`
- `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Verification:** focused cases and suites passed. Can-fail: removing the unregistered gate spread turned the matching case stale `disallowed-path`; leaking gate artifacts into own evidence turned the swap control into `bookkeeping-successor`.

**Notes / Decisions:**

- Review-fix for p02 review M1 and L2.

### Task p02-t05: (review) Admit gate artifacts only under reviews/

**Status:** completed
**Commit:** 26ddb708f7b9bdbe8a17507c1f348b3be6331157

**Outcome (required when completed):**

- Gate-row artifacts are admitted only under `reviews/` or `reviews/archived/`; a forged gate row naming `design.md` stays `disallowed-path`.

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.ts`
- `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Verification:** forged-artifact control and suites passed. Can-fail: removing `reviewArtifactPath(...)` admitted `design.md`. Recovery commit 5fba40931897c85e2ec2620eae637f98a2172ec6 fixed a `no-shadow` lint in this task's test (see Recovery Event dedkp-p02-recovery-1).

**Notes / Decisions:**

- Review-fix for p02 review L1 (path restriction); the Invocation-identity hardening is deferred.

### Task p02-t06: (review) Correct gate-admission wording in the contract and CLI reference

**Status:** completed
**Commit:** 55e618592afc3984d2b0389d1014be72692e198d

**Outcome (required when completed):**

- §12.8 states the gate artifact is admitted in evidence scopes built for that carrier (its review and exit evaluations) and only under `reviews/`; the `delivery check` CLI reference names the gate-row admission and its head binding.

**Files changed:**

- `.agents/skills/oat-project-brief/references/brief-contract.md`
- `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:** shared and validation suites 1,088 passed; markdownlint passed.

**Notes / Decisions:**

- Review-fix for p02 review L3.

### Review Received: p02

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p02-review-2026-10-31T010236Z.md

**Findings:** Critical 0 · High 1 · Medium 1 · Low 3

- H1 (High): the milestone-subject stack deviation judges the exit carrier on stored member heads but the review on local `HEAD`, so an ungated substantive commit reads as deliverable → fix task p02-t03 (revert; the stack control runs with `--subject d01`).
- M1 (Medium): the pre-registration `mNN` gate path has no regression evidence → fix task p02-t04.
- L1 (Low): gate admission accepts a non-review artifact path from a forged row → fix task p02-t05 (`reviews/` restriction); the suggested `Invocation`-change identity rule is deferred (see Deferred Findings).
- L2 (Low): own-evidence isolation is pinned only statically → fix task p02-t04 (behavioral swap control).
- L3 (Low): §12.8 "for that carrier only" overstates the narrowing; CLI reference allowlist omits the gate row → fix task p02-t06.

**Outcome:** fixes completed: p02-t03, p02-t04, p02-t05, p02-t06; awaiting re-review. Original queue: p02-t03, p02-t04, p02-t05, p02-t06 (blocking High; reviewer request `dedkp-p02-review-1`).

### Recovery Event dedkp-p02-recovery-1

- Phase/task: p02 / p02-t05
- Original request: dedkp-p02-implementation
- Original commit: 26ddb708f7b9bdbe8a17507c1f348b3be6331157
- Defect class: lint
- Discovered by: pnpm lint
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-high
- Recovery commit: 5fba40931897c85e2ec2620eae637f98a2172ec6
- Verification: CLI lint, delivery/closeout suites and type-check passed before and after the recovery commit; root rerun: lint exit 0, 182 tests passed, type-check exit 0.
- Reason: mechanically bounded `no-shadow` rename in the forged-artifact test; no behavior change; reservation commit 328a85e249564656dee7be3a8c57cef65a627ffb touched only state.md.

**Built-CLI controls (p02 fix round):** mis-ordered stack — `createGoalRepo`, lower branch `feat: unrelated lower layer`, main `feat: tip layer`, m01 review, `registryYaml({ kind: 'stack' })`, registration commit; `node "$REPO/packages/cli/dist/index.js" --json project delivery check --project .oat/projects/shared/goal --subject d01` → expected and observed exit 1, `undeliverable`, `stack-order`. Unregistered milestone — `createGoalRepo` + `gateArtifactScenario(repo, { registered: false })`; same command with `--subject m01` → expected and observed exit 0, `ok`, review and exit fresh.

### Task p02-t07: (review) Add the reviews/ restriction to exit-gate guidance

**Status:** completed
**Commit:** ff3878c1424fb40f6a806265a9930e8dc63e4e47

**Outcome (required when completed):**

- Goal-mode exit-gate guidance and `workflow-gates.md` state that the admitted gate artifact must live under `reviews/` (or `reviews/archived/`), matching §12.8.

**Files changed:**

- `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`

**Verification:** shared and validation suites 1,088 passed; markdownlint, lint and format passed.

**Notes / Decisions:**

- Review-fix task for p02 round-2 L1 (fix request `dedkp-p02-fix-2`).

### Review Received: p02 (round 2)

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p02-review-2026-10-31T012557Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

- Round-1 H1, M1, L1 (path part), L2 and L3 verified resolved with built-CLI probes and neutralizations; the L1 Invocation-identity deferral was accepted; the recovery event and ledger settlement match the contract.
- L1 (Low): `completion-and-closeout.md` and `workflow-gates.md` omit the `reviews/` restriction → fix task p02-t07.

**Outcome:** passed (reviewer request `dedkp-p02-review-2`); Low converted to p02-t07, completed in ff3878c.

**Phase p02 outcome:** complete. Review round 1 (`dedkp-p02-review-1`) 0C/1H/1M/3L → 4 fix tasks (H1 retracted the milestone stack deviation); round 2 (`dedkp-p02-review-2`) 0C/0H/0M/1L → passed, 1 fix task. Blocking fix rounds used 1 of `oat_orchestration_retry_limit` 2; recovery attempts 1/10 (settled). Phase range `5248c2fd1b1957bdfef6e3c2a4939192366b8574..ff3878c1424fb40f6a806265a9930e8dc63e4e47`.

---

## Phase 3: Journal rewrite detection (#385)

**Status:** completed
**Started:** 2026-10-31

### Task p03-t01: Export a journal-rewrite lister from delivery evidence

**Status:** completed
**Commit:** ead6a3a2215fac92ffb428e9baad6da0b375297a

**Outcome (required when completed):**

- The journal append-only rule lives in an exported `journalRewrites` lister that reports every rewritten or removed recorded line and every new extraction marker; `judgeJournalChange` returns its first entry with unchanged refusal messages.

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.ts`
- `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Verification:** delivery and closeout suites 184 passed; type-check and oxlint passed.

### Task p03-t02: Report rewritten committed journal lines in goal projects

**Status:** completed
**Commit:** c439d61392ebb885f303559a22a1fa7132b3b51c

**Outcome (required when completed):**

- In goal projects, `oat project journal check --at implement-preflight|review` compares the working `implementation.md` with `HEAD` and reports one `journal-line-rewritten` reason per rewritten or removed committed line, refusing with exit 1.
- Appends, extraction markers, untracked journals, unborn HEAD, non-goal projects and `--at completion` add no reason; other Git failures are command errors; `complete-state` is unchanged.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/index.ts`, `types.ts` - HEAD comparison and reason code
- `packages/cli/src/commands/project/journal-check/index.test.ts` - parity fixture and boundary cases
- `apps/oat-docs/docs/reference/cli-reference.md` - reason and boundary note

**Verification:** phase suites 182 passed; root rerun of journal-check, delivery, closeout and complete-state 271 passed; type-check, docs markdownlint and `pnpm check` passed.

**Can-fail neutralization (p03):** inserted `.filter(() => false)` after `journalRewrites(...)` in journal check; the parity test failed (expected exit 1, received exit 0). Removed before commit.

### Task p03-t03: (review) Resolve the committed journal path through Git from the project directory

**Status:** completed
**Commit:** 6d92f4923e9be8d489f0765bf1e6617d2f34896d

**Outcome (required when completed):**

- Journal check resolves the committed journal through Git from the project directory, so an absolute `--project` spelled through a symlink alias works.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/index.ts`
- `packages/cli/src/commands/project/journal-check/index.test.ts`

**Verification:** journal-check suite passed. Can-fail: restoring lexical `relative(repoRoot, …)` made the aliased-path test exit 2 instead of 0.

**Notes / Decisions:**

- Review-fix for p03 review M1 (request `dedkp-p03-implementation-2`).

### Task p03-t04: (review) Fail closed on a dangling HEAD and cover each Git failure branch

**Status:** completed
**Commit:** 0f708b5be6555af21ff79a91d879d8494631e2bb

**Outcome (required when completed):**

- A dangling HEAD ref is a command error (exit 2), not an unborn HEAD; each Git call's failure branch, the rewritten-line reason and a pure deletion are tested.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/index.ts`
- `packages/cli/src/commands/project/journal-check/index.test.ts`

**Verification:** journal-check suite passed. Can-fail: returning `null` on any exit 1 made the dangling-HEAD test exit 0 instead of 2.

**Notes / Decisions:**

- Review-fix for p03 review L1 and L4.

### Task p03-t05: (review) Signal unparseable committed frontmatter from the shared journal rule

**Status:** completed
**Commit:** 2698a71fe2e420fc32afa3ff422971bb8db4b728

**Outcome (required when completed):**

- The shared `journalRewrites` lister signals unparseable frontmatter, so journal check refuses the committed-side case that delivery evidence refuses; `judgeJournalChange` messages are unchanged.

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.ts`, `evidence.test.ts`
- `packages/cli/src/commands/project/journal-check/index.ts`, `index.test.ts`

**Verification:** delivery, closeout and journal-check suites passed. Can-fail: returning `[]` for unparseable frontmatter failed both the lister and journal-check cases.

**Notes / Decisions:**

- Review-fix for p03 review L2.

### Task p03-t06: (review) Make the journal-line-rewritten message actionable

**Status:** completed
**Commit:** eb33f5dbc1d7f8325655a964829c2af64be78f16

**Outcome (required when completed):**

- The `journal-line-rewritten` refusal tells the operator to restore the committed line and append the correction; the CLI reference notes the comparison base is `HEAD`.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/index.ts`, `index.test.ts`
- `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:** phase suites 278 passed (root rerun matched); type-check, CLI lint and docs markdownlint passed.

**Notes / Decisions:**

- Review-fix for p03 review L3.

### Review Received: p03

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p03-review-2026-10-31T014304Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 4

- M1 (Medium): an aliased absolute `--project` path fails as an outside-repository command error → fix task p03-t03.
- L1 (Low): a dangling HEAD ref is treated as unborn and skips the comparison → fix task p03-t04.
- L2 (Low): unparseable committed frontmatter makes the shared lister return no rewrites → fix task p03-t05.
- L3 (Low): the refusal message omits the correction → fix task p03-t06.
- L4 (Low): Git failure branches and the parity reason are covered only indirectly → fix task p03-t04.

**Outcome:** fixes completed: p03-t03, p03-t04, p03-t05, p03-t06 (fix-mode request `dedkp-p03-fix-1` returned BLOCKED because fix mode accepts only Critical/High; the queued plan tasks ran as implementation request `dedkp-p03-implementation-2` on the same handle and target); awaiting re-review. Original queue: p03-t03, p03-t04, p03-t05, p03-t06 (reviewer request `dedkp-p03-review-1`; 0 Critical / 0 High).

### Task p03-t07: (review) Align the committed-frontmatter reason and make the alias test portable

**Status:** completed
**Commit:** b06129631c5b46e9f14df01aaf60088ad316c6ea

**Outcome (required when completed):**

- The committed-frontmatter refusal uses owner `oat-project-reconcile` with a remedy and is documented; a portable alias test builds its own symlink and asserts a refused rewrite through it.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/index.ts`, `index.test.ts`
- `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:** journal-check 49 passed; root rerun journal-check + delivery 145 passed; type-check and markdownlint passed. Can-fail: restoring the lexical lookup made the symlink test exit 2 instead of 1.

**Notes / Decisions:**

- Review-fix for p03 round-2 L1 and L2 (request `dedkp-p03-implementation-3`).

### Review Received: p03 (round 2)

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p03-review-2026-10-31T015808Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 3

- Round-1 M1, L1, L2, L3 and L4 verified resolved (aliased-path and dangling-HEAD probes, 30,000-pair differential of `judgeJournalChange`).
- L1 (Low): committed-frontmatter refusal owner, remedy and docs → fix task p03-t07.
- L2 (Low): alias test cannot fail on Linux CI → fix task p03-t07.
- L3 (Low): `design.md` describes two lister result kinds; the code has a third (unparseable frontmatter) → aligned by the root in this bookkeeping commit.

**Outcome:** passed (reviewer request `dedkp-p03-review-2`); Lows converted to p03-t07 (completed in b061296) and a design alignment.

**Phase p03 outcome:** complete. Review round 1 (`dedkp-p03-review-1`) 0C/0H/1M/4L → 4 tasks (fix-mode request blocked; ran as implementation request 2); round 2 (`dedkp-p03-review-2`) 0C/0H/0M/3L → passed, 1 task plus a design alignment. Recovery attempts 0/10. Phase range `fabbdd4be614c069ce32ce70473e6aef817d8a04..b06129631c5b46e9f14df01aaf60088ad316c6ea`.

---

## Phase 4: Knowledge-index dispatch preflight (#355)

**Status:** completed
**Started:** 2026-10-31

### Task p04-t01: Resolve a mapper route before mutating knowledge

**Status:** completed
**Commit:** 8b270dccc94f7a6a391fc11c343904d0cb4a69c5

**Outcome (required when completed):**

- `oat-repo-knowledge-index` resolves and authorizes a mapper route through `oat-dispatch-subagents` before Step 2 deletes or writes anything; a missing dispatch skill or unresolved route stops with the utility-pack recovery commands and leaves knowledge untouched.
- Mapper launches are provider-neutral requests with labelled Claude, Codex and Cursor routes that launch the installed `oat-codebase-mapper` projection; Claude-only controls live only in the Claude route; a probe that did not launch is a route failure, not read-only mode; the maintainer-specific temp path is gone.

**Files changed:**

- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- `apps/oat-docs/docs/skills/repo-improve.md`
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts` - ordering, route and recovery pins
- `packages/cli/src/validation/named-skill-load-contract.test.ts` - refreshed line citations

**Verification:** shared and validation contract suites 1,089 passed; `refresh-owned.test.mjs`, skill oxlint, `pnpm oat:validate-skills`, `pnpm lint`, `pnpm format` and repo-improve markdownlint passed. Can-fail: moving the preflight after Step 2 failed `expect(prepare).toBeGreaterThan(preflight)`.

**Phase p04 notes:** skill `metadata.version` bump deferred to p05-t01 by plan; one no-edit `pnpm format` retry after a concurrent asset-bundling race (no attempt consumed).

### Task p04-t02: (review) Route the refresh branch through the preflight and make the pins fail on regressions

**Status:** completed
**Commit:** 10a37325243d7c152f0d14efbd3513cddecbf70c

**Outcome (required when completed):**

- Both Step 1 branches (Refresh and empty knowledge) enter the dispatch-route preflight before Step 2; the contract pin rejects Claude-only controls anywhere outside the Claude route, reverted branches, a read-only Step 4b, and a preflight after Step 2.

**Files changed:**

- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- `apps/oat-docs/docs/skills/repo-improve.md`

**Verification:** contract suites 1,089 passed (root rerun matched). Can-fail: each of the reviewer's six seeded regressions (Claude controls in 5a, in 5b, empty branch reverted, Refresh branch reverted, Step 4b read-only, preflight after Step 2) failed the pin; each restored.

**Notes / Decisions:**

- Review-fix for p04 review C1 and H1 (request `dedkp-p04-implementation-2`).

### Task p04-t03: (review) Use the generator class for write lanes and verify the probe file

**Status:** completed
**Commit:** b64c74e83a413cc62b9a03f9e360e70193ee90c6

**Outcome (required when completed):**

- The write probe and direct-write lanes are `generator` requests (read-only response lanes stay `recon`); direct-write mode requires `WRITE_OK` and an observed `.preflight/test.txt` with content `test`, and any disagreement stops before Step 2.

**Files changed:**

- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Verification:** contract suites passed. Can-fail: removing the probe's `generator` label and replacing the file check with trust in the report each failed the pin.

**Notes / Decisions:**

- Review-fix for p04 review M1 and M2.

### Task p04-t04: (review) Make mapper instructions provider-neutral and harden probe handling

**Status:** completed
**Commit:** 2cb165ec8d9f22ee3d6a85a955ca8cd7cca2dcdd

**Outcome (required when completed):**

- Mapper prompts use provider-neutral write and read-only wording; Codex writable roots are limited to the knowledge outputs; recovery advice depends on what is missing; `.preflight` is created only after a non-mutating `lstat` guard and removed on every probe exit; Step 6b reads returned output from a scratch file.

**Files changed:**

- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- `apps/oat-docs/docs/skills/repo-improve.md`

**Verification:** contract suites, `refresh-owned.test.mjs` 6/6, skill oxlint, `pnpm oat:validate-skills`, `pnpm lint`, `pnpm format` and docs markdownlint passed.

**Notes / Decisions:**

- Review-fix for p04 review L1-L5.

### Review Received: p04

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p04-review-2026-10-31T021449Z.md

**Findings:** Critical 1 · High 1 · Medium 2 · Low 5

- C1 (Critical): the Refresh branch routes around the dispatch-route preflight, so a refresh deletes generated knowledge before a route is resolved → fix task p04-t02.
- H1 (High): the contract pin stays green for four of six seeded regressions → fix task p04-t02.
- M1 (Medium): write probe and write lanes labelled `recon` (read-only by contract) → fix task p04-t03; `design.md` aligned by the root.
- M2 (Medium): direct-write mode trusts the worker's `WRITE_OK` without the file check → fix task p04-t03.
- L1–L5 (Low): Claude tool names in neutral prompts; Codex writable roots; recovery advice per failure kind; `.preflight` ordering and cleanup; Step 6b source splicing → fix task p04-t04.

**Outcome:** fixes completed: p04-t02, p04-t03, p04-t04 (implementation request `dedkp-p04-implementation-2` on the original handle and target); awaiting re-review. Original queue: p04-t02, p04-t03, p04-t04 (blocking Critical/High; reviewer request `dedkp-p04-review-1`).

### Task p04-t05: (review) Give the write probe its own heading and gate Step 2 on its result

**Status:** completed
**Commit:** 5e98037de70ca52a5af3484c0f3efc9f213fa90d

**Outcome (required when completed):**

- The write probe has its own `Write-Permission Probe (all providers)` heading after the provider routes; Step 2 runs only with the accepted, file-verified probe result; a pre-existing `.preflight` stops the run before a fresh one is created.

**Files changed:**

- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- `apps/oat-docs/docs/skills/repo-improve.md`

**Verification:** contract suites 1,089 passed (root rerun matched). Can-fail: probe moved inside the Claude route, Step 2 gate removed, and `.preflight` guard removed each failed the pin; prior seeds R1-R10 still fail.

**Notes / Decisions:**

- Review-fix for p04 round-2 M1, L1 and L2 (request `dedkp-p04-implementation-3`).

### Task p04-t06: (review) State the Codex direct-write rule when writable roots cannot be narrowed

**Status:** completed
**Commit:** 7901f4f56c282cf3c1e5f5d0c90d8eee5dcdb8c2

**Outcome (required when completed):**

- When Codex cannot narrow writable roots per spawn, the probe and direct-write lanes run under the projection's `workspace-write` sandbox constrained to declared outputs, and a pre-Step-10 `git status --porcelain` check stops on any change outside `.oat/repo/knowledge/`.

**Files changed:**

- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- `apps/oat-docs/docs/skills/repo-improve.md`

**Verification:** contract suites, `refresh-owned.test.mjs`, skill oxlint, `pnpm oat:validate-skills`, `pnpm lint`, `pnpm format` and docs markdownlint passed. Can-fail: removing the Codex direct-write rule sentence failed the pin.

**Notes / Decisions:**

- Review-fix for p04 round-2 M2.

### Review Received: p04 (round 2)

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p04-review-2026-10-31T023107Z.md

**Findings:** Critical 0 · High 0 · Medium 2 · Low 2

- Round-1 C1, H1, M1, M2 and L1–L5 verified resolved; all six original seeded regressions and three new seeds now fail the pin; no path mutates knowledge before the route is resolved and authorized.
- M1 (Medium): the write-probe paragraph sits under the Cursor route heading and Step 2 does not require a probe result → fix task p04-t05.
- M2 (Medium): no Codex direct-write rule when writable roots cannot be narrowed → fix task p04-t06 (workspace-write constrained to declared outputs plus a pre-commit stray-change check; Codex support is a discovery requirement).
- L1 (Low): a pre-existing `.preflight` is not guarded → fix task p04-t05.
- L2 (Low): docs attribute the symlink check to the probe → fix task p04-t05.

**Outcome:** fixes completed: p04-t05, p04-t06 (request `dedkp-p04-implementation-3`); awaiting re-review (cycle 3 of 3). Original queue: p04-t05, p04-t06 (reviewer request `dedkp-p04-review-2`; 0 Critical / 0 High; review cycle 2 of 3).

### Review Received: p04 (round 3)

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p04-review-2026-10-31T024404Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 2

- Round-2 M1, M2, L1 and L2 verified resolved (20 seeded regressions; 18 fail as intended, 1 acceptable characterization pass, 1 heading-only variant filed as L1); no path mutates knowledge before an authorized route and a file-verified probe exist.
- M1 (Medium, regression from p04-t06): the pre-Step-10 `git status --porcelain` check has no baseline and applies on every provider, so unrelated dirty work (including the skill's own uncommitted `.oat/tracking.json` from Step 10b) stops the run late, while a lane's stray edit to an already-dirty file goes undetected; the docs describe it as Codex-only → disposition pending operator (review-cycle cap reached).
- L1 (Low): the contract pin checks the probe heading position, not the probe paragraph → disposition pending operator.
- L2 (Low): the p04-t05 journal entry describes a stale-`.preflight` removal option the skill does not implement (it only stops) → disposition pending operator.

**Outcome:** received; three-cycle review cap reached for p04 (Step 8). Operator chose `simplify` → fix task p04-t07; L1 declined; L2 corrected by the root.

### Task p04-t07: (review) Simplify the knowledge-index preflight machinery

**Status:** completed
**Commit:** 67de100f2884c73384ff68fb409bcc4288d0ba64

**Outcome (required when completed):**

- The pre-Step-10 stray-change check, its pin and docs clause are removed (round-3 M1 dissolved; reintroduction trigger recorded in the complexity report).
- The Codex route narrows writable roots when exposed and otherwise uses the projection's `workspace-write` sandbox writing only declared outputs; the contract pin is 10 structural assertions, nine on whitespace-collapsed text (was 38; the probe anchor is collapsed in p04-t08); the docs paragraph is 3–4 sentences; the skill is 859 lines (was 872).

**Files changed:**

- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- `apps/oat-docs/docs/skills/repo-improve.md`

**Verification:** contract suites 1,089 passed (root rerun matched); `refresh-owned.test.mjs` 6/6, skill oxlint, `pnpm oat:validate-skills`, `pnpm lint`, `pnpm format`, docs markdownlint passed. Can-fail: preflight after Step 2, Claude controls outside the Claude route, Step 2 gate removed, and Step 4b read-only on a missing probe each failed the trimmed pin.

**Notes / Decisions:**

- Operator `simplify` disposition at the p04 review-cycle cap (request `dedkp-p04-implementation-4`).

### Task p04-t08: (review) Collapse the probe anchor and restore the unrelated-work guarantee in docs

**Status:** completed
**Commit:** e79e9b21c7fc6dd75e2231ebf0d0f4412cf1b042

**Outcome (required when completed):**

- The probe-paragraph anchor matches whitespace-collapsed text like the other assertions, and the docs paragraph again states that unrelated staged and unstaged work stays intact.

**Files changed:**

- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- `apps/oat-docs/docs/skills/repo-improve.md`

**Verification:** contract file 107 passed; docs markdownlint passed. Proofs: a rewrapped probe sentence passes the pin; removing the probe paragraph fails it.

**Notes / Decisions:**

- Review-fix for the post-simplify review L1 and L2 (request `dedkp-p04-implementation-5`).

### Review Received: p04 (post-simplify)

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p04-review-2026-10-31T115235Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 2

- The simplification applied the accepted ledger faithfully and kept every Keep item; no path mutates knowledge before an authorized route and a file-verified probe; Claude, Codex and Cursor routes are each runnable (the Codex projection already uses `workspace-write`); 13 seeded regressions across every remaining P0 clause failed the trimmed pin.
- L1 (Low): the probe-paragraph anchor matches raw rather than whitespace-collapsed text (the p04-t07 journal overstated "all assertions") → fix task p04-t08.
- L2 (Low): the docs paragraph dropped the unrelated-work guarantee → fix task p04-t08.

**Outcome:** passed (reviewer request `dedkp-p04-review-4`); Lows converted to p04-t08, completed in e79e9b2.

**Phase p04 outcome:** complete. Reviews: round 1 1C/1H/2M/5L → 3 tasks; round 2 0C/0H/2M/2L → 2 tasks; round 3 0C/0H/1M/2L at the three-cycle cap → complexity review (Partially compliant, recommended simplify) → operator chose simplify → p04-t07; fresh post-simplify review 0C/0H/0M/2L → passed, p04-t08. Recovery attempts 0/10. Phase range `20ec489fd66f497d059cac39b94ab2170bf7c523..e79e9b21c7fc6dd75e2231ebf0d0f4412cf1b042` (includes the origin/main merge befc083).

---

## Phase 5: Release bookkeeping and gates

**Status:** completed
**Started:** 2026-10-31

### Task p05-t01: Bump changed skills and lockstep package versions

**Status:** completed
**Commit:** 001e059460f506dfbefec472244a668ac7aec292

**Outcome (required when completed):**

- The five public packages and `public-package-versions.json` are at 0.3.38; `oat-project-brief` 1.0.4, `oat-project-implement` 2.3.23, `oat-project-pr-progress` 1.3.6 and `oat-repo-knowledge-index` 1.4.0 are bumped once each.
- The skill-version pins in `packages/cli/src/validation/skills.test.ts` match (recovery commit b5300aa87d66e3cc9ef19ecb3fe217aa0f12b64e).

**Files changed:**

- `.agents/skills/{oat-project-brief,oat-project-implement,oat-project-pr-progress,oat-repo-knowledge-index}/SKILL.md`
- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`
- `packages/cli/src/validation/skills.test.ts` (recovery)

**Verification:** `check:skill-bumps`, `release:check-versions`, `release:validate` exit 0; pin suite 274 passed before and after the recovery commit.

### Task p05-t02: Close out backlog items and run the full gate list

**Status:** completed
**Commit:** 02f3139b01f9417bcb02e773df2759bb910b5840

**Outcome (required when completed):**

- `BL-261030-evaluate-stacked-goal-delivery`, `BL-261030-admit-goal-exit-gate-review`, `BL-261030-flag-rewritten-committed` and `BL-261030-preflight-knowledge-index` are archived as closed with completed-ledger entries; the index and triage record links are rewritten.
- The full Definition of Done gate list passes (table below).

**Files changed:**

- `.oat/repo/pjm/backlog/items/` → `.oat/repo/pjm/backlog/archived/` (four items), `.oat/repo/pjm/backlog/completed.md`, `.oat/repo/pjm/backlog/index.md`, `.oat/repo/pjm/triage/2026-10-30-untriaged-issues.md`

**Verification:** archive committed first (plan amendment), then every gate:

| Gate                                         | Exit  | Cache notes                                       |
| -------------------------------------------- | ----- | ------------------------------------------------- |
| `pnpm check`                                 | 0     | no replay reported                                |
| `pnpm type-check`                            | 0     | 5 dependency build replays                        |
| `pnpm test`                                  | 0     | 5 build replays; tests executed (9,214 CLI tests) |
| `pnpm build`                                 | 0     | full Turbo replay                                 |
| `pnpm run check:skill-bumps`                 | 0     | 4 changed skills validated                        |
| `pnpm release:check-versions`                | 0     | —                                                 |
| `pnpm release:validate`                      | 0     | 5 packages at 0.3.38                              |
| `pnpm build:docs`                            | 0     | full Turbo replay                                 |
| docs generate-index + `git diff --exit-code` | 0 / 0 | index unchanged                                   |
| `pnpm lint`                                  | 0     | 5 build replays                                   |
| `pnpm format`                                | 0     | 5 build replays                                   |

### Recovery Event dedkp-p05-recovery-01

- Phase/task: p05 / p05-t01
- Original request: dedkp-p05-implementation
- Original commit: 001e059460f506dfbefec472244a668ac7aec292
- Defect class: test
- Discovered by: pnpm test
- Disposition: direction-required
- Authorization: phase-standing
- Attempt: 0/10
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-medium
- Recovery commit: -
- Verification: `pnpm test` exit 1 — 9 stale skill-version pins in `packages/cli/src/validation/skills.test.ts` plus 2 Markdown-scan failures caused by uncommitted archive moves (the archive writes were rolled back; tree clean).
- Reason: the p05 Phase Scope omitted the recovery-ledger exception for `state.md`, so no attempt could be reserved; no reservation, edit or recovery commit occurred.

**Root direction (p05):** the stop came from a root scope omission, not from the work. Amended plan p05-t01 to include the mechanically derived pin file and p05-t02 to commit the archive before the gates (see Deviations); the continuation request `dedkp-p05-implementation-2` authorizes the `oat_phase_recovery_policy` ledger write for a phase-standing recovery of the stale pins.

### Recovery Event dedkp-p05-recovery-02

- Phase/task: p05 / p05-t01
- Original request: dedkp-p05-implementation
- Original commit: 001e059460f506dfbefec472244a668ac7aec292
- Defect class: test
- Discovered by: pnpm test
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-medium
- Recovery commit: b5300aa87d66e3cc9ef19ecb3fe217aa0f12b64e
- Verification: focused pin suite 274 passed before and after the commit; phase `pnpm test` passed before and after (9,214 CLI tests); root rerun of the pin suite passed.
- Reason: the amended p05-t01 boundary authorized mechanical propagation of the bumped skill versions into the contract pins; reservation commit 8ec3add8d59bc2c2f09b71a8781ca79db5881a82 touched only state.md.

### Review Received: p05

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p05-review-2026-10-31T121727Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 2

- Verified: lockstep 0.3.38 strictly above `origin/main` 0.3.37; exactly the four changed skills bumped once, no agent role changed; recovery contract followed (one `direction-required` and one `recovered` event, settled ledger); Backlog Lifecycle followed for all four items; reviewer reran `check:skill-bumps`, `release:check-versions` and `release:validate` (exit 0) and confirmed the docs index is fresh.
- L1 (Low): the p05 plan amendments were not in the Deviations table → resolved by the root in this bookkeeping commit (row matched by cell content after the earlier padded-table anchor missed).
- L2 (Low): issue comments posted at triage link the pre-archive `backlog/items/` paths, which 404 after merge → accepted for PR closeout: the final PR description and any post-merge issue comments link the `backlog/archived/` paths; the quoted triage record text is historical and stays unchanged.

**Outcome:** passed (reviewer request `dedkp-p05-review-1`).

**Phase p05 outcome:** complete. Two tasks; one direction-required stop from a root scope omission (corrected), one phase-standing recovery (1/10) for the version pins; review passed 0C/0H/0M/2L, both resolved by the root. Phase range `eed4d90e98dd9509af7a1d382aacaeec5dadb7ad..ad93669bfdc45f140a404630e67938de9a8550fb`.

### Task p05-t03: (review) Align stack and registration wording in user docs

**Status:** completed
**Commit:** 708a517e5d9297dd3e64da39dfff8f4e1ddda461

**Outcome (required when completed):**

- The CLI reference scopes the stack tip/ancestor rule to configured code carriers for delivery subjects (`dNN`), and the closeout and lifecycle pages describe attach-only `kind: stack` registration.

**Files changed:**

- `apps/oat-docs/docs/reference/cli-reference.md`
- `apps/oat-docs/docs/workflows/projects/closeout/closeout-skills.md`
- `apps/oat-docs/docs/workflows/projects/lifecycle.md`

**Verification:** markdownlint exit 0; docs index regeneration and diff exit 0/0; `pnpm format` exit 0.

**Notes / Decisions:**

- Final-review fix for L1 and L2 (request `dedkp-p05-implementation-3`).

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=dedkp-p01-implementation · scope=p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p01-review-1 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p01-fix-1 · scope=p01-fix-1 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p01-fix-1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p01-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p01-review-2 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p01-fix-2 · scope=p01-fix-2 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p01-fix-2 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p01-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p02-implementation · scope=p02 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p02-review-1 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p02-fix-1 · scope=p02-fix-1 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p02-fix-1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p02-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p02-review-2 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p02-fix-2 · scope=p02-fix-2 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p02-fix-2 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p02-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p03-implementation · scope=p03 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p03-review-1 · scope=p03 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p03-fix-1 · scope=p03-fix-1 · action=fix · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p03-fix-1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=blocked · terminal=yes · class=terminal-stop · continuation=continues:dedkp-p03-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p03-implementation-2 · scope=p03 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p03-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p03-review-2 · scope=p03 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p03-implementation-3 · scope=p03 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p03-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p04-implementation · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p04-review-1 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p04-implementation-2 · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p04-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p04-review-2 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p04-implementation-3 · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p04-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p04-review-3 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p04-complexity-1 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p04-implementation-4 · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p04-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p04-review-4 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p04-implementation-5 · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p04-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p05-implementation · scope=p05 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=blocked · terminal=yes · class=terminal-stop · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p05-implementation-2 · scope=p05 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p05-implementation · observed=~ · match=~

- run/v1 · request=dedkp-p05-review-1 · scope=p05 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p05 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-final-review-1 · scope=final · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

- run/v1 · request=dedkp-p05-implementation-3 · scope=p05 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-medium · model=gpt-5.6-sol-medium · effort=~ · stamp=Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=continues:dedkp-p05-implementation · observed=~ · match=~

<!-- orchestration-runs-end -->

- Gate IMPLEMENT-03 (auto-resolved): first autonomous run with `oat_plan_hill_phases` absent → `hillCheckpointDefault: final`; wrote `oat_plan_hill_phases: ["p05"]` and `oat_auto_review_at_hill_checkpoints: true`.
- Tier 1 — Subagents (Cursor native Task, available without authorization); dispatch policy managed/high from project state.

## Reviews and Gates

<!-- Receipts for final and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

### Review Received: final

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/final-review-2026-10-31T123203Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 3

- Cross-phase probe: a two-layer stack reviewed at the tip followed by the gate's own artifact commit is deliverable; the manual-invocation control stays `disallowed-path`; a mis-ordered stack reports `stack-order` for `--subject d01` (milestone subjects keep branch-head evaluation by the accepted p02-t03 revert). Release bookkeeping verified.
- L1 (Low): CLI reference stack wording lacks the configured-carrier and `dNN` qualifiers; the Final Summary overstated `stack-order` → fix task p05-t03 (docs); Final Summary corrected by the root.
- L2 (Low): `closeout-skills.md` and `lifecycle.md` omit attach-only stack registration → fix task p05-t03.
- L3 (Low): journal References listed a nonexistent `spec.md` → removed by the root.
- Deferred-Medium resurfacing (Step 8.5): none deferred (the only deferral, p02 review L1 second part, is Low and unchanged). Low disposition (Step 9): auto-disposition, all converted.
- Gate IMPLEMENT-11 (auto-resolved): route native Cursor Task, target `oat-reviewer-claude-opus-5-5-high` (cross-family from the GPT-5.6 Sol implementers), reviewer request `dedkp-final-review-1`.

**Outcome:** passed; Lows converted to p05-t03 and root alignments.

- Review-cycle cap reached for p04 (oat-project-review-receive Step 8, 3 cycles: 1C/1H/2M/5L → 0C/0H/2M/2L → 0C/0H/1M/2L). Complexity review `dedkp-p04-complexity-1` (installed complexity-review method): verdict Partially compliant; recommended disposition simplify; report `reviews/archived/complexity-p04-2026-10-31T025003Z.md` (local). Operator disposition (2026-10-31, recorded on resume): **simplify** — apply the complexity review's accepted ledger as fix task p04-t07, then one fresh p04 review of the simplified work; round-3 L1 declined (override at the cap; the pinned Step 2 gate already stops the failure); round-3 L2 corrected in the journal by the root. Pack dependency (workflows→utility) left out of this PR by operator discussion: `workflows` already depends on these utility skills undeclared, and a same-scope declaration would conflict with documented mixed-scope installs.

### Review Received: plan

**Date:** 2026-10-30
**Review artifact (local-only):** reviews/archived/artifact-plan-review-2026-10-30T235710Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

- L1 (Low): the p02-t01 built-CLI example ran `node packages/cli/dist/index.js` from the checkout, which resolves the checkout repository → resolve_in_artifact; p02-t01 Step 4 now uses the shared-conventions invocation from inside each scratch repository.

**Outcome:** passed

- Gate `oat-project-quick-start` (QS-12, auto-resolved): run 0820f334-2a3e-4915-aebf-0044c16a37da, target codex-6-sol-xhigh (gpt-6.1-sol xhigh), attempt 1 of 2, status ok, receiveEligible true, reviewed head f0d269c93185aa68080eca06fd85416d1f4630e2 → allowed/passed.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- Low · p02 review L1 (second part): treating a change to an existing non-placeholder `Invocation` cell as a Reviews-row identity change in `judgeReviewRows`. Deferred: it widens the ledger identity rule beyond #384's scope and the reviewer left it for operator decision; the `reviews/` path restriction (p02-t05) closes the non-review-path exposure. Approved by: autonomous run (QS-11/IMPLEMENT scope rule; no scope expansion). Follow-up trigger: operator decision or a later evidence-hardening item.

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review    | Source Artifact                      | Planned / Documented                                                                                                 | Actual / Accepted                                                                                                                                                                     | Reason                                                                                                                       | Source of Truth      | Follow-up                        |
| ---------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------- |
| p01-t02          | plan.md p01-t02 Step 1               | Unobserved lower member stale at each call site                                                                      | Covered at the wrapper and `delivery check`; refresh and closeout observe every member through `gh` (or fail) before carrier evaluation, so the case is unreachable there             | Mechanically derived: the observation step precedes evaluation in those commands                                             | Implementation       | None                             |
| p02-t01          | plan.md p02-t01; design.md #383/#384 | Milestone branch of `delivery check` unchanged for stacks                                                            | For a milestone with a registered stack delivery, the milestone subject evaluates its carrier through `evaluateDeliveryExitCarrier`; non-stack milestones keep branch-head evaluation | Required for the mandated `--subject m01` built-CLI stack control; consistent with #383 tip semantics                        | Implementation       | Retracted by p02-t03 (review H1) |
| plan p05-t01     | plan.md p05-t01                      | Lockstep bump 0.3.36 → 0.3.37                                                                                        | 0.3.37 → 0.3.38                                                                                                                                                                       | `main` reached 0.3.37 in #389 (merged into this branch at befc083); the gate requires versions strictly above `origin/main`  | plan.md (retargeted) | None                             |
| p05-t01, p05-t02 | plan.md p05 (amended at 8df2933)     | p05-t01 files excluded `packages/cli/src/validation/skills.test.ts`; p05-t02 ran gates before committing the archive | Pin file added to p05-t01 (repaired by recovery dedkp-p05-recovery-02); archive committed before the gates                                                                            | The pins must equal the bumped skill versions; `pnpm test`'s Markdown scan cannot read deleted-but-uncommitted tracked paths | plan.md (amended)    | None                             |

## Final Summary (for PR/docs)

**What shipped:**

- **Stacked goal deliveries (#383):** a `kind: stack` delivery's exit carrier is judged at the stack tip, after every lower layer is confirmed to be the tip or its ancestor (`stack-order`); missing commits report `missing-object`/`inspection-failed` instead of `stack-order`; null and unreviewed-resolution carriers behave exactly as for `kind: pr`. `delivery check`, `delivery refresh` and the closeout check share one wrapper, and milestone and delivery subjects build the same evidence scope once a delivery is registered. `kind: stack` is documented, with attach-only registration in pr-progress.
- **Exit-gate bookkeeping (#384):** the configured exit gate's own artifact commit is a bookkeeping successor of the carrier it produced when its Reviews row is Type `code`, Invocation `gate`, carries the carrier's reviewed head, and names an artifact under `reviews/`. The artifact never becomes integrated-review evidence or unlocks set-once delivery fields; no placeholder row is needed.
- **Journal rewrite detection (#385):** in goal projects, `oat project journal check --at implement-preflight|review` compares the working journal with `HEAD` using the same rule delivery evidence applies and refuses (exit 1) with one `journal-line-rewritten` reason per rewritten or removed committed line; unparseable committed frontmatter also refuses; aliased absolute paths resolve correctly and a dangling `HEAD` is a command error.
- **Knowledge-index preflight (#355):** `oat-repo-knowledge-index` resolves and authorizes a mapper route through `oat-dispatch-subagents` before any knowledge is deleted or written, on both the first-run and Refresh paths, with labelled Claude, Codex and Cursor routes, a file-verified write probe, a route-failure (not read-only) interpretation of a launch that never happened, and no maintainer-specific temp path.

**Behavioral changes (user-facing):**

- `delivery check`/`refresh` and closeout accept a correctly ordered stacked delivery that previously always read stale, and report `stack-order` for a mis-ordered one when checked as a delivery (`--subject dNN`); milestone subjects keep branch-head carrier evaluation.
- A goal milestone's exit carrier stays fresh across the gate's own artifact commit.
- `journal check` now refuses uncommitted rewrites of committed journal lines in goal projects, with a corrective message.
- The knowledge-index skill stops cleanly, without touching knowledge, when no mapper route can be launched, and runs on Codex and Cursor as well as Claude.

**Key files / modules:**

- `packages/cli/src/commands/project/delivery/evidence.ts` - `evaluateDeliveryExitCarrier`, `latestDeliveryForMilestone`, `gateEvidenceArtifacts`, exported `journalRewrites`
- `packages/cli/src/commands/project/delivery/check.ts`, `refresh.ts`, `closeout-check/index.ts` - wrapper and scope adoption
- `packages/cli/src/commands/project/journal-check/index.ts`, `types.ts` - HEAD comparison and `journal-line-rewritten`
- `.agents/skills/oat-repo-knowledge-index/SKILL.md` - dispatch-route preflight, provider routes, write probe
- `.agents/skills/oat-project-brief/references/brief-contract.md` (§12.7–12.8), `oat-project-pr-progress/SKILL.md`, `oat-project-implement/references/completion-and-closeout.md` - contract and guidance
- `apps/oat-docs/docs/reference/cli-reference.md`, `docs/workflows/advanced/workflow-gates.md`, `docs/skills/repo-improve.md` - user docs
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts` - knowledge-index structural pins

**Verification performed:**

- Full Definition of Done gate list at p05 (`pnpm check`, `type-check`, `test`, `build`, `check:skill-bumps`, `release:check-versions`, `release:validate`, `build:docs`, docs index freshness, `lint`, `format`): every exit code 0.
- Per-phase root reviews by `oat-reviewer-claude-opus-5-5-high` (cross-family from the GPT-5.6 Sol implementers), with can-fail proofs for every P0 guard and built-CLI negative controls for the delivery-evidence rules (see each phase section).

**Design deltas (if any):**

- #385 is goal-mode only and runs at implement-preflight and review boundaries (only goal enforces the append-only rule; completion keeps judging the same bytes as `complete-state`).
- #384 binds admission to Reviews-row cells (Invocation `gate`, reviewed head) rather than artifact frontmatter, and restricts gate artifacts to `reviews/`.
- #383 stack registration is attach-only; the milestone subject keeps branch-head carrier evaluation (a p02 deviation toward stored member heads was retracted after review).
- #355 was simplified at the review-cycle cap by operator choice: the stray-change check was removed (reintroduction trigger recorded) and the contract pin trimmed to structural assertions. The workflows→utility pack dependency is intentionally not declared.
- Lockstep version 0.3.38 (main reached 0.3.37 during the run).

## References

- Plan: `plan.md`
- Design: `design.md`
