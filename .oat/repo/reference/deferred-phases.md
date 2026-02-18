# Deferred Phases (Roadmap)

This document lists the next phases of work that are explicitly deferred beyond the current dogfood workflow baseline, plus concrete "when to do it" triggers.

Primary references:
- `.oat/repo/archive/past-artifacts/2026-01-27-oat-dogfood-workflow-design-v2.md`
- `.oat/repo/archive/past-artifacts/agentic_development_framework_v_1_plan.md`
- `.oat/projects/archived/workflow-research/analysis/subagents/refined-subagent-proposal.md`
- Current snapshot: `.oat/repo/reference/current-state.md`

## Baseline (Already In Scope)

Dogfood v1 baseline is:
- `oat-repo-knowledge-index` + `.oat/repo/knowledge/**`
- `oat-project-discover` -> `oat-project-spec` -> `oat-project-design` -> `oat-project-plan` -> `oat-project-implement`
- `oat-project-progress` router
- Active project selection: `.oat/active-project` (single-line path, local-only; gitignored)
- Project scaffolding: `oat-project-new` (creates `{PROJECTS_ROOT}/<project>/...` from `.oat/templates/`)
- Project lifecycle management: `oat-project-open`, `oat-project-clear-active`, `oat-project-complete`
- Quick/import lanes: `oat-project-quick-start`, `oat-project-import-plan`, `oat-project-promote-full`
- Ideas workflow: `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`
- Shared plan contract: `oat-project-plan-writing`
- Review + PR loop: `oat-project-review-provide`, `oat-project-review-receive`, `oat-project-pr-progress`, `oat-project-pr-final`
- Ad-hoc review: `oat-review-provide` (non-project scopes)
- Repo State Dashboard: `.oat/state.md` generated via `.oat/scripts/generate-oat-state.sh` (gitignored)
- Provider interop CLI foundation:
  - `oat init`, `oat status`, `oat sync`, `oat providers list`, `oat providers inspect`, `oat providers set`, `oat doctor`
  - Config-aware provider activation via `.oat/sync/config.json`
  - Worktree bootstrap script: `pnpm run worktree:init`
- Worktree bootstrap skill + config phase A:
  - `oat-worktree-bootstrap` (deterministic root precedence + readiness checks)
  - `.oat/config.json` key `worktrees.root` (default `.worktrees`)

## Deferred Phases

### Active project pointer format migration (deferred)

We discussed migrating `.oat/active-project` from storing a full path → storing a project name (resolved via `{PROJECTS_ROOT}/{name}`), but this is a coordination problem because many existing skills assume the pointer contains a path.

For dogfood v1, the safest approach is:
- **Write:** Keep writing a full path to `.oat/active-project` (backward compatible with existing skills).
- **Read:** New tooling may accept either format where safe:
  - Legacy full path (current canonical)
  - Name-only (future), resolved via `.oat/projects-root` / `OAT_PROJECTS_ROOT`
- **Migration:** Treat name-only as a separate coordinated update (update every skill’s “resolve active project” logic first, then flip writes).

**Decision:** Name-only migration is explicitly deferred until the CLI owns project commands (see `.oat/repo/reference/decision-record.md` ADR-004).

### Phase 5 (Dogfood v1.3): Staleness + Knowledge Drift Upgrades

**What:** Improve staleness detection and enforcement beyond "warn-only".

**When to start:**
- After 1-2 dogfood projects where staleness signals felt noisy (false positives/negatives), or
- Before using OAT on high-risk changes where stale context would be costly.

**Deliverables:**
- "Full diff-based staleness detection" option (in addition to age + scoped file/line counts)
- Strict staleness mode that can block downstream phases when knowledge is stale/missing
- Clear docs for thresholds and fallback behavior (non-git dirs, shallow clones, detached HEAD, etc.)

---

### Phase 6 (Dogfood v1.4): Parallel Execution + Reconcile

**What:** Support parallel phase/task execution (worktrees/stacked PRs/subagents) with reconciliation back into canonical artifacts.

**Current status:** Deferred, but prerequisites started (`oat-worktree-bootstrap` is implemented for manual-safe worktree setup).

**When to start:**
- When we actively want to run phases in parallel (or keep multiple worktrees moving), and
- The single-file `implementation.md` log becomes a bottleneck.

**Deliverables:**
- A parallel-friendly log structure (e.g., per-phase logs) and/or phase summaries
- `oat-reconcile` skill to merge parallel updates into the main plan/implementation/state artifacts
- Explicit "phases that can run in parallel" semantics in `plan.md`

---

### Phase 7 (Dogfood v1.5): Quick Mode + Template Rendering Helper

**What:** Make "small feature / quick fix" workflows faster by safely skipping heavy steps (with guardrails).

**When to start:**
- After we have a stable "full mode", and
- We find ourselves repeatedly doing small changes where full discovery/spec/design overhead isn't worth it.

**Deliverables:**
- Done: quick/import mode lanes with canonical `plan.md` execution contract
- Done: shared plan-writing guidance (`oat-project-plan-writing`) with mode-aware plan contracts
- Remaining: template rendering helper (`oat template render ...`) to avoid copy/paste and ensure consistent frontmatter

---

### Phase 8 (Product v2.0): Provider Interop CLI + Sync Manifest

**What:** Turn the dogfood workflow into a broader toolkit: provider adapters, sync, drift detection, and safe apply.

**Status:** In Progress
- Done: core command surface, sync manifest/config model, and provider config commands
- Remaining: lifecycle completeness features and provider capability hardening

**When to start:**
- Now that dogfood v1 has been exercised end-to-end, we can start building the CLI in parallel with smaller workflow polish.

**Deliverables (remaining from early plan direction):**
- `oat init`, `oat status`, `oat sync`, `oat doctor`
- Provider adapters + capability matrix
- `.oat/sync/manifest.json`-based management (diff-first, reversible)
- Optional git hooks to enforce sync invariants (opt-in)

---

### Phase 9 (Product v2.1): Multi-Project Switching + Branch Awareness

**What:** The full `.oat/projects/(shared|local)/...` project model and branch-aware auto-switching.

**When to start:**
- When we want multiple concurrent OAT projects per repo (and/or shared/local modes), or
- When branch-based project switching becomes important for daily use.

**Deliverables:**
- `.oat/projects/(shared|local)/<name>/state.md` (or a migration plan from `.oat/projects/shared/`)
- `.oat/projects/state.json` + optional `.oat/state.md` derivation
- `oat project new/open/auto/close` with optional git hook integration (post-checkout/post-merge)

---

### Phase 10 (Product v2.2+): Memory System + Deeper Provider-Specific Enhancements

**What:** Longer-term improvements once workflow + sync are stable.

**When to start:**
- After Phase 8-9 (interop + multi-project) are proven in real usage.

**Deliverables:**
- `.oat/memory/` (cross-session context; patterns; "what we learned")
- More complete provider capability matrix and provider-specific features (e.g., hook mirroring policies, subagent limitations)
