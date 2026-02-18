---
name: oat-subagent-orchestrate
description: Drive parallel execution across eligible plan phases/tasks using autonomous worktrees, review gates, and deterministic merge-back.
argument-hint: "[--dry-run] [--merge-strategy <merge|cherry-pick>] [--retry-limit <N>]"
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Bash, Glob, Grep, Task
---

# Subagent Orchestration

Drive parallel, worktree-isolated execution of plan tasks with autonomous review gates and deterministic fan-in reconciliation.

## Purpose

Enable an orchestrator agent to:
1. Identify parallelizable units from a project plan.
2. Bootstrap isolated worktrees per unit via `oat-worktree-bootstrap-auto`.
3. Dispatch subagents with scoped objectives and file boundaries.
4. Run autonomous review gates per unit before merge-back.
5. Reconcile unit branches into the orchestration branch.
6. Log all outcomes to OAT project artifacts.

All execution is non-interactive between configured HiL checkpoints.

## Prerequisites

- Active OAT project with a complete `plan.md`.
- `oat-worktree-bootstrap-auto` skill available.
- Execution mode set to `subagent-driven` in project state (or explicit invocation).

## Relationship to Existing Skills

| Skill | Role in Orchestration |
|-------|----------------------|
| `oat-worktree-bootstrap-auto` | Creates isolated worktrees per unit |
| `oat-project-implement` | Single-thread fallback; not used during orchestration |
| `oat-project-review-provide` | Manual review skill; autonomous gate is a parallel concept |
| `oat-project-review-receive` | Processes review findings; autonomous gate produces compatible artifacts |
| `oat-execution-mode-select` | Routes to this skill when `subagent-driven` mode is chosen |

## Orchestration Lifecycle

```
plan.md
  │
  ▼
┌─────────────────────────────────────┐
│  1. Read Plan + Identify Units      │
│     - Parse phases/tasks            │
│     - Check parallel-safe markers   │
│     - Respect HiL checkpoint gates  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Bootstrap Worktrees             │
│     - Per-unit worktree via         │
│       oat-worktree-bootstrap-auto   │
│     - Branch naming convention      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Dispatch Subagents (parallel)   │
│     - Scoped objectives per unit    │
│     - File boundary constraints     │
│     - Implementation + self-review  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Autonomous Review Gate          │
│     - Spec compliance check         │
│     - Code quality check            │
│     - Fix-loop retry on failure     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Fan-In Reconciliation           │
│     - Merge units in task-ID order  │
│     - Integration verification      │
│     - Conflict classification       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  6. Report + Artifact Update        │
│     - Update implementation.md      │
│     - Update plan.md review rows    │
│     - Pause at HiL checkpoint       │
└─────────────────────────────────────┘
```

## Process

### Step 1: Read Plan and Identify Parallelizable Units

Read `plan.md` and classify each phase/task:

**Parallelization eligibility:**
- Only tasks/phases explicitly marked `parallel-safe` (or determined by orchestrator to have no file-level dependencies) are fanned out.
- Default: sequential execution (same as `oat-project-implement`).
- Orchestrator must verify no overlapping file modifications between parallel units.

**Unit granularity:**
- Default: phase-level (all tasks within a phase run in one unit).
- Optional: task-level (individual tasks as separate units).

**HiL checkpoint gating:**
- Read `oat_plan_hil_phases` from `plan.md` frontmatter.
- Fan out only for units before the next HiL checkpoint.
- Example: if `oat_plan_hil_phases: ["p04"]`, phases p01-p03 may execute in parallel/sequence, but orchestrator must pause before p04.

### Step 2: Bootstrap Worktrees Per Unit

For each eligible unit, invoke `oat-worktree-bootstrap-auto`:

**Branch naming convention:**
```
{project-name}/{unit-id}
```
Example: `autonomous-orchestration/p02-t01`

**Base ref:** The orchestration branch (the branch from which the orchestrator runs).

**Baseline policy:** Configurable per run (default: `strict`).

If any bootstrap fails under `strict` policy, exclude that unit and report the failure.

### Step 3: Dispatch Subagents

For each bootstrapped unit, dispatch a subagent via the `Task` tool with:

**Scoped objective:**
- The specific plan task(s) assigned to this unit.
- Full task text from `plan.md` including steps, files, and verification commands.

**File boundaries:**
- Explicit list of files the subagent may create/modify (from plan task `Files:` section).
- Subagent must not modify files outside its boundary.

**Context provided to subagent:**
- Project name and path.
- Task specification from plan.
- Relevant design/spec context (if available).
- Commit convention from plan.

**Expected deliverables from subagent:**
- Implementation summary (what changed, behavior-level).
- Test results (pass/fail, coverage).
- Changed files inventory.
- Self-review observations.
- Commit SHA(s).

### Step 4: Autonomous Review Gate

After each subagent completes, run a two-stage review gate:

**Stage 1: Spec compliance**
- Verify implementation matches plan task specification.
- Check: all planned files created/modified, verification commands pass, no scope creep.
- Anchor findings to code locations (file:line).

**Stage 2: Code quality**
- Only runs if spec compliance passes.
- Check: tests passing, lint clean, type-check clean, no Critical/Important findings.
- Severity classification: Critical, Important, Minor.

**Pass criteria:**
- No Critical or Important findings across both stages.
- All verification commands from plan pass.

**Fail handling — fix-loop retry:**
1. On review failure, dispatch implementer subagent to fix identified issues.
2. Re-run the same review stage that failed.
3. Repeat up to `--retry-limit` times (default: 2).
4. If retry limit exhausted: mark unit as `failed` and exclude from merge-back.

**Verdict capture (per unit):**
```yaml
unit_id: "{unit-id}"
reviewer_stage: spec | quality
verdict: pass | fail
retry_count: N
findings:
  critical: []
  important: []
  minor: []
disposition: merged | excluded | skipped
```

### Step 5: Fan-In Reconciliation

Merge passing units back into the orchestration branch:

**Merge ordering:** Deterministic by task ID (ascending). Example: p02-t01 before p02-t02.

**Default strategy: merge**
```bash
git checkout {orchestration-branch}
git merge --no-ff {unit-branch} -m "merge({unit-id}): {summary}"
```

**Fallback strategy: cherry-pick**
If merge produces conflicts:
1. Abort the merge.
2. Attempt cherry-pick of individual unit commits.
3. If cherry-pick also conflicts: classify and report for manual resolution.

**Integration verification (after each merge):**
```bash
pnpm test
pnpm lint
pnpm type-check
```

If integration verification fails after a merge:
1. Revert the merge.
2. Mark the unit as `conflict` and report.
3. Continue with remaining units.

**Conflict classification:**
- `file-level`: Same file modified by multiple units.
- `semantic`: Different files but conflicting behavior.
- `integration`: Individual units pass but combined result fails.

### Step 6: Report and Update Artifacts

**Update `implementation.md`** with orchestration run section:

```markdown
## Orchestration Run — {YYYY-MM-DD HH:MM}

**Branch:** {orchestration-branch}
**Policy:** baseline={policy}, merge={strategy}, retry-limit={N}
**Units:** {N} dispatched, {N} passed, {N} failed, {N} conflicts

### Unit Outcomes

| Unit | Status | Commits | Tests | Review | Disposition |
|------|--------|---------|-------|--------|-------------|
| {id} | pass | {sha} | pass | pass | merged |
| {id} | fail | {sha} | pass | fail (quality, retry 2/2) | excluded |

### Review Interaction Log

#### {unit-id}
- **Spec compliance:** pass (0 findings)
- **Code quality:** fail → fix → pass (1 Important fixed, retry 1/2)
- **Verdict:** pass
- **Disposition:** merged

### Merge Outcomes

| Order | Unit | Strategy | Result | Integration |
|-------|------|----------|--------|-------------|
| 1 | {id} | merge | clean | tests pass |
| 2 | {id} | cherry-pick | clean | tests pass |

### Outstanding Items
- {conflict descriptions or manual follow-ups}
```

**Update `plan.md` review table:**
- Autonomous review results map to the plan's review rows.
- Status follows existing lifecycle: `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`.
- Autonomous reviews that pass set status to `passed` with date and artifact reference.

**Update `state.md`:**
- Advance `oat_current_task` to the next unprocessed task.
- Update `oat_last_commit` to the final merge commit.

**HiL checkpoint pause:**
- If the next unit/phase is a configured HiL checkpoint, pause execution.
- Report: what completed, what's next, and prompt for user approval to continue.

## Policy Flags

All policies have sensible defaults. Override per-run via CLI flags or persist in `state.md` when `subagent-driven` mode is selected.

### Policy Table

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--merge-strategy` | `merge` \| `cherry-pick` | `merge` | Default merge strategy for fan-in reconciliation. |
| `--retry-limit` | integer (0-5) | `2` | Max fix-loop retries per unit before marking failed. |
| `--baseline-policy` | `strict` \| `allow-failing` | `strict` | Passed to `oat-worktree-bootstrap-auto` for baseline checks. |
| `--dry-run` | boolean | `false` | Run plan analysis and unit identification without execution. |
| `--unit-granularity` | `phase` \| `task` | `phase` | Fan-out granularity: phase-level or task-level units. |

### Merge Strategy Policy

| Strategy | Behavior | When to Use |
|----------|----------|-------------|
| `merge` | `git merge --no-ff` per unit in task-ID order | Default; clean parallel branches with no overlapping files |
| `cherry-pick` | Cherry-pick individual commits per unit | Fallback when merge conflicts; finer-grained conflict isolation |

**Interaction:** If `merge` fails for a unit, automatically falls back to `cherry-pick` regardless of the configured strategy. If `cherry-pick` also fails, the unit is classified as `conflict` and reported for manual resolution.

### Retry Policy

| Retry Limit | Behavior |
|-------------|----------|
| `0` | No retries; first review failure marks unit as failed |
| `1-5` | Dispatch implementer to fix, re-run failed review stage, up to N times |

**Interaction with review gate:** Each retry dispatches a fresh implementer subagent with the review findings. The same review stage (spec or quality) re-runs. If the stage that previously passed is invalidated by fixes, both stages re-run.

### Baseline Policy

Passed through to `oat-worktree-bootstrap-auto`. See that skill's policy documentation for details.

| Policy | Orchestration Behavior |
|--------|----------------------|
| `strict` | Failed bootstrap excludes unit from dispatch |
| `allow-failing` | Failed bootstrap emits warning; unit still dispatched |

### HiL Checkpoint Mapping

**Source of truth:** `oat_plan_hil_phases` in `plan.md` frontmatter.

**Behavior:**
1. Orchestrator reads `oat_plan_hil_phases` at the start of each run.
2. Before dispatching units in a phase that is a HiL checkpoint, orchestrator pauses.
3. Pause means: complete all in-flight units, reconcile, report, then wait for user approval.
4. If `oat_plan_hil_phases` is empty, default behavior is to pause at every phase boundary (same as `oat-project-implement`).

**Example:**
```yaml
oat_plan_hil_phases: ["p03"]
```
- p01 and p02: orchestrator may fan out and reconcile without pausing.
- Before p03: orchestrator pauses, reports progress, waits for user.
- p03 onward: resumes after approval.

**Interaction with parallel execution:** HiL checkpoints partition the plan into "runs". Within each run, phases may execute in parallel if eligible. The checkpoint boundary is a hard barrier — all units in the current run must complete before the checkpoint.

### Policy Persistence

When `subagent-driven` mode is selected via `oat-execution-mode-select`, policies can be persisted in `state.md` frontmatter:

```yaml
oat_execution_mode: subagent-driven
oat_orchestration_merge_strategy: merge
oat_orchestration_retry_limit: 2
oat_orchestration_baseline_policy: strict
oat_orchestration_unit_granularity: phase
```

CLI flags override persisted values for that run and also update the persisted value.

## Dry-Run Mode

When `--dry-run` is specified:
- Execute Steps 1-2 (plan read + unit identification) fully.
- Skip Steps 3-5 (no subagent dispatch, no merge).
- Report: identified units, worktree plan, estimated parallelism.
- No code changes, no commits, no artifact updates.

## Constraints

- **Never** use `AskUserQuestion` during execution between HiL checkpoints.
- **Never** merge a unit that did not pass the autonomous review gate (unless policy explicitly marks it `skipped`).
- **Never** silently lose work — failed units are reported, not deleted.
- **Never** bypass existing `plan.md` review table semantics.
- **Always** use deterministic merge ordering (by task ID).
- **Always** run integration verification after each merge.

## Success Criteria

- All eligible units dispatched and executed in isolated worktrees.
- Two-stage review gate enforced per unit.
- Passing units merged in deterministic order with integration verification.
- Failed units excluded with actionable reports.
- All outcomes logged to `implementation.md` with full traceability.
- `plan.md` review table updated consistently with existing lifecycle.
- Execution pauses at configured HiL checkpoints.
