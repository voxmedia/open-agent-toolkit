---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-27
oat_current_task_id: p03-t01
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

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 2     | 2/2       |
| Phase 2 | complete | 2     | 2/2       |
| Phase 3 | pending  | 5     | 0/5       |
| Phase 4 | pending  | 3     | 0/3       |

**Total:** 4/12 tasks completed

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
- Reviewer flagged 1 minor (non-blocking) finding; recorded in `reviews/p01-code-review-2026-04-27.md`.

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

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-04-27 02:07

**Branch:** feat/skill-cli-migration
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** in_progress

#### Phase Outcomes

| Phase | Implementer            | Review | Fix Iterations | Disposition |
| ----- | ---------------------- | ------ | -------------- | ----------- |
| p01   | DONE                   | pass   | 0/2            | merged      |
| p02   | DONE_WITH_CONCERNS (M) | pass   | 0/2            | merged      |

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

**What changed (high level):**

- Canonical preamble pattern documented in `create-oat-skill` so subsequent skills can paste it verbatim.
- New CLI test locks the JSON contract (`MIGRATED_FIELDS` set) — accidental key removal becomes a real test failure.
- Two pure-read skills (`oat-project-progress`, `oat-project-pr-progress`) now resolve project state via `oat --json project status` with the canonical `npx` fallback.

**Decisions:**

- Used a `hasPath` walker rather than `toMatchObject` in the contract test to actually fail on missing keys.
- p02-t01 plan referenced grep lines that didn't exist in the skill; migrated the real grep (`LAST_SHA`) and added the plan-named PHASE/PHASE_STATUS/WORKFLOW_MODE alongside it. Reviewer flagged Minor; not blocking.

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
