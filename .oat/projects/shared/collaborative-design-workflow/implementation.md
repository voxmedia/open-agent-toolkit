---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-23
oat_current_task_id: p04-t01
oat_generated: false
---

<!-- Implementation run started 2026-04-23: Tier 1 (subagents), parallel group [[p01, p02]], HiLL ['p04'], auto-review at HiLL enabled. -->

# Implementation: collaborative-design-workflow

**Started:** 2026-04-15
**Last Updated:** 2026-04-17

## Review History (pre-implementation)

### Review Received: design (artifact) — 2026-04-17

**Review artifact:** `reviews/archived/artifact-design-review-2026-04-17.md`

**Findings:** 0 Critical, 3 Important, 2 Medium, 1 Minor.

**Dispositions — all `resolve_in_artifact` (applied directly to design.md / spec.md):**

- `I1` QS requirements gate blocks unattended runs → Component 8 + FR11 updated to auto-confirm on `OAT_NON_INTERACTIVE=1` or no TTY, matching FR9 contract.
- `I2` QS gate iterative loop → Component 8 rewritten as single-turn; material redirect routes to lightweight design or discovery.
- `I3` In-skill attribution in Component 3.5 prose → attribution line removed; provenance remains only in `NOTICES.md` per FR14.
- `M1` QS self-review inconsistency → stale "Scaled-down self-review" bullet at former design.md:734 deleted; spec's full 4-check requirement is canonical.
- `M2` HiLL gate says "written and committed" before commit → Component 7 reordered to commit artifacts BEFORE the user-review prompt, matching Superpowers exactly. Revise-after-review creates a second commit.
- `m1` YAGNI insertion point → new Component 3.75 added with the exact guardrail text to insert into `oat-project-design/SKILL.md`.

**Status:** passed.

### Review Received: plan (artifact) — 2026-04-17

**Review artifact:** `reviews/archived/artifact-plan-review-2026-04-17.md`

**Findings:** 2 Critical, 2 Important, 1 Medium, 0 Minor.

**Dispositions:**

- `C1` Plan body is still template content → `rejected_with_rationale`. Plan authoring is the next explicit step of this project, to be done in the next session. Findings will be addressed naturally when the plan is authored from design's Phase 1-4 — not retrofitted onto the scaffold now.
- `C2` Plan doesn't translate design's implementation phases → `rejected_with_rationale`. Same rationale as C1; resolved by plan authoring.
- `I1` (plan review) Plan task verification missing FR/NFR checks → `rejected_with_rationale`. Same rationale; real verification steps will be encoded when plan tasks are authored, using design.md §Testing Strategy Requirement-to-Test Mapping as the source.
- `I2` (plan review) Spec/design inconsistency unresolved → `resolve_in_artifact`. Same underlying fix as design review `M1` (scaled-down bullet deleted at former design.md:734). Implementer has unambiguous source of truth: spec.md FR12 specifies full 4-check self-review.
- `M1` (plan review) Reviews table missing plan row → already resolved prior to this receive pass (row added alongside review generation).

**Status:** passed (rejected-with-rationale items tracked here; no fix tasks added to plan.md).

**Note for plan authoring (next session):** When plan.md is authored, explicitly address C1/C2/I1 by deriving all phases from design.md §Implementation Phases (1-4) and encoding per-task verification against design.md §Testing Strategy §Requirement-to-Test Mapping.

### Review Received: staleness (artifact) — 2026-04-23

**Review artifact:** `reviews/staleness-review-2026-04-23.md`

**Trigger:** rebase onto `origin/main` after PR #58 (`feat(oat): evolve oat-project-implement to phase-subagent model`).

**Dispositions — all `resolve_in_artifact`:**

- `S1` plan/state still routed to removed `oat-project-subagent-implement` → plan.md + state.md updated to name `oat-project-implement` only.
- `S2` plan lacked `oat_plan_parallel_groups` contract → frontmatter gained `[['p01', 'p02']]` (proposed pending user confirmation) and a `## Parallelism` section documenting the decision.
- Secondary rebase cleanups — removed legacy `oat_execution_mode: single-thread` from state.md; refreshed quick-start source version (v1.3.3 → v1.3.6) to match rebased skill.

**Status:** passed.

### Post-Staleness Session Fixes — 2026-04-23

Follow-up corrections applied mid-session (not a separate review artifact):

- **Mode override precedence** (design.md + plan.md, 4 pseudocode blocks): `DESIGN_MODE="${OAT_DESIGN_MODE:-${ARG_MODE:-}}"` → `DESIGN_MODE="${ARG_MODE:-${OAT_DESIGN_MODE:-}}"` so an explicit `--mode` argument takes precedence over the env var (matches the design decision).
- **Explicit `OAT_NON_INTERACTIVE=1` check** (same 4 blocks): added `[ "${OAT_NON_INTERACTIVE:-}" = "1" ] || [ ! -t 0 ]` guard before prompting, so the canonical unattended-mode signal forces draft regardless of TTY detection (matches FR9 contract in spec.md).
- **FR11 alignment** (design.md Step 2.6 prose, error-handling table, and test-mapping row): minor addition path now "appends and proceeds" with no re-present; contradiction case treated as material redirect (FR11 outcome 3) and routed out of the gate.
- **Mode-choice prompt language** (design.md + plan.md prompt text): "options at decision points" → "one approach confirmation before drafting" to match the post-review decision that there is no scripted per-section options step.
- **Coordinated version bump** (plan.md p01-t09, p02-t05, p02-t06 Step 3, p02-t07 Step 3): touched skills bumped to **2.0.0 (major)** in lockstep instead of minor bumps — aligns `oat-project-design`, `oat-project-quick-start`, `oat-project-spec`, and `oat-project-discover` on a consistent major version that signals the behavioral change.

### Scope Expansion — 2026-04-23 (FR15 / Component 14 / p02-t10)

Mid-session design discussion surfaced that `OAT_NON_INTERACTIVE` was conflating two independent axes: (a) runtime context signal — "no human is here" (forces draft + auto-confirms gates + skips clarifying questions), and (b) persisted preference — "I always prefer draft mode" (only governs mode selection, keeps other prompts active).

Added a new **FR15** to spec.md: persisted `workflow.designMode: "collaborative" | "draft"` config key in `.oat/config.json` / `~/.oat/config.json`. New **Component 14** in design.md covers the CLI schema extension (mirrors `hillCheckpointDefault` shape). New **task p02-t10** in plan.md implements it.

Resolution order in both mode-choice pseudocode blocks (Component 1 Step 1.5 and Component 9 Step 2.75a) is now: (1) `--mode` argument → (2) `OAT_DESIGN_MODE` env var → (3) `OAT_NON_INTERACTIVE=1` or no TTY → (4) `workflow.designMode` config → (5) default `collaborative`. Runtime/context signals always outrank persisted preferences.

`OAT_NON_INTERACTIVE` prose updated in design.md §Environment Variables to reframe it as "canonical unattended-mode signal" covering all gates, with an explicit pointer to `workflow.designMode` for users who just want a persisted mode preference.

Plan totals: 31 → 32 tasks. Parallelism unchanged (p02's new task stays within p02's disjoint write-set vs p01). Parallel group `[['p01', 'p02']]` and HiLL phases `['p04']` both confirmed by user in the same session.

### Review Received: p01-p03 (code range) — 2026-04-24

**Review artifact:** `reviews/archived/p01-p03-review-2026-04-24.md`

**Findings:** 0 Critical, 2 Important, 0 Medium, 1 Minor.

**Finding disposition:**

- `I1` Quick-start Step 2.6 placement bypasses FR11 gate → `convert_to_task` → **p03-t03**.
- `I2` Quick-start promotion routes to `oat-project-spec` (FR10 violation) → `convert_to_task` → **p03-t04**.
- `m1` Discover Step 14 commit template says "specification phase" → `convert_to_task` → **p03-t05** (scope Negligible; related to I2).

**New tasks added:** p03-t03, p03-t04, p03-t05.

**Note:** The range review upgraded `I1` from Medium (p02 individual review) to Important — correctly, since FR11 gate placement is binding. `I2` (FR10 routing) was not caught by the p02 individual review but was surfaced by the integration-level range read.

**Review cycle:** 2 of 3 for the p01-p03 range (prior cycles: p01, p02, p03 individual reviews).

**Fix execution (2026-04-24):**

- p03-t03 `(review)` commit `ec0cd9aa` — Step 2.6 relocated between Step 2.5 and Step 2.75 (FR11).
- p03-t04 `(review)` commit `035b2029` — Quick-start promotion → `oat-project-design` (FR10).
- p03-t05 `(review)` commit `4b4a6ce8` — Discover Step 14 footer → "Ready for design phase".

**Re-review (scoped to fix tasks only, 2026-04-24):**

- Artifact: `reviews/archived/p01-p03-rereview-2026-04-24.md`.
- Verdict: **pass** (0 critical, 0 important, 0 minor). All prior findings closed; no regressions, no new findings.

**Next:** Proceed to p04 (dogfood + regressions + PR). HiLL checkpoint auto-review fires after p04 completes — scope will be `final` (covers p04 only; p01-p03 range is already `passed`).

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase                                            | Status    | Tasks | Completed |
| ------------------------------------------------ | --------- | ----- | --------- |
| Phase 1 (p01): oat-project-design rework         | completed | 9     | 9/9       |
| Phase 2 (p02): Companion skills + AGENTS + CLI   | completed | 10    | 10/10     |
| Phase 3 (p03): Lockstep version + 3 review fixes | completed | 5     | 5/5       |
| Phase 4 (p04): Dogfood + regressions + PR        | pending   | 11    | 0/11      |

**Total:** 24/35 tasks completed

---

## Phase 1 (p01): oat-project-design rework

**Status:** completed
**Started:** 2026-04-23
**Completed:** 2026-04-23
**Branch:** `collaborative-design-workflow/p01` → merged via `e996cd5e`
**Commits:** `fc04baa1..7cbfd319` (9 task commits)

### Phase Summary

**Outcome (what changed):**

- `oat-project-design` SKILL transformed from deterministic writer into the collaborative-default skill: Step 1.5 mode-choice preamble, Step 2 requirements confirmation (substeps 2a–2l), Step 2.5 approach reaffirmation, YAGNI principle, Step 4 collaborative + draft branches, Step 5 self-review (4 named checks), Step 6 commit-first user-review gate.
- Version bumped 1.2.0 → 2.0.0 (coordinated major across all touched skills).
- FR1, FR2, FR3, FR4, FR5, FR6, FR8 behaviors observable in prose.
- FR14 (no in-skill Superpowers attribution) preserved — grep returns zero.
- Mode-choice resolution order: `--mode` arg → `OAT_DESIGN_MODE` env → `OAT_NON_INTERACTIVE=1` / no TTY → `workflow.designMode` config → default collaborative.

**Key files touched:**

- `.agents/skills/oat-project-design/SKILL.md` — entire rework (+345/-216, 590/700 lines final)

**Verification:**

- Per-task: `oxfmt --check`, grep consistency checks.
- Phase-end: line count 590/700 (NFR5), step numbering continuous, no orphaned "See Step N" refs.
- Review (code scope p01): passed (0 critical, 0 important, 2 minor).

**Notes / Decisions:**

- YAGNI placement deviated slightly from plan suggestion (new `## Principles` section instead of co-locating with a non-existent "ALLOWED Activities" block). Review classified as Minor — plan explicitly permitted a Principles subsection.

### Task Outcomes

| Task    | Status    | Commit   | Verification | Notes                                                               |
| ------- | --------- | -------- | ------------ | ------------------------------------------------------------------- |
| p01-t01 | completed | fc04baa1 | fmt pass     | Step 1.5 mode-choice preamble (Component 1)                         |
| p01-t02 | completed | 8cc6123b | fmt pass     | Step 2 requirements confirmation, 2a–2l substeps (Component 3)      |
| p01-t03 | completed | f401cfad | fmt pass     | Step 2.5 approach reaffirmation (Component 3.5)                     |
| p01-t04 | completed | f6be947f | fmt pass     | YAGNI bullet in new Principles section (Component 3.75)             |
| p01-t05 | completed | 01c3b3fb | fmt pass     | Step 4 collaborative branch (Component 4)                           |
| p01-t06 | completed | c52b23d2 | fmt pass     | Step 4 draft-and-review branch                                      |
| p01-t07 | completed | 8c3cd66c | fmt pass     | Step 5 design self-review, 4 named checks (Component 6)             |
| p01-t08 | completed | 2fa56d3b | fmt pass     | Step 6 commit-first user-review gate (Component 7); M1 ordering fix |
| p01-t09 | completed | 7cbfd319 | fmt+lint     | Version 1.2.0 → 2.0.0, line count 590/700                           |

---

## Phase 2 (p02): Companion skill edits + AGENTS + NOTICES

**Status:** completed
**Started:** 2026-04-23
**Completed:** 2026-04-23
**Branch:** `collaborative-design-workflow/p02` → merged via `a6eba84d`
**Commits:** `785cbd46..b9e97c02` (10 task commits)

### Phase Summary

**Outcome (what changed):**

- `oat-project-quick-start`: Step 2.6 requirements gate (single-turn with non-interactive fallback, Component 8 / FR11), Step 2.75a lightweight design mode choice (Component 9 / FR12), Step 2.75 Superpowers-borrowed collaborative prose, draft-and-review branch for lightweight design (FR8 variant). Version 1.3.6 → 2.0.0.
- `oat-project-spec` repositioned as standalone utility (Component 10 / FR10). Version 1.2.0 → 2.0.0.
- `oat-project-discover` routing updated to route design from Step 11/12/15 (Component 11 / FR13). Minor version bump.
- `.oat/templates/discovery.md` updated to match new routing.
- `AGENTS.md`: workflow triage Step 1 reframed, External Attributions subsection pointing to NOTICES.md (Component 12).
- `NOTICES.md` created at repo root consolidating Superpowers/Obra attribution (Component 13 / FR14).
- `OatWorkflowConfig.designMode` schema extension: zod validation, local > shared > user > default precedence, CLI describe/get/set surface, source resolution through `resolveEffectiveConfig` (Component 14 / FR15). 7 new designMode unit tests.

**Key files touched:**

- `.agents/skills/oat-project-quick-start/SKILL.md` (prompt edits, +102 lines, 482/481 soft cap)
- `.agents/skills/oat-project-spec/SKILL.md` (description + closing-output rewrite)
- `.agents/skills/oat-project-discover/SKILL.md` (routing)
- `.oat/templates/discovery.md` (routing template)
- `AGENTS.md` (workflow triage + External Attributions)
- `NOTICES.md` (new, repo root)
- `packages/cli/src/config/oat-config.ts` + `.test.ts` (designMode schema + 7 tests)
- `packages/cli/src/config/resolve.ts` + `.test.ts` (DEFAULT_WORKFLOW_CONFIG + merge-precedence tests)
- `packages/cli/src/commands/config/index.ts` + `.test.ts` (describe/catalog surface)
- `packages/cli/src/commands/project/new/scaffold.test.ts` (regex dotall update for multi-line bullet)
- `packages/cli/src/validation/skills.test.ts` (version assertion)

**Verification:**

- Per-task: `oxfmt --check`, grep consistency checks, test runs where code was involved.
- p02-t10 tests: 1366/1366 CLI tests pass; type-check + lint clean.
- Review (code scope p02): passed (0 critical, 0 important, 1 medium, 2 minor).

**Notes / Decisions:**

- Medium finding: Step 2.6 placement in quick-start is after Step 2.75 rather than between Step 2.5 and Step 3 (as plan specified). Non-blocking; will be addressed in p04 dogfood or as a post-merge fixup if needed.
- Minor: `oat-project-discover` Step 14 commit template still reads "Ready for specification phase" (residual of old spec-routing). Low-risk fixup.
- Minor: quick-start line count 482 (i.e., +102 over the 381 baseline); plan's soft cap was +100. Still "~100" per spec NFR5 approximation.

### Task Outcomes

| Task    | Status    | Commit   | Verification | Notes                                                                                    |
| ------- | --------- | -------- | ------------ | ---------------------------------------------------------------------------------------- |
| p02-t01 | completed | 785cbd46 | fmt pass     | Step 2.6 requirements gate (Component 8 / FR11)                                          |
| p02-t02 | completed | a36ace72 | fmt pass     | Step 2.75a lightweight design mode choice (Component 9 / FR12)                           |
| p02-t03 | completed | c35587bf | fmt pass     | Step 2.75 Superpowers-borrowed collaborative prose                                       |
| p02-t04 | completed | fd3e322a | fmt pass     | Draft-and-review branch for lightweight design (no spec.md)                              |
| p02-t05 | completed | b174cbd9 | fmt pass     | Quick-start version 1.3.6 → 2.0.0                                                        |
| p02-t06 | completed | c34b199b | fmt pass     | `oat-project-spec` standalone repositioning (Component 10 / FR10); version 1.2.0→2.0.0   |
| p02-t07 | completed | 6968b96c | fmt pass     | `oat-project-discover` Step 11/12/15 routing updates (Component 11 / FR13)               |
| p02-t08 | completed | c571fa47 | fmt pass     | `AGENTS.md` workflow triage + External Attributions                                      |
| p02-t09 | completed | 94cb5186 | fmt pass     | `NOTICES.md` created at repo root (FR14)                                                 |
| p02-t10 | completed | b9e97c02 | 1366/1366    | `workflow.designMode` schema + CLI surface (Component 14 / FR15); full test suite passed |

---

## Phase 3 (p03): Lockstep version bumps + release validation (+ p01-p03 review fixes)

**Status:** completed (2 base tasks + 3 review fixes, all merged; p01-p03 re-review passed)
**Started:** 2026-04-23
**Completed:** 2026-04-24
**Base tasks:** 2/2 (p03-t01, p03-t02) complete
**Review fixes:** 3/3 (p03-t03, p03-t04, p03-t05) complete
**Commits:** `965114ce..ee0024cf` (base, 2 commits) + `ec0cd9aa..4b4a6ce8` (review fixes, 3 commits)
**Re-review verdict:** pass (0 critical, 0 important, 0 minor). Artifact: `reviews/archived/p01-p03-rereview-2026-04-24.md`

### Phase Summary

**Outcome (what changed):**

- All 5 public packages bumped 0.0.50 → 0.0.51 in lockstep: `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`.
- `pnpm release:validate` passes (all 5 tarballs validated).
- Bundled `packages/cli/assets/public-package-versions.json` regenerated to 0.0.51.

**Key files touched:**

- `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (version bumps)
- `packages/cli/assets/public-package-versions.json` (regenerated)
- `pnpm-lock.yaml` unchanged (workspace:\* pins, no drift)

**Verification:**

- `pnpm release:validate` exits 0; all 5 tarballs validated.
- Review (code scope p03): passed (0 critical, 0 important, 3 minor informational).

**Notes / Decisions:**

- Manifest regen landed in p03-t02 rather than being bundled with p03-t01; explicitly authorized by plan p03-t02 Step 2 ("amend ... and commit as a new task").
- Pre-existing working-tree drift on `.oat/config.json` (tools block) is unrelated to this implementation run; correctly left untouched.

### Task Outcomes

| Task    | Status    | Commit   | Verification       | Notes                                                                            |
| ------- | --------- | -------- | ------------------ | -------------------------------------------------------------------------------- |
| p03-t01 | completed | 965114ce | lockfile stable    | 5 public packages bumped 0.0.50 → 0.0.51; pnpm-lock unchanged (workspace:\*)     |
| p03-t02 | completed | ee0024cf | release:validate 0 | Manifest regenerated; full release validation passed                             |
| p03-t03 | completed | ec0cd9aa | lint+fmt pass      | (review) Moved quick-start Step 2.6 between Step 2.5 and Step 2.75 (FR11 / `I1`) |
| p03-t04 | completed | 035b2029 | lint+fmt pass      | (review) Quick-start promotion routes to `oat-project-design` (FR10 / `I2`)      |
| p03-t05 | completed | 4b4a6ce8 | fmt pass           | (review) Discover Step 14 commit footer says "design phase" (`m1`)               |

---

## Phase 4 (p04): Dogfood + regressions + PR

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

_Phase implementer appends per-task entries here during execution._

---

## Orchestration Runs

> This section is used by `oat-project-implement` to log execution runs (including parallel groups).
> Each run appends a new subsection — never overwrite prior entries.

<!-- orchestration-runs-start -->

### Run 1 — 2026-04-23

**Branch:** collaborative-design
**Tier:** 1 (subagents)
**Policy:** merge-strategy=merge, retry-limit=2
**Phases executed:** 3 executed (p01, p02, p03 incl. 3 review-fix tasks after p01-p03 range re-review), 3 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase   | Implementer            | Review               | Fix Iterations                                            | Disposition |
| ------- | ---------------------- | -------------------- | --------------------------------------------------------- | ----------- |
| p01     | DONE                   | pass                 | 0/2                                                       | merged      |
| p02     | DONE_WITH_CONCERNS (3) | pass                 | 0/2                                                       | merged      |
| p03     | DONE_WITH_CONCERNS (3) | pass                 | 0/2                                                       | inline      |
| p01-p03 | range review (manual)  | fixes_added → passed | fix tasks: 3 added (p03-t03..t05), re-reviewed and passed | inline      |

#### Parallel Groups

- Group 1 [p01, p02]: worktree-based, merged in plan order (p01 first: `e996cd5e`; p02: `a6eba84d`).
- p03: sequential, inline on orchestration branch.

#### Outstanding Items

- ~~Medium (p02 review): Step 2.6 placement in `oat-project-quick-start`.~~ **Resolved** in p03-t03 (upgraded to Important `I1` by p01-p03 range review, then closed by re-review 2026-04-24).
- ~~Minor (p02 review): `oat-project-discover` Step 14 commit template residual.~~ **Resolved** in p03-t05 (`m1` in range review, closed by re-review).
- Minor (p02 review): `oat-project-quick-start` line-count delta is 102 (not 101); still within spec NFR5 "~100" approximation. Unchanged post-fixes.
- Minor (p01 review): 2 polish notes recorded in review artifact. No action needed.
- Minor (p03 review): 3 informational notes (manifest split rationale, lockfile stability, no gitignore conflict). No action needed.
- **New (range review `I2`)**: Quick-start promotion routed to `oat-project-spec` (FR10 violation). **Resolved** in p03-t04, closed by re-review.

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-04-15

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-04-15

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
