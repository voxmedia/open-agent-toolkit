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

### Step 1: Check Plan Complete

```bash
cat .agent/projects/{project-name}/plan.md | head -10 | grep "oat_status:"
```

**Required frontmatter:**
- `oat_status: complete`
- `oat_ready_for: oat-implement`

**If not complete:** Block and ask user to finish plan first.

### Step 2: Read Plan Document

Read `.agent/projects/{project-name}/plan.md` completely to understand:
- All phases and tasks
- File changes per task
- Verification commands
- Commit messages

### Step 3: Check Implementation State

Check if implementation already started:

```bash
cat .agent/projects/{project-name}/implementation.md 2>/dev/null | head -20
```

**If exists and has progress:**
- Read `oat_current_task_id` from frontmatter (e.g., "p01-t03")
- Resume from that task
- Ask user: "Resume from {task_id} or start fresh?"

**If doesn't exist:**
- Initialize from template (Step 4)

### Step 4: Initialize Implementation Document

Copy template: `.oat/templates/implementation.md` → `.agent/projects/{project-name}/implementation.md`

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

**Plan phase checkpoint (always):**
At the end of each plan phase (p01, p02, etc.):
- Output phase summary (tasks completed, commits made)
- Ask user: "Phase {N} ({phase_name}) complete. Continue to next phase?"
- Wait for user approval before proceeding to next plan phase

**Note on HiL types:**
- **Workflow HiL** (`oat_hil_checkpoints` in state.md): Gates between workflow phases (discovery → spec → design → plan → implement). Checked by oat-progress router.
- **Plan phase checkpoints**: Always occur at plan phase boundaries during implementation. Not configurable - always stop and check in.

### Step 9: Repeat Until Complete

Continue Steps 5-8 until all plan phases complete.

**Batch execution:**
- Default: Execute tasks one at a time
- If user requests: Execute N tasks before checking in
- Always stop at plan phase boundaries for review

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

When all phases complete:

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

Update `.agent/projects/{project-name}/state.md`:

**Frontmatter updates:**
- `oat_current_task: null`
- `oat_last_commit: {final_commit_sha}`
- `oat_blockers: []`
- `oat_phase: implement`
- `oat_phase_status: complete`
- Append `"implement"` to `oat_hil_completed` array (do not overwrite existing entries)

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

All must pass before marking complete.

### Step 14: Output Summary

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

Ready for code review and merge.
```

## Success Criteria

- All tasks executed in order
- TDD discipline followed
- Each task has a commit
- Implementation.md tracks all progress
- Final verification passes
- No unresolved blockers
