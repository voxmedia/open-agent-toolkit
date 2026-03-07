---
oat_status: complete
oat_ready_for: design
oat_blockers: []
oat_last_updated: 2026-03-07
oat_generated: false
---

# Specification: oat-tools-command-group

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not design/implementation details.

- Avoid concrete deliverables (specific scripts, file paths, function names).
- Keep the "High-Level Design" section to architecture shape and component boundaries only.
- If a design detail comes up, record it under **Open Questions** for `oat-project-design`.

## Problem Statement

Tool lifecycle management in the OAT CLI is fragmented across unrelated command groups:
- **Install** lives under `oat init tools` (semantically wrong — "init" implies first-time setup, not ongoing management)
- **Remove** lives under `oat remove skill` / `oat remove skills` (separate from install)
- **Update** does not exist as a standalone operation (only as a side effect during init when outdated skills are detected)
- **List** and **outdated check** do not exist at all

Users cannot quickly answer "what tools do I have?", "are any outdated?", or "update tool X" without navigating multiple unrelated commands.

## Goals

### Primary Goals
- Provide a unified `oat tools` command group covering install, update, remove, list, and outdated-check
- Enable standalone tool updates without re-running the full init flow
- Provide visibility into installed tools and their version status
- Auto-apply sync after mutations so provider views stay in sync

### Secondary Goals
- Establish the `--dry-run` convention for new commands (existing commands keep `--apply` until a follow-up)

## Non-Goals

- Deprecation warnings on `oat init tools` and `oat remove skill/skills` (follow-up)
- CLI-wide `--apply` → `--dry-run` convention flip (follow-up)
- Tool publishing, registry, or remote installation
- Tool creation/scaffolding (`oat tools new`)

## Requirements

### Functional Requirements

**FR1: Update single tool**
- **Description:** User can update a single installed tool (skill or agent) by name, pulling the latest bundled version
- **Acceptance Criteria:**
  - Running with a tool name compares installed vs bundled version
  - If outdated, copies bundled version over installed version
  - If current or newer, reports status without modifying
  - If tool not installed or not bundled, reports clear error
  - Works for both skills and agents
- **Priority:** P0

**FR2: Update by pack**
- **Description:** User can update all tools in a named pack (ideas, workflows, utility)
- **Acceptance Criteria:**
  - Accepts `--pack ideas|workflows|utility`
  - Updates all outdated tools in the specified pack
  - Reports per-tool status (updated, current, newer, not-installed)
  - Respects scope constraints (workflows = project-only)
- **Priority:** P0

**FR3: Update all**
- **Description:** User can update all installed tools across all packs
- **Acceptance Criteria:**
  - `--all` flag triggers update of every installed bundled tool
  - Reports per-tool status
  - Handles mixed scopes correctly
- **Priority:** P0

**FR4: Dry-run for update**
- **Description:** User can preview update actions without applying changes
- **Acceptance Criteria:**
  - `--dry-run` flag shows what would be updated without modifying files
  - Default behavior (no flag) applies updates
- **Priority:** P0

**FR5: List installed tools**
- **Description:** User can see all installed tools with version, pack, scope, and update status
- **Acceptance Criteria:**
  - Scans installed skills and agents across requested scopes
  - Shows name, type (skill/agent), version, pack membership, scope, and status
  - Tools not in any bundled pack appear as "custom"
  - Supports `--scope` filtering
- **Priority:** P0

**FR6: Show outdated tools**
- **Description:** User can see only tools with available updates
- **Acceptance Criteria:**
  - Output filtered to outdated tools only
  - Shows installed version and available (bundled) version
  - Returns exit code 0 even if outdated tools exist (informational only)
- **Priority:** P1

**FR7: Install tools (consolidated)**
- **Description:** `oat tools install` provides same functionality as `oat init tools`
- **Acceptance Criteria:**
  - Same pack selection, scope handling, and install behavior as `oat init tools`
  - Delegates to existing install logic (no duplication)
- **Priority:** P1

**FR8: Remove tools (consolidated)**
- **Description:** `oat tools remove` provides same functionality as `oat remove skill` + `oat remove skills`
- **Acceptance Criteria:**
  - `<name>` removes a single tool (skill or agent)
  - `--pack <pack>` removes all tools in a pack
  - `--all` removes all installed tools
  - Delegates to existing remove logic where possible
  - Uses `--dry-run` convention (mutates by default)
- **Priority:** P1

**FR9: Auto-sync after mutations**
- **Description:** After install, update, or remove operations that modify canonical files, automatically run sync to update provider views
- **Acceptance Criteria:**
  - Sync runs automatically after successful mutations (not on dry-run)
  - Sync failures are reported as warnings, not errors (tool operation itself succeeded)
  - `--no-sync` flag allows skipping auto-sync
  - Sync scope matches the scope of the mutation
- **Priority:** P0

### Non-Functional Requirements

**NFR1: JSON output**
- **Description:** All subcommands support structured JSON output
- **Acceptance Criteria:**
  - `--json` flag produces parseable JSON for all operations
  - No mixed stdout (no text + JSON on same stream)
- **Priority:** P0

**NFR2: Non-interactive mode**
- **Description:** All subcommands work without TTY prompts
- **Acceptance Criteria:**
  - When `--json` or non-TTY, no interactive prompts are issued
  - Operations use sensible defaults or fail with clear error
- **Priority:** P0

**NFR3: Existing CLI patterns**
- **Description:** Commands follow established CLI architecture conventions
- **Acceptance Criteria:**
  - Dependency injection pattern for testability
  - Help snapshot tests for all new commands
  - Proper exit codes (0 success, 1 user error, 2 system error)
  - Output through CLI logger (no direct console.*)
- **Priority:** P0

**NFR4: No breaking changes**
- **Description:** Existing `oat init tools` and `oat remove skill/skills` continue working unchanged
- **Acceptance Criteria:**
  - All existing command tests continue to pass
  - No behavior changes to existing commands
- **Priority:** P0

## Constraints

- Must use Commander.js command factories (existing pattern)
- Must use dependency injection for all external dependencies (existing pattern)
- Must reuse existing copy-helpers, version comparison, and manifest management
- Workflows pack is project-scope only; agents are project-scope only
- User scope only supports skills

## Dependencies

- Existing install logic: `installIdeas`, `installWorkflows`, `installUtility`
- Existing remove logic: `runRemoveSkill`
- Existing sync logic: sync engine for auto-sync after mutations
- Copy/version helpers: `copyDirWithVersionCheck`, `compareVersions`, `getSkillVersion`
- Manifest system: `loadManifest`, `saveManifest`, `removeEntry`
- Provider adapters: for computing managed provider views during removal
- Asset resolution: `resolveAssetsRoot`
- Scope resolution: `resolveScopeRoot`, `resolveProjectRoot`

## High-Level Design (Proposed)

The `oat tools` command group is a new top-level Commander command with five subcommands: `install`, `update`, `remove`, `list`, `outdated`. Each subcommand is a separate module following the existing factory + DI pattern.

**Key Components:**
- **tools command group** — top-level Commander command registering subcommands
- **update engine** — core logic for scanning installed vs bundled tools and applying updates (new)
- **list/scan engine** — core logic for enumerating installed tools with metadata (new)
- **install wrapper** — thin delegation to existing init tools logic
- **remove wrapper** — unified interface delegating to existing remove skill logic
- **auto-sync integration** — triggers sync after successful mutations

**Alternatives Considered:**
- Extending existing `init tools` and `remove` commands — rejected because naming is semantically wrong and consolidation provides a cleaner UX
- Print sync reminder instead of auto-sync — rejected per user preference for automatic sync

*Design-related open questions are tracked in the [Open Questions](#open-questions) section below.*

## Success Metrics

- All 5 subcommands have passing help snapshot tests
- Update correctly detects outdated tools and applies updates
- List correctly shows all installed tools with accurate metadata
- Auto-sync runs after mutations and keeps provider views current
- All existing tests continue to pass (no regressions)

## Requirement Index

| ID | Description | Priority | Verification | Planned Tasks |
|----|-------------|----------|--------------|---------------|
| FR1 | Update single tool by name | P0 | unit: update engine with single target | TBD |
| FR2 | Update by pack | P0 | unit: update engine with pack target | TBD |
| FR3 | Update all tools | P0 | unit: update engine with all target | TBD |
| FR4 | Dry-run for update | P0 | unit: dry-run flag skips mutations | TBD |
| FR5 | List installed tools | P0 | unit: scan engine output | TBD |
| FR6 | Show outdated tools | P1 | unit: outdated filter | TBD |
| FR7 | Install tools (consolidated) | P1 | unit: delegation to init tools | TBD |
| FR8 | Remove tools (consolidated) | P1 | unit: delegation to remove skill | TBD |
| FR9 | Auto-sync after mutations | P0 | unit: sync triggered after apply | TBD |
| NFR1 | JSON output | P0 | unit: JSON output format | TBD |
| NFR2 | Non-interactive mode | P0 | unit: no prompts in non-TTY | TBD |
| NFR3 | Existing CLI patterns | P0 | unit + integration: help snapshots, DI | TBD |
| NFR4 | No breaking changes | P0 | integration: existing tests pass | TBD |

## Open Questions

- **Agent version detection:** Agents lack version frontmatter. Should design add it, or use content-hash comparison? (Recommendation: add version frontmatter for consistency.)

## Assumptions

- Existing copy-helpers and version comparison utilities are sufficient for update detection
- Pack membership can be determined statically from existing skill/agent arrays
- Agent files are small enough that content-hash comparison (if needed) is performant
- Sync engine can be invoked programmatically (not just via CLI command)

## Risks

- **Dual-command confusion:** Users see both `oat init tools` and `oat tools install`
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** Deprecation follow-up will resolve; documentation points to `oat tools`

## References

- Discovery: `discovery.md`
