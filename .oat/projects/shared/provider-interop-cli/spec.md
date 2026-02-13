---
oat_status: complete
oat_ready_for: oat-design
oat_blockers: []
oat_last_updated: 2026-02-13
oat_generated: false
---

# Specification: provider-interop-cli

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not design/implementation details.

- Avoid concrete deliverables (specific scripts, file paths, function names).
- Keep the "High-Level Design" section to architecture shape and component boundaries only.
- If a design detail comes up, record it under **Open Questions** for `/oat:design`.

## Problem Statement

AI development teams increasingly use multiple coding agents (Claude Code, Cursor, Codex CLI) simultaneously or switch between them depending on the task. Each tool expects skills and agent definitions in its own directory (`.claude/skills/`, `.cursor/skills/`, `.codex/agents/`, etc.), creating a maintenance burden: skills must be duplicated across provider directories, changes in one location drift from others, and there's no single source of truth.

The Agent Skills open standard has converged on `.agents/skills/` as a tool-agnostic canonical location (used natively by Codex and Amp, discovered by the `npx skills` CLI). However, no existing tool provides a complete workflow for maintaining a canonical `.agents/` directory and keeping provider-specific views in sync with drift detection and safe operations.

The `oat` CLI will own this lifecycle: initialize the canonical structure, detect providers, sync via symlinks (with copy fallback), track what it manages via a manifest, detect drift, and provide diagnostics — all with safety-first defaults (dry-run, manifest-scoped destructive operations). It replaces the need for `npx openskills` or `npx skills` for sync management.

## Goals

### Primary Goals
- Establish `.agents/` as the single source of truth for skills and agent definitions at both project and user level (user-level scope covers skills only; user-level agents deferred)
- Automatically sync canonical content to provider-specific directories via symlinks
- Detect and report drift between canonical source and provider views
- Provide safe, reversible sync operations with explicit user consent for changes
- Support both project-level (`.agents/`) and user-level (`~/.agents/`) sync scopes

### Secondary Goals
- Detect and offer to adopt existing provider-local skills into the canonical location
- Provide environment diagnostics with actionable fix guidance
- Optional git hook for pre-commit drift warnings
- Extensible provider adapter architecture for future tool support

## Non-Goals

- Gemini CLI and GitHub Copilot provider support (v1 targets Claude Code, Cursor, Codex only)
- Rules/instructions sync (CLAUDE.md, .cursorrules, GEMINI.md are inherently provider-specific)
- `.agent/` → `.agents/` migration (follow-up task after CLI is functional)
- User-level subagent sync (defer until subagent standards stabilize)
- Subagent frontmatter translation between providers
- CI/CD pipeline integration
- Skill publishing or registry features
- Branch-aware sync or multi-project switching

## Requirements

### Functional Requirements

**FR1: Initialize Canonical Structure (`oat init`)**
- **Description:** Bootstrap the `.agents/` directory structure at project level and `~/.agents/` at user level, with optional adoption of existing provider-local content.
- **Acceptance Criteria:**
  - Creates `.agents/skills/` and `.agents/agents/` directories at project root if they don't exist
  - Creates `~/.agents/skills/` directory if it doesn't exist (user-level agents deferred)
  - Detects existing provider-local skills in `.claude/skills/`, `.cursor/skills/` (project level) and their user-level equivalents
  - For each detected provider-local skill, interactively prompts user to adopt (move to `.agents/` + create symlink back) or skip
  - Skips adoption for items that are already symlinks pointing to `.agents/`
  - Reports summary of actions taken at completion
  - Is idempotent — running `oat init` on an already-initialized repo makes no destructive changes
- **Priority:** P0

**FR2: Provider Detection and Status (`oat status`)**
- **Description:** Detect installed providers, show sync state for all managed content, and identify strays across both project and user scopes.
- **Acceptance Criteria:**
  - Detects which providers are present by checking for their directory structures
  - For each provider, reports skills and agents as: `in_sync`, `drifted` (content or symlink diverged from canonical — sub-reasons: `modified` for copy-mode content change, `broken` for symlink target deleted, `replaced` for symlink target changed), `missing` (canonical exists but provider view doesn't), or `stray` (provider view exists but no canonical source)
  - Operates on both project-level and user-level scopes (shows both by default, filterable via flag)
  - When strays are detected, interactively prompts user to adopt each one or skip
  - Displays a summary table showing provider x content type x sync state
- **Priority:** P0

**FR3: Sync Canonical to Providers (`oat sync`)**
- **Description:** Create or update provider-specific views (symlinks or copies) from the canonical `.agents/` source, with dry-run as the default behavior.
- **Acceptance Criteria:**
  - Default behavior (no flags) shows a diff/preview of what would change without making any modifications
  - `--apply` flag executes the sync, creating symlinks or copies as configured
  - Supports both project-level and user-level scopes (syncs both by default, filterable via flag)
  - User-level scope syncs skills only (user-level agents deferred per discovery)
  - For each canonical skill/agent, creates the appropriate view in each provider's directory
  - Symlink mode: creates directory symlinks from provider path to canonical path
  - Copy mode: copies content and records hash in manifest for drift detection
  - Updates the sync manifest after successful apply
  - Reports summary of changes made (created, updated, removed)
  - Only removes provider-side files that are tracked in the manifest (never deletes unmanaged content)
- **Priority:** P0

**FR4: Environment Diagnostics (`oat doctor`)**
- **Description:** Validate the OAT environment and provide actionable guidance for any issues detected.
- **Acceptance Criteria:**
  - Checks for `.agents/` directory existence and structure (project and user level)
  - Checks for manifest existence and integrity
  - Tests symlink creation capability on the current filesystem
  - Detects which providers are installed and their versions (where detectable)
  - Validates provider directory structure matches expected paths
  - For Codex subagent support: reports whether Codex agents path is functional (best-effort)
  - Reports each check as pass/warn/fail with a suggested fix action for failures
- **Priority:** P0

**FR5: Provider Adapter System**
- **Description:** Each supported provider is represented by an adapter that defines its directory paths, sync strategy, and content types.
- **Acceptance Criteria:**
  - Claude Code adapter: project-level maps `.agents/skills/` → `.claude/skills/` and `.agents/agents/` → `.claude/agents/`; user-level maps `~/.agents/skills/` → `~/.claude/skills/` (user-level agents deferred)
  - Cursor adapter: project-level skill sync maps `.agents/skills/` → `.cursor/skills/` (always syncs directly to `.cursor/`, never relies on `.claude/` cross-compat fallback); project-level agent sync maps `.agents/agents/` → `.cursor/agents/`; user-level maps `~/.agents/skills/` → `~/.cursor/skills/` (user-level agents deferred)
  - Codex adapter: no skill sync needed at either scope (Codex reads `.agents/skills/` natively); project-level agent sync to `.codex/agents/` is best-effort with non-blocking warning if unsupported; user-level maps `~/.agents/skills/` (Codex reads natively, no sync needed)
  - Each adapter declares its sync strategy preference and supported content types
  - New providers can be added without modifying existing adapter logic
- **Priority:** P0

**FR6: Sync Manifest**
- **Description:** Track all managed mappings between canonical source and provider views to enable safe drift detection and scoped destructive operations.
- **Acceptance Criteria:**
  - Manifest records each managed mapping: canonical path, provider path, sync strategy used, and content hash (for copy mode)
  - Manifest is stored at `.oat/sync/manifest.json` (project level) and `~/.oat/sync/manifest.json` (user level)
  - Manifest is updated atomically after each successful sync
  - Destructive operations (removing a provider view when its canonical source is deleted) only apply to manifest-tracked entries
  - Manifest includes metadata: last sync timestamp, OAT version
- **Priority:** P0

**FR7: Drift Detection**
- **Description:** Detect when provider views have diverged from their canonical source.
- **Acceptance Criteria:**
  - Symlink mode: detects broken symlinks (target deleted) and replaced symlinks (target changed)
  - Copy mode: detects content changes by comparing current hash against manifest-recorded hash
  - Detects "stray" content: files in provider directories not tracked by the manifest and not present in `.agents/`
  - Drift state is surfaced in `oat status` output
  - Drift details are available for individual items (which file changed, when)
- **Priority:** P0

**FR8: Stray Adoption**
- **Description:** When provider-local content exists that isn't tracked in `.agents/`, offer to adopt it into the canonical location.
- **Acceptance Criteria:**
  - Detection occurs during `oat status` and `oat init`
  - For each stray, user is prompted interactively: adopt (move to `.agents/` + create symlink/copy back) or skip
  - Adoption preserves the original content exactly (no modification)
  - After adoption, the stray becomes a managed entry in the manifest
  - Users can skip all remaining strays with a single action
- **Priority:** P1

**FR9: Sync Strategy Configuration**
- **Description:** Allow configuring the sync strategy (symlink vs. copy) per provider or globally.
- **Acceptance Criteria:**
  - Default strategy is `auto` (symlink where supported, copy as fallback)
  - Strategy can be overridden per-provider
  - Configuration persists across invocations
  - `oat doctor` reports the active strategy for each provider
- **Priority:** P1

**FR10: Generated Views Contract**
- **Description:** Mark provider-side views as generated/managed to prevent accidental direct editing.
- **Acceptance Criteria:**
  - Symlink mode: symlinks are inherently "pointers" — editing the target edits the canonical source (correct behavior, no marker needed)
  - Copy mode: provider-side copies include a marker indicating they are OAT-managed and should not be edited directly
  - `oat status` warns if a copy-mode file has been modified locally (drift)
- **Priority:** P1

**FR11: Optional Git Pre-commit Hook**
- **Description:** Provide an opt-in git hook that warns on drift before committing.
- **Acceptance Criteria:**
  - Hook is installed via `oat init` with explicit user consent (not automatic)
  - Hook runs drift detection and prints a warning if provider views are out of sync
  - Hook does NOT block the commit (warning only)
  - Hook can be uninstalled cleanly
- **Priority:** P1

**FR12: Provider Introspection**
- **Description:** Provide commands to list registered providers and inspect individual provider configuration, detection status, and per-mapping sync state.
- **Acceptance Criteria:**
  - `oat providers list` enumerates all registered provider adapters with detection status, default strategy, supported content types, and sync status summary
  - `oat providers inspect <name>` displays detailed provider information including path mappings per scope, config overrides, per-mapping sync state, and CLI version (when available)
  - Both subcommands support `--scope` and `--json` flags
  - Provider name resolution is case-insensitive
- **Priority:** P1

### Non-Functional Requirements

**NFR1: Safety by Default**
- **Description:** All operations that modify the filesystem must be safe by default, requiring explicit user consent for changes.
- **Acceptance Criteria:**
  - `oat sync` without `--apply` makes zero filesystem changes
  - Destructive operations only affect manifest-tracked files
  - `oat init` adoption flow is interactive (no automatic moves)
  - No operation silently deletes user content
- **Priority:** P0

**NFR2: Platform Compatibility**
- **Description:** The CLI must work on macOS and Linux; Windows is best-effort with copy fallback.
- **Acceptance Criteria:**
  - All commands work correctly on macOS (Darwin) and Linux
  - Directory symlink creation works on macOS and Linux (file-level symlinks not required for v1)
  - On platforms where symlinks fail, copy mode is used automatically with a logged explanation
- **Priority:** P0

**NFR3: Provider Extensibility**
- **Description:** Adding support for a new provider should not require changes to core sync logic.
- **Acceptance Criteria:**
  - A new provider can be added by defining an adapter (paths, strategy, content types) without modifying sync, status, or doctor logic
  - Provider adapter interface is documented
- **Priority:** P1

**NFR4: Clear User Communication**
- **Description:** All CLI output must be clear, concise, and actionable.
- **Acceptance Criteria:**
  - Status output uses consistent formatting (tables, color coding for pass/warn/fail)
  - Error messages include suggested fix actions
  - Dry-run output clearly distinguishes "what would happen" from "what happened"
  - Verbose mode available for debugging
- **Priority:** P1

**NFR5: Idempotency**
- **Description:** Running the same command multiple times should produce the same result without side effects.
- **Acceptance Criteria:**
  - `oat init` on an already-initialized repo is a no-op (no errors, no duplicate work)
  - `oat sync --apply` when already in sync produces no changes
  - `oat doctor` is read-only (never modifies state)
- **Priority:** P0

## Constraints

- Must work on macOS and Linux (symlink support required)
- Must not break existing `.agent/` workflow skills during development
- Sync operations must be safe by default (dry-run, manifest-scoped deletes only)
- Provider adapter behavior must match documented provider paths (see research references in discovery)
- Skills must follow the Agent Skills open standard (SKILL.md frontmatter + directory structure)
- CLI distributed as npm package, runnable via `npx oat` or global install

## Dependencies

- Node.js runtime (22.x+ for consistency with repo; actual minimum TBD in design)
- Filesystem symlink support on target OS
- Provider CLI tools installed by user (Claude Code, Cursor, Codex — optional; enables richer diagnostics and version reporting in `oat doctor`, but not required for core sync/status which uses filesystem-based detection)
- Git (for hook installation and pre-commit integration)

## High-Level Design (Proposed)

The CLI follows a layered architecture with clear separation between the command surface, sync engine, and provider adapters.

The **command layer** handles CLI parsing, user interaction (prompts, dry-run output), and orchestrates operations. Each command (`init`, `status`, `sync`, `doctor`) is a thin entry point that delegates to the sync engine.

The **sync engine** is the core: it compares the canonical `.agents/` state against provider views using the manifest as the source of truth for what's managed. It produces a "sync plan" (list of operations: create symlink, copy file, remove stale view, etc.) that can be previewed (dry-run) or executed (apply). The engine operates on both project and user scopes.

**Provider adapters** are configuration objects that declare: provider name, directory paths (project and user level, for skills and agents), default sync strategy, and detection logic. The sync engine iterates adapters without knowing provider-specific details.

**Key Components:**
- Command layer — CLI parsing, user interaction, orchestration
- Sync engine — Diff canonical vs. provider views, produce sync plan, execute plan
- Provider adapters — Per-provider path and strategy declarations
- Manifest manager — Read/write/query the sync manifest
- Drift detector — Compare canonical state against manifest and filesystem

**Alternatives Considered:**
- Wrapping `npx skills` CLI — Rejected: less control over manifest, drift detection, and canonical source model (see discovery Option B)

*Design-related open questions are tracked in the [Open Questions](#open-questions) section below.*

## Success Metrics

- **Sync correctness:** After `oat sync --apply`, all three v1 providers can discover and load skills from their native paths (manual verification per provider)
- **Drift detection accuracy:** `oat status` correctly identifies drifted, missing, and stray content with zero false positives on a test repo
- **Safety:** No user content is lost during any sync, init, or adoption operation (verified by test scenarios)
- **Idempotency:** Running `oat sync --apply` twice produces identical filesystem state
- **Time to add a provider:** A new provider adapter can be added and working in under 30 minutes (measured during Gemini/Copilot addition later)

## Requirement Index

| ID | Description | Priority | Verification | Planned Tasks |
|----|-------------|----------|--------------|---------------|
| FR1 | Initialize canonical structure and adopt existing content | P0 | integration: init on empty + populated repos | p04-t03, p04-t08 |
| FR2 | Provider detection and sync status reporting | P0 | integration: status output across provider combinations | p03-t01, p03-t02, p04-t01, p04-t08 |
| FR3 | Sync canonical to provider directories | P0 | integration: sync apply + dry-run for skills and agents | p02-t02, p02-t03, p02-t05, p04-t02 |
| FR4 | Environment diagnostics with actionable guidance | P0 | integration: doctor checks on healthy + broken environments | p04-t06, p04-t08 |
| FR5 | Provider adapter system (Claude, Cursor, Codex) | P0 | unit: adapter path resolution + strategy selection | p01-t10, p01-t11, p01-t12, p01-t13, p05-t03 |
| FR6 | Sync manifest tracking | P0 | unit: manifest CRUD + hash computation | p01-t14, p01-t15, p01-t16 |
| FR7 | Drift detection (symlink + copy modes) | P0 | unit + integration: drift scenarios for both modes | p03-t01, p03-t02, p02-t05 |
| FR8 | Stray adoption with interactive prompts | P1 | integration: adoption flow with mock prompts | p03-t04, p04-t01, p04-t03 |
| FR9 | Per-provider sync strategy configuration | P1 | unit: strategy resolution and persistence | p01-t18, p02-t02 |
| FR10 | Generated views contract (markers for copy mode) | P1 | unit: marker insertion and drift warning | p02-t04 |
| FR11 | Optional git pre-commit hook | P1 | integration: hook install + drift warning on commit | p05-t01 |
| FR12 | Provider introspection (list + inspect) | P1 | integration: providers list/inspect output + --json mode | p04-t04, p04-t05 |
| NFR1 | Safety by default (dry-run, manifest-scoped deletes) | P0 | integration: verify no changes without --apply | p02-t05, p04-t02, p04-t08 |
| NFR2 | Platform compatibility (macOS + Linux) | P0 | e2e: test suite on both platforms | p01-t19, p05-t05 |
| NFR3 | Provider extensibility | P1 | manual: add mock provider adapter | p01-t10, p05-t03 |
| NFR4 | Clear user communication | P1 | manual: review CLI output for clarity | p01-t05, p03-t03, p05-t04 |
| NFR5 | Idempotency | P0 | integration: double-run produces no changes | p02-t05, p04-t08 |

## Open Questions

- **Config file format:** Should provider adapter configuration and strategy overrides live in `.oat/sync/config.json`, a section of a broader `.oat/config.json`, or something else? (For design phase)
- **Manifest versioning:** Should the manifest include a schema version for forward compatibility? (For design phase)
- **User-level manifest isolation:** If multiple repos use OAT, does the user-level manifest at `~/.oat/sync/manifest.json` need to track which repo triggered each mapping? (For design phase)
- **Cursor agent paths:** Cursor reads `.claude/skills/` for cross-compat but uses `.cursor/agents/` for its own agents. Should the Cursor adapter sync agents to `.cursor/agents/` in addition to `.claude/agents/`? (For design phase — need empirical validation)
- **User-level agent paths:** User-level agent sync is deferred for v1. When re-enabled, which providers support user-level agents (e.g., `~/.claude/agents/`, `~/.cursor/agents/`)? Needs validation before promoting to in-scope.

## Assumptions

- Provider skill paths documented in research are current and accurate (validated for Codex in Feb 2026)
- Symlinks work reliably on macOS and Linux for directory-level symlinks
- Users are comfortable with a single canonical source model
- The Agent Skills open standard will remain stable

## Risks

- **Provider path changes:** A provider updates their skill discovery paths, breaking adapter logic.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation:** Config-driven adapter paths; `oat doctor` validates at runtime

- **Symlink compatibility edge cases:** Some git workflows (sparse checkout, worktrees) may not handle symlinks well.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** `oat doctor` detects issues; copy fallback

- **Codex subagent support availability:** Codex agent support may be unavailable or partially documented.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Capability detection in `oat doctor`; non-blocking warnings; continue syncing other providers

## References

- Discovery: `discovery.md`
- Discovery review: `reviews/discovery-review.md`
- Knowledge Base: `.oat/knowledge/repo/project-index.md`
- Skills research: `.oat/internal-project-reference/research/skills-reference.md`
- Architecture reference: `.oat/internal-project-reference/research/skills-reference-architecture.md`
- Provider docs: `.oat/internal-project-reference/research/provider-documentation-reference.md`
- Subagents research: `.oat/internal-project-reference/research/subagents-reference.md`
