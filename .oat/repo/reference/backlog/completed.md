# OAT Backlog Completed

> Summary archive for completed backlog work. Keep newest entries first. Use `backlog/archived/` for full file-per-item historical records when a completed item still needs rich context.

> Legacy note: one source entry in `.oat/repo/reference/backlog-completed.md` did not include a `Completed:` field; its migrated summary date is inferred as `2026-03-10` from surrounding archive order.

## Entry Format

- `YYYY-MM-DD — bl-XXXX — Title — one-line outcome summary`

## Completed Items

- 2026-03-31 — bl-ea64 — Optional S3 archival in oat-project-complete workflow — Shipped shared archive config (`archive.s3Uri`, `archive.s3SyncOnComplete`, `archive.summaryExportPath`), completion-time S3/archive-summary behavior, and `oat project archive sync [project-name]` for pulling archived projects back down from S3.
- 2026-03-15 — bl-dc12 — Add research, analysis, verification, and synthesis skill suite — Five new skills: deep-research (comprehensive research orchestrator with parallel sub-agent dispatch), analyze (multi-angle analysis of artifacts/codebases/systems), compare (domain-aware comparative analysis with clear recommendations), skeptic (adversarial claim verification with cited evidence), synthesize (merge multiple analysis artifacts into single report with provenance tracking).
- 2026-03-14 — bl-1008 — Add retroactive project capture skill (`oat-project-capture`) — oat-project-capture creates a full OAT project from untracked work on an existing branch using conversation context + commit history.
- 2026-03-14 — bl-1b44 — Add guided setup flow to `oat init` with documentation detection — Enhanced oat init with guided setup flow: auto-triggers on fresh repos (no .oat/), supports --setup flag for re-run on existing repos.
- 2026-03-10 — bl-4f60 — Update AGENTS.md with documentation surface info during `oat docs init` — Added shared upsertAgentsMdSection() utility (packages/cli/src/commands/shared/agents-md.ts) using HTML-comment-delimited managed sections (<!-- OAT <key> --> / <!-- END OAT <key> -->).
- 2026-03-10 — bl-6a4e — Update AGENTS.md with workflow system details during `oat tools init` — oat tools init now calls upsertAgentsMdSection(repoRoot, 'workflows', body) after pack selection.
- 2026-03-10 — bl-d9d7 — Add timestamp frontmatter to project state documents — Added three ISO 8601 UTC timestamp fields to state.md template: oat_project_created, oat_project_completed, oat_project_state_updated.
- 2026-03-09 — bl-85e2 — Single source of truth for bundled skill lists — Extracted packages/cli/src/commands/init/tools/shared/skill-manifest.ts as the canonical manifest for all bundled skills, agents, templates, and scripts per pack (workflows, ideas, utility).
- 2026-03-09 — bl-2549 — Rename `create-skill` to `create-agnostic-skill` and add to utility pack — Renamed .agents/skills/create-skill/ to .agents/skills/create-agnostic-skill/.
- 2026-03-09 — bl-a4ca — Managed OAT gitignore section in `oat init` — Added applyOatCoreGitignore() to oat init --scope project that writes a managed # OAT core / # END OAT core section in .gitignore.
- 2026-03-09 — bl-c04c — Scaffold `.oat/projects/{shared,local,archived}` during workflow pack install — Projects directory scaffolding (shared/, local/.gitkeep, archived/.gitkeep) added to installWorkflows() in the workflow tool pack installer.
- 2026-03-09 — bl-2186 — Migrate active-idea pointers to config-local state — Effectively completed as part of the B15+B02 project lifecycle config consolidation.
- 2026-03-09 — bl-5027 — Add configurable VCS policy + worktree sync behavior for OAT artifact directories — Core VCS policy functionality delivered via oat local add/remove/apply/sync/status CLI commands and localPaths config in .oat/config.json.
- 2026-03-08 — bl-7ef6 — Add `oat-project-document` for post-implementation documentation synthesis — oat-project-document skill reads project artifacts, verifies against code, scans documentation surfaces (docs dir, READMEs, reference files, AGENTS.md, provider rules), produces UPDATE/CREATE/SPLIT delta plan, and applies approved changes.
- 2026-03-07 — bl-1870 — Flip CLI-wide mutability convention from `--apply` to `--dry-run` — Unified all OAT CLI mutating commands under --dry-run opt-in convention (mutate by default).
- 2026-03-07 — bl-9471 — Add "Reconcile manual implementation" skill for human/AI mixed workflows — oat-project-reconcile skill implemented with 6 workflow steps: checkpoint detection, commit analysis, task mapping, HiTL confirmation, artifact updates, bookkeeping commit.
- 2026-03-07 — bl-c4a1 — Documentation analysis skill family (`oat-docs-analyze`, `oat-docs-apply`) — oat-docs-analyze evaluates documentation structure, navigation, and coverage against docs app contract; produces severity-rated analysis artifacts.
- 2026-03-07 — bl-11e5 — Add skill uninstall command (`oat remove skill` / `oat uninstall skill`) — Implemented as oat tools remove within the oat tools command group.
- 2026-03-07 — bl-432c — Add skill versioning to SKILL.md frontmatter and `oat init tools` update detection — All 44 skills have version: frontmatter (currently 1.2.0).
- 2026-02-23 — bl-fc14 — Enforce autonomous review gates in `oat-project-subagent-implement` — Step 4 implements mandatory peer subagent reviewer dispatch (oat-reviewer) with two-stage checks (spec compliance + code quality) and fix-loop retry bounded by oat_orchestration_retry_limit.
- 2026-02-23 — bl-80de — Complete review receive + PR-review intake skill family — Added oat-review-receive for ad-hoc local review artifact triage (parse findings, classify severity, generate standalone tasks).
- 2026-02-23 — bl-1832 — Add Codex markdown→TOML subagent adapter and re-enable Codex agent sync — Implemented canonical agent parser/renderer (packages/cli/src/agents/canonical/) for structured conversion of markdown agent definitions.
- 2026-02-23 — bl-1cee — Add context management commands for `AGENTS.md` ↔ `CLAUDE.md` integrity — Implemented as oat instructions validate (report missing/mismatched instruction file pointers) and oat instructions sync (repair with dry-run + apply semantics).
- 2026-02-23 — bl-ada4 — B15+B02 project lifecycle config consolidation (`oat config`, `oat project open/pause`) — Consolidated project lifecycle state into .oat/config.json / .oat/config.local.json (projects.root, activeProject, lastPausedProject) with repo-relative active project paths.
- 2026-02-21 — bl-1ce2 — Refine subagent implementation flow and review receive UX — Refactored subagent orchestration dispatch and result collection for cleaner implementation flow.
- 2026-02-19 — bl-bd31 — Agent instructions skill family (`oat-agent-instructions-analyze`, `oat-agent-instructions-apply`) — Analyze skill scans codebase for instruction file coverage, quality, and drift with severity-rated analysis artifacts.
- 2026-02-19 — bl-8d44 — Add shared OAT tracking manifest (`.oat/tracking.json`) — .oat/tracking.json with `{"version": 1}` schema and optimistic per-key merge via resolve-tracking.sh.
- 2026-02-19 — bl-9d08 — Switch user-facing skill/docs command examples from `pnpm run cli` to direct `oat` CLI — Replaced all pnpm run cli -- references in user-facing oat-\* skills, .agents/README.md, and AGENTS.md skills discovery with direct oat <command> invocation.
- 2026-02-19 — bl-dd41 — Add stronger subagent orchestration skills (sequential + parallel dispatch) — Shipped oat-execution-mode-select, oat-subagent-orchestrate, oat-worktree-bootstrap-auto skill contracts with reference shell scripts and test suite.
- 2026-02-19 — bl-f084 — Rename HiL terminology to HiLL (Human in Loop Lock) — Hard-cut rename of oat_hil_checkpoints -> oat_hill_checkpoints, oat_hil_completed -> oat_hill_completed, oat_plan_hil_phases -> oat_plan_hill_phases across all active surfaces.
- 2026-02-18 — bl-3e1d — Add project cleanup command for stale pointers and completion normalization — Added oat cleanup project to audit project metadata and fix common drift: invalid active-project pointer, missing state.md, completed projects missing oat_lifecycle: complete, stale dashboard.
- 2026-02-18 — bl-0ad2 — Add artifact cleanup command for reviews and external plans — Added oat cleanup artifacts with duplicate pruning, reference guards, interactive triage for .oat/repo/reviews/ and .oat/repo/reference/external-plans/.
- 2026-02-18 — bl-f72b — Add `oat init ideas` subcommand to scaffold ideas workflow — Implemented as oat init tools ideas with --force flag.
- 2026-02-18 — bl-2556 — Add `oat init workflows` subcommand to scaffold project workflow — Implemented as oat init tools workflows with --force flag.
- 2026-02-18 — bl-c990 — Make `oat-reviewer` mode-aware for quick/import projects (B09) — oat-project-review-provide enforces mode-specific artifact requirements for spec-driven|quick|import.
- 2026-02-18 — bl-205d — Add web-research convention using `markdown.new/` URL prefix (B06) — Added markdown-first web retrieval guidance to root AGENTS.md, including markdown.new usage and fallback semantics.
- 2026-02-17 — bl-d03b — Remove `.oat/scripts/` directory after all migrations complete (B16) — .oat/scripts/ directory deleted after all four script migrations completed.
- 2026-02-17 — bl-0ffb — Migrate `generate-thin-index.sh` to CLI (B15) — Migrated thin index generation to oat index init CLI command (packages/cli/src/commands/index-cmd/thin-index.ts).
- 2026-02-17 — bl-6169 — Migrate `generate-oat-state.sh` to CLI (B14) — Migrated state dashboard generation to oat state refresh CLI command (packages/cli/src/commands/state/generate.ts).
- 2026-02-17 — bl-7587 — Add OAT-native git worktree workflow skill — Added oat-worktree-bootstrap with create/resume modes, deterministic worktree-root precedence, and readiness checks (worktree:init, oat status, tests, clean git status).
- 2026-02-17 — bl-c093 — Introduce `.oat/config.json` phase-A non-sync settings ownership — Added .oat/config.json as the canonical home for new non-sync settings.
- 2026-02-17 — bl-be1a — Fix `oat project new --help` parsing bug that scaffolds a `--help` project — Root cause: pnpm run cli -- passes a literal -- into Commander's argv, disabling option parsing. Commander consumed --help as the <name> positional argument, and validateProjectName allowed it because - was a valid character.
- 2026-02-17 — bl-f8d9 — Add explicit supported-provider configuration for project sync — Added explicit project provider enable/disable management in .oat/sync/config.json via oat providers set --scope project --enabled ... --disabled ....
- 2026-02-16 — bl-95c4 — Migrate `validate-oat-skills.ts` from `.oat/scripts/` to CLI — Migrated skill validation logic to oat internal validate-oat-skills CLI command (packages/cli/src/commands/internal/validate-oat-skills.ts).
- 2026-02-16 — bl-6d37 — Migrate `new-oat-project.ts` from `.oat/scripts/` to CLI — Migrated project scaffolding to oat project new <name> CLI command (packages/cli/src/commands/project/new/).
- 2026-02-16 — bl-95a5 — Retire AGENTS skills-table refresh work item — Removed the large SKILLS_TABLE_START / SKILLS_TABLE_END inventory block from AGENTS.md.
- 2026-02-16 — bl-1813 — Add ad-hoc review provide flow when no project state exists — Added oat-review-provide for non-project review scopes:
- 2026-02-16 — bl-6373 — Add quick/import project lanes with canonical plan normalization — Added lifecycle entry skills:
- 2026-02-15 — bl-6055 — Normalize skill naming to namespace model (`oat-<domain>-<action>`) — Adopted naming pattern: oat-<domain>-<action> for external-facing skills; internal-only skills kept unprefixed.
- 2026-02-15 — bl-3be7 — Standardize OAT invocation language to skill-first across templates/docs — All /oat: slash-command references in repo reference and project artifacts replaced with skill-first names (no slash prefix).
- 2026-01-31 — bl-e475 — Visual progress indicators during workflow execution — Standardized user-facing progress indicator guidance across oat-\* skills:
