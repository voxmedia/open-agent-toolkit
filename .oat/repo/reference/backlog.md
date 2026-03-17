# OAT Backlog (Internal / Dogfood)

> Migrated: This file is superseded by `.oat/repo/reference/backlog/`. See `.oat/repo/reference/backlog/index.md` for the current backlog.

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

_(No items currently in progress.)_

## Deferred

- [ ] **(P?) [area] {Title}**
  - Why deferred:
  - Revisit trigger:

## Completed Archive

- Completed backlog items live in `.oat/repo/reference/backlog-completed.md`.
- Keep this file focused on actionable work only: **Inbox**, **Planned**, **In Progress**, and **Deferred**.
