# OAT Roadmap (Dogfood-First)

This file is the canonical OAT roadmap for this repo. It combines:
- the dogfood workflow direction (`.oat/repo/archive/past-artifacts/2026-01-27-oat-dogfood-workflow-design-v2.md`)
- the early "product" vision (interop + CLI) (`.oat/repo/archive/past-artifacts/agentic_development_framework_v_1_plan.md`)
- the review/subagent direction (`.oat/projects/archived/workflow-research/analysis/subagents/refined-subagent-proposal.md`)

For a birdseye snapshot of what exists *right now*, see `.oat/repo/reference/current-state.md`.

For day-to-day friction and pain points discovered while running the workflow, log notes in `.oat/repo/archive/workflow-user-feedback.md`.

As of `2026-02-18` on `main`, dogfood workflow baseline and provider-interop CLI foundations are both in active use (`oat init/status/sync/providers/doctor`, config-aware sync, worktree bootstrap, `.oat/config.json` phase-A settings). Near-term focus is hardening and lifecycle completeness rather than initial scaffolding.

## Status Summary

| Area / Phase | Status | Notes |
|---|---|---|
| Dogfood workflow baseline | Completed | `oat-repo-knowledge-index`, `oat-project-new`, phases (`discover → implement`), router, review loop, PR skills |
| Phase 3: Reviews + PR loop | Completed | Implemented + dogfooded |
| Phase 4: Active project pointer + Repo State Dashboard | Completed (polish remaining) | Pointer + generated `.oat/state.md` exist; clarify “first-class” regeneration contract |
| Phase 5: Staleness + knowledge drift | Planned | Improve/enforce freshness beyond warn-only |
| Phase 6: Parallel execution + reconcile | Deferred (groundwork started) | `oat-worktree-bootstrap` exists; parallel execution + reconcile tooling still pending |
| Phase 7: Quick mode + template rendering helper | In Progress | Quick/import lanes + canonical plan writing contract implemented; template rendering helper still planned |
| Phase 8: Provider interop CLI + sync manifest | In Progress | Core command surface + config-aware provider sync shipped; lifecycle polish remains |
| Phase 9: Multi-project switching + branch awareness | Later | Full `.oat/projects/(shared|local)/...` + hooks |
| Phase 10: Memory system + provider enhancements | Later | Longer-term durability features |
| Cross-cutting: skill invocation normalization | Completed (guardrails ongoing) | Skill-first wording adopted; continue preventing regressions |

## Current State (Implemented)

Dogfood workflow baseline is implemented and has been exercised end-to-end:
- Knowledge: `oat-repo-knowledge-index` + `.oat/repo/knowledge/**` (thin->full project index, mapper outputs under `.oat/repo/knowledge/`)
- Projects:
  - `oat-project-new` scaffolds `{PROJECTS_ROOT}/<project>/...` from `.oat/templates/`
  - `.oat/projects-root` sets `{PROJECTS_ROOT}` (default: `.oat/projects/shared`)
  - `.oat/active-project` stores the active project path (local-only); all `oat-*` skills resolve project from it (fallback: prompt)
  - Project lifecycle utilities are implemented: `oat-project-open`, `oat-project-clear-active`, `oat-project-complete`
- Ideas workflow:
  - `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`
- Workflow phases + routing:
  - `oat-project-discover` -> `oat-project-spec` -> `oat-project-design` -> `oat-project-plan` -> `oat-project-implement`
  - Router: `oat-project-progress`
  - Shared planning contract: `oat-project-plan-writing` (full/quick/import mode guidance)
- Alternate lanes:
  - `oat-project-quick-start` (quick lane)
  - `oat-project-import-plan` (import lane, canonicalized to `plan.md`)
  - `oat-project-promote-full` (in-place promotion to full lifecycle)
- Review + PR loop:
  - Review: `oat-project-review-provide`, `oat-project-review-receive` + `.agents/agents/oat-reviewer.md`
  - Ad-hoc review (no project state required): `oat-review-provide`
  - PR: `oat-project-pr-progress`, `oat-project-pr-final`
- Repo state dashboard:
  - `.oat/scripts/generate-oat-state.sh` generates `.oat/state.md` (gitignored) as a "single glance" dashboard
- Provider interop CLI:
  - Commands: `oat init`, `oat status`, `oat sync`, `oat providers list`, `oat providers inspect`, `oat providers set`, `oat doctor`
  - Sync state: `.oat/sync/manifest.json` + `.oat/sync/config.json`
  - Config-aware provider activation with interactive/non-interactive mismatch remediation
  - Worktree bootstrap path: `pnpm run worktree:init`
  - Worktree bootstrap skill: `oat-worktree-bootstrap` (deterministic root precedence)
  - Non-sync config phase A: `.oat/config.json` (`worktrees.root`, default `.worktrees`)
- Workflow UX:
  - User-facing progress indicators across skills (separator banners + step indicators + “starting/done” updates for long-running work)
- Skill authoring:
  - `create-oat-skill` (scaffold new OAT skills with standard sections + banner conventions)
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
   - Dogfood uses `{PROJECTS_ROOT}` + `.oat/active-project` (path format).
   - Name-only `.oat/active-project` is intentionally deferred until CLI project commands own the contract (ADR-004).

5. Config consolidation follow-through
   - `.oat/config.json` phase A is in place for non-sync settings (`worktrees.root`).
   - Phase B/C migration work for existing pointers (`.oat/projects-root`, active pointers) remains planned.

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

### Phase 4 (Dogfood v1.2): Active Project Pointer + Repo State Dashboard

**Goal:** Make project selection deterministic without committing to the full `.oat/projects/**` product model yet.

**Status:** Completed (polish remaining)
- Done: `.oat/projects-root` + `.oat/active-project` pointer + skills resolve via it
- Done: generated Repo State Dashboard (`.oat/state.md`) via `.oat/scripts/generate-oat-state.sh`
- Remaining: tighten the "first-class" contract (who regenerates it, what fields it includes, and how it stays in sync with skills)

**When to do it:**
- As soon as we have >1 project under `.oat/projects/shared/<name>/`, or
- When we see the wrong project being used / repeated prompts for project name.

**Deliverables:**
- `.oat/projects-root` containing the default projects root (e.g., `.oat/projects/shared`)
- `.oat/active-project` pointer file containing the active project directory path (under the configured projects root)
- Optional Repo State Dashboard (`.oat/state.md`) derived from the active project's `state.md` + knowledge freshness summary
- Update all workflow skills to resolve project via:
  1) `.oat/active-project` (preferred)
  2) fallback prompts (if missing)
- Update OAT docs/templates/skills to use skill-first invocation guidance:
  - Canonical: `oat-project-implement` (skill name)
  - Alias: slash prompts only "where slash prompts are supported"
- Optional follow-on enhancement: add opt-in generation of thin `.codex/prompts/oat-*.md` wrappers during Codex skill sync

**Exit criteria:**
- All skills run against the intended project with no ambiguity and minimal prompting.
- The active project can be switched explicitly (even if manual) without editing skill files.

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

**Status:** Deferred (groundwork started)
- Done: manual-safe worktree bootstrap skill (`oat-worktree-bootstrap`) with deterministic root precedence + baseline checks
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
- Done: in-place promotion skill (`oat-project-promote-full`)
- Done: mode-aware routing/review/PR/dashboard contracts (`full|quick|import`)
- Done: shared canonical plan-writing contract (`oat-project-plan-writing`) applied across planning/import/review flows
- Remaining: template rendering helper (`oat template render ...`)

**When to do it:**
- After we have a stable "full mode", and
- We find ourselves repeatedly doing small changes where full discovery/spec/design overhead isn't worth it.

**Deliverables:**
- Quick/import mode lanes: reduced ceremony with canonical `plan.md` execution contract
- Template rendering helper (`oat template render ...`) to avoid copy/paste and ensure consistent frontmatter

---

### Phase 8 (Product v2.0): Provider Interop CLI + Sync Manifest

**Goal:** Deliver the original interop value: provider adapters, sync, drift detection, and safe apply.

**Status:** In Progress
- Done: core command surface (`oat init/status/sync/providers/doctor`)
- Done: config-aware provider activation and `oat providers set` for explicit enable/disable management
- Done: worktree-safe bootstrap guidance/script (`pnpm run worktree:init`)
- Remaining: lifecycle completeness commands (e.g., uninstall/remove), expanded capability matrix, and additional UX hardening

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
  - `oat sync` (diff-first, dry-run by default; apply only with explicit flag)
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
