# Plan And Resume

This reference preserves the route-specific implementation contract. Load it only when the entry skill routes execution here.

### Step 1: Check Plan Complete

```bash
cat "$PROJECT_PATH/plan.md" | head -10 | grep "oat_status:"
```

**Required frontmatter:**

- `oat_status: complete`
- `oat_ready_for: oat-project-implement`

**If not complete:** Block and ask user to finish plan first.

### Step 1.5: Resumption Detection

If `{PROJECT_PATH}/implementation.md` already contains orchestration run entries, we may be resuming an interrupted run.

1. Read `implementation.md` and find the most recent `### Run N` entry.
2. Compare its phases-passed / phases-failed / phases-stopped counts against the plan's phase list.
3. If there are phases in the plan that are not yet covered by any run entry, those are the resume targets.
4. Read `state.md` for `oat_current_task` to cross-check the expected resume point.
5. Read `git log` to verify the most recent bookkeeping commit matches the last reported state.

**Detected state reconciliation:**

- If there is an in-flight phase (implementer committed but no review verdict
  in `implementation.md`), reconcile its recorded `Review Dispatch Summary`
  before any action:
  - When the coordinator's reviewer launch was accepted, continue, poll, or
    nudge only through that existing child handle. If the handle cannot be
    resumed, block or escalate; never replace it.
  - When no review was launched, or the recorded attempt was explicitly
    rejected before child start, resume the phase coordinator with the current
    phase range so it retains exact ceiling resolution and review-launch
    ownership.
  - When an artifact was returned, validate its range and structured dispatch
    evidence through the normal per-phase flow.
    The outer workflow never dispatches the phase reviewer itself.
- If there are un-cleaned worktrees from a prior parallel group, list them and ask the user whether to resume or clean up:

  ```
  Found un-cleaned worktrees from a prior run:
    - ../worktrees/{name}/p02 — verdict was: excluded
    - ../worktrees/{name}/p03 — verdict was: pass, not merged

  Resume (merge pending verdicts into orchestration branch) or clean up?
  ```

6. Once resume target is identified, continue from that phase with the normal per-phase flow.

**On first-ever invocation** (no prior run entries), skip resumption detection and proceed to Step 2.

### Step 2: Read Plan Document

Read `"$PROJECT_PATH/plan.md"` completely to understand:

- All phases and tasks
- File changes per task
- Verification commands
- Commit messages

### Step 2.1: Validate Parallelism Metadata

Invoke the CLI validator to check plan.md parallelism metadata:

```bash
oat project validate-plan --project-path "${PROJECT_PATH}"
```

(If `oat` is not in PATH, use: `pnpm run cli -- project validate-plan --project-path "${PROJECT_PATH}"`)

The command validates:

- `oat_plan_parallel_groups` is either missing / empty (meaning fully sequential, no check needed) or a nested array of phase ID strings.
- Every referenced phase ID exists in the plan.
- No phase ID appears in more than one group.
- No singleton groups (each group must contain at least 2 phases).

**Reactions:**

- Exit code 0 → validation passed; continue to Step 2.2.
- Non-zero exit code → STOP immediately. Surface the validator's stderr output to the user. Do not silently fall back to sequential — the plan must be fixed first.

The validation contract is enforced by the CLI command and unit-tested there; the skill is just the consumer.

### Step 2.2: Build Execution Schedule

From the phase list and the validated parallel groups, build an execution schedule:

- Phases not listed in any group form singleton entries (run sequentially).
- Each parallel group forms a multi-phase entry (run concurrently in worktrees).
- Schedule entries execute in plan order.

Example:

- Plan phases: p01, p02, p03, p04, p05
- `oat_plan_parallel_groups: [["p02", "p03"], ["p04", "p05"]]`
- Schedule: `[p01]` → `[p02, p03]` (group) → `[p04, p05]` (group)

### Step 2.5: Confirm Plan HiLL Checkpoints

Read `oat_plan_hill_phases` from `"$PROJECT_PATH/plan.md"` frontmatter when present and validate it.

- **Valid format:** JSON-like array of phase IDs (e.g., `["p01","p03"]`)
- **Allowed pre-confirmation state:** field missing entirely on the first implementation run
- **Invalid format examples:** scalar string, malformed array, unknown phase IDs

Determine whether this is a first implementation run:

- If `"$PROJECT_PATH/implementation.md"` does not exist, treat as first run.
- If it exists but still has template placeholders and no completed task evidence, treat as first run.

#### Workflow preference check (before prompting)

Before presenting the checkpoint prompt to the user, check if a workflow preference has been configured:

```bash
HILL_DEFAULT=$(oat config get workflow.hillCheckpointDefault 2>/dev/null || true)
```

- **If `HILL_DEFAULT` is `every`:** Skip the prompt. Write `oat_plan_hill_phases: []` to plan.md frontmatter. Print: `HiLL checkpoints: every phase (from workflow.hillCheckpointDefault)`. Continue to Touchpoint A.
- **If `HILL_DEFAULT` is `final`:** Skip the prompt. Determine the final phase ID from plan.md (e.g., `p05`) and write `oat_plan_hill_phases: ["<final_phase_id>"]` to plan.md frontmatter. Print: `HiLL checkpoints: final phase only (from workflow.hillCheckpointDefault)`. Continue to Touchpoint A.
- **If unset, empty, or invalid:** Fall through to the standard prompt behavior below.

This preference check only applies on first runs — resuming implementations should trust the existing `oat_plan_hill_phases` value in plan.md (or repair as bookkeeping drift).

Prompt behavior:

- **If first run:** always present a complete phase-by-phase summary and confirm checkpoint phases before any task execution. A missing `oat_plan_hill_phases` value is the normal unconfirmed state; if a value is already present, treat it as a provisional value to confirm rather than as final.
- **If resuming and `oat_plan_hill_phases` is valid:** do not re-ask; print active checkpoint config and continue.
- **If resuming and `oat_plan_hill_phases` is missing/invalid:** treat this as bookkeeping drift, because implementation should already have written the confirmed value before prior task execution. Ask the user to repair the checkpoint configuration before continuing.

Required prompt shape for first-run confirmation:

1. Open with plan framing:
   - `This plan has {phase_count} phases. Final phase: {final_phase_id}.`
2. Briefly summarize every plan phase in order:
   - `p01 — {short phase summary}`
   - `p02 — {short phase summary}`
   - ...
   - Never omit this summary, even if the plan has only one phase or `oat_plan_hill_phases` already contains a provisional value.
3. Ask the checkpoint question using exactly three options:
   - `Which checkpoint behavior do you want?`
   - `1. Stop after each phase (default)`
   - `2. Stop after specific phases, e.g. p02, p05`
   - `3. Stop only after the final phase is completed`
4. Map the options to stored values:
   - `1` -> `[]`
   - `2` -> user-specified array such as `["p02","p05"]`
   - `3` -> `["p07"]` (replace `p07` with the actual final phase ID for this plan)
5. If a provisional `oat_plan_hill_phases` value already exists, mention it after presenting the three options, but still require the user to choose or confirm one of them.

When user confirms/changes:

- Update `"$PROJECT_PATH/plan.md"` frontmatter `oat_plan_hill_phases` to the confirmed value before executing tasks.
- Keep the value stable for the rest of the run unless the user explicitly requests a change.

#### Auto-Review at HiLL Checkpoints (Touchpoint A)

After checkpoint behavior is confirmed, resolve auto-review preference:

1. Read `workflow.autoReviewAtHillCheckpoints` via `oat config get workflow.autoReviewAtHillCheckpoints`. This uses local > shared > user resolution and falls back to legacy `.oat/config.json` `autoReviewAtCheckpoints` when the workflow key is unset.
2. **If config explicitly `true`:** Skip the prompt. Write `oat_auto_review_at_hill_checkpoints: true` to plan.md frontmatter. Print: "Auto-review at HiLL checkpoints: enabled (from workflow.autoReviewAtHillCheckpoints)."
3. **If config explicitly `false`:** Skip the prompt. Write `oat_auto_review_at_hill_checkpoints: false` to plan.md frontmatter. Print: "Auto-review at HiLL checkpoints: disabled (from workflow.autoReviewAtHillCheckpoints)."
4. **If config is unset:** Add one question after the checkpoint choice:
   ```
   4. Auto-review at HiLL checkpoints?
      - yes: automatically run the lifecycle review when a HiLL checkpoint phase completes
      - no (default): manual lifecycle review triggering
   ```
5. Write `oat_auto_review_at_hill_checkpoints: true|false` to plan.md frontmatter alongside `oat_plan_hill_phases`.

This setting controls only the extra `oat-project-review-provide` lifecycle review at HiLL checkpoints. It does not control Tier 1 phase gate reviews; Tier 1 always runs `oat-reviewer` after each phase.

**On resume:** If `oat_auto_review_at_hill_checkpoints` is already present in plan.md frontmatter, skip Touchpoint A entirely — do not re-ask, do not re-read config, do not print the auto-review note. The stored value is authoritative. If only legacy `oat_auto_review_at_checkpoints` is present, treat it as authoritative for this run and write the new `oat_auto_review_at_hill_checkpoints` key on the next plan frontmatter update.

### Step 2.6: Validate Optional Phase Review Gate

Read `oat_phase_review_gate` from `"$PROJECT_PATH/plan.md"` frontmatter when present.

This is the plan-level `phaseReviewGate` setting: an optional, non-pausing external lifecycle review gate that runs after a phase's standard per-phase self-review passes. It uses the existing `oat gate review` target configuration to run a cross-provider review, then maps the produced review artifact to a blocking/non-blocking gate result.

Valid shape:

```yaml
oat_phase_review_gate:
  enabled: true
  phases: [] # empty or omitted = every implementation phase
  review_type: code
  exit_nonzero_on: important
```

Validation rules:

- Missing, `null`, or `enabled: false` means disabled.
- `enabled: true` activates the gate.
- `phases` is optional. If missing or empty (`[]`), run after every implementation phase. If populated, every value must be a known plan phase ID.
- `review_type` is optional and defaults to `code`. This skill only supports `code` phase gates; any other value is invalid for implementation phase execution.
- `exit_nonzero_on` is optional and defaults to `important`. Allowed values: `critical`, `important`, `medium`, `minor`.

If the setting is invalid, stop before task execution and ask the user to repair `plan.md`. Do not silently disable a malformed gate.

This setting is independent from HiLL checkpoints:

- It does not pause when the gate passes.
- It does not append to `oat_hill_completed`.
- It does not alter `oat_plan_hill_phases` or `oat_auto_review_at_hill_checkpoints`.
- It uses the existing gate target config; do not hardcode `--target` in reusable plan execution unless the user explicitly asks for manual/debug routing.

### Step 3: Check Implementation State

Check if implementation already started:

```bash
cat "$PROJECT_PATH/implementation.md" 2>/dev/null | head -20
```

**If exists and has progress:**

- Read `oat_current_task_id` from frontmatter (e.g., "p01-t03" or "prev1-t01")
- **Revision task recognition:** `p-revN` phases and `prevN-tNN` task IDs are treated identically to standard `pNN` phases and `pNN-tNN` tasks for execution purposes. The implement skill does not need special handling — it just follows the plan sequentially.
- Validate the task pointer:
  - If `oat_current_task_id` points at a task already marked `completed` in the body, advance to the **next incomplete** task (first `pending` / `in_progress` / `blocked` entry).
  - If all tasks are completed, skip ahead to finalization (Step 11+).
- **Always resume** from the resolved task. Print `Resuming from {task_id}.` Do not prompt.
- **Fresh start is an explicit override only.** If the user invoked the skill with `fresh=true` (argument), warn `Starting fresh — this will overwrite implementation.md. Any draft logs will be lost.` and proceed with fresh initialization. Do not offer fresh start interactively; it is a rare edge case reserved for corrupt state or deliberate plan rewrites.

**Stale-state reconciliation (approval required):**

- Before executing tasks, cross-check `plan.md` Reviews status with `implementation.md` + `state.md`.
- If `plan.md` shows a scope as `passed` but `implementation.md` / `state.md` still says "awaiting re-review" (or leaves `oat_current_task_id` / `oat_current_task` as `null` while future plan tasks are still incomplete), treat this as bookkeeping drift.
- Resolve the next task from plan order (first incomplete non-review task after the passed scope), then ask:
  - "Detected bookkeeping drift: review is passed in plan.md, but state artifacts still show awaiting re-review. Update artifacts and continue from {next_task_id}?"
- Only if the user approves:
  - Update `implementation.md` frontmatter `oat_current_task_id: {next_task_id}`
  - Update `state.md` frontmatter `oat_current_task: {next_task_id}` and refresh stale "awaiting re-review" wording
  - Update implementation review notes "Next" guidance to continue implementation (not re-review)
- If the user declines:
  - Do not auto-edit bookkeeping; pause and ask whether to proceed manually or stop.

**If doesn't exist:**

- Initialize from template (Step 4)

**Important:** Never overwrite an existing `implementation.md` without explicit user confirmation (and warn that draft logs will be lost).

### Step 4: Initialize Implementation Document

Copy template: `.oat/templates/implementation.md` → `"$PROJECT_PATH/implementation.md"`

Update frontmatter:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: p01-t01 # Stable task ID from plan
---
```

Initialize project state so other skills (e.g., `oat-project-progress`) reflect that implementation has started:

- In `"$PROJECT_PATH/state.md"` frontmatter:
  - `oat_phase: implement`
  - `oat_phase_status: in_progress`
  - `oat_current_task: p01-t01`
  - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
