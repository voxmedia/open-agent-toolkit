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

- [ ] **(P1) [skills] Add retroactive project capture skill (`oat-project-capture`)**
  - Context: When work happens outside the OAT project workflow (e.g., mobile/cloud sessions, quick fixes, ad-hoc brainstorming that turns into implementation), there's no way to retroactively create project tracking artifacts. The agent has full conversation context — requirements discussed, decisions made, alternatives considered — but none of it gets captured into OAT's project structure. This is especially common with cloud mobile sessions where the user works with the agent, then wants to open a PR and review it later from their computer.
  - Proposed change:
    - Add an `oat-project-capture` skill that creates a full project from an already-completed (or in-progress) branch:
      - **Step 1: Name inference** — Propose a project name based on conversation context (what was accomplished), not the branch name (which is often just a slug of the first message). Let the user accept or rename.
      - **Step 2: Branch analysis** — Detect current branch, infer base branch, run `git diff` and `git log` to understand scope of changes (files, commits, test results).
      - **Step 3: Project scaffold** — Create project via `oat project new --mode quick` (or direct scaffold call).
      - **Step 4: Discovery synthesis** — Populate `discovery.md` from conversation context: problem statement, requirements discussed, decisions made, alternatives considered. Ask user to confirm or clarify anything unclear.
      - **Step 5: Implementation capture** — Populate `implementation.md` with commit-derived task list, files changed, tests added, issues encountered and how they were resolved.
      - **Step 6: Lifecycle state** — Ask user: "Is this ready for review, or still in progress?" Default to `awaiting-review`. Set `oat_lifecycle` accordingly.
    - Skill-only (no CLI command needed) — requires conversation context that only the agent has. The commit analysis is supplementary; the real value is capturing _intent_ from the conversation.
    - Should ask the user for details whenever anything is unclear rather than guessing.
  - Success criteria:
    - Agent can invoke `oat-project-capture` at end of a session to create a tracked project from untracked work.
    - `discovery.md` captures the "why" from conversation context, not just the "what" from commits.
    - `implementation.md` reflects actual work done with commit references.
    - Project is set to `awaiting-review` (or user-chosen state) and is ready for `oat-project-review-provide` / `oat-project-pr-final`.
    - Works naturally in the mobile/cloud session flow: brainstorm → implement → capture → PR → review at desk.
  - Links:
    - Related: `oat-project-reconcile` (bridges gaps in _existing_ projects; capture creates from scratch)
    - Related: `oat-project-quick-start` (forward-looking quick scaffold; capture is retroactive)
    - Related: `oat-project-pr-final` (downstream consumer of captured project)
  - Created: 2026-03-09

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
