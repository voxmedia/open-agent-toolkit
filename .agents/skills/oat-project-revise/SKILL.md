---
name: oat-project-revise
version: 1.0.0
description: Use when a project has an open PR and human feedback needs to be incorporated. Creates revision tasks and re-enters implementation.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Project Revise

Accept post-PR human feedback and create revision tasks without starting a new project.

## Purpose

Provide a clean re-entry point for post-PR feedback. Routes inline feedback, GitHub PR comments, or review artifacts into revision tasks, manages state transitions (`pr_open` ↔ `in_progress`), and ensures agents understand the project is in revision mode — not done.

## Prerequisites

**Required:** Active project with `plan.md` and `implementation.md`.

## Mode Assertion

**OAT MODE: Revision**

**Purpose:** Accept feedback, create revision tasks, manage state for implementation re-entry.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ REVISE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/4] Resolving project + checking state…`
  - `[2/4] Detecting feedback source…`
  - `[3/4] Creating revision tasks…`
  - `[4/4] Updating state + routing to implement…`

**BLOCKED Activities:**

- ❌ No direct code implementation (create tasks, don't fix)
- ❌ No severity classification for inline feedback (that's for review-receive)
- ❌ No starting a new project

**ALLOWED Activities:**

- ✅ Reading project artifacts
- ✅ Creating revision phases and tasks in plan.md
- ✅ Updating implementation.md and state.md
- ✅ Delegating to review-receive skills for structured feedback
- ✅ Routing to oat-project-implement for execution

**Self-Correction Protocol:**
If you catch yourself:

- Implementing fixes directly → STOP (create tasks, route to implement)
- Classifying inline feedback by severity → STOP (all inline items become tasks)
- Starting a new project → STOP (this IS the existing project)

**Recovery:**

1. Acknowledge the deviation
2. Return to task creation
3. Route to implement for execution

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future use:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Validate Project State

Read `"$PROJECT_PATH/state.md"` frontmatter.

**Accepted entry states for `oat_phase_status`:**

- `pr_open` — expected happy path (PR is open, human has feedback)
- `in_progress` — permissive (revision tasks may already be in progress)
- `complete` — permissive (implementation complete, user wants changes before PR)

All three are valid. No additional confirmation needed.

### Step 2: Pre-PR Guard

Check if a PR artifact exists:

```bash
ls "$PROJECT_PATH/pr/project-pr-"*.md 2>/dev/null
```

**If no PR artifact found:**

- Warn: "No PR has been created yet. Revise is designed for post-PR feedback. Continue anyway?"
- If user declines: exit
- If user confirms: proceed (revision workflow is valid for pre-PR inline feedback, just potentially premature)

### Step 3: Detect Feedback Source

Ask the user or infer from context:

```
How would you like to provide feedback?

1. Inline (describe changes here)
2. GitHub PR comments (fetch from PR)
3. Review artifact (process existing review)
```

**Detection heuristics:**

- If the user already typed feedback in the invocation → inline path
- If the user mentions a PR number or "GitHub" → GitHub PR path
- If the user references a review file → review artifact path
- If ambiguous → ask

### Step 4: Inline Feedback Path

**This is the new behavior that revise adds. For structured feedback, see Step 5.**

#### 4a: Parse Feedback

Parse the user's inline feedback into discrete change items. Each distinct change becomes one task.

**No severity classification.** Unlike review-receive, inline feedback does not use Critical/Important/Medium/Minor triage. The user is telling us directly what to change — all items become tasks.

The agent may ask clarifying questions about ambiguous feedback.

#### 4b: Determine Revision Phase Number

```bash
# Count existing revision phases in plan.md
existing_revs=$(grep -c "^## Phase p-rev" "$PROJECT_PATH/plan.md" 2>/dev/null || echo "0")
next_rev_num=$((existing_revs + 1))
next_rev="p-rev${next_rev_num}"
```

#### 4c: Create Revision Phase in plan.md

Insert the new phase **before** `## Implementation Complete` (that section is the terminal summary and must remain last).

````markdown
## Phase p-rev{N}: Revision {N}

Source: inline feedback ({today})

### Task prev{N}-t01: (revision) {Change description}

**Files:**

- Modify: `{file}`

**Step 1:** {What to change}

**Step 2: Verify**
Run: `{verification command}`
Expected: {expected outcome}

**Step 3: Commit**

```bash
git add {files}
git commit -m "fix(prev{N}-t01): {description}"
```
````

````

**Task naming:** Prefix with `(revision)` — following the `(review)` convention in review-receive.

**Task IDs:** `prev{N}-t{NN}` format (e.g., `prev1-t01`, `prev1-t02`).

#### 4d: Update plan.md Totals

Update `## Implementation Complete` section to include the new revision phase and tasks in the totals.

#### 4e: Update implementation.md

Update frontmatter to point at the first revision task so `oat-project-implement` resumes correctly:

- `oat_current_task_id: prev{N}-t01`
- `oat_status: in_progress`

Update the Progress Overview table to include the new revision phase (e.g., add a `Phase p-rev{N}` row with task count and `in_progress` status).

Add a "Revision Received" entry:

```markdown
### Revision Received: Inline Feedback

**Date:** {today}
**Source:** inline conversation

**Changes requested:**
- {item 1}
- {item 2}

**New tasks added:** {task_ids}

**Next:** Execute revision tasks via the `oat-project-implement` skill.
````

#### 4f: Update state.md

- `oat_phase_status: in_progress`
- `oat_current_task: prev{N}-t01`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

#### 4g: Route to Implement

Tell the user: "Revision tasks created. Run the `oat-project-implement` skill to execute them starting from {first_task_id}."

Or directly invoke `oat-project-implement` if environment supports skill chaining.

### Step 5: Delegated Feedback Paths

For structured feedback from GitHub or review artifacts, revise delegates to existing skills but adds state management.

#### 5a: Set State for Delegation

Update state.md:

- `oat_phase_status: in_progress`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

This is the key value revise adds: state transition management so agents know the project is in revision mode.

#### 5b: Delegate

- **GitHub PR feedback:** Delegate to `oat-project-review-receive-remote`
- **Review artifact feedback:** Delegate to `oat-project-review-receive`

These skills use their existing conventions: `(review)` task prefix, severity classification, standard task IDs appended to the last plan phase. This is correct — structured review feedback should go through the structured triage model.

#### 5c: Post-Delegation State

After the delegated skill completes:

- **If fix tasks were added:** State stays `in_progress`. Route to `oat-project-implement`.
- **If no actionable findings:** Return to `pr_open`:
  - `oat_phase_status: pr_open`
  - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
  - Next milestone: "PR is open. Run oat-project-revise for more feedback or oat-project-complete when approved."

### Step 6: Commit Bookkeeping

```bash
git add "$PROJECT_PATH/plan.md" "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "chore(oat): create revision tasks for {project-name}"
```

### Step 7: Output Summary

```
Revision created for {project-name}.

Source: {inline | github-pr | review-artifact}
Phase: {p-revN}
Tasks: {N} revision tasks created
  - {task_id}: {description}
  - {task_id}: {description}

State: in_progress
Next: Run the oat-project-implement skill to execute revision tasks.

After revision tasks complete:
- State returns to pr_open
- Push changes to update the PR
- Run oat-project-revise for more feedback or oat-project-complete when approved
```

## After Revision Tasks Complete

**This is handled by `oat-project-implement`, not by this skill.**

When all tasks in a `p-revN` phase complete, the implement skill:

1. Sets `oat_phase_status: pr_open` (not `complete`)
2. Sets `oat_current_task: null`
3. Invokes `oat-project-summary` to update summary.md if it exists
4. Sets next milestone: "Revision complete. Push changes to update PR. Run oat-project-revise for more feedback or oat-project-complete when approved."

## Success Criteria

- Active project resolved and validated
- Feedback source detected and routed correctly
- Inline feedback creates `p-revN` revision phases with `prevN-tNN` task IDs
- Revision phases inserted before `## Implementation Complete`
- Plan totals updated to include revision work
- Implementation.md updated with revision notes
- State transitions managed: `pr_open` → `in_progress` (with clear return path)
- Delegated paths use existing review-receive conventions
- User routed to implement for task execution
