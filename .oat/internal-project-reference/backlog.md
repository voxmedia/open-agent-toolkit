# OAT Backlog (Internal / Dogfood)

Capture tasks and ideas that come up while dogfooding but aren’t ready to implement yet.

## How to Use

- Add new items to **Inbox** as you notice them.
- Promote items from **Inbox** → **Planned** once there’s clear scope/acceptance criteria.
- When an item is ready to implement, create (or link) an OAT project and move it to **In Progress**.
- Close items by moving to **Done** (or **Deferred**) with a short rationale.

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

- [ ] **(P1) [skills] Standardize OAT invocation language to skill-first across templates/docs**
  - Target milestone/phase: Dogfood v1.2 polish (before additional workflow expansion)
  - Notes:
    - Replace slash-only guidance (for example, `/oat:implement`) with skill-first wording (for example, `oat-implement` skill).
    - Keep slash command text only as a host-specific alias: "where slash prompts are supported."
    - Apply consistently across `.oat/templates/`, `.agents/skills/oat-*/`, and `.oat/internal-project-reference/`.
    - Add a lightweight validation check so new docs do not regress to slash-only wording.
  - Links:
    - Source discussion: invocation compatibility for Codex vs slash-enabled hosts
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

- [ ] **(P1) [skills] Add review provide/receive workflow skill family**
  - Target milestone/phase: Workflow expansion after current docs stabilization
  - Notes:
    - Add `oat-review-provide` for structured code/diff reviews (non-mutating).
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

- [ ] **(P1) [skills] Normalize skill naming to namespace model (`oat-<domain>-<action>`)**
  - Target milestone/phase: Naming consistency initiative
  - Notes:
    - Adopt naming pattern: `<domain>-<context?>-<action>`.
    - Apply `oat-` prefix only to external-facing skills. Keep internal-only maintenance skills unprefixed.
    - Proposed mappings for current skills:
      - `oat-discovery` -> `oat-project-discover`
      - `oat-spec` -> `oat-project-spec`
      - `oat-design` -> `oat-project-design`
      - `oat-plan` -> `oat-project-plan`
      - `oat-implement` -> `oat-project-implement`
      - `oat-new-project` -> `oat-project-new`
      - `oat-open-project` -> `oat-project-open`
      - `oat-clear-active-project` -> `oat-project-clear-active`
      - `oat-complete-project` -> `oat-project-close`
      - `oat-request-review` -> `oat-review-provide`
      - `oat-receive-review` -> `oat-review-receive`
      - `oat-pr-progress` -> `oat-pr-progress` (unchanged)
      - `oat-pr-project` -> `oat-pr-project` (unchanged)
      - `oat-progress` -> `oat-project-progress` (or retain as top-level router alias)
      - `oat-index` -> `oat-project-index` (or retain as top-level alias)
      - `update-internal-project-reference` -> `update-internal-project-reference` (internal, unchanged)
      - `create-oat-skill` -> `create-oat-skill` (internal, unchanged)
      - `create-pr-description` -> `create-pr-description` (internal, unchanged)
      - `create-ticket` -> `oat-ticket-create`
      - `create-skill` -> `create-skill` (internal, unchanged)
      - `codex` -> evaluate as provider-specific helper (likely out-of-scope for namespace migration)
    - Implement transition with compatibility aliases to avoid breaking existing prompts/workflows.
  - Success criteria:
    - Canonical names follow one naming model across project/review/pr/context/dependency domains.
    - Legacy names continue to resolve during migration window.
    - AGENTS skills table and docs are auto-updated to canonical names.
  - Links:
    - Source discussion: OAT feature ideas (naming philosophy + domain model)
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

- [ ] **(P?) [area] {Title}**
  - Target milestone/phase:
  - Notes:

## In Progress

- [ ] **(P?) [area] {Title}**
  - Project: `.oat/projects/shared/{project-name}/`
  - Current phase:
  - Notes:

## Deferred

- [ ] **(P?) [area] {Title}**
  - Why deferred:
  - Revisit trigger:

## Done

- [x] **(P?) [area] {Title}**
  - Outcome:
  - Links:

- [x] **(P2) [workflow] Visual progress indicators during workflow execution**
  - Outcome:
    - Standardized user-facing progress indicator guidance across `oat-*` skills:
      - prominent separator banners (`OAT ▸ …`)
      - short step indicators (2–5 lines)
      - “starting/done” updates for long-running work
  - Links:
    - Workflow feedback: `.oat/internal-project-reference/temp/workflow-user-feedback.md`
    - Commits: `d39876d`, `57de516`, `a22c107`, `bca8167`, `13de18f`, `bdc9a76`
  - Created: 2026-01-30
  - Completed: 2026-01-31
