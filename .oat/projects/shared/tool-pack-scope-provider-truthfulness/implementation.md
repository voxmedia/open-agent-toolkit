---
oat_status: in_progress
oat_ready_for: null
oat_blockers:
  - Phase 4 terminal review found that the documented symlink strategy release can follow a race-swapped provider parent outside the managed root; the one-use correction/review authorization is exhausted.
oat_last_updated: 2026-09-01
oat_current_task_id: p05-t01
oat_generated: false
---

# Implementation: tool-pack-scope-provider-truthfulness

**Started:** 2026-08-31
**Last Updated:** 2026-09-01

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 1     | 1/1       |
| Phase 2 | complete | 7     | 7/7       |
| Phase 3 | complete | 5     | 5/5       |
| Phase 4 | review   | 5     | 5/5       |
| Phase 5 | pending  | 4     | 0/4       |
| Phase 6 | pending  | 4     | 0/4       |
| Phase 7 | pending  | 4     | 0/4       |

**Total:** 18/30 tasks completed

---

## Phase 1: Accepted Diagnostics Baseline

**Status:** completed
**Started:** 2026-08-31

### Phase Summary

**Outcome (what changed):**

- Accepted PR #249 merge SHA
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` is recorded as the diagnostics
  baseline and is present in this branch's ancestry.
- Future phases now target the landed caller-resolved materialization input,
  batch shared-owner attribution, and structured doctor/status availability
  seams.
- No production source or test files changed, and no requirement, stable task,
  architecture, or file-boundary remap was required.

**Key files touched:**

- `implementation.md` - records the accepted baseline, interface inspection,
  and p01 verification.
- `design.md` - replaces predecessor-pending language with the exact landed
  interfaces.
- `plan.md` - records the accepted SHA and removes stale active-run references.
- `spec.md` - closes the predecessor-SHA question without changing scope.

**Verification:**

- Run: focused p01 Vitest command from `plan.md`; `git diff --check`
- Result: pass; the accepted SHA ancestry check also returned exit code 0.

**Notes / Decisions:**

- PR #249 exposes a boolean capability input rather than the future provider
  matrix: `InventoryPackInput.userManagedRoleMaterialization` delegates the
  config-aware decision to doctor/status, while the scoped input uses
  `managedRoleMaterialization`.
- `attributeSharedOwnerDiagnostics()` consumes the complete inventory batch and
  attaches one observation to the first applicable owner in canonical pack
  order. Shared presence still cannot establish placement.
- Status degrades asset or pack inventory failures into a redacted
  `packs:inventory` availability diagnostic, while doctor keeps scope
  unavailability and inventory warnings in its existing check model.

### Task p01-t01: Land, rebase, and record the diagnostics predecessor

**Status:** completed
**Commit:** `940e87e5663bb6c36d8f7d7bfbb6db67d482b3e8`

**Outcome (required when completed):**

- Established PR #249 merge SHA
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` as the accepted current-main
  diagnostics predecessor and adapted lifecycle artifacts to its actual seams.

**Files changed:**

- `.oat/projects/shared/tool-pack-scope-provider-truthfulness/implementation.md`
  - accepted SHA, inspection conclusions, and verification evidence.
- `.oat/projects/shared/tool-pack-scope-provider-truthfulness/design.md` -
  landed interface dependencies and resolved predecessor gate.
- `.oat/projects/shared/tool-pack-scope-provider-truthfulness/plan.md` - accepted
  predecessor status and reference.
- `.oat/projects/shared/tool-pack-scope-provider-truthfulness/spec.md` - resolved
  dependency and open-question language.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts src/commands/sync/index.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts`
- Result: pass.
- Run: `git diff --check`
- Result: pass.

**Notes / Decisions:**

- The landed capability boolean is an input seam, not a replacement for the
  planned provider registry and evidence matrix.
- Status inventory availability and unavailable scope reporting remain separate
  fields; future evidence projection must preserve partial known facts rather
  than collapse either condition into placement.
- Independent p01 review passed at the task head with 0 critical, 0 important,
  0 medium, and 1 non-blocking minor lifecycle-wording finding. The finding was
  applied during root bookkeeping without reopening production work.

**Issues Encountered:**

- The first p01 dispatch stopped before work because its supplied expanded base
  SHA was invalid. Thomas explicitly authorized this corrected new run; the
  relaunch began from clean exact base
  `f6d77721039086e5ce35f48549d91a98aeeb6612` and preserved that evidence.

---

## Phase 2: Shared Evidence and Truthful Scope

**Status:** completed after 7/7 tasks and final independent review pass
**Started:** 2026-08-31

### Phase Summary

- Added canonical unknown-aware pack evidence, a provider capability registry,
  additive scope selection/lifecycle outcomes, realized-placement install
  behavior, normalized inspection/diagnostic output, and update/remove
  lifecycle evidence.
- Completed seven planned task commits, two bounded recovery commits, two root
  recovery-settlement commits, and two review-fix commits.
- Combined p02 verification passes 29 files / 701 tests plus CLI lint,
  type-check, formatting, and `git diff --check`.
- The third governed review found two Important blockers. Thomas authorized one
  additional bounded correction and one additional High review cycle. Commit
  `e85ba38ae` fixed both round-3 findings and raised the combined p02 suite to
  29 files / 710 tests.
- Terminal round 4 reproduced one new Important defect: multi-pack,
  multi-scope post-removal failures invalidate final evidence for both scopes
  but can emit a recovery command for only one scope. The authorization is
  exhausted, so Phase 3 did not start.
- Thomas subsequently authorized exactly one bounded correction for that
  finding and one fresh independent High review round. This raises the
  review-fix retry limit to four without changing the plan or phase scope.
- Commit `4e1cbac86` fixed the multi-scope command matrix and raised the p02
  suite to 29 files / 714 tests. Terminal round 5 found one Important recovery
  wording contradiction, so Phase 3 did not start.

| Task    | Status   | Commit      | Outcome                                                 |
| ------- | -------- | ----------- | ------------------------------------------------------- |
| p02-t01 | complete | `fa6f129fe` | Canonical intent/realization/unknown evidence projector |
| p02-t02 | complete | `1f81e62de` | Provider capability registry and scope context          |
| p02-t03 | complete | `90164f3a0` | Registry-routed provider consumers                      |
| p02-t04 | complete | `572237850` | Additive scope selection and lifecycle outcomes         |
| p02-t05 | complete | `926ae0624` | Realized-placement aggregate/direct installs            |
| p02-t06 | complete | `06275a123` | Normalized inspection and diagnostics evidence          |
| p02-t07 | complete | `23efb17c7` | Update/remove lifecycle compatibility                   |

### Task p02-t01: Add the canonical pack evidence projector

**Status:** completed
**Commit:** `fa6f129fe`

### Task p02-t02: Define the provider registry and scope context

**Status:** completed
**Commit:** `1f81e62de`

### Task p02-t03: Route provider consumers through the registry

**Status:** completed
**Commit:** `90164f3a0`

### Task p02-t04: Add additive scope selection and lifecycle outcomes

**Status:** completed
**Commit:** `572237850`

### Task p02-t05: Make aggregate and direct installs use realized placement

**Status:** completed
**Commit:** `926ae0624`

### Task p02-t06: Project evidence through inspection and diagnostics

**Status:** completed
**Commit:** `06275a123`

### Task p02-t07: Extend lifecycle compatibility across update and removal

**Status:** completed
**Commit:** `23efb17c7`

**Recovery and review-fix commits:**

- `063981f17` / `63aa62d17` - provider-registry lint recovery and root
  settlement.
- `fb4c4a4ba` / `f90fc073d` - import-cycle composition recovery and root
  settlement.
- `d959cb12c` - round-1 fix for four blocking review findings.
- `9d557564f` - round-2 fix for provider-context and removal findings.
- `e85ba38ae` - operator-authorized round-3 fix for immutable provider snapshot
  reuse and structured post-removal failure reporting.
- `4e1cbac86` - operator-authorized round-4 fix covering every selected pack and
  invalidated scope in post-removal recovery.
- `eb218a7a2` - final operator-authorized fix deriving recovery prose from each
  pack's actual canonical status and asserting complete human/JSON records.

**Round-3 review blockers (fixed by `e85ba38ae`):**

1. Interactive init and sync still re-detect providers in cancel/save branches
   after the first `ProviderScopeContext`, so one command scope can observe two
   contradictory provider snapshots.
2. Intent-write or final-inventory failure after canonical removal occurs
   outside the structured lifecycle boundary, so the command can reject after
   a partial write instead of returning source-qualified recovery evidence.

**Operator-authorized round 4:**

- Scope is restricted to the two round-3 findings above.
- The original accepted p02 implementer and exact
  `oat-phase-implementer-gpt-5-6-sol-medium` target remain authoritative.
- One append-only fix commit and one fresh independent High reviewer round are
  permitted. A blocking fourth review stops implementation without automatic
  extension.

**Terminal round-4 blocker:**

- `failedPostRemovalLifecycleOutcomes()` discards final evidence for every
  selected scope but chooses one recovery scope per outcome. For `--all` over
  project and user scopes, direct reproduction showed an unrelated pack report
  a user-scope failure while recommending `--scope project`; even the failed
  pack's one-scope retry cannot re-establish both invalidated scopes.
- Artifact: `reviews/p02-review-2026-08-31T155718Z.md`; reviewed head
  `e85ba38ae575e193a7084f1046798ca0827f6bef`; 0 critical, 1 important.
- Verification: 29 files / 710 tests; focused blocker suite; CLI lint,
  type-check, formatting, and `git diff --check` all passed.

**Operator-authorized round 5:**

- Scope is restricted to the round-4 multi-pack/multi-scope recovery finding.
- The exact `oat-phase-implementer-gpt-5-6-sol-medium` fix target and fresh
  `oat-reviewer-gpt-5-6-sol-high` review target remain authoritative.
- One append-only fix commit and one fresh review are permitted. A blocking
  fifth review stops implementation without automatic extension.

**Terminal round-5 blocker:**

- Recovery now contains all 16 expected pack/scope commands for `--all --scope
all`, but its prose unconditionally says canonical removal was applied. Six
  absent packs in the review fixture correctly report `canonical.status:
unchanged`, making the source-qualified recovery record contradictory.
- Artifact: `reviews/p02-review-2026-08-31T164057Z.md`; reviewed head
  `4e1cbac86f3f0bb5acefe446d8df8c81df3f025f`; 0 critical, 1 important.
- Verification: focused 35 tests and combined 29 files / 714 tests; CLI lint,
  type-check, formatting, and `git diff --check` all passed.

**Final operator-authorized correction:**

- Scope is restricted to deriving recovery prose from each pack's actual
  canonical status and asserting complete exact human/JSON recovery records.
- The review-fix retry limit is raised to its maximum of five. One append-only
  fix commit and one fresh independent High review are permitted.
- A blocking review stops implementation without another extension; a passing
  review advances directly to Phase 3.

**Final disposition:**

- Commit `eb218a7a2463e580e1ddb8c0bed5b9998d25e0ab` completed the final
  correction without widening scope.
- `reviews/p02-review-2026-08-31T170932Z.md` reviewed the complete p02 range at
  that head and passed with 0 critical, 0 important, 0 medium, and 0 minor.
- Focused removal and combined 29-file / 714-test suites, CLI lint, type-check,
  formatting, and `git diff --check` passed. Phase 3 may begin.

---

## Phase 3: Provider Materialization and Restart Truth

**Status:** completed and independently reviewed
**Started:** 2026-08-31

### Phase Summary

- Added provider-capability-aware user scanning, per-operation core and
  extension evidence, user provider configuration and inspection, and sourced
  refresh advice without converting filesystem state into runtime visibility.
- All five planned task commits are present in order. The Phase 3 union passes
  19 files / 470 tests, and CLI lint, type-check, format, `pnpm check`, and
  `git diff --check` pass at `90a4c7a3e`.
- Full `pnpm test` exposed one stale integration assertion that still expects a
  Claude user agent not to materialize. The focused integration rerun reproduces
  the failure; the production behavior is the intended p03-t01 behavior.
- The adjacent integration test was accepted as a mechanically derived in-phase
  boundary. Recovery attempt 1/10 corrected only that fixture and all expanded
  phase and repository verification now passes.

| Task    | Status   | Commit      | Outcome                                         |
| ------- | -------- | ----------- | ----------------------------------------------- |
| p03-t01 | complete | `1120329eb` | Provider-capability-aware user scanning         |
| p03-t02 | complete | `3d518e69e` | Per-asset core sync outcomes                    |
| p03-t03 | complete | `3b79113da` | Provider extension materialization evidence     |
| p03-t04 | complete | `1375eeadd` | User provider configuration and inspection      |
| p03-t05 | complete | `90a4c7a3e` | Sourced provider refresh advice and diagnostics |

### Task p03-t01: Make user agent scanning capability-aware

**Status:** completed
**Commit:** `1120329eba12785717376dfe9b17733feea525fc` (reconciled)

**Outcome:**

- User-scope agent scanning now follows provider capability instead of a
  hard-coded managed-agent exclusion.
- The planner and sync command preserve provider-aware scan evidence.

**Files changed:**

- `packages/cli/src/shared/types.ts`
- `packages/cli/src/engine/scanner.ts`
- `packages/cli/src/engine/scanner.test.ts`
- `packages/cli/src/engine/compute-plan.ts`
- `packages/cli/src/engine/compute-plan.test.ts`
- `packages/cli/src/commands/sync/index.ts`
- `packages/cli/src/commands/sync/index.test.ts`

**Verification:** focused p03-t01 suite passed 95/95 tests; formatting and
`git diff --check` passed.

**Notes:** Reconciled on 2026-08-31 from the exact task-ID commit signal with
high confidence. The original commit remains the source authority.

### Task p03-t02: Return per-operation core sync evidence

**Status:** completed
**Commit:** `3d518e69e0bff63cd0d202eeb4c63098b454e1f3` (reconciled)

**Outcome:**

- Core sync execution now returns per-operation outcomes separately from the
  immutable plan.
- Apply and dry-run reporting carry the structured evidence forward.

**Files changed:**

- `packages/cli/src/engine/engine.types.ts`
- `packages/cli/src/engine/engine.types.test.ts`
- `packages/cli/src/engine/execute-plan.ts`
- `packages/cli/src/engine/execute-plan.test.ts`
- `packages/cli/src/commands/sync/sync.types.ts`
- `packages/cli/src/commands/sync/apply.ts`
- `packages/cli/src/commands/sync/dry-run.ts`

**Verification:** focused p03-t02 suite passed 81/81 tests; formatting and
`git diff --check` passed.

**Notes:** Reconciled on 2026-08-31 from the exact task-ID commit signal with
high confidence. The original commit remains the source authority.

### Task p03-t03: Return extension evidence and cover managed roles

**Status:** completed
**Commit:** `3b79113dafeb813b6b87a023fdfbbe4df2d11303` (reconciled)

**Outcome:**

- Provider extensions now expose role materialization evidence.
- Codex and Cursor managed-role coverage is explicit and Claude behavior is
  pinned by integration tests.

**Files changed:**

- `packages/cli/src/providers/shared/materialization-extension.ts`
- `packages/cli/src/providers/shared/materialization-extension.test.ts`
- `packages/cli/src/providers/codex/codec/sync-extension.ts`
- `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- `packages/cli/src/providers/cursor/codec/sync-extension.ts`
- `packages/cli/src/providers/cursor/codec/sync-extension.test.ts`
- `packages/cli/src/providers/claude/adapter.test.ts`
- `packages/cli/src/engine/engine.integration.test.ts`

**Verification:** focused p03-t03 suite passed 74/74 tests; formatting and
`git diff --check` passed.

**Notes:** Reconciled on 2026-08-31 from the exact task-ID commit signal with
high confidence. The original commit remains the source authority.

### Task p03-t04: Support user provider config and truthful inspection

**Status:** completed
**Commit:** `1375eeaddfa5d1332965be1eadc6e65fbdf8169b` (reconciled)

**Outcome:**

- Provider configuration supports project and user scope.
- Provider list and inspect surfaces expose scoped configuration and detected
  state without conflating them.

**Files changed:**

- `packages/cli/src/commands/providers/providers.types.ts`
- `packages/cli/src/commands/providers/set/index.ts`
- `packages/cli/src/commands/providers/set/index.test.ts`
- `packages/cli/src/commands/providers/list/list.ts`
- `packages/cli/src/commands/providers/list/list.test.ts`
- `packages/cli/src/commands/providers/inspect/inspect.ts`
- `packages/cli/src/commands/providers/inspect/inspect.test.ts`
- `packages/cli/src/config/user-sync-config.ts`
- `packages/cli/src/config/user-sync-config.test.ts`

**Verification:** focused p03-t04 suite passed 38/38 tests; formatting and
`git diff --check` passed.

**Notes:** Reconciled on 2026-08-31 from the exact task-ID commit signal with
high confidence. The original commit remains the source authority.

### Task p03-t05: Add sourced refresh policy and lifecycle advice

**Status:** completed
**Commit:** `90a4c7a3e7d022813e97b972c4ec5c00044f54f7` (reconciled)

**Outcome:**

- Restart guidance is derived from sourced provider policy and operation
  evidence.
- Sync, init, status, doctor, and documentation expose conservative lifecycle
  advice without claiming unverified runtime visibility.

**Files changed:**

- `packages/cli/src/providers/shared/restart-adviser.ts`
- `packages/cli/src/providers/shared/restart-adviser.test.ts`
- `packages/cli/src/providers/shared/registry.ts`
- `packages/cli/src/providers/shared/registry.test.ts`
- `packages/cli/src/commands/sync/apply.ts`
- `packages/cli/src/commands/sync/index.test.ts`
- `packages/cli/src/commands/init/tools/index.ts`
- `packages/cli/src/commands/init/tools/index.test.ts`
- `packages/cli/src/commands/status/index.ts`
- `packages/cli/src/commands/status/index.test.ts`
- `packages/cli/src/commands/doctor/index.ts`
- `packages/cli/src/commands/doctor/index.test.ts`
- `apps/oat-docs/docs/provider-sync/providers.md`
- `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- `apps/oat-docs/docs/cli-utilities/tool-packs.md`

**Verification:** focused p03-t05 suite passed 303/303 tests; `pnpm check`,
formatting, and `git diff --check` passed.

**Notes:** Reconciled on 2026-08-31 from the exact task-ID commit signal with
high confidence. The original commit remains the source authority.

### Recovery Event p03-test-boundary-20260831T130906Z

- Phase/task: p03 / p03-t01
- Original request: `dispatch-p03-20260831T171500Z-e3512dcbc`
- Original commit: `1120329eba12785717376dfe9b17733feea525fc`
- Defect class: test
- Discovered by: `pnpm test`
- Disposition: direction-required
- Authorization: phase-standing
- Attempt: 0/10
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high`
- Recovery commit: -
- Verification: Phase-focused 470/470 pass; focused integration rerun fails at
  `packages/cli/src/commands/commands.integration.test.ts:1108`
- Reason: the assertion encodes the pre-p03 user-agent contract; no edit,
  reservation, or recovery commit occurred before the phase handoff.

### Recovery Event p03-recovery-20260831T181500Z

- Phase/task: p03 / p03-t01
- Original request: `dispatch-p03-20260831T171500Z-e3512dcbc`
- Original commit: `1120329eba12785717376dfe9b17733feea525fc`
- Defect class: test
- Discovered by: `pnpm test`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high`
- Recovery commit: `646b9809271b73243e9b001006aa57cb5494a7a8`
- Verification: focused 23/23; expanded phase 20 files / 493 tests; CLI
  lint/type-check/format, `pnpm check`, `git diff --check`, and full
  `pnpm test` passed before and after the source recovery commit
- Reason: the stale assertion was mechanically aligned with p03-t01 provider
  capability behavior; no production code changed.

### Review Round 1

- Artifact: `reviews/p03-review-2026-08-31T184315Z.md`
- Reviewed head: `810f0788d6034b12997e2154f14ac50dce8623df`
- Verdict: changes requested; 0 Critical, 3 Important, 1 Medium, 0 Minor.
- Reconnaissance: not attempted.
- Bounded fix scope:
  1. Preserve planned extension operations and expose apply results separately.
  2. Include Claude core user-agent materialization in status/doctor evidence.
  3. Replace the contradicted Claude `/agents` refresh claim with conservative,
     current-contract behavior and documentation.
  4. Correct the documented `providers set` user-scope command syntax.
- The original exact High p03 implementer remains the fix owner. A fresh High
  reviewer will assess the complete range after verification.

### Review Round 1 Fix

- Commit: `11a35ce90994848ddbe4a3ed2e4f0739b40a1233`
- Preserved planned extension operations while adding separate apply results;
  made Claude core user-agent materialization visible to status/doctor;
  reverted unsupported runtime refresh claims to `unknown`; and corrected the
  user provider command examples.
- Verification: focused 5 files / 218 tests, expanded phase 20 files / 498
  tests, CLI lint/type-check/format, `pnpm check`, `git diff --check`, CLI help,
  and full `pnpm test` pass.
- A first post-commit full test run hit an unrelated `ENOTEMPTY` temporary-dir
  cleanup race. The no-edit focused rerun passed 18/18 and the complete no-edit
  `pnpm test` rerun passed; no recovery or source change was needed.

### Review Round 2

- Artifact: `reviews/p03-review-2026-08-31T193945Z.md`
- Reviewed head: `2132804175242aa706791c03e12577a87f849ad4`
- Verdict: changes requested; 0 Critical, 1 Important, 1 Medium, 2 Minor.
- Reconnaissance: attempted through one bounded read-only intelligent-recon
  lane; complete orchestration evidence is in the review artifact and its log
  entry is deferred to the terminal p03 outcome.
- Bounded fix scope:
  1. Render extension operation results—not just plans—on the human apply
     surface with stable identity, reason, outcome, and redacted failure.
  2. Stop assigning aggregate-only counts to named assets; preserve them as
     unknown or aggregate evidence when exact operation records are absent.
  3. Update provider command help/reference to describe project as the default
     and expose explicit project/user scope selection.
  4. Correct the provider overview's user-scope summary to include
     capability-supported ordinary agents separately from managed extensions.
- `apps/oat-docs/docs/provider-sync/commands.md` is accepted as one
  mechanically derived p03-t04 documentation boundary; no production scope is
  expanded.

### Review Round 2 Fix

- Commit: `c8ff68a82f9fd8beef352bd45da7a429ff5c2d11`
- Human extension output now joins immutable plans to actual results; legacy
  aggregate-only counts remain unattributed and cannot generate named refresh
  advice; provider help/reference and user-scope summaries are accurate.
- `packages/cli/src/commands/help-snapshots.test.ts` was authorized after the
  first full test exposed exactly two stale inline snapshots. Only those two
  provider-set snapshots changed.
- Verification: focused 3 files / 128 tests, expanded phase 20 files / 501
  tests, CLI lint/type-check/format, `pnpm check`, live help,
  `git diff --check`, and full `pnpm test` pass.
- A pre-commit full run had one unrelated smoke failure; the no-edit smoke rerun
  passed 140/140 and the authoritative post-commit full run passed completely.

### Review Round 3 — Terminal Governance Boundary

- Artifact: `reviews/p03-review-2026-08-31T202630Z.md`
- Reviewed head: `d7762061f9db31db06160a1b87eeca08981dd39a`
- Verdict: changes requested; 0 Critical, 2 Important, 0 Medium, 0 Minor.
- Reconnaissance: attempted through one bounded read-only intelligent-recon
  lane; the artifact contains complete orchestration evidence.
- All four round-2 findings are fixed. The two new Important findings are:
  1. `providers set --scope <invalid>` accepts arbitrary values, writes project
     config, and reports the invalid scope instead of rejecting before writes.
  2. Core human apply output renders immutable plans under an applied heading
     without the exact mixed results or aggregate-only unknown outcomes already
     present in JSON.
- Focused 128, expanded phase 501, CLI lint/type-check/format, live help,
  `pnpm check`, full `pnpm test`, and whitespace checks pass; the invalid-scope
  mutation was reproduced separately.
- This is the third governed p03 review cycle. No fourth fix or review is
  authorized automatically; explicit operator disposition is required.

### Review Round 4 Authorization

- Thomas explicitly authorized exactly one additional bounded correction for
  the two Important round-3 findings and one fresh independent High review.
- The correction is limited to invalid provider-scope rejection before writes
  and truthful core human apply-result rendering, with the tests and adjacent
  snapshots mechanically required by those changes.
- A passing round-4 review completes p03 and advances directly to p04. A
  blocking round-4 review is terminal for this authorization.

### Review Round 3 Fix

- Commit: `cb8156ab27a864e86fafcd857f7d98ecbb8266c1`
- `providers set` now constrains `--scope` to `project|user` at the command
  boundary; regression coverage proves invalid values fail before root or
  config resolution and cause zero writes.
- Core human apply output joins immutable plans to normalized core results and
  renders stable identity, reason, actual outcome, and redacted failures;
  aggregate-only evidence stays explicitly unknown and unattributed.
- The provider-set help snapshot was the only mechanically required adjacent
  boundary.
- Verification: focused 3 files / 131 tests; expanded p03 20 files / 504
  tests; CLI lint, type-check, format, live help and invalid-scope
  reproduction, `pnpm check`, `git diff --check`, and full `pnpm test` pass.
  The final full run replayed the immediately prior live CLI 316-file / 4,757-
  test result and ran smoke 140/140, skills 586/586, and release 39 pass plus
  one skip live.

### Review Round 4 — Terminal Governance Boundary

- Artifact: `reviews/p03-review-2026-08-31T223136Z.md`
- Reviewed head: `4ddd2e4dcf42ccc5e8fe2252bcb4168fff24dc3c`
- Verdict: changes requested; 0 Critical, 1 Important, 0 Medium, 0 Minor.
- Reconnaissance: attempted through one bounded read-only intelligent-recon
  lane; the artifact records complete orchestration evidence.
- Both round-3 Important findings and every earlier p03 review finding are
  fixed. Expanded p03 passed 20 files / 504 tests, focused sync passed 61/61,
  and the live invalid JSON-scope reproduction failed before writes.
- Remaining blocker: every production provider refresh policy is `unknown`.
  The design and plan require either one defensible sourced non-unknown policy
  or an explicit HiLL decision accepting and durably recording the
  first-release FR7 limitation. Neither exists, while current bookkeeping
  overstates p03-t05 as sourced and complete.
- This operator-authorized round 4 is terminal. No fifth automatic correction
  or p04 launch is authorized; operator disposition is required.

### HiLL Decision: Conservative New-Session Advice

- On 2026-08-31, Thomas resolved the terminal refresh-policy boundary: after a
  successful provider-visible file change, OAT should conservatively advise
  starting a new provider session to ensure the provider has an opportunity to
  load the changed asset.
- This is repository-decision provenance for OAT safety guidance. It is not an
  undocumented provider contract, does not claim that the application process
  must restart, and does not prove that the new session loaded or exposed the
  asset.
- No advice is emitted for no-op, planned-only, failed, missing, inactive, or
  unsupported materialization. Runtime visibility remains observation-only.
- The decision authorizes one bounded p03 correction, one fresh independent
  High review, and direct continuation to p04 only if that review passes.
- This intentionally resolves the design's p03-t05 HiLL alternative with a
  sourced `repository-decision` policy instead of accepting vacuous `unknown`
  advice as FR7 delivery. The implementation and this decision are the source
  of truth for the bounded policy; no other requirement or phase boundary
  changes.

### HiLL Policy Correction

- Commit: `a65ba0ce2f30d072666938c16de79e6a561e40d2`
- Every supported provider/content capability inherits the dated
  `repository-decision` new-session policy unless a sourced provider-specific
  policy overrides it; unsupported capability rows remain `unknown`.
- Advice remains gated to successful `changed` evidence. Current/no-op,
  planned, failed, missing, inactive, unsupported, and aggregate-only evidence
  produce no advice, and runtime observation retains precedence.
- Human guidance says “start a new provider session” and explicitly avoids
  application-restart, hot-reload, or runtime-visibility guarantees. Existing
  `restart-required` schema compatibility is preserved with recovery code
  `start-new-provider-session`.
- Verification: focused 317/317; expanded p03 20 files / 509 tests before and
  after commit; CLI lint/type-check/format, `pnpm check`, `git diff --check`,
  and full `pnpm test` pass. The live pre-commit CLI run passed 316 files /
  4,762 tests; committed-head smoke, skills 586/586, and release 39 pass plus
  one skip ran live.

### Review Round 5 — Terminal Governance Boundary

- Artifact: `reviews/p03-review-2026-08-31T234602Z.md`
- Reviewed head: `73a0488bea572ec927eb10abfd94bdd1e6849e09`
- Verdict: changes requested; 0 Critical, 1 Important, 2 Medium, 0 Minor.
- Reconnaissance: not attempted.
- The prior unknown-policy blocker is resolved, every earlier p03 finding
  remains fixed, and focused 317/317 plus expanded p03 509/509 tests pass.
- Remaining blocking defect: `sync/apply.ts` filters exact extension refresh
  evidence to role targets, so a successful config-only provider-visible
  change receives no approved new-session advice.
- Non-blocking hardening remains for provider-policy precedence validation and
  tests. The stale round-3 wording in `state.md` was corrected while receiving
  this review.
- The authorization covered one policy correction and this fresh review. The
  review did not pass, so no sixth correction or Phase 4 launch is authorized
  without operator direction.

### Review Round 5 Correction Authorization

- Thomas explicitly authorized one additional bounded Phase 3 correction and
  one fresh independent High review.
- The correction owns the blocking exact config-only provider-change advice
  gap and the adjacent provider-policy precedence validation/test guardrail.
  The stale state-body finding was already corrected during review receipt.
- The original exact High Phase 3 implementer target remains authoritative.
  A passing fresh review completes Phase 3 and advances directly to Phase 4;
  another blocking review is terminal for this authorization.

### Review Round 5 Correction

- Commit: `5f3bc57a0e785224ff25fad007cf0a7ee1c0d118`
- Exact changed extension configuration evidence now maps through the unique
  registered materialization-extension capability and deduplicates with role
  evidence by provider, scope, and content kind. Aggregate-only, failed,
  unsupported, and ambiguous evidence remains advice-free.
- Provider-specific refresh policies explicitly precede the repository
  fallback. Registry validation rejects sourced policies on unsupported rows
  and malformed or absent provenance.
- Changed exactly four authorized source/test files. RED produced 8 expected
  failures; focused 326/326 and expanded p03 518/518 passed. CLI lint,
  type-check, format, `pnpm check`, `git diff --check`, and full `pnpm test`
  passed; the live CLI run completed 4,771/4,771 tests, skills 586/586, and
  release 39 pass plus one intentional skip.
- Root independently verified the exact file boundary, clean worktree,
  whitespace, and focused 326/326 suite at committed HEAD.

### Review Round 6 — Passed

- Artifact: `reviews/p03-review-2026-09-01T002159Z.md`
- Reviewed head: `f50e007d7eac0de9c0bf2eec32c1ee9e8443817b`
- Verdict: passed; 0 Critical, 0 Important, 0 Medium, 0 Minor.
- Reconnaissance: not attempted.
- Focused 326/326 and expanded p03 518/518 passed. CLI lint, type-check,
  format, `pnpm check`, markdownlint, and range whitespace checks passed.
- The reviewer confirmed the config-only advice and policy
  precedence/provenance findings are fixed, all earlier Phase 3 findings
  remain resolved, and FR1/FR3/FR4/FR7/FR10 plus NFR2/NFR3/NFR5 align.
- Phase 3 is complete. The implementation pointer remains `p04-t01` and Phase
  4 may begin.

---

## Phase 4: Safe Collection-Directory Aliases

**Status:** blocked at terminal review governance boundary
**Started:** 2026-08-31

### Phase Summary

- Added Manifest V2 collection ownership with V1 normalization, exact
  identity proof, configured-auto skill collection planning, atomic no-clobber
  apply/rollback, drift-safe detach/removal, and matching human/JSON/provider
  lifecycle reporting.
- Explicit configured symlink/copy remains per-entry. Collection aliases never
  delete canonical targets or unmanaged content, never fall back to copy, and
  never permit child mutation beneath an inherited collection.
- All five planned task commits are present in order. One mechanically derived
  p04-t04 executor seam safely consumes `detach-collection` by removing
  manifest ownership and unlinking only a still-exact OAT-created alias.

| Task    | Status   | Commit      | Outcome                                      |
| ------- | -------- | ----------- | -------------------------------------------- |
| p04-t01 | complete | `99fdd4734` | Manifest V2 collection ownership             |
| p04-t02 | complete | `b2edc2b48` | Exact identity proof and auto-alias planning |
| p04-t03 | complete | `1160d2c98` | Atomic no-clobber apply and rollback         |
| p04-t04 | complete | `7653d456b` | Drift-safe detach, disablement, and removal  |
| p04-t05 | complete | `d668237fb` | Human/JSON/provider lifecycle and docs       |

### Recovery Event p04-recovery-20260901T010500Z

- Phase/task: p04 / p04-t05
- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Original commit: `d668237fba3bfb7278ccd128f8804aa0c9d4e5cd`
- Defect class: composition
- Discovered by: `pnpm test`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high`
- Recovery commit: `7be0d56dfe69791982fae373882c3d96dac981eb`
- Verification: authoritative post-commit focused 66/66, phase 368/368, and
  full `pnpm test` passed
- Reason: collection aliases are registry-supported only for skills; the
  bounded correction prevents agent-alias collision with Cursor role
  materialization and mechanically aligns two integration fixtures.

### Verification

- Root validated the exact seven-commit range, five ordered task commits,
  recovery reservation/terminal marker, file boundaries, clean worktree, and
  whitespace at `7be0d56df` before clearing the recovery marker.
- Implementer phase union passed 18 files / 368 tests. Full `pnpm test` passed
  with live CLI coverage of 317 files / 4,823 tests plus passing smoke, skills,
  and release suites. CLI lint, type-check, and format passed live; `pnpm
check` passed with 10/10 cache replays plus live validation of 63 skills.
- Root independently reran the primary 15-file union at committed HEAD: 315/315
  passed.

### Review Round 1

- Artifact: `reviews/p04-review-2026-09-01T013028Z.md`
- Reviewed head: `09ab8e7a0878e812caec569eed0512e3bd7a2e88`
- Verdict: changes requested; 2 Critical, 1 Important, 2 Medium, 0 Minor.
- Reconnaissance: attempted through one accepted consequential lane plus
  caller-inline reconciliation after the shared thread limit rejected a second
  lane. The artifact contains complete orchestration evidence; its project-log
  entry is deferred until the terminal Phase 4 outcome so the fix child starts
  from a clean worktree.
- Bounded correction scope:
  1. Close the apply-time ancestry swap before any directory/link mutation.
  2. Persist creation-time alias identity and never unlink a user-replaced
     same-target alias; legacy records detach while preserving the alias.
  3. Safely transition owned collections from `auto` to explicit `symlink` or
     `copy` before per-entry reconciliation.
  4. Require normalized collection-child paths and segment-safe ancestry.
  5. Thread registry `collectionAlias` capability into planning and fall back
     to per-entry behavior when unsupported.
- The original exact High p04 implementer remains the fix owner. Phase 5 stays
  gated until a fresh review reports zero Critical and zero Important findings.

### Review Round 1 Fix

- Commit: `85cddb881240eba9fe88cee8f1d18b4ecec07dff`
- Closed the apply-time ancestry race by re-proving identity immediately before
  mutation and rejecting changed or symlinked ancestors in the creation
  primitive.
- Persisted exact link text plus device/inode creation identity so legacy or
  mismatched ownership detaches without unlinking user-replaced aliases.
- Added safe collection-to-explicit symlink/copy transitions, normalized POSIX
  collection-child validation, and registry-owned collection-alias capability
  gating with per-entry fallback for unsupported providers.
- Verification: RED reproduced all five findings with 15 expected failures
  across 178 tests; GREEN focused coverage passed 195/195. The authoritative
  Phase 4 union passed 18 files / 388 tests at the committed head. CLI lint,
  type-check, and format passed live; `pnpm check`, full `pnpm test`, and
  `git diff --check` passed. Root independently verified the exact 14-file
  boundary, clean worktree, whitespace, and the 388-test union.
- A fresh exact-High reviewer will assess the complete Phase 4 range before
  Phase 5 starts.

### Review Round 2

- Artifact: `reviews/p04-review-2026-09-01T020351Z.md`
- Reviewed head: `d50d2d6c642c347114a1c2de5eb9502496328ffb`
- Verdict: changes requested; 2 Critical, 2 Important, 0 Medium, 0 Minor.
- Reconnaissance: attempted through one accepted consequential safety lane. The
  artifact contains complete orchestration evidence; its project-log entry
  remains deferred until the terminal Phase 4 outcome.
- Bounded correction scope:
  1. Eliminate or safely disable the final path-based ancestry race in
     collection-link creation.
  2. Block every explicit transition whose apply-time collection identity no
     longer exactly matches; never write children into a replacement path.
  3. Reconcile zero-child `auto` to explicit symlink/copy transitions.
  4. Align the design model with durable `linkText` and optional `createdLink`
     identity, including legacy detach-without-unlink behavior.
- Phase 5 remains gated pending a bounded fix and fresh complete Phase 4 review.

### Review Round 2 Fix

- Commit: `0dc79b64b9733cf387d969fa9721c59d78fc1515`
- Disabled unsafe path-based collection creation where Node cannot provide a
  securely guarded parent-relative primitive; automatic collection planning
  now truthfully falls back to safe per-entry synchronization while exact
  manually created aliases remain adoptable.
- Re-proved durable collection identity before every explicit transition and
  blocked deferred child writes for changed, foreign, missing, unavailable, or
  failed-removal destinations.
- Added zero-child `auto` to explicit symlink/copy reconciliation through apply
  and manifest reload, retaining existing adopted/changed/legacy/unverifiable
  conflict semantics.
- Aligned the design with exact `linkText`, optional `createdLink`, validation
  and migration behavior, and legacy detach-without-unlink authority.
- Verification: RED reproduced 15 intended failures across 80 tests; focused
  GREEN passed 82/82. The authoritative Phase 4 union passed live at 18 files /
  402 tests before and after commit. CLI lint, type-check, and format passed
  live; `pnpm check`, full `pnpm test`, and `git diff --check` passed. Root
  independently verified the exact nine-file boundary, clean worktree,
  whitespace, and the live 402-test union.
- A fresh exact-High reviewer will assess the complete Phase 4 range before
  Phase 5 starts.

### Review Round 3

- Artifact: `reviews/p04-review-2026-09-01T023939Z.md`
- Reviewed head: `6da49610627aae9f3eb78879906239ac5a86fa48`
- Verdict: changes requested; 1 Critical, 1 Important, 2 Medium, 0 Minor.
- Reconnaissance: attempted through one accepted consequential safety lane. The
  artifact contains complete orchestration evidence; its project-log entry
  remains deferred until the terminal Phase 4 outcome.
- Bounded correction scope:
  1. Eliminate the final path-based unlink race or disable automatic alias
     unlink/transitions and require truthful manual recovery before child work.
  2. Align the design `CollectionProjectionPlan` with the load-bearing
     configured strategy, durable creation identity, and transition fields.
  3. Preserve V1 bytes/version when every apply operation fails.
  4. Document the current adoption-only collection-alias behavior and safe
     per-entry fallback for absent destinations.
- Phase 5 remains gated pending a bounded fix and fresh complete Phase 4 review.

### Review Round 3 Fix

- Commit: `996376f443e968784365ef2f1150834173de9da7`
- Disabled automatic collection-alias unlink, transition deletion, and rollback
  deletion where the runtime lacks an identity-bound parent-relative primitive.
  Replacements are preserved, manual recovery is reported, and deferred child
  writes remain blocked until a later plan independently proves the destination
  absent.
- Aligned the design `CollectionProjectionPlan` fields and lifecycle semantics,
  preserved original V1 manifest bytes when every apply operation fails while
  retaining partial-success persistence, and corrected current-runtime docs for
  exact-alias adoption, per-entry fallback, and manual recovery.
- Verification: RED reproduced 10 intended failures across 85 tests; focused
  GREEN passed 86/86. The authoritative Phase 4 union passed live at 18 files /
  406 tests before and after commit. CLI lint, type-check, format, docs check,
  `pnpm check`, full `pnpm test`, and `git diff --check` passed. Root
  independently verified the exact ten-file boundary, clean worktree,
  whitespace, and the live 406-test union.
- A fresh exact-High reviewer will assess the complete Phase 4 range before
  Phase 5 starts.

### Review Round 4 — Final Bounded Cycle

- Artifact: `reviews/p04-review-2026-09-01T031017Z.md`
- Reviewed head: `54ef41a4a57d9f1222096013e0d0a03dd2e8bb2b`
- Verdict: changes requested; 1 Critical, 0 Important, 0 Medium, 0 Minor.
- Reconnaissance: attempted through one accepted consequential safety lane. The
  artifact contains complete orchestration evidence; its project-log entry
  remains deferred until the terminal Phase 4 outcome.
- The prior four findings are resolved. The one remaining correction must give
  deferred transition symlink/copy creates no-clobber semantics so an unmanaged
  file or directory appearing after absence revalidation survives, the child
  fails with actionable recovery, and manifest evidence cannot claim success.
- This consumes the final bounded p04 review-fix cycle under the configured
  retry limit. A fresh round-5 review must pass or return to operator governance;
  Phase 5 remains gated.

### Review Round 4 Fix

- Commit: `04a30164a1b9f0743b5ea83526a1a734f5afbbd0`
- Added explicit no-clobber IO for deferred collection-to-per-entry symlink and
  copy creates. User files or directories appearing after absence revalidation
  survive unchanged; the child reports actionable failure and manifest evidence
  cannot claim success. Ordinary non-transition behavior remains unchanged.
- Verification: RED reproduced all four symlink/copy by file/directory races;
  focused GREEN passed 58/58. The authoritative Phase 4 union passed live at 18
  files / 410 tests before and after commit. CLI lint, type-check, format,
  `pnpm check`, full `pnpm test`, and `git diff --check` passed. Root
  independently verified the exact three-file boundary, clean worktree,
  whitespace, and the live 410-test union.
- A terminal exact-High round-5 reviewer will assess the complete Phase 4
  range. Any blocking result returns to operator governance; Phase 5 remains
  gated until a pass.

### Review Round 5 — Terminal Governance Boundary

- Artifact: `reviews/p04-review-2026-09-01T033543Z.md`
- Reviewed head: `740e2a7ca90d16efd38f226db9840598ef634daf`
- Verdict: changes requested; 1 Critical, 0 Important, 0 Medium, 0 Minor.
- Reconnaissance: attempted through one accepted consequential safety lane;
  complete orchestration and primary reconciliation evidence is in the review
  artifact.
- All prior findings and whole-destination no-clobber cases are resolved. The
  remaining race is inside deferred directory copy: after reserving the entry
  root, ordinary recursive copy can overwrite a same-name unmanaged nested
  child created before that source child is written.
- The configured five-round p04 review budget is exhausted. No further automatic
  correction is authorized. Operator governance must either authorize one new
  bounded correction for complete-tree no-replace publication or revise the
  Phase 4 delivery boundary. Phase 5 remains gated.

### Operator Authorization — One Additional Phase 4 Safety Cycle

- Authorization: Thomas explicitly authorized one additional bounded Phase 4
  correction and re-review cycle on 2026-09-01.
- Scope: only the round-5 nested deferred-directory-copy collision. The fix
  must provide complete-tree no-clobber behavior, preserve any colliding
  unmanaged nested bytes/tree, return an actionable failed child, and record no
  manifest ownership for the failed projection. If that guarantee is not
  feasible, deferred directory-copy transitions must fail safely with manual
  recovery guidance.
- Governance: this is a one-use operator exception beyond the generic
  `oat_orchestration_retry_limit` schema maximum of five; it does not raise or
  reset that field and does not authorize another automatic cycle.
- Verification: the bounded fix must pass focused RED/GREEN coverage, the
  authoritative Phase 4 union, CLI checks, full repository tests, and exact
  diff/clean-worktree checks before one fresh independent High review.
- Boundary: Phase 5 remains gated. A passing review advances implementation; a
  blocking result returns to operator governance without another fix launch.

### Review Round 5 Operator-Authorized Fix

- Commit: `cb52e25d7b2e46f38ce801b59d44666d5c8ee2da`
- Continuation: `p04-review-r5-authorized-fix-20260901T192200Z`, linked to
  original request `dispatch-p04-20260901T002500Z-36af8aadd` and executed by
  the same exact High target `oat-phase-implementer-gpt-5-6-sol-high`.
- Made deferred directory publication no-clobber across the complete tree:
  nested directories are created exclusively and nested files are opened
  exclusively. A same-name unmanaged nested file or directory now survives
  unchanged, stops the child with actionable failure evidence, and produces no
  manifest ownership claim. Ordinary non-transition copy behavior is
  unchanged.
- Added deterministic post-root-creation hooks and covered nested file,
  directory, and complete deferred-transition collisions.
- Verification: RED reproduced three failures. Focused tests passed 61/61 and
  the authoritative Phase 4 union passed 18 files / 413 tests before and after
  commit. CLI lint, type-check, format, `pnpm check`, full `pnpm test`, and
  exact-range whitespace checks passed. The evidence-grade uncached Turbo run
  reported 0 cache hits and 4,868 CLI tests; smoke passed 140/140, skills
  586/586, and release 39 with one intentional skip. Root independently
  verified the exact one-commit/four-file boundary, clean worktree, whitespace,
  and live 413-test Phase 4 union.
- One fresh independent High review is now required. This consumes the one-use
  operator authorization; a blocking verdict returns to governance without
  another correction. Phase 5 remains gated.

### Review Round 6 — Operator Extension Exhausted

- Artifact: `reviews/p04-review-2026-09-01T193927Z.md`
- Reviewed head: `82f801ab880ad8b8272426726d3dace9b819fbef`
- Verdict: changes requested; 1 Critical, 0 Important, 0 Medium, 0 Minor.
- Reconnaissance: not attempted; the artifact correctly contains no Review
  Orchestration section.
- The operator-authorized fix closes same-name nested collisions. The reviewer
  independently reproduced a deeper path-ancestry race: after OAT creates the
  destination root or a nested directory, a concurrent replacement with a
  symlink can redirect subsequent pathname writes outside the managed root.
  The helper then reports success and can persist false manifest ownership.
- The safe disposition is to fail closed for deferred directory-copy
  transitions unless an identity-bound, non-following publication primitive is
  available. Regression coverage must swap both the just-created root and a
  nested directory, preserve external trees byte-for-byte, fail actionably,
  and record no ownership.
- This blocking review consumed the one-use operator extension. No additional
  correction or review is authorized. Phase 5 remains gated pending new
  operator direction or a revised Phase 4 delivery boundary.

### Operator Authorization — Fail-Closed Directory-Copy Transition

- Authorization: Thomas explicitly authorized the recommended bounded
  fail-closed correction and one fresh Phase 4 re-review on 2026-09-01.
- Scope: disable deferred directory-copy transitions on the current runtime
  rather than attempting path-based recursive publication. Return actionable
  manual-recovery guidance, preserve provider and external trees byte-for-byte,
  and record no per-entry ownership.
- Tests: deterministically replace both the just-created destination root and a
  just-created nested directory with external symlinks through the complete
  `executeSyncPlan` path. The transition must fail before any provider or
  external canonical write, preserve external bytes/tree, and persist no entry
  manifest claim.
- Compatibility: ordinary non-transition copy behavior and the already-safe
  deferred symlink path remain unchanged.
- Governance: this is one additional one-use operator exception. It does not
  raise or reset `oat_orchestration_retry_limit` and does not authorize a
  further correction if the fresh review blocks.
- Boundary: Phase 5 remains gated until the correction passes a fresh
  independent High review.

### Review Round 6 Operator-Authorized Fail-Closed Fix

- Commit: `567f9ae0a3d39d9986e517924551e6381058d27e`
- Continuation: `p04-review-r6-authorized-fail-closed-fix-20260901T204000Z`,
  linked to original request `dispatch-p04-20260901T002500Z-36af8aadd` and
  executed by the same exact High target
  `oat-phase-implementer-gpt-5-6-sol-high`.
- Deferred directory-copy transitions now fail before publication with
  actionable manual recovery. No destination or external canonical write is
  attempted and no manifest ownership is claimed. Deferred file copies,
  symlinks, and ordinary non-transition copies remain unchanged.
- Removed the unsafe path-based no-clobber directory helper and aligned the
  affected provider-sync docs. One mechanically required Phase 4 integration
  test was added to the boundary because it pinned the superseded automatic
  directory-copy success contract.
- Verification: RED deterministically reached both unsafe root and nested
  publication hooks (2/62 failures). Focused GREEN passed 60/60 and the
  authoritative Phase 4 union passed 18 files / 412 tests before and after
  commit. CLI lint, type-check, format, `pnpm check`, and full `pnpm test`
  passed. The evidence-grade isolated-HOME Turbo run executed 10/10 tasks with
  zero cache hits and 4,867 CLI tests. Root independently verified the exact
  one-commit/eight-file boundary, clean worktree, whitespace, behavior diff,
  and live 412-test union.
- One fresh independent High review is required. This consumes the one-use
  fail-closed authorization; a blocking verdict returns to governance without
  another correction. Phase 5 remains gated.

### Review Round 7 — Fail-Closed Extension Exhausted

- Artifact: `reviews/p04-review-2026-09-01T210000Z.md`
- Reviewed head: `dd1fed438344718d7f98642da93b7f65501b79ee`
- Verdict: changes requested; 1 Critical, 0 Important, 0 Medium, 0 Minor.
- Reconnaissance: not attempted; the artifact correctly contains no Review
  Orchestration section.
- The fail-closed guard works within one apply: neither unsafe publication hook
  is reachable, no destination/external write occurs, and no entry ownership is
  recorded. The apply persists collection detachment before the child fails,
  however. On the next unchanged sync, that missing collection evidence causes
  the planner to classify the same directory as an ordinary non-deferred copy
  and reach the path-based copier.
- The reviewer reproduced this with an actual two-run scan/plan/apply/manifest
  sequence. A durable block must preserve collection evidence when the deferred
  directory copy cannot run, or persist an explicit blocked-transition state
  that unchanged retries honor.
- This blocking review consumed the one-use fail-closed extension. No further
  correction or review is authorized. Phase 5 remains gated pending new
  operator direction or a revised Phase 4 delivery boundary.

### Review Round 7 Operator-Authorized Durable Transition Fix

- Commit: `91d3ca4fe5e721a435c845bd36f556478b8d3259`
- Continuation: `p04-review-r7-authorized-durable-fix-20260901T214700Z`,
  linked to original request `dispatch-p04-20260901T002500Z-36af8aadd` and
  executed by the same exact High target
  `oat-phase-implementer-gpt-5-6-sol-high`.
- Deferred directory-copy transitions now reject collection detachment before
  manifest persistence. The initial blocked run and an unchanged second run
  retain the same collection evidence, remain deferred, and fail before the
  ordinary directory copier.
- The two-run integration regression proves zero copier calls, no provider
  destination, byte-identical external content, no copy-entry ownership,
  unchanged manifest evidence, actionable structured recovery, and safe
  release after a configured symlink strategy change.
- Verification: RED exposed persisted detachment through the initial failure
  count. Focused GREEN passed 75/75 and the authoritative Phase 4 union passed
  18 files / 412 tests. CLI lint, type-check, format, `pnpm check`, and an
  isolated-HOME uncached Turbo run passed; the latter executed 10/10 tasks and
  4,867 CLI tests. Root independently verified the exact one-commit/three-file
  boundary, clean worktree, whitespace, implementation diff, and live focused
  75-test result.
- Exactly one fresh independent High review is now required. This consumes the
  operator authorization; a blocking verdict returns to governance without
  another correction. Phase 5 remains gated.

### Review Round 8 — Terminal Governance Boundary

- Artifact: `reviews/p04-review-2026-09-01T220158Z.md`
- Reviewed head: `86df6a8f5fc76fe30554d7ce6562067c3a5b58e0`
- Verdict: changes requested; 1 Critical, 0 Important, 0 Medium, 0 Minor.
- Reconnaissance: not attempted; the artifact correctly contains no Review
  Orchestration section.
- The round-7 repeated-copy defect is resolved. Both unchanged copy-transition
  attempts preserve collection evidence, remain deferred, and stop before the
  ordinary copier with no provider/external writes or entry ownership.
- The advertised strategy-change release is unsafe. After provider ancestry
  validation, `createSymlinkNoClobber` creates missing parents and the link by
  pathname. A race-swapped provider parent can therefore redirect the deferred
  symlink outside the managed root and still permit manifest ownership.
- The reviewer reproduced the production primitive escape after a successful
  ancestry check and reran the authoritative 18-file Phase 4 union at 412/412.
  Root confirmed the check/use gap directly in `execute-plan.ts` and `fs/io.ts`.
- This review consumes the single operator-authorized fresh review. No further
  automatic correction is authorized, and Phase 5 remains gated pending an
  explicit bounded fail-closed symlink correction or a revised Phase 4
  delivery boundary.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-08-31T05:21:04Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — subagents, authorized by the explicit implementation invocation
- Dispatch policy: managed High from project state
- Schedule: seven sequential phases; p01 attempted
- Outcome: `INVALID_RUN_ABORT`; phases passed 0, failed 0, stopped 1
- Outstanding: resolved by Thomas's explicit 2026-08-31 authorization to start
  a new p01 run from the corrected clean base

#### Dispatch record — `dispatch-p01-20260831T052104Z-99d6de317`

- Scope/action/role: `p01` / `implementation` / `implementer`
- Target: `oat-phase-implementer-gpt-5-6-sol-medium`
- Model/effort axes: `selected:gpt-5.6-sol` / `selected:medium`
- Selection: native catalog; floor `default-implementation` satisfied
- Candidates: `oat-phase-implementer-gpt-5-6-sol-medium`, `oat-phase-implementer-gpt-5-6-sol-high`
- Launch: accepted
- Child outcome: `INVALID_RUN_ABORT`
- Authority: Phase p01 artifact files only; no source writes
- Evidence: clean worktree; expected base did not resolve; actual HEAD was
  `99d6de317cb1c670b8a1bc92efc4a57300de74fd`
- Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-medium

### Run 2 — 2026-08-31T11:38:44Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — subagents, explicitly authorized corrected p01 relaunch
- Dispatch policy: managed High from project state
- Schedule: seven sequential phases; p01 completed and reviewed
- Outcome: p01 passed; phases passed 1, failed 0, stopped 0
- Outstanding: continue with `p02-t01`

#### Dispatch record — `dispatch-p01-relaunch-20260831T113844Z-f6d777210`

- Scope/action/role: `p01` / `implementation` / `implementer`
- Target: `oat-phase-implementer-gpt-5-6-sol-medium`
- Model/effort axes: `selected:gpt-5.6-sol` / `selected:medium`
- Launch: accepted as a new user-authorized run from exact clean base
  `f6d77721039086e5ce35f48549d91a98aeeb6612`
- Child outcome: `DONE`; task commit
  `940e87e5663bb6c36d8f7d7bfbb6db67d482b3e8`
- Verification: exact focused suite passed 360/360 tests; formatting and
  `git diff --check` passed; no production source or test edits
- Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-medium

#### Review record — `review-p01-20260831T115500Z-940e87e56`

- Scope/action/role: `p01` / `review` / `reviewer`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Model/effort axes: `selected:gpt-5.6-sol` / `selected:high`
- Reviewed head: `940e87e5663bb6c36d8f7d7bfbb6db67d482b3e8`
- Verdict: passed; findings critical 0, important 0, medium 0, minor 1
- Artifact: `reviews/p01-review-2026-08-31T115349Z.md`
- Reconnaissance: not attempted
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### Run 3 — 2026-08-31T12:02:00Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — subagents, continuing the authorized implementation run
- Dispatch policy: managed High from project state
- Schedule: p02 implemented sequentially; three governed review cycles
- Outcome: `BLOCKED`; 7/7 tasks complete, phase review not passed
- Verification: 29 files / 701 tests plus CLI lint, type-check, formatting,
  and whitespace checks pass at `9d557564faa2430001483ed823a07d2cc920a3c1`
- Recovery: 2/10 attempts used and settled; `pending_attempt: null`
- Review-fix rounds: 2/2 used
- Outstanding: explicit human disposition of the two Important round-3
  findings; do not start p03

#### Dispatch record — `dispatch-p02-20260831T120200Z-492af17f6`

- Scope/action/role: `p02` / `implementation` / `implementer`
- Target: `oat-phase-implementer-gpt-5-6-sol-medium`
- Model/effort axes: `selected:gpt-5.6-sol` / `selected:medium`
- Phase range: `492af17f6e7c96198883954ceedc85acc18b538d..9d557564faa2430001483ed823a07d2cc920a3c1`
- Child outcome: 7 tasks complete; two validated recovery events; two bounded
  review-fix commits; terminal phase status blocked by review cap
- Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-medium

#### Review records

- Round 1: `reviews/p02-review-2026-08-31T132646Z.md`, reviewed
  `23efb17c732c2a95fbe38eae2be4c48f78754932`, 2 critical / 2 important,
  findings fixed by `d959cb12caadf9587a271a3757f7d917a5b674bc`.
- Round 2: `reviews/p02-review-2026-08-31T142211Z.md`, reviewed
  `d959cb12caadf9587a271a3757f7d917a5b674bc`, 0 critical / 2 important,
  findings fixed by `9d557564faa2430001483ed823a07d2cc920a3c1`.
- Round 3: `reviews/p02-review-2026-08-31T144935Z.md`, reviewed
  `9d557564faa2430001483ed823a07d2cc920a3c1`, 0 critical / 2 important;
  terminal blocked verdict after the third governed cycle.
- All review rounds used `oat-reviewer-gpt-5-6-sol-high`, invocation `manual`,
  with reconnaissance not attempted.

### Run 4 — 2026-08-31T15:35:00Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — original accepted implementer continuation plus fresh reviewer
- Dispatch policy: managed High from project state
- Scope: exactly the two round-3 Important findings, authorized by Thomas
- Outcome: `BLOCKED`; correction completed, terminal review round 4 found one
  Important multi-pack/multi-scope recovery defect
- Verification: 29 files / 710 tests plus CLI lint, type-check, formatting,
  and whitespace checks pass at `e85ba38ae575e193a7084f1046798ca0827f6bef`
- Review-fix rounds: 3/3 used; no automatic fifth cycle is authorized
- Outstanding: explicit human disposition of
  `reviews/p02-review-2026-08-31T155718Z.md`; do not start p03

#### Fix continuation — `review-fix-p02-r03-20260831T153500Z`

- Original request: `dispatch-p02-20260831T120200Z-492af17f6`
- Target: `oat-phase-implementer-gpt-5-6-sol-medium`
- Commit: `e85ba38ae575e193a7084f1046798ca0827f6bef`
- Outcome: both round-3 findings fixed; focused 6 files / 168 tests and combined
  29 files / 710 tests passed
- Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-medium

#### Review record — round 4

- Target: `oat-reviewer-gpt-5-6-sol-high`
- Reviewed head: `e85ba38ae575e193a7084f1046798ca0827f6bef`
- Verdict: blocked; findings critical 0, important 1, medium 0, minor 0
- Artifact: `reviews/p02-review-2026-08-31T155718Z.md`
- Reconnaissance: attempted; orchestration evidence is recorded in the artifact
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### Run 5 — 2026-08-31T16:15:00Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — original accepted implementer continuation plus fresh reviewer
- Dispatch policy: managed High from project state
- Scope: exactly the round-4 multi-pack/multi-scope recovery finding
- Outcome: `BLOCKED`; correction completed, terminal review round 5 found one
  Important recovery-evidence wording contradiction
- Verification: 29 files / 714 tests plus CLI lint, type-check, formatting,
  and whitespace checks pass at `4e1cbac86f3f0bb5acefe446d8df8c81df3f025f`
- Review-fix rounds: 4/4 used; no automatic round 6 is authorized
- Outstanding: explicit human disposition of
  `reviews/p02-review-2026-08-31T164057Z.md`; do not start p03

#### Fix continuation — `review-fix-p02-r04-20260831T161500Z`

- Original request: `dispatch-p02-20260831T120200Z-492af17f6`
- Target: `oat-phase-implementer-gpt-5-6-sol-medium`
- Commit: `4e1cbac86f3f0bb5acefe446d8df8c81df3f025f`
- Outcome: every selected pack now receives exact recovery for every
  invalidated project/user scope; focused 3 files / 41 tests and combined 29
  files / 714 tests passed
- Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-medium

#### Review record — round 5

- Target: `oat-reviewer-gpt-5-6-sol-high`
- Reviewed head: `4e1cbac86f3f0bb5acefe446d8df8c81df3f025f`
- Verdict: blocked; findings critical 0, important 1, medium 0, minor 0
- Artifact: `reviews/p02-review-2026-08-31T164057Z.md`
- Reconnaissance: attempted; orchestration evidence is recorded in the artifact
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### Run 6 — 2026-08-31T17:00:00Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — original accepted implementer continuation plus fresh reviewer
- Dispatch policy: managed High from project state
- Scope: exactly the round-5 recovery-prose contradiction
- Outcome: p02 passed; correction completed and final independent review found
  zero findings at every severity
- Verification: 29 files / 714 tests plus CLI lint, type-check, formatting,
  and whitespace checks pass at `eb218a7a2463e580e1ddb8c0bed5b9998d25e0ab`
- Review-fix rounds: 5/5 used; final disposition passed
- Outstanding: none for p02; continue with `p03-t01`

#### Fix continuation — `review-fix-p02-r05-20260831T170000Z`

- Original request: `dispatch-p02-20260831T120200Z-492af17f6`
- Target: `oat-phase-implementer-gpt-5-6-sol-medium`
- Commit: `eb218a7a2463e580e1ddb8c0bed5b9998d25e0ab`
- Outcome: recovery prose now matches canonical status and complete ordered
  human/JSON records are asserted; focused 3 files / 41 tests and combined 29
  files / 714 tests passed
- Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-medium

#### Review record — round 6

- Target: `oat-reviewer-gpt-5-6-sol-high`
- Reviewed head: `eb218a7a2463e580e1ddb8c0bed5b9998d25e0ab`
- Verdict: passed; findings critical 0, important 0, medium 0, minor 0
- Artifact: `reviews/p02-review-2026-08-31T170932Z.md`
- Reconnaissance: not attempted
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### Run 7 — 2026-08-31T17:15:00Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — exact-target phase implementer
- Dispatch policy: managed High from project state
- Scope: p03 implementation, five sequential tasks
- Outcome: 5/5 planned tasks committed; bounded automatic recovery completed
  for one stale full-suite integration assertion
- Verification: Phase 3 union 19 files / 470 tests, CLI lint, type-check,
  formatting, `pnpm check`, and whitespace checks pass at `90a4c7a3e`; full
  `pnpm test` and its focused reproduction fail one stale assertion
- Recovery: attempt 1/10 completed by `646b98092`; exact accepted target retained
- Outstanding: run p03 review

#### Dispatch record — `dispatch-p03-20260831T171500Z-e3512dcbc`

- Scope/action/role: `p03` / `implementation` / `implementer`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Model/effort axes: `selected:gpt-5.6-sol` / `selected:high`
- Phase range: `e3512dcbcfb54ea7e999ac9242291eed9f47bbac..90a4c7a3e7d022813e97b972c4ec5c00044f54f7`
- Child outcome: five ordered task commits; one pre-attempt direction-required
  event followed by one validated recovery; clean worktree
- Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Recovery continuation — `p03-recovery-20260831T181500Z`

- Original request: `dispatch-p03-20260831T171500Z-e3512dcbc`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `646b9809271b73243e9b001006aa57cb5494a7a8`
- Outcome: aligned the single stale Claude user-agent integration expectation;
  focused 23/23, expanded phase 493/493, and full repository tests passed
- Dispatch: scope=p03 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review record — round 1

- Target: `oat-reviewer-gpt-5-6-sol-high`
- Reviewed head: `810f0788d6034b12997e2154f14ac50dce8623df`
- Verdict: changes requested; findings critical 0, important 3, medium 1,
  minor 0
- Artifact: `reviews/p03-review-2026-08-31T184315Z.md`
- Reconnaissance: not attempted
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Review-fix continuation — round 1

- Original request: `dispatch-p03-20260831T171500Z-e3512dcbc`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `11a35ce90994848ddbe4a3ed2e4f0739b40a1233`
- Outcome: all three Important and one Medium findings corrected; focused 218,
  expanded phase 498, and full repository tests passed
- Dispatch: scope=p03 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review record — round 2

- Target: `oat-reviewer-gpt-5-6-sol-high`
- Reviewed head: `2132804175242aa706791c03e12577a87f849ad4`
- Verdict: changes requested; findings critical 0, important 1, medium 1,
  minor 2
- Artifact: `reviews/p03-review-2026-08-31T193945Z.md`
- Reconnaissance: attempted; complete orchestration evidence is in the artifact
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Review-fix continuation — round 2

- Original request: `dispatch-p03-20260831T171500Z-e3512dcbc`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `c8ff68a82f9fd8beef352bd45da7a429ff5c2d11`
- Outcome: all one Important, one Medium, and two Minor findings corrected;
  focused 128, expanded phase 501, and full repository tests passed
- Dispatch: scope=p03 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review record — round 3

- Target: `oat-reviewer-gpt-5-6-sol-high`
- Reviewed head: `d7762061f9db31db06160a1b87eeca08981dd39a`
- Verdict: changes requested; findings critical 0, important 2, medium 0,
  minor 0
- Artifact: `reviews/p03-review-2026-08-31T202630Z.md`
- Reconnaissance: attempted; complete orchestration evidence is in the artifact
- Outcome: terminal governance boundary after the third p03 review cycle;
  operator disposition required before any fourth cycle
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Review-fix continuation — round 5

- Original request: `dispatch-p03-20260831T171500Z-e3512dcbc`
- Continuation: `p03-review-r5-fix-20260831T235717Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `5f3bc57a0e785224ff25fad007cf0a7ee1c0d118`
- Outcome: config-only provider changes now receive deduplicated conservative
  new-session advice, and registry refresh-policy precedence/provenance is
  validated; focused 326, expanded p03 518, and full repository tests passed.
- Selection reason: `native-catalog`; candidates considered:
  `gpt-5.6-sol/high`.
- Dispatch: scope=p03-review-r5-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review record — round 6

- Target: `oat-reviewer-gpt-5-6-sol-high`
- Reviewed head: `f50e007d7eac0de9c0bf2eec32c1ee9e8443817b`
- Verdict: passed; findings critical 0, important 0, medium 0, minor 0
- Artifact: `reviews/p03-review-2026-09-01T002159Z.md`
- Reconnaissance: not attempted
- Selection reason: `native-catalog`; candidates considered:
  `gpt-5.6-sol/high`.
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### Run 8 — 2026-09-01T00:25:00Z

- Branch: `tool-pack-scope-provider-truthfulness`
- Tier: Tier 1 — exact-target phase implementer
- Dispatch policy: managed High from project state
- Scope: p04 implementation, five sequential tasks
- Outcome: 5/5 planned tasks committed; one bounded composition recovery
  completed under attempt 1/10
- Verification: phase 368/368, live CLI 4,823/4,823, full repository tests,
  CLI lint/type/format, `pnpm check`, and whitespace checks pass
- Outstanding: independent root-owned p04 review

#### Dispatch record — `dispatch-p04-20260901T002500Z-36af8aadd`

- Scope/action/role: `p04` / `implementation` / `implementer`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Model/effort axes: `selected:gpt-5.6-sol` / `selected:high`
- Task class/floor: `consequential` / satisfied
- Selection reason: `native-catalog`; candidates considered:
  `gpt-5.6-sol/high`
- Phase range:
  `36af8aadd24dd4b9ec3d9dd74b1090d2809872cc..7be0d56dfe69791982fae373882c3d96dac981eb`
- Child outcome: five ordered task commits, one validated recovery, clean
  worktree
- Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Recovery continuation — `p04-recovery-20260901T010500Z`

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `7be0d56dfe69791982fae373882c3d96dac981eb`
- Outcome: restricted collection aliases to registry-supported skill mappings;
  focused 66, phase 368, and full repository tests passed
- Dispatch: scope=p04 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review-fix continuation — round 1

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Continuation: `p04-review-r1-fix-20260901T013500Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `85cddb881240eba9fe88cee8f1d18b4ecec07dff`
- Outcome: all five review findings closed; focused 195/195 and authoritative
  Phase 4 union 388/388 passed with clean exact-file and whitespace checks.
- Dispatch: scope=p04-review-r1-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review round 2

- Reviewed head: `d50d2d6c642c347114a1c2de5eb9502496328ffb`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Artifact: `reviews/p04-review-2026-09-01T020351Z.md`
- Outcome: changes requested; 2 Critical and 2 Important findings. Phase 5
  remains gated while the same exact-High implementer owns the bounded fix.
- Reconnaissance: attempted; complete nested dispatch and reconciliation
  evidence is preserved in the review artifact.
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Review-fix continuation — round 2

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Continuation: `p04-review-r2-fix-20260901T021000Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `0dc79b64b9733cf387d969fa9721c59d78fc1515`
- Outcome: all four review findings closed; focused 82/82 and authoritative
  Phase 4 union 402/402 passed with exact nine-file and whitespace checks.
- Dispatch: scope=p04-review-r2-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review round 3

- Reviewed head: `6da49610627aae9f3eb78879906239ac5a86fa48`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Artifact: `reviews/p04-review-2026-09-01T023939Z.md`
- Outcome: changes requested; 1 Critical, 1 Important, and 2 Medium findings.
  Phase 5 remains gated while the same exact-High implementer owns the bounded
  fix.
- Reconnaissance: attempted; complete nested dispatch and reconciliation
  evidence is preserved in the review artifact.
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Review-fix continuation — round 3

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Continuation: `p04-review-r3-fix-20260901T024500Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `996376f443e968784365ef2f1150834173de9da7`
- Outcome: all four review findings closed; focused 86/86 and authoritative
  Phase 4 union 406/406 passed with exact ten-file and whitespace checks.
- Dispatch: scope=p04-review-r3-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review round 4 — final bounded cycle

- Reviewed head: `54ef41a4a57d9f1222096013e0d0a03dd2e8bb2b`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Artifact: `reviews/p04-review-2026-09-01T031017Z.md`
- Outcome: changes requested; 1 Critical finding. All round-3 findings are
  resolved; Phase 5 remains gated for the final bounded p04 correction/review.
- Reconnaissance: attempted; complete nested dispatch and reconciliation
  evidence is preserved in the review artifact.
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Review-fix continuation — round 4

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Continuation: `p04-review-r4-fix-20260901T031500Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `04a30164a1b9f0743b5ea83526a1a734f5afbbd0`
- Outcome: the final Critical finding is closed; focused 58/58 and authoritative
  Phase 4 union 410/410 passed with exact three-file and whitespace checks.
- Dispatch: scope=p04-review-r4-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review round 5 — terminal governance boundary

- Reviewed head: `740e2a7ca90d16efd38f226db9840598ef634daf`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Artifact: `reviews/p04-review-2026-09-01T033543Z.md`
- Outcome: changes requested; 1 Critical finding. The five-round review budget
  is exhausted, operator governance is required, and Phase 5 remains gated.
- Reconnaissance: attempted; complete nested dispatch and primary
  reconciliation evidence is preserved in the review artifact.
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Operator-authorized review-fix continuation — round 5

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Continuation: `p04-review-r5-authorized-fix-20260901T192200Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `cb52e25d7b2e46f38ce801b59d44666d5c8ee2da`
- Outcome: same-name nested file and directory collisions are preserved and
  fail without ownership. Focused 61/61, authoritative Phase 4 union 413/413,
  full uncached Turbo, smoke, skill, release, and repository checks passed.
- Dispatch: scope=p04-review-r5-authorized-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review round 6 — operator extension exhausted

- Reviewed head: `82f801ab880ad8b8272426726d3dace9b819fbef`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Artifact: `reviews/p04-review-2026-09-01T193927Z.md`
- Outcome: changes requested; 1 Critical destination-ancestry symlink-swap
  finding. The one-use extension is exhausted, operator governance is required,
  and Phase 5 remains gated.
- Reconnaissance: not attempted; no nested orchestration evidence is required.
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Operator-authorized fail-closed continuation — round 6

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Continuation: `p04-review-r6-authorized-fail-closed-fix-20260901T204000Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Commit: `567f9ae0a3d39d9986e517924551e6381058d27e`
- Outcome: deferred directory-copy transitions fail before publication with
  manual recovery and no ownership. Focused 60/60, authoritative Phase 4 union
  412/412, uncached Turbo, full repository, and whitespace checks passed.
- Dispatch: scope=p04-review-r6-authorized-fail-closed-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review round 7 — fail-closed extension exhausted

- Reviewed head: `dd1fed438344718d7f98642da93b7f65501b79ee`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Artifact: `reviews/p04-review-2026-09-01T210000Z.md`
- Outcome: changes requested; 1 Critical repeated-sync state-transition
  finding. The one-use extension is exhausted, operator governance is required,
  and Phase 5 remains gated.
- Reconnaissance: not attempted; no nested orchestration evidence is required.
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

#### Operator authorization — durable repeated-sync block

- Authorization: Thomas authorized one bounded Phase 4 correction and one
  fresh independent review on 2026-09-01.
- Correction scope: preserve collection transition evidence when a deferred
  directory copy cannot safely publish. The first blocked apply must not
  commit detachment that causes an unchanged retry to degrade into ordinary
  path-based directory copy.
- Required two-run behavior: both the initial apply and an unchanged retry
  remain blocked before every publication helper; provider and external trees
  remain untouched; no entry ownership is created; durable collection/block
  evidence and actionable human/JSON recovery remain available.
- Release conditions: only a safe strategy change or explicit external
  ownership disposition may release the blocked transition.
- Governance: reuse the original p04 implementer at the exact
  `oat-phase-implementer-gpt-5-6-sol-high` target. After the bounded fix, run
  exactly one fresh `oat-reviewer-gpt-5-6-sol-high` review. This authorization
  does not imply another correction cycle if that review blocks, and Phase 5
  remains gated until Phase 4 passes.

#### Review-fix continuation — round 7 authorized durable transition

- Original request: `dispatch-p04-20260901T002500Z-36af8aadd`
- Continuation: `p04-review-r7-authorized-durable-fix-20260901T214700Z`
- Target: `oat-phase-implementer-gpt-5-6-sol-high`
- Base: `25c1b7f6fa460e588b4dd578cf8a826d121de38f`
- Commit: `91d3ca4fe5e721a435c845bd36f556478b8d3259`
- Outcome: collection evidence survives blocked directory-copy transitions
  and unchanged retries remain deferred with zero copier calls. Focused 75/75,
  authoritative Phase 4 union 412/412, uncached Turbo 10/10 tasks and 4,867
  CLI tests, CLI lint/type/format, `pnpm check`, and whitespace checks passed.
- Selection reason: `native-catalog`; candidates considered:
  `gpt-5.6-sol/high`.
- Dispatch: scope=p04-review-r7-authorized-durable-fix action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

#### Review round 8 — terminal governance boundary

- Reviewed head: `86df6a8f5fc76fe30554d7ce6562067c3a5b58e0`
- Target: `oat-reviewer-gpt-5-6-sol-high`
- Artifact: `reviews/p04-review-2026-09-01T220158Z.md`
- Outcome: changes requested; 1 Critical deferred-symlink ancestry race. The
  one-use correction/review authorization is exhausted, operator governance is
  required, and Phase 5 remains gated.
- Reconnaissance: not attempted; the artifact contains no Review Orchestration
  section.
- Selection reason: `gate-target`; candidates considered:
  `gpt-5.6-sol/high`.
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-08-31

**Session Start:** 05:21 UTC

- [ ] p01-t01: Land, rebase, and record the diagnostics predecessor - relaunched with explicit operator authorization

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- Invalid p01 run from an incorrect expanded base SHA; no work was performed - resolved by explicit operator relaunch authorization

**Session End:** {time}

---

### 2026-08-31

**Session Start:** 11:38 UTC

- [x] p01-t01: Land, rebase, and record the diagnostics predecessor

**What changed (high level):**

- Recorded accepted PR #249 merge SHA
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` and its exact current-main
  inventory, attribution, availability, and renderer seams.
- Replaced stale active-run and pending-SHA language in the design, plan, and
  specification without changing requirements, architecture, task IDs, or
  source boundaries.

**Decisions:**

- Preserve PR #249's caller-resolved materialization boolean and batch
  shared-owner projector as predecessor inputs; the planned provider registry
  will enrich rather than replace those contracts.
- Keep status inventory availability distinct from unavailable scopes and
  preserve doctor's existing check-based warning model.

**Follow-ups / TODO:**

- Phase p02 begins with `p02-t01` against the recorded current-main seams.

**Blockers:**

- None. The first focused run found a stale built asset bundle (`0.2.49`
  assets with CLI `0.2.50`); rebuilding `@open-agent-toolkit/cli` refreshed the
  ignored generated bundle, and the no-edit rerun passed all 360 tests.

**Session End:** 11:46 UTC

---

### 2026-08-31

**Session Start:** 12:02 UTC

- [x] p02-t01 through p02-t07 implemented
- [x] Two phase recovery events validated and settled
- [x] Two review-fix rounds completed
- [ ] p02 phase review pass

**What changed (high level):**

- Introduced truthful pack evidence, provider registry/context, additive scope
  and lifecycle outcomes, realized-placement installs, normalized diagnostics,
  and lifecycle evidence for update/removal.
- Preserved legacy JSON siblings, project config subtrees, predecessor
  inventory/fault-tolerance behavior, and recovery ledger monotonicity.

**Decisions:**

- Authorized `packages/cli/src/commands/tools/update/config-write.test.ts` as a
  mechanically derived test-only boundary expansion after the round-1 review;
  no production scope widened.
- Stopped before p03 when the third p02 review cycle retained two Important
  findings; passing tests do not override the review governance cap.

**Follow-ups / TODO:**

- Obtain explicit human disposition for the two terminal p02 findings.

**Blockers:**

- Interactive init/sync can create a second provider detection snapshot within
  one scope observation.
- Post-removal intent or final-inventory failure can escape structured
  lifecycle output after canonical deletion.

**Session End:** 14:53 UTC

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact  | Planned / Documented                     | Actual / Accepted                                                                                                                                                       | Reason                                  | Source of Truth        | Follow-up                         |
| ------------- | ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------- | --------------------------------- |
| p01-t01       | design/spec/plan | predecessor active; accepted SHA pending | PR #249 accepted at `2c6005d64f45a19e8b9eedbc977959b066d3eda0`; landed boolean materialization input, batch shared-owner attribution, and structured availability seams | predecessor landed before source work   | PR #249 / current main | none                              |
| p02 review r1 | plan file union  | update tests named by p02-t07 only       | Added adjacent `commands/tools/update/config-write.test.ts` zero-request/zero-write regression                                                                          | Mechanically derived stale fixture      | Round-1 review finding | recorded; no production expansion |
| p03 recovery  | plan file union  | p03-t01 named scanner/planner/sync tests | Added adjacent `commands/commands.integration.test.ts` to correct one stale pre-capability Claude user-agent expectation                                                | Mechanically derived full-suite fixture | p03-t01 behavior       | recovery attempt 1/10 reserved    |
| p03 review r2 | plan file union  | p03-t04 named command source/tests only  | Added adjacent `apps/oat-docs/docs/provider-sync/commands.md` to correct the provider command reference and scope discoverability                                       | Mechanically derived docs reference     | Round-2 review finding | recorded; no production expansion |
| p03 review r2 | plan file union  | provider help source changed             | Added adjacent `packages/cli/src/commands/help-snapshots.test.ts` for the two mechanically stale provider-set inline snapshots                                          | Mechanically derived snapshot fixture   | Full test gate         | recorded; no production expansion |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                        | Passed | Failed | Coverage      |
| ----- | ------------------------------------------------ | ------ | ------ | ------------- |
| 1     | Focused p01 Vitest suite after CLI asset rebuild | 360    | 0      | 11 test files |
| 2     | Combined p02 suite at terminal reviewed head     | 701    | 0      | 29 test files |

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
