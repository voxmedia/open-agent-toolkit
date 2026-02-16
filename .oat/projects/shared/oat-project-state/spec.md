---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-01-29
oat_generated: false
---

# Specification: oat-project-state

## Problem Statement

The OAT workflow currently lacks a centralized way to manage which project is active and to get a quick "at a glance" view of the repo state. While `.oat/active-project` exists as a pointer file, there is no dedicated skill to switch projects, no way to clear the active project, and no dashboard summarizing the current state.

Every OAT skill has duplicated "Step 0: Resolve Active Project" logic. Users cannot easily see what project they're working on, what phase it's in, whether there are blockers, or if the knowledge base is stale—without reading multiple files manually.

This project implements minimal project lifecycle management and a derived repo state dashboard to support the dogfooding phase.

## Goals

### Primary Goals
- Provide skills to set, clear, and complete the active project
- Generate a repo state dashboard (`.oat/state.md`) showing current state at a glance
- Keep implementation file-based and derived from existing sources of truth
- Integrate dashboard generation into `oat-project-progress` and `oat-repo-knowledge-index` for auto-refresh

### Secondary Goals
- Validate project paths before setting active (strict validation)
- Provide clear "next step" recommendations in the dashboard
- List available projects when no active project is set

## Non-Goals

- Multi-project registry (`.oat/projects/state.json`) or MRU tracking
- Background watchers or real-time UI updates
- Automatic project switching via git hooks or branch detection
- Archive/deletion semantics for completed projects
- CLI commands (`oat project ...`) - deferred until CLI infrastructure exists

## Requirements

### Functional Requirements

**FR1: Set Active Project**
- **Description:** User can set the active project to an existing project directory via `oat-project-open`
- **Acceptance Criteria:**
  - Skill resolves `{PROJECTS_ROOT}` (via env var, `.oat/projects-root`, or default)
  - Skill lists available projects in `{PROJECTS_ROOT}/*/` with their current phase
  - User can select from list or provide project name directly
  - Only projects with valid `state.md` can be set as active
  - `.oat/active-project` is written with the full path (v1 compatibility with existing skills)
  - Repo state dashboard is regenerated after setting
- **Priority:** P0

**FR2: Clear Active Project**
- **Description:** User can clear the active project pointer via `oat-project-clear-active`
- **Acceptance Criteria:**
  - `.oat/active-project` file is removed or emptied
  - Confirmation message shown to user
  - Repo state dashboard is regenerated after clearing
- **Priority:** P0

**FR3: Complete Project**
- **Description:** User can mark a project as semantically complete via `oat-project-complete`
- **Acceptance Criteria:**
  - Prompts user for confirmation
  - Optionally checks if final review is passed (warning, not blocking)
  - Optionally checks if PR description exists (warning, not blocking)
  - Sets `oat_lifecycle: complete` in project state.md frontmatter
  - Offers to clear active project after completion
  - Does NOT move or delete project files
- **Priority:** P1

**FR4: Generate Repo State Dashboard**
- **Description:** Script generates `.oat/state.md` repo state dashboard from existing sources
- **Acceptance Criteria:**
  - Dashboard shows: repo name, generated timestamp
  - Dashboard shows: active project name and path (or "not set")
  - Dashboard shows: current phase, phase status, lifecycle status, blockers (from project state.md)
  - Dashboard shows: knowledge staleness (age + files changed since generation)
  - Dashboard shows: recommended next step (maps to OAT command)
  - Dashboard shows: quick commands section
  - Dashboard handles missing active project gracefully (lists available projects)
- **Priority:** P0

**FR5: Dashboard Integration - oat-project-progress**
- **Description:** `oat-project-progress` skill runs dashboard generation at the end
- **Acceptance Criteria:**
  - Dashboard is regenerated on every `oat-project-progress` invocation
  - No user action required to refresh
- **Priority:** P0

**FR6: Dashboard Integration - oat-repo-knowledge-index**
- **Description:** `oat-repo-knowledge-index` skill runs dashboard generation after completion
- **Acceptance Criteria:**
  - Dashboard is regenerated after knowledge base generation completes
  - Knowledge staleness section reflects fresh data immediately
- **Priority:** P1

**FR7: Project Validation**
- **Description:** Setting active project validates the target exists
- **Acceptance Criteria:**
  - Directory must exist under `{PROJECTS_ROOT}/`
  - Directory must contain `state.md` file
  - Project name must be valid (alphanumeric, dash, underscore only)
  - Clear error message if validation fails
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Script Performance**
- **Description:** Dashboard generation must be fast enough for frequent invocation
- **Acceptance Criteria:**
  - Script completes in <2 seconds on typical repo
  - Acceptable to run on every `oat-project-progress` call
- **Priority:** P1

**NFR2: Idempotency**
- **Description:** Dashboard generation is safe to run repeatedly
- **Acceptance Criteria:**
  - Running script multiple times produces same output for same inputs
  - No side effects beyond writing `.oat/state.md`
- **Priority:** P0

**NFR3: Graceful Degradation**
- **Description:** Dashboard generates even with missing or invalid data
- **Acceptance Criteria:**
  - Missing `.oat/active-project` → shows "not set" with project list
  - Missing project `state.md` → shows "state unknown"
  - Missing knowledge index → shows "knowledge not generated"
- **Priority:** P1

## Constraints

- Must work with existing `.oat/active-project` mechanism (local-only, gitignored)
- Must derive all data from existing sources (no new persistent state)
- Skills must follow existing skill patterns in `.agent/skills/`
- Shell script must be POSIX-compatible (bash)
- No external dependencies (pure shell + git commands)

## Dependencies

- Existing `.oat/active-project` file format:
  - **v1 canonical:** Full path (e.g., `.agent/projects/my-project`) for compatibility with existing skills
  - **Reading:** New code accepts both path and name formats (future-proof)
  - **Writing:** New skills write full path for backward compatibility
- Existing `{PROJECT_PATH}/state.md` frontmatter structure (FR3 adds new `oat_lifecycle` field)
- Existing `.oat/repo/knowledge/project-index.md` frontmatter structure
- `.oat/projects-root` file (optional, for configurable projects location)
- Git for diff stats calculation
- `oat-project-progress` skill (for integration)
- `oat-repo-knowledge-index` skill (for integration)

## High-Level Design (Proposed)

The solution consists of a shell script for repo state generation and three skills for project lifecycle management. All state is derived from existing files—no new persistent state is introduced.

The repo state script (`generate-oat-state.sh`) reads from four sources: the active project pointer, the project's state.md, the knowledge index, and git diff stats. It outputs a markdown file with sections for project status, knowledge status, and recommended next actions.

The three skills (`oat-project-open`, `oat-project-clear-active`, `oat-project-complete`) are thin wrappers that manipulate the active project pointer and invoke the dashboard script. They follow the existing skill pattern with SKILL.md definitions.

**Key Components:**
- `generate-oat-state.sh` - Shell script that generates the repo state dashboard (`.oat/state.md`)
- `oat-project-open` - Skill to set active project with validation
- `oat-project-clear-active` - Skill to clear active project pointer
- `oat-project-complete` - Skill to mark project lifecycle complete

**Alternatives Considered:**
- JSON state file - Rejected; markdown is human-readable and consistent with OAT patterns
- Background watcher - Rejected; adds complexity, not needed for dogfooding
- Database - Rejected; file-based approach is simpler and portable

*Design-related open questions are tracked in the [Open Questions](#open-questions) section below.*

## Success Metrics

- Repo state dashboard correctly reflects active project state (manual verification)
- All three skills complete without error on valid inputs
- Repo state generation completes in <2 seconds
- Integration with oat-project-progress and oat-repo-knowledge-index works automatically
- Zero data loss or corruption to existing project artifacts

## Requirement Index

| ID | Description | Priority | Verification | Planned Tasks |
|----|-------------|----------|--------------|---------------|
| FR1 | Set active project via skill | P0 | manual: invoke skill, verify pointer written | p02-t01, p02-t04, p02-t05 |
| FR2 | Clear active project via skill | P0 | manual: invoke skill, verify pointer removed | p02-t02, p02-t04, p02-t05 |
| FR3 | Mark project complete via skill | P1 | manual: invoke skill, verify oat_lifecycle set | p02-t03, p02-t04, p02-t05 |
| FR4 | Generate repo state dashboard | P0 | manual: run script, verify output sections | p01-t01 to p01-t09 |
| FR5 | Dashboard integration - oat-project-progress | P0 | manual: run oat-project-progress, verify dashboard updated | p03-t01, p03-t03 |
| FR6 | Dashboard integration - oat-repo-knowledge-index | P1 | manual: run oat-repo-knowledge-index, verify dashboard updated | p03-t02, p03-t03 |
| FR7 | Project validation on set | P0 | manual: try invalid project, verify error | p02-t01 |
| NFR1 | Script performance <2s | P1 | perf: time script execution | p01-t10 |
| NFR2 | Script idempotency | P0 | manual: run twice, diff outputs | p01-t10 |
| NFR3 | Graceful degradation | P1 | manual: test with missing files | p01-t03, p01-t04, p01-t05, p01-t10 |

## Open Questions

- **Dashboard format:** Should the dashboard include a "recent activity" section? (Likely deferred to v2)

## Resolved Questions

- **Completion semantics:** ~~Should `oat-project-complete` update `state.md` to mark phase as "complete"?~~ **Resolved:** No. Uses separate `oat_lifecycle: complete` field to distinguish project completion from workflow phase progression.

## Assumptions

- Projects live in `{PROJECTS_ROOT}/<name>/` where PROJECTS_ROOT is configurable (default: `.agent/projects`)
- All projects have a valid `state.md` file with expected frontmatter
- Git is available and the repo is a valid git repository
- Dashboard generation overhead is acceptable for frequent invocation
- Existing `.oat/active-project` files may contain legacy full paths (migration required)

## Risks

- **Script complexity:** Shell parsing of YAML frontmatter could be fragile
  - **Likelihood:** Medium
  - **Impact:** Low (dashboard is informational)
  - **Mitigation:** Use simple grep/sed patterns, handle missing data gracefully

- **Integration breakage:** Changes to oat-project-progress/oat-repo-knowledge-index could break
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation:** Keep integration minimal (single line addition)

## References

- Discovery: `discovery.md`
- Reference Design: `.oat/repo/archive/temp/oat-project-state.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
