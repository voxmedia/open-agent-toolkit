# OAT Project State + Repo Dashboard (Minimal Dogfood Design)

This document defines a minimal, practical design for tracking “what project am I working on?” and generating a repo-level dashboard while dogfooding OAT.

## Goals

- Make the active project unambiguous across skills and sessions
- Provide a single “at a glance” repo dashboard
- Keep implementation simple and file-based (no DB)
- Keep the data derived from existing OAT sources of truth (not hand-maintained)

## Non-Goals (v1)

- No multi-project registry (`.oat/projects/state.json`) / MRU / branch-map
- No background watchers or real-time UI
- No automatic project switching via git hooks
- No required archiving/deletion semantics for completed projects

---

## Canonical Files

### 1) Active Project Pointer (Source of Truth)

- Path: `.oat/active-project`
- Format: single line containing a project directory path
- Example contents:
  - `.oat/projects/shared/workflow-research`
- Semantics:
  - “All OAT skills should operate on this project unless the user overrides.”
- Storage:
  - Local-only (gitignored)

### 2) Project State (Per Project, Source of Truth)

- Path: `{PROJECT_PATH}/state.md` (default: `.oat/projects/shared/<name>/state.md`, configurable via `.oat/projects-root`)
- Source of truth for:
  - `oat_phase`, `oat_phase_status`
  - `oat_blockers`
  - `oat_hil_checkpoints`, `oat_hil_completed`
  - `oat_last_commit`

### 3) Knowledge Index (Repo-Level, Source of Truth)

- Path: `.oat/knowledge/repo/project-index.md`
- Source of truth for:
  - knowledge generation timestamps (`oat_generated_at`)
  - SHAs for drift detection (`oat_source_head_sha`, `oat_source_main_merge_base_sha`)

### 4) Repo Dashboard (Derived / Generated)

- Path: `.oat/state.md`
- Generated snapshot derived from the above sources
- Local-only (gitignored)
- Safe to overwrite frequently

---

## Repo Dashboard: `.oat/state.md`

### Purpose

Answer quickly:
- What’s the active project?
- What phase are we in? Any blockers?
- Is the knowledge stale?
- What should I do next?

### Data Sources

`generate-oat-state.sh` derives data from:
- `.oat/active-project`
- `{PROJECT_PATH}/state.md`
- `.oat/knowledge/repo/project-index.md`
- `git diff` stats vs `oat_source_main_merge_base_sha..HEAD`

### Behavior When There Is No Active Project

If `.oat/active-project` is missing/empty/invalid:
- Dashboard still generates
- It shows:
  - `Active Project: (not set)`
  - `Projects found:` list of `{PROJECTS_ROOT}/*/` (from `.oat/projects-root`) (and optionally legacy `.agent/projects/*/`)
  - `Next:` recommend:
    - start new project (via `oat-project-discover`), or
    - set an active project (via `oat-project-open` / write `.oat/active-project`)

### Minimal Output Structure (v1)

Suggested `.oat/state.md` shape:

- Header (repo name, generated timestamp)
- Active Project
- Project Status (from `{PROJECT_PATH}/state.md`)
- Knowledge Status (from knowledge index + diff stats)
- Recommended Next Step (maps to an OAT command)
- Quick Commands (common actions)

---

## Population / Update Mechanism

### Script (v1)

- Add: `.oat/scripts/generate-oat-state.sh`
- It writes: `.oat/state.md`
- It is deterministic and safe to run repeatedly

### When To Run It

Minimal dogfood wiring:
- `oat-project-progress` runs the script at the end (so every “status check” refreshes the dashboard)
- Optionally, `oat-project-index` runs it after regeneration (so the knowledge section updates immediately)

No background automation needed for v1.

---

## Minimal Project Lifecycle Commands (Dogfood)

These should eventually be part of the OAT CLI (`oat project ...`), but for dogfooding we can implement them as scripts and/or skills.

### `oat-project-open` (Set Active Project)

Purpose:
- Set `.oat/active-project` to an existing project directory

Behavior:
- If `{PROJECTS_ROOT}/*/` exists (from `.oat/projects-root`): list choices and prompt
- Otherwise: accept a project name/path and write it

Writes:
- `.oat/active-project`

### `oat-project-clear-active` (Pause)

Purpose:
- Stop “auto targeting” a project

Behavior:
- Remove or empty `.oat/active-project`

### `oat-project-complete` (Complete)

Purpose:
- Mark the project lifecycle as “complete” (semantic completion), without necessarily moving files

Minimal v1 behavior:
- Confirm the user considers the work complete
- Optionally:
  - ensure final review is `passed` (if this is a code project)
  - ensure PR description exists (optional)
- Optionally clear `.oat/active-project`

Note:
- "Archive" is a separate future command (`oat-project-archive`) so "complete" doesn't silently move/delete content.

---

## Notes on Terminology

- Use `complete` (project lifecycle) rather than `close`/`end` to avoid ambiguity.
- Use `clear` for pointer semantics (`oat-project-clear-active`).
