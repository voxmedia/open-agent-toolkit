---
name: oat-project-subagent-implement
version: 1.0.0
description: Use when you need parallel execution across eligible plan phases/tasks using autonomous worktrees, review gates, and deterministic merge-back.
argument-hint: "[--dry-run] [--merge-strategy <merge|cherry-pick>] [--retry-limit <N>]"
disable-model-invocation: true
user-invocable: true
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

All execution is non-interactive between configured HiLL checkpoints.

## Prerequisites

- Active OAT project with a complete `plan.md`.
- `oat-worktree-bootstrap-auto` skill available.

## Relationship to Existing Skills

| Skill | Role in Orchestration |
|-------|----------------------|
| `oat-worktree-bootstrap-auto` | Creates isolated worktrees per unit |
| `oat-project-implement` | Single-thread fallback; not used during orchestration |
| `oat-project-review-provide` | Manual review skill; autonomous gate is a parallel concept |
| `oat-project-review-receive` | Processes review findings; autonomous gate produces compatible artifacts |

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what is happening:

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ SUBAGENT IMPLEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print concise indicators, for example:
  - `[1/6] Reading plan + identifying units…`
  - `[2/6] Bootstrapping worktrees…`
  - `[3/6] Dispatching subagents…`
  - `[4/6] Running autonomous review gates…`
  - `[5/6] Reconciling merges…`
  - `[6/6] Updating artifacts + reporting…`

## Orchestration Lifecycle

```
plan.md
  │
  ▼
┌─────────────────────────────────────┐
│  1. Read Plan + Identify Units      │
│     - Parse phases/tasks            │
│     - Check parallel-safe markers   │
│     - Respect HiLL checkpoint gates  │
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
│     - Pause at HiLL checkpoint       │
└─────────────────────────────────────┘
```

## Process

### Step 0: Resolve Active Project and Persist Subagent Defaults

Resolve active project via `oat config get activeProject` (stored in `.oat/config.local.json`) and read `state.md`.

Persist required runtime defaults in `state.md` frontmatter:
- `oat_execution_mode: subagent-driven`
- Write orchestration defaults only when keys are missing (never overwrite existing values):
  - `oat_orchestration_merge_strategy: merge`
  - `oat_orchestration_retry_limit: 2`
  - `oat_orchestration_baseline_policy: strict`
  - `oat_orchestration_unit_granularity: phase`

### Step 1: Read Plan and Identify Parallelizable Units

Read `plan.md` and classify each phase/task:

**Parallelization eligibility:**
- Only tasks/phases explicitly marked `parallel-safe` (or determined by orchestrator to have no file-level dependencies) are fanned out.
- Default: sequential execution (same as `oat-project-implement`).
- Orchestrator must verify no overlapping file modifications between parallel units.

**Unit granularity:**
- Default: phase-level (all tasks within a phase run in one unit).
- Optional: task-level (individual tasks as separate units).

**HiLL checkpoint gating:**
- Read `oat_plan_hill_phases` from `plan.md` frontmatter.
- Fan out only for units before the next HiLL checkpoint.
- Example: if `oat_plan_hill_phases: ["p04"]`, phases p01-p03 may execute in parallel/sequence, but orchestrator must pause before p04.

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

After each implementer subagent completes, run a mandatory reviewer gate as a **peer subagent** and record the verdict map entry before any merge decision.

**Reviewer dispatch mechanism (required):**
1. Dispatch `oat-reviewer` as a peer subagent (`subagent_type: "oat-reviewer"`) against the same unit worktree.
2. Provide reviewer context:
   - Unit scope (files changed in unit branch/worktree).
   - Project artifacts (`plan.md`, `spec.md`, `design.md` when available).
   - Review type: `code`.
3. Reviewer writes artifact to:
   - `reviews/{unit-id}-gate-review.md`
4. Orchestrator reads the artifact and extracts stage verdict + finding severities.

**Stage 1: Spec compliance**
- Verify implementation matches plan task specification.
- Check: all planned files created/modified, verification commands pass, no scope creep.
- Anchor findings to code locations (file:line).

**Stage 2: Code quality**
- Only runs if spec compliance passes.
- Check: tests passing, lint clean, type-check clean, no Critical/Important findings.
- Severity classification: Critical, Important, Medium, Minor (4-tier, consistent with receive skills).

**Pass criteria:**
- No Critical or Important findings across both stages.
- All verification commands from plan pass.

**Fail handling — fix-loop dispatch (required):**
1. On review failure, dispatch a fix implementer subagent in the same worktree.
2. Provide fix input:
   - Review artifact path (`reviews/{unit-id}-gate-review.md`)
   - Critical/Important findings list
   - Original unit task specification
3. After fix subagent completes, re-dispatch reviewer peer subagent.
4. Repeat until pass or retry limit (`--retry-limit`, default 2) is exhausted.
5. If retry limit is exhausted:
   - mark unit as `failed`
   - set disposition to `excluded`
   - record unresolved findings in orchestration log

**Verdict map (source of truth for Step 5):**
```yaml
unit_id: "{unit-id}"
reviewer_stage: spec | quality
verdict: pass | fail
retry_count: N
review_artifact: "reviews/{unit-id}-gate-review.md"
findings:
  critical: []
  important: []
  medium: []
  minor: []
disposition: merged | excluded | skipped
```

### Step 5: Fan-In Reconciliation

Merge passing units back into the orchestration branch. Before executing any merge, apply the hard pre-merge verdict gate.

**Pre-merge verdict gate (required):**

For each unit eligible for merge, check its verdict map entry:

1. **No verdict entry exists** → set disposition to `skipped`, reason `review_gate_missing`. Refuse merge. Log: "Unit {unit-id} skipped: no reviewer verdict recorded."
2. **Verdict is not `pass`** → set disposition to `excluded`, reason `review_gate_failed`. Refuse merge. Log: "Unit {unit-id} excluded: reviewer verdict is {verdict}, not pass."
3. **Verdict is `pass`** → unit may proceed to merge.

Only units with `verdict == pass` in the verdict map enter the merge loop below. All other units are reported in the orchestration run log with their disposition and reason.

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

**Logging is append-only.** Each orchestration run appends a new subsection inside `implementation.md`'s `## Orchestration Runs` section (between the `<!-- orchestration-runs-start -->` and `<!-- orchestration-runs-end -->` markers). Never overwrite or reorder prior run entries.

**Template location:** `.oat/templates/implementation.md` includes the `## Orchestration Runs` section with sentinel markers. The orchestrator appends new entries before the `<!-- orchestration-runs-end -->` marker.

**Append this block for each run:**

```markdown
### Run {N} — {YYYY-MM-DD HH:MM}

**Branch:** {orchestration-branch}
**Policy:** baseline={policy}, merge={strategy}, retry-limit={N}
**Units:** {N} dispatched, {N} passed, {N} failed, {N} conflicts

#### Unit Outcomes

| Unit | Status | Commits | Tests | Review | Disposition |
|------|--------|---------|-------|--------|-------------|
| {id} | pass | {sha} | pass | pass | merged |
| {id} | fail | {sha} | pass | fail (quality, retry 2/2) | excluded |

#### Review Interaction Log

**{unit-id}:**
- **Reviewer dispatch:** peer subagent (`oat-reviewer`)
- **Review artifact:** `reviews/{unit-id}-gate-review.md`
- **review_gate_executed:** true
- **Spec compliance:** pass (0 findings)
- **Code quality:** fail → fix → pass (1 Important fixed, retry 1/2)
- **Fix-loop iterations:** 1 of 2 — fixed: [finding-ids]; unresolved: none
- **Verdict:** pass
- **Disposition:** merged

#### Merge Outcomes

| Order | Unit | Strategy | Result | Integration |
|-------|------|----------|--------|-------------|
| 1 | {id} | merge | clean | tests pass |
| 2 | {id} | cherry-pick | clean | tests pass |

#### Outstanding Items
- {conflict descriptions or manual follow-ups, or "None"}
```

**Dispatch manifest logging:** The dispatch script outputs a `log_path` field pointing to `implementation.md` so the orchestrator knows where to append run results. This field is informational — the orchestrator reads it and handles the actual write.

**Update `plan.md` review table:**
- Autonomous review results map to the plan's review rows.
- Status follows existing lifecycle: `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`.
- Autonomous reviews that pass set status to `passed` with date and artifact reference.

**Update `state.md`:**
- Advance `oat_current_task` to the next unprocessed task.
- Update `oat_last_commit` to the final merge commit.

**HiLL checkpoint pause:**
- If the next unit/phase is a configured HiLL checkpoint, pause execution.
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

### HiLL Checkpoint Mapping

**Source of truth:** `oat_plan_hill_phases` in `plan.md` frontmatter.

**Behavior:**
1. Orchestrator reads `oat_plan_hill_phases` at the start of each run.
2. Before dispatching units in a phase that is a HiLL checkpoint, orchestrator pauses.
3. Pause means: complete all in-flight units, reconcile, report, then wait for user approval.
4. If `oat_plan_hill_phases` is empty, default behavior is to pause at every phase boundary (same as `oat-project-implement`).

**Example:**
```yaml
oat_plan_hill_phases: ["p03"]
```
- p01 and p02: orchestrator may fan out and reconcile without pausing.
- Before p03: orchestrator pauses, reports progress, waits for user.
- p03 onward: resumes after approval.

**Interaction with parallel execution:** HiLL checkpoints partition the plan into "runs". Within each run, phases may execute in parallel if eligible. The checkpoint boundary is a hard barrier — all units in the current run must complete before the checkpoint.

### Policy Persistence

When this skill is invoked, `subagent-driven` mode and orchestration defaults can be persisted in `state.md` frontmatter:

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

## Review Skill Compatibility

The autonomous review gate (Step 4) operates alongside — not in place of — the existing manual review skills (`oat-project-review-provide` and `oat-project-review-receive`).

### Scope Separation

| Review Skill | Scope | Trigger |
|-------------|-------|---------|
| Autonomous gate (Step 4) | Per-unit (phase or task level) | Automatic after subagent completion |
| `oat-project-review-provide` | Per-phase, final, or range | User-invoked or `oat-project-implement` final gate |
| `oat-project-review-receive` | Processes review findings into plan tasks | User-invoked after review artifact exists |

### Autonomous Gate vs Manual Review

The autonomous gate is a **fast, binary quality check** (pass/fail per unit). It does not replace the richer manual review:

- **Autonomous gate findings** use the same `Critical`/`Important`/`Medium`/`Minor` 4-tier severity model as receive skills, but are limited to what automated checks and spec-diffing can detect.
- **Manual review findings** use the same 4-tier taxonomy with deeper semantic analysis.
- If a unit passes the autonomous gate and merges, it is still subject to manual review via `oat-project-review-provide`.

### plan.md Review Table Integration

Autonomous review results update the `plan.md` Reviews table using the same status lifecycle:

| Autonomous Outcome | plan.md Status |
|-------------------|---------------|
| All units in scope pass gate | `passed` (with date and artifact reference) |
| Some units fail, fixes dispatched | `fixes_added` |
| Fix loop exhausted, units excluded | `fixes_completed` (excluded units noted) |

**Rules:**
- Autonomous reviews write to phase-level rows (e.g., `p01`, `p02`) — not per-task rows.
- The `final` review row is **never** set by the autonomous gate. The `final` row is reserved for the project-wide final review gate managed by `oat-project-implement` Step 14 or manual invocation of `oat-project-review-provide code final`.
- If a manual review is requested after orchestration (e.g., `oat-project-review-provide code p02`), it may update the same row — the manual review takes precedence.

### Final Gate Preservation

After orchestration completes all phases:
1. Orchestrator updates `implementation.md` and `state.md` with completion status.
2. The `final` review in `plan.md` remains `pending`.
3. The user (or `oat-project-implement` Step 14) must invoke `oat-project-review-provide code final` separately.
4. This ensures the final review sees the fully reconciled codebase, not just individual unit outputs.

### Artifact Compatibility

Autonomous review verdicts are logged in `implementation.md` `## Orchestration Runs` sections (not as standalone review artifacts in `reviews/`). If manual follow-up review is needed:
- `oat-project-review-provide` writes its artifact to `reviews/` as usual.
- `oat-project-review-receive` processes that artifact into plan tasks as usual.
- The orchestration log in `implementation.md` provides context but does not interfere.

## Constraints

- **Never** use `AskUserQuestion` during execution between HiLL checkpoints.
- **Never** merge a unit without an explicit pass verdict from the reviewer gate.
- **Always** dispatch reviewer as a peer subagent (`oat-reviewer`), not nested or inline.
- **Never** silently lose work — failed units are reported, not deleted.
- **Never** bypass existing `plan.md` review table semantics.
- **Never** set the `final` review row to `passed` from the autonomous gate.
- **Always** use deterministic merge ordering (by task ID).
- **Always** run integration verification after each merge.

## Usage Patterns

See `examples/` for detailed walkthroughs with plan excerpts and expected artifact output:

| Pattern | File | Description |
|---------|------|-------------|
| Simple Parallel | `examples/pattern-parallel-phases.md` | Two independent phases run in parallel and merge cleanly |
| HiLL Checkpoint | `examples/pattern-hil-checkpoint.md` | Parallel phases run before a checkpoint, user reviews, then continues |

## Success Criteria

- All eligible units dispatched and executed in isolated worktrees.
- Two-stage review gate enforced per unit.
- Passing units merged in deterministic order with integration verification.
- Failed units excluded with actionable reports.
- All outcomes logged to `implementation.md` with full traceability.
- `plan.md` review table updated consistently with existing lifecycle.
- Final review gate preserved for separate invocation post-orchestration.
- Execution pauses at configured HiLL checkpoints.
