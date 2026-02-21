---
oat_status: complete
oat_ready_for: oat-project-pr-final
oat_blockers: []
oat_last_updated: 2026-02-21
oat_current_task_id: null
oat_generated: false
---

# Implementation: Add GitHub Copilot and Gemini CLI Providers

**Started:** 2026-02-21
**Last Updated:** 2026-02-21

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase | Status | Tasks | Completed |
|-------|--------|-------|-----------|
| Phase 1 | complete | 2 | 2/2 |
| Phase 2 | complete | 3 | 3/3 |

**Total:** 5/5 tasks completed

---

## Phase 1: New Provider Adapters

**Status:** complete
**Started:** 2026-02-21

### Phase Summary

**Outcome (what changed):**
- Added Gemini CLI provider adapter with `nativeRead: true` for both skills and agents
- Added GitHub Copilot provider adapter with `nativeRead: false`, syncing to `.github/skills`, `.github/agents` (project) and `.copilot/skills`, `.copilot/agents` (user)
- Copilot detection checks `.copilot/`, `.github/copilot-instructions.md`, `.github/agents/`, or `.github/skills/`
- Gemini detection checks `.gemini/` directory

**Key files touched:**
- `packages/cli/src/providers/gemini/` (4 files) - New Gemini provider adapter
- `packages/cli/src/providers/copilot/` (4 files) - New Copilot provider adapter

**Verification:**
- Run: `pnpm --filter @oat/cli test -- --run`
- Result: 531 tests passed (14 new tests for the two providers)

**Notes / Decisions:**
- Phase 1 was executed via subagent-driven orchestration (parallel worktrees)

### Task p01-t01: Create Gemini CLI provider (nativeRead: true)

**Status:** complete
**Commit:** 2b7dbd6

**Notes:**
- Follows Codex pattern (`nativeRead: true`)
- Reference: `packages/cli/src/providers/codex/`

---

### Task p01-t02: Create GitHub Copilot provider (nativeRead: false)

**Status:** complete
**Commit:** d8080f7

**Notes:**
- Follows Claude/Cursor pattern (`nativeRead: false`)
- Reference: `packages/cli/src/providers/claude/`
- Detection: `.copilot/` OR `.github/copilot-instructions.md` OR `.github/agents/` OR `.github/skills/`

---

## Phase 2: User-Scope Agents + Registration

**Status:** complete
**Started:** 2026-02-21

### Phase Summary

**Outcome (what changed):**
- Relaxed contract test to allow agent content type in user mappings
- Added user-scope agent mappings to Claude (`.claude/agents`) and Cursor (`.cursor/agents`)
- Registered Copilot and Gemini adapters in all 7 command files
- Added both new adapters to contract test ADAPTERS array

**Key files touched:**
- `packages/cli/src/providers/shared/adapter-contract.test.ts` - Relaxed user mapping constraint, added new adapters
- `packages/cli/src/providers/claude/paths.ts` - Added agent to user mappings
- `packages/cli/src/providers/cursor/paths.ts` - Added agent to user mappings
- `packages/cli/src/commands/` (7 files) - Registered copilotAdapter and geminiAdapter

**Verification:**
- Run: `pnpm --filter @oat/cli test -- --run && pnpm lint && pnpm type-check && pnpm build`
- Result: 546 tests passed, lint/type-check/build clean
- Manual: `pnpm run cli -- providers list` shows all 5 providers

### Task p02-t01: Enable user-scope agent mappings for all providers

**Status:** complete
**Commit:** d7f037b

**Notes:**
- Relaxed contract test constraint (user mappings skills-only → skills + agents)
- Added agent to Claude and Cursor user mappings
- Codex/Gemini already covered via nativeRead

---

### Task p02-t02: Register new providers in command files

**Status:** complete
**Commit:** b9b9e9c

**Notes:**
- 7 command files updated
- Added to contract test ADAPTERS array
- Added `.copilot/` as additional detection marker for Copilot (required by contract test generic detection)

---

## Orchestration Runs

> This section is used by `oat-project-subagent-implement` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### Review Received: plan (artifact)

**Date:** 2026-02-21
**Review artifact:** reviews/artifact-plan-review-2026-02-21.md

**Findings:**
- Critical: 0
- Important: 1
- Medium: 2 (1 already resolved)
- Minor: 1

**Actions taken:**
- `I1`: Fixed "Implementation Complete" section — removed premature "Ready for merge" language
- `M1`: Added explicit Codex user-scope agent verification note to p02-t01 task
- `M2`: Already resolved (plan row added before receive)
- `m1`: Fixed HiLL checklist wording to clarify no gates configured

**No fix tasks added** — all findings were direct artifact text corrections applied in-place.

---

### Review Received: final (code)

**Date:** 2026-02-21
**Review artifact:** reviews/final-review-2026-02-21.md

**Findings:**
- Critical: 0
- Important: 0
- Medium: 1
- Minor: 0

**New tasks added:** p02-t03

**M1 disposition:** Convert to fix task — add agent mappings to Codex provider (same nativeRead pattern as Gemini). The TOML adapter backlog item is about converting markdown agents to Codex-executable role configs, which is a separate concern from declaring nativeRead path mappings.

**Next:** Execute fix task p02-t03 via `oat-project-implement`.

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
|------|---------|--------|--------|
| p01-t02 | Detection: 3 markers | Detection: 4 markers (added `.copilot/`) | Contract test expects `.${name}` detection; `.copilot/` is a valid signal |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
|-------|-----------|--------|--------|----------|
| 1 | 531 | 531 | 0 | - |
| 2 | 546 | 546 | 0 | - |

## Final Summary (for PR/docs)

**What shipped:**
- Gemini CLI provider adapter (`nativeRead: true`, reads `.agents/` natively)
- GitHub Copilot provider adapter (`nativeRead: false`, syncs to `.github/skills`, `.github/agents`)
- User-scope agent sync for all 5 providers (Claude, Cursor, Codex, Copilot, Gemini) — all with `nativeRead` or explicit mappings
- Full command registration across init, sync, status, doctor, providers list/inspect/set

**Behavioral changes (user-facing):**
- `oat providers list` now shows 5 providers instead of 3
- `oat sync` will sync skills and agents to Copilot paths (`.github/skills`, `.github/agents`) when detected
- User-scope sync now includes agents for Claude (`~/.claude/agents`) and Cursor (`~/.cursor/agents`)
- Gemini CLI users see their provider detected when `.gemini/` exists (no sync needed — nativeRead)

**Key files / modules:**
- `packages/cli/src/providers/gemini/` - Gemini CLI provider (4 files)
- `packages/cli/src/providers/copilot/` - GitHub Copilot provider (4 files)
- `packages/cli/src/providers/claude/paths.ts` - Added user-scope agent mapping
- `packages/cli/src/providers/cursor/paths.ts` - Added user-scope agent mapping
- `packages/cli/src/providers/shared/adapter-contract.test.ts` - Relaxed user mapping constraint, added new adapters
- `packages/cli/src/commands/` (7 files) - Provider registration

**Verification performed:**
- 546 tests passing (70 test files)
- `pnpm lint` clean
- `pnpm type-check` clean
- `pnpm build` clean
- `pnpm run cli -- providers list` shows all 5 providers

**Design deltas (if any):**
- Added `.copilot/` as detection marker for Copilot (not in original plan, needed for contract test compatibility)

## References

- Plan: `plan.md`
- Imported Source: `references/imported-plan.md`
