# Deferred Phases (Roadmap)

This document lists the next phases of work that are explicitly deferred beyond the current dogfood workflow baseline, plus concrete "when to do it" triggers.

Primary references:
- `.oat/internal-project-reference/past-artifacts/2026-01-27-oat-dogfood-workflow-design-v2.md`
- `.agent/projects/project-setup/reference/agentic_development_framework_v_1_plan.md`
- `.agent/projects/workflow-research/analysis/subagents/refined-subagent-proposal.md`
- Current snapshot: `.oat/internal-project-reference/current-state.md`

## Baseline (Already In Scope)

Dogfood v1 baseline is:
- `oat-index` + `.oat/knowledge/**`
- `oat-discovery` -> `oat-spec` -> `oat-design` -> `oat-plan` -> `oat-implement`
- `oat-progress` router
- Active project selection: `.oat/active-project` (single-line path, local-only; gitignored)

## Deferred Phases

### Phase 3 (Dogfood v1.1): Reviews + PR Loop (Code + Artifact)

**What:** Add first-class review workflows (artifact review + code review) plus PR creation skills integrated with `oat-implement`.

**Status:** In progress
- Done: `oat-request-review`, `oat-receive-review`, `.agent/agents/oat-reviewer.md`, plan `## Reviews` table, and `oat-implement` final-review gate/prompt
- Done: `oat-pr-progress` and `oat-pr-project` (PR description generation; optional `gh pr create`)

**When to start:**
- After we successfully dogfood at least one end-to-end feature using the baseline workflow (index -> implement), and
- We feel pain around quality drift / missed requirements / lack of "fresh-context" review.

**Deliverables:**
- Skills:
  - `oat-request-review`, `oat-receive-review` (implemented)
  - `oat-pr-progress`, `oat-pr-project` (implemented)
- Subagent prompt(s) in `.agent/agents/`: a single general `oat-reviewer` (expand later) (implemented)
- Templates:
  - plan `## Reviews` table is the v1 canonical format (implemented)
  - Optional future: `.oat/templates/code-review.md`, `.oat/templates/artifact-review.md`
- Optional plan controls (future):
  - If we want non-final reviews/PR prompts to be automatic, add a small plan-level config (possibly frontmatter) for when to auto-trigger review and when to prompt for PRs.
  - v1 behavior: final review is required at the end; non-final reviews are manual by default.
- Implement wiring:
  - Auto-trigger final review at final phase boundary
  - Always ask "Open PR now?" after final review findings are resolved
  - Explicitly tell the user whether a subagent was used (Tier 1/2/3 behavior)

**Exit criteria:**
- Review scope discovery works via commit convention grep, with `base_sha` override support.
- Review findings reliably become new plan tasks, and rerunning `oat-implement` closes the loop.
- PR skills can generate a usable progress PR and a final project PR from OAT artifacts (or manual PR path is documented until those ship).

---

### Phase 4 (Dogfood v1.2): Active Project Pointer + Repo State Dashboard

**What:** Make "which project is active" unambiguous and machine-readable, without migrating to the full `.oat/projects/**` model yet.

**Status:** In progress
- Done: `.oat/active-project` pointer + all `oat-*` skills resolve project from it
- Remaining: `.oat/state.md` dashboard and a documented project switching workflow

**When to start:**
- As soon as we have >1 `.agent/projects/<name>/` in a repo, or
- We notice skills repeatedly prompting for project name / operating on the wrong project.

**Deliverables:**
- `.oat/active-project` pointer (path to the active `.agent/projects/<name>/` directory)
- `.oat/state.md` human/agent-friendly dashboard (active project, phase/status, blockers, last commit, knowledge freshness)
- Update all workflow skills to resolve project via:
  1) `.oat/active-project` (preferred)
  2) fallback prompts (if missing)

**Exit criteria:**
- All skills operate on the correct project with no ambiguity.
- Switching projects is a single, explicit action (even if manual at first).

---

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
- Quick mode: reduced questioning, design optional when triggers aren't present
- Template rendering helper (`oat template render ...`) to avoid copy/paste and ensure consistent frontmatter

---

### Phase 8 (Product v2.0): Provider Interop CLI + Sync Manifest

**What:** Turn the dogfood workflow into a broader toolkit: provider adapters, sync, drift detection, and safe apply.

**When to start:**
- After dogfood v1 is stable enough to open-source "as a workflow", and
- We're ready to prioritize interoperability (the primary value in the early plan doc).

**Deliverables (from early plan direction):**
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
- `.oat/projects/(shared|local)/<name>/state.md` (or a migration plan from `.agent/projects/`)
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
