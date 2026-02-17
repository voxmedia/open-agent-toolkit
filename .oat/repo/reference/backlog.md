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

- [ ] **(P1) [skills] Add OAT-native git worktree workflow skill**
  - Target milestone/phase: Workflow ergonomics + onboarding reliability
  - Notes:
    - Add a dedicated skill for creating/using git worktrees in OAT repos (modeled after superpowers worktree guidance, but OAT-specific).
    - Root selection should support repo-local, sibling, and global locations with deterministic precedence:
      - explicit `--path`
      - `OAT_WORKTREES_ROOT`
      - `.oat/config.json` -> `worktrees.root`
      - discovered existing dirs (`.worktrees`, `worktrees`, `../<repo>-worktrees`)
      - fallback default (`../<repo>-worktrees`)
    - Include explicit setup sequence for each new worktree:
      - `pnpm install`
      - `pnpm run worktree:init`
      - any required CLI initialization/sync checks (`oat init`/`oat sync`) when applicable.
    - Require baseline verification before reporting worktree readiness:
      - `pnpm run worktree:init`
      - `pnpm run cli -- status --scope project`
      - `pnpm test`
      - clean `git status --porcelain`
    - If baseline tests fail, require explicit user override to proceed and record pre-existing failure context in project `implementation.md`.
    - Document safe conventions for branch naming, active project handling, and provider view sync in worktree contexts.
  - Success criteria:
    - User can invoke one skill to get a consistent, low-error worktree bootstrap flow.
    - Skill guidance is aligned with current CLI behavior and avoids stale/manual setup steps.
    - Worktree setup guidance is mirrored in docs where appropriate.
  - Links:
    - Related existing script: `pnpm run worktree:init`
    - Reference inspiration: https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md
    - External plan: `.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md`
    - Implementation project: `.oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation/`
  - Created: 2026-02-17

- [ ] **(P1) [tooling] Consolidate OAT runtime config under `.oat/config.json` (phased)**
  - Target milestone/phase: Workflow ergonomics + configuration hygiene
  - Notes:
    - Introduce `.oat/config.json` as the canonical home for new non-sync repo-level settings (Phase A), starting with `worktrees.root`.
    - Keep existing pointers stable for now (`.oat/active-project`, `.oat/active-idea`, `.oat/projects-root`) to avoid breaking skill contracts.
    - Keep sync config stable for now (`.oat/sync/config.json`) and evaluate later migration after CLI ownership is clearer.
    - Track follow-up migration phases:
      - Phase B: evaluate moving `.oat/projects-root` into `.oat/config.json` with compatibility reads.
      - Phase C: evaluate pointer-file strategy (`active-project`, `active-idea`) and migration mechanics.
  - Success criteria:
    - New settings stop introducing one-off text files in `.oat/`.
    - Backward compatibility is preserved for existing skill workflows.
    - Migration phases and ownership are documented with explicit sequencing.
  - Links:
    - External plan: `.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md`
    - Related decision: `.oat/repo/reference/decision-record.md`
    - Implementation project: `.oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation/`
  - Created: 2026-02-17

- [ ] **(P1) [skills] Add stronger subagent orchestration skills (sequential + parallel dispatch)**
  - Target milestone/phase: Phase 6 readiness (parallel execution + reconcile)
  - Notes:
    - Add OAT skills for subagent-driven development and parallel agent dispatch patterns.
    - Scope should include: when to spawn subagents, task slicing rules, aggregation/reconciliation expectations, and failure handling.
    - Align with current OAT workflow artifacts so subagent outputs map cleanly into plan/implementation/review loops.
    - Add a plan-handoff selector before implementation starts:
      - prompt for `single-thread` vs `subagent-driven` execution,
      - persist the selected mode in project state/frontmatter,
      - route implementation entrypoint based on persisted mode by default.
    - Fold in autonomous worktree orchestration for large multi-phase projects:
      - keep `oat-worktree-bootstrap` manual-safe for direct use,
      - add an autonomous worktree companion contract for orchestrators,
      - support fan-out/fan-in execution in isolated worktrees with deterministic merge-back,
      - use existing HiL frontmatter/checkpoint semantics so orchestration delegates until the next configured HiL gate.
  - Success criteria:
    - Team has reusable skills for both “single focused subagent loop” and “parallel dispatch + reconcile” workflows.
    - Skills reduce ad-hoc prompting and improve consistency of multi-agent execution.
    - Guidance includes clear guardrails for quality gates before merge.
    - Parallel orchestration path works without intermediate prompts between configured HiL checkpoints while preserving OAT artifact traceability.
    - Execution mode is explicit and durable per project (state/frontmatter), with safe defaults for existing workflows.
  - Links:
    - Inspiration: https://github.com/obra/superpowers/blob/e16d611eee14ac4c3253b4bf4c55a98d905c2e64/skills/writing-plans/SKILL.md#L103
    - Inspiration: https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md
    - Inspiration: https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md
    - Inspiration: https://github.com/obra/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md
    - Inspiration: https://github.com/obra/superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md
    - External plan: `.oat/repo/reference/external-plans/2026-02-17-oat-autonomous-worktree-orchestration.md`
    - Related roadmap area: Phase 6 (parallel execution + reconcile)
  - Created: 2026-02-17

- [ ] **(P2) [workflow] Rename HiL terminology to HiLL (Human in Loop Lock)**
  - Target milestone/phase: Workflow terminology consistency
  - Notes:
    - Evaluate terminology migration from "HiL" to "HiLL (Human in Loop Lock)" across workflow docs/skills/backlog/reference artifacts.
    - Decide scope of migration for frontmatter and status fields:
      - terminology-only in prose, or
      - key-name migration (with compatibility aliases) where feasible.
    - Ensure naming stays consistent with orchestrator checkpoint semantics and review gate language.
  - Success criteria:
    - Canonical docs and skill contracts use the chosen term consistently.
    - If key names change, migration/compatibility behavior is documented and non-breaking.
    - Team guidance clearly distinguishes lock/checkpoint behavior from general human-in-the-loop wording.
  - Links:
    - Related plan: `.oat/repo/reference/external-plans/2026-02-17-oat-autonomous-worktree-orchestration.md`
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

- [ ] **(P2) [docs] Add web-research convention using `markdown.new/` URL prefix**
  - Target milestone/phase: Agent instruction/docs quality
  - Notes:
    - Update AGENTS/docs guidance to prefer `https://markdown.new/<original-url>` when pulling website content for analysis, where applicable.
    - Document tradeoffs and fallback behavior (use normal fetch path when markdown.new conversion is unavailable or lossy).
    - Evaluate whether this is docs-only guidance or warrants a small helper skill.
  - Success criteria:
    - AGENTS/docs include a clear, concise convention for markdown-first web retrieval.
    - Agents avoid unnecessary HTML parsing in common research/review tasks.
    - Guidance remains optional and does not block direct URL usage when needed.
  - Links:
    - Service reference: https://markdown.new/
  - Created: 2026-02-17

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

- [ ] **(P1) [skills] Make `oat-reviewer` mode-aware for quick/import projects (or split reviewer profiles)**
  - Target milestone/phase: Review workflow robustness across lanes
  - Notes:
    - Current reviewer path spawned by `oat-project-review-provide` can assume full-mode artifacts (`spec.md`, `design.md`) that may be absent in quick/import projects.
    - Update canonical reviewer prompt (`.agents/agents/oat-reviewer.md`) to support artifact-availability-aware review behavior for `full|quick|import` modes.
    - Evaluate whether to:
      - keep one reviewer with mode-aware logic, or
      - split into lane-specific reviewer prompts and route by mode.
    - Ensure project review skill passes explicit mode + available-artifact context to reviewer invocation.
  - Success criteria:
    - Reviewer does not fail or degrade quality when `spec.md`/`design.md` are missing in quick/import projects.
    - Review output explicitly states assumptions based on available artifacts.
    - `oat-project-review-provide` routing/tests cover full, quick, and import review contexts.
  - Links:
    - Related skill: `.agents/skills/oat-project-review-provide/SKILL.md`
    - Canonical reviewer prompt: `.agents/agents/oat-reviewer.md`
  - Created: 2026-02-17

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
    - `oat-idea-*` skills are copied into `.agents/skills/` and show up in provider views after sync.
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
    - Ensures copied skills are discoverable through provider sync views.
  - Success criteria:
    - Running `oat init workflows` sets up the full project workflow in a new repo.
    - Skills are copied into `.agents/skills/` and show up in provider views after sync.
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

- [ ] **(P1) [tooling] Add project cleanup command for stale pointers and completion normalization**
  - Target milestone/phase: OAT CLI lifecycle hygiene
  - Notes:
    - Add a command (for example, `oat project cleanup`) that audits project metadata and fixes common drift:
      - invalid `.oat/active-project` pointer (missing target directory)
      - missing `state.md` for projects that already have plan/implementation artifacts
      - completed projects missing `oat_lifecycle: complete`
      - stale `.oat/state.md` dashboard after cleanup actions
    - Provide dry-run + apply semantics and explicit summary of changed vs skipped items.
    - Keep cleanup non-destructive (no automatic archive/delete).
  - Success criteria:
    - One command can remediate common project-state drift safely.
    - Cleanup output is deterministic and audit-friendly.
    - Dashboard is regenerated after apply mode.
  - Links:
    - Related files: `.oat/active-project`, `.oat/projects/shared/*/state.md`, `.oat/state.md`
  - Created: 2026-02-17

- [ ] **(P1) [tooling] Add artifact cleanup command for reviews and external plans**
  - Target milestone/phase: OAT CLI lifecycle hygiene
  - Notes:
    - Add a command (for example, `oat cleanup artifacts`) to clean stale/duplicate artifacts in:
      - `.oat/repo/reviews/`
      - `.oat/repo/reference/external-plans/`
    - Default behavior should auto-clean duplicate version chains while preserving the latest version:
      - Example: if `foo.md`, `foo-v2.md`, `foo-v3.md` exist, keep only latest (`foo-v3.md`) by default.
    - After duplicate pruning, present remaining candidate artifacts in an interactive multi-select prompt for optional removal.
    - Keep explicit dry-run + apply semantics and print a deterministic summary (removed/kept/skipped).
    - Guardrails:
      - Never delete latest-in-chain duplicates automatically.
      - If a file appears referenced by active project artifacts, require explicit confirmation before delete.
  - Success criteria:
    - Duplicate version chains are pruned automatically to latest with no manual triage.
    - Users can multi-select additional stale artifacts for removal in one pass.
    - Cleanup works consistently for both reviews and external plans.
    - Output is audit-friendly and idempotent on repeated runs.
  - Links:
    - Related directories: `.oat/repo/reviews/`, `.oat/repo/reference/external-plans/`
  - Created: 2026-02-17

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

- [ ] **(P1) [tooling] Migrate `generate-oat-state.sh` from `.oat/scripts/` to CLI**
  - Target milestone/phase: OAT CLI consolidation
  - Notes:
    - Move state dashboard generation from `.oat/scripts/generate-oat-state.sh` into `packages/cli/` (e.g., `oat state` or `oat project status`).
    - Currently called by `oat-project-new` skill (Step 2), `oat-repo-knowledge-index` skill (Step 12), and `new-oat-project.ts`.
    - Generates `.oat/state.md` with active project, phase, knowledge base freshness, and recommended next action.
    - Shell script parses frontmatter and git state — rewrite in TypeScript for consistency and testability.
    - Update calling skills to use CLI command.
  - Success criteria:
    - `oat state` (or equivalent) generates the dashboard as a CLI command.
    - All skills updated to call CLI instead of shell script.
    - `.oat/scripts/generate-oat-state.sh` removed.
  - Links:
    - Current script: `.oat/scripts/generate-oat-state.sh`
    - Calling skills: `oat-project-new`, `oat-repo-knowledge-index`
  - Created: 2026-02-14

- [ ] **(P1) [tooling] Migrate `generate-thin-index.sh` from `.oat/scripts/` to CLI**
  - Target milestone/phase: OAT CLI consolidation
  - Notes:
    - Move thin index generation from `.oat/scripts/generate-thin-index.sh` into `packages/cli/` (e.g., `oat index --thin` or `oat index init`).
    - Currently called by `oat-repo-knowledge-index` skill (Step 4) with HEAD_SHA and MERGE_BASE_SHA args.
    - Generates `.oat/repo/knowledge/project-index.md` with repo structure, entry points, config files, and test commands.
    - Shell script uses find/grep/awk — rewrite in TypeScript for consistency, testability, and cross-platform support.
    - Update `oat-repo-knowledge-index` skill to call CLI command.
  - Success criteria:
    - Thin index generation works as a CLI command.
    - `oat-repo-knowledge-index` skill updated to call CLI instead of shell script.
    - `.oat/scripts/generate-thin-index.sh` removed.
  - Links:
    - Current script: `.oat/scripts/generate-thin-index.sh`
    - Calling skill: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
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
