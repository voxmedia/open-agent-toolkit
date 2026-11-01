---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-31
oat_current_task_id: null
oat_generated: false
---

# Implementation: wave-1-correctness

**Started:** 2026-10-31
**Last Updated:** 2026-10-31

This journal resumes interrupted implementation sessions. Every plan task has one block in its phase; `oat project journal check` validates it.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 6     | 6/6       |
| Phase 2 | complete | 7     | 7/7       |
| Phase 3 | complete | 4     | 4/4       |
| Phase 4 | complete | 2     | 2/2       |
| Phase 5 | complete | 6     | 6/6       |

**Total:** 25/25 tasks completed

---

## Phase 1: Provider sync cleanup and Codex config values

**Status:** complete
**Started:** 2026-10-31
**Worktree:** `.worktrees/wave1-p01` (branch `fix/wave-1-correctness-20261031-p01`), merged `--no-ff` at fan-in

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Deleting or renaming a canonical agent no longer breaks `oat sync`, `--dry-run` or `oat status` with "target escapes the sync scope": dangling agent links are skipped by the Cursor collision scan, and sync removes the stale `.claude/`, `.cursor/` and `.github/agents/` views (dry-run lists them and writes nothing).
- Canonical-derived Codex roles now carry the scope owner (`project-config` / `user-config`); project cleanup also covers `supported-catalogue` variants, so sync and pack removal (partial sync with `removedCanonicalPaths`) remove a deleted agent's `.codex/agents/<name>.toml`, its variants and `[agents.<name>]` tables, while user-authored tables, other-scope roles and ownerless legacy roles stay.
- `oat sync` and `oat providers codex materialize` keep explicit `[features] multi_agent` and `[agents] max_depth` values, add only absent keys, and print each added key, conflict, or note in the config operation reason (human and `--json`, also on `skip`).

**Key files touched:**

- `packages/cli/src/providers/cursor/codec/materialize.ts` - dangling-link skip; controlled errors for other stat failures
- `packages/cli/src/providers/codex/codec/sync-extension.ts` - owner stamp, cleanup owners, partial-sync removal with protected desired roles, config reason
- `packages/cli/src/providers/codex/codec/config-merge.ts` - user-value preservation and change reporting
- `packages/cli/src/commands/providers/codex/materialize.ts` - `Config:` lines and JSON notices
- New tests: `commands/sync/stale-agent-views.test.ts`, `commands/status/stale-agent-views.test.ts`, `commands/sync/codex-config-values.test.ts`

**Verification:** phase-end forced CLI suite (self-removing isolated HOME) exit 0, 434 files / 9245 tests after p01-t04; lint and type-check exit 0.

**Notes / Decisions:**

- A dangling link whose name collides with a desired role is also skipped (main sync replaces it with a managed link); the plan text said the colliding-link refusal is kept. Accepted as safe by review (artifact `p01-code-review-2026-11-01T001410Z.md`, Low); docs describe shipped behavior.

### Task p01-t01: Skip dangling agent links in the Cursor collision scan

**Status:** completed
**Commit:** 1ea460f8fccd08cca78452ceff945b97ee126f44

**Outcome (required when completed):**

- The Cursor collision scan skips dangling agent links; an existing target outside the scope is still refused. Sync, dry-run and status handle agent delete and rename with claude, cursor, codex and copilot enabled.

**Files changed:**

- `packages/cli/src/providers/cursor/codec/materialize.ts` and test - skip dangling links
- `packages/cli/src/commands/sync/stale-agent-views.test.ts`, `packages/cli/src/commands/status/stale-agent-views.test.ts` - integration coverage

**Verification:** focused tests (248) exit 0; lint, type-check exit 0. Pre-fix bad state with the built CLI: `sync --dry-run`, `status`, `status --json` exit 1 with the escapes error. Guard-can-fail: with the skip disabled, 7 of 24 tests failed with that error; restored, 24 of 24 pass.

---

### Task p01-t02: Remove stale canonical-derived Codex roles, including on pack removal

**Status:** completed
**Commit:** 0defa23e2dfb369da92cd16cd502a533ca357c5b

**Outcome (required when completed):**

- Base canonical exports carry the scope owner; project cleanup owners are `supported-catalogue` and `project-config`; full and partial sync remove a deleted or renamed agent's role files, variants and tables; dry-run lists `codex:role:remove` and the removed tables.

**Files changed:**

- `packages/cli/src/providers/codex/codec/sync-extension.ts` and test; `commands/sync/stale-agent-views.test.ts`

**Verification:** wide run 154 files / 3042 tests exit 0; `pnpm lint`, `pnpm type-check` exit 0. Guard-can-fail (48 focused tests): owner stamp removed → 13 failed; `supported-catalogue` owner removed → 3 failed; partial-sync removal disabled → 5 failed; restored byte-identical, 48 of 48 pass. Dry-run on this repository: 66 role skips, 5 owner-header updates, 0 removals.

---

### Task p01-t03: Keep user values for Codex multi_agent and max_depth

**Status:** completed
**Commit:** c5e8cf91ab98f3aa42dd8f4008f38a0adf1d342c

**Outcome (required when completed):**

- Explicit `multi_agent` / `max_depth` values are never rewritten; absent keys are added (`max_depth` 2 or a higher inherited value) and named; `multi_agent = false` and `max_depth < 1` are reported as conflicts, `max_depth = 1` as a note; no refusal of the role step.

**Files changed:**

- `packages/cli/src/providers/codex/codec/config-merge.ts`, `sync-extension.ts`, `commands/providers/codex/materialize.ts` and tests; `commands/sync/codex-config-values.test.ts`

**Verification:** focused 114 tests exit 0; wide 155 files / 3054 tests exit 0; lint, type-check, `oxfmt --check .` exit 0. Guard-can-fail: restoring the unconditional upsert failed 20 of 108 tests (seeded config received `multi_agent = true` / `max_depth = 2`); restored, 108 of 108 pass.

---

### Task p01-t04: (review) Protect still-desired Codex roles in partial-sync removal and keep link-loop errors controlled

**Status:** completed
**Commit:** 53c562a31f478b34b9f053aa55e827dd7433e13f

**Outcome (required when completed):**

- Partial-sync removal never removes a role (or variant) produced by a present canonical agent's frontmatter name; only `ENOENT` counts as a dangling link, so a link loop keeps the controlled `CliError` (exit 1).

**Files changed:**

- `packages/cli/src/providers/codex/codec/sync-extension.ts` and test; `packages/cli/src/providers/cursor/codec/materialize.ts` and test

**Verification:** focused 70 tests exit 0; wide 45 files / 590 tests exit 0; forced CLI suite 434 files / 9245 tests exit 0. Guard-can-fail: unprotected predicate → both new tests fail (planned removals `gone.toml`, `oat-reviewer.toml`); old rethrow → ELOOP test fails; restored, all pass.

### Task p01-t05: (review) Remove a removed agent's declared-name Codex role on pack removal

**Status:** completed
**Commit:** dba5ef0cbe3d4f5274228dfefdb4e484857700af

**Outcome (required when completed):**

- A removal partial sync (an allowed `.agents/agents/*.md` path no longer exists) now runs the full owned-stale cleanup against the roles every present canonical agent produces, so a removed agent's declared-name role, its variants and `[agents.*]` tables are removed even when the name differs from the filename; install partial syncs still skip stale cleanup.

**Files changed:**

- `packages/cli/src/providers/codex/codec/sync-extension.ts` and test; `packages/cli/src/commands/sync/stale-agent-views.test.ts`

**Verification:** root-run guard-can-fail: with `sync-extension.ts` reverted to its p01-t04 version, 3 of the new tests fail (declared-role removal, pack removal through `removedCanonicalPaths`); restored, 55 of 55 pass. The producing instance's forced CLI suite ran to completion in the root checkout.

**Notes / Decisions:**

- Produced by a first instance of the `exit-gate-fix-1` continuation whose report never returned; the reporting instance found the commit and a live test run and stopped. The root validated the commit instead of re-dispatching (see Deviations).

---

### Task p01-t06: (review) Keep user-scope pack removal working with Codex materialization targets

**Status:** completed
**Commit:** 8462c192bcd429ee1236977eb2311926b9d1623a

**Outcome (required when completed):**

- The user-scope "bundled managed Codex role definitions are unavailable" guard runs only for full user syncs again, so a user-scope removal partial sync whose canonical set lacks the supported base roles removes the removed agents' `user-config` roles instead of throwing (reachable by calling the extension directly; through the CLI the bundled base agents are always in the user-scope canonical set, per the final re-review).

**Files changed:**

- `packages/cli/src/providers/codex/codec/sync-extension.ts` and test

**Verification:** probe reproduced the throw at p01-t05 (`CliError: Bundled managed Codex role definitions are unavailable for user sync`); new regression test fails with the guard on removal syncs and passes restored; focused 55 tests pass; CLI lint and type-check exit 0.

**Notes / Decisions:**

- Root-inline (see the `Root-inline` line under Orchestration Runs).

### Review Received: p01

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p01-code-review-2026-11-01T001410Z.md, re-review reviews/archived/p01-code-review-2026-11-01T002805Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 2 (round 1); Critical 0 · High 0 · Medium 0 · Low 1 (round 2)

- M1 (Medium): partial-sync removal derived roles from removed file names and could delete a still-desired role → fix task p01-t04; resolved in round 2.
- L1 (Low): link loop surfaced a raw `ELOOP` with exit 2 (regression from p01-t01) → fixed in p01-t04.
- L2 (Low): plan text said colliding dangling links are refused; shipped behavior skips them safely → accepted drift; recorded under Deviations.
- R2-L1 (Low): partial sync now parses every present agent, so a malformed unrelated agent makes removal auto-sync fail closed instead of deleting → accepted (refusing to delete is the safe direction; a full sync already fails on such a repository).

**Outcome:** passed (round 2, request `wave1-p01-review-2`)

---

## Phase 2: Install scope and CLI messages

**Status:** complete
**Started:** 2026-10-31
**Worktree:** `.worktrees/wave1-p02` (branch `fix/wave-1-correctness-20261031-p02`), merged `--no-ff` at fan-in

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- A pack install that resolves to no allowed scope is refused with exit 1 (`tools install core --scope project`: "core is user-scope only", recovery code `scope-not-allowed`); the aggregate `--scope project` install skips core and reports `skippedPacks`.
- Explicit `--scope project|user` writes only that scope for single-pack, aggregate and `init --setup` installs; no-flag and `--scope all` behavior is unchanged. `init --setup` no longer runs `gh` (default branch comes from `origin/HEAD`, then `main`).
- `tools install --help` states the real scope default; `--no-hook` help says it removes an installed hook; `packs:inventory` remedies name a CLI reinstall or `OAT_ASSETS_DIR` (with `pnpm build` only for an OAT source checkout); local-scope `project new` reports `skipped_local_scope`.
- `oat … | head` exits 0 quietly on `EPIPE`; `scripts/worktree/init.sh` and the AGENTS.md tool-guidance block use `oat sync --scope project`.

**Key files touched:**

- `packages/cli/src/commands/init/tools/index.ts`, `commands/tools/shared/pack-lifecycle-outcome.ts` - scope resolution
- `packages/cli/src/commands/init/index.ts`, `packages/cli/src/config/oat-config.ts` - guided setup scope, `--no-hook` help, no `gh`
- `packages/cli/src/commands/status/index.ts`, `commands/doctor/index.ts`, `commands/project/new/*` - messages
- `packages/cli/src/index.ts` - EPIPE handling
- `scripts/worktree/init.sh`, `packages/cli/src/commands/init/tools/project-guidance.ts` - project-scope sync
- New tests: `commands/tools/install-scope.integration.test.ts`, `commands/init/setup-scope.integration.test.ts`, `src/broken-pipe.test.ts`

**Verification:** phase-end forced CLI suite exit 0 (434 files / 9240 tests); `pnpm test:scripts` exit 0; lint, type-check exit 0 per task.

**Notes / Decisions:**

- EPIPE test uses a real `sh -c '… | head -1'` pipeline (Node socket stdio raised `ENOTCONN` intermittently on macOS); only `EPIPE` is swallowed.
- `assetRecoveryFix` is duplicated in status and doctor (shared module outside the boundary).

### Task p02-t01: Refuse a pack install that resolves to no allowed scope

**Status:** completed
**Commit:** 6b859043407fde090ea7bb737a717711c898c2cd

**Outcome (required when completed):**

- Empty-scope pack installs exit 1 with a user-scope-only message and write nothing; aggregate `--scope project` skips core.

**Files changed:**

- `packages/cli/src/commands/init/tools/index.ts`; new `packages/cli/src/commands/tools/install-scope.integration.test.ts`

**Verification:** focused 375 tests exit 0. Negative control: pre-fix `core --scope project` exited 0 printing "Installed core tool pack." with no writes, and aggregate `--scope project` wrote 110 files under HOME; post-fix both snapshots unchanged with exit 1 / skip; accepted control `tools install core` installs at user scope. Guard-can-fail: skip removed → HOME snapshot test fails; restored 5 of 5 pass.

---

### Task p02-t02: Write only the requested scope when --scope is explicit

**Status:** completed
**Commit:** 70d6929381fcd400d87ea4d7ee68ad8e766b8bc1

**Outcome (required when completed):**

- Explicit `--scope` limits writes and sync to that scope (single-pack and aggregate, new `resolveExplicitPackScopeSelection`); the other scope's placement stays untouched.

**Files changed:**

- `packages/cli/src/commands/init/tools/index.ts` and test; `commands/tools/shared/pack-lifecycle-outcome.ts` and test; `commands/tools/install/index.test.ts`; `commands/tools/install-scope.integration.test.ts`

**Verification:** focused 941 tests exit 0. Negative control: pre-fix repository grew 239 → 243–244 entries under `--scope user` and HOME 121 → 146 under `--scope project`; post-fix both unchanged; accepted control `tools install workflows` (no flag) repairs project and leaves HOME unchanged. Guard-can-fail: merge behavior restored → 4 tests fail; restored 9 of 9 pass.

---

### Task p02-t03: State the real --scope default in tools install help

**Status:** completed
**Commit:** 93a8242616030c8bf1ecaacb5d3eeae69a51d275

**Outcome (required when completed):**

- `tools install --help` explains existing placements are kept, new packs land at user scope, and core is user-only.

**Files changed:**

- `packages/cli/src/commands/shared/scope-option.ts`, `commands/tools/install/index.ts`, `commands/help-snapshots.test.ts`

**Verification:** focused 374 tests exit 0; lint exit 0.

---

### Task p02-t04: Honor --scope in init --setup and stop calling gh

**Status:** completed
**Commit:** ceff865ac01443f8b2c4c70b6b0ab041a8ac516d

**Outcome (required when completed):**

- `init --scope project --setup` installs packs at project scope (core skipped) and writes nothing under HOME; default-branch detection never runs `gh`.

**Files changed:**

- `packages/cli/src/commands/init/index.ts` and tests (`index.test.ts`, `guided-setup.test.ts`, new `setup-scope.integration.test.ts`); `packages/cli/src/config/oat-config.ts` and test

**Verification:** focused 1305 tests exit 0. Negative control: pre-fix 478 files under HOME and a `gh repo view` call; post-fix HOME unchanged, no `gh`, branch `main`; accepted control `--setup` without scope installs at user scope with no `gh`. Guard-can-fail: scope check neutralized → HOME snapshot fails; `gh` call reinserted → "never runs gh" test fails; restored 229 of 229 pass.

---

### Task p02-t05: Correct the --no-hook, packs:inventory, and local-scope scaffold messages

**Status:** completed
**Commit:** 13d8f1312341f256758185f63a48a38a0054e5fb

**Outcome (required when completed):**

- Corrected `--no-hook` help, adopter-runnable `packs:inventory` and skill-version remedies, and a `skipped_local_scope` scaffold status.

**Files changed:**

- `packages/cli/src/commands/init/index.ts`, `help-snapshots.test.ts`, `commands/status/index.ts` and test, `commands/doctor/index.ts` and test, `commands/project/new/scaffold.ts`, `index.ts` and tests

**Verification:** focused 329 tests exit 0; lint, type-check exit 0.

---

### Task p02-t06: Exit quietly when stdout is closed (EPIPE)

**Status:** completed
**Commit:** 8a06125b9c65023dda96faba4c0108a7b33fadc4

**Outcome (required when completed):**

- `EPIPE` on stdout or stderr exits 0 quietly; other stream errors stay fatal.

**Files changed:**

- `packages/cli/src/index.ts`; new `packages/cli/src/broken-pipe.test.ts`

**Verification:** pre-fix `tools list | head -1` exited 1 with an EPIPE stack (3 of 3); guard-can-fail with handler removed and rebuilt → 3 of 3 fail; restored and rebuilt 29 of 29 pass, 6 of 6 repeats.

---

### Task p02-t07: Use project-scope sync in the worktree script and AGENTS.md guidance

**Status:** completed
**Commit:** 5a46800c62fd2b68f86255ecbda22c768016d62f

**Outcome (required when completed):**

- `init.sh` runs `cli -- sync --scope project` (pinned by `init.test.mjs`); the guidance block recommends `oat sync --scope project` (pinned).

**Files changed:**

- `scripts/worktree/init.sh`, `scripts/worktree/init.test.mjs`, `packages/cli/src/commands/init/tools/project-guidance.ts` and test

**Verification:** `pnpm test:scripts` exit 0; focused 17 tests exit 0; guard probe: bare sync restored → script test fails; restored passes.

### Review Received: p02

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p02-code-review-2026-10-31T234909Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 3

- L1 (Low): the EPIPE handler always exits 0 even when the command had set a failing exit code (matters only under `set -o pipefail`) → recorded under Deferred Findings.
- L2 (Low): `packs:inventory` remedy text duplicated in status and doctor → recorded under Deferred Findings.
- L3 (Low): after an explicit-scope install the summary names only the written scope → covered in p05 docs.

**Outcome:** passed (request `wave1-p02-review-1`; reviewer re-ran the new scope tests against base source: 10 of 12 failed on the bad states, controls passed)

---

## Phase 3: Lifecycle skill contracts

**Status:** complete
**Started:** 2026-10-31
**Worktree:** `.worktrees/wave1-p03` (branch `fix/wave-1-correctness-20261031-p03`), merged `--no-ff` at fan-in

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- `oat-project-implement` no longer advertises the unread `--retry-limit` (2.3.24).
- `oat-project-complete` resolves its base branch from `git.defaultBranch`, then `origin/HEAD`, then `main`, for both the PR description merge-base and `gh pr create` (1.7.19); no hardcoded `main` base remains.
- `oat-project-pr-final` usage text says it fills the title and base from defaults without asking, then pushes and creates the PR (1.6.13).
- Docs: `execution-skills.md` and `closeout-skills.md` match.

**Key files touched:**

- `.agents/skills/oat-project-implement/SKILL.md`, `.agents/skills/oat-project-complete/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`
- `apps/oat-docs/docs/workflows/projects/execution/execution-skills.md`, `apps/oat-docs/docs/workflows/projects/closeout/closeout-skills.md`
- `packages/cli/src/validation/skills.test.ts`, `named-skill-load-contract.test.ts`, `commands/init/tools/shared/review-skill-contracts.test.ts` (pins)

**Verification:** forced CLI suite exit 0 (431 files / 9214 tests); `pnpm oat:validate-skills`, `pnpm lint`, `pnpm format`, `pnpm run check:skill-bumps`, docs check exit 0.

**Notes / Decisions:**

- The new complete-skill sentence avoids naming `oat-project-pr-final` so no new named-skill contract row is needed.

### Task p03-t01: Remove the unread --retry-limit hint from oat-project-implement

**Status:** completed
**Commit:** 24143b2485aa902b15ad97bac8fa3d3b60d1baa9

**Outcome (required when completed):**

- Argument hint is `[--dry-run]`; the docs note about the ignored flag is removed.

**Files changed:**

- `.agents/skills/oat-project-implement/SKILL.md`, `execution-skills.md`, `packages/cli/src/validation/skills.test.ts`

**Verification:** skill validation exit 0; contract tests 1089 pass; `oxlint .agents/skills`, `format:root`, docs check exit 0.

---

### Task p03-t02: Resolve the completion PR base branch from config

**Status:** completed
**Commit:** 4a5f6afde6127b66621de0eae42ddd118c9d1f83

**Outcome (required when completed):**

- Step 11 resolves `BASE_BRANCH` and uses `gh pr create --base "$BASE_BRANCH"`; the manual fallback names the resolved base.

**Files changed:**

- `.agents/skills/oat-project-complete/SKILL.md`, `packages/cli/src/validation/skills.test.ts`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Verification:** `grep -- '--base main'` no match; skill validation, contract tests (1089), lint, format exit 0.

---

### Task p03-t03: Make oat-project-pr-final usage text match its behavior

**Status:** completed
**Commit:** 58aa2d4b686544cfc67631220577d9b9369f86d7

**Outcome (required when completed):**

- "Without arguments" describes defaults without prompts and the automatic push and PR creation.

**Files changed:**

- `.agents/skills/oat-project-pr-final/SKILL.md`, `closeout-skills.md`, `named-skill-load-contract.test.ts`, `skills.test.ts`

**Verification:** skill validation, contract tests (1089), lint, format, `pnpm --filter oat-docs check` exit 0.

---

### Task p03-t04: (review) Resolve the completion merge-base from the configured base branch

**Status:** completed
**Commit:** 28c375820bcacb504d616b99fe6cf662dbf5a881

**Outcome (required when completed):**

- Step 7 resolves `BASE_BRANCH` before the merge-base (`origin/$BASE_BRANCH`, then `$BASE_BRANCH`); Step 11 reuses it, re-resolves on resume routes that skip Step 7, and refuses an empty base; docs no longer say "against `main`".

**Files changed:**

- `.agents/skills/oat-project-complete/SKILL.md`, `apps/oat-docs/docs/workflows/projects/closeout/closeout-skills.md`

**Verification:** no `origin/main` / `merge-base main` / `--base main` match; skill validation, contract tests (1089), lint, format, skill-bump check, docs check exit 0; forced CLI suite exit 0.

### Review Received: p03

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p03-code-review-2026-11-01T000944Z.md, re-review reviews/archived/p03-code-review-2026-11-01T002455Z.md

**Findings:** Critical 0 · High 1 · Medium 2 · Low 2 (round 1); Critical 0 · High 0 · Medium 0 · Low 2 (round 2)

- H1 (High): Step 7 merge-base hardcoded `origin/main` → fix task p03-t04; resolved.
- M1 (Medium): `closeout-skills.md` said "against `main`" → fixed in p03-t04.
- M2 (Medium): the shared base-branch chain's `origin/HEAD` step never runs because `oat config get git.defaultBranch` prints its default `main` (pre-existing; same chain in pr-final and pr-progress) → out of this item's scope; recorded under Deferred Findings as a follow-up.
- L1 (Low): `oat-directory-structure.md` `git.defaultBranch` row omits `oat-project-complete` → p05 docs.
- L2 (Low): no contract test pins complete's `--base "$BASE_BRANCH"` → optional; not added.
- R2-L1, R2-L2 (Low): Step 11's resume note names one route; the standalone `:?` guard does not stop an interactive line-by-line shell → recorded under Deferred Findings.

**Outcome:** passed (round 2, request `wave1-p03-review-2`)

---

## Phase 4: Exact-path commits and isolated test HOME

**Status:** complete
**Started:** 2026-10-31
**Worktree:** `.worktrees/wave1-p04` (branch `fix/wave-1-correctness-20261031-p04`), merged `--no-ff` at fan-in

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- `oat internal commit-paths` stages paths already tracked in `HEAD` with Git's force flag and everything else normally, so tracked files under ignored directories commit and untracked ignored paths are still refused.
- `.lintstagedrc.mjs` excludes `packages/cli/assets/**` from the `*.md` and `*.json` tasks, so the pre-commit hook's re-stage no longer fails on tracked template files (oxfmt already ignored that path).
- `pnpm test:evidence` runs the forced turbo test through `scripts/with-isolated-home.sh`, which removes the temporary HOME on success, failure, `INT` and `TERM`; AGENTS.md points both isolated-HOME recipes at it.

**Key files touched:**

- `packages/cli/src/commands/shared/exact-path-commit.ts` and test
- `.lintstagedrc.mjs`
- `scripts/with-isolated-home.sh`, `scripts/with-isolated-home.test.mjs`, root `package.json`, root `AGENTS.md`
- `apps/oat-docs/docs/reference/cli-reference.md` (exact-path section)

**Verification:** forced CLI suite exit 0 (431 files / 9219 tests); `pnpm test:scripts` exit 0 (6 of 6).

**Notes / Decisions:**

- Real-hook probe adjustments (see Deviations): pass criteria observed lint-staged's log; the `*.md` task no longer matches templates after the config fix, so a README variant proved the task still runs; commit message `chore: probe <n>` (commitlint rejects `probe`).

### Task p04-t01: Stage tracked files under ignored directories in commit-paths

**Status:** completed
**Commit:** 5abc88a54ae741612c97bd0bad4a4cdc4bf7d1dc

**Outcome (required when completed):**

- Tracked files under ignored directories commit through `commit-paths` with hooks enabled and no `git add -f`; untracked ignored paths are refused.

**Files changed:**

- `packages/cli/src/commands/shared/exact-path-commit.ts` and test; `.lintstagedrc.mjs`; `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:** 47 of 47 tests pass. Negative controls with the built CLI in a scratch repository (`.gitignore` `assets/*`, tracked `assets/templates/t.md`): pre-fix modify and delete of the tracked file exit 2 "The following paths are ignored"; post-fix both `committed`; untracked ignored `new.md` refused (exit 2) before and after; untracked non-ignored file commits (accepted control). Guard probes: (a) split removed → 3 tracked-file tests fail; (b) force-add all → refusal test fails; restored. Real-hook probe: at base, lint-staged logged `[FAILED] The following paths are ignored … packages/cli/assets/templates` yet `lint-staged-exit=0`; after the config fix, a template commit was `committed` with `lint-staged-exit=0`, byte-exact blob, and a README variant showed the `*.md` task re-staging oxfmt output. Probe worktrees removed; probe commits on no branch.

---

### Task p04-t02: Add an isolated-HOME wrapper and pnpm test:evidence

**Status:** completed
**Commit:** e7a16361fecf3129061d03d9316dbab8cb3cbb06

**Outcome (required when completed):**

- `scripts/with-isolated-home.sh` owns the temporary HOME; `pnpm test:evidence` and `test:scripts` include it; AGENTS.md updated.

**Files changed:**

- `scripts/with-isolated-home.sh`, `scripts/with-isolated-home.test.mjs`, root `package.json`, root `AGENTS.md`

**Verification:** `pnpm test:scripts` 6 of 6 pass; shellcheck, oxlint exit 0. Guard-can-fail: `EXIT` trap removed → 4 removal tests fail; restored 5 of 5 pass.

### Review Received: p04

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p04-code-review-2026-11-01T001445Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 3

- L1 (Low): the plan's literal probe criteria were stale after the approved config fix → recorded under Deviations.
- L2 (Low): `TERM` sent only to the wrapper PID waits for the command → recorded under Deferred Findings (script header documents it).
- L3 (Low): one lint-staged re-stage test needs an explanatory comment → recorded under Deferred Findings.

**Outcome:** passed (request `wave1-p04-review-1`; reviewer re-verified staging safety for index-only, rename, case-variant and glob-pathspec cases)

---

## Phase 5: Integration — docs, generated views, release, close-out

**Status:** complete
**Started:** 2026-11-01

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Docs and READMEs describe the shipped behavior: agent delete/rename cleanup (manual-cleanup warnings removed), kept Codex user values, install-scope semantics, `init --setup` without `gh`, corrected messages, and `oat sync --scope project` guidance; fixed "Known surprises in 0.3.14" entries removed (heading kept for anchors).
- This repository's five canonical-derived `.codex/agents/*.toml` files carry `# oat-owner: project-config`.
- Lockstep bump of the five public packages to 0.3.39; all seven Wave 1 backlog items archived.

**Key files touched:**

- `README.md`, `apps/oat-docs/docs/reference/what-oat-writes.md`, `provider-sync/{manifest-and-drift,pilot-with-a-team,providers,scope-and-surface,commands}.md`, `getting-started/{tool-packs,bootstrap}.md`, `reference/{troubleshooting,oat-directory-structure}.md`, `workflows/projects/execution/implementation-execution.md`
- `.codex/agents/*.toml` (5), `.oat/sync/manifest.json`
- `packages/*/package.json` (5), `packages/cli/assets/public-package-versions.json`
- `.oat/repo/pjm/backlog/{items,archived}/` (7 moves), `completed.md`, `index.md`

**Verification:** Definition of Done gates (phase-end check) all exit 0 — see `## Reviews and Gates`.

**Notes / Decisions:**

- `oat pjm doctor` exits 1 only on the pre-existing `pjm:backlog_completed_unarchived` warning (11 older items, present before this close-out); none of the seven Wave 1 items are involved.
- Commits used the branch-built CLI (`node packages/cli/dist/index.js internal commit-paths`), since PATH `oat` 0.3.37 predates the p04-t01 fix.

### Task p05-t01: Update docs that describe the fixed behavior

**Status:** completed
**Commit:** 3edc770270fd5acad05b21110ca26cbe75169168

**Outcome (required when completed):**

- Delta-analyzed docs against merged code and tests; only now-false claims changed; review notes p01 L2, p02 L3, p03 L1 and the pre-0.3.39 ownerless Codex role caveat covered.

**Files changed:**

- `README.md` and 11 pages under `apps/oat-docs/docs/`

**Verification:** `pnpm --filter oat-docs docs:check` exit 0 (0 errors, 2 fewer warnings than base); `pnpm --filter oat-docs check` exit 0; generated `apps/oat-docs/index.md` unchanged. Built-CLI scratch checks: `tools remove --pack workflows` dropped Codex roles/tables 69 → 0; `tools install core --scope project` exits 1 with no HOME writes.

---

### Task p05-t02: Refresh this repository's generated provider views

**Status:** completed
**Commit:** ef3acc10490a4d2e193a60fc3cb0f71fe97bf190

**Outcome (required when completed):**

- Five canonical-derived `.codex/agents/*.toml` gained the owner header; `.codex/config.toml` unchanged.

**Files changed:**

- `.codex/agents/{oat-codebase-mapper,oat-phase-implementer,oat-reviewer,recon-worker,skeptical-evaluator}.toml`

**Verification:** `cli:source -- sync --scope project` exit 0; second run "No changes required"; `cli:source -- status --scope project` exit 0.

---

### Task p05-t03: Lockstep version bump to 0.3.39

**Status:** completed
**Commit:** fce8224c31b86b7ddc0fb21514f3ede247010429

**Outcome (required when completed):**

- Five public packages and `public-package-versions.json` at 0.3.39; manifest `oatVersion` restamped.

**Files changed:**

- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/sync/manifest.json`

**Verification:** `pnpm release:check-versions` exit 0 (after `git fetch origin main`); `pnpm run check:skill-bumps` exit 0; `pnpm release:validate` exit 0.

---

### Task p05-t04: Archive the delivered backlog items

**Status:** completed
**Commit:** c1f06b07340e795cb5dc5ee624e706cbfc191368

**Outcome (required when completed):**

- All seven items archived with outcome summaries; one exact-path commit of the 16-path `affectedPaths` union.

**Files changed:**

- `.oat/repo/pjm/backlog/items/` → `archived/` (7), `.oat/repo/pjm/backlog/completed.md`, `.oat/repo/pjm/backlog/index.md`

**Verification:** 7 archive runs exit 0; `cli:source -- pjm doctor --json` reports no drift from these items (pre-existing unrelated warning only).

---

### Task p05-t05: (review) Correct remaining stale and inaccurate docs claims

**Status:** completed
**Commit:** 772ced76e13d4d732e0714dfed3417930e79b63a

**Outcome (required when completed):**

- `scope-and-surface.md` describes the 0.3.39 cleanup; `bootstrap.md` matches the current `--no-hook` help; `manifest-and-drift.md` limits link restoration to base agent views; `packages/cli/README.md` Quick Start uses `--scope project`.

**Files changed:**

- `apps/oat-docs/docs/provider-sync/scope-and-surface.md`, `apps/oat-docs/docs/getting-started/bootstrap.md`, `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`, `packages/cli/README.md`

**Verification:** docs check exit 0 (0 errors); `pnpm --filter oat-docs check` exit 0; `pnpm format` exit 0; docs index unchanged.

---

### Task p05-t06: (review) Note that dangling Codex role links still stop sync

**Status:** completed
**Commit:** 0fde958c85c3dafd9db741f9d0d6ab4a258be9d2

**Outcome (required when completed):**

- The dangling-link note says sync cannot write a generated Cursor variant or Codex role through a dangling link and exits 1 (`failed` / `missing`) until the link is deleted.

**Files changed:**

- `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`

**Verification:** `pnpm --filter oat-docs check` exit 0; docs check exit 0.

**Notes / Decisions:**

- Implemented in the root (small docs-only review fix; see the `Root-inline` line under Orchestration Runs).

### Review Received: p05

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/p05-code-review-2026-11-01T005919Z.md, re-review reviews/archived/p05-code-review-2026-11-01T010437Z.md

**Findings:** Critical 0 · High 0 · Medium 3 · Low 1 (round 1); Critical 0 · High 0 · Medium 1 · Low 0 (round 2)

- M1–M3 (Medium): stale cleanup warning in `scope-and-surface.md`, stale `--no-hook` quote in `bootstrap.md`, dangling-link overclaim in `manifest-and-drift.md` → fix task p05-t05; resolved in round 2.
- L1 (Low): `packages/cli/README.md` Quick Start used `oat sync --scope all` → fixed in p05-t05.
- R2-M1 (Medium): the note still said a dangling `.codex/agents/` link no longer stops sync → fix task p05-t06 (not re-reviewed by the phase loop; covered by the final review).

**Outcome:** passed (no Critical/High in either round); fixes completed through p05-t06

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=wave1-p01-implementation · scope=p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=root-restored-clean-base-1,p01-review-fix-1,exit-gate-fix-1 · observed=~ · match=~
- run/v1 · request=wave1-p02-implementation · scope=p02 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p03-implementation · scope=p03 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=root-restored-clean-base-1,p03-review-fix-1 · observed=~ · match=~
- run/v1 · request=wave1-p04-implementation · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=root-restored-clean-base-1 · observed=~ · match=~
- run/v1 · request=wave1-p01-review-1 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p01-review-2 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p02-review-1 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p03-review-1 · scope=p03 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p03-review-2 · scope=p03 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p04-review-1 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-plan-artifact-review-1 · scope=plan · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-plan-artifact-review-2 · scope=plan · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-plan-artifact-review-3 · scope=plan · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p05-implementation · scope=p05 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=p05-review-fix-1 · observed=~ · match=~
- run/v1 · request=wave1-p05-review-1 · scope=p05 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p05 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=wave1-p05-review-2 · scope=p05 · action=review · role=oat-reviewer · target=oat-reviewer-claude-opus-5-5-high · model=claude-opus-5-5-high · effort=~ · stamp=Dispatch: scope=p05 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-reviewer-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- Root-inline phase: p05 task p05-t06 (review fix) — reason: one-sentence docs correction for review R2-M1 after the p05 fix loop; root model claude-opus-5-5 (Cursor). No child launched.
- Root-inline phase: p01 task p01-t06 (review fix) — reason: one-line regression found while validating the p01-t05 commit; root model claude-opus-5-5 (Cursor). No child launched.

<!-- orchestration-runs-end -->

## Reviews and Gates

<!-- Receipts for final and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

### Review Received: plan

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/artifact-plan-review-2026-10-31T230813Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

- No findings. The configured quick-start gate (`oat gate review`, artifact
  plan, threshold high, `onFailure: block`, run
  `233bfcac-2b80-4c9b-8919-8e7fb72e937d`, target `codex-6-sol-xhigh`, inline
  Codex route) reviewed plan head `b37cd7c49b32083f10e7d1794d2c9d92baa01966`
  and reported no blocking findings; envelope `status: ok`,
  `receiveEligible: true`, corroborated handoff.

**Outcome:** passed

- Gate `oat-project-quick-start` (autonomy `QS-*` gate execution): attempt 1
  of 2, `allowed/passed`, recorded in `state.md` `oat_quick_start_gate`.
- Pre-gate plan artifact review (Auto Artifact-Review Loop): three cycles with
  native `oat-reviewer-claude-opus-5-5-high`; dispositions recorded in
  `plan.md` `## Reviews`. Autonomy gates `QS-04` (straight to plan), `QS-05`
  (requirements auto-confirmed) and `QS-11` (Medium/Low fixes applied) are
  recorded in `discovery.md` and `plan.md`.

- Parallel group `[p01, p02, p03, p04]` fan-in (2026-11-01): base `ae94cfb0d4638b067deadabece6054226b9ff9de`; merged `--no-ff` in plan order (p01 `079951602`, p02 `671797a41`, p03 `80d09d048`, p04 `130cae1bf`) with no conflicts and no cross-branch file overlap. Integration verification: `pnpm build` exit 0; `bash scripts/with-isolated-home.sh pnpm exec turbo run test --force --filter=@open-agent-toolkit/cli` exit 0 (437 files / 9276 tests, cache bypassed); `pnpm test:scripts` exit 0; no isolated HOME left under TMPDIR.
- Autonomy gates in implementation: `IMPLEMENT-03` resolved HiLL checkpoints to `['p05']` with auto-review on; `IMPLEMENT-08` not needed (Cursor native dispatch available without authorization; Tier 1).
- Phase reviews: p01 passed (round 2), p02 passed, p03 passed (round 2), p04 passed; native `oat-reviewer-claude-opus-5-5-high` at the `high` ceiling (same model family as the implementers; the configured cross-family `oat-project-implement` gate reviews the final code).

- Phase 5 phase-end check, Definition of Done gates in CI order (2026-11-01, HEAD `c1f06b07340e795cb5dc5ee624e706cbfc191368`): `pnpm check` exit 0 (0/11 cached); `pnpm type-check` exit 0 (forced rerun exit 0, 0 cached); `pnpm test` exit 0 (test tasks executed, plus smoke, skills, scripts); `pnpm build` exit 0 (forced rerun exit 0, 0/5 cached); `pnpm run check:skill-bumps` exit 0; `git fetch origin main` + `pnpm release:check-versions` exit 0; `pnpm release:validate` exit 0; `pnpm build:docs` exit 0 (forced rerun exit 0, 0/6 cached); docs index regeneration + `git diff --exit-code -- apps/oat-docs/index.md` exit 0. Also `pnpm test:evidence` exit 0 (437 files / 9276 CLI tests, cache bypassed, no HOME left), `pnpm lint` exit 0, `pnpm format` exit 0. No cross-phase reconciliation task needed.

### Review Received: final

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/final-review-2026-11-01T012159Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 2

- L1 (Low): root `AGENTS.md:9` still says to refresh provider views with `oat sync --scope all`; it is the repository's hand-written maintainer instruction, not the generated guidance block the item names → not changed (outside BL-261002-correct-misleading-init-status; maintainers here use user-scope packs); recorded under Deferred Findings.
- L2 (Low): the Phase 5 Progress Overview row lagged (refresh-only) → refreshed in this bookkeeping.
- Deferred ledger: all eight deferred entries judged acceptable to defer, including the one Medium (base-branch chain masked by `oat config get` defaults), which should be filed as a backlog item at closeout.

**Outcome:** passed

- Gate `IMPLEMENT-11` (autonomous final review): route native Cursor `oat-reviewer-claude-opus-5-5-high` (resolver-selected `high` reviewer ceiling, same model family as the implementers; cross-family independence comes from the configured `oat-project-implement` exit gate), request `wave1-final-review-1`, scope `final` `1056ccb18683548a4cdc5d5e81f82a6346defe8e..63b8bf8ca44f353597c843c8cb8247e853dc7d05`.

### Review Received: final (implementation exit gate, run b066376d-1060-4d4b-b0de-1dac7fe96d0f)

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/final-review-2026-11-01T012851Z.md

**Findings:** Critical 0 · High 0 · Medium 1 · Low 0

- M1 (Medium): pack removal derives the removed Codex role from the Markdown filename, so a removed agent whose frontmatter `name` differs leaves its generated role and `[agents.*]` table until the next full sync (independently probed by the gate reviewer; incomplete coverage of BL-261002-clean-up-stale-provider-views criterion 2) → fix task p01-t05 (autonomy `REVIEWRECEIVE-04`: converted, not deferred).

**Outcome:** fixes queued: p01-t05

- **Gate:** oat-project-implement · **Scope:** final · **Outcome:** generation 1 envelope `ok` (`review_completed_gate_passed`, threshold high, target `codex-6-sol-xhigh`, different-family) · attempt 1 of 2; receive queued p01-t05, so the generation goes stale when the fix lands and a new generation reruns final verification, final review and the gate.

### Review Received: final (re-review after exit gate fixes)

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/final-review-2026-11-01T015001Z.md (narrowed `63b8bf8ca44f353597c843c8cb8247e853dc7d05..5ac69c397894b9e0757d2481b260ba689c38911e`, builds on reviews/archived/final-review-2026-11-01T012159Z.md)

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

- Exit gate M1: resolved by p01-t05 (reviewer re-ran the gate probe with the built CLI: `declared-role.toml` and its table removed by `oat tools remove --pack workflows --scope project`; present-agent roles, user-authored tables and install syncs unaffected; user-scope pack removal exits 0 and removes only that pack's `user-config` role).
- L1 (Low): p01-t06 wording overstated CLI reachability → corrected in `plan.md` and this journal.

**Outcome:** passed (request `wave1-final-review-2`); `IMPLEMENT-11` re-run with the same native route.

### Review Received: final (implementation exit gate, run 55df7ef0-1867-448a-ae66-a8f39e483790)

**Date:** 2026-11-01
**Review artifact (local-only):** reviews/archived/final-review-2026-11-01T015445Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 0

- No findings (different-family reviewer `codex-6-sol-xhigh`, Codex `gpt-6.1-sol` xhigh; reviewed head `b72c8fc983546455ff511f797a2478b4631eb9c2`).

**Outcome:** passed

- **Gate:** oat-project-implement · **Scope:** final · **Outcome:** generation 2 `allowed/passed` (envelope `ok`, `review_completed_gate_passed`, threshold high) · attempt 1 of 2 · no waivers.

- Gate `IMPLEMENT-16` (autonomous final HiLL approval, final phase `p05`): approved by `oat-autonomous` after pre-approval steps summary, document and pr completed; references the passed final review `reviews/archived/final-review-2026-11-01T015001Z.md` (request `wave1-final-review-2`) and the allowed implementation exit gate generation 2 (run `55df7ef0-1867-448a-ae66-a8f39e483790`). Recap gate: persisted `oat_project_recap: skip/interactive` (operator choice at kickoff); `check-terminal-outcome.mjs --intent skip --skip-reason interactive` → ok. PR: https://github.com/voxmedia/open-agent-toolkit/pull/395.

- External PR review on https://github.com/voxmedia/open-agent-toolkit/pull/395 (`warp-factories[bot]`, CHANGES_REQUESTED on `68fc0c5fb17187ee6c797cdd9fa3d9802b40a5ae`, after closeout): 2 critical findings in `packages/cli/src/providers/codex/codec/sync-extension.ts` `collectStaleManagedRoles`, both reproduced by the root with a throwaway probe (not committed): (1) the directory scan marks a role stale from a leftover owner-stamped `.codex/agents/<name>.toml` and `mergeCodexConfig` then deletes `[agents.<name>]` even when the user re-pointed that table at an unmanaged `config_file` (violates BL-261002-clean-up-stale-provider-views "user-authored tables untouched"); (2) stale-role `rm` follows a symlinked `.codex/agents` and deletes files outside the sync scope (eligibility widened by p01-t02 to `supported-catalogue` and stamped canonical roles). Unresolved — autonomy boundary `unresolved-critical-findings`; the post-PR feedback owner `oat-project-revise` has no autonomous gate-inventory rows. Operator action: run `oat-project-revise` with the GitHub PR comments (or authorize a revision phase), then re-run final review and the implementation exit gate.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- p02 L1: the EPIPE handler exits 0 even if the command had already set a failing exit code (visible only under `set -o pipefail`); follow-up candidate, not required by BL-261002-correct-misleading-init-status.
- p02 L2: `packs:inventory` remedy text is duplicated in `commands/status/index.ts` and `commands/doctor/index.ts`; follow-up refactor.
- p03 M2: `oat config get git.defaultBranch` prints its built-in default `main` and exits 0 when unset, so the `origin/HEAD` step of the base-branch chain in `oat-project-pr-final`, `oat-project-pr-progress` and `oat-project-complete` never runs; pre-existing and outside BL-261002-align-implement-complete (which requires complete to match the PR skills, which it now does). Follow-up: backlog item for the operator.
- p03 (implementer note): `oat-project-pr-final` Step 3 still computes its merge-base against `origin/main`, and `oat-docs-apply` and `oat-agent-instructions-apply` hardcode `gh pr create --base main`; outside this item. Follow-up: same backlog item.
- p03 R2-L1/L2: Step 11's resume note names one skip route; the standalone `: "${BASE_BRANCH:?…}"` guard does not stop an interactive line-by-line shell. Polish follow-up.
- p04 L2: a `TERM` sent only to the wrapper PID waits for the child to finish before cleanup (documented in the script header). p04 L3: add a comment to the lint-staged re-stage unit test.
- p02 note: the EPIPE handler does not treat `ENOTCONN` as quiet; separate decision if it is observed in practice.

- final L1: root `AGENTS.md:9` hand-written maintainer line recommends `oat sync --scope all`; outside the item (which names the generated guidance block); leave to maintainers.

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review           | Source Artifact                 | Planned / Documented                                           | Actual / Accepted                                                                                                                                                                                                                                                           | Reason                                                                                                                                                          | Source of Truth | Follow-up                          |
| ----------------------- | ------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------- |
| p01-t01 / review p01 L2 | plan.md p01-t01 Step 2          | Keep the colliding-link refusal                                | A dangling link whose name collides with a desired role is skipped too; main sync replaces it with a managed link                                                                                                                                                           | A dangling link cannot define a role and nothing is written outside the repository (reviewer probe)                                                             | Implementation  | p05 docs describe shipped behavior |
| p04-t01 real-hook probe | plan.md p04-t01 probe steps 3-4 | `--message probe`; log shows the `*.md` task on `plan-lite.md` | Conventional message `chore: probe <n>`; after the in-boundary `.lintstagedrc.mjs` fix the `*.md` task no longer matches templates, so a README variant proved the task still runs and re-stages                                                                            | commitlint rejects `probe`; the plan's own fallback (fix the hook config) changes the observable criterion                                                      | Implementation  | None                               |
| p04-t01 files           | plan.md p04-t01 Files           | exact-path-commit source/test, cli-reference.md                | Also `.lintstagedrc.mjs`                                                                                                                                                                                                                                                    | Real-hook probe showed lint-staged's re-stage failing on tracked templates; allowed by the Phase 4 boundary                                                     | Implementation  | None                               |
| p01, p03, p04 dispatch  | phase-execution contract        | Implementer starts on a clean worktree                         | First attempts left partial uncommitted work and the implementers stopped BLOCKED at preflight; root saved the diffs to `/tmp/wave1-abandoned/`, restored clean trees, and continued each through its accepted handle (`root-restored-clean-base-1`); no replacement launch | Abandoned partial output of this run's own children (no writer for 25+ minutes), replaceable; one p01 untracked partial test file was not copied before removal | Implementation  | Learning recorded in project-log   |

## Final Summary (for PR/docs)

**What shipped:**

- Provider sync cleans up after a deleted or renamed canonical agent: dangling agent links no longer abort `oat sync`, `--dry-run` or `oat status`; stale `.claude/`, `.cursor/` and `.github/agents/` views, Codex role files, variants and `[agents.*]` tables are removed on full sync and on pack removal (BL-261002-clean-up-stale-provider-views).
- `oat sync` and `oat providers codex materialize` keep explicit `[features] multi_agent` and `[agents] max_depth` values, add only absent keys, and report each added key, conflict and note (BL-261002-stop-oat-sync-from-changing).
- `oat tools install` and `oat init --setup` honor the requested scope: no-allowed-scope installs exit 1, explicit `--scope` writes only that scope, help states the real default, and `init --setup` never runs `gh` (BL-261002-honor-the-requested-scope).
- Corrected `--no-hook` help, adopter-runnable `packs:inventory` remedies, a `skipped_local_scope` scaffold status, quiet exit on `EPIPE`, and project-scope sync in `scripts/worktree/init.sh` and the AGENTS.md guidance block (BL-261002-correct-misleading-init-status).
- Skill contracts match behavior: no `--retry-limit` hint in `oat-project-implement`, config-resolved base branch in `oat-project-complete`, accurate `oat-project-pr-final` usage text (BL-261002-align-implement-complete).
- `oat internal commit-paths` commits tracked files under ignored directories (untracked ignored paths still refused), and the lint-staged hook no longer breaks on them (BL-261012-commit-paths-should-accept; re-verified as reproducing before work started).
- `pnpm test:evidence` and `scripts/with-isolated-home.sh` remove the evidence-grade temporary HOME on every exit path (BL-261011-clean-up-the-isolated-home).
- Docs, READMEs and this repository's generated Codex views updated; public packages bumped to 0.3.39; all seven backlog items archived.

**Behavioral changes (user-facing):**

- `oat tools install core --scope project` now exits 1 ("core is user-scope only"); aggregate `--scope project` skips core; JSON gains `skippedPacks` and recovery code `scope-not-allowed`.
- Explicit `--scope project|user` no longer touches the other scope's existing placement (no project `localPaths` / `.gitignore` writes under `--scope user`).
- Codex canonical role files carry `# oat-owner: project-config` (or `user-config`), a one-line change on first sync.
- Sync output names Codex config keys it added and user values it kept (`multi_agent = false` conflict, `max_depth < 1` conflict, `max_depth = 1` note).
- `oat project new --scope local` reports `skipped_local_scope`.
- `oat … | head` exits 0 quietly.

**Key files / modules:**

- `packages/cli/src/providers/cursor/codec/materialize.ts`, `providers/codex/codec/{sync-extension,config-merge}.ts` - sync cleanup and Codex config
- `packages/cli/src/commands/init/tools/index.ts`, `commands/init/index.ts`, `config/oat-config.ts` - install scope and guided setup
- `packages/cli/src/index.ts`, `commands/status/index.ts`, `commands/doctor/index.ts`, `commands/project/new/*` - messages and EPIPE
- `packages/cli/src/commands/shared/exact-path-commit.ts`, `.lintstagedrc.mjs` - exact-path commits
- `scripts/with-isolated-home.sh`, `package.json`, `AGENTS.md`, `scripts/worktree/init.sh` - test HOME and scripts
- `.agents/skills/oat-project-{implement,complete,pr-final}/SKILL.md` - skill contracts

**Verification performed:**

- Every task: focused vitest with an isolated HOME, CLI lint and type-check; guard-can-fail probes for every new guard; negative controls (pre-fix bad state, post-fix rejection, accepted control) for the install-scope and exact-path commit changes, and a real lint-staged hook probe.
- Phase-end forced CLI suites per phase; post-fan-in integration (437 files / 9276 tests).
- All nine Definition of Done gates exit 0 at `c1f06b073` (with forced reruns where turbo replayed cache), plus `pnpm test:evidence`, `pnpm lint`, `pnpm format`; docs checks after the p05 docs fixes.

**Design deltas (if any):**

- None (quick mode; no design.md). Plan deviations are recorded under `## Deviations from Plan / Design`.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
