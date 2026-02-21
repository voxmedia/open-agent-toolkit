# OAT Backlog (Internal / Dogfood)

Capture tasks and ideas that come up while dogfooding but aren’t ready to implement yet.

## How to Use

- Add new items to **Inbox** as you notice them.
- Promote items from **Inbox** → **Planned** once there’s clear scope/acceptance criteria.
- When an item is ready to implement, create (or link) an OAT project and move it to **In Progress**.
- Close items by moving to **Completed Archive** (or **Deferred**) with a short rationale.

## Conventions

- **Priority:** P0 (must), P1 (should), P2 (nice-to-have)
- **Area:** workflow | skills | templates | scripts | docs | tooling
- **Linking:** Prefer linking to the source note (e.g., `workflow-user-feedback.md`) and/or commits/PRs.

## Inbox

- [ ] **(P?) [area] {Title}**
  - Context:
  - Proposed change:
  - Success criteria:
  - Links:
  - Created: YYYY-MM-DD

- [ ] **(P1) [skills] Enforce autonomous review gates in `oat-project-subagent-implement`**
  - Context: The skill's autonomous review gate (Step 4) has no hard enforcement before merge (Step 5). During first real usage (adding Copilot/Gemini providers), Phase 1 subagents were dispatched and merged without the review gate running.
  - Proposed change:
    - Implement orchestrator-driven review loop: after each implementer subagent completes, orchestrator dispatches a separate **reviewer** subagent (read-only, same worktree) that returns findings.
    - If Critical/Important findings exist, orchestrator dispatches a **fix** subagent with the findings, then re-runs reviewer. Loop bounded by `oat_orchestration_retry_limit`.
    - Merge step refuses to proceed if review gate hasn't been executed for that unit.
    - Review verdicts logged in `implementation.md` orchestration runs section.
  - Success criteria:
    - Merge step requires review gate execution per unit (no skip possible).
    - Review verdicts are logged with full traceability in orchestration run artifacts.
    - Fix loop respects `oat_orchestration_retry_limit` and excludes failed units cleanly.
    - Reviewer subagent is a peer dispatch (no subagent nesting).
  - Links:
    - Skill: `.agents/skills/oat-project-subagent-implement/SKILL.md`
    - GitHub issue: #27
  - Created: 2026-02-21

- [ ] **(P1) [tooling] Add skill versioning to SKILL.md frontmatter and `oat init tools` update detection**
  - Context: `oat init tools` currently checks only file existence — if a skill directory exists, it reports "skipped". Users have no way to know their installed skills are outdated without using `--force` to blindly overwrite.
  - Proposed change:
    - Add `version` field to SKILL.md frontmatter (semver, e.g., `version: 1.0.0`).
    - Teach `oat init tools` to compare installed vs bundled versions: if bundled is newer, prompt to update; if versions match, skip; if no version field, treat as v0.0.0.
    - Optionally surface outdated skills in `oat doctor` / `oat status`.
  - Success criteria:
    - `oat init tools` detects and offers to update outdated skills without `--force`.
    - Skills without version field are treated as upgradeable.
    - `--force` still works as a blunt override.
  - Links:
    - Idea: `.oat/ideas/skill-versioning/discovery.md`
    - Related: `packages/cli/src/commands/init/tools/shared/copy-helpers.ts`
  - Created: 2026-02-19

- [ ] **(P2) [workflow] Backlog Refinement Flow (Jira ticket generation)**
  - Context: Need a structured, conversational way to break large initiatives into epics/stories/tasks during planning, then create them in Jira with minimal manual effort.
  - Proposed change:
    - Add a “Backlog Refinement Flow” skill that interviews the user and produces a structured backlog artifact (epics/stories/tasks) using templates.
    - Add an integration step that can create the resulting items in Jira (via Atlassian CLI) after user confirmation and iterative refinement.
  - Success criteria:
    - User can run a single flow to go from “idea” → “structured backlog” (epics/stories/tasks) → “Jira tickets created”.
    - Supports iterative refinement before ticket creation (multiple passes).
    - Uses a template-driven output format for consistency.
  - Links:
    - Skill idea source: this backlog entry
    - Integration: Atlassian CLI (and/or existing `create-ticket` plumbing if applicable)
  - Created: 2026-01-29

## Planned

- [ ] **(P1) [skills] Documentation analysis skill family (`oat-docs-analyze`, `oat-docs-apply`)**
  - Target milestone/phase: Core value delivery — docs quality and coverage
  - Notes:
    - Same analyze→apply pattern as agent instructions, applied to documentation:
      - `docs/` directories, `README.md` files, MkDocs sites, basic markdown docs directories.
    - **`oat-docs-analyze`**: Reviews existing docs for quality, coverage, staleness, drift, verbosity, and gaps.
      - Quality analysis always runs (accuracy, completeness, verbosity, structure).
      - Delta mode: review only files changed since last tracked run.
      - Full mode: comprehensive review of entire docs surface.
      - Outputs structured analysis artifact with Critical / High / Medium / Low severity ratings.
    - **`oat-docs-apply`**: Interactive application of analysis findings + docs generation.
      - If no docs directory exists, proposes adding one (basic markdown or MkDocs scaffold — MkDocs support is a later enhancement).
      - Creates/updates docs based on approved recommendations.
      - Creates a branch + PR for review.
    - Related to but distinct from:
      - `docs-completed-projects-gap-review` (PR #24) — narrower, focuses on gaps left by completed OAT projects.
      - `oat-project-document` (B03) — project-lifecycle-scoped docs synthesis at closeout.
      - This family is codebase-wide and lifecycle-independent.
    - MkDocs scaffolding is a future enhancement (eventually `oat init docs --mkdocs` or similar).
  - Success criteria:
    - Running analyze detects stale/drifted docs, missing coverage, and quality issues.
    - Delta mode scopes analysis to files changed since last run via `.oat/tracking.json`.
    - Apply generates clean PRs with well-structured documentation.
  - Links:
    - Reference: `.agents/docs/` (existing docs guidance)
    - Related skill: `docs-completed-projects-gap-review` (PR #24)
    - Related backlog: `oat-project-document` (B03)
  - Created: 2026-02-19

- [ ] **(P1) [tooling] Continue OAT runtime config consolidation under `.oat/config.json` + `.oat/config.local.json` (Phase B/C)**
  - Target milestone/phase: Workflow ergonomics + configuration hygiene
  - Notes:
    - Phase A is implemented: `.oat/config.json` is in use for `worktrees.root` and `oat-worktree-bootstrap` reads it with deterministic precedence.
    - **Approach: split tracked vs local config**
      - `.oat/config.json` (tracked) — shared repo settings: `worktrees.root`, `projects.root` (from `.oat/projects-root`), provider config pointers, VCS policy flags.
      - `.oat/config.local.json` (gitignored) — per-developer state: `activeProject` (from `.oat/active-project`), `activeIdea` (from `.oat/active-idea`), per-dev overrides.
      - Runtime merge: `config.local.json` keys win over `config.json` for any overlapping keys.
    - **Why this solves the worktree problem**: `oat-worktree-bootstrap` copies one file (`config.local.json`) instead of hunting for N individual pointer files. New per-developer settings automatically propagate without skill updates.
    - **Migration mechanics**:
      - Skills switch from `cat .oat/active-project` to `jq -r '.activeProject' .oat/config.local.json`.
      - Phase B: move `.oat/projects-root` into `.oat/config.json` with compatibility reads.
      - Phase C: move `active-project` and `active-idea` into `.oat/config.local.json`, update skills to use `jq`, drop legacy pointer files.
    - Keep sync config stable for now (`.oat/sync/config.json`) and evaluate later migration after CLI ownership is clearer.
  - Success criteria:
    - `.oat/config.local.json` is gitignored and holds all per-developer state.
    - `.oat/config.json` holds all shared repo config.
    - Skills read config via `jq` — no CLI accessor prerequisite needed.
    - `oat-worktree-bootstrap` propagates `config.local.json` as a single file copy.
    - Legacy pointer files removed after migration.
  - Links:
    - External plan: `.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md`
    - Related decision: `.oat/repo/reference/decision-record.md`
    - Implementation project: `.oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation/`
  - Created: 2026-02-17

- [ ] **(P1) [skills] Add `oat-project-document` for post-implementation documentation synthesis**
  - Target milestone/phase: Workflow quality + closeout discipline
  - Notes:
    - Add a dedicated skill to run after implementation/review cycles and generate documentation update recommendations (and optional patches) based on project artifacts + implementation diffs.
    - Scope should include, where applicable:
      - repo docs under `docs/oat/**`
      - root `README.md`
      - project or scoped `AGENTS.md` / `CLAUDE.md` instruction updates
      - `.oat/repo/reference/**` updates for behavior/status drift.
    - Support two execution contexts:
      - active project before completion
      - completed/archived project path (read-only source artifacts still available).
    - Integrate into closeout flow:
      - suggest `oat-project-document` before `oat-project-complete`
      - optionally add a project frontmatter/status flag to record documentation-sync state.
  - Success criteria:
    - Running `oat-project-document` produces a clear docs delta plan and/or applies approved updates with traceability.
    - Skill can target both active and archived projects without requiring phase mutation.
    - `oat-project-complete` flow can recommend or gate on documentation sync status (policy configurable).
  - Links:
    - Related workflow skills: `oat-project-review-provide`, `oat-project-review-receive`, `oat-project-complete`
  - Created: 2026-02-17

- [ ] **(P1) [workflow] Add first-class OAT project/repo management workflow family (`oat-pjm-*` or `oat-repo-reference-*`)**
  - Target milestone/phase: Workflow governance + reference hygiene
  - Notes:
    - Formalize the internal flows currently being run ad-hoc:
      - backlog capture/review/completion
      - decision-record updates
      - current-state/reference refresh
      - review and external-plan hygiene (dedupe, archive, cleanup)
    - Support both operating modes:
      - **version-controlled mode** (artifacts tracked in git)
      - **local-only mode** (artifacts kept out of git by policy/config)
    - Add explicit configuration for:
      - which `.oat/` directories are gitignored by policy
      - which directories should copy local <-> worktree during bootstrap/sync
    - Prefer interactive multi-select flows for cleanup/archive decisions.
  - Success criteria:
    - Teams can run a repeatable PM/reference lifecycle with clear commands/skills.
    - Same workflow supports both tracked and local-only artifact policies.
    - Cleanup/archive flows reduce stale duplicates without losing important context.
  - Links:
    - Related backlog area: artifact cleanup and stale review/external-plan management
  - Created: 2026-02-18


- [ ] **(P2) [tooling] Optional Codex prompt-wrapper generation for synced OAT skills**
  - Target milestone/phase: Post-standardization enhancement
  - Notes:
    - Add opt-in generation of thin `.codex/prompts` wrappers for `oat-*` skills when users sync skills to Codex.
    - Wrappers should be minimal aliases only (no duplicated workflow logic), so skill files remain the source of truth.
    - Keep feature optional to avoid imposing Codex-specific files on repos that do not want them.
  - Links:
    - Related to invocation compatibility standardization item above
  - Created: 2026-02-14

- [ ] **(P1) [tooling] Add Codex markdown→TOML subagent adapter and re-enable Codex agent sync**
  - Target milestone/phase: Codex multi-agent compatibility hardening
  - Notes:
    - Implement an adapter that converts canonical markdown agent definitions (`.agents/agents/*.md`) into Codex role configuration:
      - role entries in `.codex/config.toml` (`[agents.<name>]`)
      - optional per-role TOML files under `.codex/agents/*.toml` referenced via `config_file`
    - Keep current behavior until adapter is complete:
      - do not sync canonical agents into `.codex/agents`
      - keep skills sync/native-read behavior unchanged
    - Ensure generated role config preserves core metadata and instruction intent while avoiding provider-specific field leakage.
    - Define idempotent regeneration rules so repeated syncs are deterministic and safe.
  - Success criteria:
    - `oat sync --apply` can generate Codex-consumable role config from canonical agents without manual TOML edits.
    - Generated config passes Codex multi-agent prerequisites (`[features] multi_agent = true` and valid role declarations).
    - Provider docs and doctor/status messaging reflect adapter-backed behavior.
    - Existing Claude/Cursor agent sync behavior is unchanged.
  - Links:
    - Codex multi-agent docs: https://developers.openai.com/codex/multi-agent
    - Codex local config docs: https://developers.openai.com/codex/local-config
    - Related file: `packages/cli/src/providers/codex/paths.ts`
  - Created: 2026-02-19

- [ ] **(P1) [tooling] Add context management commands for `AGENTS.md` ↔ `CLAUDE.md` integrity**
  - Target milestone/phase: OAT CLI workflow quality
  - Notes:
    - Add `oat context sync` to recursively scan for `AGENTS.md` and ensure sibling `CLAUDE.md` contains `@AGENTS.md`.
    - Add interactive conflict handling when existing `CLAUDE.md` has additional content (overwrite/skip/show diff).
    - Add optional flags: `--force`, `--dry-run`, `--interactive`, `--report`.
    - Add `oat context validate` to report missing/invalid context files without mutation.
  - Success criteria:
    - Running context sync repairs missing/invalid context pointers deterministically.
    - Running context validate reports actionable results and exit status suitable for CI checks.
    - No unexpected overwrites in interactive/default mode.
  - Links:
    - Source discussion: OAT feature ideas (agent context management)
  - Created: 2026-02-14

- [ ] **(P1) [skills] Complete review receive + PR-review intake skill family**
  - Target milestone/phase: Workflow expansion after current docs stabilization
  - Notes:
    - Add `oat-review-receive` for converting review feedback into actionable plan/fix tasks (non-mutating).
    - Add `oat-review-pr-receive` to ingest GitHub PR review comments and produce task lists.
    - Preserve explicit separation: review ingestion does not apply fixes; implementation skill performs fixes.
  - Success criteria:
    - Review artifacts generated consistently across local and PR contexts.
    - Receive flows output structured fix tasks with clear severity/disposition.
    - No fix application side effects from review skills.
  - Links:
    - Source discussion: OAT feature ideas (review workflow)
  - Created: 2026-02-14

- [ ] **(P2) [skills] Add PR review follow-on skill set (`provide/respond/summarize`)**
  - Target milestone/phase: Post `oat-review-pr-receive`
  - Notes:
    - Evaluate and add `oat-review-pr-provide`, `oat-review-pr-respond`, and `oat-review-pr-summarize`.
    - Scope these as optional extensions once base review receive workflow is stable.
  - Success criteria:
    - Clear contracts and non-overlapping responsibilities for each PR review skill.
    - Optional set can be adopted incrementally without changing core review flow.
  - Links:
    - Source discussion: OAT feature ideas (potential future review extensions)
  - Created: 2026-02-14

- [ ] **(P2) [skills] Add dependency intelligence skill family**
  - Target milestone/phase: Post naming normalization
  - Notes:
    - Evaluate canonical name (`oat-dep-audit`, `oat-dep-evaluate`, `oat-dep-plan-upgrade`, or `oat-dep-impact-report`).
    - Behavior: analyze `package.json`, compare available versions, summarize changelog impact, classify breaking vs non-breaking, suggest upgrade path.
    - Optional enhancement: code usage scan for potentially breaking API changes.
  - Success criteria:
    - Skill outputs prioritized, actionable upgrade plan (not just version lists).
    - Breaking-change risk is explicitly identified and linked to candidate code touch points.
  - Links:
    - Source discussion: OAT feature ideas (dependency intelligence)
  - Created: 2026-02-14

- [ ] **(P2) [tooling] Add skill uninstall command (`oat remove skill` / `oat uninstall skill`)**
  - Target milestone/phase: OAT CLI lifecycle completeness
  - Notes:
    - Add a first-class CLI command to remove skills from canonical storage and propagate deletion to provider views.
    - Support both project and user scopes via existing `--scope` behavior.
    - Handle both managed (manifest-tracked) and unmanaged/stray provider entries with safe prompts.
    - Keep dry-run support and explicit apply semantics consistent with `oat sync`.
  - Success criteria:
    - User can remove one or more skills without manual filesystem cleanup.
    - Provider views are cleaned up deterministically after removal.
    - Manifest state remains consistent (no orphaned managed entries).
    - Command output clearly reports what was removed vs skipped.
  - Links:
    - Related gap: skill removal currently requires manual deletion + sync
  - Created: 2026-02-16

- [ ] **(P1) [tooling] Add `oat project open|switch|pause` lifecycle commands**
  - Target milestone/phase: OAT CLI lifecycle hygiene + workflow ergonomics
  - Notes:
    - Add `oat project open <project-name>` to validate project existence and set `.oat/active-project`.
    - Add `oat project switch <project-name>` as an explicit switching command (can alias `open` behavior but should preserve clear user-facing intent in help/output).
    - Add `oat project pause [<project-name>]` to mark a project as paused and record pause metadata in `state.md` (at minimum timestamp + optional reason), while keeping active-project behavior explicit.
    - Ensure all commands refresh `.oat/state.md` after apply operations for consistent dashboard bookkeeping.
    - Keep semantics compatible with current path-based active pointer contract (see ADR-001/ADR-004).
  - Success criteria:
    - `oat project open` provides CLI-native project activation with validation (no manual pointer edits required).
    - `oat project switch` provides deterministic, test-covered switching behavior and clear output about old/new active project.
    - `oat project pause` records paused state in project metadata and is reflected in dashboard output/recommendations.
    - Command help and tests cover success and common failure paths (missing project, invalid name, missing `state.md`).
  - Links:
    - Related skills: `.agents/skills/oat-project-open/SKILL.md`, `.agents/skills/oat-project-clear-active/SKILL.md`
    - Related decisions: `.oat/repo/reference/decision-record.md` (ADR-001, ADR-004)
  - Created: 2026-02-18

- [ ] **(P1) [tooling] Add configurable VCS policy + worktree sync behavior for OAT artifact directories**
  - Target milestone/phase: Worktree ergonomics + artifact signal/noise control
  - Notes:
    - Add explicit configuration for whether high-churn artifact directories should be gitignored, including:
      - `.oat/repo/reviews/`
      - `.oat/repo/reference/external-plans/`
    - Keep this user-configurable per repo (opt-in/opt-out), not hard-coded.
    - Add config for worktree artifact propagation so context can still be available even when directories are ignored:
      - copy selected directories/files from source branch -> new worktree during bootstrap
      - optionally sync/copy generated artifacts back from worktree -> primary branch workspace before/after merge
    - Ensure behavior is deterministic and explicit (dry-run/apply modes), with clear reporting of what was copied/skipped.
    - Keep compatibility with current `.oat/config.json` phase-A direction; avoid introducing new one-off pointer files.
    - **Note:** `active-project` and `active-idea` propagation is already handled by `oat-worktree-bootstrap` Step 2.5 (quick fix added 2026-02-17). Remaining scope is the configurable policy for artifact directories.
  - Success criteria:
    - Users can choose whether these artifact directories are tracked in git.
    - Worktrees can still receive required context artifacts when gitignored policy is enabled.
    - Generated worktree artifacts can be copied back to primary workspace via explicit policy.
    - CLI output is audit-friendly and safe by default (no silent destructive overwrite).
  - Links:
    - Related directories: `.oat/repo/reviews/`, `.oat/repo/reference/external-plans/`
    - Related config direction: `.oat/config.json`
    - Related plan: `.oat/repo/reference/external-plans/2026-02-17-oat-autonomous-worktree-orchestration.md`
  - Created: 2026-02-17

- [ ] **(P2) [skills] Add idea promotion and auto-discovery flow to `oat-project-new`**
  - Target milestone/phase: Ideas → Projects integration
  - Notes:
    - Enhance `oat-project-new` Step 1 to check for existing summarized ideas (scan `{IDEAS_ROOT}/*/discovery.md` for `oat_idea_state: summarized`) and ask the user:
      - "Is this a brand new project, or would you like to promote an existing idea?"
      - If promoting: let user pick from summarized ideas, use the idea name as the project name (or let them rename), and stash the idea's `summary.md` path for later.
    - Enhance `oat-project-new` Step 3 to offer auto-triggering discovery:
      - Currently just says "Next command: `oat-project-discover`" — change to ask: "Would you like to start discovery now, or do it later?"
      - If yes: agent reads `oat-project-discover` skill and invokes it (same pattern as `oat-idea-new` → `oat-idea-ideate` handoff).
      - If promoting an idea: pass the idea's `summary.md` content as the initial request context to `oat-project-discover`, so the user doesn't have to re-explain the idea.
    - On promotion, update the ideas backlog entry to Archived with reason: `promoted to project`.
    - This keeps all promotion logic in `oat-project-new` (single entry point) rather than needing a separate `oat-idea-promote` skill.
    - Should support both project-level and user-level ideas (respect `{IDEAS_ROOT}` resolution).
  - Success criteria:
    - `oat-project-new` detects summarized ideas and offers to promote one.
    - Promoted idea's summary is passed as seed context into discovery.
    - Ideas backlog updated on promotion (moved to Archived).
    - User can still create a brand new project with no idea connection.
    - Discovery auto-trigger is optional (user chooses).
  - Links:
    - Current skill: `.agents/skills/oat-project-new/SKILL.md`
    - Promotion contract: `.agents/skills/oat-idea-summarize/SKILL.md` (Step 7)
    - Discovery skill: `.agents/skills/oat-project-discover/SKILL.md`
  - Created: 2026-02-14


## In Progress

- [ ] **(P?) [area] {Title}**
  - Project: `.oat/projects/shared/{project-name}/`
  - Current phase:
  - Notes:

## Deferred

- [ ] **(P?) [area] {Title}**
  - Why deferred:
  - Revisit trigger:

## Completed Archive

- Completed backlog items live in `.oat/repo/reference/backlog-completed.md`.
- Keep this file focused on actionable work only: **Inbox**, **Planned**, **In Progress**, and **Deferred**.
