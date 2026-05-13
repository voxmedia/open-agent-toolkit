---
title: Implementation Execution
description: 'Phase-subagent dispatch, tier detection, runtime dispatch selection, bounded fix loop, plan-declared parallelism, and dry-run mode in oat-project-implement v2.0.'
---

# Implementation Execution

This page covers how `oat-project-implement` actually runs a plan: tier selection, phase-level subagent dispatch, runtime dispatch selection, the review + fix loop, plan-declared parallelism with worktree fan-in, and dry-run.

## Quick Look

- **When to use:** you have a plan ready and want to understand what happens during `oat-project-implement`.
- **Unit of dispatch:** one phase at a time (not one task). A phase implementer executes all tasks in the phase, commits per task, and returns a single summary.
- **Two tiers, one lock:** capability detection picks Tier 1 (native subagents) or Tier 2 (inline) at start. The tier is locked for the whole run — no mid-run downgrades.
- **Runtime dispatch:** each phase uses the lowest available model/effort/control that can confidently complete the work, unless `plan.md` includes an explicit Dispatch Profile override.

## Execution model

### Tier selection

At skill start, `oat-project-implement` detects whether the host supports native subagent dispatch for `oat-phase-implementer` and `oat-reviewer`.

- **Claude Code / Cursor:** native subagent dispatch → Tier 1.
- **Codex multi-agent:** Tier 1 if `spawn_agent` is allowed without authorization, or after an explicit single prompt at skill start if authorization is required. Codex subagent dispatch should use self-contained scope packets with fresh context; do not assume pinned OAT roles can also inherit the full parent thread.
- **Authorization declined or agents do not resolve:** Tier 2 (inline). The orchestrator reads `.agents/agents/oat-phase-implementer.md` and `.agents/agents/oat-reviewer.md` as reference and executes that process itself.

The approval decision covers both phase implementation and checkpoint review for the run. The orchestrator should not drift into a mixed mode based on conversational emphasis alone; if Tier 1 was not approved, stay inline throughout unless the user explicitly requests mixed execution.

The selected tier is reported to the user and locked for the remainder of the run:

```
[preflight] Checking subagent availability…
  → oat-phase-implementer + oat-reviewer: available
  → Selected: Tier 1 — Subagents
```

### Runtime dispatch selection

Tier selection decides whether OAT uses native subagents or inline fallback. Runtime dispatch selection is separate: it decides which provider-specific model, effort, or host control to use for a specific phase when the host exposes that control.

The default rule is conservative: use the lowest available model/effort/control that can confidently complete the phase. Escalate before dispatch when the phase is high-risk, broad, cross-cutting, or when retry evidence suggests the current control is underpowered.

The orchestrator considers, in order:

1. A valid `## Dispatch Profile` override row in `plan.md`, if present and the host can honor it.
2. The phase's files, risk, requirements, and recent review/fix-loop evidence.
3. The host's actual control surface.

When the host exposes multiple controls, the orchestrator records the actual selected values. In Codex, the normal model choice is inherited unless the user requested a model override or the phase clearly requires one; implementation dispatch should still choose and pass the lowest sufficient `reasoning_effort` for the phase.

If the host does not expose per-dispatch control, the orchestrator records `host-auto` and includes the rationale in user-visible dispatch notes. For example:

```text
Dispatching p02 with host-auto: host does not expose per-dispatch effort; rationale maps to standard effort.
```

Phase scope packets include implementation `dispatch_control` and `dispatch_rationale` when the orchestrator has resolved them. Review dispatches inherit the parent session controls unless the user explicitly requests a review override; their review scope should record this as `model=inherited, reasoning_effort=inherited`.

### Dispatch Profile overrides

`plan.md` should omit `## Dispatch Profile` by default. Missing dispatch rows are normal, because runtime selection has fresher phase context and host capability information at execution time.

Add Dispatch Profile rows only when the user has an explicit constraint or preference, such as "use high reasoning effort for the security implementation phase" or "keep documentation-only phases on the lowest tier." Override rows should include a rationale explaining why runtime selection should not decide on its own.

### Per-phase loop

For each phase in the plan (whether sequential or inside a parallel group):

1. **Select runtime dispatch control** for the phase and log the chosen control plus rationale.
2. **Dispatch `oat-phase-implementer`** with a Phase Scope block (project path, phase id, artifact paths, commit convention, workflow mode, and dispatch context when known).
3. **Receive the summary:** `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`.
   - `BLOCKED` stops the run and surfaces the blocker to the user.
4. **Dispatch `oat-reviewer`** with a Review Scope block (phase id, commit range, optional files-changed hint, and inherited review dispatch context). Review dispatches inherit the parent session's model/effort/control unless the user explicitly requested an override. The commit range is authoritative; the file list is only orientation metadata. In Codex, pass this as a self-contained packet with `fork_context: false`, omit `model` and `reasoning_effort` overrides, and record `dispatch_control: model=inherited, reasoning_effort=inherited` so the reviewer reads git/OAT artifacts directly instead of inheriting the orchestration thread. If the reviewer does not conclude on the first wait, poll once more, then send a concise "return now with current findings" nudge before falling back inline for that phase.
5. **Parse the verdict:** zero Critical + zero Important findings → `pass`; otherwise `fail`.
6. **On fail, run the bounded fix loop** (see below).
7. **Update artifacts** (`implementation.md`, `plan.md` review row, `state.md`) and make the mandatory bookkeeping commit.
8. **HiLL checkpoint** if the phase id is listed in `oat_plan_hill_phases`.

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
   - The bootstrap checks inherited git cleanliness before the all-scope provider sync sweep.
   - If that sync leaves `.oat/sync/manifest.json` or provider directories dirty, bootstrap commits only existing or tracked sync-managed paths (`.oat/sync/manifest.json`, `.claude`, `.cursor`, `.codex`) as `chore: run sync` and reports `sync_commit: pass | fail | skip`.
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

- `implementation.md` — appends a `### Run N` entry between the `<!-- orchestration-runs-start -->` markers with tier, dispatch rationale, phase outcomes, parallel groups, and outstanding items.
- `plan.md` — updates the reviews table lifecycle (`pending` → `passed` or `fixes_added` → `fixes_completed` → `passed`).
- `state.md` — updates `oat_current_task`, `oat_last_commit`, `oat_project_state_updated`, and persists `oat_orchestration_retry_limit` if the user overrode the default.

Legacy `oat_execution_mode: subagent-driven` in existing projects is silently ignored and removed on the next bookkeeping write.

## Related

- [Lifecycle](lifecycle.md) — where implementation sits in the full project flow.
- [Artifacts](artifacts.md) — `plan.md` frontmatter contract, including `oat_plan_parallel_groups`.
- [HiLL Checkpoints](hill-checkpoints.md) — orthogonal pause semantics; fires after a phase or group completes and merges.
- [CLI Reference](../../reference/cli-reference.md) — `oat project validate-plan` and other commands.
