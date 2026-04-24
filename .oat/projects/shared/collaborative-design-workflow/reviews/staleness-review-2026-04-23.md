---
review_type: staleness
review_scope: spec-design-plan
status: addressed
date: 2026-04-23
trigger: rebase-after-pr-58
---

# Staleness Review: collaborative-design-workflow

## Context

This review was run after rebasing `collaborative-design` onto `origin/main` following PR #58, `feat(oat): evolve oat-project-implement to phase-subagent model`.

PR #58 materially changed the implementation contract:

- `oat-project-subagent-implement` was removed/deprecated.
- `oat-project-implement` v2 is now the single implementation entry point.
- Parallel execution is declared through `oat_plan_parallel_groups` in `plan.md`.
- `oat project validate-plan` validates parallelism metadata.
- `oat_execution_mode` was removed from the state template and is now legacy-only.

## Findings

### S1: Plan and state still routed parallel work to the removed subagent skill

**Severity:** Critical

`plan.md` and `state.md` both told the next operator to choose between `oat-project-implement` and `oat-project-subagent-implement`. That is stale after PR #58 because there is no second implementation skill to invoke.

**Disposition:** Fixed. `plan.md` now names only `oat-project-implement`; `state.md` does the same.

### S2: Plan lacked the current parallelism metadata contract

**Severity:** Important

The rebased `.oat/templates/plan.md` includes `oat_plan_parallel_groups`, and `oat-project-plan` now performs a real parallelism pass. This project plan predated that field, so implementation would have defaulted to fully sequential even though p01 and p02 have disjoint write sets.

**Disposition:** Fixed. Added `oat_plan_parallel_groups: [['p01', 'p02']]` and a `## Parallelism` section explaining why p01+p02 can run concurrently while p03+p04 remain sequential.

### S3: Project state carried deprecated `oat_execution_mode`

**Severity:** Important

`state.md` still had `oat_execution_mode: single-thread`. PR #58 removed this field from the state template and `oat-project-implement` now treats only legacy `subagent-driven` values as migration input.

**Disposition:** Fixed. Removed the field from project `state.md`.

### S4: Spec/design still contained older per-section heuristic language

**Severity:** Medium

The accepted spec/design had already moved to a single approach-level divergent-thinking moment, but a few later sections still described a "real decision point" heuristic or optional per-section divergent branch. That contradiction is not from PR #58, but the re-analysis pass surfaced it.

**Disposition:** Fixed. Reworded the affected spec/design passages to consistently describe Approach Reaffirmation as the only scripted divergent-thinking step.

### S5: Current skill version references were stale

**Severity:** Low

References to `oat-project-quick-start` still said current v1.3.3. After rebase, the current file is v1.3.6.

**Disposition:** Fixed. Updated spec/design references to v1.3.6.

## Follow-up Update

After the initial staleness review, `.oat/repo/reference/current-state.md` was updated to replace the stale "Subagent Orchestration" section with the PR #58 phase-subagent implementation model.

## Residual Risks

- The plan now declares p01+p02 parallelism from file-boundary analysis. If implementation later expands either phase to touch the other's files, update `oat_plan_parallel_groups` before running `oat-project-implement`.
