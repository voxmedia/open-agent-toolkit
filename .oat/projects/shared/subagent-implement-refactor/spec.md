---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-17
oat_generated: true
---

# Specification: Phase-Subagent Evolution of oat-project-implement

## Goal

Evolve `oat-project-implement` so that each plan phase executes inside a fresh subagent, offloading implementation context from the main orchestrator. Absorb the capabilities of `oat-project-subagent-implement` into the same skill, with parallelism expressed as plan metadata rather than as a separate skill. Deprecate and remove `oat-project-subagent-implement`.

## Motivation

Two observed pains drive this change:

1. **Context pressure on large plans.** The current `oat-project-implement` runs everything in the main orchestrator's context — file reads, writes, task-by-task work, state updates. On large plans the model self-flags context pressure (observed around 20% of a 1M window on recent projects) and stops early.
2. **Merge-conflict overhead in `oat-project-subagent-implement`.** The existing subagent-driven skill fans out a worktree per task, forcing each subagent to re-read plan/design/spec context and generating frequent merge conflicts at fan-in. Users have reported this as the primary friction, not the dispatch model itself.

Both pains share a root cause: the unit of work is either too coarse (everything in main orchestrator) or too fine (one worktree per task). The phase is the right intermediate granularity.

## Functional Requirements

**FR1: Capability Detection and Tier Selection**

- **Description:** At skill start, detect whether native subagent dispatch is available and select a tier for the entire run.
- **Acceptance Criteria:**
  - Tier 1 selected when subagents are available without authorization.
  - Tier 1 selected after single user approval prompt on Codex `authorization required`.
  - Tier 2 selected when dispatch declines or is unavailable.
  - Tier is locked for the remainder of the run; no mid-run re-evaluation or downgrade.
  - Tier selection is reported to the user before phase execution begins.
- **Priority:** P0

**FR2: Phase-Level Subagent Dispatch**

- **Description:** For each plan phase, dispatch `oat-phase-implementer` as a subagent (Tier 1) or execute it inline by reading the agent file as reference (Tier 2).
- **Acceptance Criteria:**
  - Main orchestrator accumulates only phase-level summaries, not per-file or per-task content.
  - Implementer returns structured status: `DONE` | `DONE_WITH_CONCERNS` | `NEEDS_CONTEXT` | `BLOCKED`.
  - `DONE_WITH_CONCERNS` with correctness concerns triggers a fix dispatch before review; advisory concerns are noted and proceed.
  - `NEEDS_CONTEXT` re-dispatches with missing context provided; counts toward retry limit.
  - `BLOCKED` stops the run and surfaces to user.
  - Transient dispatch failure retries once; second failure treats phase as failed.
- **Priority:** P0

**FR3: Bounded Fix Loop**

- **Description:** When the reviewer returns `fail`, run a bounded retry loop that re-dispatches the implementer in fix mode and re-reviews.
- **Acceptance Criteria:**
  - Default retry limit is 2 (range 0–5); configurable via `--retry-limit <N>` and persisted to `state.md` as `oat_orchestration_retry_limit`.
  - Each retry dispatches implementer with review artifact + findings + prior summary.
  - Loop exits on `pass` verdict or retry exhaustion.
  - Sequential mode: retry exhaustion stops the run and surfaces to user.
  - Parallel mode: retry exhaustion marks phase `excluded`; group continues.
- **Priority:** P0

**FR4: Plan-Declared Parallelism**

- **Description:** When the plan frontmatter declares `oat_plan_parallel_groups`, the skill executes those phase groups concurrently using one worktree per phase, then merges back in plan order.
- **Acceptance Criteria:**
  - Empty or missing `oat_plan_parallel_groups` runs fully sequential (identical to previous behavior).
  - Plans with groups create worktrees, dispatch phases concurrently (Tier 1 only), and merge back in plan order.
  - Tier 2 degrades parallel groups to sequential inline execution — no worktrees.
  - Worktree bootstrap failure for any phase in a group degrades the entire group to sequential inline.
  - Passing phases merge even when sibling phases in the group were excluded.
- **Priority:** P1

**FR5: Merge-Conflict Handling**

- **Description:** When fan-in merges produce conflicts, the skill escalates through resolution strategies and stops if unresolvable.
- **Acceptance Criteria:**
  - Primary: `git merge --no-ff`; on conflict, abort and attempt cherry-pick.
  - Cherry-pick conflict: dispatch inline conflict-resolution subagent via Task tool; orchestrator does not read conflicted files directly.
  - Subagent returns `RESOLVED` | `UNRESOLVABLE` | `VERIFICATION_FAILED`.
  - On `UNRESOLVABLE` or `VERIFICATION_FAILED`: stop run, surface with phase ID, files, worktree path, reasoning.
  - Never proceed past a broken merge.
- **Priority:** P1

**FR6: Artifact Updates**

- **Description:** After each phase (or parallel group), the skill updates `implementation.md`, `state.md`, and `plan.md` and commits a mandatory bookkeeping commit.
- **Acceptance Criteria:**
  - `implementation.md` gets a new phase-outcome row appended to the orchestration-runs block.
  - `state.md` `oat_current_task` and `oat_project_state_updated` are kept current.
  - `plan.md` review table rows updated per phase (pass / fail / excluded).
  - Bookkeeping commit format: `chore(oat): bookkeeping after pNN {pass|fail}`.
  - HiLL checkpoint fires after the phase/group completes and bookkeeping commits.
- **Priority:** P0

**FR7: Resumption**

- **Description:** On re-invocation after an interruption, the skill detects the prior state and resumes from the next incomplete phase.
- **Acceptance Criteria:**
  - Reads implementation.md orchestration-run entries and cross-checks against state.md and git log.
  - Detects in-flight phases (implementer committed but review not run) and re-dispatches reviewer.
  - Detects un-cleaned worktrees from a prior parallel group and prompts user: resume or clean up.
  - First-ever invocation (no prior run entries) skips resumption detection.
- **Priority:** P1

**FR8: Dry-Run Mode**

- **Description:** When invoked with `--dry-run`, the skill performs plan parsing and schedule building but skips all phase dispatches, commits, and artifact writes, outputting the planned execution summary instead.
- **Acceptance Criteria:**
  - Steps 0–2 (project resolution, capability detection, plan read + validation, schedule build) run fully.
  - No commits, no artifact writes, no subagent dispatches.
  - Output includes: tier selection, schedule (phases and groups in order), worktrees that would be created.
- **Priority:** P1

**FR9: Plan Metadata Validation**

- **Description:** At skill start, the CLI command `oat project validate-plan` validates `oat_plan_parallel_groups` against the plan. On failure, the skill blocks with a clear error rather than silently falling back to sequential.
- **Acceptance Criteria:**
  - Valid: missing/empty field, well-formed nested string arrays referencing only known phases with no duplicates and no singleton groups.
  - Invalid: non-array shape, unknown phase ID, phase in multiple groups, singleton group.
  - CLI exits 0 on valid, non-zero with actionable error messages on invalid.
  - Skill delegates entirely to the CLI — no validation logic in skill prose.
- **Priority:** P0

## Non-Functional Requirements

**NFR1: Backward Compatibility**

- **Description:** Plans without `oat_plan_parallel_groups`, existing `oat_plan_hill_phases` behavior, and state.md files with `oat_execution_mode: subagent-driven` all continue to work without user action.
- **Acceptance Criteria:**
  - Plans without parallelism metadata execute sequentially, identically to prior behavior.
  - Legacy `oat_execution_mode: subagent-driven` in state.md is silently ignored; field removed on next bookkeeping write.
  - `oat project set-mode` prints a deprecation notice and exits 0 without touching state.md.
- **Priority:** P0

**NFR2: Release Lockstep**

- **Description:** This change modifies bundled agents, skills, and templates, which counts as shipped CLI functionality. All five public packages must be bumped together.
- **Acceptance Criteria:**
  - `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms` all share the same bumped version.
  - `pnpm release:validate` passes before the PR is considered done.
  - Touched skill files carry a version bump.
- **Priority:** P0

**NFR3: Tier Lock Discipline**

- **Description:** The dispatch tier must remain consistent across all phase dispatches in a single run.
- **Acceptance Criteria:**
  - No silent mid-run tier downgrade.
  - Both implementer and reviewer dispatches use the same tier.
  - Tier 2 parallel group degradation is logged to `implementation.md` Outstanding Items.
- **Priority:** P0

## Acceptance Criteria

_(Derived from Testing Strategy §10 of the Superpowers spec)_

1. **Plan metadata validator** — unit tests pass for: valid empty groups, valid multi-group, non-array top-level, unknown phase ID, singleton group, duplicate phase across groups, non-string phase ID. CLI exits non-zero with actionable output on all invalid cases.
2. **Tier detection** — capability check resolves Tier 1 or Tier 2 at skill start; Codex `authorization required` path gates on single user prompt.
3. **Sequential dry-run** — fixture plan with empty groups produces correct dispatch sequence in output.
4. **Parallel dry-run** — fixture plan with declared groups produces correct worktree + concurrent dispatch plan in output.
5. **Worktree bootstrap degradation** — simulated failure → group degrades to sequential inline; log entry written.
6. **Fix-loop bounded retry** — simulated review verdicts → retry limit honored; sequential stop or parallel exclude as appropriate.
7. **Merge conflict stop-behavior** — synthetic unresolvable conflict → orchestrator stops, state preserved, worktree path surfaced.
8. **Resumption** — partial run state → correct resume point detected from implementation.md + state.md + git log.
9. **Shell test** — `test-plan-validation.sh` invokes `oat project validate-plan` against fixtures; all assertions pass.
10. **No dangling references** — `grep -r "oat-project-subagent-implement"` in non-project/non-Superpowers markdown returns no results.
11. **Release validation** — `pnpm release:validate` passes.

## Out of Scope

- Task-level parallelism within a phase (rejected as overcomplicated for rare benefit).
- Nested subagents (rejected for complexity and provider-drift risk).
- Changes to `oat-reviewer` agent (unchanged).
- Changes to `oat-project-review-provide` / `oat-project-review-receive` (unchanged).
- Changes to HiLL checkpoint system (unchanged).
- Provider-specific capability detection beyond Claude Code + Codex.
- Live LLM dispatch automated tests (manual verification per release).
- Automated quality evaluation of merge-conflict resolution.

## Open Questions (resolved)

All open questions from the discovery and design phases were resolved during implementation:

- **Project scoping:** Single OAT project, single PR. Both evolution and deprecation landed together.
- **Fix-loop quality:** Empirical — first runs will reveal tuning needs. Design is conservative by default (retry limit 2).
- **Merge conflict auto-resolution aggression:** Conservative defaults — simple conflicts get attempted, complex ones stop fast.
- **Plan authoring friction:** `oat-project-plan` adds a lightweight optional step; skips if no obviously disjoint phases detected.
- **Execution tooling:** Superpowers `subagent-driven-development` used for this project to avoid self-modification of `oat-project-implement` (see discovery.md decision #10).

## Requirement Index

| ID   | Description                             | Priority | Verification                            | Implemented In      |
| ---- | --------------------------------------- | -------- | --------------------------------------- | ------------------- |
| FR1  | Capability detection and tier selection | P0       | manual: skill start log                 | p03-t01 (Task 5)    |
| FR2  | Phase-level subagent dispatch           | P0       | manual: dry-run + live                  | p03-t02 (Task 6)    |
| FR3  | Bounded fix loop                        | P0       | manual: simulated review fail           | p03-t03 (Task 7)    |
| FR4  | Plan-declared parallelism               | P1       | manual: dry-run + live                  | p03-t05 (Task 9)    |
| FR5  | Merge-conflict handling                 | P1       | manual: synthetic conflict              | p03-t05 (Task 9)    |
| FR6  | Artifact updates + bookkeeping          | P0       | manual: verify implementation.md        | p03-t06 (Task 10)   |
| FR7  | Resumption                              | P1       | manual: interrupted run                 | p03-t07 (Task 11)   |
| FR8  | Dry-run mode                            | P1       | manual: --dry-run output                | p03-t09 (Task 13)   |
| FR9  | Plan metadata validation CLI            | P0       | unit + integration: validate-plan       | p02 (Tasks 4/4a/4b) |
| NFR1 | Backward compatibility                  | P0       | unit: router test; manual: legacy state | p05 (Tasks 17a–d)   |
| NFR2 | Release lockstep (5 public packages)    | P0       | pnpm release:validate                   | p07 (Tasks 21–22)   |
| NFR3 | Tier lock discipline                    | P0       | manual: Codex authorization flow        | p03-t01 (Task 5)    |

## References

- Discovery: `discovery.md`
- Superpowers spec: `.superpowers/specs/2026-04-17-oat-project-implement-phase-subagent.md`
- Superpowers plan: `.superpowers/plans/2026-04-17-oat-project-implement-phase-subagent.md`
