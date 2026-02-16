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

- [ ] **(P1) [tooling] Add CLI command to refresh AGENTS skills table from `.agents/skills`**
  - Target milestone/phase: OAT CLI usability polish
  - Notes:
    - Add a command that regenerates the `AGENTS.md` block between `SKILLS_TABLE_START` and `SKILLS_TABLE_END` from skill frontmatter in `.agents/skills/*/SKILL.md`.
    - Keep output deterministic (stable ordering, idempotent rewrite).
    - Fail fast with actionable errors when required frontmatter fields are missing.
    - Include a dry-run mode for preview and a write mode for apply.
  - Success criteria:
    - Running the command updates `AGENTS.md` with no manual editing.
    - Removed skills disappear automatically; new skills appear automatically.
    - Re-running without skill changes produces no diff.
  - Links:
    - Source issue: manual drift between `AGENTS.md` and `.agents/skills`
  - Created: 2026-02-14

- [ ] **(P2) [tooling] Optional Codex prompt-wrapper generation for synced OAT skills**
  - Target milestone/phase: Post-standardization enhancement
  - Notes:
    - Add opt-in generation of thin `.codex/prompts` wrappers for `oat-*` skills when users sync skills to Codex.
    - Wrappers should be minimal aliases only (no duplicated workflow logic), so skill files remain the source of truth.
    - Keep feature optional to avoid imposing Codex-specific files on repos that do not want them.
  - Links:
    - Related to invocation compatibility standardization item above
  - Created: 2026-02-14

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

- [ ] **(P1) [tooling] Add `oat init ideas` subcommand to scaffold ideas workflow**
  - Target milestone/phase: OAT CLI init subcommands
  - Notes:
    - `oat init ideas` scaffolds `.oat/ideas/` directory with `backlog.md` and `scratchpad.md` from templates.
    - Copies `oat-idea-*` skill files (`oat-idea-new`, `oat-idea-ideate`, `oat-idea-summarize`) into the project's `.agents/skills/` directory.
    - Same distribution pattern as `oat init workflows` for project workflow skills — init subcommands are how skills reach user projects.
    - Templates source: `.oat/templates/ideas/`
    - Skills source: `.agents/skills/oat-idea-*/`
  - Success criteria:
    - Running `oat init ideas` creates `.oat/ideas/` with backlog and scratchpad ready to use.
    - `oat-idea-*` skills are copied into `.agents/skills/` and registered in `AGENTS.md`.
    - Idempotent — re-running doesn't overwrite existing ideas or customized skills.
  - Links:
    - Source: ideas workflow implementation (branch `provider-interop`)
    - Plan: `.claude/plans/cheeky-questing-barto.md`
  - Created: 2026-02-14

- [ ] **(P1) [tooling] Add `oat init workflows` subcommand to scaffold project workflow**
  - Target milestone/phase: OAT CLI init subcommands
  - Notes:
    - `oat init workflows` scaffolds `.oat/` directory structure (templates, projects root, scripts) and copies `oat-project-*` / `oat-review-*` / `oat-pr-*` workflow skills into the project's `.agents/skills/` directory.
    - Same distribution pattern as `oat init ideas` — init subcommands are how skills reach user projects.
    - Registers skills in `AGENTS.md`.
  - Success criteria:
    - Running `oat init workflows` sets up the full project workflow in a new repo.
    - Skills are copied into `.agents/skills/` and registered in `AGENTS.md`.
    - Idempotent — re-running doesn't overwrite existing projects or customized skills.
  - Links:
    - Related: `oat init ideas` backlog entry
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

- [ ] **(P1) [tooling] Migrate `new-oat-project.ts` from `.oat/scripts/` to CLI**
  - Target milestone/phase: OAT CLI consolidation
  - Notes:
    - Move project scaffolding logic from `.oat/scripts/new-oat-project.ts` into `packages/cli/` (e.g., `oat project new <name>`).
    - Currently called by `oat-project-new` skill via `pnpm tsx .oat/scripts/new-oat-project.ts`.
    - Supports `--force`, `--no-set-active`, `--no-dashboard` flags — preserve these.
    - Handles template copying, placeholder replacement, active-project pointer, and dashboard refresh.
    - Update `oat-project-new` skill to call CLI command instead of tsx script.
  - Success criteria:
    - `oat project new <name>` works as a CLI command.
    - `oat-project-new` skill updated to use CLI instead of tsx script.
    - `.oat/scripts/new-oat-project.ts` removed.
  - Links:
    - Current script: `.oat/scripts/new-oat-project.ts`
    - Calling skill: `.agents/skills/oat-project-new/SKILL.md`
  - Created: 2026-02-14

- [ ] **(P1) [tooling] Migrate `validate-oat-skills.ts` from `.oat/scripts/` to CLI**
  - Target milestone/phase: OAT CLI consolidation
  - Notes:
    - Move skill validation logic from `.oat/scripts/validate-oat-skills.ts` into `packages/cli/` (e.g., `oat validate skills` or integrate into `oat doctor`).
    - Currently called via `pnpm oat:validate-skills`.
    - Validates frontmatter fields (`disable-model-invocation`, `user-invocable`, `allowed-tools`), progress indicator sections, and banner snippets.
    - Update package.json script to call CLI command.
  - Success criteria:
    - Validation runs as a proper CLI command with structured output.
    - `pnpm oat:validate-skills` package.json script updated or removed.
    - `.oat/scripts/validate-oat-skills.ts` removed.
  - Links:
    - Current script: `.oat/scripts/validate-oat-skills.ts`
    - package.json: `oat:validate-skills` script
  - Created: 2026-02-14

- [ ] **(P1) [tooling] Migrate `generate-oat-state.sh` from `.oat/scripts/` to CLI**
  - Target milestone/phase: OAT CLI consolidation
  - Notes:
    - Move state dashboard generation from `.oat/scripts/generate-oat-state.sh` into `packages/cli/` (e.g., `oat state` or `oat project status`).
    - Currently called by `oat-project-new` skill (Step 2), `oat-project-index` skill (Step 12), and `new-oat-project.ts`.
    - Generates `.oat/state.md` with active project, phase, knowledge base freshness, and recommended next action.
    - Shell script parses frontmatter and git state — rewrite in TypeScript for consistency and testability.
    - Update calling skills to use CLI command.
  - Success criteria:
    - `oat state` (or equivalent) generates the dashboard as a CLI command.
    - All skills updated to call CLI instead of shell script.
    - `.oat/scripts/generate-oat-state.sh` removed.
  - Links:
    - Current script: `.oat/scripts/generate-oat-state.sh`
    - Calling skills: `oat-project-new`, `oat-project-index`
  - Created: 2026-02-14

- [ ] **(P1) [tooling] Migrate `generate-thin-index.sh` from `.oat/scripts/` to CLI**
  - Target milestone/phase: OAT CLI consolidation
  - Notes:
    - Move thin index generation from `.oat/scripts/generate-thin-index.sh` into `packages/cli/` (e.g., `oat index --thin` or `oat index init`).
    - Currently called by `oat-project-index` skill (Step 4) with HEAD_SHA and MERGE_BASE_SHA args.
    - Generates `.oat/repo/knowledge/project-index.md` with repo structure, entry points, config files, and test commands.
    - Shell script uses find/grep/awk — rewrite in TypeScript for consistency, testability, and cross-platform support.
    - Update `oat-project-index` skill to call CLI command.
  - Success criteria:
    - Thin index generation works as a CLI command.
    - `oat-project-index` skill updated to call CLI instead of shell script.
    - `.oat/scripts/generate-thin-index.sh` removed.
  - Links:
    - Current script: `.oat/scripts/generate-thin-index.sh`
    - Calling skill: `.agents/skills/oat-project-index/SKILL.md`
  - Created: 2026-02-14

- [ ] **(P2) [tooling] Remove `.oat/scripts/` directory after all migrations complete**
  - Target milestone/phase: Post OAT CLI consolidation
  - Notes:
    - Once all four scripts are migrated to the CLI, remove the `.oat/scripts/` directory entirely.
    - Update any remaining references in docs, templates, or repo reference files.
    - Update `.oat/repo/reference/current-state.md` to reference CLI commands instead of scripts.
  - Success criteria:
    - `.oat/scripts/` directory deleted.
    - No remaining references to `.oat/scripts/` in the codebase.
  - Links:
    - Depends on: all four migration items above
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
