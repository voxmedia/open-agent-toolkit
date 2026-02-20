---
oat_status: complete
oat_ready_for: oat-project-pr-final
oat_blockers: []
oat_last_updated: 2026-02-19
oat_current_task_id: null
oat_generated: false
---

# Implementation: agent-instructions-skills

**Started:** 2026-02-19
**Last Updated:** 2026-02-19

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
| Phase 1: Foundation | complete | 5 | 5/5 |
| Phase 2: Analyze Skill | complete | 3 | 3/3 |
| Phase 3: Apply Skill | complete | 4 | 4/4 |
| Phase 4: Integration | complete | 5 | 5/5 |

**Total:** 17/17 tasks completed

---

## Phase 1: Foundation

**Status:** complete
**Started:** 2026-02-19

### Phase Summary

**Outcome:**
- Shared tracking manifest (`.oat/tracking.json`) established for delta mode across OAT operations
- Three helper scripts created for provider resolution, instruction file discovery, and tracking read/write
- Analysis output directory established as peer to `knowledge/` and `reviews/`

**Key files touched:**
- `.oat/tracking.json` - shared tracking manifest
- `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh` - read/write/init tracking
- `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh` - provider detection hierarchy
- `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh` - file discovery by provider
- `.oat/repo/analysis/.gitkeep` - analysis output directory
- `.oat/repo/README.md` - documented analysis/ directory

**Verification:**
- Run: all scripts tested manually with expected output
- Result: pass

**Notes / Decisions:**
- `resolve-instruction-files.sh` required a fix for worktree path exclusion — `find` exclusion patterns now use `${REPO_ROOT}/.worktrees/*` instead of `*/.worktrees/*` to avoid filtering out the worktree root itself

### Task p01-t01: Create tracking manifest

**Status:** completed
**Commit:** 23b84c3

**Outcome:**
- `.oat/tracking.json` created with `{"version": 1}` initial schema

**Files changed:**
- `.oat/tracking.json` - initial tracking manifest

**Verification:**
- Run: `jq . .oat/tracking.json`
- Result: pass — valid JSON with version field

---

### Task p01-t02: Create resolve-tracking.sh

**Status:** completed
**Commit:** 11af9c5

**Outcome:**
- Shell script with `init`, `read`, `write` subcommands for tracking manifest operations
- Uses jq for JSON manipulation with optimistic per-key merge

**Files changed:**
- `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh` - tracking read/write/init

**Verification:**
- Run: `bash scripts/resolve-tracking.sh write testOp abc123 main full agents_md && jq . .oat/tracking.json`
- Result: pass — correct JSON structure with flat top-level key

---

### Task p01-t03: Create resolve-providers.sh

**Status:** completed
**Commit:** a53325b

**Outcome:**
- Provider resolution with 4-level precedence: --providers arg > sync config > auto-detect > interactive
- Always outputs `agents_md` first

**Files changed:**
- `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh` - provider detection

**Verification:**
- Run: `bash scripts/resolve-providers.sh --non-interactive`
- Result: pass — outputs `agents_md`, `claude`, `cursor` (from sync config)

---

### Task p01-t04: Create resolve-instruction-files.sh

**Status:** completed
**Commit:** 356161d

**Outcome:**
- Discovers instruction files by provider, outputs tab-separated `provider\tpath` lines
- Accepts providers from stdin or `--providers` arg

**Files changed:**
- `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-instruction-files.sh` - file discovery

**Verification:**
- Run: `echo "agents_md" | bash scripts/resolve-instruction-files.sh`
- Result: pass — finds AGENTS.md files in repo

**Issues Encountered:**
- `.worktrees` exclusion bug: `find` pattern `-not -path '*/.worktrees/*'` filtered out the worktree root. Fixed by using `${REPO_ROOT}/.worktrees/*` absolute path pattern.

---

### Task p01-t05: Create analysis output directory

**Status:** completed
**Commit:** 6959926

**Outcome:**
- `.oat/repo/analysis/` directory established with `.gitkeep`
- README.md updated to document the new directory

**Files changed:**
- `.oat/repo/analysis/.gitkeep` - directory placeholder
- `.oat/repo/README.md` - added analysis/ section

**Verification:**
- Run: `ls .oat/repo/analysis/.gitkeep`
- Result: pass

---

## Phase 2: Analyze Skill

**Status:** complete
**Started:** 2026-02-19

### Phase Summary

**Outcome:**
- Analysis artifact template created with severity-rated report structure
- Quality checklist (10 criteria) and directory assessment criteria (5 primary + 3 secondary indicators) distilled from agent-instruction.md
- Analyze SKILL.md written with 7-step process, delta/full mode support, and multi-provider coverage

**Key files touched:**
- `.agents/skills/oat-agent-instructions-analyze/references/analysis-artifact-template.md`
- `.agents/skills/oat-agent-instructions-analyze/references/quality-checklist.md`
- `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`
- `.agents/skills/oat-agent-instructions-analyze/SKILL.md`

**Verification:**
- Run: `pnpm oat:validate-skills` — no errors for analyze skill
- Result: pass

### Task p02-t01: Create analysis artifact template

**Status:** completed
**Commit:** 49f862f

**Outcome:**
- Severity-rated report template with frontmatter, inventory table, findings by severity, coverage gaps, cross-format consistency, and recommendations

**Files changed:**
- `.agents/skills/oat-agent-instructions-analyze/references/analysis-artifact-template.md`

---

### Task p02-t02: Create quality checklist and directory assessment criteria

**Status:** completed
**Commit:** 1cfe7a2

**Outcome:**
- Quality checklist with 10 evaluation criteria and scoring guidance
- Directory assessment criteria with 5 primary indicators, 3 secondary indicators, and exclusion rules

**Files changed:**
- `.agents/skills/oat-agent-instructions-analyze/references/quality-checklist.md`
- `.agents/skills/oat-agent-instructions-analyze/references/directory-assessment-criteria.md`

---

### Task p02-t03: Write analyze SKILL.md

**Status:** completed
**Commit:** b51aaee

**Outcome:**
- Analyze skill (~218 lines) with 7-step process covering provider resolution, file discovery, quality evaluation, coverage gap assessment, drift detection, artifact writing, and tracking update
- References docs at runtime instead of inlining knowledge

**Files changed:**
- `.agents/skills/oat-agent-instructions-analyze/SKILL.md`

**Issues Encountered:**
- Description validation failed — must start with "Run when". Fixed prefix.

---

## Phase 3: Apply Skill

**Status:** complete
**Started:** 2026-02-19

### Phase Summary

**Outcome:**
- 7 instruction file templates created covering all provider formats (AGENTS.md root/scoped, glob-scoped rule body, Claude/Cursor/Copilot frontmatter, Copilot shim)
- Apply plan review template for user decision workflow
- Symlinked resolve-tracking.sh for shared tracking
- Apply SKILL.md written with 7-step interactive workflow (intake, plan review, branch, generate, commit, PR, tracking)

**Key files touched:**
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/` (7 templates)
- `.agents/skills/oat-agent-instructions-apply/references/apply-plan-template.md`
- `.agents/skills/oat-agent-instructions-apply/scripts/resolve-tracking.sh` (symlink)
- `.agents/skills/oat-agent-instructions-apply/SKILL.md`

**Verification:**
- Run: `pnpm oat:validate-skills` — no errors for apply skill
- Result: pass

### Task p03-t01: Create instruction file templates

**Status:** completed
**Commit:** 297be07

**Outcome:**
- 7 templates: agents-md-root, agents-md-scoped, glob-scoped-rule (shared body), frontmatter for claude-rule, cursor-rule, copilot-instruction, copilot-shim
- Copilot shim includes HTML comment explaining why it exists (AGENTS.md support is setting-gated)
- Glob-scoped rules designed for identical body content across providers

**Files changed:**
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/agents-md-root.md`
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/agents-md-scoped.md`
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/claude-rule.md`
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/cursor-rule.md`
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/copilot-instruction.md`
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/frontmatter/copilot-shim.md`

---

### Task p03-t02: Create apply plan template

**Status:** completed
**Commit:** e58cab5

**Outcome:**
- Apply plan template with per-recommendation approve/modify/skip workflow and summary table

**Files changed:**
- `.agents/skills/oat-agent-instructions-apply/references/apply-plan-template.md`

---

### Task p03-t03: Symlink resolve-tracking.sh into apply skill

**Status:** completed
**Commit:** e0aefd2

**Outcome:**
- Symlink created so apply skill can reuse the same tracking script

**Files changed:**
- `.agents/skills/oat-agent-instructions-apply/scripts/resolve-tracking.sh` (symlink → analyze)

---

### Task p03-t04: Write apply SKILL.md

**Status:** completed
**Commit:** 7822ca8

**Outcome:**
- Apply skill (~261 lines) with 7-step interactive workflow: intake, provider resolution, plan building, user review, branch creation, file generation, commit/PR, tracking update
- Multi-format composition: AGENTS.md first, CLAUDE.md import, glob-scoped rules with per-provider frontmatter, Copilot shim

**Files changed:**
- `.agents/skills/oat-agent-instructions-apply/SKILL.md`

---

## Phase 4: Integration

**Status:** complete
**Started:** 2026-02-19

### Phase Summary

**Outcome:**
- Knowledge index skill now writes to tracking.json after successful runs
- Both new skills validated and synced to Claude and Cursor providers
- Repo README updated with expanded analysis/ directory documentation

**Key files touched:**
- `.agents/skills/oat-repo-knowledge-index/SKILL.md` (added Step 10b)
- `.oat/sync/manifest.json` (updated by sync)
- `.oat/repo/README.md` (expanded analysis/ docs)

**Verification:**
- Run: `pnpm oat:validate-skills`, `pnpm run cli -- sync --scope all --apply`
- Result: pass — both skills synced, pre-existing validation errors only

### Task p04-t01: Update oat-repo-knowledge-index to write tracking.json

**Status:** completed
**Commit:** 61c7acf

**Outcome:**
- Added Step 10b to knowledge index skill that calls resolve-tracking.sh after commit

**Files changed:**
- `.agents/skills/oat-repo-knowledge-index/SKILL.md` - added tracking step

---

### Task p04-t02: Validate and sync skills

**Status:** completed
**Commit:** 2a8580c

**Outcome:**
- Both new skills pass validation (no errors)
- Sync created provider symlinks for Claude and Cursor
- Pre-existing validation errors in 3 other skills (not in scope)

**Files changed:**
- `.oat/sync/manifest.json` - updated with new skill entries

---

### Task p04-t03: Update repo README with analysis directory docs

**Status:** completed
**Commit:** fadea00

**Outcome:**
- Expanded analysis/ section with naming convention, artifact types, and relationship to skills

**Files changed:**
- `.oat/repo/README.md` - expanded analysis/ documentation

---

### Review Received: final

**Date:** 2026-02-19
**Review artifact:** reviews/final-review-2026-02-19.md

**Findings:**
- Critical: 0
- Important: 1
- Medium: 1
- Minor: 0

**Important #1 — Schema divergence from imported plan:** The imported plan reference shows `operations` container, but implementation intentionally uses flat keys per backlog alignment. Decision: update imported plan reference (documentation fix, not implementation change).

**Medium #1 — Missing artifactPath in tracking write API:** The write API lacks `artifactPath` support, and the knowledge index call omits format data.

**New tasks added:** p04-t04, p04-t05

**Fix tasks completed:** p04-t04 (d3125bc), p04-t05 (6507a04)

**Re-review (v2):** 0 Critical, 0 Important, 0 Medium, 0 Minor — clean pass. Final review marked `passed` on 2026-02-19.

**Next:** Create PR via `oat-project-pr-final`.

---

## Orchestration Runs

> This section is used by `oat-subagent-orchestrate` to log parallel execution runs.
> Each run appends a new subsection — never overwrite prior entries.
> For single-thread execution (via `oat-project-implement`), this section remains empty.

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-02-19

**Session Start:** Implementation across 2 sessions (context continuation)

- [x] p01-t01: Create tracking manifest - 23b84c3
- [x] p01-t02: Create resolve-tracking.sh - 11af9c5
- [x] p01-t03: Create resolve-providers.sh - a53325b
- [x] p01-t04: Create resolve-instruction-files.sh - 356161d
- [x] p01-t05: Create analysis output directory - 6959826
- [x] p02-t01: Create analysis artifact template - 49f862f
- [x] p02-t02: Create quality checklist + directory assessment criteria - 1cfe7a2
- [x] p02-t03: Write analyze SKILL.md - b51aaee
- [x] p03-t01: Create instruction file templates - 297be07
- [x] p03-t02: Create apply plan template - e58cab5
- [x] p03-t03: Symlink resolve-tracking.sh - e0aefd2
- [x] p03-t04: Write apply SKILL.md - 7822ca8
- [x] p04-t01: Integrate knowledge index with tracking - 61c7acf
- [x] p04-t02: Validate and sync skills - 2a8580c
- [x] p04-t03: Update repo README - fadea00

**What changed:**
- New tracking manifest enables delta mode across OAT operations
- Two new skills: `oat-agent-instructions-analyze` (scan/evaluate/report) and `oat-agent-instructions-apply` (generate/update with PR workflow)
- Multi-provider support: AGENTS.md, Claude rules, Cursor rules, Copilot instructions
- Glob-scoped rules share identical body content across providers — only frontmatter differs
- Knowledge index integrated with tracking manifest

**Decisions:**
- No subagents at runtime — analysis is sequential (cross-file context needed), apply is interactive
- Copilot shim generated with HTML comment explaining setting-gated AGENTS.md support
- Worktree exclusion bug required `${REPO_ROOT}/.worktrees/*` absolute path pattern

**Follow-ups / TODO:**
- Pre-existing skill validation errors in oat-execution-mode-select, oat-subagent-orchestrate, oat-worktree-bootstrap-auto (not in scope)

---

## Deviations from Plan

| Task | Planned | Actual | Reason |
|------|---------|--------|--------|
| p01-t04 | `*/.worktrees/*` exclusion | `${REPO_ROOT}/.worktrees/*` | Worktree root path was being excluded |
| p02-t03 | ~400 lines SKILL.md | ~218 lines | Kept concise by referencing docs at runtime |
| p03-t04 | ~350 lines SKILL.md | ~261 lines | Same approach — docs referenced, not inlined |

## Test Results

| Phase | Tests Run | Passed | Failed | Coverage |
|-------|-----------|--------|--------|----------|
| Final | 508 | 508 | 0 | N/A |

## Final Summary (for PR/docs)

**What shipped:**
- Shared tracking manifest (`.oat/tracking.json`) for delta mode across OAT operations
- `oat-agent-instructions-analyze` skill — scans codebase for instruction file coverage, quality, and drift, produces severity-rated analysis artifact
- `oat-agent-instructions-apply` skill — interactive generation/update of instruction files with multi-provider support and PR-based workflow
- 7 instruction file templates covering AGENTS.md (root + scoped), glob-scoped rule body, and per-provider frontmatter (Claude, Cursor, Copilot + Copilot shim)
- Knowledge index integration with tracking manifest

**Behavioral changes (user-facing):**
- Users can run `oat-agent-instructions-analyze` to get a severity-rated report on instruction file health
- Users can run `oat-agent-instructions-apply` to generate or update instruction files from an analysis artifact
- `oat-repo-knowledge-index` now records its runs in tracking.json for delta mode

**Key files / modules:**
- `.oat/tracking.json` — shared tracking manifest
- `.agents/skills/oat-agent-instructions-analyze/` — analyze skill with scripts and reference docs
- `.agents/skills/oat-agent-instructions-apply/` — apply skill with templates and reference docs
- `.agents/skills/oat-repo-knowledge-index/SKILL.md` — updated with tracking step

**Verification performed:**
- All 508 tests passing
- Lint clean (165 files)
- Type-check passing
- Build successful
- Both new skills pass validation and are synced to Claude/Cursor providers

**Design deltas:**
- SKILL.md files are shorter than planned (~218 and ~261 lines vs ~400 and ~350) because they reference docs at runtime instead of inlining knowledge

## References

- Plan: `plan.md`
- Imported plan: `references/imported-plan.md`
