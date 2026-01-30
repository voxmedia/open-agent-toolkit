---
oat_status: complete
oat_ready_for: oat-plan
oat_blockers: []
oat_last_updated: 2026-01-29
oat_generated: false
---

# Design: oat-project-state

## Overview

This design implements minimal project lifecycle management and a derived repo state dashboard for the OAT dogfooding phase. The architecture follows OAT's file-based, derived-state philosophy—no new persistent state is introduced. All dashboard information is computed from existing sources of truth: the active project pointer, project state files, and the knowledge base index.

The implementation consists of a single shell script (`generate-oat-state.sh`) that derives the dashboard from multiple sources, and three thin skills (`oat-open-project`, `oat-clear-active-project`, `oat-complete-project`) that manipulate the active project pointer and invoke the dashboard script. This design prioritizes simplicity and idempotency over features, aligning with the dogfooding constraints.

The solution integrates with existing OAT infrastructure through minimal hooks in `oat-progress` and `oat-index`, ensuring the dashboard stays fresh during normal workflow without requiring background automation.

## Architecture

### System Context

This feature extends the OAT skill layer with project lifecycle management while keeping the knowledge and project layers unchanged. It introduces a new derived artifact (`.oat/state.md`) that aggregates status from multiple existing sources.

**Key Components:**
- **generate-oat-state.sh:** Shell script that computes and writes the repo dashboard
- **oat-open-project skill:** Sets the active project pointer with validation
- **oat-clear-active-project skill:** Clears the active project pointer
- **oat-complete-project skill:** Marks a project lifecycle as complete
- **.oat/state.md:** Derived dashboard file (output, not source of truth)

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User / Agent                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │    Skill Layer        │
                    │  ┌─────────────────┐  │
                    │  │ oat-open-project│  │
                    │  │ oat-clear-*     │  │
                    │  │ oat-complete-*  │  │
                    │  └────────┬────────┘  │
                    │           │           │
                    │  ┌────────▼────────┐  │
                    │  │ oat-progress    │──┼─── Existing (modified to call script)
                    │  │ oat-index       │  │
                    │  └─────────────────┘  │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  generate-oat-state.sh │
                    └───────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    ┌───────▼───────┐   ┌───────▼───────┐   ┌──────▼──────┐
    │.oat/active-   │   │ {PROJECT}/    │   │.oat/knowl-  │
    │project        │   │ state.md      │   │edge/repo/   │
    │(pointer)      │   │(project state)│   │project-idx  │
    └───────────────┘   └───────────────┘   └─────────────┘
                                │
                        ┌───────▼───────┐
                        │ .oat/state.md │
                        │ (dashboard)   │
                        └───────────────┘
```

### Data Flow

**Dashboard Generation Flow:**

```
1. Script reads .oat/active-project
   └─► If empty/missing → Set $PROJECT_STATUS = "not set"
   └─► If valid → Extract project name

2. Script reads {PROJECT_PATH}/state.md frontmatter
   └─► Extract: oat_phase, oat_phase_status, oat_blockers
   └─► If missing → Set $PROJECT_STATUS = "state unknown"

3. Script reads .oat/knowledge/repo/project-index.md frontmatter
   └─► Extract: oat_generated_at, oat_source_main_merge_base_sha
   └─► If missing → Set $KNOWLEDGE_STATUS = "not generated"

4. Script runs git diff stats
   └─► Count files changed since merge-base SHA
   └─► Determine staleness

5. Script computes recommended next action
   └─► Map phase+status to OAT skill

6. Script writes .oat/state.md
   └─► Combine all sections
```

**Project Lifecycle Flow:**

```
oat-open-project:
  1. Resolve PROJECTS_ROOT
  2. List projects in {PROJECTS_ROOT}/*/
  3. User selects or provides project name
  4. Validate: directory exists, has state.md
  5. Write full path to .oat/active-project (v1 compatibility)
  6. Run generate-oat-state.sh

oat-clear-active-project:
  1. Remove/empty .oat/active-project
  2. Run generate-oat-state.sh

oat-complete-project:
  1. Confirm with user
  2. Warn if no final review (optional)
  3. Warn if no PR description (optional)
  4. Ask if user wants to clear active project
  5. Run generate-oat-state.sh
```

## Component Design

### generate-oat-state.sh

**Purpose:** Generate the repo state dashboard from existing sources of truth.

**Responsibilities:**
- Read active project pointer
- Parse project state.md frontmatter
- Parse knowledge index frontmatter
- Calculate knowledge staleness via git
- Compute recommended next action
- Write formatted dashboard to .oat/state.md

**Interfaces:**
```bash
#!/usr/bin/env bash
# Usage: ./generate-oat-state.sh
# No arguments - reads from well-known paths
# Exit codes:
#   0 - Success
#   1 - Error (with message to stderr)
```

**Dependencies:**
- bash (POSIX-compatible)
- git (for diff stats)
- Standard utilities: grep, sed, awk, date, wc

**Design Decisions:**
- **Shell over TypeScript:** Keeps the script dependency-free and fast (<2s target). No Node.js startup overhead.
- **Grep/sed for YAML:** Simple patterns sufficient for frontmatter extraction; avoids yq dependency.
- **Idempotent writes:** Script can be run repeatedly with same output for same inputs.

### oat-open-project Skill

**Purpose:** Set the active project pointer with validation.

**Responsibilities:**
- List available projects with their current phase
- Validate selected project directory exists
- Validate project has state.md
- Write pointer to .oat/active-project
- Regenerate dashboard

**Interfaces:**
```markdown
# SKILL.md structure
---
name: oat-open-project
description: Set the active project with validation
---

## Process
1. List projects
2. Accept selection
3. Validate
4. Write pointer
5. Run generate-oat-state.sh
```

**Dependencies:**
- {PROJECTS_ROOT}/*/ directories
- generate-oat-state.sh

**Design Decisions:**
- **Skill not CLI:** During dogfooding, agent invocation is more practical than CLI.
- **Strict validation:** Only valid projects can be set to prevent broken state.
- **Immediate dashboard refresh:** User sees updated state right away.

### oat-clear-active-project Skill

**Purpose:** Clear the active project pointer.

**Responsibilities:**
- Remove or empty .oat/active-project
- Confirm action to user
- Regenerate dashboard

**Interfaces:**
```markdown
# SKILL.md structure
---
name: oat-clear-active-project
description: Clear the active project pointer
---

## Process
1. Remove/empty .oat/active-project
2. Confirm to user
3. Run generate-oat-state.sh
```

**Dependencies:**
- generate-oat-state.sh

**Design Decisions:**
- **Remove vs empty:** Either approach works; remove is cleaner.
- **No confirmation required:** Low-risk operation, easily reversible.

### oat-complete-project Skill

**Purpose:** Mark a project lifecycle as semantically complete.

**Responsibilities:**
- Confirm completion with user
- Optionally check for final review status (warning only)
- Optionally check for PR description (warning only)
- Set `oat_lifecycle: complete` in state.md frontmatter
- Offer to clear active project
- Regenerate dashboard

**Interfaces:**
```markdown
# SKILL.md structure
---
name: oat-complete-project
description: Mark a project lifecycle as complete
---

## Process
1. Confirm completion intent
2. Check for final review (warn if missing)
3. Check for PR description (warn if missing)
4. Set oat_lifecycle: complete in state.md
5. Ask about clearing active project
6. Run generate-oat-state.sh
```

**Dependencies:**
- {PROJECT_PATH}/state.md
- {PROJECT_PATH}/reviews/*.md (for review check)
- {PROJECT_PATH}/pr-description.md (for PR check)
- generate-oat-state.sh

**Design Decisions:**
- **Separate lifecycle field:** Uses `oat_lifecycle` (not `oat_phase`) to track project completion. Phase fields track workflow progression; lifecycle tracks "is this project done?"
- **Warnings not blockers:** Completion is semantic; don't force review/PR.
- **No archive/delete:** That's a separate future command.

## Data Models

### Projects Root Resolution

**Purpose:** Determine where projects live (supports migration from legacy `.agent/projects/` to `.oat/projects/shared/`).

**Resolution Order:**
```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".agent/projects")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"  # Strip trailing slash
```

**Sources (in priority order):**
1. `OAT_PROJECTS_ROOT` environment variable (highest priority)
2. `.oat/projects-root` file contents (single line)
3. Default: `.agent/projects` (legacy fallback)

**Semantics:**
- `PROJECTS_ROOT` must point to a directory containing projects as **direct children**
- Each child directory is a project: `{PROJECTS_ROOT}/{project-name}/`
- Example: if `.oat/projects-root` contains `.oat/projects/shared`, then projects are `.oat/projects/shared/my-project/`, `.oat/projects/shared/another-project/`, etc.
- **Not:** `.oat/projects/` with `shared/`, `local/`, `archived/` as children (those would be treated as project names)

**Design Rationale:**
- Allows gradual migration without breaking existing projects
- Environment variable override for CI/testing scenarios
- File-based config for persistent per-repo customization
- Flat structure (projects as direct children) keeps resolution simple

### Active Project Pointer

**Purpose:** Single source of truth for which project OAT skills operate on.

**Schema (new format):**
```
# .oat/active-project
# Format: Single line containing project name (not full path)
{project-name}
```

**Example:**
```
workflow-research
```

**Format Strategy (v1):**

For backward compatibility with existing skills (oat-progress, oat-discovery, etc.), v1 writes full paths. Reading logic accepts both formats to future-proof for name-only migration.

```bash
RAW_VALUE=$(cat .oat/active-project 2>/dev/null || true)

# Reading: Accept both formats
if [[ "$RAW_VALUE" == */* ]]; then
  # Path format - extract basename for project name
  PROJECT_NAME=$(basename "$RAW_VALUE")
  PROJECT_PATH="$RAW_VALUE"  # Use path as-is for compatibility
else
  # Name-only format (future)
  PROJECT_NAME="$RAW_VALUE"
  PROJECT_PATH="${PROJECTS_ROOT}/${PROJECT_NAME}"
fi
```

**v1 Behavior:**
- **Reading:** Accept both formats (path or name)
- **Writing:** Write full path (`{PROJECTS_ROOT}/{project-name}`) for compatibility with existing skills
- **Future migration:** Coordinated update to all skills enables name-only writes

**Validation Rules:**
- Must resolve to a valid project name (no path separators after normalization)
- `{PROJECTS_ROOT}/{project-name}/` directory must exist
- Directory must contain state.md

**Design Rationale:**
- Storing name (not path) makes pointer stable across PROJECTS_ROOT changes
- Compatibility shim avoids breaking existing skills during migration
- Full path is derived at runtime from PROJECTS_ROOT + name

**Storage:**
- **Location:** .oat/active-project
- **Persistence:** Local-only (gitignored)

### Project Lifecycle Field

**Purpose:** Track whether a project is semantically complete (distinct from phase progression).

**Schema:**
```yaml
# Added to {PROJECT_PATH}/state.md frontmatter
oat_lifecycle: active | complete
```

**Values:**
- `active` (default, can be omitted) - Project is in progress
- `complete` - Project lifecycle is finished

**Design Rationale:**
- Separates "what workflow phase am I in?" (`oat_phase`) from "is this project done?" (`oat_lifecycle`)
- A project can be in `implement` phase with `oat_phase_status: complete` but still `oat_lifecycle: active` (e.g., awaiting PR merge)
- Only `oat-complete-project` sets `oat_lifecycle: complete`

### Repo Dashboard

**Purpose:** Derived snapshot of repo state for quick reference.

**Schema:**
```markdown
---
oat_generated: true
oat_generated_at: {timestamp}
---

# OAT Repo State

**Generated:** {timestamp}

## Active Project

{Project name and path, or "(not set)"}

## Project Status

**Phase:** {oat_phase} ({oat_phase_status})
**Lifecycle:** {oat_lifecycle or "active"}
**Blockers:** {oat_blockers or "None"}
**HiL Gates:** {checkpoint status}

## Knowledge Status

**Generated:** {date}
**Age:** {N} days
**Files Changed:** {N} since knowledge generation
**Status:** {Fresh/Stale/Not Generated}

## Recommended Next Step

{Skill recommendation based on state}

## Quick Commands

- `/oat:progress` - Check status
- `/oat:index` - Refresh knowledge
- {Phase-specific commands}

## Available Projects

{List of {PROJECTS_ROOT}/*/ with phases}
```

**Storage:**
- **Location:** .oat/state.md
- **Persistence:** Local-only (gitignored), regenerated frequently

## API Design

Not applicable - this feature is skill-based with no REST APIs.

## Security Considerations

### Authentication

Not applicable - local file operations only.

### Authorization

Not applicable - operates within user's file system permissions.

### Data Protection

- **No sensitive data:** Dashboard contains only project metadata and paths.
- **Local-only files:** Both pointer and dashboard are gitignored.

### Input Validation

- **Project path validation:** oat-open-project validates directory exists and has state.md.
- **Graceful handling:** Script handles missing/malformed files without crashing.

### Threat Mitigation

- **Path traversal:** Project names validated to contain no path separators (`/`, `..`); full paths constrained to `{PROJECTS_ROOT}/`
- **Shell injection:** All paths quoted in shell commands; project names validated before interpolation
- **Input validation:** oat-open-project rejects names with special characters; only alphanumeric, dash, underscore allowed

## Performance Considerations

### Scalability

- **Project count:** Script iterates over {PROJECTS_ROOT}/*; O(n) for n projects.
- **Knowledge size:** Only reads frontmatter, not full content.
- **Git operations:** Single git diff command per invocation.

### Caching

Not needed - script is fast enough (<2s) to run on every invocation.

### Resource Limits

- **Memory:** Minimal - shell script with small variables
- **CPU:** Negligible - simple text processing
- **Disk I/O:** Reads a few small files, writes one small file

## Error Handling

### Error Categories

- **Missing files:** Handled gracefully with default values
- **Invalid frontmatter:** Logged to stderr, continues with defaults
- **Git errors:** Caught and reported, dashboard still generated

### Retry Logic

Not needed - operations are local and deterministic.

### Logging

- **Info:** Not logged (script is quiet on success)
- **Warn:** Printed to stdout in dashboard (e.g., "knowledge may be stale")
- **Error:** Printed to stderr, script exits with code 1

## Testing Strategy

### Requirement-to-Test Mapping

| ID | Verification | Key Scenarios |
|----|--------------|---------------|
| FR1 | manual | List projects, select valid project, select invalid project |
| FR2 | manual | Clear with active project set, clear with no active project |
| FR3 | manual | Complete with review, complete without review, clear after complete |
| FR4 | manual | Generate with all data, generate with missing active project, generate with missing knowledge |
| FR5 | manual | Run oat-progress, verify dashboard updated |
| FR6 | manual | Run oat-index, verify dashboard updated |
| FR7 | manual | Try invalid project path, try missing state.md |
| NFR1 | perf | Time script execution with `time` command |
| NFR2 | manual | Run script twice, diff outputs |
| NFR3 | manual | Delete active-project file, delete knowledge index, delete project state.md |

### Unit Tests

No unit tests for v1 (shell script, manual verification). Consider adding:
- Bats tests for shell script if complexity grows
- TypeScript tests if migrating to @oat/cli

### Integration Tests

Manual integration testing:
- Full workflow: open project → progress → implement → complete → clear
- Edge cases: missing files, invalid paths, stale knowledge

### End-to-End Tests

Manual E2E scenarios during dogfooding:
- Start fresh repo, run oat-index, check dashboard
- Create project, open it, verify pointer
- Complete workflow, verify dashboard updates at each step

## Deployment Strategy

### Build Process

No build required - shell script and SKILL.md files are source.

### Deployment Steps

1. Create .oat/scripts/ directory
2. Add generate-oat-state.sh (executable)
3. Create skill directories under .agent/skills/
4. Add SKILL.md files
5. Register skills in AGENTS.md
6. Add dashboard hook to oat-progress
7. Add dashboard hook to oat-index

### Rollback Plan

Delete added files; no persistent state to migrate.

### Configuration

No configuration needed - uses well-known paths.

### Monitoring

Not applicable - local development tooling.

## Migration Plan

### Pointer Format (v1: Path-Compatible)

**Current State:** Existing skills (oat-progress, oat-discovery, etc.) read `.oat/active-project` as a full path.

**v1 Strategy:** Write full paths for compatibility; read both formats for future-proofing.

**v1 Behavior:**
- `oat-open-project` writes: `{PROJECTS_ROOT}/{project-name}` (full path)
- Reading logic accepts: path (`a/b/project`) or name (`project`)
- Existing skills continue to work unchanged

### Future: Name-Only Migration

**Target State:** Name-only format (e.g., `my-project`) for portability across PROJECTS_ROOT changes.

**Prerequisites:**
1. Create shared "resolve active project" snippet
2. Update all existing skills to use shared snippet
3. Switch `oat-open-project` to write name-only

**Deferred to:** Coordinated update after dogfooding validates the overall design.

### Projects Root Migration

If moving from `.agent/projects/` to `.oat/projects/shared/`:

1. Create `.oat/projects-root` with new path
2. Move project directories to new location
3. Re-run `oat-open-project` to update pointer

**v1 Caveat (path-as-canonical):** Changing `PROJECTS_ROOT` can strand an old pointer until the user re-selects or clears it. The old path won't resolve to a valid directory. This is a tolerable footgun for dogfooding if documented—dashboard will show "state unknown" and prompt re-selection.

**Future (name-only):** Name-only pointer format makes this migration seamless—no pointer update needed if project name unchanged.

## Open Questions

- **Dashboard format:** Should include "recent activity" section? (Deferred to v2)

## Resolved Questions

- **Completion semantics:** ~~Should oat-complete-project update state.md phase to "complete"?~~ **Resolved:** No. Introduced separate `oat_lifecycle` field to track project completion. Phase fields (`oat_phase`, `oat_phase_status`) track workflow progression only.

## Implementation Phases

### Phase 1: Dashboard Script (Core)

**Goal:** Implement generate-oat-state.sh that produces the repo dashboard.

**Tasks:**
- Create .oat/scripts/ directory
- Implement generate-oat-state.sh with all sections
- Test with various states (no project, valid project, stale knowledge, fresh knowledge)
- Verify idempotency
- Verify performance <2s

**Verification:** Script generates correct dashboard for all test cases.

### Phase 2: Project Lifecycle Skills

**Goal:** Implement three skills for project lifecycle management.

**Tasks:**
- Create oat-open-project skill with validation
- Create oat-clear-active-project skill
- Create oat-complete-project skill with warnings
- Register all skills in AGENTS.md
- Test each skill manually

**Verification:** All three skills work correctly and regenerate dashboard.

### Phase 3: Integration Hooks

**Goal:** Wire dashboard generation into existing skills.

**Tasks:**
- Modify oat-progress to call generate-oat-state.sh at end
- Modify oat-index to call generate-oat-state.sh after completion
- Test integration flows

**Verification:** Dashboard auto-updates when running oat-progress or oat-index.

## Dependencies

### External Dependencies

- **bash:** POSIX-compatible shell (available on all target platforms)
- **git:** For diff stats (already required by OAT)

### Internal Dependencies

- **.oat/active-project:** Existing mechanism (used as-is)
- **{PROJECT_PATH}/state.md:** Existing project state (read-only)
- **.oat/knowledge/repo/project-index.md:** Knowledge index (read-only)
- **oat-progress skill:** Modified for integration
- **oat-index skill:** Modified for integration

### Development Dependencies

None beyond existing OAT development setup.

## Risks and Mitigation

- **Shell parsing fragility:** Medium probability | Low impact
  - **Mitigation:** Use simple grep/sed patterns, handle missing data gracefully
  - **Contingency:** Falls back to "unknown" values, dashboard still generates

- **Integration breakage:** Low probability | Medium impact
  - **Mitigation:** Keep integration minimal (single line addition to existing skills)
  - **Contingency:** Remove integration lines; dashboard can be run manually

- **Performance regression:** Low probability | Low impact
  - **Mitigation:** Script uses efficient git diff, no heavy operations
  - **Contingency:** Optimize or make integration optional

## References

 - Specification: `spec.md`
- Reference Design: `.oat/internal-project-reference/temp/oat-project-state.md`
- Knowledge Base: `.oat/knowledge/repo/project-index.md`
- Architecture Docs: `.oat/knowledge/repo/architecture.md`
- Conventions: `.oat/knowledge/repo/conventions.md`
