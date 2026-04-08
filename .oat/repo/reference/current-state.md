# OAT Current State (This Repo)

This document is a birdseye view of where OAT is _right now_ in `open-agent-toolkit`: what exists, where it lives, how to run it, and what’s next.

**Last Updated:** 2026-03-31

## Canonical References

- Workflow lifecycle: `apps/oat-docs/docs/guide/workflow/lifecycle.md`
- Workflow reviews: `apps/oat-docs/docs/guide/workflow/reviews.md`
- Workflow PR flow: `apps/oat-docs/docs/guide/workflow/pr-flow.md`
- Roadmap: `.oat/repo/reference/roadmap.md`
- Backlog index: `.oat/repo/reference/backlog/index.md`
- Backlog completed summary: `.oat/repo/reference/backlog/completed.md`
- Backlog item files: `.oat/repo/reference/backlog/items/`
- Backlog archived item files: `.oat/repo/reference/backlog/archived/`
- Decision record: `.oat/repo/reference/decision-record.md`
- Repo reviews (active tracked): `.oat/repo/reviews/`
- Repo review archive (local-only history): `.oat/repo/reviews/archived/`
- Repo archive: `.oat/repo/archive/`

## What’s Implemented

### Workflow Skills (Dogfood)

- Knowledge + routing:
  - `oat-repo-knowledge-index` (thin-first index + enrichment)
  - `oat-project-progress` (router / status)
  - `oat-project-next` (stateful dispatcher — reads state and invokes the correct next skill)
  - `oat-project-plan-writing` (shared plan writing contract used by planning/import/review flows)
- Artifact generation:
  - `oat-project-new` (scaffold a project dir from templates)
  - `oat-project-open`, `oat-project-clear-active`, `oat-project-complete` (active project lifecycle management)
  - `oat-project-quick-start` (quick lane: synthesize/backfill discovery -> plan -> implement, with optional design when warranted)
  - `oat-project-import-plan` (import lane: provider plan -> canonical `plan.md`)
  - `oat-project-promote-spec-driven` (in-place promotion from quick/import to spec-driven lifecycle)
  - `oat-project-discover` -> `oat-project-spec` -> `oat-project-design` -> `oat-project-plan` -> `oat-project-implement`
  - Completion closeout now auto-refreshes `summary.md`, always archives locally, can upload archives to S3 via `archive.s3Uri` + `archive.s3SyncOnComplete`, and can export summaries via `archive.summaryExportPath`
- Idea workflow:
  - `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`
- Review loop:
  - `oat-review-provide` (ad-hoc/non-project review)
  - `oat-review-receive` (ad-hoc local review receive: parse findings, triage, generate standalone tasks)
  - `oat-review-receive-remote` (ad-hoc GitHub PR review receive: fetch unresolved PR comments, triage, generate standalone tasks)
  - `oat-project-review-provide`
  - `oat-project-review-receive`
  - `oat-project-review-receive-remote` (project-scoped GitHub PR review receive: fetch PR comments, create plan tasks, update project artifacts)
  - Reviewer prompt: `.agents/agents/oat-reviewer.md`
- PR skills:
  - `oat-project-pr-progress`
  - `oat-project-pr-final`
- Retroactive capture:
  - `oat-project-capture` (create full OAT project from untracked work on an existing branch using conversation context + commit history)
- Reconciliation:
  - `oat-project-reconcile` (map manual/human commits to planned tasks and update tracking artifacts after confirmation)
- Documentation sync:
  - `oat-project-document` (post-implementation documentation synthesis: reads project artifacts, verifies against code, scans documentation surfaces, produces delta plan, applies approved updates)
- Worktree/bootstrap:
  - `oat-worktree-bootstrap` (create/reuse worktree + baseline checks with deterministic root precedence)

### Research Skills

- `deep-research` (comprehensive research orchestrator producing structured artifacts with parallel sub-agent dispatch)
- `analyze` (multi-angle analysis of existing artifacts, codebases, documents, or systems)
- `compare` (domain-aware comparative analysis with clear recommendations; inline or artifact output)
- `skeptic` (adversarial claim verification with cited evidence and confidence scores)
- `synthesize` (merge multiple analysis artifacts into a single report with provenance tracking)
- Sub-agent: `skeptical-evaluator` (adversarial evidence gatherer for /skeptic)
- Shared schemas: `.agents/skills/deep-research/references/schema-*.md` (6 templates)
- CLI tool pack: `research` (installable via `oat tools install research`)

### Core Pack (Diagnostics & Docs)

- `oat-doctor` (setup diagnostics: check mode with actionable warnings, summary mode with full dashboard including installed packs, config values from `~/.oat/docs/`, and sync status)
- `oat-docs` (interactive Q&A backed by locally-bundled OAT documentation at `~/.oat/docs/`)
- CLI infrastructure: `oat init tools core` subcommand (always user scope), core pack in `oat init tools` guided setup (checked by default)
- Docs bundling: `apps/oat-docs/docs/` → `assets/docs/` (build time) → `~/.oat/docs/` (install/update time)
- `oat tools update --pack core` refreshes both skills and bundled docs
- `oat tools update --all` also refreshes `~/.oat/docs/` when an installed core pack is included in the update/reconciliation set

### Workflow PR Tracking

- Project `state.md` now distinguishes routing/review posture from actual PR existence
- `oat_phase_status: pr_open` remains the post-PR routing state used by revise/complete flows
- `oat_pr_status` tracks whether the PR is `ready`, `open`, `closed`, or `merged`
- `oat_pr_url` stores the tracked PR URL when a PR exists
- `oat-project-complete` suppresses the duplicate "Open a PR?" prompt when `oat_pr_status: open` is already present
- `oat-project-pr-final` and `oat-project-complete` both auto-refresh `summary.md` when it is missing or stale

### Documentation Analysis (Utility)

- `oat-docs-analyze` (evaluate documentation structure, navigation, and coverage against the OAT docs app contract; severity-rated analysis artifacts)
- `oat-docs-apply` (apply approved docs analysis findings: branch, update docs, optionally open PR)

### Project Management (Utility)

- `oat-pjm-add-backlog-item` (create a file-backed backlog item from the backlog template, regenerate the managed index, and prompt for curated-overview updates)
- `oat-pjm-update-repo-reference` (sync repo backlog, roadmap, and current-state/reference documents with the file-backed backlog structure)
- `oat-pjm-review-backlog` (analyze the file-backed backlog, completed summary, and roadmap to recommend priorities and next work)
- CLI tool pack: `project-management` (installs the `oat-pjm-*` skills and the backlog/roadmap templates)

### Repo Maintainability (Utility)

- `oat-repo-maintainability-review` (structured maintainability analysis for a repository or directory target with actionable findings)

### Agent Instructions (Utility)

- `oat-agent-instructions-analyze` (scan codebase for instruction file coverage, quality, and drift; writes a reviewer-facing markdown analysis artifact plus a companion artifact bundle with `summary.md`, `recommendations.yaml`, and per-recommendation packs)
- `oat-agent-instructions-apply` (interactive generation/update of instruction files with multi-provider support: AGENTS.md, Claude rules, Cursor rules, Copilot instructions; consumes the companion bundle as the primary generation contract and treats the markdown artifact as review context)
- CLI integrity commands:
  - `oat instructions validate` (report missing/mismatched AGENTS.md ↔ CLAUDE.md context pointers)
  - `oat instructions sync` (repair missing/invalid context pointers; mutates by default, `--dry-run` to preview)
- Shared tracking manifest: `.oat/tracking.json` (delta mode support via `resolve-tracking.sh`)
- Bundle contract templates: analysis artifact template, bundle summary template, recommendations manifest template, and recommendation-pack template
- Apply planning contract includes stable recommendation IDs plus bundle-pack references
- 7 instruction file templates, 3 helper scripts (tracking, providers, file discovery), quality checklist, directory assessment criteria, and bundle-contract regression coverage
- Reference docs bundled as symlinks (dereferenced during CLI distribution)

### Subagent Orchestration

- `oat-project-subagent-implement` (parallel execution across eligible plan phases/tasks using autonomous worktrees, review gates, and deterministic merge-back; incorporates execution mode selection and dispatch)
- `oat-worktree-bootstrap-auto` (autonomous worktree bootstrap with rollback safety)
- `oat_execution_mode` field in `state.md` template; orchestration status fields in `implementation.md` template
- HiLL checkpoint governance integrated into orchestration policy

### Skill Authoring (Meta)

- `create-agnostic-skill` (scaffold new provider-agnostic skills using the Agent Skills open standard; bundled in the utility pack)
- `create-oat-skill` (scaffold new OAT skills using the standard OAT sections + banner conventions; references baseline guidance from `create-agnostic-skill`)

### Repository Analysis CLI

- Commands:
  - `oat repo pr-comments collect` — GraphQL-based PR review comment collection from merged PRs with bot/trivial filtering, stable IDs (`RC-NNN`), and monthly JSON + Markdown output
  - `oat repo pr-comments triage-collection` — interactive keep/discard triage of collected comment chunks
- Source: `packages/cli/src/commands/repo/pr-comments/`

### Provider Interop CLI (Implemented Surface)

- Commands:
  - `oat init`, `oat status`, `oat sync`, `oat doctor`
  - `oat providers list`, `oat providers inspect`, `oat providers set`
  - `oat cleanup project`, `oat cleanup artifacts`
  - `oat instructions validate`, `oat instructions sync`
  - `oat backlog init`, `oat backlog generate-id`, `oat backlog regenerate-index`
  - `oat config get`, `oat config set`, `oat config list`, `oat config describe`
  - `oat project archive sync`, `oat project archive sync <project-name>`
  - `oat tools list`, `oat tools outdated`, `oat tools info`, `oat tools update`, `oat tools remove`, `oat tools install` (packs: core, ideas, workflows, utility, project-management, research)
- Provider config model:
  - Project provider enablement lives in `.oat/sync/config.json` (`providers.<name>.enabled`).
  - `oat init --scope project` prompts for provider selection in interactive mode.
  - `oat sync --scope project` performs config-aware provider activation and mismatch remediation (interactive prompt in TTY mode, warning + remediation guidance in non-interactive mode).
- Non-sync config model:
  - Shared repo settings live in `.oat/config.json`, including `projects.root`, `worktrees.root`, `git.defaultBranch`, `documentation.*`, `archive.*`, and `tools.*`.
  - Repo-local state lives in `.oat/config.local.json`, including `activeProject`, `lastPausedProject`, and repo-scoped `activeIdea`.
  - `oat config describe` exposes shared repo, repo-local, user, and sync/provider config ownership from one command surface.
  - Tool-pack lifecycle commands now persist pack availability in `tools.<pack>` so workflows can use an explicit config signal instead of inferring installed capability from filesystem artifacts alone.
- Supported providers: Claude Code, Cursor, Codex CLI, GitHub Copilot, Gemini CLI.
- Codex TOML sync:
  - Canonical agent parser/renderer (`agents/canonical/`) converts markdown agent definitions to/from structured format.
  - Codex codec (`providers/codex/codec/`) handles export-to-codex, import-from-codex, config-merge, and sync-extension for TOML-based agent configuration.
  - Sync extension generates `.codex/agents/*.toml` role files and merges role declarations into `.codex/config.toml`.
- Worktree bootstrap:
  - Root script: `pnpm run worktree:init` (`pnpm install && pnpm run build && pnpm run cli -- sync --scope project`).
  - Workflow skill: `oat-worktree-bootstrap`.
  - Phase-A non-sync config: `.oat/config.json` (`worktrees.root`, default `.worktrees`).

### Tool Metadata

- 51 skills total; all `oat-*` skills versioned at 1.2.0+ with `version:` frontmatter (research skills at 1.0.0).
- Most skills define `allowed-tools` in frontmatter as an advisory tool scope (provider-dependent).
  - Read-only skills (e.g., `oat-project-progress`, `oat-project-review-provide`) omit `Write`/`Edit`.
  - Write skills (e.g., `oat-project-discover` → `oat-project-implement`, `oat-project-review-receive`, PR skills) include `Write` and `Bash(git:*)`.
- Internal validation:
  - `pnpm oat:validate-skills` checks that all `oat-*` skills include required frontmatter keys and the standard progress banner section.
  - Backed by CLI command: `oat internal validate-oat-skills`.
- Skill lifecycle management:
  - `oat tools list` / `oat tools outdated` / `oat tools info` for discovery and status.
  - `oat tools install` / `oat tools update` / `oat tools remove` for lifecycle operations.

### Templates / Scripts

- Templates: `.oat/templates/`
  - `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`
  - `backlog-item.md`, `roadmap.md`
  - Ideas templates: `ideas/idea-discovery.md`, `ideas/idea-summary.md`, `ideas/ideas-backlog.md`, `ideas/ideas-scratchpad.md`
- Thin index generation: `oat index init` CLI command
- Knowledge project index output: `.oat/repo/knowledge/project-index.md`

### State + Conventions

- Repo State Dashboard:
  - `.oat/state.md` (generated by `oat state refresh` CLI command; gitignored)
- Local active project state (canonical):
  - `.oat/config.local.json` (gitignored) stores per-developer lifecycle state, including `activeProject` and `lastPausedProject`.
  - `oat-*` skills resolve active project via `oat config get activeProject` (fallback: prompt + write when needed).
  - `activeProject` is stored as a repo-relative path (worktree-safe).
- Archive state and retrieval:
  - Archived projects live in `.oat/projects/archived/<project>/`.
  - Completion can upload dated archive snapshots to the configured repo-scoped S3 archive and export dated summary snapshots to the configured reference directory.
  - `oat project archive sync` can pull all archived projects, or one named project, down from the configured repo-scoped S3 archive, selecting the latest dated remote snapshot per project.
  - Explicit archive sync fails fast when AWS CLI is missing or unusable; completion-time archive sync warns instead of blocking closeout.
- Legacy pointer note:
  - Existing `.oat/active-project` files may still exist as inert compatibility artifacts; migrated command paths do not treat them as canonical state.
- User-facing progress indicators:
  - Key `oat-*` skills include guidance to print a prominent phase banner with horizontal separators (GSD-style reassurance), plus a few short step indicators during multi-step “finalize/commit” work.
  - For long-running operations, skills should print a brief “starting…” line and a matching “done” line so it’s obvious the agent is making progress.
- Stable task IDs:
  - Plan tasks use `pNN-tNN` (e.g., `p01-t03`)
  - Agent commit convention uses Conventional Commit scope: `feat(p01-t03): ...`
- Plan review tracking:
  - `plan.md` has a `## Reviews` table with status progression documented:
    - `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Canonical Paths (Where Things Live)

- Skills: `.agents/skills/<skill-name>/SKILL.md`
- Subagent prompts: `.agents/agents/*.md`
- Templates: `.oat/templates/*.md`
- Knowledge: `.oat/repo/knowledge/*.md`
- Project artifacts (default checked-in layout): `.oat/projects/shared/<project>/` (configurable via `oat config get projects.root`; stored in `.oat/config.json`)
- Project review contract:
  - Active review artifacts live in `.oat/projects/shared/<project>/reviews/` while they are awaiting receive/triage.
  - Consumed review artifacts move to `.oat/projects/shared/<project>/reviews/archived/` for local-only historical storage.
- Tracking manifest: `.oat/tracking.json` (delta mode support for skill families)
- Provider sync state:
  - `.oat/sync/config.json` (provider enablement/strategy config)
  - `.oat/sync/manifest.json` (managed sync mappings and content hashes)

## Quickstart (Current)

1. Generate repo knowledge:
   - `oat-repo-knowledge-index`
2. Start a project:
   - `oat-project-new` (recommended) then `oat-project-discover`
   - This creates `{PROJECTS_ROOT}/<project>/...` artifacts (resolved via `oat config get projects.root`) and writes active project state to `.oat/config.local.json`.
   - For an existing project, use `oat-project-open` (or `oat project open`) to set active project state first.
3. Move through phases (or run router anytime):
   - `oat-project-progress`
   - `oat-project-spec`
   - `oat-project-design`
   - `oat-project-plan`
   - `oat-project-implement`
4. Final review loop (required before PR):
   - `oat-project-review-provide code final`
   - `oat-project-review-receive`
   - `oat-project-implement` (executes new fix tasks, if any)
   - Repeat until `final` review is `passed` (3-cycle cap per scope)
5. Documentation sync (optional, recommended before completion):
   - `oat-project-document` (analyzes artifacts + code, recommends doc updates, applies approved changes)
6. PR description generation:
   - `oat-project-pr-progress pNN` (optional progress PR)
   - `oat-project-pr-final` (final PR)

Backlog/reference workflow quickstart:

1. Create or update backlog items:
   - `oat-pjm-add-backlog-item`
2. Scaffold or regenerate managed backlog metadata directly when needed:
   - `oat backlog init`
   - `oat backlog generate-id <filename>`
   - `oat backlog regenerate-index`
3. Refresh repo references:
   - `oat-pjm-update-repo-reference`
4. Review backlog priorities:
   - `oat-pjm-review-backlog`

Non-project review path:

- If no active project/state exists, use `oat-review-provide` (commit range, branch range, staged/unstaged, or explicit file list).
- To receive/triage review findings outside project context: `oat-review-receive` (local artifacts) or `oat-review-receive-remote` (GitHub PR comments).

Interop quickstart:

1. Initialize canonical/provider sync scaffolding:
   - `oat init --scope project`
2. Set explicit supported providers (optional, deterministic):
   - `oat providers set --scope project --enabled claude,codex --disabled cursor`
3. Preview and apply sync:
   - `oat sync --scope project --dry-run` (preview)
   - `oat sync --scope project` (apply)

## Known Gaps / Next Steps

- PR automation enhancements:
  - PR opening automation beyond best-effort `gh pr create` guidance (optional; not required for v1 dogfood)
- Repo-level dashboard:
  - Repo State Dashboard (`.oat/state.md`) exists, but needs to be made first-class (clear generation/refresh workflow + keep docs in sync with current semantics)
- Provider interop (CLI):
  - Core command surface, Codex TOML sync, and `oat tools` lifecycle commands are implemented; remaining work is broader provider capability matrix and additional ergonomics
- Multi-project model:
  - Core lifecycle switching is implemented (`oat project open/pause`, config-backed active project state); remaining work is broader branch-aware multi-project automation and local/shared model polish
- Parallel execution + reconciliation:
  - Worktree bootstrap setup is implemented (`oat-worktree-bootstrap`), but parallel task fan-out + reconcile remains deferred

## Notes / Caveats

- `.oat/config.json` holds shared non-sync repo settings, including `worktrees.root` (default `.worktrees`), `projects.root` (default `.oat/projects/shared`), and `documentation.*` (root, tooling, config, requireForProjectCompletion).
- `.oat/config.local.json` is gitignored and holds per-developer lifecycle state (`activeProject`, `lastPausedProject`).
- `.oat/projects/local/**` and `.oat/projects/archived/**` are gitignored (local-only).
- `.oat/**/reviews/archived/**` is the local-only historical review storage path; active `reviews/` directories remain tracked unless a repo explicitly overrides that policy.
- `.oat/projects/shared/**` is tracked by default in this repo unless a local override is added.
- Legacy `.oat/active-project` pointer files may exist but are no longer the canonical active-project source in migrated flows.
