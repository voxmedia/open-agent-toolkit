---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-02-21
oat_current_task_id: p01-t01
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
| Phase 1 | pending | 2 | 0/2 |
| Phase 2 | pending | 2 | 0/2 |

**Total:** 0/4 tasks completed

---

## Phase 1: New Provider Adapters

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**
- {2-5 bullets describing user-visible / behavior-level changes delivered in this phase}

**Key files touched:**
- `{path}` - {why}

**Verification:**
- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**
- {trade-offs or deviations discovered during implementation}

### Task p01-t01: Create Gemini CLI provider (nativeRead: true)

**Status:** pending
**Commit:** -

**Notes:**
- Follows Codex pattern (`nativeRead: true`)
- Reference: `packages/cli/src/providers/codex/`

---

### Task p01-t02: Create GitHub Copilot provider (nativeRead: false)

**Status:** pending
**Commit:** -

**Notes:**
- Follows Claude/Cursor pattern (`nativeRead: false`)
- Reference: `packages/cli/src/providers/claude/`
- Detection: `.github/copilot-instructions.md` OR `.github/agents/` OR `.github/skills/`

---

## Phase 2: User-Scope Agents + Registration

**Status:** pending
**Started:** -

### Task p02-t01: Enable user-scope agent mappings for all providers

**Status:** pending
**Commit:** -

**Notes:**
- Relax contract test constraint (user mappings skills-only → skills + agents)
- Add agent to Claude and Cursor user mappings
- Codex/Gemini already covered via nativeRead

---

### Task p02-t02: Register new providers in command files

**Status:** pending
**Commit:** -

**Notes:**
- 7 command files to update
- Add to contract test ADAPTERS array

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

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
|------|---------|--------|--------|
| - | - | - | - |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
|-------|-----------|--------|--------|----------|
| 1 | - | - | - | - |
| 2 | - | - | - | - |

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
- Imported Source: `references/imported-plan.md`
