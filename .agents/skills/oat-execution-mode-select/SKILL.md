---
name: oat-execution-mode-select
description: Choose execution mode (single-thread or subagent-driven) after plan completion. Persists choice and routes to the appropriate implementation skill.
argument-hint: "[--mode <single-thread|subagent-driven>]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, AskUserQuestion
---

# Execution Mode Selector

Choose how to execute a completed plan: single-thread (existing `oat-project-implement` flow) or subagent-driven (parallel orchestrated worktree flow via `oat-subagent-orchestrate`).

## Purpose

Bridge between plan completion and implementation by letting the user choose (or override) the execution strategy. Persists the choice in project state so subsequent sessions default to the selected mode.

## Integration Point

This skill runs at the **end of planning flows**, before the first implementation step:

```
plan complete → oat-execution-mode-select → route to implementation skill
```

Specifically:
- After `oat-project-plan` completes with `oat_status: complete`.
- After `oat-project-import-plan` completes with `oat_plan_source: imported`.
- Before the first invocation of `oat-project-implement` or `oat-subagent-orchestrate`.

## Mode Options

| Mode | Routing Target | Description |
|------|---------------|-------------|
| `single-thread` | `oat-project-implement` | Existing sequential task execution. One task at a time, manual review gates. Default for backward compatibility. |
| `subagent-driven` | `oat-subagent-orchestrate` | Parallel worktree-based execution with autonomous review gates. Requires `oat-worktree-bootstrap-auto` and `oat-subagent-orchestrate` skills. |

## Process

### Step 1: Resolve Active Project

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
```

If no active project, block and ask user to set one.

### Step 2: Read Current Mode

Check `state.md` frontmatter for existing `oat_execution_mode`:

```bash
grep 'oat_execution_mode' "$PROJECT_PATH/state.md"
```

- If set: display current mode as the default.
- If unset: default to `single-thread`.

### Step 3: Present Choice

**If `--mode` flag provided:** Use the specified mode without prompting.

**If no flag:** Prompt user:

```
Execution mode for {project-name}:

1. single-thread (default) — Sequential task execution via oat-project-implement
2. subagent-driven — Parallel worktree execution via oat-subagent-orchestrate

Current: {current-mode}
Choose:
```

### Step 4: Persist Mode

Update `state.md` frontmatter:

```yaml
oat_execution_mode: single-thread  # or subagent-driven
```

If `subagent-driven` is selected, optionally persist orchestration policy defaults:

```yaml
oat_orchestration_merge_strategy: merge    # merge | cherry-pick
oat_orchestration_retry_limit: 2           # fix-loop retry limit
oat_orchestration_baseline_policy: strict  # strict | allow-failing
```

### Step 5: Route to Implementation Skill

Output the next command based on selected mode:

| Selected Mode | Next Command |
|---------------|-------------|
| `single-thread` | `oat-project-implement` |
| `subagent-driven` | `oat-subagent-orchestrate` |

## Override Behavior

- Any invocation with `--mode` overrides the persisted default for that run.
- The override also updates the persisted value (so it becomes the new default).
- Explicit invocation of `oat-project-implement` or `oat-subagent-orchestrate` bypasses this selector entirely.

## Constraints

- This skill only reads/writes `state.md` — it does not modify `plan.md` or `implementation.md`.
- Default is always `single-thread` when unset, for backward compatibility.
- Does not validate whether orchestration prerequisites (skills, worktree infra) are available — that's the orchestrator's responsibility at runtime.

## Success Criteria

- Execution mode persisted in `state.md` frontmatter.
- User informed of selected mode and next command.
- Routing is correct: `single-thread` → implement, `subagent-driven` → orchestrate.
