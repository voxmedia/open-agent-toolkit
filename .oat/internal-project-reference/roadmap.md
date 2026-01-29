# OAT Roadmap (Dogfood-First)

This file is the canonical OAT roadmap for this repo. It combines:
- the dogfood workflow direction (`.oat/internal-project-reference/past-artifacts/2026-01-27-oat-dogfood-workflow-design-v2.md`)
- the early "product" vision (interop + CLI) (`.agent/projects/project-setup/reference/agentic_development_framework_v_1_plan.md`)
- the review/subagent direction (`.agent/projects/workflow-research/analysis/subagents/refined-subagent-proposal.md`)

For a birdseye snapshot of what exists *right now*, see `.oat/internal-project-reference/current-state.md`.

As of `git log -1` on branch `dogfood-workflow`, we have the baseline workflow skills and templates in place. The next work is largely about closing known gaps (reviews/PRs, active project resolution) and then deciding when to shift focus to provider interop.

## Current State (Implemented)

Baseline dogfood workflow is implemented:
- Knowledge: `oat-index` + `.oat/knowledge/**` (thin->full project index, mapper outputs under `.oat/knowledge/repo/`)
- Active project selection: `.oat/active-project` (single-line path, local-only) and all `oat-*` skills resolve project from it (fallback: prompt)
- Artifacts + skills:
  - `oat-discovery` -> `oat-spec` -> `oat-design` -> `oat-plan` -> `oat-implement`
  - Router: `oat-progress`
- Templates under `.oat/templates/`: discovery/spec/design/plan/implementation/state/project-index
- Project artifacts under `.agent/projects/<project>/` (current dogfood layout)
- Testing traceability:
  - spec Requirement Index uses `Verification` (`method: pointer`)
  - design includes requirement-to-test mapping inside `## Testing Strategy`

## Known Gaps / Mismatches (What We Need To Resolve)

1. Repo-level state dashboard (active project + summary)
   - Implemented: `.oat/active-project` pointer (local-only) and skills resolve via it.
   - Missing: a human/agent-friendly `.oat/state.md` dashboard to summarize active project status + knowledge freshness at a glance.

2. Reviews + PR workflow is not yet first-class
   - Implemented (review loop):
     - `oat-request-review`, `oat-receive-review`
     - Reviewer prompt: `.agent/agents/oat-reviewer.md`
     - `plan.md` template includes a `## Reviews` table with a documented status progression
     - `oat-implement` triggers a final-review gate and then prompts for PR
   - Implemented (PR automation):
     - `oat-pr-progress` (phase/progress PR descriptions)
     - `oat-pr-project` (final PR description into main)
   - Optional (nice-to-have templates):
     - `.oat/templates/code-review.md`, `.oat/templates/artifact-review.md` (currently the canonical format is in `.agent/agents/oat-reviewer.md`)

3. Dogfood vs product scope needs explicit separation
   - Dogfood design (v2) prioritizes workflow skills first and keeps projects in `.agent/projects/`.
   - Early plan prioritizes provider interop (CLI, adapters, sync manifest, `.oat/projects/**`).
   - Gap: we need to keep both visions, but sequence them clearly to avoid half-implementing two incompatible directory models.

4. Provider capability differences
   - Some desired behaviors are provider-specific (skill args, subagents/Task tool, hooks).
   - Gap: document a minimal capability matrix and specify fallbacks (especially for args + subagent availability).

## Roadmap Phases

### Phase 3 (Dogfood v1.1): Reviews + PR Loop (Code + Artifact)

**Goal:** Make review and PR creation first-class and workflow-native (no dependency on superpowers being installed).

**Status:** In progress
- Done: review loop (request-review, receive-review, reviewer prompt, plan Reviews table, implement final gate)
- Done: PR skills (progress + project) (PR description generation; optional `gh pr create`)

**When to do it:**
- After we successfully dogfood at least one end-to-end feature using the baseline workflow (index -> implement), or
- When we see repeated missed requirements / quality regressions that would be caught by a fresh-context review.

**Deliverables:**
- Skills:
  - `oat-request-review` (supports both code review and artifact review)
  - `oat-receive-review` (plan-driven gap closure: findings -> new plan tasks -> rerun implement)
  - `oat-pr-progress` (phase/progress PR descriptions) (implemented)
  - `oat-pr-project` (final PR description into main, using OAT artifacts as sources) (implemented)
- Subagent prompt(s) (syncable): `.agent/agents/oat-reviewer.md` (single general reviewer in v1)
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

**Status:** In progress
- Done: `.oat/active-project` pointer + skills resolve via it
- Remaining: `.oat/state.md` dashboard and documented project switching workflow

**When to do it:**
- As soon as we have >1 `.agent/projects/<name>/` directory, or
- When we see the wrong project being used / repeated prompts for project name.

**Deliverables:**
- `.oat/active-project` pointer file containing a path to the active project directory (initially `.agent/projects/<name>/`)
- Optional `.oat/state.md` dashboard derived from the active project's `state.md` + knowledge freshness summary
- Update all workflow skills to resolve project via:
  1) `.oat/active-project` (preferred)
  2) fallback prompts (if missing)

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

**When to do it:**
- After we have a stable "full mode", and
- We find ourselves repeatedly doing small changes where full discovery/spec/design overhead isn't worth it.

**Deliverables:**
- Quick mode: reduced questioning; design optional when triggers aren't present
- Template rendering helper (`oat template render ...`) to avoid copy/paste and ensure consistent frontmatter

---

### Phase 8 (Product v2.0): Provider Interop CLI + Sync Manifest

**Goal:** Deliver the original interop value: provider adapters, sync, drift detection, and safe apply.

**When to do it:**
- After dogfood v1 is stable enough to open-source "as a workflow", and
- We're ready to prioritize interoperability (the primary value in the early plan doc).

**Deliverables:**
- `oat init`, `oat status`, `oat sync`, `oat doctor`
- Provider adapters + capability matrix
- `.oat/sync/manifest.json` managed operations (diff-first, reversible)
- Optional git hooks to enforce sync invariants (opt-in)

---

### Phase 9 (Product v2.1): Multi-Project Switching + Branch Awareness

**Goal:** The full `.oat/projects/(shared|local)/...` project model and branch-aware auto-switching.

**When to do it:**
- When we want multiple concurrent OAT projects per repo (and/or shared/local modes), or
- When branch-based project switching becomes important for daily use.

**Deliverables:**
- `.oat/projects/(shared|local)/<name>/state.md` (or a migration plan from `.agent/projects/`)
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
