---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-02-17
oat_current_task_id: p01-t01
oat_generated: true
oat_template: false
---

# Implementation: oat-init-tools

**Started:** 2026-02-17
**Last Updated:** 2026-02-17

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
| Phase 1: Build Infrastructure | pending | 4 | 0/4 |
| Phase 2: Ideas Pack | pending | 2 | 0/2 |
| Phase 3: Workflows Pack | pending | 2 | 0/2 |
| Phase 4: Utility + Tools Group + Wiring | pending | 3 | 0/3 |
| Phase 5: Idea Skill Updates | pending | 2 | 0/2 |
| Phase 6: E2E Verification | pending | 1 | 0/1 |

**Total:** 0/14 tasks completed

---

## Phase 1: Build Infrastructure

**Status:** pending
**Started:** -

### Task p01-t01: Create asset bundling script

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/scripts/bundle-assets.sh`
- Must copy all 25 skill directories, 2 agents, all templates
- Scripts are optional (conditional copy)

---

### Task p01-t02: Integrate bundling into build pipeline

**Status:** pending
**Commit:** -

**Notes:**
- Modify `packages/cli/package.json`, `turbo.json`, `.gitignore`

---

### Task p01-t03: Add resolveAssetsRoot() utility

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/src/fs/assets.ts`
- Must work from both `src/` (tsx dev) and `dist/` (compiled)

---

### Task p01-t04: Add fileExists() and dirExists() utilities

**Status:** pending
**Commit:** -

**Notes:**
- Modify `packages/cli/src/fs/io.ts` — add `stat` import

---

## Phase 2: Ideas Pack

**Status:** pending
**Started:** -

### Task p02-t01: Implement ideas install pure logic

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`
- 4 skills, 2 infra files, 2 runtime templates

---

### Task p02-t02: Implement ideas Commander layer

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/src/commands/init/tools/ideas/index.ts`
- Scope: all→project, project→project, user→home

---

## Phase 3: Workflows Pack

**Status:** pending
**Started:** -

### Task p03-t01: Implement workflows install pure logic

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
- 20 skills, 2 agents, 6 templates, 2 scripts (optional), 1 config

---

### Task p03-t02: Implement workflows Commander layer

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/src/commands/init/tools/workflows/index.ts`
- Scope: user → reject with error

---

## Phase 4: Utility + Tools Group + Wiring

**Status:** pending
**Started:** -

### Task p04-t01: Implement utility install logic + Commander layer

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/src/commands/init/tools/utility/install-utility.ts`
- Create `packages/cli/src/commands/init/tools/utility/index.ts`
- Interactive multi-select using `selectManyWithAbort`

---

### Task p04-t02: Implement tools group command with interactive installer

**Status:** pending
**Commit:** -

**Notes:**
- Create `packages/cli/src/commands/init/tools/index.ts`
- Grouped skill list with scope badges

---

### Task p04-t03: Wire tools into oat init

**Status:** pending
**Commit:** -

**Notes:**
- Modify `packages/cli/src/commands/init/index.ts`
- One import + one `.addCommand()` call

---

## Phase 5: Idea Skill Updates

**Status:** pending
**Started:** -

### Task p05-t01: Add level-relative template paths to idea skills

**Status:** pending
**Commit:** -

**Notes:**
- Modify all 4 `oat-idea-*` SKILL.md files
- Add `TEMPLATES_ROOT` variable, replace hardcoded paths

---

### Task p05-t02: Add dual-level prompt chain to idea skills

**Status:** pending
**Commit:** -

**Notes:**
- Add new rule 4: prompt when both `.oat/ideas/` and `~/.oat/ideas/` exist

---

## Phase 6: E2E Verification

**Status:** pending
**Started:** -

### Task p06-t01: Run full test suite and manual verification

**Status:** pending
**Commit:** -

**Notes:**
- `pnpm build`, CLI help, manual smoke test, full test suite, type-check, lint

---

## Implementation Log

### 2026-02-17

**Session Start:** -

- [ ] p01-t01: Create asset bundling script - pending

**What changed (high level):**
- Project created and plan imported

**Decisions:**
- Plan imported from Claude Code plan mode

**Follow-ups / TODO:**
- Begin implementation with p01-t01

**Blockers:**
- None

**Session End:** -

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
| 3 | - | - | - | - |
| 4 | - | - | - | - |
| 5 | - | - | - | - |
| 6 | - | - | - | - |

## Final Summary (for PR/docs)

**What shipped:**
- {TBD}

**Behavioral changes (user-facing):**
- {TBD}

**Key files / modules:**
- {TBD}

**Verification performed:**
- {TBD}

**Design deltas (if any):**
- {TBD}

## References

- Plan: `plan.md`
- Imported Source: `references/imported-plan.md`
- Design: N/A (import mode)
- Spec: N/A (import mode)
