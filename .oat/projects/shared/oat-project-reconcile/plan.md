---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-07
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: true
oat_template: false
oat_template_name: plan
---

# Implementation Plan: oat-project-reconcile

> Execute this plan using `oat-project-implement` (sequential), with phase checkpoints and review gates.

**Goal:** Create a new OAT skill that maps manual/human commits to planned tasks and reconciles tracking artifacts after user confirmation.

**Architecture:** Single SKILL.md file with optional helper script for git analysis. Follows the standard OAT skill pattern — read-only git operations for analysis, write operations only for OAT tracking artifacts.

**Tech Stack:** Bash (git operations), SKILL.md (agent instructions)

**Commit Convention:** `feat(pNN-tNN): {description}` — e.g., `feat(p01-t01): add oat-project-reconcile skill skeleton`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter (none — quick mode)

---

## Phase 1: Core Skill Implementation

### Task p01-t01: Create skill directory and SKILL.md skeleton

**Files:**
- Create: `.agents/skills/oat-project-reconcile/SKILL.md`

**Steps:**

1. Create the skill directory `.agents/skills/oat-project-reconcile/`
2. Write `SKILL.md` with standard frontmatter:
   - `name: oat-project-reconcile`
   - `version: 1.0.0`
   - `description: Use when human-implemented commits need to be mapped back to planned tasks. Reconciles implementation.md, state.md after manual work.`
   - `disable-model-invocation: true`
   - `user-invocable: true`
   - `allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion`
3. Add mode assertion block, progress indicator guidance, and blocked/allowed activities
4. Add Step 0: Resolve active project (standard pattern — read `.oat/config.local.json` or fall back to config resolution)
5. Add Step 0.5: Prerequisite check — verify `plan.md` exists and `oat_phase` is `implement` (or `plan` with `oat_phase_status: complete`)

**Verify:**
- File exists with valid frontmatter
- `pnpm lint` passes (no markdown issues)

**Commit:**
```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "feat(p01-t01): add oat-project-reconcile skill skeleton"
```

---

### Task p01-t02: Implement checkpoint detection (Step 1)

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Steps:**

Write Step 1 (Find Checkpoint) with the following logic:

1. Read `implementation.md` to find the last logged task entry with a commit SHA
2. If found, use that commit as the checkpoint (most reliable — it's what OAT already tracked)
3. If `implementation.md` has no logged commits, scan git log for the last commit matching OAT patterns:
   ```bash
   git log --oneline --grep='([a-z]*-t[0-9]*)' --extended-regexp -n 1
   ```
   Also check for bookkeeping commits:
   ```bash
   git log --oneline --grep='chore(oat): update tracking artifacts' -n 1
   ```
   Use whichever is more recent
4. If no OAT commits found at all, fall back to merge-base with main/default branch:
   ```bash
   git merge-base HEAD main
   ```
5. Output checkpoint info to user:
   ```
   OAT ▸ RECONCILE — Checkpoint
   Last tracked commit: {sha} ({date})
   Task: {task_id or "pre-project"}
   Commits to analyze: {count}
   ```
6. Ask user to confirm the checkpoint or provide a different starting commit

**Verify:**
- Step logic covers all three fallback paths
- User confirmation gate is present

**Commit:**
```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "feat(p01-t02): implement checkpoint detection step"
```

---

### Task p01-t03: Implement commit collection and analysis (Step 2)

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Steps:**

Write Step 2 (Collect and Analyze Commits) with the following logic:

1. Collect commits in the range `{checkpoint}..HEAD`:
   ```bash
   git log --format='%H|%s|%an|%ai' {checkpoint}..HEAD
   ```
2. For each commit, gather changed files and diff stats:
   ```bash
   git diff-tree --no-commit-id -r --name-only {sha}
   git diff --stat {sha}~1..{sha}
   ```
3. Filter out:
   - Merge commits (detected via `git rev-list --merges`)
   - Bookkeeping-only commits (all changed files are `implementation.md`, `state.md`, or `plan.md` within a project directory)
4. Present summary to user:
   ```
   OAT ▸ RECONCILE — Commit Analysis
   Range: {checkpoint_sha}..HEAD ({N} commits, {M} after filtering)

   | # | SHA     | Message (truncated)       | Files | +/- |
   |---|---------|---------------------------|-------|-----|
   | 1 | abc1234 | add auth endpoint         | 3     | +120/-5 |
   | 2 | def5678 | fix validation logic      | 1     | +15/-8  |
   ...
   ```
5. Read `plan.md` to extract all tasks with their file lists and descriptions (parse `### Task pNN-tNN:` headers and `**Files:**` blocks)

**Verify:**
- Filtering logic correctly excludes merge and bookkeeping commits
- Plan task extraction handles all three workflow modes

**Commit:**
```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "feat(p01-t03): implement commit collection and analysis step"
```

---

### Task p01-t04: Implement commit→task mapping (Step 3)

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Steps:**

Write Step 3 (Map Commits to Tasks) with the following logic:

1. For each commit, attempt mapping using signals in priority order:

   **Signal A — Task ID in commit message (→ High confidence):**
   ```
   Match pattern: (pNN-tNN) in commit message
   If found: map to that task with confidence=high
   ```

   **Signal B — File overlap (→ High/Medium/Low confidence):**
   ```
   For each unmatched commit:
     For each pending task in plan:
       overlap = |commit_files ∩ task_files| / |task_files|
       If overlap ≥ 0.8 and unique match: confidence=high
       If overlap ≥ 0.4: confidence=medium
       If overlap > 0: confidence=low
     Pick best match (highest overlap, break ties by plan order)
   ```

   **Signal C — Message keyword match (→ Medium confidence):**
   ```
   For each still-unmatched commit:
     Tokenize commit message and task name/description
     If ≥2 significant keyword matches: confidence=medium
   ```

   **Signal D — No match (→ Unmapped):**
   ```
   Remaining commits: confidence=unmapped
   ```

2. Handle multi-commit → single-task grouping:
   - If multiple commits map to the same task, group them
   - Use the latest commit SHA as the representative commit for the task entry
   - Combine file lists and outcomes

3. Present mapping report:
   ```
   OAT ▸ RECONCILE — Mapping Report

   Mapped commits:
   | Task      | Commits | Confidence | Files |
   |-----------|---------|------------|-------|
   | p01-t03   | abc1234, def5678 | high | 4 files |
   | p02-t01   | ghi9012 | medium | 2 files |

   Unmapped commits:
   | SHA     | Message               | Files |
   |---------|-----------------------|-------|
   | jkl3456 | update readme         | 1     |

   Tasks still pending (no commits matched):
   | Task    | Name                  |
   |---------|-----------------------|
   | p02-t02 | Add integration tests |

   Summary: 3/4 tasks addressed, 4/5 commits mapped, 1 unmapped
   ```

**Verify:**
- All four signal paths are implemented
- Multi-commit grouping logic is present
- Report format is clear and actionable

**Commit:**
```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "feat(p01-t04): implement commit-to-task mapping logic"
```

---

### Task p01-t05: Implement human-in-the-loop confirmation (Step 4)

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Steps:**

Write Step 4 (Confirm Mappings) with the following logic:

1. **High-confidence mappings**: Present as a batch for quick approval:
   ```
   The following high-confidence mappings were detected:
   - p01-t03 ← abc1234, def5678 (file overlap 90%)
   Accept all? [Yes / Review individually]
   ```

2. **Medium/Low-confidence mappings**: Present individually:
   ```
   Commit ghi9012: "fix validation logic" (2 files changed)
   Best match: p02-t01 "Add input validation" (confidence: medium, file overlap 60%)

   Options:
   1. Accept mapping to p02-t01
   2. Assign to different task: [list of unmatched tasks]
   3. Mark as unplanned work
   4. Skip (don't log this commit)
   ```

3. **Unmapped commits**: Ask for each:
   ```
   Commit jkl3456: "update readme" (1 file changed)
   No matching task found.

   Options:
   1. Assign to a task: [list of unmatched tasks]
   2. Log as unplanned work in implementation.md
   3. Skip (don't log)
   ```

4. **Task completion status**: For each mapped task, ask:
   ```
   Task p02-t01 "Add input validation" — mapped to 1 commit.
   Mark as: [Completed / In Progress (partial)]
   ```

5. Present final confirmed mapping summary before proceeding

**Verify:**
- All confidence levels have appropriate confirmation UX
- User can reassign, skip, or mark as unplanned at every step
- No artifact writes happen in this step

**Commit:**
```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "feat(p01-t05): implement human-in-the-loop confirmation flow"
```

---

### Task p01-t06: Implement artifact updates (Step 5)

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Steps:**

Write Step 5 (Update Artifacts) with the following logic:

1. **Read existing `implementation.md`**: Preserve all existing entries. Identify insertion points for new task entries.

2. **Generate task entries** for each confirmed mapping:
   ```markdown
   ### Task {task_id}: {Task Name}

   **Status:** {completed | in_progress}
   **Commit:** {sha} (reconciled)

   **Outcome (reconciled from manual implementation):**
   - {2-5 bullets derived from commit messages and diff summary}

   **Files changed:**
   - `{path}` - {inferred from diff}

   **Verification:**
   - Run: `{from plan task if available, else "manual verification recommended"}`
   - Result: {not verified — reconciled entry}

   **Notes / Decisions:**
   - Reconciled from manual implementation (commit {sha}, {date})
   - Mapping confidence: {high|medium|low}
   ```

3. **Generate unplanned work entries** (if user approved logging):
   ```markdown
   ### Unplanned: {commit message summary}

   **Status:** completed
   **Commit:** {sha} (unplanned)

   **Outcome:**
   - {derived from commit message and diff}

   **Files changed:**
   - `{path}` - {inferred from diff}

   **Notes:**
   - Not part of original plan. Logged during reconciliation on {date}.
   ```

4. **Update progress table** in `implementation.md`:
   - Recalculate completed task counts per phase
   - Update phase statuses (in_progress → complete if all tasks done)

5. **Update frontmatter**:
   - `implementation.md`: Set `oat_current_task_id` to the next pending task (or `null` if all complete)
   - `state.md`: Set `oat_current_task` to match, update `oat_phase_status` if needed

6. **Append to Implementation Log**:
   ```markdown
   ### {date}

   **Session Start:** reconciliation

   - [x] {task_id}: {task_name} - {sha} (reconciled)
   ...

   **What changed (high level):**
   - Reconciled {N} manually-implemented tasks from {M} commits

   **Decisions:**
   - Mapping confidence levels: {summary}
   - Unplanned work logged: {count}
   ```

**Verify:**
- Existing entries are preserved (append-only)
- Generated entries match template format
- Frontmatter pointers are consistent across artifacts

**Commit:**
```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "feat(p01-t06): implement artifact update logic"
```

---

### Task p01-t07: Implement bookkeeping commit and summary (Step 6)

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Steps:**

Write Step 6 (Commit and Report) with the following logic:

1. **Stage only tracking files**:
   ```bash
   git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md"
   # Only add plan.md if it was modified (unlikely but possible)
   ```

2. **Commit with reconciliation message**:
   ```bash
   git diff --cached --quiet || git commit -m "chore(oat): reconcile manual implementation ({first_task}..{last_task})"
   ```

3. **Refresh dashboard** (if `oat state refresh` is available):
   ```bash
   oat state refresh 2>/dev/null || true
   ```

4. **Print final summary**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    OAT ▸ RECONCILE — Complete
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Reconciled: {N} tasks from {M} commits
   Unplanned work logged: {K} entries
   Tasks still pending: {P}
   Next task: {next_task_id or "all tasks complete"}

   Tracking commit: {sha}

   Recommended next:
   - oat-project-review-provide (to review reconciled changes)
   - oat-project-implement (to continue with remaining tasks)
   - oat-project-progress (to check overall status)
   ```

**Verify:**
- Only tracking files are staged (no code files)
- Empty commit is avoided
- Summary accurately reflects reconciliation results

**Commit:**
```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "feat(p01-t07): implement bookkeeping commit and summary output"
```

---

## Phase 2: Integration and Polish

### Task p02-t01: Add skill to provider sync and AGENTS.md registration

**Files:**
- Modify: `AGENTS.md` (add to skills discovery if needed)
- Verify: `oat sync` picks up the new skill directory

**Steps:**

1. Run `oat sync --scope all --apply` to propagate the new skill to provider views
2. Verify skill appears in Claude rules, Cursor rules, and Codex config as appropriate
3. Verify `oat internal validate-oat-skills` passes with the new skill included

**Verify:**
- `pnpm run cli -- internal validate-oat-skills` passes
- Sync output includes the new skill

**Commit:**
```bash
git add -A  # sync-generated provider files
git commit -m "feat(p02-t01): register oat-project-reconcile in provider sync"
```

---

### Task p02-t02: Update oat-project-progress to recognize reconciliation state

**Files:**
- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Steps:**

1. Add a routing case: when `oat_phase: implement` and `implementation.md` has stale/missing entries relative to `plan.md` task count, suggest `oat-project-reconcile` as an option alongside `oat-project-implement`
2. Add reconciliation as a recommended skill in the implement-phase guidance:
   ```
   If artifacts appear out of sync with recent commits, consider running
   oat-project-reconcile before continuing implementation.
   ```

**Verify:**
- Progress routing still works correctly for normal (non-drifted) cases
- Reconciliation suggestion only appears when drift indicators are present

**Commit:**
```bash
git add .agents/skills/oat-project-progress/SKILL.md
git commit -m "feat(p02-t02): add reconciliation routing to oat-project-progress"
```

---

### Task p02-t03: Update backlog to mark item as in-progress

**Files:**
- Modify: `.oat/repo/reference/backlog.md`

**Steps:**

1. Move the "Reconcile manual implementation" item from Inbox to In Progress
2. Add project link: `.oat/projects/shared/oat-project-reconcile/`
3. Update the skill versioning item — add a note that it's already implemented and should be moved to completed

**Commit:**
```bash
git add .oat/repo/reference/backlog.md
git commit -m "chore(oat): update backlog for reconcile skill project"
```

---

### Task p02-t04: (review) Fix conflicting phase state across artifacts

**Files:**
- Modify: `.oat/projects/shared/oat-project-reconcile/state.md`
- Modify: `.oat/projects/shared/oat-project-reconcile/implementation.md`

**Step 1: Understand the issue**

Review finding: `state.md` sets `oat_phase_status: complete` while `implementation.md` is `oat_status: in_progress` with `oat_current_task_id: null`. The canonical flow keeps state as `implement/in_progress` until final review passes.
Location: `state.md:8`, `implementation.md:2`

**Step 2: Implement fix**

Set `state.md` `oat_phase_status: in_progress` (implementation tasks are done but final review has not passed). Ensure `implementation.md` `oat_status: in_progress` is consistent with this (correct as-is). Update `state.md` prose to reflect "awaiting final review" without claiming phase complete.

**Step 3: Verify**

Run: `grep -n 'oat_phase_status' .oat/projects/shared/oat-project-reconcile/state.md`
Expected: `oat_phase_status: in_progress`

**Step 4: Commit**

```bash
git add .oat/projects/shared/oat-project-reconcile/state.md .oat/projects/shared/oat-project-reconcile/implementation.md
git commit -m "fix(p02-t04): align phase status across state.md and implementation.md"
```

---

### Task p02-t05: (review) Fix append-only violation in reconcile skill Step 5

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Step 1: Understand the issue**

Review finding: Step 5 says to find the existing `### Task {task_id}` section and "replace the placeholder content", which contradicts the spec's non-destructive requirement to preserve existing task entries.
Location: `.agents/skills/oat-project-reconcile/SKILL.md:473`

**Step 2: Implement fix**

Change the Step 5 wording to augment/append rather than replace. If an existing task entry exists in `implementation.md`, the reconcile skill should:
- Preserve all existing content in that entry
- Append reconciled data below the existing content (clearly marked as reconciled)
- Never overwrite or remove existing logged history

**Step 3: Verify**

Run: `grep -n 'replace' .agents/skills/oat-project-reconcile/SKILL.md`
Expected: No instances of "replace the placeholder" or similar overwrite language in Step 5

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "fix(p02-t05): change Step 5 from replace to append-only reconciliation"
```

---

### Task p02-t06: (review) Add temporal-ordering mapping signal to reconcile skill

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Step 1: Understand the issue**

Review finding: The spec requires temporal ordering as the fourth mapping signal and low-confidence tiebreaker (`spec.md:30`). The skill jumps from keyword matching directly to `unmapped` without a temporal-ordering step.
Location: `.agents/skills/oat-project-reconcile/SKILL.md:273`

**Step 2: Implement fix**

Add Signal D (Temporal ordering) between keyword matching and unmapped:
- For still-unmatched commits, compare commit timestamp ordering against plan task ordering
- If a commit falls in a temporal window consistent with a pending task's position in the plan sequence, assign with confidence=low
- Rename current "Signal D — No match" to "Signal E — No match (→ Unmapped)"

**Step 3: Verify**

Run: `grep -n 'Signal [A-E]' .agents/skills/oat-project-reconcile/SKILL.md`
Expected: Signals A through E are present, with D being temporal ordering

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "fix(p02-t06): add temporal-ordering mapping signal per spec requirement"
```

---

### Task p02-t07: (review) Complete progress-router drift detection for all workflow modes

**Files:**
- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Step 1: Understand the issue**

Review finding: Plan p02-t02 requires a routing case that detects stale/missing `implementation.md` entries relative to `plan.md` and suggests `oat-project-reconcile` when drift is present. The actual change only adds advisory text to the spec-driven `implement/in_progress` row and leaves quick/import rows unchanged.
Location: `.agents/skills/oat-project-progress/SKILL.md:194`, `:205`, `:214`

**Step 2: Implement fix**

1. Add a concrete drift detection step: compare task count in `plan.md` vs completed entries in `implementation.md`; check for commits since last tracked SHA
2. Apply the reconciliation suggestion to quick-mode and import-mode routing rows, not just spec-driven
3. Make the suggestion conditional on actual drift indicators, not just generic advisory text

**Step 3: Verify**

Run: `grep -n 'reconcile\|drift\|stale' .agents/skills/oat-project-progress/SKILL.md`
Expected: Detection logic and reconcile suggestions present across all workflow mode routing rows

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-progress/SKILL.md
git commit -m "fix(p02-t07): add drift detection and reconcile routing for all workflow modes"
```

---

### Task p02-t08: (review) Mock permission-denied test instead of skipping under root

**Files:**
- Modify: `packages/cli/src/engine/edge-cases.test.ts`

**Step 1: Understand the issue**

Review finding: The early return skips the permission-denied test when running as UID 0, removing the only direct coverage of the `detectStrays()` permission-error translation path in root/container CI.
Location: `packages/cli/src/engine/edge-cases.test.ts:38`

**Step 2: Implement fix**

Replace the early-return skip with a mocked `readdir` failure that simulates EACCES regardless of the actual UID. This keeps the behavior covered in all environments.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/engine/edge-cases.test.ts`
Expected: Test passes (including under root)

**Step 4: Commit**

```bash
git add packages/cli/src/engine/edge-cases.test.ts
git commit -m "fix(p02-t08): mock readdir for permission-denied test instead of skipping"
```

---

### Task p02-t09: (review) Fix reconcile skill advancing phase status past review gate

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Step 1: Understand the issue**

Review finding: Step 5e writes `oat_phase_status: {complete if all tasks done}` to `state.md`, bypassing the final-review gate. A full reconciliation run would recreate the gate drift that p02-t04 fixed.
Location: `.agents/skills/oat-project-reconcile/SKILL.md:592`

**Step 2: Implement fix**

Change Step 5e to always keep `oat_phase_status: in_progress` after reconciliation, regardless of whether all tasks are reconciled. Add a comment noting that only `oat-project-review-receive` should advance to `complete` after final review passes.

**Step 3: Verify**

Run: `grep -n 'oat_phase_status' .agents/skills/oat-project-reconcile/SKILL.md`
Expected: No conditional `complete` assignment in Step 5e

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "fix(p02-t09): keep phase status in_progress after reconciliation"
```

---

### Task p02-t10: (review) Fix undefined PROJECT_PATH variable in progress drift detection

**Files:**
- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Step 1: Understand the issue**

Review finding: The skill defines `ACTIVE_PROJECT_PATH` in Step 3 but the drift-detection block uses `$PROJECT_PATH` which is never bound. The detection commands cannot be followed literally.
Location: `.agents/skills/oat-project-progress/SKILL.md:106`, `:186`

**Step 2: Implement fix**

Replace all `$PROJECT_PATH` references in the drift-detection block with `$ACTIVE_PROJECT_PATH` to match the variable defined in Step 3. Alternatively, add a binding `PROJECT_PATH="$ACTIVE_PROJECT_PATH"` at the start of the drift block.

**Step 3: Verify**

Run: `grep -n 'PROJECT_PATH' .agents/skills/oat-project-progress/SKILL.md`
Expected: All uses reference a variable that is defined in the skill

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-progress/SKILL.md
git commit -m "fix(p02-t10): use correct variable name in drift detection block"
```

---

### Task p02-t11: (review) Refresh stale implementation.md summary data

**Files:**
- Modify: `.oat/projects/shared/oat-project-reconcile/implementation.md`

**Step 1: Understand the issue**

Review finding: Phase 2 header still says `in_progress` despite 8/8 complete. Final Summary still references 4 mapping signals and 10 commits, which is stale after fix tasks p02-t04 through p02-t08.
Location: `.oat/projects/shared/oat-project-reconcile/implementation.md:197`, `:449`

**Step 2: Implement fix**

Update Phase 2 status to `complete` and refresh the `## Final Summary (for PR/docs)` section to reflect: 5 mapping signals, 15 total tasks, mocked permission test, drift detection in all modes, append-only reconciliation.

**Step 3: Verify**

Run: `grep -n 'in_progress\|four.*signal\|10.*commit' .oat/projects/shared/oat-project-reconcile/implementation.md`
Expected: No stale references

**Step 4: Commit**

```bash
git add .oat/projects/shared/oat-project-reconcile/implementation.md
git commit -m "fix(p02-t11): refresh stale Phase 2 and Final Summary in implementation.md"
```

---

### Task p02-t12: (review) Replace hardcoded progress table in reconcile Step 5d

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Step 1: Understand the issue**

Review finding: Step 5d shows a literal two-row progress table with fixed task totals (7 and 3). On projects with different phase counts, this instruction writes wrong data.
Location: `.agents/skills/oat-project-reconcile/SKILL.md:569`

**Step 2: Implement fix**

Replace the literal table with dynamic enumeration instructions: read all `## Phase N:` sections from `implementation.md`, count tasks per phase from plan.md `### Task pNN-tNN:` headers, count completed entries, and regenerate the table from actual data.

**Step 3: Verify**

Run: `grep -A5 '5d\. Update progress' .agents/skills/oat-project-reconcile/SKILL.md`
Expected: No hardcoded phase counts or task totals

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "fix(p02-t12): replace hardcoded progress table with dynamic enumeration"
```

---

### Task p02-t13: (review) Add explicit plan-vs-implementation count comparison for drift detection

**Files:**
- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Step 1: Understand the issue**

Review finding: `PLAN_TASKS` and `IMPL_COMPLETED` are collected but never compared in the drift indicators. The conditions fall back to commit heuristics only.
Location: `.agents/skills/oat-project-progress/SKILL.md:187`

**Step 2: Implement fix**

Add `PLAN_TASKS > IMPL_COMPLETED` as the first drift indicator condition (most direct signal). Keep the existing commit-based heuristics as secondary indicators.

**Step 3: Verify**

Run: `grep -A10 'Drift indicators' .agents/skills/oat-project-progress/SKILL.md`
Expected: First condition uses PLAN_TASKS vs IMPL_COMPLETED comparison

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-progress/SKILL.md
git commit -m "fix(p02-t13): add plan-vs-implementation count comparison for drift detection"
```

### Task p02-t14: (review) Clarify bookkeeping filter glob pattern in reconcile SKILL.md

**Files:**
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Step 1: Understand the issue**

Review finding: Step 2 filtering uses `*.oat/*/...` glob-style notation which is misleading since project paths are nested deeper (`.oat/projects/shared/{name}/...`).
Location: `.agents/skills/oat-project-reconcile/SKILL.md:234`

**Step 2: Implement fix**

Update the filtering description to use `**` recursive glob or describe it as "files under any `.oat/` subdirectory" matching the tracking artifact filenames.

**Step 3: Verify**

Run: `grep -n 'oat/' .agents/skills/oat-project-reconcile/SKILL.md | head -20`
Expected: Updated pattern uses recursive notation or prose description

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "fix(p02-t14): clarify bookkeeping filter glob pattern in reconcile skill"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| final | code | passed | 2026-03-07 | reviews/final-review-2026-03-07-v4.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 7 tasks — Core skill implementation (checkpoint detection, commit analysis, task mapping, confirmation flow, artifact updates, bookkeeping)
- Phase 2: 14 tasks — Integration (3 original + 11 review fix tasks)

**Total: 21 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Spec: `spec.md`
- Backlog item: `.oat/repo/reference/backlog.md` (Inbox, P1, "Reconcile manual implementation")
- Related skill: `.agents/skills/oat-project-implement/SKILL.md`
- Templates: `.oat/templates/implementation.md`
