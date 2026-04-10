<!-- Structure guidance: .oat/templates/roadmap.md -->

# OAT Roadmap (Dogfood-First)

This file is the canonical OAT roadmap for this repo. It combines:

- the dogfood workflow direction (`.oat/repo/archive/past-artifacts/2026-01-27-oat-dogfood-workflow-design-v2.md`)
- the early "product" vision (interop + CLI) (`.oat/repo/archive/past-artifacts/agentic_development_framework_v_1_plan.md`)
- the review/subagent direction (`.oat/projects/archived/workflow-research/analysis/subagents/refined-subagent-proposal.md`)

For a birdseye snapshot of what exists _right now_, see `.oat/repo/reference/current-state.md`.

For day-to-day friction and pain points discovered while running the workflow, log notes in `.oat/repo/archive/workflow-user-feedback.md`.

As of `2026-04-10` on `main`, dogfood workflow baseline and provider-interop CLI foundations are both in active use (`oat init/status/sync/providers/doctor/instructions/tools`, config-aware sync, Codex TOML sync, worktree bootstrap, `oat config`, `oat project open/pause`). Project lifecycle state is config-backed (`.oat/config.json` + `.oat/config.local.json`) with final review/PR loops dogfooded through completion. Closeout/archive hardening now includes `oat config describe`, repo-scoped archive config (`archive.s3Uri`, `archive.s3SyncOnComplete`, `archive.summaryExportPath`), dated S3/summary snapshot export on completion, `oat project archive sync [project-name]`, and automatic summary refresh during PR-final/completion. Review receive skill family (local + remote) is implemented for both project and ad-hoc contexts. `oat tools` command group provides full skill lifecycle management (list, outdated, info, install, update, remove). `oat-project-reconcile` bridges manual/human implementation back into OAT tracking. Research skill suite (`deep-research`, `analyze`, `compare`, `skeptic`, `synthesize`) shipped as installable tool pack. `oat-project-capture` enables retroactive project creation from untracked work. The new `@open-agent-toolkit/control-plane` read layer now powers `oat project status`, `oat project list`, and `oat config dump`, giving downstream tools a structured JSON surface for project and config inspection. Near-term focus is hardening and lifecycle completeness rather than initial scaffolding.

## Now (Active / Committed)

### Phase 7: Quick mode + template rendering helper

- Status: In Progress
- Focus: quick/import lanes, promotion paths, and plan-writing contracts are in place; the remaining work is the template rendering helper and follow-on UX integration.
- Related backlog: `bl-b3f7` (idea promotion and auto-discovery flow to `oat-project-new`)

### Phase 8: Provider interop CLI + sync manifest

- Status: In Progress
- Focus: core provider CLI, config-aware sync, Codex TOML sync, instruction integrity tooling, and archive/config discovery surfaces are shipped; remaining work is lifecycle polish, deeper diagnostics, and provider-specific ergonomics.
- Related backlog: `bl-cbdd` (optional Codex prompt-wrapper generation for synced OAT skills)

## Next (Planned)

### Control-plane read-layer follow-through

- Status: Planned
- Focus: use the new control-plane package as the default read surface for more workflow tooling, and revisit a `listProjects()` summary fast path only if measured performance justifies the added complexity.
- Related backlog: `bl-931d`

### Phase 4 polish: Active project lifecycle state + Repo State Dashboard

- Status: Completed (polish remaining)
- Focus: tighten the repo-dashboard contract, clarify regeneration ownership, and keep active-project state/reporting friction low.
- Related backlog: `bl-42f9` (first-class OAT project/repo management workflow family)

### Phase 5: Staleness + knowledge drift upgrades

- Status: Planned
- Focus: improve freshness detection, optional strict blocking modes, and clearer fallback behavior when repo state is stale or incomplete.

### Phase 6: Parallel execution + reconcile

- Status: Deferred (groundwork expanded)
- Focus: turn the current worktree/subagent groundwork into first-class parallel fan-out execution and reconciliation flows.

## Later (Directional Intent)

### Phase 9: Multi-project switching + branch awareness

- Status: Later
- Focus: branch-aware multi-project coordination and smoother automation across `.oat/projects/shared`, `.oat/projects/local`, and archived history.

### Phase 10: Memory system + provider enhancements

- Status: Later
- Focus: longer-term memory, durability, and provider enhancement work beyond the current dogfood workflow baseline.

## Status Summary

| Area / Phase                                                   | Status                         | Notes                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Dogfood workflow baseline                                      | Completed                      | `oat-repo-knowledge-index`, `oat-project-new`, phases (`discover → implement`), router, review loop, PR skills                                 |
| Phase 3: Reviews + PR loop                                     | Completed                      | Implemented + dogfooded                                                                                                                        |
| Phase 4: Active project lifecycle state + Repo State Dashboard | Completed (polish remaining)   | Config-backed lifecycle state + `oat project open/pause` + generated `.oat/state.md`; continue dashboard contract polish                       |
| Phase 5: Staleness + knowledge drift                           | Planned                        | Improve/enforce freshness beyond warn-only                                                                                                     |
| Phase 6: Parallel execution + reconcile                        | Deferred (groundwork expanded) | `oat-worktree-bootstrap` + subagent orchestration skills (PR #21, refined in PR #26) exist; parallel fan-out + reconcile tooling still pending |
| Phase 7: Quick mode + template rendering helper                | In Progress                    | Quick/import lanes + canonical plan writing contract implemented; template rendering helper still planned                                      |
| Phase 8: Provider interop CLI + sync manifest                  | In Progress                    | Core command surface + config-aware provider sync + Codex TOML sync + instructions validate/sync shipped; lifecycle polish remains             |
| Phase 9: Multi-project switching + branch awareness            | Later                          | Full `.oat/projects/(shared                                                                                                                    | local)/...` + hooks |
| Phase 10: Memory system + provider enhancements                | Later                          | Longer-term durability features                                                                                                                |
| Cross-cutting: skill invocation normalization                  | Completed (guardrails ongoing) | Skill-first wording adopted; continue preventing regressions                                                                                   |

## Current State (Implemented)

Dogfood workflow baseline is implemented and has been exercised end-to-end:

- Knowledge: `oat-repo-knowledge-index` + `.oat/repo/knowledge/**` (thin->full project index, mapper outputs under `.oat/repo/knowledge/`)
- Projects:
  - `oat-project-new` scaffolds `{PROJECTS_ROOT}/<project>/...` from `.oat/templates/`
  - `.oat/config.json` + `.oat/config.local.json` back shared/local runtime config (`projects.root`, `worktrees.root`, `activeProject`, `lastPausedProject`, `git.defaultBranch`, `archive.*`)
  - `oat config get/set/list/describe` provides CLI accessors and config-ownership discovery for workflow state
  - `@open-agent-toolkit/control-plane` provides typed project-state parsing and recommendation data for `oat project status`, `oat project list`, and `oat config dump`
  - Project lifecycle utilities are implemented: `oat project open`, `oat project pause`, `oat project archive sync`, `oat-project-open`, `oat-project-clear-active`, `oat-project-complete`
  - Completion now auto-refreshes `summary.md`, always archives locally, emits dated S3 and summary snapshots when configured, and archive sync restores the latest remote snapshot into the local bare project archive
- Ideas workflow:
  - `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`
- Workflow phases + routing:
  - `oat-project-discover` -> `oat-project-spec` -> `oat-project-design` -> `oat-project-plan` -> `oat-project-implement`
  - Router: `oat-project-progress`
  - Shared planning contract: `oat-project-plan-writing` (spec-driven/quick/import mode guidance)
- Alternate lanes:
  - `oat-project-quick-start` (quick lane)
  - `oat-project-import-plan` (import lane, canonicalized to `plan.md`)
  - `oat-project-promote-spec-driven` (in-place promotion to spec-driven lifecycle)
- Review + PR loop:
  - Review provide: `oat-project-review-provide`, `oat-review-provide` (ad-hoc)
  - Review receive (local): `oat-project-review-receive`, `oat-review-receive` (ad-hoc)
  - Review receive (remote/PR): `oat-project-review-receive-remote`, `oat-review-receive-remote` (ad-hoc)
  - Reviewer prompt: `.agents/agents/oat-reviewer.md`
  - PR: `oat-project-pr-progress`, `oat-project-pr-final`
- Repo state dashboard:
  - `oat state refresh` CLI command generates `.oat/state.md` (gitignored) as a "single glance" dashboard
- Provider interop CLI:
  - Commands: `oat init`, `oat status`, `oat sync`, `oat providers list`, `oat providers inspect`, `oat providers set`, `oat doctor`, `oat instructions validate/sync`
  - Supported providers: Claude Code, Cursor, Codex CLI, GitHub Copilot, Gemini CLI
  - Codex TOML sync: canonical agent parser/renderer + Codex codec (export/import/config-merge/sync-extension for `.codex/agents/*.toml` and `.codex/config.toml`)
  - Sync state: `.oat/sync/manifest.json` + `.oat/sync/config.json`
  - Config-aware provider activation with interactive/non-interactive mismatch remediation
  - Worktree bootstrap path: `pnpm run worktree:init`
  - Worktree bootstrap skill: `oat-worktree-bootstrap` (deterministic root precedence)
  - Non-sync config phase A: `.oat/config.json` (`worktrees.root`, default `.worktrees`)
- Workflow UX:
  - User-facing progress indicators across skills (separator banners + step indicators + “starting/done” updates for long-running work)
- Skill authoring:
  - `create-oat-skill` (scaffold new OAT skills with standard sections + banner conventions)
- Agent instructions:
  - `oat-agent-instructions-analyze`, `oat-agent-instructions-apply` (multi-provider instruction file analysis and generation)
  - `oat instructions validate` / `oat instructions sync` (AGENTS.md ↔ CLAUDE.md integrity checking and repair)
  - `.oat/tracking.json` shared tracking manifest for delta mode operations
- Subagent orchestration:
  - `oat-project-subagent-implement`, `oat-worktree-bootstrap-auto` (parallel plan execution with review gates and autonomous bootstrap)
- Retroactive capture:
  - `oat-project-capture` (create full OAT project from untracked work on an existing branch)
- Reconciliation:
  - `oat-project-reconcile` (map manual/human commits to planned tasks and update tracking artifacts)
- Research skills:
  - `deep-research` (comprehensive research orchestrator), `analyze` (multi-angle analysis), `compare` (domain-aware comparison), `skeptic` (adversarial claim verification), `synthesize` (multi-artifact merge)
  - Sub-agent: `skeptical-evaluator`; shared schemas under `.agents/skills/deep-research/references/`
  - CLI tool pack: `research` (installable via `oat tools install research`)
- Documentation analysis:
  - `oat-docs-analyze`, `oat-docs-apply` (docs structure/coverage analysis and apply flow)
- Repo maintainability:
  - `oat-repo-maintainability-review` (structured maintainability analysis with actionable findings)
- Cleanup:
  - `oat cleanup project` (stale pointers, missing state, lifecycle completion normalization)
  - `oat cleanup artifacts` (duplicate pruning for reviews and external plans)
- Internal validation:
  - `pnpm oat:validate-skills` (internal; validates `oat-*` skill frontmatter + banner conventions)
- Templates under `.oat/templates/`: discovery/spec/design/plan/implementation/state + ideas templates (`ideas/*`)

## Known Gaps / Mismatches (What We Need To Resolve)

Core workflow + interop foundations are now in place. Remaining gaps are mostly hardening/polish and long-tail product direction work:

1. Make the Repo State Dashboard first-class
   - Exists today as a generated `.oat/state.md` (gitignored), but we need a clearer contract:
     - when it must be regenerated (and by which skills/scripts)
     - what fields are authoritative at repo-level vs project-level

2. Provider interoperability hardening (post-foundation)
   - Core CLI and config-aware sync are implemented; remaining work is lifecycle completeness (remove/uninstall flows, deeper diagnostics, and expanded capability docs).

3. Provider capability differences need explicit documentation + fallbacks
   - Some behaviors are provider-specific (skill args, subagents/Task tool, hooks).
   - Continue validating P0 assumptions (paths + precedence) and publishing a minimal capability matrix as lifecycle commands expand.

4. Directory model coordination
   - Dogfood uses `{PROJECTS_ROOT}` + config-backed active project state (`activeProject` in `.oat/config.local.json`).
   - Remaining work is broader multi-project branch-awareness and local/shared model automation.

5. Config consolidation follow-through
   - `projects.root` and project lifecycle state migration are implemented.
   - Remaining consolidation is long-tail config ownership (for example active-idea and other non-sync settings) rather than active-project/projects-root.

6. Invocation semantics guardrails
   - Skill-first contract is adopted, but we still need lightweight validation/docs checks to prevent regressions to slash-only wording.

## Roadmap Phases

### Phase 3 (Dogfood v1.1): Reviews + PR Loop (Code + Artifact)

**Goal:** Make review and PR creation first-class and workflow-native (no dependency on superpowers being installed).

**Status:** Completed

- Done: review loop (review-provide, review-receive, reviewer prompt, plan Reviews table, implement final gate)
- Done: PR skills (pr-progress + pr-final) (PR description generation; optional `gh pr create`)

**When to do it:**

- After we successfully dogfood at least one end-to-end feature using the baseline workflow (index -> implement), or
- When we see repeated missed requirements / quality regressions that would be caught by a fresh-context review.

**Deliverables:**

- Skills:
  - `oat-project-review-provide` (supports both code review and artifact review)
  - `oat-project-review-receive` (plan-driven gap closure: findings -> new plan tasks -> rerun implement)
  - `oat-project-pr-progress` (phase/progress PR descriptions) (implemented)
  - `oat-project-pr-final` (final PR description into main, using OAT artifacts as sources) (implemented)
- Subagent prompt(s) (syncable): `.agents/agents/oat-reviewer.md` (single general reviewer in v1)
- Templates:
  - `plan.md` includes `## Reviews` table (v1 canonical)
  - Optional: `.oat/templates/code-review.md`, `.oat/templates/artifact-review.md` (future)
- Scope discovery:
  - Commit convention grep (`type(pNN-tNN): ...`) for task/phase scoping
  - Explicit base SHA override (`base_sha=<sha>` means `<sha>..HEAD`)
  - Defensive fallback: if commit conventions are missing/inconsistent, ask user to confirm/provide scope
- Loop control:
  - Fixes are added as new tasks (same phase, sequential IDs, optional "(review)" tag)
  - Re-review defaults to "fix tasks only" after the first cycle
  - Cap at 3 review cycles before requiring user intervention
- Skill UX:
  - Skills must explicitly tell the user whether a subagent was used or not (Tier 1/2/3 behavior)
  - Final review auto-triggered at the final plan phase boundary
  - After final review findings are resolved: always ask "Open PR now?"

**Exit criteria:**

- A full "implement -> request-review -> receive-review -> implement (fixes) -> request-review (scoped) -> done" loop works.
- If PR skills are implemented: progress PR and project PR skills generate usable PR descriptions from OAT artifacts.
- Otherwise: manual PR creation path is clearly documented and usable.

---

### Phase 4 (Dogfood v1.2): Active Project Lifecycle State + Repo State Dashboard

**Goal:** Make project selection deterministic without committing to the full `.oat/projects/**` product model yet.

**Status:** Completed (polish remaining)

- Done: config-backed lifecycle state (`.oat/config.json`, `.oat/config.local.json`) + `oat config get/set/list`
- Done: `oat project open` / `oat project pause` lifecycle commands and dashboard integration
- Done: generated Repo State Dashboard (`.oat/state.md`) via `oat state refresh` CLI command
- Remaining: tighten the "first-class" contract (who regenerates it, what fields it includes, and how it stays in sync with skills)

**When to do it:**

- As soon as we have >1 project under `.oat/projects/shared/<name>/`, or
- When we see the wrong project being used / repeated prompts for project name.

**Deliverables:**

- `.oat/config.json` + `.oat/config.local.json` for shared/local OAT runtime state (`projects.root`, `worktrees.root`, `activeProject`, `lastPausedProject`)
- `oat config get/set/list` command surface for config reads/writes in skills and scripts
- `oat project open` / `oat project pause` commands with dashboard refresh integration
- Optional Repo State Dashboard (`.oat/state.md`) derived from the active project's `state.md` + knowledge freshness summary
- Update all workflow skills to resolve project via:
  1. `oat config get activeProject` / `.oat/config.local.json` (preferred)
  2. fallback prompts (if missing)
- Update OAT docs/templates/skills to use skill-first invocation guidance:
  - Canonical: `oat-project-implement` (skill name)
  - Alias: slash prompts only "where slash prompts are supported"
- Optional follow-on enhancement: add opt-in generation of thin `.codex/prompts/oat-*.md` wrappers during Codex skill sync

**Exit criteria:**

- All skills run against the intended project with no ambiguity and minimal prompting.
- The active project can be switched/paused explicitly via CLI commands without manual file edits.

---

### Phase 5 (Dogfood v1.3): Staleness + Knowledge Drift Upgrades

**Goal:** Improve staleness detection and enforcement beyond warn-only.

**When to do it:**

- After 1-2 dogfood projects where staleness signals feel noisy, or
- Before using OAT on high-risk changes where stale context would be costly.

**Deliverables:**

- Optional full diff-based staleness detection (in addition to age + scoped file/line counts)
- Strict staleness mode that can block downstream phases when knowledge is stale/missing
- Clear documentation for fallback behavior (non-git dirs, shallow clones, detached HEAD, etc.)

---

### Phase 6 (Dogfood v1.4): Parallel Execution + Reconcile

**Goal:** Support parallel phase/task execution (worktrees/stacked PRs/subagents) with reconciliation back into canonical artifacts.

**Status:** Deferred (groundwork expanded)

- Done: manual-safe worktree bootstrap skill (`oat-worktree-bootstrap`) with deterministic root precedence + baseline checks
- Done: subagent orchestration skill contracts (`oat-project-subagent-implement`, `oat-worktree-bootstrap-auto`) with execution mode persistence, dispatch, review gate, and fix-loop retry (PR #21, refined in PR #26; `oat-execution-mode-select` and `oat-subagent-orchestrate` consolidated into `oat-project-subagent-implement`)
- Remaining: parallel fan-out execution contracts and reconcile tooling

**When to do it:**

- When we want to run phases in parallel (or keep multiple worktrees moving), and
- The single-file `implementation.md` log becomes a bottleneck.

**Deliverables:**

- Parallel-friendly logging (per-phase logs and/or phase summaries)
- `oat-reconcile` skill to merge parallel updates into the main plan/implementation/state artifacts
- Explicit "phases that can run in parallel" semantics in `plan.md`

---

### Phase 7 (Dogfood v1.5): Quick Mode + Template Rendering Helper

**Goal:** Make small feature / quick fix workflows faster by safely skipping heavy steps (with guardrails).

**Status:** In Progress

- Done: quick lane starter (`oat-project-quick-start`)
- Done: import lane starter (`oat-project-import-plan`)
- Done: in-place promotion skill (`oat-project-promote-spec-driven`)
- Done: mode-aware routing/review/PR/dashboard contracts (`spec-driven|quick|import`)
- Done: shared canonical plan-writing contract (`oat-project-plan-writing`) applied across planning/import/review flows
- Remaining: template rendering helper (`oat template render ...`)

**When to do it:**

- After we have a stable "spec-driven mode", and
- We find ourselves repeatedly doing small changes where spec-driven discovery/spec/design overhead isn't worth it.

**Deliverables:**

- Quick/import mode lanes: reduced ceremony with canonical `plan.md` execution contract
- Template rendering helper (`oat template render ...`) to avoid copy/paste and ensure consistent frontmatter

---

### Phase 8 (Product v2.0): Provider Interop CLI + Sync Manifest

**Goal:** Deliver the original interop value: provider adapters, sync, drift detection, and safe apply.

**Status:** In Progress

- Done: core command surface (`oat init/status/sync/providers/doctor/instructions`)
- Done: config-aware provider activation and `oat providers set` for explicit enable/disable management
- Done: Codex TOML sync (canonical agent parser/renderer + codec for `.codex/agents/*.toml` and `.codex/config.toml` generation)
- Done: `oat instructions validate/sync` for AGENTS.md ↔ CLAUDE.md integrity
- Done: GitHub Copilot and Gemini CLI provider support
- Done: worktree-safe bootstrap guidance/script (`pnpm run worktree:init`)
- Done: `oat tools` command group (list, outdated, info, install, update, remove) for skill lifecycle management
- Remaining: expanded capability matrix and additional UX hardening

**When to do it:**

- Continue hardening current CLI behavior while expanding remaining lifecycle features.

**Deliverables:**

- P0: Validate provider assumptions (paths + precedence) in fixture repos
  - Claude Code: `.claude/{skills,agents,commands,hooks}` load/precedence
  - Codex CLI: `.codex/agents` (confirm)
  - Cursor: third-party agent loading + precedence (confirm)
- P0: CLI command surface (interop foundation)
  - `oat init` (bootstrap `.agents/`, `.oat/`, `AGENTS.md`)
  - `oat status` (provider detection + drift/stray summary + capability matrix)
  - `oat sync` (diff-first, mutate by default; `--dry-run` to preview)
  - `oat providers set` (explicit project provider enable/disable in sync config)
  - `oat doctor` (environment diagnostics + actionable fix steps)
- P0: Provider adapters (config-driven)
  - Canonical source is `.agents/**`; provider dirs are generated views (symlink/copy)
  - Strategies: `auto|symlink|copy` with persisted per-provider decisions
- P0: Sync manifest (drift safety)
  - `.oat/sync/manifest.json` records managed mappings + hashes (copy mode)
  - Destructive operations (deletes/prune) apply only to manifest-managed files
- P1: Template sourcing + generated views contract
  - Explicit “canonical vs generated” markers (avoid editing generated views)
  - Stray detection + optional adoption flow (provider-local -> `.agents/**`)
- P1: Optional git hooks (opt-in)
  - pre-commit checks / post-checkout assist (never surprising destructive behavior)

---

### Phase 9 (Product v2.1): Multi-Project Switching + Branch Awareness

**Goal:** The full `.oat/projects/(shared|local)/...` project model and branch-aware auto-switching.

**When to do it:**

- When we want multiple concurrent OAT projects per repo (and/or shared/local modes), or
- When branch-based project switching becomes important for daily use.

**Deliverables:**

- `.oat/projects/(shared|local)/<name>/state.md` (or a migration plan from `.oat/projects/shared/`)
- `.oat/projects/state.json` + optional `.oat/state.md` derivation
- `oat project new/open/auto/close` with optional git hook integration (post-checkout/post-merge)

---

### Phase 10 (Product v2.2+): Memory System + Deeper Provider-Specific Enhancements

**Goal:** Longer-term improvements once workflow + interop are stable.

**When to do it:**

- After Phase 8-9 are proven in real usage.

**Deliverables:**

- `.oat/memory/` (cross-session context; patterns; "what we learned")
- More complete provider capability matrix and provider-specific enhancements (hooks, subagent limitations, etc.)
