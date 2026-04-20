---
title: Implementation Execution
description: 'Phase-subagent dispatch, tier detection, bounded fix loop, plan-declared parallelism, and dry-run mode in oat-project-implement v2.0.'
---

# Implementation Execution

This page covers how `oat-project-implement` actually runs a plan: tier selection, phase-level subagent dispatch, the review + fix loop, plan-declared parallelism with worktree fan-in, and dry-run.

## Quick Look

- **When to use:** you have a plan ready and want to understand what happens during `oat-project-implement`.
- **Unit of dispatch:** one phase at a time (not one task). A phase implementer executes all tasks in the phase, commits per task, and returns a single summary.
- **Two tiers, one lock:** capability detection picks Tier 1 (native subagents) or Tier 2 (inline) at start. The tier is locked for the whole run — no mid-run downgrades.

## Execution model

### Tier selection

At skill start, `oat-project-implement` detects whether the host supports native subagent dispatch for `oat-phase-implementer` and `oat-reviewer`.

- **Claude Code / Cursor:** native subagent dispatch → Tier 1.
- **Codex multi-agent:** Tier 1 if `spawn_agent` is allowed without authorization, or after an explicit single prompt at skill start if authorization is required. Codex subagent dispatch should use self-contained scope packets with fresh context; do not assume pinned OAT roles can also inherit the full parent thread.
- **Authorization declined or agents do not resolve:** Tier 2 (inline). The orchestrator reads `.agents/agents/oat-phase-implementer.md` and `.agents/agents/oat-reviewer.md` as reference and executes that process itself.

The selected tier is reported to the user and locked for the remainder of the run:

```
[0/N] Checking subagent availability…
  → oat-phase-implementer + oat-reviewer: available
  → Selected: Tier 1 — Subagents
```

### Per-phase loop

For each phase in the plan (whether sequential or inside a parallel group):

1. **Dispatch `oat-phase-implementer`** with a Phase Scope block (project path, phase id, artifact paths, commit convention, workflow mode).
2. **Receive the summary:** `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`.
   - `BLOCKED` stops the run and surfaces the blocker to the user.
3. **Dispatch `oat-reviewer`** with a Review Scope block (phase id, commit range, files changed). In Codex, pass this as a self-contained packet and keep fresh context (`fork_context: false`) so the reviewer reads git/OAT artifacts directly instead of inheriting the orchestration thread.
4. **Parse the verdict:** zero Critical + zero Important findings → `pass`; otherwise `fail`.
5. **On fail, run the bounded fix loop** (see below).
6. **Update artifacts** (`implementation.md`, `plan.md` review row, `state.md`) and make the mandatory bookkeeping commit.
7. **HiLL checkpoint** if the phase id is listed in `oat_plan_hill_phases`.

### Bounded fix loop

On a `fail` verdict:

- Read `oat_orchestration_retry_limit` from `state.md` frontmatter (default `2`, range `0–5`).
- For each retry: re-dispatch the implementer in `fix` mode with the review artifact and findings, then re-dispatch the reviewer.
- On `pass` → exit the loop; the phase disposition becomes `merged` (sequential) or `merged` (parallel, after fan-in).
- On retries exhausted:
  - **Sequential mode:** STOP the run with phase id, unresolved findings, and review artifact path.
  - **Parallel group mode:** mark the phase `excluded`, do not merge its worktree, continue the remaining phases in the group, and report it in Outstanding Items.

Tier is never silently downgraded. If a Tier 1 dispatch has a transient failure, the orchestrator retries exactly once; a second failure is treated the same as fix-loop exhaustion for that phase.

## Plan-declared parallelism

Phases whose task file sets do not overlap may execute concurrently. Declare this in `plan.md` frontmatter:

```yaml
oat_plan_parallel_groups: [['p02', 'p03'], ['p04', 'p05']]
```

- Each inner array is a group of phases that run concurrently — one worktree per phase.
- Phases not listed in any group run sequentially in plan order.
- Groups themselves run sequentially — group `[p02, p03]` merges before group `[p04, p05]` starts.
- Empty or missing field → fully sequential, no worktrees created, behavior identical to today's `oat-project-implement`.

### How a parallel group runs

1. **Bootstrap worktrees** via `oat-worktree-bootstrap-auto`, one per phase, branch name `{project-name}/{pNN}`.
   - If any bootstrap fails, cancel successful worktrees and **degrade the entire group** to sequential inline execution.
2. **Concurrent dispatch** of `oat-phase-implementer` into each worktree (Tier 1 only — Tier 2 cannot run concurrently and also degrades to sequential).
3. **Wait for terminal verdicts** (`pass` or `failed`) across every phase in the group.
4. **Fan-in reconciliation in plan order:** for each passing phase, `git merge --no-ff {project-name}/{pNN}`. Integration verification (`pnpm test && pnpm lint && pnpm type-check`) runs after each merge.
5. **Failed phases are excluded** — their worktrees are preserved and logged in `implementation.md` Outstanding Items. Passing phases still merge (partial merge-back, not atomic).
6. **Worktree cleanup** runs for merged phases; preserved for excluded phases.
7. **Bookkeeping commit** + HiLL checkpoint check after the group finishes.

### Merge-conflict handling

When a merge produces a conflict:

1. `git merge --no-ff` is aborted.
2. `git cherry-pick` of the phase's commits is attempted.
3. If cherry-pick also conflicts, an **inline conflict-resolution subagent** is dispatched via the Task tool. The orchestrator **never reads conflicted files itself** — that context belongs in a fresh subagent.
4. The subagent reads conflicted files and project artifacts (`plan.md`, `design.md`, `spec.md`), applies a resolution, runs integration verification, and returns:
   - `RESOLVED` → merge is committed; orchestrator proceeds.
   - `UNRESOLVABLE` or `VERIFICATION_FAILED` → STOP the run with phase id, conflicting files, worktree path, and the subagent's reasoning summary.

The orchestrator does not proceed past a broken merge.

## Validating plan metadata

Before dispatching, `oat-project-implement` invokes the validator CLI:

```bash
oat project validate-plan --project-path "${PROJECT_PATH}"
```

The command enforces:

- `oat_plan_parallel_groups` is either missing/empty (treated as fully sequential) or a non-empty nested array of phase ID strings.
- Every referenced phase id exists in the plan body.
- No phase id appears in more than one group.
- No singleton groups (each group must contain at least 2 phases).
- Frontmatter YAML parses cleanly — malformed frontmatter fails with exit 1.

Non-zero exit stops the run. The skill does not re-implement validation in prose — the CLI is the single source of truth.

## Dry-run mode

Run with `--dry-run` to preview a run without dispatching anything:

```bash
oat-project-implement --dry-run
```

Dry-run:

- Performs tier selection and plan validation.
- Builds the execution schedule (singleton phases + parallel groups in plan order).
- Prints the planned dispatches and worktree layout.
- Exits 0 without dispatching subagents, creating worktrees, or modifying files.

Use dry-run as a sanity check after editing `oat_plan_parallel_groups` to confirm the schedule matches your intent.

## Resumption

On re-invocation after a partial run:

1. Read `implementation.md` for the most recent orchestration-runs entry.
2. Compare phase counts against the plan's phase list; phases not covered by any run are the resume targets.
3. Read `state.md` for `oat_current_task` and cross-check with git log.
4. If a phase committed implementer output but has no review verdict recorded, the reviewer is re-dispatched for that phase's current HEAD.
5. If un-cleaned worktrees remain from a prior parallel group, the orchestrator lists them and asks whether to resume or clean up.

First-ever invocations skip resumption detection.

## State and artifact updates

After each phase (or parallel group) completes, `oat-project-implement` updates:

- `implementation.md` — appends a `### Run N` entry between the `<!-- orchestration-runs-start -->` markers with tier, policy, phase outcomes, parallel groups, and outstanding items.
- `plan.md` — updates the reviews table lifecycle (`pending` → `passed` or `fixes_added` → `fixes_completed` → `passed`).
- `state.md` — updates `oat_current_task`, `oat_last_commit`, `oat_project_state_updated`, and persists `oat_orchestration_retry_limit` if the user overrode the default.

Legacy `oat_execution_mode: subagent-driven` in existing projects is silently ignored and removed on the next bookkeeping write.

## Related

- [Lifecycle](lifecycle.md) — where implementation sits in the full project flow.
- [Artifacts](artifacts.md) — `plan.md` frontmatter contract, including `oat_plan_parallel_groups`.
- [HiLL Checkpoints](hill-checkpoints.md) — orthogonal pause semantics; fires after a phase or group completes and merges.
- [CLI Reference](../../reference/cli-reference.md) — `oat project validate-plan` and other commands.
