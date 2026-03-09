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

- [ ] **(P2) [tooling] Managed OAT gitignore section in `oat init`**
  - Context: Every OAT repo needs a set of core `.gitignore` entries for infrastructure files (`.oat/config.local.json`, `.oat/state.md`, `.oat/projects/local/**`, `.oat/projects/archived/**`, plus `.gitkeep` negations). These are currently added manually. The new `oat local apply` command manages a separate section for user-configured `localPaths`, but the core OAT entries are a different concern — they're always needed regardless of `localPaths` config.
  - Proposed change:
    - Add a managed gitignore section (e.g., `# OAT core` / `# END OAT core`) to `oat init --scope project` that writes the standard OAT infrastructure entries.
    - Make it idempotent — re-running `oat init` updates the section without duplicating entries.
    - Coexist with the `oat local apply` managed section (`# OAT local paths`), which handles user-configured `localPaths`.
    - Allow users to remove manually-maintained duplicates once the managed section is in place.
  - Success criteria:
    - `oat init --scope project` creates/updates a `# OAT core` managed section in `.gitignore`.
    - Section includes: `.oat/config.local.json`, `.oat/state.md`, `.oat/projects/local/**`, `.oat/projects/archived/**`, `!.oat/projects/local/.gitkeep`, `!.oat/projects/archived/.gitkeep`.
    - Idempotent on re-run; does not duplicate entries.
    - Does not conflict with the `# OAT local paths` section from `oat local apply`.
  - Links:
    - Related: `oat local apply` managed section in `packages/cli/src/commands/local/apply.ts`
    - Current manual entries: `.gitignore` lines 43-56
  - Created: 2026-03-08

- [ ] **(P1) [tooling] Single source of truth for bundled skill lists**
  - Context: When adding a new skill to the CLI bundle, three independent arrays must be updated manually: (1) `packages/cli/scripts/bundle-assets.sh` `SKILLS` array (build-time asset generation), (2) `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` `WORKFLOW_SKILLS` (runtime installer), (3) `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` local `WORKFLOW_SKILLS` copy (test seeding). A consistency test (`bundle-consistency.test.ts`) now catches drift at CI time, but the root cause — three independent copies — remains.
  - Proposed change:
    - Extract a single manifest file (JSON or `.ts` constant) that defines all bundled skills per pack (workflows, ideas, utility).
    - Have `bundle-assets.sh` read from this manifest (e.g., parse a JSON file or source a generated list) instead of maintaining its own bash array.
    - Have `install-workflows.test.ts` import the canonical `WORKFLOW_SKILLS` from the source module instead of maintaining a local duplicate. The test's `seedAssets()` helper uses this array to create mock directories, so it must match the source.
    - Eliminate the need for `bundle-consistency.test.ts` once all three consumers read from the same source (or keep it as a belt-and-suspenders check).
  - Success criteria:
    - Adding a new skill to any pack requires updating exactly one file.
    - Build (`bundle-assets.sh`) and runtime (`install-*.ts`) always agree on which skills are bundled.
    - Test files seed from the canonical source, not local copies.
    - `bundle-consistency.test.ts` passes trivially (or is removed as redundant).
  - Links:
    - Guard test: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
    - Build script: `packages/cli/scripts/bundle-assets.sh`
    - Runtime source: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
    - Test duplicate: `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` (lines 15-52)
    - Prior incident: `oat-project-document` was added to `install-workflows.ts` but missed in `bundle-assets.sh`, causing the bundled asset to be deleted on every build
  - Created: 2026-03-08

- [ ] **(P2) [skills] Rename `create-skill` to `create-agnostic-skill` and add to utility pack**
  - Context: The `create-skill` skill creates provider-agnostic skills but its name doesn't communicate that. It also isn't part of any installable pack — it's only available if manually present in `.agents/skills/`.
  - Proposed change:
    - Rename `.agents/skills/create-skill/` to `.agents/skills/create-agnostic-skill/`.
    - Update all internal references (skill name frontmatter, any cross-references from other skills).
    - Add `create-agnostic-skill` to the utility pack in `oat tools init` so it's installable via `oat tools init --pack utility` (or included when installing all packs).
    - Update `bundle-assets.sh` and any pack manifests accordingly.
  - Success criteria:
    - Skill is renamed and all references updated.
    - Available via `oat tools init` as part of the utility pack.
    - Name clearly communicates provider-agnostic skill creation purpose.
  - Links:
    - Current skill: `.agents/skills/create-skill/SKILL.md`
    - Pack installer: `packages/cli/src/commands/init/tools/`
    - Build script: `packages/cli/scripts/bundle-assets.sh`
  - Created: 2026-03-08

- [ ] **(P1) [tooling] Add timestamp frontmatter to project state documents**
  - Context: Project `state.md` files currently lack machine-readable timestamps. Tooling that wants to find projects by most recently updated or created date has no structured field to query. Skills that scan archived projects for documentation gaps (e.g., `oat-docs-analyze`) also benefit from knowing when a project was created, completed, or last updated.
  - Proposed change:
    - Add three frontmatter fields to `state.md`: `oat_project_created`, `oat_project_completed`, `oat_project_state_updated`.
    - Use full ISO 8601 UTC timestamps (e.g., `2026-03-08T14:30:00Z`).
    - `oat_project_created` is set once during `oat-project-new` / `oat-project-quick-start`.
    - `oat_project_state_updated` is updated by any skill/command that modifies `state.md`.
    - `oat_project_completed` is set during `oat-project-complete`.
    - Update project lifecycle skills (`oat-project-new`, `oat-project-quick-start`, `oat-project-complete`, `oat-project-reconcile`, etc.) to read/write these fields.
  - Success criteria:
    - All new projects get `oat_project_created` and `oat_project_state_updated` timestamps on creation.
    - `oat_project_state_updated` is refreshed on every state mutation.
    - `oat_project_completed` is set when a project is completed/archived.
    - Tooling can sort/filter projects by any of these timestamps.
    - Existing projects without timestamps continue to work (fields are optional for backwards compat).
  - Links:
    - Related skills: `oat-project-new`, `oat-project-quick-start`, `oat-project-complete`, `oat-project-reconcile`
    - State template: `.agents/skills/oat-project-new/SKILL.md`
  - Created: 2026-03-08

- [ ] **(P2) [tooling] Optional S3 archival in `oat-project-complete` workflow**
  - Context: Completed projects are currently archived to `.oat/projects/archived/` on the local filesystem. For teams that want durable off-repo storage or centralized project history across multiple repositories, there's no built-in integration with cloud storage.
  - Proposed change:
    - Add optional S3 bucket configuration to `.oat/config.json` (e.g., `archive.s3Bucket`, `archive.s3Prefix`).
    - During `oat-project-complete`, if S3 is configured and AWS credentials are available (environment variables or AWS CLI profile), upload the project directory to S3 in addition to the local archive.
    - Detect credentials via standard AWS SDK credential chain (env vars, `~/.aws/credentials`, instance profile, etc.).
    - Upload preserves the project directory structure under a configurable S3 prefix (e.g., `s3://<bucket>/oat-archive/<repo-name>/<project-name>/`).
    - If S3 is configured but credentials are missing or upload fails, warn but do not block the local archive operation.
    - Add `--skip-s3` flag to `oat-project-complete` CLI command to bypass S3 upload when configured.
  - Success criteria:
    - Users can configure an S3 bucket in `.oat/config.json` and completed projects are uploaded automatically.
    - Local archive always succeeds regardless of S3 status.
    - S3 upload failure produces a clear warning, not a hard error.
    - Credentials are detected via standard AWS SDK chain — no custom auth config needed.
    - `--skip-s3` flag allows bypassing S3 for individual completions.
  - Links:
    - Related skill: `.agents/skills/oat-project-complete/SKILL.md`
    - Config: `.oat/config.json`
  - Created: 2026-03-08

- [ ] **(P1) [docs] Update AGENTS.md with documentation surface info during `oat docs init`**
  - Context: When `oat docs init` sets up a documentation surface in a project, agents have no way to know where project documentation lives, where the index file is, or how the docs system is structured — unless they happen to discover it by exploring the filesystem. Adding this context to `AGENTS.md` would make agents immediately aware of the documentation surface.
  - Proposed change:
    - During `oat docs init`, append a section to `AGENTS.md` describing the documentation surface:
      - Path to the docs root directory (e.g., `docs/`)
      - Path to the documentation index file (e.g., `docs/index.md` or `mkdocs.yml`)
      - Documentation framework in use (e.g., MkDocs, Docusaurus)
      - Any relevant conventions (nav structure, asset paths, etc.)
    - Use a managed section pattern (e.g., `<!-- OAT docs -->` / `<!-- END OAT docs -->`) so re-running `oat docs init` updates rather than duplicates.
    - Respect existing `AGENTS.md` content — append, don't overwrite.
  - Success criteria:
    - After `oat docs init`, `AGENTS.md` contains a section that tells agents where docs live and how they're structured.
    - Re-running `oat docs init` updates the section idempotently.
    - Agents can find docs paths without filesystem exploration.
  - Links:
    - Related: `packages/cli/src/commands/docs/init.ts`
    - Related: current manual docs section in `AGENTS.md`
  - Created: 2026-03-08

- [ ] **(P1) [tooling] Update AGENTS.md with workflow system details during `oat tools init`**
  - Context: When `oat tools init` installs workflow packs (skills, personas, etc.), there's no automatic update to `AGENTS.md` to inform agents about the workflow system — what skills are available, how they're organized, or how to discover them. Currently this information is manually maintained (as in this repo's `AGENTS.md` skills section). Automating this would keep `AGENTS.md` in sync with installed tooling.
  - Proposed change:
    - During `oat tools init`, append/update a managed section in `AGENTS.md` describing the installed workflow system:
      - Skills directory location (`.agents/skills/`)
      - Installed packs and their purpose (workflows, ideas, utility)
      - How to discover available skills (scan `.agents/skills/*/SKILL.md`)
      - Key workflow conventions (skill invocation, project lifecycle, etc.)
    - Use a managed section pattern (e.g., `<!-- OAT workflows -->` / `<!-- END OAT workflows -->`) for idempotent updates.
    - Update the section when packs are added or removed.
    - Optionally list the installed skill names grouped by pack.
  - Success criteria:
    - After `oat tools init`, `AGENTS.md` contains a section describing the workflow system and installed skills.
    - Re-running `oat tools init` or adding packs updates the section without duplication.
    - Agents can understand the workflow system from `AGENTS.md` without manual documentation.
    - Section coexists with the docs section from `oat docs init` and any manually written content.
  - Links:
    - Related: `packages/cli/src/commands/init/tools/`
    - Related: current manual skills section in `AGENTS.md`
    - Related: skill sync tooling (`oat sync`)
  - Created: 2026-03-08

- [ ] **(P2) [tooling] Scaffold `.oat/projects/{shared,local,archived}` during `oat init`**
  - Context: `oat init --scope project` scaffolds `.agents/` and `.oat/sync/` but does not create the projects directory tree. The `shared/`, `local/`, and `archived/` directories are created on-demand by individual skills/commands, which means new repos don't have the expected structure until the first project is created.
  - Proposed change:
    - Add `.oat/projects/{shared,local,archived}` creation to `oat init --scope project`.
    - Create `.gitkeep` files in `local/` and `archived/` so the directories are tracked despite gitignore rules.
    - Scaffold gitignored local workspace files if they don't exist:
      - `.oat/config.local.json` (empty `{"version": 1}`)
      - `.oat/state.md` (empty or minimal template)
      - `.oat/active-idea` (empty)
    - Respect `projects.root` config if already set (scaffold under the configured root instead of the default).
    - Ensure `.gitignore` entries for `local/**`, `archived/**` (with `!.gitkeep` exceptions), and local workspace files are present.
  - Success criteria:
    - After `oat init --scope project`, the full `.oat/` workspace is ready for use — projects tree, local config, and state files all exist.
    - Idempotent — re-running init does not error or overwrite existing directories/files.
    - Gitignore rules cover all local-only files.
  - Links:
    - Related: `packages/cli/src/commands/init/index.ts`
  - Created: 2026-02-23

- [ ] **(P2) [tooling] Migrate active-idea pointers to config-local state**
  - Context:
    - `activeProject` / `lastPausedProject` have moved to `.oat/config.local.json`, but idea context still relies on pointer files (`.oat/active-idea` and `~/.oat/active-idea`).
    - This split keeps lifecycle semantics consistent but leaves idea context on a separate storage/read model.
  - Proposed change:
    - Move active-idea state to config-local surfaces with explicit dual-level precedence (repo-local + user-level), preserving existing behavior where needed.
    - Update idea skills/commands and worktree propagation logic to use config-based reads/writes instead of direct pointer-file access.
    - Keep a bounded compatibility window for legacy pointer reads before removal.
  - Success criteria:
    - Idea commands/skills resolve active idea from config-backed sources with deterministic precedence.
    - Worktree bootstrap/copy behavior preserves active-idea context without pointer-file special cases.
    - Legacy pointer-file fallback can be removed after migration validation.
  - Links:
    - `.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md`
    - `packages/cli/src/config/oat-config.ts`
    - `.agents/skills/oat-worktree-bootstrap/SKILL.md`
  - Created: 2026-02-22


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


- [ ] **(P2) [skills] Add PR review follow-on skill set (remaining: `provide-remote`, `respond-remote`, `summarize-remote`)**
  - Target milestone/phase: Post review receive skill family
  - Notes:
    - **Already implemented:** `oat-review-receive-remote` and `oat-project-review-receive-remote` handle ingesting PR review comments into actionable tasks.
    - **Remaining skills to evaluate:**
      - `oat-review-provide-remote` / `oat-project-review-provide-remote`: Post OAT review findings as GitHub PR review comments (reverse of receive-remote).
      - `oat-review-respond-remote` / `oat-project-review-respond-remote`: Reply to individual PR review threads after fixes are applied (mark resolved, post fix summary).
      - `oat-review-summarize-remote` / `oat-project-review-summarize-remote`: Generate a summary comment on a PR (changes overview, review status, outstanding items).
    - Scope these as optional extensions; core review flow works without them.
  - Success criteria:
    - Clear contracts and non-overlapping responsibilities for each skill.
    - Optional set can be adopted incrementally without changing core review flow.
    - All GitHub interactions require explicit user confirmation before posting.
  - Links:
    - Source discussion: OAT feature ideas (potential future review extensions)
    - Prerequisite (completed): review receive skill family (PR #29)
  - Created: 2026-02-14
  - Updated: 2026-02-23

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

(No items currently in progress.)

## Deferred

- [ ] **(P?) [area] {Title}**
  - Why deferred:
  - Revisit trigger:

## Completed Archive

- Completed backlog items live in `.oat/repo/reference/backlog-completed.md`.
- Keep this file focused on actionable work only: **Inbox**, **Planned**, **In Progress**, and **Deferred**.
