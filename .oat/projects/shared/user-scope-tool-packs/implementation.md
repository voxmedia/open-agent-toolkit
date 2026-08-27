---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_current_task_id: null
oat_generated: false
---

# Implementation: user-scope-tool-packs

**Started:** 2026-08-27
**Last Updated:** 2026-08-27

> This document is the durable implementation and orchestration ledger.
> `oat_current_task_id` points to the next planned task.

## Progress Overview

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 7     | 7/7       |
| Phase 2 | completed | 9     | 9/9       |
| Phase 3 | completed | 5     | 5/5       |
| Phase 4 | completed | 7     | 7/7       |
| Phase 5 | completed | 6     | 6/6       |

**Total:** 34/34 tasks completed

## Phase 1: Canonical Pack Contract and Inventory

**Status:** completed
**Started:** 2026-08-27
**Completed:** 2026-08-27

### Phase Summary

**Outcome:**

- Added the canonical pack manifest, derived compatibility exports, scoped
  intent storage, content digests, complete inventory, and managed-root path
  validation in seven task-scoped commits.
- The root-owned review found two Critical and two Important issues requiring a
  bounded fix iteration before Phase 1 can pass.

**Verification:**

- Phase suite: 22 files and 238 tests passed.
- `pnpm check` and `pnpm type-check` passed.
- `pnpm test` reproduced 12 failures across seven CLI test files; the blocking
  review classifies four underlying defects/compatibility gaps for fix iteration
  1.

**Notes / Decisions:**

- Phase execution is delegated as one bounded phase to the exact resolver-selected implementer.
- Phase review artifact:
  `reviews/p01-review-2026-08-27T031035Z.md` (2 Critical, 2 Important,
  1 Medium). Fix iteration 1 completed in
  `eeda0085b00cf508eec3e4b288bd4069477b84ec`.
- Re-review artifact:
  `reviews/p01-review-2026-08-27T035112Z.md` (1 Critical, 1 Important,
  2 Medium). Final configured fix iteration 2 completed in
  `309cb7f9ac3d44513dc9836a14f738786dc01772`; re-review is pending.
- Deferred non-blocking Medium findings:
  - dual declared intent with no physical files is misreported as duplicate
    canonical assets;
  - source/generation materialization lacks a complete shared forward-contract
    check and partial seed repair.
- Final re-review artifact:
  `reviews/p01-review-2026-08-27T041427Z.md` (1 Critical, 0 Important,
  2 Medium). The Critical managed-root containment finding remains after two
  fix iterations.
- Operator authorization: up to two additional Phase 1 review/fix iterations,
  raising the temporary total from 2 to 4 and explicitly overriding the
  three-review governance cap for this scope. Restore the default limit to 2
  after Phase 1 reaches a terminal verdict.
- Fix iteration 3 completed the containment repair in
  `752aaab7d99bdf24655a2b736d437ddb0ba022a0`. Manifest-driven removal now
  validates all selected targets before any mutation; the focused containment
  regression and removal suites pass. Fresh independent re-review is pending.
- Passing re-review artifact:
  `reviews/p01-review-2026-08-27T050410Z.md` (0 Critical, 0 Important,
  2 Medium). Phase 1 passes at the configured blocking threshold; the two
  existing Medium findings remain deferred and nonblocking.

### Task p01-t01: Define pack manifest types and validation

**Status:** completed
**Commit:** `5ec861813c672311295532f72178b079c6b5bbc1`

### Task p01-t02: Populate every pack asset and derive legacy exports

**Status:** completed
**Commit:** `6a5ef4cafcbea05bbc92ae89ae6c8445738086c3`

### Task p01-t03: Add deterministic file and directory comparison

**Status:** completed
**Commit:** `2bb2170b2cdfbe90a633cbe5d11c86ee11d334e6`

### Task p01-t04: Add scoped project and user intent storage

**Status:** completed
**Commit:** `1c4832477b19123d6629f227646425bb8c47f9aa`

### Task p01-t05: Preserve legacy installs and derived false compatibility

**Status:** completed
**Commit:** `3d1eb3de2b659863079d29cd212ace7dae71f1d9`

### Task p01-t06: Implement complete per-scope pack inventory

**Status:** completed
**Commit:** `1fd6927a64f080d3951a9e9da8e140c19e0aa447`

### Task p01-t07: Harden managed-root path validation

**Status:** completed
**Commit:** `e0039d8065b4b8eb5ed45fb42d5c1382132c3104`
**Fix commit:** `752aaab7d99bdf24655a2b736d437ddb0ba022a0`

## Phase 2: Unified Pack Lifecycle Commands

**Status:** completed
**Started:** 2026-08-27
**Completed:** 2026-08-27

### Phase Summary

**Outcome:**

- Added deterministic reconcile planning/apply modules, manifest-driven
  installation and command inventory, complete has/outdated/update/remove
  semantics, and canonical provider-view removal sync in nine task commits.
- Implementation self-review and root search found a potentially Important
  concern: `planPackReconcile()` and `applyPackReconcilePlan()` have no
  production callers outside their defining modules. Independent review must
  determine whether Phase 2 actually satisfies the single-reconcile-surface
  requirement.
- Independent review artifact:
  `reviews/p02-review-2026-08-27T055129Z.md` (5 Critical, 2 Important,
  1 Medium). Fix iteration 1/2 must integrate production reconciliation and
  close the install, update, scope, inventory, and diagnostic defects.
- Fix iteration 1 completed in
  `5c9e194746e1cc55d23a8ef0bad4a4335c136d9e`. Production aggregate install
  and update now route through the canonical lifecycle adapter; all seven
  blocking findings have focused regression coverage. Fresh re-review is
  pending.
- Re-review artifact:
  `reviews/p02-review-2026-08-27T063435Z.md` (2 Critical, 1 Important,
  1 Medium). Final configured fix iteration 2/2 must correct default no-Git
  post-hook routing, executable-mode idempotence, shared-owner update
  eligibility, and stale returned intent evidence.
- Final configured fix iteration 2 completed in
  `eaf378802c8616992079c2026b92d77eb543317d`. All four findings have bounded
  regression coverage; 578 Phase 2 tests and 3,724 CLI tests pass. Decisive
  fresh re-review is pending.
- Passing decisive re-review artifact:
  `reviews/p02-review-2026-08-27T070524Z.md` (0 Critical, 0 Important,
  0 Medium, 0 Minor). Phase 2 passes without a retry extension.

**Verification:**

- Phase 2 suite passed 56 files / 554 tests.
- Full CLI passed 281 files / 3,700 tests; CLI type-check, lint, format, and
  `git diff --check` passed.
- `pnpm test` passed. Recovery usage is 2/10 with no pending attempt.

### Task p02-t01: Build pure reconcile plans

**Status:** completed
**Commit:** `a2100aae2`

### Task p02-t02: Apply and verify reconcile plans

**Status:** completed
**Commit:** `9dc413cb0`

### Task p02-t03: Route fresh and aggregate installs through the manifest

**Status:** completed
**Commit:** `0b9415546476b26e450a52484aad147dfe8741d9`
**Recovery commit:** `303dd6c75a78da9144ae488d58aa31c0d741d17f`

### Task p02-t04: Unify direct pack installers

**Status:** completed
**Commit:** `b72b91676`

### Task p02-t05: Report complete pack list and info state

**Status:** completed
**Commit:** `282e2c7e0`

### Task p02-t06: Tighten has and outdated semantics

**Status:** completed
**Commit:** `9bc28f6f5`

### Task p02-t07: Reconcile evolving pack updates

**Status:** completed
**Commit:** `9a938a288`

### Task p02-t08: Remove complete managed packs and scoped intent

**Status:** completed
**Commit:** `382f13c70`
**Recovery commit:** `95a692812238255c5aba2e25c23aa8ee4560d3e2`

### Task p02-t09: Add canonical removal sync

**Status:** completed
**Commit:** `c6bd82c71`

### Phase 2 Plan Adjustment

- `p02-t09` now includes
  `packages/cli/src/commands/tools/remove/index.ts`. The task already requires
  wiring removal adapters to canonical-path sync, and this is the sole adapter
  that owns both the removal result and the `autoSync()` invocation.

## Phase 3: Verified Scope Migration

**Status:** completed
**Started:** 2026-08-27
**Completed:** 2026-08-27

### Phase Summary

**Outcome:**

- Added preview-first, verified user/project pack migration in five task commits,
  with destination re-inventory before any source mutation and explicit source
  removal confirmation.
- Recovery attempt 1/10 corrected retained-preview classification for
  user-managed source templates; the attempt is reconciled with no pending
  marker.

**Verification:**

- Phase suite: 4 files and 43 tests passed; root independently repeated it.
- Full CLI suite: 287 files and 3,749 tests passed.
- `pnpm test`, `pnpm type-check`, `pnpm lint`, `pnpm format`, and
  `git diff --check` passed; the worktree was clean.

**Review concern:**

- Independent review must verify whether migration source removal preserves a
  shared asset when another pack remains intended at that source scope. The
  migration path delegates directly to generic remove reconciliation, while the
  established remove command has explicit shared-owner retention behavior.

**Independent review:**

- `reviews/p03-review-2026-08-27T074154Z.md` found 2 Critical, 2 Important,
  1 Medium, and 0 Minor findings. The review confirmed the shared-owner defect
  and also requires convergent provider-sync recovery, inspectable conflict and
  removal previews, legacy-false destination adoption, and manifest-derived
  pack-name validation.
- All five findings are accepted for bounded fix iteration 1/2; none are
  deferred.
- Fix iteration 1 completed all five dispositions in
  `6b0a7fe542f41f2a20143b0f3194242cf63ef770`. Shared-owner retention now lives
  in common reconcile planning; provider-sync failures have convergent typed
  recovery; previews expose concrete entries and blocked conflicts; explicit
  migration adopts physically complete legacy-false destinations; and migrate
  validation derives from the manifest.
- The implementer passed 70 focused tests, 53 Phase 3 tests, 3,760 CLI tests,
  workspace tests, type-check, lint, format, and diff check. Root independently
  repeated the load-bearing shared/removal/migration suites: 6 files and 67
  tests passed.
- Fresh re-review `reviews/p03-review-2026-08-27T081809Z.md` closed three
  original findings and reduced the remaining set to 0 Critical, 1 Important,
  1 Medium, and 0 Minor. Final configured fix iteration 2/2 will preserve the
  resolved project `--cwd` in recovery commands and make blocked preview
  categories mutually exclusive.
- Final fix iteration 2 completed both remaining dispositions in
  `b0a6bc16e5efa5cb22cac853d8a45c2f8358e8f1`. Typed recovery state and safely
  quoted commands preserve the resolved project root, real out-of-repository
  recovery executions converge, and conflicting assets no longer appear as
  additions.
- The implementer passed 133 review-focused tests, 55 Phase 3 tests, 3,762 CLI
  tests, workspace tests, type-check, lint, format, and diff check. Root
  independently repeated the 133-test review boundary.
- Decisive re-review `reviews/p03-review-2026-08-27T083913Z.md` closed the
  recovery-context finding but found one remaining Medium planner/JSON contract
  inconsistency: a blocked conflict is absent from preview additions but remains
  inside the serialized executable destination plan. Runtime execution remains
  blocked, but Phase 3 does not pass at the configured standard.
- Both configured fix iterations are exhausted. A third source fix requires
  explicit operator authorization, or the operator may explicitly defer this
  Medium finding.
- The operator authorized one additional bounded Phase 3 fix/re-review
  iteration. The temporary limit is 3 for this phase and must return to the
  default 2 after Phase 3 reaches a terminal verdict.
- Authorized fix iteration 3 completed the remaining disposition in
  `38233ba2e997f3e18ad2fa3ebc888cab95131688`. Blocked migration plans now
  prune every conflict operation and corresponding canonical changed path, and
  the adapter coverage serializes a real blocked planner result.
- The implementer passed 36 fix-focused tests, 133 regression tests, 55 Phase 3
  tests, 3,762 CLI tests, workspace tests, type-check, lint, format, and diff
  check. Root independently repeated the 36-test decisive boundary.
- Decisive re-review `reviews/p03-review-2026-08-27T125029Z.md` found no
  findings at any severity. Phase 3 passes, and its temporary retry limit is
  restored from 3 to the project default 2.

### Task p03-t01: Define migration plans and result state

**Status:** completed
**Commit:** `32d440898`

### Task p03-t02: Install and verify migration destination

**Status:** completed
**Commit:** `bc7d9d937`

### Task p03-t03: Gate source removal and recovery

**Status:** completed
**Commit:** `b8c0a081d`

### Task p03-t04: Add the tools migrate CLI

**Status:** completed
**Commit:** `c49d2f228`

### Task p03-t05: Exercise migration end to end

**Status:** completed
**Commit:** `7a4c1ab45`
**Recovery commit:** `3e2421bce1286dd61852e8e15d87cff1c8c82b5d`

## Phase 4: PJM Ownership and Portable Resources

**Status:** completed
**Started:** 2026-08-27
**Completed:** 2026-08-27

### Phase Summary

**Outcome:**

- Made PJM capability user-owned while keeping repository adoption explicit and
  fail-closed, across seven task commits from `4790cbd3b` to `0c189eb5b`.
- Added durable `resolvePjmAdoption()` state, guarded every non-migration PJM
  write behind adoption, introduced repository→user→bundle template precedence,
  completed the user-scope project-management installation, and made all
  referenced static skill resources resolve from their installed scope.
- Recovery attempt 1/10 corrected a stale bundle-contract version assertion; the
  attempt is reconciled with no pending marker.

**Verification:**

- Phase suite: 37 files and 395 tests passed after every recovery commit.
- Full CLI suite: 289 files and 3,787 tests passed at committed HEAD
  `bed357bab`.
- `pnpm check`, `pnpm type-check`, `pnpm lint`, `pnpm format`,
  `pnpm run check:skill-bumps`, and `git diff --check` passed.
- Commit range `29fbb4e55..bed357bab` is linear and append-only; each planned
  task is exactly one commit in plan order touching only its declared files.
- The worktree was clean at validation.

**Plan divergence (recorded):**

- The plan's declared Phase 4 Verification command scopes only
  `src/commands/pjm`, `src/commands/backlog`, `src/commands/decision`,
  `src/commands/init/tools/project-management`, and
  `src/commands/init/tools/shared`. Phase 4 edits eight bundled skills, whose
  HEAD-pinned assertions live in `src/validation/`, which that command cannot
  reach. The declared command therefore reported a passing phase while three
  real failures remained.
- Source of truth: the implementation. Phase 4 was verified against the full
  CLI suite plus the workspace gates rather than the narrower declared command.
- Follow-up: `p05-t06` already runs the complete repository gate sequence, so
  no plan edit is required for correctness. The narrow phase command is recorded
  here as the cause of recovery attempts 2/10 and 3/10 rather than silently
  absorbed.

**Second divergence (recorded, from re-review Minor m4):**

- `design.md:506-507` states that tests avoid ambient HOME mutation. Fix
  iteration 1 added deliberately HOME-mutating negative tests to prove the M1
  read/write home divergence, which is the only way to establish that contract.
- Source of truth: the implementation. `design.md` is stale on this sentence.
- Follow-up: amend that design sentence during Phase 5 documentation rather than
  reverting the tests.

**Passing re-review:**

- Artifact: `reviews/p05-review-2026-08-27T170000Z.md`, range
  `b81a8bcc2..ab9250d68`; reconnaissance `attempted` with complete
  `## Review Orchestration` evidence. Verdict pass: 0 Critical, 0 Important,
  1 Medium, 5 Minor.
- The re-reviewer independently re-ran the I2 mutation and confirmed root's
  result exactly (8 failed / 57 passed mutated; 65 passed clean), then attacked
  the I3 legs with three further mutations: two were killed by the new tests and
  one survived them but was killed by a pre-existing unit test. It also killed a
  fourth mutation against the I1 diagnostic.
- All four implementer judgment calls were upheld: I1 reporting `pass` with a
  named message rather than exit 1 is correct given `workflows` and `research`
  both default to user scope; the I3 harness seam weakened no pre-existing
  assertion, verified at byte level; the migrate coverage shift is structurally
  forced and FR8 is satisfied by the union with
  `migrate/migrate.integration.test.ts`; and no further lockstep bump is needed.
- I1 is recorded as **partially closed**. The residual is a new Medium: the
  `USER_SCOPE_MANAGED_AGENT_FILES` exclusion in `pack-inventory.ts:230,236,242`
  is unconditional, but that materialization is provider-conditional — only
  Codex and Cursor register a materialization extension. On a Claude-only HOME,
  `oat-reviewer` and `oat-phase-implementer` are under-reported. The reviewer
  rated it Medium rather than Important because the pack is no longer reported
  clean and the project-scope remedy is correct and verified to work.

**Fix iteration 1/2:**

- `oat-phase-implementer` at the Claude High ceiling, model `opus`. One
  append-only commit `ab9250d68` on parent `b81a8bcc2`, 11 files. All three
  Important, all four Medium, and four named Minor findings closed.
- `Dispatch: scope=p05-fix1 action=fix role=implementer producer=claude provenance=resolver model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer(model=opus)`
- I1 was taken as the bounded diagnostic half only: `inventoryScopedPack` emits a
  scoped `user-agent-unmaterialized` diagnostic when a user-scope canonical agent
  is managed, present, and outside `USER_SCOPE_MANAGED_AGENT_FILES`. Both
  `status` and `doctor` consume it through the shared inventory model.
  `SCOPE_CONTENT_TYPES` and adapter behavior are untouched.
- **Root independently reproduced the I2 mutation test**, which is the evidence
  the whole finding rests on: with `pack-reconcile.ts:156` mutated from
  `observed?.status === 'current'` to `!== 'missing'`, the new stale-content case
  fails 8/8; with the mutation reverted it passes 8/8. The `oat tools update`
  refresh path is now genuinely bound by the suite.
- I3 replaced the hand-rolled leg with three legs driving the registered
  `oat tools migrate` through `runCli`, including two failure-injection cases.
- Root re-ran the complete CI gate sequence at the fix commit: all eleven gates
  exit 0, CLI 3,906 tests, clean worktree.
- Version note: the implementer flagged that this commit changes shipped CLI
  behavior and bundled docs assets and asked whether a further lockstep bump is
  needed. It is not. The AGENTS.md lockstep rule is PR-scoped, this PR already
  moves all five public packages `0.2.32` to `0.2.37`, and `0.2.37` is strictly
  greater than main's `0.2.36`. `release:check-versions` and `release:validate`
  both pass.

**Review outcome:**

- Artifact: `reviews/p04-review-2026-08-27T133629Z.md` (0 Critical, 2 Important,
  3 Medium, 1 Minor). Blocking at the configured threshold.
- Five of the six required audit targets were upheld: adoption cannot be forged
  by capability presence, writes fail closed, template precedence is correct,
  installed-scope resource resolution is correct, and all three recovery commits
  are genuinely inert (the reviewer recomputed the prompt-site hashes
  independently).
- Blocking findings, both on the "pack placement must not imply repository
  adoption" boundary:
  - I1 - production `oat init tools project-management --scope project` still
    writes repository root `AGENTS.md`. p04-t04 fixed
    `createInitToolsProjectManagementCommand`, but production registers
    `createReconciledPackCommand`, so the p04-t04 regression test guards an
    unreached path. Confirmed by root against the real CLI help output.
  - I2 - `packages/cli/src/commands/decision/agents-guidance.ts:43` still
    recommends `oat decision init`, which p04-t02 made fail closed in exactly
    the situation the guidance describes. Its sibling body was updated in
    p04-t04; this one was never touched in the phase range.
- Non-blocking, recorded: M1 user-tier templates read `process.env.HOME` while
  the installer writes to `os.homedir()`; M2 empty/unknown `adoption.state` is
  unhandled in `oat-project-document` and `oat-project-summary`; M3
  `oat-brainstorm` chains into a user-scope-default PJM skill by repo-relative
  path; Minor aggregate `oat doctor` still keys on project pack intent, already
  deferred to `p05-t01` and annotated `@deprecated`.

### Task p04-t01: Add durable PJM adoption state

**Status:** completed
**Commit:** `4790cbd3b`

### Task p04-t02: Fail PJM writes closed before initialization

**Status:** completed
**Commit:** `6a77fba68`

### Task p04-t03: Resolve PJM templates by repository, user, then bundle

**Status:** completed
**Commit:** `8eaf127f3`

### Task p04-t04: Complete project-management user installation

**Status:** completed
**Commit:** `342f3afea`

### Task p04-t05: Make shared docs scripts scope-relative

**Status:** completed
**Commit:** `7c48d5b70`
**Recovery commit:** `db9c0b1ed97d981d586c78d1c58b23577faa6ed4`

### Task p04-t06: Make PJM skill resources and preflights portable

**Status:** completed
**Commit:** `52c93f19d`

### Task p04-t07: Separate PJM capability presence from repository adoption

**Status:** completed
**Commit:** `0c189eb5b`

## Phase 5: Diagnostics, Documentation, and Release Readiness

**Status:** completed
**Started:** 2026-08-27
**Completed:** 2026-08-27

### Phase Summary

**Outcome:**

- Re-keyed scoped pack ownership and drift diagnostics onto shared inventory and
  adoption state, documented the user-scope pack contract across ten docs pages,
  pinned scoped provider materialization, added a full lifecycle acceptance
  matrix, and satisfied the lockstep release gates, in five task commits from
  `f66e6d794` to `17eb63ea5`.
- The aggregate doctor no longer gates PJM checks on
  `config.tools?.['project-management']`; it resolves adoption through
  `resolvePjmAdoption()` and skips PJM only when adoption is `none` and
  `.oat/repo` is absent. This closes the Minor deferred from Phase 4 that fell
  inside `p05-t01`'s declared files.
- No recovery attempt was reserved or consumed; the p05 ledger is untouched.

**Verification (p05-t06, complete CI gate sequence, exit codes captured
individually and independently reproduced by root):**

| #   | Gate                          | Exit                              |
| --- | ----------------------------- | --------------------------------- |
| 1   | `pnpm check`                  | 0                                 |
| 2   | `pnpm type-check`             | 0                                 |
| 3   | `pnpm test`                   | 0 (CLI 290 files / 3,890 tests)   |
| 4   | `pnpm build`                  | 0                                 |
| 5   | `pnpm run check:skill-bumps`  | 0                                 |
| 6   | `pnpm release:check-versions` | 0                                 |
| 7   | `pnpm release:validate`       | 0 (5 public packages at `0.2.37`) |
| 8   | `pnpm build:docs`             | 0                                 |
| +   | `pnpm lint`                   | 0                                 |
| +   | `pnpm format`                 | 0                                 |
| +   | `git diff --check`            | 0                                 |

- The implementer's first `pnpm test` run hit one timeout in
  `src/commands/gate/index.test.ts` under concurrent Turbo load, in a file
  untouched by Phase 5. It used its one permitted no-edit rerun, which passed.
  Root's independent full run passed 3,890/3,890 on the first attempt, so the
  timeout is corroborated as load flake rather than a defect. No attempt was
  consumed.

**Plan divergences (recorded):**

- `p05-t05` Step 1 could not reproduce its expected RED: the lockstep bump
  `0.2.32` to `0.2.33` had already landed on this branch in `eeda0085b` during
  the Phase 1 fix, so `pnpm release:check-versions` already passed at the phase
  base. The task's commit was produced anyway, as the plan requires.
- `p05-t05` bumped to `0.2.37` rather than the plan-implied next patch.
  `origin/main` is at `0.2.36` while the merge-base is `0.2.32`, and main
  carries a newer release gate rejecting versions overtaken by main. `0.2.34`
  would pass locally and fail on main. Root independently confirmed all three
  version facts. Source of truth: the implementation.
- `p05-t03` found no provider adapter gaps, so its commit is test-only, which
  its `test(...)` type already implies.
- `p05-t06` is recorded and committed by root rather than by the phase
  implementer, because the plan assigned it `implementation.md`, which is
  root-owned bookkeeping. The gate evidence above is the implementer's, verified
  by root re-running the full sequence.

**Review outcome:**

- Artifact: `reviews/p05-review-2026-08-27T154500Z.md` (0 Critical, 3 Important,
  4 Medium, 8 Minor). Blocking. Reconnaissance signal `attempted`, with complete
  `## Review Orchestration` evidence, so exactly one project-log entry
  referencing the artifact is owed at the terminal phase outcome.
- Production code was found sound; the blocking set is concentrated in the two
  test-only commits plus one shipped-contract gap.
- I1 - user-scope canonical agents install but reach no provider, with no
  diagnostic and no repair. `SCOPE_CONTENT_TYPES.user` is `['skill']`, so the
  Claude adapter's user agent mapping is unreachable dead configuration.
  Reproduced on a clean root: `oat tools install workflows --scope user` writes
  three agents that `oat sync --scope user` never materializes, while `status`,
  `doctor`, and `update` all report the pack complete. Pre-existing, but p05-t03
  was chartered to cover agents and instead pinned the gap as expected.
- I2 - `oat tools update`'s content refresh is unbound by the entire test suite.
  The reviewer disabled refresh of every outdated managed asset and the full
  290-file CLI suite stayed green, twice. The p05-t04 update leg simulates new
  membership by deleting an asset, exercising only the `missing` branch.
- I3 - the migration/rollback acceptance leg hand-rolls install-then-remove
  through `reconcilePackLifecycle` and never touches the production
  `oat tools migrate` path, injecting no failure. Same defect class as the
  Phase 4 blocking finding.
- Mediums: doctor's `|| pathExists('.oat/repo')` disjunct warns about PJM
  non-adoption for repos that only use `.oat/repo/knowledge/`, exiting 1 where
  they previously passed, and disagrees with `oat status`; docs mark seed files
  "not applicable" at user scope when `oat tools install ideas --scope user`
  demonstrably creates them; the `retained-override` remedy points only at
  `.oat/templates/` while the finding also fires on user-owned `.oat/ideas/*`;
  and the removal legs bypass production `removeTools`.
- The reviewer confirmed release readiness is real: lockstep set uniformly
  `0.2.37`, `public-package-versions.json` regenerates byte-identical, and
  `0.2.37` is the minimum valid choice against main's gate. It also verified the
  `runCli` harness change weakened no assertion, by diffing against the
  `be61aef51` blob.

**Concerns carried to independent review:**

- The branch is behind main on the release line (`origin/main` `0.2.36`,
  merge-base `0.2.32`). `0.2.37` satisfies the stricter on-main gate today, but
  the version must be re-resolved if main advances before merge. This branch
  still needs a rebase onto current main, which is PR territory.
- `createPjmDisabledCheck()` is now a dead export at
  `packages/cli/src/commands/pjm/doctor.ts:209`; root confirmed zero call sites
  remain. Deleting it needs `pjm/doctor.ts`, outside `p05-t01`'s declared files.
- `oat status` deliberately does not set `process.exitCode` for pack findings,
  keeping its exit contract about provider-sync drift only so the `--hook`
  pre-commit contract is not perturbed; `oat doctor` is the surface that exits 1
  on actionable pack drift.
- Strongest follow-up candidate: `SCOPE_CONTENT_TYPES.user` is `['skill']`
  (`packages/cli/src/shared/types.ts:14`), so a user-scope canonical agent in
  `~/.agents/agents/` is never mirrored into `~/.claude/agents/`. Since the
  `workflows` pack now installs agents at user scope by default, an arbitrary
  user-scope pack agent is invisible to Claude. The current contract was pinned
  in tests rather than changed, because widening user scope to agents across all
  adapters is not a bounded adapter fix.

### Task p05-t01: Surface pack state in status and doctor

**Status:** completed
**Commit:** `f66e6d794`

### Task p05-t02: Update tool-pack and PJM documentation

**Status:** completed
**Commit:** `213908687`

### Task p05-t03: Verify provider materialization across scopes

**Status:** completed
**Commit:** `0b9764fe7`

### Task p05-t04: Add complete lifecycle acceptance coverage

**Status:** completed
**Commit:** `5496806e1`

### Task p05-t05: Bump lockstep public package versions

**Status:** completed
**Commit:** `17eb63ea5`

### Task p05-t06: Run the complete repository gate sequence

**Status:** completed
**Commit:** recorded by root in this bookkeeping commit

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-08-27T02:31:54Z

**Status:** in_progress
**Branch:** feat/oat-plugin
**Tier:** 1 — subagents
**Dispatch policy:** managed High maximum (project state)
**Schedule:** p01 → p02 → p03 → p04 → p05
**HiLL:** p05 only; automatic checkpoint review enabled

#### Phase Outcomes

| Phase | Status    | Tasks | Review | Fix loops |
| ----- | --------- | ----- | ------ | --------- |
| p01   | completed | 7/7   | passed | 3         |
| p02   | completed | 9/9   | passed | 2         |
| p03   | completed | 5/5   | passed | 3         |
| p04   | completed | 7/7   | passed | 1         |

#### Phase 5 dispatch

- Phase 5 implementation: `oat-phase-implementer` at the Claude High ceiling,
  model `opus`, resolved fresh for the active provider. This is a new phase
  dispatch, not a continuation, so no pinned-target constraint applies.
- `Dispatch: scope=p05 action=implementation role=implementer producer=claude provenance=resolver model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer(model=opus)`
- Report: `DONE_WITH_CONCERNS`, 6/6 tasks, phase verification pass, 0 recovery
  attempts, clean worktree. Root independently verified the five task commit
  boundaries, the lockstep version set, the three release-line version facts,
  the untouched deferred items, and re-ran the complete CI gate sequence.

#### Root-inline phase

- Phase/scope: p04 recovery attempt 1/10 (not phase implementation)
- Root model: `claude-opus-5`
- Reason: the accepted p04 handle (`/root/p04_implement`, Codex thread
  `01a04348-4b75-7c63-9dfb-3ca71dbd9dac`) became unresumable when its Codex root
  turn was interrupted, and its exact target
  `oat-phase-implementer-gpt-5-6-sol-high` is unbindable from the active
  provider. Handle-continuity branches 1 and 2 were therefore both unavailable.
- Authorization: operator-scope. The operator was presented with the
  contract-compliant Codex-resume option and explicitly authorized a recorded
  root-inline correction instead.
- Boundary: the mechanical, test-only correction named by the child's
  direction-required report. No planned task was replayed and no review finding
  was consumed.

#### Dispatch Notes

- Phase 4 implementation:
  `oat-phase-implementer-gpt-5-6-sol-high`, request
  `call_yFu85ZIagHG2fzbtGD5Qz5wq`, accepted `2026-08-27T12:53:25Z` as
  `/root/p04_implement`; seven commits from `4790cbd3b` to `0c189eb5b`. The
  acceptance is recorded here retroactively from the launcher's primary
  `spawn_agent` record: the dispatching root was interrupted before it wrote
  this entry, and the omission is what caused the child's terminal
  direction-required stop.
- `Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Passing Phase 4 re-review: `oat-reviewer` at the Claude High ceiling, model
  `opus`; artifact `reviews/p04-review-2026-08-27T144000Z.md`, range
  `bed357bab..f337df8b5`; reconnaissance `not-attempted`. Verdict pass:
  0 Critical, 0 Important, 1 Medium, 4 Minor. All five prior findings closed.
  The re-reviewer independently re-derived the ratchet scanner regex, confirmed
  the retargeted I1 test fails when the fix is reverted, and adjudicated all
  three implementer concerns: the M3 ratchet bound is correct rather than
  under-delivery, `migratePjmRepo` writing root AGENTS is correct and in-scope,
  and `destinations.md:79` should not have been left but is only Minor.
- `Dispatch: scope=p04-rereview1 action=review role=reviewer producer=claude provenance=resolver model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer(model=opus)`
- Phase 4 deferred non-blocking findings, all routed to Phase 5:
  - Medium: five packaged user-scope skills still chain via bare repo-relative
    paths (`oat-idea-ideate:120`, `oat-idea-new:143`,
    `oat-idea-summarize:84,117`, `oat-project-implement:23-24`,
    `oat-project-plan-writing:29-30`); pinned by the ratchet, not fixed.
  - Minor m1: `oat-brainstorm/references/destinations.md:79` retains two bare
    cross-skill paths and now contradicts `SKILL.md:400`.
  - Minor m2: the ratchet scanner is `SKILL.md`-only and its regex requires
    backticks.
  - Minor m3: `oat pjm migrate` is still keyed on project pack intent
    (`migrate.ts:474`); same class as the deferred aggregate-doctor Minor. Fold
    into `p05-t01`.
  - Minor m4: artifact drift — `design.md:506-507` says tests avoid ambient HOME
    mutation, but the new negative tests mutate it deliberately.
- Phase 4 fix iteration 1/2: `oat-phase-implementer` at the Claude High
  ceiling, model `opus`, operator-scope authorized route change linked to
  original request `call_yFu85ZIagHG2fzbtGD5Qz5wq`; the original target
  `oat-phase-implementer-gpt-5-6-sol-high` is unbindable from the active
  provider. One append-only commit `f337df8b5` on parent `f7963a1cc`, 20 files.
  All five findings (I1, I2, M1, M2, M3) fixed; the Minor was left untouched
  for `p05-t01`. Root independently verified the commit boundary and re-ran the
  phase suite (404/404), full CLI (3,797/3,797), `check:skill-bumps`,
  `pnpm check`, and `pnpm type-check`, and reproduced the I1/I2 behavioral
  acceptance end-to-end in a throwaway repo under a temporary HOME.
- `Dispatch: scope=p04-fix1 action=fix role=implementer producer=claude provenance=resolver model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer(model=opus)`
- Phase 4 fix iteration 1 concerns carried to re-review: the M3 contract
  assertion is a pinned-inventory ratchet rather than full remediation, because
  every pack in `PACK_MANIFEST` defaults to user scope and six pre-existing
  offenders sit outside this phase; `oat-brainstorm/references/destinations.md`
  still carries two bare cross-skill paths that the new assertion does not scan;
  and `migratePjmRepo` now also writes the two root AGENTS sections because it
  calls `initializeRepoReference`.
- Phase 4 review: `oat-reviewer` at the Claude High ceiling, model `opus`,
  selection branch `matrix-pinned`, resolved via
  `oat project dispatch-ceiling resolve --provider claude --role reviewer`.
  Artifact `reviews/p04-review-2026-08-27T133629Z.md`; reconnaissance signal
  `not-attempted`, so no `## Review Orchestration` section and no project-log
  orchestration entry. Verdict blocking: 0 Critical, 2 Important, 3 Medium,
  1 Minor.
- `Dispatch: scope=p04 action=review role=reviewer producer=claude provenance=resolver model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer(model=opus)`
- Phase 4 report: `BLOCKED`, 7/7 tasks done, phase verification fail, recovery
  attempts 0/10, worktree clean, no reservation or edit. Validated against the
  pre-attempt `direction-required` row: `pending_attempt` was null, usage was
  unchanged, and history was immutable.
- Phase 1 implementation:
  `oat-phase-implementer-gpt-5-6-sol-high`, request
  `df4bacdb-5eef-4b4d-8616-4a340a843c8f`, seven commits from
  `5ec861813c672311295532f72178b079c6b5bbc1` through
  `e0039d8065b4b8eb5ed45fb42d5c1382132c3104`.
- `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Phase 1 review:
  `oat-reviewer-gpt-5-6-sol-high`; artifact
  `reviews/p01-review-2026-08-27T031035Z.md`.
- `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 2 implementation:
  `oat-phase-implementer-gpt-5-6-sol-high`, request
  `d9cf84cf-abf6-459b-831c-8768658de1e8`, base
  `28eab6e9f613541d07162c0b002834454f30cd42`.
- `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Phase 2 task commits run from `a2100aae2` through `c6bd82c71`; recovery
  commits `303dd6c75` and `95a692812` are reconciled. Phase gates pass, with the
  production-caller concern carried into independent review.
- Phase 2 review:
  `reviews/p02-review-2026-08-27T055129Z.md`; 5 Critical, 2 Important,
  1 Medium. All seven blocking findings are assigned to fix iteration 1/2.
- `Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 2 fix iteration 1:
  `5c9e194746e1cc55d23a8ef0bad4a4335c136d9e`; 159 focused tests,
  569 Phase 2 tests, 3,715 CLI tests, workspace tests, type-check, lint, format,
  and diff check passed. Root repeated the production call-path search,
  114 focused tests, type-check, and diff check successfully.
- `Dispatch: scope=p02-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Phase 2 re-review after fix iteration 1:
  `reviews/p02-review-2026-08-27T063435Z.md`; 2 Critical, 1 Important,
  1 Medium. Final configured fix iteration 2/2 is required.
- `Dispatch: scope=p02-review-fix1 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 2 fix iteration 2:
  `eaf378802c8616992079c2026b92d77eb543317d`; 114 focused tests,
  578 Phase 2 tests, 3,724 CLI tests, workspace tests, type-check, lint, format,
  and diff check passed. Root repeated 43 load-bearing tests, type-check, and
  diff check successfully.
- `Dispatch: scope=p02-fix2 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Passing decisive Phase 2 re-review:
  `reviews/p02-review-2026-08-27T070524Z.md`; 0 Critical, 0 Important,
  0 Medium, 0 Minor.
- `Dispatch: scope=p02-review-fix2 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 3 implementation:
  `oat-phase-implementer-gpt-5-6-sol-high`, request
  `c880105a-9a2e-4e1f-bfb6-fea1b4584a7d`, five task commits from
  `32d440898` through `7a4c1ab45`.
- `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Phase 3 review:
  `reviews/p03-review-2026-08-27T074154Z.md`; 2 Critical, 2 Important,
  1 Medium, 0 Minor. All five findings are assigned to fix iteration 1/2.
- `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 3 fix iteration 1:
  `6b0a7fe542f41f2a20143b0f3194242cf63ef770`; all five review findings
  addressed. Focused, phase, full CLI, workspace, type-check, lint, format, and
  diff gates passed; root repeated 67 load-bearing tests.
- `Dispatch: scope=p03-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Phase 3 re-review after fix iteration 1:
  `reviews/p03-review-2026-08-27T081809Z.md`; 0 Critical, 1 Important,
  1 Medium, 0 Minor. Both findings are assigned to final configured fix
  iteration 2/2.
- `Dispatch: scope=p03-review-fix1 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 3 fix iteration 2:
  `b0a6bc16e5efa5cb22cac853d8a45c2f8358e8f1`; both remaining review
  findings addressed. Review-focused, phase, full CLI, workspace, type-check,
  lint, format, and diff gates passed; root repeated 133 load-bearing tests.
- `Dispatch: scope=p03-fix2 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Decisive Phase 3 re-review after fix iteration 2:
  `reviews/p03-review-2026-08-27T083913Z.md`; 0 Critical, 0 Important,
  1 Medium, 0 Minor. The configured two fix iterations are exhausted.
- `Dispatch: scope=p03-review-fix2 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 3 fix iteration 3:
  `38233ba2e997f3e18ad2fa3ebc888cab95131688`; the remaining Medium
  planner/JSON finding is addressed. Focused, regression, phase, full CLI,
  workspace, type-check, lint, format, and diff gates passed; root repeated 36
  decisive tests.
- `Dispatch: scope=p03-fix3 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Passing decisive Phase 3 re-review:
  `reviews/p03-review-2026-08-27T125029Z.md`; 0 Critical, 0 Important,
  0 Medium, 0 Minor.
- `Dispatch: scope=p03-review-fix3 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

### Recovery Event d8c701a8-4297-4028-bd4b-e60f404686fa

- Phase/task: p03 / p03-t01
- Original request: c880105a-9a2e-4e1f-bfb6-fea1b4584a7d
- Original commit: 32d440898285a516a939c552bbbf0afbeac2b490
- Defect class: composition
- Discovered by: phase-wide self-review after
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/migrate src/commands/commands.integration.test.ts`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-high
- Recovery commit: 3e2421bce1286dd61852e8e15d87cff1c8c82b5d
- Verification: focused 13/13 and phase 43/43 passed before and after commit;
  root repeated 36 migration/integration tests and diff check successfully.
- Reason: corrected a bounded preview-composition defect that mislabeled
  user-managed source templates as retained project overrides.

### Recovery Event 4bd11825-d39d-4c04-888d-ef704ae4af24

- Phase/task: p02 / p02-t03
- Original request: d9cf84cf-abf6-459b-831c-8768658de1e8
- Original commit: 0b9415546476b26e450a52484aad147dfe8741d9
- Defect class: lint
- Discovered by: `oxlint --fix`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-high
- Recovery commit: 303dd6c75a78da9144ae488d58aa31c0d741d17f
- Verification: focused lint, p02-t03 tests, current Phase 2 shared tests,
  type-check, and diff check passed before and after commit; root repeated focused
  lint, 73 task tests, type-check, and diff check successfully.
- Reason: five mechanically unused imports were removed without behavior or
  scope changes.

### Recovery Event 36a35349-8d93-430f-805a-a670b613ca68

- Phase/task: p02 / p02-t08
- Original request: d9cf84cf-abf6-459b-831c-8768658de1e8
- Original commit: 382f13c706295a2bfafdd7f6373bbc8633eb0678
- Defect class: test
- Discovered by: `pnpm --filter @open-agent-toolkit/cli test`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 2/10
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-high
- Recovery commit: 95a692812238255c5aba2e25c23aa8ee4560d3e2
- Verification: the 58-test help snapshot suite and full 3,700-test CLI suite
  passed after commit; root repeated both successfully.
- Reason: p02-t08 expanded the legacy remove-pack choices but left its inline
  help snapshot stale; the correction was mechanical and test-only.
- Operator authorized up to two additional Phase 1 review/fix iterations. The
  scope-bound temporary total is 4; iterations already used remain 2.
- Phase 1 fix iteration 3:
  `752aaab7d99bdf24655a2b736d437ddb0ba022a0`; manifest-driven targets are
  preflighted against managed-root containment before any removal or intent
  cleanup. Focused containment and removal/workflow suites passed 1/1 and
  37/37; CLI passed 3,677/3,677; the workspace suite passed.
- `Dispatch: scope=p01-fix3 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
- Passing Phase 1 re-review:
  `reviews/p01-review-2026-08-27T050410Z.md`; 0 Critical, 0 Important,
  2 Medium. The prior containment finding is closed.
- `Dispatch: scope=p01-review-fix3 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 1 fix iteration 2:
  `309cb7f9ac3d44513dc9836a14f738786dc01772`; complete manifest-managed
  removal and unambiguous shared-owner intent implemented. Focused suites passed
  243/243 and 37/37; CLI passed 3,676/3,676; workspace gates passed.
- Final Phase 1 re-review:
  `reviews/p01-review-2026-08-27T041427Z.md`; 1 Critical containment finding
  remains at retry exhaustion.
- `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Phase 1 fix iteration 1:
  `eeda0085b00cf508eec3e4b288bd4069477b84ec`; all four blocking findings
  resolved, focused suites passed 241/241 and 21/21, CLI passed 3,668/3,668,
  and the workspace test/check/build/release/docs gates passed.
- Phase 1 re-review:
  `oat-reviewer-gpt-5-6-sol-high`; artifact
  `reviews/p01-review-2026-08-27T035112Z.md`; 1 Critical and 1 Important
  finding require fix iteration 2.
- `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

### Recovery Event dea684e8-bf70-403f-b163-5b56d0e95686

- Phase/task: p04 / p04-t05
- Original request: `call_yFu85ZIagHG2fzbtGD5Qz5wq`
- Original commit: `7c48d5b70e5bcf1aebb70c54d358ac6a7dbf9448`
- Defect class: test
- Discovered by: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/backlog src/commands/decision src/commands/init/tools/project-management src/commands/init/tools/shared`
- Disposition: direction-required
- Authorization: phase-standing
- Attempt: 0/10
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high`
- Recovery commit: -
- Verification: 394/395 Phase 4 tests passed; one stale version assertion failed
- Reason: the correction was mechanically eligible, but the dispatching root was
  interrupted before recording the p04 request ID, so the child had no
  authoritative original-request provenance. Fail-closed rules forbade reserving
  an attempt or editing without it. Worktree clean; no reservation, edit, or
  commit occurred.

### Recovery Event 76178ef7-3252-4953-aff7-8687eba22bd1

- Phase/task: p04 / p04-t05
- Original request: `call_yFu85ZIagHG2fzbtGD5Qz5wq`
- Original commit: `7c48d5b70e5bcf1aebb70c54d358ac6a7dbf9448`
- Defect class: test
- Discovered by: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/backlog src/commands/decision src/commands/init/tools/project-management src/commands/init/tools/shared`
- Disposition: recovered
- Authorization: operator-scope
- Attempt: 1/10
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high` (executed
  root-inline as `claude-opus-5` under recorded operator-scope authorization;
  see the run anchor's `Root-inline phase` heading)
- Recovery commit: `db9c0b1ed97d981d586c78d1c58b23577faa6ed4`
- Verification: focused contract suite 5/5 and Phase 4 suite 395/395 passed
  before the commit and again against committed HEAD; `pnpm lint`,
  `pnpm format`, and `pnpm run check:skill-bumps` also passed.
- Reason: p04-t05 correctly bumped `oat-agent-instructions-analyze` to `1.12.0`
  under the repository skill-bump rule, but `agent-instructions-bundle-contract.test.ts`
  still asserted `1.11.2`. The one-line, test-only correction changed no
  architecture, security, product scope, requirements, or public behavior. The
  missing provenance that blocked the child was recovered from the launcher's
  primary `spawn_agent` record rather than reconstructed.

### Recovery Event 2e6b74fd-752f-403a-8a3c-2f6e02efde08

- Phase/task: p04 / p04-t07
- Original request: `call_yFu85ZIagHG2fzbtGD5Qz5wq`
- Original commit: `0c189eb5b4f07a3ff07b811ce4f0e7b593812fa1`
- Defect class: test
- Discovered by: `pnpm --filter @open-agent-toolkit/cli test`
- Disposition: recovered
- Authorization: operator-scope
- Attempt: 2/10
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high` (executed
  root-inline as `claude-opus-5`; see the run anchor's `Root-inline phase`)
- Recovery commit: `55cf8de74c4b0e2bf55205ccd761d75df042558a`
- Verification: `src/validation/skills.test.ts` 134/134 and the Phase 4 suite
  395/395 passed before the commit and again against committed HEAD.
- Reason: `src/validation/skills.test.ts` pinned prior versions of
  `oat-agent-instructions-analyze`, `oat-project-summary`, and
  `oat-project-document`, all bumped by p04-t05 and p04-t07 under the
  repository skill-bump rule. Three mechanically related assertions in one file
  from one verification command were corrected in one atomic attempt. Test-only;
  no behavior change.

### Recovery Event 8a81a198-e58a-4d66-8393-9c1bdaf662b5

- Phase/task: p04 / p04-t07
- Original request: `call_yFu85ZIagHG2fzbtGD5Qz5wq`
- Original commit: `0c189eb5b4f07a3ff07b811ce4f0e7b593812fa1`
- Defect class: composition
- Discovered by: `pnpm --filter @open-agent-toolkit/cli test`
- Disposition: recovered
- Authorization: operator-scope
- Attempt: 3/10
- Dispatch target: `oat-phase-implementer-gpt-5-6-sol-high` (executed
  root-inline as `claude-opus-5`; see the run anchor's `Root-inline phase`)
- Recovery commit: `bed357babe582cec0a32804e38ef05c2194abd01`
- Verification: `src/validation/autonomy-gate-inventory.test.ts` 4/4, the full
  CLI suite 3,787/3,787, and the Phase 4 suite 395/395 passed before the commit
  and again against committed HEAD.
- Reason: the p04-t07 Step 7.1 rewrite in `oat-project-summary/SKILL.md`
  retired prompt sites `ac36f854dd6b`, `e73bd88837ea`, and `83257ff6cb68` and
  introduced `f979b2342d28` and `803bf40ec423`. Both new sites are explicitly
  non-prompting ("auto, no prompt", "Do NOT ask the user"), so they inherit the
  retired sites' `NG` disposition. The boundary expansion to
  `.agents/docs/autonomy-contract.md` is mechanically derived from the p04-t07
  skill edit and remains in-phase. Inventory-only; no gate semantics changed.
- Note: this is the third p04 recovery event. The elevated recovery-volume
  warning was raised and the run continued because every eligibility condition
  still held.

#### Outstanding Items

- Final verification, final review, and the p05 HiLL checkpoint.

### Final Review

- Artifact: `reviews/final-review-2026-08-27T174707Z.md`, range
  `6f443c084..dd359d2bb`, reviewed head `dd359d2bb`; reconnaissance `attempted`
  with complete `## Review Orchestration` evidence. Verdict blocking:
  0 Critical, 2 Important, 9 Medium, 6 Minor.
- Both Important findings are cross-phase seams that no single-phase review
  could see, and root reproduced both end-to-end:
  - **fI1** - `oat tools remove` wipes durable per-scope intent while reporting
    that nothing happened. `tools/remove/index.ts:133-150` guards the
    intent-clearing loop only on `!dryRun && target.kind !== 'name'` and never
    inspects `result.removed`. Reproduced: a repo with
    `{"tools":{"docs":true,"utility":true}}` and no assets on disk runs
    `oat tools remove --all --scope project`, exits 0, prints
    `No tools to remove.`, and is left with `{"version":1}`. That destroys the
    exact state FR5 (P0) needs to restore a fully-missing pack. The genuine
    failure path is safe; only the "nothing removed" path is wrong.
  - **fI2** - per-pack install ignores existing placement, silently duplicating
    installs on upgrade. `init/tools/index.ts:1345-1352` resolves scope from
    `definition.defaultScope`, now `'user'` for all eight packs, with no lookup
    of current placement. Reproduced: `docs` installed at project scope, then
    the standard `oat tools install docs`, produces a second full copy at user
    scope and flips `oat doctor` to exit 1 with `packs:scope_duplication`. This
    is the upgrade path for every existing 0.2.3x user. Existing-placement
    precedence is implemented, but only in the aggregate resolver, and the docs
    state the opposite contract in three places.
- Requirements closure: nine of fifteen fully met, six partial (FR1, FR5, FR9,
  FR10, NFR1, NFR3). Every partial traces to a recorded finding; nothing is
  claimed-but-absent.
- Cross-phase coherence: upheld, with three identified seams. The reviewer's
  unifying observation is that every seam is a place where a phase
  re-implemented, outside the shared abstraction, something the abstraction
  already guaranteed - fI1 clears intent in the adapter rather than the plan,
  fI2 resolves scope outside the aggregate resolver, and m1 bypasses
  `formatPackPath`, whose own comment says it exists to prevent exactly that.
- Upgrade risk: ten of thirteen user-visible behavior changes are undocumented.
  Back-compat defenses are real and nothing is data-destructive, but the
  upgrade narrative is missing.
- Rebase warning: the branch is 11 commits behind main with 13 files changed on
  both sides, notably `sync/index.ts`, `sync.types.ts`, and `bundle-assets.sh`,
  all surfaces this branch heavily rewrote. The rebase needs real review, not
  mechanical resolution, and the full gate sequence must be re-run afterwards
  because the gates were verified at `dd359d2bb`, not at the post-rebase head.

### Final Review Fix Pass

- `oat-phase-implementer` at the Claude High ceiling, model `opus`. One
  append-only commit `3352bcdc7` on parent `4fdac74b1`, 10 files.
- `Dispatch: scope=final-fix1 action=fix role=implementer producer=claude provenance=resolver model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer(model=opus)`
- **fI2 was fixed by reusing the aggregate resolver rather than copying the
  rule**, which was the point: `resolvePackDefaultEndState` was widened from
  `UserEligiblePack` to `ToolPack` and is now the single definition of
  existing-placement precedence, fed by the same `inventoryPack` +
  `buildPackInstallStateMapFromInventory` pair the aggregate path uses. Explicit
  `--scope` short-circuits ahead of the lookup.
- **fI1** gates intent clearing on per-pack removal evidence rather than
  `target.kind`. The implementer found a case the brief did not anticipate: a
  pack whose only footprint is a shared asset retained for another declared
  owner deletes no bytes but is still a real removal. Evidence is therefore
  physical presence, not bytes deleted, which preserves the shared-owner
  contract that three existing tests encode.
- Root independently reproduced both original defects before the fix and
  re-verified all three fixes after it: intent survives a no-op remove; a bare
  per-pack install on an existing project-scope placement stays at project scope
  with 0 operations and no `duplicate-scope` finding; explicit `--scope user` is
  still honored; and `oat tools has docs` outside a repository now exits 0.
- Also closed: M3 (docs no longer route to `oat decision init`), M4, M8, and a
  new `## Upgrading from an earlier CLI` section covering the previously
  undocumented user-visible behavior changes.
- Deliberate additive JSON change: `RemoveResult` gained `packOutcomes`, which
  surfaces in `oat tools remove --json`. NFR3-compatible but a new public
  surface not named in the review.
- Fault-tolerance note: `resolvePackCommandScopes` swallows inventory errors and
  falls back to `defaultScope`, chosen so placement detection can never block an
  install. A genuinely broken inventory would therefore reproduce the old
  duplicate-install behavior rather than surfacing an error.

### Merge of `origin/main`

- Merged rather than rebased, on the operator's call: rebasing would have
  replayed 130 commits across surfaces this branch rewrote, resolving each
  conflict without the context of the commit that follows it. The merge gives
  one reviewable resolution point and keeps the phase history intact, which
  matters because this ledger references specific SHAs throughout.
- Merge commit `e270a776e`, parents `61f2c599e` and `cb69a2869`. Brings in 11
  commits, including the sync manifest/CLI version-skew warning (#217),
  `OAT_ASSETS_DIR` fail-closed asset resolution (#219), and the conditional
  `codex-skill` repo-check bypass (#222).
- Ten conflicts in three classes. The two files the final review warned about,
  `sync/index.ts` and `bundle-assets.sh`, auto-merged cleanly.
  - Lockstep versions (5 `package.json` plus `public-package-versions.json`):
    kept ours at `0.2.37`; main is at `0.2.36` and the gate requires strictly
    greater, so no re-resolution was needed.
  - `sync.types.ts` and `sync/index.test.ts`: independent additions on both
    sides that collided textually only. Kept main's `SyncVersionSkew` and
    `versionSkewWarning` alongside our `CanonicalSyncFilter` and our
    `createCanonicalEntry(name, root)` signature, which the shared body
    requires. Both imports had already merged cleanly.
  - Generated state: took main's `oatVersion` in `.oat/sync/manifest.json`, and
    for the backlog index kept both sides' curated overview additions and then
    regenerated the table. The naive union had 89 rows including archived
    items; the regenerated table has 51, matching the 51 open items on disk with
    zero archived entries.
- Post-merge verification at `e270a776e`: all eleven gates exit 0, with the CLI
  suite at **3,970 tests** — both sides' suites coexist rather than one
  displacing the other. `pnpm release:check-versions` was run after a fresh
  `git fetch origin main`, as main's updated `AGENTS.md` now requires.
- Root re-verified both Important fixes and M4 against the merged build, since
  main touched asset resolution and sync: intent survives a no-op remove, a bare
  per-pack install stays at project scope with 0 operations, and
  `oat tools has` outside a repository exits 0.

## Final Summary (for PR/docs)

### What shipped

- **A single canonical pack manifest** is now the one source of truth for every
  tool pack's skills, agents, templates, scripts, and seed files, with per-scope
  ownership (`managed` vs `seed-if-missing`) and durable per-scope intent
  replacing the old boolean-ish config keys.
- **A unified pack lifecycle.** Install, list, info, `has`, `outdated`, update,
  remove, and provider sync all route through one reconcile planner and apply
  path, so the same rules govern every entry point. `has` is complete-only:
  a partially installed pack no longer reports as present.
- **Verified, preview-first scope migration.** `oat tools migrate` plans the
  move, installs and re-verifies the destination _before_ touching the source,
  refuses to remove a source non-interactively, retains the source on any
  destination failure, and preserves shared assets another pack still owns.
- **PJM capability is user-owned; PJM repository adoption is explicit.**
  `resolvePjmAdoption()` returns a four-state adoption value
  (`declared`, `inferred-legacy`, `partial-initialization`, `none`), every
  non-migration PJM write fails closed behind it with a typed recovery error,
  and `oat decision init` / `oat backlog init` are no longer alternate adoption
  paths. Repository `AGENTS.md` guidance is now written by the explicit adoption
  action, never as a side effect of pack placement.
- **Templates resolve repository → user → bundle**, so a user can keep managed
  defaults in `~/.oat/templates/` without vendoring them per repository.
- **Installed-scope resource resolution.** Bundled skills resolve their shared
  scripts and sibling skills from the scope they were loaded from rather than
  assuming a repo-relative path, which is what made user-scope installs work at
  all.
- **Ownership and drift diagnostics.** `oat status` and `oat doctor` report
  partial, stale, newer, legacy-false, duplicate, retained-override,
  unadopted-PJM, and unmaterialized-user-agent states with home paths redacted
  to `~/`, and emit structured recovery commands.

### Key files and modules

- Manifest and inventory: `packages/cli/src/commands/tools/shared/pack-manifest.ts`,
  `pack-inventory.ts`, `pack-reconcile.ts`, `pack-paths.ts`
- Migration: `packages/cli/src/commands/tools/migrate/`
- PJM adoption and templates: `packages/cli/src/commands/pjm/adoption.ts`,
  `template-source.ts`, `init.ts`, `doctor.ts`
- Diagnostics: `packages/cli/src/commands/status/index.ts`,
  `packages/cli/src/commands/doctor/index.ts`
- Bundled skills: twelve canonical skills under `.agents/skills/`, each version
  bumped
- Docs: ten pages under `apps/oat-docs/docs/`

### Verification performed

- Complete CI gate sequence in CI order, each exit code captured individually
  and independently reproduced by root at the final head: `pnpm check`,
  `pnpm type-check`, `pnpm test` (CLI 290 files / 3,906 tests), `pnpm build`,
  `pnpm run check:skill-bumps`, `pnpm release:check-versions`,
  `pnpm release:validate`, `pnpm build:docs`, plus `pnpm lint`, `pnpm format`,
  and `git diff --check`. All exit 0.
- Five independent phase reviews across fifteen review events, every phase
  reaching 0 Critical and 0 Important before closing.
- Behavioral end-to-end verification in throwaway repositories under temporary
  `HOME` for the adoption boundary, the fail-closed writes, template precedence,
  and the user-scope agent diagnostic.
- **Mutation testing on the two P0 safety behaviors.** Disabling `oat tools
update`'s content refresh, and breaking migration's verify-before-remove
  ordering, are each now caught by tests that root and an independent reviewer
  separately confirmed fail under the mutation and pass without it.

### Design deltas

- The plan's declared Phase 4 verification command reached only
  `src/commands/**`, while the phase edited eight bundled skills whose
  HEAD-pinned assertions live in `src/validation/**`. It reported a passing
  phase while three real failures remained, which caused Phase 4 recovery
  attempts 2/10 and 3/10. The implementation was verified against the full CLI
  suite plus workspace gates instead. `p05-t06` already runs the complete gate
  sequence, so no plan edit was required.
- `design.md:506-507` states tests avoid ambient `HOME` mutation. The Phase 4
  fix added deliberately `HOME`-mutating negative tests, which is the only way
  to establish the read/write home divergence contract. The implementation is
  source of truth; the design sentence is stale.
- Public packages were bumped `0.2.32` → `0.2.37` rather than the next patch,
  because `origin/main` had advanced to `0.2.36` while the merge-base was
  `0.2.32`, and main carries a stricter gate rejecting versions it has
  overtaken. `0.2.34` would have passed locally and failed in CI.
- Phase 4's `p04-t04` fixed a command adapter the production CLI does not
  register, so its regression test passed while production still wrote
  repository `AGENTS.md`. Caught in review and fixed; the same defect class
  recurred in `p05-t04`'s migration leg and was fixed there too.

### Known deferred work

Recorded, non-blocking, and not fixed by this project:

- Five packaged user-scope skills still chain into sibling skills by bare
  repo-relative path (`oat-idea-ideate`, `oat-idea-new`, `oat-idea-summarize`,
  `oat-project-implement`, `oat-project-plan-writing`), pinned by a ratchet so
  no new occurrence can be added.
- `.agents/skills/oat-brainstorm/references/destinations.md:79` retains two bare
  cross-skill paths; the ratchet scanner is `SKILL.md`-only and its regex
  requires backticks.
- `oat pjm migrate` is still keyed on project pack intent
  (`packages/cli/src/commands/pjm/migrate.ts:474`).
- The `user-agent-unmaterialized` diagnostic under-reports: its
  `USER_SCOPE_MANAGED_AGENT_FILES` exclusion is unconditional, but that
  materialization is provider-conditional, so on a Claude-only `HOME`
  `oat-reviewer` and `oat-phase-implementer` are not named.
- Assorted Minor polish: doctor's `'; '` separator collision,
  `shared-owner-observation` attributing a shared asset to an uninstalled pack,
  `oat status` degrading less gracefully than `oat doctor` on inventory failure,
  and two test-quality items.

### Required before merge

This branch is behind `origin/main` on the release line and must be rebased onto
current main. If main has advanced past `0.2.36`, the lockstep version must be
re-resolved above the new tip, because this branch's own version gate is the
older, weaker merge-base copy.
