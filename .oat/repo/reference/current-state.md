# OAT Current State (This Repo)

This document is a birdseye view of where OAT is _right now_ in `open-agent-toolkit`: what exists, where it lives, how to run it, and what’s next.

**Last Updated:** 2026-05-25 (`dispatch-ceiling` shipped the follow-up to PR #87: OAT now owns an explicit provider-aware dispatch ceiling instead of treating Codex base/unpinned roles as parent-effort inheritance. Codex deterministic dispatch uses pinned implementer/reviewer variants including `xhigh`, capped by the resolved ceiling. `oat project dispatch-ceiling resolve` provides the project-aware resolver surface for implementation preflight, reports Codex provider default effort as informational context, and blocks unresolved non-interactive preflight only through explicit non-interactive signals. Lifecycle skill guidance also preserves accepted design drift explicitly: `oat-project-implement` records intentional spec/design/plan deltas in `implementation.md`, `oat-project-review-receive` converts defensible implementation vs stale artifact findings into artifact-alignment tasks or explicit deferrals, and `oat-project-summary` carries those review-received decisions into Design Deltas.)

## Canonical References

- Workflow lifecycle: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Implementation execution: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Provider manifest and drift: `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
- Workflow project splitting: `apps/oat-docs/docs/workflows/projects/splitting.md`
- Workflow reviews: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Workflow PR flow: `apps/oat-docs/docs/workflows/projects/pr-flow.md`
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
  - Project entry skills (`oat-project-new`, `oat-project-quick-start`, and `oat-project-import-plan`) now preflight inherited git state before scaffolding. Dirty worktrees surface a Commit now / Proceed anyway / Abort choice, with sync-managed paths called out as typical `oat sync` output.
  - `oat-project-promote-spec-driven` (in-place promotion from quick/import to spec-driven lifecycle)
  - `oat-project-split` (split a broad discovery or brainstorm into a durable coordination parent plus flat sibling child projects; invoked from `oat-project-discover` and `oat-brainstorm`)
  - `oat-project-discover` -> `oat-project-spec` -> `oat-project-design` -> `oat-project-plan` -> `oat-project-implement`
  - `oat-project-design` v2.1.0 supports three full-design modes: collaborative, selective collaborative, and draft-and-review. Selective collaborative prints a Section Review Plan, silently drafts routine sections, presents high-risk/uncertain sections for live review, and recaps silently drafted sections at the user-review gate.
  - Quick-start lightweight design intentionally remains a two-mode surface (collaborative or draft-and-review). If a quick project promotes to spec-driven, selective collaborative becomes available in full design.
  - Completion closeout now auto-refreshes `summary.md`, always archives locally, can upload archives to S3 via `archive.s3Uri` + `archive.s3SyncOnComplete`, and can export summaries via `archive.summaryExportPath`
- Idea workflow:
  - `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`
- Brainstorming (always-on):
  - `oat-brainstorm` (project-independent brainstorming dispatcher, installed via the new `brainstorm` tool pack — user-eligible, default user scope, default-on in `oat init`). Activation is gated by a three-tier **Activation Contract**: explicit `brainstorm` verb (`/oat-brainstorm`, "let's brainstorm", "can we brainstorm X", "help me brainstorm X") prints the OAT banner and runs the structured flow; ambiguous exploratory phrasing ("help me think through", "I've been thinking", "what if we") answers conversationally with brainstorm-quality structure but no banner, offering structured mode only after ≥2 sustained exploratory turns; advisory / review / debug / PR / status / active-workflow questions never auto-activate. Once active, runs Superpowers-style cadence and surfaces a pack-aware terminal-state picker that hands off to existing `oat-idea-*`, `oat-pjm-add-backlog-item`, `oat-project-*` skills.
  - Bundled visual companion (`scripts/{server.cjs, start-server.sh, stop-server.sh, frame-template.html, helper.js}` + `references/visual-companion.md`) — port of MIT-licensed `superpowers:brainstorming@5.0.7` with OAT-aligned persistence-path resolution. Attribution in `NOTICES.md`.
  - Active-project routing has 3 sub-options (related → fold-back, independent → other terminal states, supplementary → reference file); fold-back enforces a commit safety contract (preflight `git status --porcelain`, scoped `git add --`, three-option dirty-tree picker, conditional handoff prompt).
  - Default-scope mechanism (`PACK_METADATA[name]?.defaultScope`, see ADR-017) drives both the interactive picker and the non-interactive resolver; `brainstorm` is the first user-default-scope pack, with `core` as a future consolidation candidate.
- Project splitting:
  - `oat-project-discover` now has codified split detection surfaces: mid-stream signal evaluation during solution-space exploration and an always-visible end-of-discovery scope check.
  - `oat-brainstorm` can hand off declared multi-project intent directly to `oat-project-split` and expose split as a conditional terminal destination when accumulated scope is large.
  - A coordination parent is marked `oat_kind: coordination`, `oat_phase: decomposition`, and `oat_phase_status: complete` in place; it records broad context, split rationale, child registry, sibling links, shared constraints, and an integration sketch.
  - Coordination parents do not keep executable phase artifacts (`spec.md`, `design.md`, `plan.md`, or `implementation.md`). Resume reads `references/split-plan.json`.
  - Child projects are flat siblings with parent/sibling metadata, seeded seven-section discovery context, and `oat_inherited_context_revalidated: false` until inherited assumptions are checked.
  - `oat project list` hides completed coordination parents by default; `--include-coordination` shows them as `decomposition (complete)` with recommendation `none`. `oat state refresh` groups them under decompositions.
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
- Reporting:
  - `oat-wrap-up` (generate date-ranged shipping digests from local OAT summaries and merged PR metadata, with tracked report output under `archive.wrapUpExportPath` or the default `.oat/repo/reference/wrap-ups/`)
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

### Cross-agent Bookkeeping Integrity

- `oat-project-review-receive` and `oat-project-review-receive-remote` now require an atomic bookkeeping commit before the skill exits. The commit stages `plan.md`, `implementation.md`, `state.md`, and the project's `reviews/` directory (to capture the Step 7.5 archive move when the archive path is tracked).
- This closes the primary cause of cross-agent state drift: when a subagent ran a receive skill in isolation, it used to leave project tracking files dirty for the original agent to discover on return. The required commit is scoped (no `git add -A`) and worktree-aware.
- `oat-project-implement` bookkeeping commits carry CRITICAL / DO NOT SKIP callouts across all four required commit points (per-task, review-fix completion, phase boundary, implementation complete).

### Documentation Analysis & Bootstrap (Utility)

- `oat-docs-bootstrap` (guided docs-app onramp wrapping `oat docs init`: preflight detection, input gathering with distinct site/app names, capability-gated post-patches for FP-11/12/13/15/16/17 gaps, build verification, config inspection, and a seven-section educational walkthrough)
- `oat-docs-analyze` (evaluate documentation structure, navigation, and coverage against the OAT docs app contract; severity-rated analysis artifacts)
- `oat-docs-apply` (apply approved docs analysis findings: branch, update docs, optionally open PR)

### Control Plane + Inspection Surfaces

- `@open-agent-toolkit/control-plane` (`packages/control-plane/`) is now the read-only OAT state layer for typed project parsing, review/task aggregation, and next-skill recommendation.
- CLI inspection surfaces now include:
  - `oat project status` (full active-project state, including recommendation)
  - `oat project list` (structured summary listing for tracked projects)
  - `oat config dump` (fully resolved config with source attribution)
- `workflow.designMode` accepts `collaborative`, `selective`, or `draft`. Runtime non-interactive signals still force draft mode; `selective` is honored only by full `oat-project-design`.
- The control plane keeps parsing and recommendation logic package-local while the CLI continues to own config resolution and user-facing formatting.

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

### Phase-Subagent Implementation Execution

- `oat-project-implement` v2 is the single implementation entry point. It dispatches phase-scoped work to `oat-phase-implementer` when Tier 1 subagent execution is available, and falls back to inline Tier 2 only when delegation is unavailable, unresolved, or explicitly declined.
- Runtime dispatch selection is resolved at phase execution time: choose the lowest available control that can confidently complete the phase, and honor explicit `## Dispatch Profile` overrides only when present. Model and effort are independent dispatch axes — `model_axis` and `effort_axis` — each logged as `selected:<value>`, `inherited`, `not-applicable`, or `host-auto`. Dispatch decisions are recorded as structured `OAT Dispatch` blocks (`Host` / `Model axis` / `Effort axis` / `Dispatch target` / `Rationale`).
- Dispatch ceilings are OAT-owned and provider-aware. Repo/user/local config can set `workflow.dispatchCeiling.codex` (`low`, `medium`, `high`, `xhigh`) and `workflow.dispatchCeiling.claude` (`haiku`, `sonnet`, `opus`); project `state.md` can persist a planning/preflight answer as `oat_dispatch_ceiling`.
- Implementation preflight resolves ceilings through `oat project dispatch-ceiling resolve --provider <codex|claude> --preflight --json`. The resolver checks effective config first, then project state, and reports Codex `providerDefaultEffort` as informational context for base/unpinned roles. Explicit `--non-interactive` or `OAT_NON_INTERACTIVE=1` blocks unresolved preflight before work starts; JSON output by itself does not force the block path.
- Codex selected effort maps to generated `oat-phase-implementer-{low,medium,high,xhigh}` role variants capped by the resolved ceiling. Review dispatch uses generated `oat-reviewer-{low,medium,high,xhigh}` variants for deterministic quality gates. Base Codex roles are provider-default/unpinned fallbacks and must not be described as inheriting the parent session ceiling. Escalation termini are provider-specific: Codex `low→medium→high→xhigh`, Claude Code `haiku→sonnet→opus`.
- `oat status` and `oat init` recognize generated Codex role variants as managed via the Codex extension plan's `managedRoles`, so generated-derived role files are not misclassified as strays.
- `oat-phase-implementer` (`.agents/agents/oat-phase-implementer.md`) owns phase execution and review-fix work packets. `oat-reviewer` remains the reviewer prompt for per-phase and checkpoint reviews.
- Parallel execution is declared in `plan.md` frontmatter with `oat_plan_parallel_groups` and validated with `oat project validate-plan --project-path <project-path>`. Empty or missing metadata means fully sequential execution.
- Parallel groups run worktree-per-phase and fan back into the main worktree in plan order. `oat-worktree-bootstrap-auto` provides autonomous worktree bootstrap with rollback safety.
- Autonomous bootstrap now checks inherited cleanliness before the all-scope sync run, commits dirty sync-managed paths as `chore: run sync` when needed, and reports `sync_commit: pass | fail | skip`.
- `oat-project-subagent-implement` has been removed. Legacy `oat_execution_mode` state is ignored and removed on the next `oat-project-implement` bookkeeping write.
- `implementation.md` records phase/group orchestration runs at phase granularity, including dispatch rationale when useful; HiLL checkpoint governance remains integrated into `oat-project-implement` policy.

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
  - `oat config get`, `oat config set`, `oat config list`, `oat config describe`, `oat config dump`
  - `oat project status`, `oat project list`, `oat project dispatch-ceiling resolve`
  - `oat project archive sync`, `oat project archive sync <project-name>`
  - `oat tools list`, `oat tools outdated`, `oat tools info`, `oat tools update`, `oat tools remove`, `oat tools install` (packs: core, ideas, docs, workflows, utility, project-management, research, brainstorm)
- Provider config model:
  - Project provider enablement lives in `.oat/sync/config.json` (`providers.<name>.enabled`).
  - `oat init --scope project` prompts for provider selection in interactive mode.
  - `oat sync --scope project` performs config-aware provider activation and mismatch remediation (interactive prompt in TTY mode, warning + remediation guidance in non-interactive mode).
- Non-sync config model:
  - Shared repo settings live in `.oat/config.json`, including `projects.root`, `worktrees.root`, `git.defaultBranch`, `documentation.*`, `archive.*` (including `archive.wrapUpExportPath` for `oat-wrap-up` report output), `tools.*`, and `workflow.*`.
  - Repo-local state lives in `.oat/config.local.json`, including `activeProject`, `lastPausedProject`, repo-scoped `activeIdea`, and repo-scoped `workflow.*` overrides.
  - User-level state lives in `~/.oat/config.json` and includes global `activeIdea` fallback plus personal `workflow.*` defaults.
  - `oat config describe` exposes shared repo, repo-local, user, and sync/provider config ownership from one command surface.
  - `oat config get` resolves all keys through `resolveEffectiveConfig()` with 3-layer precedence (`env > local > shared > user > default`) and emits source labels `env`/`local`/`shared`/`user`/`default` for consistency with `oat config dump` output.
  - `oat config set` accepts mutually exclusive `--shared`/`--local`/`--user` surface flags with per-key restrictions (structural keys shared-only, state keys local-only except `activeIdea` which also accepts user, workflow keys accept all three).
  - Tool-pack lifecycle commands now persist pack availability in `tools.<pack>` so workflows can use an explicit config signal instead of inferring installed capability from filesystem artifacts alone.
- Workflow preferences (`workflow.*`):
  - Workflow preference keys skip repetitive prompts in project lifecycle skills when set: `workflow.hillCheckpointDefault`, `workflow.archiveOnComplete`, `workflow.createPrOnComplete`, `workflow.postImplementSequence`, `workflow.reviewExecutionModel`, `workflow.autoReviewAtHillCheckpoints`, `workflow.autoNarrowReReviewScope`, `workflow.dispatchCeiling.codex`, and `workflow.dispatchCeiling.claude`.
  - Skills check the relevant preference before prompting. When set, they print `"<preference>: <value> (from <key>)"` so the user can see the preference was used; when unset, they prompt as before (backward compatible).
  - Skill integrations: `oat-project-implement` (hillCheckpoint, autoReviewAtHillCheckpoints, postImplementSequence, reviewExecutionModel), `oat-project-complete` (archive, createPr), `oat-project-review-provide` (autoNarrow).
  - Cross-surface guidance: preferences whose correctness depends on other per-repo settings (e.g., `postImplementSequence` depends on `documentation.requireForProjectCompletion`) belong at shared scope; purely personal preferences (e.g., `hillCheckpointDefault`) belong at user scope.
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

- 60 skills total; all `oat-*` skills include semver `version:` frontmatter. Mature lifecycle skills are mostly at `1.2.x` or later, while newer additions may still be at `1.0.x`.
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
- Skill state reads:
  - Skills read project state via `oat project status --field <path>` for single values and `oat project status --shell NAME=path ...` for shell-safe multi-field reads. Path-directed reads use `--project-path <path>`.
  - Skill snippets assume `oat` is available on `$PATH`; CI/cloud environments can provide a checkout-local `oat` shim backed by `npx @open-agent-toolkit/cli` instead of repeating fallback branches in every skill.
  - Field set consumed by migrated skills is locked by `MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts`; the canonical guidance lives in `.agents/skills/create-oat-skill/SKILL.md` under "Reading project state".
  - `state.md` remains the source of truth on disk; the JSON view is derived. No `// ""` defaults — YAML `null` surfaces as the literal string `null` for parity with the prior `grep | awk` reads.

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
   - `oat-project-design` (choose collaborative, selective collaborative, or draft-and-review for full spec-driven design)
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
  - Phase-level parallel execution is implemented in `oat-project-implement` v2 through plan-declared `oat_plan_parallel_groups`, per-phase worktrees, and ordered fan-in. Remaining work is broader branch-aware automation and continued reconciliation polish for manual/human commits.

## Notes / Caveats

- `.oat/config.json` holds shared non-sync repo settings, including `worktrees.root` (default `.worktrees`), `projects.root` (default `.oat/projects/shared`), and `documentation.*` (root, tooling, config, requireForProjectCompletion).
- `.oat/config.local.json` is gitignored and holds per-developer lifecycle state (`activeProject`, `lastPausedProject`).
- `.oat/projects/local/**` and `.oat/projects/archived/**` are gitignored (local-only).
- `.oat/**/reviews/archived/**` is the local-only historical review storage path; active `reviews/` directories remain tracked unless a repo explicitly overrides that policy.
- `.oat/projects/shared/**` is tracked by default in this repo unless a local override is added.
- Legacy `.oat/active-project` pointer files may exist but are no longer the canonical active-project source in migrated flows.
