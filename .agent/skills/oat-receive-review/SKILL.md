---
name: oat-receive-review
description: Use after running oat-request-review - when a review artifact exists and findings need to be converted into actionable plan tasks for gap closure
disable-model-invocation: true
user-invocable: true
---

# Receive Review

Process review findings into actionable plan tasks and guide gap closure execution.

## Purpose

Turn review output into plan changes and a clear next action. This closes the feedback loop between reviewing and fixing.

## Prerequisites

**Required:** A review artifact exists in `{PROJECT_PATH}/reviews/`.

## Mode Assertion

**OAT MODE: Receive Review**

**Purpose:** Convert review findings into plan tasks for systematic gap closure.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ RECEIVE REVIEW
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Before multi-step work (parsing findings, updating artifacts, committing), print 2–5 short step indicators, e.g.:
  - `[1/4] Reading review artifact…`
  - `[2/4] Converting findings → plan tasks…`
  - `[3/4] Updating plan.md + implementation.md…`
  - `[4/4] Committing + next-step summary…`
- For long-running operations (large review artifacts, many findings), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

**BLOCKED Activities:**
- No fixing issues directly (convert to tasks first)
- No skipping findings
- No re-reviewing

**ALLOWED Activities:**
- Reading review artifacts
- Updating plan.md with new tasks
- Updating implementation.md
- Routing to oat-implement

## Process

### Step 0: Resolve Active Project

OAT stores the active project path in `.oat/active-project` (single line, local-only).

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".agent/projects")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**
- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future use:
  ```bash
  mkdir -p .oat
  echo "$PROJECT_PATH" > .oat/active-project
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Locate Review Artifact

```bash
ls -t "$PROJECT_PATH/reviews/"*.md 2>/dev/null | head -10
```

**If no review files:** Block and ask user to run `/oat:request-review` first.

**If multiple candidates:**
- Show list sorted by date (newest first)
- Ask user to choose which review to process
- Default to most recent if user confirms

**Read the selected review file completely.**

### Step 2: Parse Findings into Buckets

Extract findings from the review artifact and categorize:

**Critical (must fix before merge):**
- Missing P0 requirements
- Security vulnerabilities
- Broken functionality
- Missing tests for critical paths

**Important (should fix before merge):**
- Missing P1 requirements
- Missing error handling
- Significant maintainability issues

**Minor (fix if time permits):**
- P2 requirements
- Style issues
- Documentation gaps

**Count findings:**
```
Critical: {N}
Important: {N}
Minor: {N}
```

**If Critical + Important == 0:**
- Mark the review as `passed` in the plan.md Reviews table (if plan.md exists)
- No fix tasks are added
- Route user to the next action:
  - If scope is `final`: prompt for PR (or run `/oat:pr-project` when available)
  - Otherwise: continue normal implementation
  - Note: `passed` means “review passed” (not merely “fixes completed”). If fixes exist, use `fixes_completed` until a re-review passes.

### Step 3: Determine Task Scope

**Which phase should receive fix tasks?**

1. Check review scope from artifact frontmatter (`oat_review_scope`)
2. If scope is `pNN` (phase) or `pNN-tNN` (task): add fix tasks to that phase
3. If scope is `final` or range: add fix tasks to a new "Review Fixes" phase or the last phase

**If the review type is `artifact`:**
- Prefer to add fix tasks as documentation tasks (update spec/design/plan) only if plan.md exists.
- If plan.md does NOT exist yet (early artifact review), do NOT invent a plan. Instead:
  - Tell the user to apply the review changes directly to the artifact
  - Then re-run the relevant phase skill to continue (spec/design/plan), or re-request an artifact re-review.

### Step 4: Determine Next Task IDs

Read plan.md to find the last task ID in the target phase:

```bash
# Example for phase p03:
# grep -E "^### Task p03-t[0-9]+:" "$PROJECT_PATH/plan.md" | tail -5
grep -E "^### Task ${TARGET_PHASE}-t[0-9]+:" "$PROJECT_PATH/plan.md" | tail -5
```

**Numbering convention:**
- Find highest task number in target phase (e.g., `p03-t08`)
- New tasks continue sequentially: `p03-t09`, `p03-t10`, etc.

### Step 5: Convert Findings to Tasks

**For each Critical and Important finding:**

Create a plan task entry:

```markdown
### Task {task_id}: (review) {Finding title}

**Files:**
- Modify: `{file from finding}`

**Step 1: Understand the issue**

Review finding: {issue description from review}
Location: `{file}:{line}`

**Step 2: Implement fix**

{Fix guidance from review}

**Step 3: Verify**

Run: `{verification command from review or standard test command}`
Expected: {expected outcome}

**Step 4: Commit**

```bash
git add {files}
git commit -m "fix({task_id}): {description}"
```
```

**Task naming:**
- Prefix with `(review)` to indicate review-generated task
- Use active verb: "Fix...", "Add...", "Update..."

### Step 6: Update Plan.md

Add new tasks to plan.md in the target phase.

**Keep plan runnable:**
- Do NOT leave plan.md in a state that blocks `/oat:implement`.
- Ensure plan.md frontmatter remains:
  - `oat_status: complete`
  - `oat_ready_for: oat-implement`

**Keep plan internally consistent:**
- If the plan contains an `## Implementation Complete` summary (phase counts, total task count), update it to reflect any newly added review fix tasks.
- If the plan has phase headings that include task counts (or other rollups), update those rollups as well.

**Update Reviews section:**
```markdown
## Reviews
- Update or add a row for `{scope}` in the Reviews table:
  - Status: `fixes_added` (if tasks were added) or `passed` (if no Critical/Important)
  - Date: `{today}`
  - Artifact: `reviews/{filename}.md`
```

**Status semantics (v1):**
- `fixes_added`: fix tasks were created and added to the plan
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review completed and recorded as passing

### Step 7: Update Implementation.md

Add a note to implementation.md:

```markdown
### Review Received: {scope}

**Date:** {today}
**Review artifact:** reviews/{filename}.md

**Findings:**
- Critical: {N}
- Important: {N}
- Minor: {N}

**New tasks added:** {task_ids}

**Next:** Execute fix tasks via /oat:implement.

After the fix tasks are complete:
- Update the review row status to `fixes_completed`
- Re-run `/oat:request-review {type} {scope}` then `/oat:receive-review` to reach `passed`
```

### Step 8: Check Review Cycle Count

**Bounded loop protection:**

Count how many review cycles have occurred for this scope:

```bash
ls "$PROJECT_PATH/reviews/"*"$SCOPE_TOKEN"*.md 2>/dev/null | wc -l
```

**If 3 or more cycles:**
```
⚠️  Review cycle limit reached (3 cycles).

This scope has been reviewed {N} times. Further automated review cycles are blocked.

Options:
1. Review findings manually and decide which to address
2. Proceed to PR with current state
3. Request explicit user override to continue

Choose an option:
```

**If under limit:** Proceed normally.

### Step 9: Handle Minor Findings

Minor findings are NOT converted to tasks by default.

**Ask user:**
```
{N} minor findings not converted to tasks:
- {Finding 1 summary}
- {Finding 2 summary}
...

Options:
1. Defer all minor findings (default)
2. Select specific minors to convert to tasks
3. Convert all minors to tasks

Choose:
```

**If deferred:** Add to implementation.md "Deferred Findings" section.

### Step 10: Route to Next Action

**Ask user:**
```
Review processed for {project-name}.

Added {N} fix tasks:
- {task_id}: {description}
- {task_id}: {description}
...

Options:
1. Execute fix tasks now (/oat:implement)
2. Review the plan first (then manually run /oat:implement)
3. Exit (tasks added, execute later)

Choose:
```

**If execute now:**
- Update state.md: `oat_phase_status: in_progress`
- Tell user: "Run `/oat:implement` to execute fix tasks starting from {first_fix_task_id}"
- Or directly invoke `/oat:implement` if environment supports skill chaining

**If review first:**
- Tell user: "Review `plan.md`, then run `/oat:implement` when ready"

**If exit:**
- Tell user: "Fix tasks added to plan. Run `/oat:implement` when ready."

### Step 11: Output Summary

```
Review received for {project-name}.

Review: {review_filename}
Scope: {scope}
Findings: {N} critical, {N} important, {N} minor

Actions taken:
- Added {N} fix tasks to plan.md ({task_ids})
- Updated implementation.md with review notes
- Deferred {N} minor findings

Review cycle: {N} of 3

Next: {recommended action based on user choice}
```

## Re-Review Scoping

After fix tasks are executed, if another review is requested:

**Default scope for re-review:** Fix tasks only (not full phase)

This prevents reviewing already-approved code and focuses the reviewer on just the fixes.

**How it works:**
1. When `/oat:request-review` is called after fix tasks exist
2. It detects `(review)` tasks in plan.md for the scope
3. It offers: "Scope to fix tasks only? (Y/n)"
4. If yes: scope is just the fix task commits

## Success Criteria

- Active project resolved
- Review artifact located and read
- Findings parsed and categorized
- Fix tasks created for Critical/Important findings
- Plan.md updated with new tasks
- Implementation.md updated with review notes
- Review cycle count checked (cap at 3)
- User routed to next action
- Minor findings handled (converted or deferred)
