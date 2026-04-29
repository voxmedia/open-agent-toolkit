---
oat_status: in_progress
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-27
oat_current_task_id: null
oat_generated: false
---

# Implementation: skill-cli-migration

**Started:** 2026-04-24
**Last Updated:** 2026-04-24

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

| Phase        | Status   | Tasks | Completed |
| ------------ | -------- | ----- | --------- |
| Phase 1      | complete | 2     | 2/2       |
| Phase 2      | complete | 2     | 2/2       |
| Phase 3      | complete | 5     | 5/5       |
| Phase 4      | complete | 3     | 3/3       |
| Review Fixes | complete | 4     | 4/4       |
| Revision 2   | complete | 4     | 4/4       |
| Rev2 Fixes   | complete | 3     | 3/3       |

**Total:** 23/23 tasks completed

## Review Notes

### Review Received: plan (artifact)

**Date:** 2026-04-24
**Review artifact:** `reviews/archived/artifact-plan-review-2026-04-24.md`

**Findings:**

- Critical: 1
- Important: 3
- Medium: 0
- Minor: 1

**Disposition map (all `resolve_in_artifact`):**

- `C1` — canonical `npx` fallback rewritten as `if command -v oat; then ...; else npx ...; fi` in p01-t01; p04-t02 now executes the real fallback branch with `oat` removed from `$PATH` rather than just echoing the resolved string.
- `I1` — dropped `// ""` defaults from every `jq -r` extraction in the plan (p01-t01 canonical snippet, p02-t01/t02, p03-t02 guidance). Contract is now: YAML `null` surfaces as the literal string `null` via both `grep | awk` and `jq -r`, matching prior behavior.
- `I2` — changed the filtered vitest command to use a package-relative path (`src/commands/project/status.test.ts`) in p01-t02's Step-1 and Step-4 invocations.
- `I3` — Reviews table now includes a `plan | artifact | fixes_completed` row pointing at the archived review path, and `spec`/`design` rows are marked `n/a` for quick mode rather than `pending`.
- `m1` — p04-t01 now lists `implementation.md` as a modified file; p04-t02's empty commit replaced with a real implementation.md append + commit.

**No plan fix tasks added** — artifact review; all findings were resolved directly in `plan.md`.

**Next:** Re-run `oat-project-review-provide artifact plan` if a re-review is desired, or proceed to `oat-project-implement` to execute the (now-corrected) plan starting from `p01-t01`.

---

### Review Received: p-rev2 (code)

**Date:** 2026-04-27
**Review artifact:** `reviews/archived/p-rev2-review-2026-04-27.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 5

**Disposition map:**

- `m1` Help-snapshot test missing for `oat project status --help` → **convert** → `prev2-t05`. Public CLI contract for the three new flags should be locked in the same way the parent listing is.
- `m2` `--field` silently wins when combined with `--shell` → **convert** → `prev2-t06`. Reject the combination explicitly so future skills cannot misuse the precedence.
- `m3` Empty `--shell` list fall-through is untested → **defer**. Behavior is correct; reviewer flagged optional. Low-probability that commander's variadic semantics regress without a separate signal.
- `m4` `resolveProjectRoot` runs even for absolute `--project-path` → **convert** → `prev2-t07`. Skill callers always run inside a worktree today, but the unused `repoRoot` call is an avoidable surprise for any non-skill caller.
- `m5` `SHELL_ASSIGNMENT_RE` accepts `=` inside the dot path → **defer**. Harmless today (returns `null` for non-existent fields); reviewer flagged optional. Tightening the regex or documenting the constraint can ride along with a future status-CLI change.

**Deferred Findings (Minor):**

- `m3` empty `--shell` list test — defer rationale: current behavior correct, no regression signal expected.
- `m5` `SHELL_ASSIGNMENT_RE` `=`-in-path tolerance — defer rationale: harmless silent `null` today, no real consumer impacted.

**New tasks added:** `prev2-t05`, `prev2-t06`, `prev2-t07`

**Next:** Execute fix tasks via the `oat-project-implement` skill. After completion, update the `p-rev2` Reviews row to `fixes_completed` and re-run `oat-project-review-provide code p-rev2` (re-review will scope to the fix-task commits by default).

---

### Revision Received: Inline Feedback

**Date:** 2026-04-27
**Source:** inline conversation

**Changes requested:**

- Add a general `oat project status --field <path>` capability for arbitrary-depth field reads.
- Add `oat project status --shell NAME=path ...` so skills can fetch multiple fields once without local JSON plumbing.
- Replace verbose per-skill JSON/fallback preambles with concise CLI-owned field/shell reads.
- Document that skills assume `oat` is on `PATH`, and document an `npx @open-agent-toolkit/cli`-backed `oat` shim for CI/cloud environments.

**New tasks added:** `prev2-t01`, `prev2-t02`, `prev2-t03`, `prev2-t04`

**Next:** Execute revision tasks via the `oat-project-implement` skill.

---

## Phase 1: Pattern documentation and CLI contract lock

**Status:** complete
**Started:** 2026-04-27
**Completed:** 2026-04-27

### Phase Summary

**Outcome (what changed):**

- Documented the canonical `oat --json project status` preamble in `create-oat-skill/SKILL.md` so future skills consume project state via the CLI rather than hand-parsing `state.md`.
- Locked the JSON contract with a vitest test that asserts every key migrated skills will read (`MIGRATED_FIELDS`) is present in the `status: ok` payload (value may be `null`).

**Key files touched:**

- `.agents/skills/create-oat-skill/SKILL.md` — added "Reading project state" section + bumped `version: 1.2.0 → 1.2.1`.
- `packages/cli/src/commands/project/status.test.ts` — added `MIGRATED_FIELDS` constant + contract-presence test using a `hasPath` walker.

**Verification:**

- `pnpm lint` → pass (10 tasks, 0 warnings, 0 errors)
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts` → 4/4 pass
- `pnpm --filter @open-agent-toolkit/cli type-check` → clean

**Notes / Decisions:**

- Used `hasPath` walker rather than `toMatchObject` so a removed key surfaces as a real failure (toMatchObject only checks subset of present keys).
- Reviewer flagged 1 minor (non-blocking) finding; recorded in `reviews/archived/p01-code-review-2026-04-27.md`.

### Task p01-t01: Document the canonical inline preamble pattern

**Status:** completed
**Commit:** 19b0bd35

**Outcome:**

- `create-oat-skill` skill now ships the canonical preamble (with `command -v oat` branching and no `// ""` defaults) and the contract notes about null-sentinel parity.

**Files changed:**

- `.agents/skills/create-oat-skill/SKILL.md`

**Verification:**

- `pnpm lint` → pass

---

### Task p01-t02: Lock the JSON contract with a CLI test

**Status:** completed
**Commit:** 92e6b53c

**Outcome:**

- New test asserts each `MIGRATED_FIELDS` path exists in the `status: ok` payload regardless of value (including `null`), preventing accidental key removal in future CLI changes.

**Files changed:**

- `packages/cli/src/commands/project/status.test.ts`

**Verification:**

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts` → 4/4 pass
- `pnpm --filter @open-agent-toolkit/cli type-check` → clean

---

## Phase 2: Migrate pure-read skills

**Status:** complete
**Started:** 2026-04-27
**Completed:** 2026-04-27

### Phase Summary

**Outcome (what changed):**

- `oat-project-progress` and `oat-project-pr-progress` now read project state via `oat --json project status` (with the canonical `npx @open-agent-toolkit/cli` fallback) instead of hand-parsing `state.md` with `grep | awk`.
- Both skills are version-bumped per AGENTS.md.

**Key files touched:**

- `.agents/skills/oat-project-progress/SKILL.md` — preamble + `LAST_SHA` (and the plan-named PHASE / PHASE_STATUS / WORKFLOW_MODE) sourced from `STATUS_JSON`. Version 1.2.2 → 1.2.3.
- `.agents/skills/oat-project-pr-progress/SKILL.md` — preamble + `WORKFLOW_MODE` from `STATUS_JSON`. Version 1.2.0 → 1.2.1.

**Verification:**

- `pnpm lint` after each task → pass.
- Probes (`oat --json project status | jq -r ...` vs the equivalent `grep | awk` against this project's `state.md`) → behavioral parity confirmed (`implement / in_progress / quick`).

**Notes / Decisions:**

- p02-t01 plan named three grep lines that did not actually exist in the skill (only `LAST_SHA` did). The implementer migrated the real grep AND added the plan-named variables alongside `LAST_SHA` so the canonical preamble's contract is fully realized in the file. Reviewer flagged this as Minor; left in to match the plan's intent.
- p02-t02 preserved the original `WORKFLOW_MODE=${WORKFLOW_MODE:-spec-driven}` bash fallback. Because `jq -r` emits the literal string `null` (not empty), this bash default no longer fires in the error path — consistent with the plan's "single sentinel `null`" contract. Reviewer flagged as Minor (dead code); left for a follow-up sweep.

### Task p02-t01: Migrate `oat-project-progress` to oat --json

**Status:** completed
**Commit:** e80f1a58

**Outcome:**

- Skill no longer hand-parses `state.md`; reads `oat_last_commit` (and the canonical PHASE / PHASE_STATUS / WORKFLOW_MODE) from `oat --json project status`.

**Files changed:**

- `.agents/skills/oat-project-progress/SKILL.md`

**Verification:**

- `pnpm lint` → pass; behavioral-parity probe → identical values.

---

### Task p02-t02: Migrate `oat-project-pr-progress` to oat --json

**Status:** completed
**Commit:** 742092f7

**Outcome:**

- Skill resolves `WORKFLOW_MODE` via `oat --json project status` once; downstream PR-progress logic untouched.

**Files changed:**

- `.agents/skills/oat-project-pr-progress/SKILL.md`

**Verification:**

- `pnpm lint` → pass; probe parity confirmed (`quick` / `quick`).

---

## Phase 3: Migrate mixed read/write skills (read path only)

**Status:** complete
**Started:** 2026-04-27
**Completed:** 2026-04-27

### Phase Summary

**Outcome (what changed):**

- Five mixed read/write skills (`oat-project-plan`, `oat-project-pr-final`, `oat-project-review-provide`, `oat-project-reconcile`, `oat-project-complete`) now read project state via `oat --json project status` with the canonical `npx` fallback. Write paths (frontmatter updates, `oat_pr_status` / `oat_pr_url` / `oat_project_completed` writes) are unchanged.
- Behavioral parity verified live for every migrated field (workflowMode, phase, phaseStatus, docsUpdated, lastCommit).

**Key files touched:**

- `.agents/skills/oat-project-plan/SKILL.md` (1.3.1 → 1.3.2)
- `.agents/skills/oat-project-pr-final/SKILL.md` (1.3.3 → 1.3.4)
- `.agents/skills/oat-project-review-provide/SKILL.md` (1.3.1 → 1.3.2; 2 preambles, 4 fields)
- `.agents/skills/oat-project-reconcile/SKILL.md` (1.0.0 → 1.0.1)
- `.agents/skills/oat-project-complete/SKILL.md` (1.4.3 → 1.4.4)

**Verification:**

- `pnpm lint` after each commit → pass.
- Probes for every migrated field (jq vs grep) → identical values.

**Notes / Decisions:**

- The plan's per-task field bookkeeping was off in two places: `oat_docs_updated` was attributed to p03-t02 but actually lives in `oat-project-complete` (migrated under p03-t05); plan-listed `oat_last_commit` greps in p03-t03 / p03-t04 do not exist (those mentions are inside frontmatter write templates). Net coverage: every actual state.md grep migrated exactly once. Reviewer recorded as Minor (plan-bookkeeping); not blocking.
- p03-t01 dropped the bash `${WORKFLOW_MODE:-spec-driven}` default to match the canonical "no defaults" contract. Downstream logic falls through to spec-driven for any non-`quick`/non-`import` value (including the literal `null` sentinel), so behavior is preserved. Reviewer flagged Minor cross-skill consistency note (p02-t02 kept the bash default).

### Task p03-t01: Migrate `oat-project-plan` read path

**Status:** completed
**Commit:** 362e2605
**Files changed:** `.agents/skills/oat-project-plan/SKILL.md`
**Verification:** `pnpm lint` → pass; `WORKFLOW_MODE` parity confirmed.

### Task p03-t02: Migrate `oat-project-pr-final` read path

**Status:** completed
**Commit:** 87b1ac90
**Files changed:** `.agents/skills/oat-project-pr-final/SKILL.md`
**Verification:** `pnpm lint` → pass; `WORKFLOW_MODE` parity confirmed (only state.md grep present).

### Task p03-t03: Migrate `oat-project-review-provide` read path

**Status:** completed
**Commit:** e13c6a4c
**Files changed:** `.agents/skills/oat-project-review-provide/SKILL.md`
**Verification:** `pnpm lint` → pass; 4 fields across 2 preambles (one per bash block) — all parity confirmed.

### Task p03-t04: Migrate `oat-project-reconcile` read path

**Status:** completed
**Commit:** 2d86cbc9
**Files changed:** `.agents/skills/oat-project-reconcile/SKILL.md`
**Verification:** `pnpm lint` → pass; 2 fields (`oat_phase`, `oat_phase_status`) parity confirmed.

### Task p03-t05: Migrate `oat-project-complete` read path

**Status:** completed
**Commit:** d613c425
**Files changed:** `.agents/skills/oat-project-complete/SKILL.md`
**Verification:** `pnpm lint` → pass; `oat_docs_updated` parity confirmed (downstream `[[ "$DOCS_UPDATED" == "null" ]]` already handles the literal sentinel).

---

## Phase 4: Validation and version bumps

**Status:** complete
**Started:** 2026-04-27
**Completed:** 2026-04-27

### Phase Summary

**Outcome (what changed):**

- Live-smoke-tested every migrated skill preamble against this worktree's project state — full behavioral and null-sentinel parity confirmed.
- Exercised the canonical `npx @open-agent-toolkit/cli` fallback branch end-to-end (with `oat` removed from `$PATH`) — Run B returned the live `workflowMode` (`quick`) through the fallback arm.
- Lockstep public package version bump 0.0.50 → 0.0.53 across `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms` after rebasing onto an `origin/main` that had already advanced the public packages to 0.0.52. `pnpm release:validate` passed for all five.
- Full local check suite (`pnpm lint && pnpm format && pnpm type-check && pnpm test`) → all pass (1357 tests).

**Key files touched:**

- `.oat/projects/shared/skill-cli-migration/implementation.md` — verification checklist + fallback evidence (per plan).
- `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` — lockstep 0.0.53.
- `packages/cli/assets/public-package-versions.json` — regenerated by `release:validate` alongside the bump.

**Notes / Decisions:**

- The plan's literal p04-t02 PATH (`/usr/bin:/bin`) excludes `npx` on nvm-managed hosts, so Run A emitted the `null` swallowed-error sentinel. Implementer captured Run B (PATH stripped of only the `oat`-bearing dir, `npx` retained) as the realistic verification — both runs documented; reviewer accepted as Minor plan-bug follow-up.
- Skill `version:` bumps were already in place from each task's commit, so p04-t03 step 1 was a no-op assertion (per AGENTS.md: one bump per skill in the final PR diff).

### Task p04-t01

Live smoke-tested every migrated skill preamble against this worktree's project state. For each skill, copied the preamble + `jq` extraction block(s) into a fresh shell and confirmed exit code 0, behavioral parity vs `grep | awk` on `state.md`, and null-sentinel parity for null fields.

- [x] `oat-project-progress` — fields: `phase`, `phaseStatus`, `workflowMode`, `lastCommit` → all match grep (`implement / in_progress / quick / d613c425`).
- [x] `oat-project-pr-progress` — field: `workflowMode` → matches grep (`quick`).
- [x] `oat-project-plan` — field: `workflowMode` → matches grep (`quick`).
- [x] `oat-project-pr-final` — fields: `workflowMode`, `docsUpdated` → match grep (`quick`, literal `null`); null-sentinel parity confirmed.
- [x] `oat-project-review-provide` — fields (across 2 preambles): `phase`, `phaseStatus`, `workflowMode` → all match grep.
- [x] `oat-project-reconcile` — fields: `phase`, `phaseStatus` → match grep.
- [x] `oat-project-complete` — field: `docsUpdated` → matches grep (literal `null`); null-sentinel parity confirmed.

### Task p04-t02

Exercised the canonical `npx @open-agent-toolkit/cli` fallback branch end-to-end (the `else` arm of the preamble's `command -v oat` test).

- Run A (literal plan command, `env PATH="/usr/bin:/bin" bash -lc '...'`): the `command -v oat` test correctly took the else branch (proving the fallback arm executed). `npx` was not on `/usr/bin:/bin` on this host, so `npx @open-agent-toolkit/cli ... 2>/dev/null || echo '{}'` swallowed the missing-command error and produced `{}`, which `jq -r '.project.workflowMode'` rendered as the literal `null`. Exit code `0`. Stdout: `null`.
- Run B (PATH stripped of the directory containing `oat` only, retaining node tooling): `command -v oat` again took the else branch; `npx @open-agent-toolkit/cli --json project status` resolved through nvm and returned the live project state. Exit code `0`. Stdout: `quick` — matches the `WORKFLOW_MODE` value read by the in-PATH branch and by `grep | awk` against `state.md`.

Result: the fallback branch is exercised correctly. Run B confirms it produces the expected `quick` for this project when `npx` is reachable. Run A documents that the literal plan PATH (`/usr/bin:/bin`) excludes both `oat` and `npx` on this host (nvm-managed node), which causes the swallowed-error path to emit the `null` sentinel rather than `quick`.

### Task p04-t03

Lockstep public-package version bump (`packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`) from 0.0.50 → 0.0.53 via `jq`/conflict resolution (preserves canonical JSON formatting). All 8 SKILL.md `version:` bumps already in place from earlier task commits, so step 1 was a no-op assertion. The version target became 0.0.53 during the final rebase because `origin/main` had already advanced the public packages to 0.0.52.

Verification:

- `pnpm release:validate` → pass (5 public packages validated).
- `pnpm lint` → pass (10 tasks, 0 warnings, 0 errors).
- `pnpm format` → pass (all matched files use the correct format).
- `pnpm type-check` → pass (10 tasks).
- `pnpm test` → 159 test files / 1357 tests pass.
- `packages/cli/assets/public-package-versions.json` regenerated and committed alongside the bump (pre-existing tracked-but-gitignored repo quirk; not introduced here).

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 2 — 2026-04-27 20:08

**Branch:** feat/skill-cli-migration
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase  | Implementer | Review | Fix Iterations | Disposition |
| ------ | ----------- | ------ | -------------- | ----------- |
| p-rev1 | DONE        | pass   | 0/2            | merged      |

#### Parallel Groups

- All phases sequential

#### Outstanding Items

- None

### Run 1 — 2026-04-27 02:07

**Branch:** feat/skill-cli-migration
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 4 executed, 4 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer            | Review | Fix Iterations | Disposition |
| ----- | ---------------------- | ------ | -------------- | ----------- |
| p01   | DONE                   | pass   | 0/2            | merged      |
| p02   | DONE_WITH_CONCERNS (M) | pass   | 0/2            | merged      |
| p03   | DONE_WITH_CONCERNS (M) | pass   | 0/2            | merged      |
| p04   | DONE_WITH_CONCERNS (M) | pass   | 0/2            | merged      |

#### Parallel Groups

- All phases sequential

#### Outstanding Items

- None

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-04-27

- [x] p01-t01: Document the canonical inline preamble pattern — 19b0bd35
- [x] p01-t02: Lock the JSON contract with a CLI test — 92e6b53c
- [x] p02-t01: Migrate `oat-project-progress` to oat --json — e80f1a58
- [x] p02-t02: Migrate `oat-project-pr-progress` to oat --json — 742092f7
- [x] p03-t01: Migrate `oat-project-plan` read path — 362e2605
- [x] p03-t02: Migrate `oat-project-pr-final` read path — 87b1ac90
- [x] p03-t03: Migrate `oat-project-review-provide` read path — e13c6a4c
- [x] p03-t04: Migrate `oat-project-reconcile` read path — 2d86cbc9
- [x] p03-t05: Migrate `oat-project-complete` read path — d613c425
- [x] p04-t01: Verify migrated skill preambles against live project — d94874f1
- [x] p04-t02: Verify npx fallback branch for oat --json — a6096b93
- [x] p04-t03: Lockstep version bump for skill-cli-migration — e07c871e
- [x] prev1-t01: Fix target-worktree workflow-mode lookup — f10ff87c
- [x] prev1-t02: Remove inert workflow-mode default — d71ffc2b
- [x] prev1-t03: Trim unused progress status extractions — 4b115ad0
- [x] prev1-t04: Normalize reconcile preamble indentation — 4873e5e0

**What changed (high level):**

- Canonical preamble pattern documented in `create-oat-skill` so subsequent skills can paste it verbatim.
- New CLI test locks the JSON contract (`MIGRATED_FIELDS` set) — accidental key removal becomes a real test failure.
- Seven skills (2 pure-read in Phase 2, 5 mixed read/write in Phase 3) now resolve project state via `oat --json project status` with the canonical `npx` fallback. No write paths touched; out-of-scope greps preserved.
- Phase 4: live-smoke verified all 7 migrated preambles, exercised the npx fallback end-to-end, lockstep-bumped 5 public packages 0.0.50 → 0.0.53 after rebase, and ran the full local check suite (lint, format, type-check, 1357 tests, release:validate) — all pass.
- Review fixes: preserved target-worktree workflow-mode lookup behavior in `oat-project-review-provide`, removed inert workflow-mode/default cleanup, trimmed unused progress extractions, and documented the reconcile snippet indentation.

**Decisions:**

- Used a `hasPath` walker rather than `toMatchObject` in the contract test to actually fail on missing keys.
- p02-t01 plan referenced grep lines that didn't exist in the skill; migrated the real grep (`LAST_SHA`) and added the plan-named PHASE/PHASE_STATUS/WORKFLOW_MODE alongside it. Reviewer flagged Minor; not blocking.
- Phase 3 plan/code mismatches (oat_docs_updated location, missing oat_last_commit greps) flagged by implementer and reviewer — net coverage correct, recorded as plan-bookkeeping issues, not implementation defects.
- Phase 4 PATH-trim plan-bug (literal `/usr/bin:/bin` excludes npx on nvm hosts) documented in implementation.md with a more portable Run B that exercises the fallback end-to-end.

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- Eight skills now resolve project state via `oat --json project status` (with a canonical `npx @open-agent-toolkit/cli` fallback) instead of hand-parsing `state.md` with `grep | awk`. The pattern is documented once in `create-oat-skill/SKILL.md` and reused verbatim across all migrated skills.
- A vitest contract test (`MIGRATED_FIELDS`) in `packages/cli/src/commands/project/status.test.ts` locks the JSON keys migrated skills depend on. Removing or renaming any of those keys is now a real test failure rather than a silent runtime break.
- All five lockstep public packages (`cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) bumped 0.0.50 → 0.0.53 after rebasing onto an `origin/main` already at 0.0.52, with `pnpm release:validate` passing for all five.

**Behavioral changes (user-facing):**

- Skills behave identically to the prior `grep | awk` reads (verified field-by-field on every migrated preamble), including null-sentinel parity: YAML `null` in `state.md` surfaces as the literal string `null` via both the prior parser and `jq -r`. No `// ""` defaults, so the contract is stable across success and `oat`-failure paths.
- The CLI fallback path runs `npx @open-agent-toolkit/cli --json project status` when `oat` is not on `$PATH`, allowing skills to function in environments without the CLI installed globally.

**Key files / modules:**

- `.agents/skills/create-oat-skill/SKILL.md` — canonical preamble documentation (1.2.0 → 1.2.1).
- `.agents/skills/oat-project-progress/SKILL.md` (1.2.2 → 1.2.3), `.agents/skills/oat-project-pr-progress/SKILL.md` (1.2.0 → 1.2.1) — pure-read migrations.
- `.agents/skills/oat-project-plan/SKILL.md` (1.3.1 → 1.3.2), `.agents/skills/oat-project-pr-final/SKILL.md` (1.3.3 → 1.3.4), `.agents/skills/oat-project-review-provide/SKILL.md` (1.3.1 → 1.3.2), `.agents/skills/oat-project-reconcile/SKILL.md` (1.0.0 → 1.0.1), `.agents/skills/oat-project-complete/SKILL.md` (1.4.3 → 1.4.4) — mixed read/write migrations (read paths only).
- `packages/cli/src/commands/project/status.test.ts` — `MIGRATED_FIELDS` contract test.
- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json` — lockstep 0.0.53.

**Verification performed:**

- `pnpm lint`, `pnpm format`, `pnpm type-check`, `pnpm test` (1357 tests), `pnpm release:validate` — all pass.
- Live smoke test of every migrated preamble against this worktree's project state (jq vs grep+awk parity, including null-sentinel parity).
- End-to-end exercise of the `npx @open-agent-toolkit/cli` fallback branch with `oat` removed from `$PATH` (Run B → `quick`, exit 0).
- Final code review (auto, Touchpoint B) → pass with 0 Critical, 0 Important, 5 Minor (all carryover, none warrant elevation).
- p-rev1 review-fix phase: `pnpm lint` passed after every task and for the full phase; phase review passed with 0 Critical, 0 Important, 0 Minor.
- Final verification after p-rev1: `pnpm test`, `pnpm lint`, `pnpm type-check`, and `pnpm build` all passed.
- Final re-review (`reviews/archived/final-review-2026-04-27-v2.md`) passed with 0 Critical and 0 Important findings; two deferred Minor follow-ups remain non-blocking.

**Design deltas (if any):**

- None vs the plan goal. The final manual review exposed one path-directed read regression in `oat-project-review-provide`; p-rev1 restored that behavior while leaving the broader JSON migration intact.

## Review Received: final (code, auto)

**Date:** 2026-04-27
**Review artifact:** `reviews/archived/final-code-review-2026-04-27.md`
**Verdict:** pass

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 5 (all carried over from prior phase reviews; none warrant elevation)

**Disposition (auto-disposition mode):**

- All 5 minors are clearly out of scope for this PR (plan-bookkeeping cleanup, dead-code sweep, pre-existing repo gitignore quirk). No fix tasks added.

**Next:** Proceed to `oat-project-document` then `oat-project-pr-final` per `workflow.postImplementSequence: docs-pr` (after HiLL checkpoint approval).

## Review Received: final (code, manual)

**Date:** 2026-04-27
**Review artifact:** `reviews/archived/final-review-2026-04-27.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 5

**New tasks added:** `prev1-t01`, `prev1-t02`, `prev1-t03`, `prev1-t04`

**Disposition map:**

- `I1` — converted to `prev1-t01` to preserve target-worktree workflow-mode validation in `oat-project-review-provide`.
- `m1` — converted to `prev1-t02` because it is negligible and keeps `WORKFLOW_MODE` handling consistent across migrated skills.
- `m2` — converted to `prev1-t03` because it is negligible and trims misleading unused status extractions.
- `m3` — converted to `prev1-t04` because it is negligible and keeps the canonical preamble presentation tidy.
- `m4` — deferred. The fallback verification command issue is stale plan text; implementation notes already record the corrected Run B evidence.
- `m5` — deferred. The tracked-but-gitignored manifest is pre-existing repo hygiene across `packages/cli/assets/`, and fixing it should happen in a dedicated cleanup after deciding the asset tracking contract.

**Deferred Findings:**

- Minor `m4`: defer plan-artifact polish for the p04-t02 PATH trim command.
- Minor `m5`: defer repo hygiene decision for tracked files under ignored `packages/cli/assets/`.

**Next:** Execute fix tasks via the `oat-project-implement` skill, starting with `prev1-t01`.

After the fix tasks are complete:

- Update the final review row status to `fixes_completed`.
- Re-run `oat-project-review-provide code final` then `oat-project-review-receive` to reach `passed`.

## Review Received: p-rev1 (code, auto)

**Date:** 2026-04-27
**Review artifact:** `reviews/archived/p-rev1-review-2026-04-27.md`
**Verdict:** pass

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Disposition:**

- p-rev1 review-fix tasks are complete and passed phase review.
- Final review row is `fixes_completed`; re-run `oat-project-review-provide code final` to confirm final project pass.

## Review Received: final (code, auto re-review)

**Date:** 2026-04-27
**Review artifact:** `reviews/archived/final-review-2026-04-27-v2.md`
**Verdict:** pass

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 2 deferred (not elevated)

**Disposition:**

- Final re-review passed after p-rev1 fixes.
- Deferred Minor `m4`: stale p04-t02 plan PATH example remains non-blocking because implementation records the corrected fallback evidence.
- Deferred Minor `m5`: tracked-but-gitignored `packages/cli/assets/public-package-versions.json` remains a separate repo hygiene follow-up.

**Next:** Run `oat-project-document` then `oat-project-pr-final` per `workflow.postImplementSequence: docs-pr`.

## Revision 2 Complete: status field/shell readability pass

**Date:** 2026-04-27

**Outcome:**

- Added `oat project status --field <path>` for arbitrary-depth single-field reads from the existing status payload.
- Added `oat project status --shell NAME=path ...` for shell-safe multi-field assignment output from one project state read.
- Added `oat project status --project-path <path>` for repo-relative or absolute path-directed status reads when a skill has already resolved the target project.
- Replaced the verbose per-skill `oat`/`npx` JSON preambles in the migrated skills with concise `--field` / `--shell` snippets.
- Documented the runtime contract that skill snippets call `oat` directly, plus an `npx @open-agent-toolkit/cli`-backed `oat` shim for CI/cloud environments.
- Removed the remaining path-directed `grep | awk` exception in `oat-project-review-provide` now that explicit project path status reads exist.

**Commits:**

- `9b81be89` — add project status field and shell output
- `0949dccc` — align status shell implementation
- `a768f474` — use project status shell output in skills
- `2e776a76` — support explicit project status paths

**Verification:**

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts src/commands/help-snapshots.test.ts` → 54/54 pass
- `pnpm lint` → pass
- `pnpm format` → pass
- `pnpm type-check` → pass
- `pnpm test` → pass (159 files / 1365 tests; docs build passed)
- `pnpm release:validate` → pass for 5 public packages at `0.0.53`
- Live CLI smoke: `oat project status --project-path .oat/projects/shared/skill-cli-migration --field project.workflowMode` → `quick`
- Live CLI smoke: absolute `--project-path ... --shell WORKFLOW_MODE=project.workflowMode LAST_SHA=project.lastCommit` → shell-safe assignments

**Next:** PR #65 is open with the readability revision included. Await CI and human review; use `oat-project-revise` for additional feedback or `oat-project-complete` after merge approval.

## Phase p-rev2: Revision 2 Review Fixes

**Status:** in_progress
**Started:** 2026-04-29

### Task prev2-t05: (review) Lock `oat project status --help` snapshot

**Status:** completed
**Commit:** 690a43c6

**Outcome:**

- Added a dedicated `project status --help` inline snapshot adjacent to the existing `project --help` case so any rename/removal of `--field`, `--project-path`, or `--shell` trips the help-snapshot suite.

**Files changed:**

- `packages/cli/src/commands/help-snapshots.test.ts` (inline snapshot generated via `vitest -u`).

**Verification:**

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts` → 43/43 pass (re-run without `-u` confirms snapshot matches).

---

### Task prev2-t06: (review) Reject conflicting `--field` and `--shell`

**Status:** completed
**Commit:** d1cb991c

**Outcome:**

- `writeProjectStatusOutput` now rejects requests that combine `--field` with a non-empty `--shell`: stderr names both flags as mutually exclusive and the process exits 1 before either output path runs. New vitest case (`rejects combining --field and --shell`) guards the contract.

**Files changed:**

- `packages/cli/src/commands/project/status.ts`
- `packages/cli/src/commands/project/status.test.ts`

**Verification:**

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts` → 13/13 pass.
- `pnpm --filter @open-agent-toolkit/cli type-check` → clean.

---

### Task prev2-t07: (review) Skip repo root resolution for absolute `--project-path`

**Status:** completed
**Commit:** 6ea55e3f

**Outcome:**

- `runProjectStatus` now short-circuits before `resolveProjectRoot` whenever `--project-path` is absolute, so `oat project status --project-path /abs/path` succeeds even when invoked from a `cwd` that is not a git checkout. Relative `--project-path` and unset `--project-path` paths still call `resolveProjectRoot` exactly once.
- New vitest case `reads an absolute --project-path from a cwd outside any git checkout` simulates a non-repo `cwd` by configuring the harness `resolveProjectRoot` to throw and asserts the CLI succeeds, never calls `resolveProjectRoot`/`resolveActiveProject`, and emits the absolute project's field. Existing relative-path coverage still passes.

**Files changed:**

- `packages/cli/src/commands/project/status.ts`
- `packages/cli/src/commands/project/status.test.ts`

**Verification:**

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts` → 14/14 pass.
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts` → 43/43 pass.
- `pnpm --filter @open-agent-toolkit/cli type-check` → clean.
- `pnpm lint` → pass (10 tasks, 0 warnings, 0 errors).

---

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
