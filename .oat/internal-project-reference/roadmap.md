# OAT Roadmap (Dogfood-First)

This file is the canonical OAT roadmap for this repo. It combines:
- the dogfood workflow direction (`.oat/internal-project-reference/past-artifacts/2026-01-27-oat-dogfood-workflow-design-v2.md`)
- the early "product" vision (interop + CLI) (`.oat/internal-project-reference/past-artifacts/agentic_development_framework_v_1_plan.md`)
- the review/subagent direction (`.oat/projects/shared/workflow-research/analysis/subagents/refined-subagent-proposal.md`)

For a birdseye snapshot of what exists *right now*, see `.oat/internal-project-reference/current-state.md`.

For day-to-day friction and pain points discovered while running the workflow, log notes in `.oat/internal-project-reference/temp/workflow-user-feedback.md`.

As of `git log -1` on branch `dogfood-workflow`, the dogfood workflow baseline has been exercised end-to-end. The next focus is shifting toward the original product direction: provider interop via a safe, diff-first CLI (`oat init/status/sync/doctor`), while keeping the Repo State Dashboard and workflow contracts in sync.

## Status Summary

| Area / Phase | Status | Notes |
|---|---|---|
| Dogfood workflow baseline | Completed | `oat-project-index`, `oat-project-new`, phases (`discover → implement`), router, review loop, PR skills |
| Phase 3: Reviews + PR loop | Completed | Implemented + dogfooded |
| Phase 4: Active project pointer + Repo State Dashboard | Completed (polish remaining) | Pointer + generated `.oat/state.md` exist; clarify “first-class” regeneration contract |
| Phase 5: Staleness + knowledge drift | Planned | Improve/enforce freshness beyond warn-only |
| Phase 6: Parallel execution + reconcile | Deferred | Worktrees/subagents + reconciliation tooling |
| Phase 7: Quick mode + template rendering helper | In Progress | Quick/import lanes implemented; template rendering helper still planned |
| Phase 8: Provider interop CLI + sync manifest | Next | `oat init/status/sync/doctor`, adapters, manifest, safe sync |
| Phase 9: Multi-project switching + branch awareness | Later | Full `.oat/projects/(shared|local)/...` + hooks |
| Phase 10: Memory system + provider enhancements | Later | Longer-term durability features |
| Cross-cutting: skill invocation normalization | High priority | Use skill-first wording across OAT docs/skills; treat `/oat:*` as host-specific alias |

## Current State (Implemented)

Dogfood workflow baseline is implemented and has been exercised end-to-end:
- Knowledge: `oat-project-index` + `.oat/knowledge/**` (thin->full project index, mapper outputs under `.oat/knowledge/repo/`)
- Projects:
  - `oat-project-new` scaffolds `{PROJECTS_ROOT}/<project>/...` from `.oat/templates/`
  - `.oat/projects-root` sets `{PROJECTS_ROOT}` (default: `.oat/projects/shared`)
  - `.oat/active-project` stores the active project path (local-only); all `oat-*` skills resolve project from it (fallback: prompt)
- Workflow phases + routing:
  - `oat-project-discover` -> `oat-project-spec` -> `oat-project-design` -> `oat-project-plan` -> `oat-project-implement`
  - Router: `oat-project-progress`
- Alternate lanes:
  - `oat-project-quick-start` (quick lane)
  - `oat-project-import-plan` (import lane, canonicalized to `plan.md`)
  - `oat-project-promote-full` (in-place promotion to full lifecycle)
- Review + PR loop:
  - Review: `oat-project-review-provide`, `oat-project-review-receive` + `.agents/agents/oat-reviewer.md`
  - PR: `oat-project-pr-progress`, `oat-project-pr-final`
- Repo state dashboard:
  - `.oat/scripts/generate-oat-state.sh` generates `.oat/state.md` (gitignored) as a "single glance" dashboard
- Workflow UX:
  - User-facing progress indicators across skills (separator banners + step indicators + “starting/done” updates for long-running work)
- Skill authoring:
  - `create-oat-skill` (scaffold new OAT skills with standard sections + banner conventions)
- Internal validation:
  - `pnpm oat:validate-skills` (internal; validates `oat-*` skill frontmatter + banner conventions)
- Templates under `.oat/templates/`: discovery/spec/design/plan/implementation/state/project-index

## Known Gaps / Mismatches (What We Need To Resolve)

The workflow baseline is now stable enough to shift focus to interop. Remaining gaps are mostly "product direction" work:

1. Make the Repo State Dashboard first-class
   - Exists today as a generated `.oat/state.md` (gitignored), but we need a clearer contract:
     - when it must be regenerated (and by which skills/scripts)
     - what fields are authoritative at repo-level vs project-level

2. Provider interoperability is not implemented (CLI + adapters + sync)
   - The core product value requires `oat init/status/sync/doctor`, provider adapters, and a safe sync manifest.

3. Provider capability differences need explicit documentation + fallbacks
   - Some behaviors are provider-specific (skill args, subagents/Task tool, hooks).
   - Before we ship CLI sync: validate the P0 assumptions (paths + precedence) and publish a minimal capability matrix.

4. Directory model coordination
   - Dogfood uses `{PROJECTS_ROOT}` + `.oat/active-project` (path format).
   - Name-only `.oat/active-project` is intentionally deferred until CLI project commands own the contract (ADR-004).

5. Invocation semantics are inconsistent across host clients
   - Current docs frequently assume `/oat:*` slash command availability.
   - This is not universal (for example, Codex depends on prompt wrappers/host wiring).
   - We need a single contract: skill names are canonical; slash commands are optional aliases when supported.

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
- Remaining (high priority): normalize OAT invocation wording to skill-first across templates/skills/internal docs (`oat-*` canonical; `/oat:*` alias-only text)

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

**When to do it:**
- Now that dogfood v1 has been exercised end-to-end, we can start building the CLI in parallel with smaller workflow polish.

**Deliverables:**
- P0: Validate provider assumptions (paths + precedence) in fixture repos
  - Claude Code: `.claude/{skills,agents,commands,hooks}` load/precedence
  - Codex CLI: `.codex/agents` (confirm)
  - Cursor: third-party agent loading + precedence (confirm)
- P0: CLI command surface (interop foundation)
  - `oat init` (bootstrap `.agents/`, `.oat/`, `AGENTS.md`)
  - `oat status` (provider detection + drift/stray summary + capability matrix)
  - `oat sync` (diff-first, dry-run by default; apply only with explicit flag)
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
