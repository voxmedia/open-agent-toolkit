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
- Active project selection: config-backed via `.oat/config.local.json` (`activeProject`, `lastPausedProject`) and `oat config get activeProject`
- Project scaffolding: `oat-project-new` (creates `{PROJECTS_ROOT}/<project>/...` from `.oat/templates/`)
- Project lifecycle management: `oat-project-open`, `oat-project-clear-active`, `oat-project-complete`
- Quick/import lanes: `oat-project-quick-start`, `oat-project-import-plan`, `oat-project-promote-spec-driven`
- Ideas workflow: `oat-idea-new`, `oat-idea-ideate`, `oat-idea-scratchpad`, `oat-idea-summarize`
- Shared plan contract: `oat-project-plan-writing`
- Review + PR loop:
  - Provide: `oat-project-review-provide`, `oat-review-provide` (ad-hoc)
  - Receive (local): `oat-project-review-receive`, `oat-review-receive` (ad-hoc)
  - Receive (remote/PR): `oat-project-review-receive-remote`, `oat-review-receive-remote` (ad-hoc)
  - PR: `oat-project-pr-progress`, `oat-project-pr-final`
- Repo State Dashboard: `.oat/state.md` generated via `oat state refresh` CLI command (gitignored)
- Provider interop CLI foundation:
  - `oat init`, `oat status`, `oat sync`, `oat providers list`, `oat providers inspect`, `oat providers set`, `oat doctor`, `oat instructions validate/sync`
  - Supported providers: Claude Code, Cursor, Codex CLI, GitHub Copilot, Gemini CLI
  - Codex TOML sync (canonical agent parser + codec for `.codex/agents/*.toml` and `.codex/config.toml`)
  - Config-aware provider activation via `.oat/sync/config.json`
  - Worktree bootstrap script: `pnpm run worktree:init`
- Worktree bootstrap skill + config phase A:
  - `oat-worktree-bootstrap` (deterministic root precedence + readiness checks)
  - `.oat/config.json` key `worktrees.root` (default `.worktrees`)
- Agent instructions:
  - `oat-agent-instructions-analyze`, `oat-agent-instructions-apply` (multi-provider instruction file analysis and generation)
  - `oat instructions validate` / `oat instructions sync` (AGENTS.md ↔ CLAUDE.md integrity)
  - `.oat/tracking.json` shared tracking manifest for delta mode operations
- Subagent orchestration:
  - `oat-execution-mode-select`, `oat-subagent-orchestrate`, `oat-worktree-bootstrap-auto` (execution mode, dispatch, autonomous bootstrap)
- Cleanup:
  - `oat cleanup project`, `oat cleanup artifacts`

## Deferred Phases

### Active-project name-only migration (deferred)

The CLI now owns project lifecycle commands and config-backed active project state (`activeProject` in `.oat/config.local.json`, repo-relative path). Earlier deferred pointer-file migration concerns have been resolved by ADR-012/ADR-013 and the B15+B02 implementation.

What remains deferred is a narrower follow-on question:
- whether `activeProject` should continue storing a repo-relative path (current canonical), or
- move to a name-only value resolved via `projects.root`.

Current canonical behavior:
- **Write:** repo-relative path in `.oat/config.local.json` (`activeProject`)
- **Read:** via `oat config get activeProject` (skills/scripts should not parse pointer files directly)
- **Compatibility:** legacy `.oat/active-project` files may remain inert; they are not canonical in migrated flows

**Decision status:** Name-only `activeProject` storage remains optional future work; repo-relative path storage is the current ADR-backed baseline.

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

**Current status:** Deferred, but groundwork expanded. `oat-worktree-bootstrap` is implemented for manual-safe worktree setup, and subagent orchestration skills (`oat-execution-mode-select`, `oat-subagent-orchestrate`, `oat-worktree-bootstrap-auto`) provide execution mode selection, dispatch contracts, and autonomous bootstrap with review gate and fix-loop retry (PR #21, refined in PR #26).

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
- After we have a stable "spec-driven mode", and
- We find ourselves repeatedly doing small changes where spec-driven discovery/spec/design overhead isn't worth it.

**Deliverables:**
- Done: quick/import mode lanes with canonical `plan.md` execution contract
- Done: shared plan-writing guidance (`oat-project-plan-writing`) with mode-aware plan contracts
- Remaining: template rendering helper (`oat template render ...`) to avoid copy/paste and ensure consistent frontmatter

---

### Phase 8 (Product v2.0): Provider Interop CLI + Sync Manifest

**What:** Turn the dogfood workflow into a broader toolkit: provider adapters, sync, drift detection, and safe apply.

**Status:** In Progress
- Done: core command surface, sync manifest/config model, provider config commands, Codex TOML sync, instructions validate/sync, Copilot/Gemini provider support
- Remaining: lifecycle completeness features (uninstall/remove) and provider capability hardening

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
