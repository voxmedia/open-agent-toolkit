---
name: oat-implement
description: Execute implementation plan task-by-task with state tracking and TDD discipline
---

# Implementation Phase

Execute the implementation plan task-by-task with full state tracking.

## Prerequisites

**Required:** Complete implementation plan. If missing, run `/oat:plan` first.

## Mode Assertion

**OAT MODE: Implementation**

**Purpose:** Execute plan tasks with TDD discipline, track progress, handle blockers.

**BLOCKED Activities:**
- No skipping tasks
- No changing plan structure
- No scope expansion

**ALLOWED Activities:**
- Executing tasks in order
- Making minor adaptations within task scope
- Logging decisions and issues
- Marking blockers for user review

**Self-Correction Protocol:**
If you catch yourself:
- Skipping ahead in tasks → STOP (execute in order)
- Expanding scope → STOP (log as "deferred")
- Changing plan structure → STOP (update plan.md first)

**Recovery:**
1. Acknowledge the deviation
2. Return to current task
3. Document in implementation.md

## Process

### Step 0: Resolve Active Project

OAT stores the active project path in `.oat/active-project` (single line, local-only).

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
```

**If `PROJECT_PATH` is missing/invalid:**
- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `.agent/projects/{project-name}`
- Write it for future phases:
  ```bash
  mkdir -p .oat
  echo "$PROJECT_PATH" > .oat/active-project
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Check Plan Complete

```bash
cat "$PROJECT_PATH/plan.md" | head -10 | grep "oat_status:"
```

**Required frontmatter:**
- `oat_status: complete`
- `oat_ready_for: oat-implement`

**If not complete:** Block and ask user to finish plan first.

### Step 2: Read Plan Document

Read `"$PROJECT_PATH/plan.md"` completely to understand:
- All phases and tasks
- File changes per task
- Verification commands
- Commit messages

### Step 3: Check Implementation State

Check if implementation already started:

```bash
cat "$PROJECT_PATH/implementation.md" 2>/dev/null | head -20
```

**If exists and has progress:**
- Read `oat_current_task_id` from frontmatter (e.g., "p01-t03")
- Resume from that task
- Ask user: "Resume from {task_id} or start fresh?"

**If doesn't exist:**
- Initialize from template (Step 4)

### Step 4: Initialize Implementation Document

Copy template: `.oat/templates/implementation.md` → `"$PROJECT_PATH/implementation.md"`

Update frontmatter:
```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: {today}
oat_current_task_id: p01-t01  # Stable task ID from plan
---
```

### Step 5: Execute Current Task

For the current task in plan.md:

**5a. Announce task:**
```
Starting {task_id}: {Task Name}
Files: {file list}
```

**5b. Follow steps exactly:**
- Read each step from plan
- Execute as specified
- Run verification commands

**5c. Apply TDD discipline:**
1. Write test first (if applicable)
2. Run tests → expect red
3. Write implementation
4. Run tests → expect green
5. Refactor if needed

**5d. Handle issues:**
- If step unclear → ask user
- If verification fails → debug and retry
- If blocked → mark task as blocked, note reason

### Step 6: Commit Task

After task verification passes:

```bash
git add {files from plan}
git commit -m "{commit message from plan}"
```

Store commit SHA for implementation.md.

### Step 7: Update Implementation State

After each task:

**Update frontmatter:**
```yaml
oat_current_task_id: {next_task_id}  # e.g., p01-t02
oat_last_updated: {today}
```

**Update task entry:**
```markdown
### Task {task_id}: {Task Name}

**Status:** completed
**Commit:** {sha}

**Notes:**
- {Any implementation notes}
```

**Update progress overview table.**

### Step 8: Check Plan Phase Completion

When all tasks in current plan phase complete (e.g., all p01-* tasks done):

**Update frontmatter:**
```yaml
oat_current_task_id: {first_task_of_next_phase}  # e.g., p02-t01
```

**Plan phase checkpoint:**
At the end of each plan phase (p01, p02, etc.), check `oat_plan_hil_phases` in plan.md:

- **If `oat_plan_hil_phases` is empty or missing:** Stop at every phase boundary (default behavior)
- **If `oat_plan_hil_phases` has values:** Only stop at listed phases (e.g., `["p01", "p04"]`)

When stopping:
- Output phase summary (tasks completed, commits made)
- Ask user: "Phase {N} ({phase_name}) complete. Continue to next phase?"
- Wait for user approval before proceeding to next plan phase

**Note on HiL types:**
- **Workflow HiL** (`oat_hil_checkpoints` in state.md): Gates between workflow phases (discovery → spec → design → plan → implement). Checked by oat-progress router.
- **Plan phase checkpoints** (`oat_plan_hil_phases` in plan.md): Gates at plan phase boundaries during implementation. Default: stop at every phase. Configure to stop only at specific phases.

### Step 9: Repeat Until Complete

Continue Steps 5-8 until all plan phases complete.

**Batch execution:**
- Default: Execute tasks one at a time
- If user requests: Execute N tasks before checking in
- Stop at configured plan phase boundaries for review

### Step 10: Handle Blockers

If a task cannot be completed:

**Mark as blocked:**
```yaml
oat_blockers:
  - task_id: {task_id}  # e.g., p01-t03
    reason: "{description}"
    since: {date}
```

**Update task status:**
```markdown
### Task {task_id}: {Task Name}

**Status:** blocked
**Blocker:** {description}
```

**Notify user:**
```
Task {task_id} blocked: {reason}

Options:
1. Resolve blocker and continue
2. Skip task (mark as deferred)
3. Modify plan to address blocker
```

### Step 11: Mark Implementation Complete

When all plan phases complete:

Update frontmatter:
```yaml
---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: {today}
---
```

### Step 12: Update Project State

Update `"$PROJECT_PATH/state.md"`:

**Frontmatter updates:**
- `oat_current_task: null`
- `oat_last_commit: {final_commit_sha}`
- `oat_blockers: []`
- `oat_phase: implement`
- `oat_phase_status: complete`
- **If** `"implement"` is in `oat_hil_checkpoints`: append `"implement"` to `oat_hil_completed` array

**Note:** Only append to `oat_hil_completed` when the phase is configured as a HiL gate.

Update content:
```markdown
## Current Phase

Implementation - Complete

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ✓ Plan complete
- ✓ Implementation complete
```

### Step 13: Final Verification

Run project-wide verification:

```bash
# Run tests
pnpm test

# Run lint
pnpm lint

# Run type check
pnpm type-check

# Run build
pnpm build
```

All must pass before proceeding.

### Step 14: Trigger Final Review

**At the final plan phase boundary, a code review is required before PR.**

Check if final review already completed (preferred source of truth: plan.md Reviews table):
```bash
FINAL_ROW=$(grep -E "^\\|\\s*final\\s*\\|" "$PROJECT_PATH/plan.md" 2>/dev/null | head -1)
echo "$FINAL_ROW"
```

**If final review row exists and status is `passed`:**
- Example row:
  - `| final | code | passed | 2026-01-28 | reviews/final-review-2026-01-28.md |`
- Check:
  ```bash
  echo "$FINAL_ROW" | grep -qE "^\\|\\s*final\\s*\\|.*\\|\\s*passed\\s*\\|" && echo "passed"
  ```
- Skip to Step 15 (PR prompt)

**If final review is not marked `passed`:**
- Tell user: "All tasks complete. Final review required before PR."
- Offer review options (3-tier capability model):

```
Implementation complete. Final review required.

Review options:
1. Run review via subagent (recommended if available)
2. Run review in fresh session (recommended fallback)
3. Run review inline (less reliable)

Choose, or run: /oat:request-review code final
```

**After user chooses:**
- If subagent/fresh session: User runs `/oat:request-review code final` in appropriate context
- If inline: Proceed with inline review per oat-request-review skill
- After review: User runs `/oat:receive-review` to process findings
- If Critical/Important findings: Fix tasks added, re-run `/oat:implement`
- Loop until final review passes (max 3 cycles per oat-receive-review)

### Step 15: Prompt for PR

After final review passes (no Critical/Important findings):

```
Final review passed for {project-name}.

All tasks complete and verified. Ready to create PR.

Options:
1. Open PR now (will generate PR description from OAT artifacts)
2. Exit (create PR manually later)

Choose:
```

**If user chooses to open PR:**
- Prefer using `/oat:pr-project` to generate a final PR description from OAT artifacts:
  ```
  /oat:pr-project
  ```
- If the environment cannot run skills for any reason, fall back to manual PR creation:
  ```
  To create PR manually:
  1. Push branch: git push -u origin {branch}
  2. Create PR with summary from implementation.md
  3. Reference: spec.md, design.md for context
  ```

### Step 16: Output Summary

```
Implementation complete for {project-name}.

Summary:
- Phases: {N} completed
- Tasks: {N} completed
- Commits: {N} created

Final verification:
- Tests: ✓ passing
- Lint: ✓ clean
- Types: ✓ valid
- Build: ✓ success

Final review:
- Status: ✓ passed
- Artifact: reviews/final-review-{date}.md

Next: Create PR or run /oat:pr-project (when available)
```

## Success Criteria

- All tasks executed in order
- TDD discipline followed
- Each task has a commit
- Implementation.md tracks all progress
- Final verification passes
- Final review passes (no Critical/Important findings)
- No unresolved blockers
