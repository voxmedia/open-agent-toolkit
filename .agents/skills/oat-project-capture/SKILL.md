---
name: oat-project-capture
version: 1.0.0
description: Use when work happened outside the OAT project workflow and needs retroactive project tracking. Creates a full project from an existing branch and conversation context.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Capture Untracked Work

Retroactively create an OAT project from work that happened outside the structured workflow. Populates `discovery.md` from conversation context and `implementation.md` from commit history, producing a tracked project ready for review or PR.

## When to Use

Use when:

- Work was done in a mobile/cloud session without OAT project tracking
- A quick fix or ad-hoc brainstorm turned into real implementation
- You want to create a PR from untracked work using OAT's review/PR workflow

## When NOT to Use

Don't use when:

- A project already exists for the current branch — use `oat-project-reconcile` instead
- You haven't started any work yet — use `oat-project-quick-start` or `oat-project-new`
- You only need to map new commits to an existing plan — use `oat-project-reconcile`

## Prerequisites

- Active git branch with at least one commit beyond the base branch
- Conversation context available (the agent has been part of the work session)

## Mode Assertion

**OAT MODE: Capture**

**Purpose:** Analyze existing commits and conversation context to create retroactive project artifacts. No new implementation code — only artifact population and state updates.

**BLOCKED Activities:**

- No new implementation code
- No retroactive plan authoring (the work is already done; the scaffold-created `plan.md` template is acceptable)
- No spec or design artifacts (capture is retroactive, not forward-looking)

**ALLOWED Activities:**

- Project scaffolding via `oat project new`
- Populating `discovery.md` from conversation context
- Populating `implementation.md` from commit history
- State updates and dashboard refresh

**Self-Correction Protocol:**
If you catch yourself:

- Writing implementation code → STOP and return to artifact population
- Authoring plan content in `plan.md` → STOP (the scaffold template is fine, but don't write retroactive plan tasks)
- Expanding into spec/design authoring → STOP (capture is retroactive)

**Recovery:**

1. Re-focus on populating `discovery.md` and `implementation.md` from existing work
2. Route any remaining implementation to normal workflow skills

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ CAPTURE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators with the `[N/N]` format:
  - `[1/7] Resolving branch context…`
  - `[2/7] Inferring project name…`
  - `[3/7] Analyzing branch commits…`
  - `[4/7] Scaffolding project…`
  - `[5/7] Synthesizing discovery from conversation…`
  - `[6/7] Capturing implementation from commits…`
  - `[7/7] Setting lifecycle state + refreshing dashboard…`

## Process

### Step 0: Resolve Context

Resolve project root and detect branch context:

```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
# Try main, then master, then remote HEAD as base
BASE_BRANCH=$(git rev-parse --verify main 2>/dev/null && echo main || (git rev-parse --verify master 2>/dev/null && echo master || git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'))
COMMIT_COUNT=$(git rev-list --count "${BASE_BRANCH}..HEAD")
```

**Validate:**

- If `COMMIT_COUNT` is 0, inform the user: "No commits found beyond `{BASE_BRANCH}`. There's nothing to capture yet."
- If on `main` or `master`, warn: "You're on the base branch. Switch to a feature branch before capturing."

### Step 1: Infer Project Name

Propose a project name based on **conversation context** — what was accomplished, not the branch name. The branch name is often a slug of the first message and doesn't reflect the actual work.

**Process:**

1. Analyze the conversation to understand the primary goal and outcome of the work.
2. Generate a kebab-case project name (e.g., `add-retry-middleware`, `fix-auth-token-refresh`).
3. Present to the user via `AskUserQuestion`:
   - "Based on our conversation, I'd suggest naming this project: **{proposed-name}**"
   - Options: "{proposed-name} (Recommended)" / "Let me choose a different name"

**Validate:**

- Check for name collisions: verify `{PROJECTS_ROOT}/{name}` does not already exist.
- If collision: inform user and ask for alternative name.

### Step 2: Analyze Branch

Run branch analysis to understand scope:

```bash
git log --oneline "${BASE_BRANCH}..HEAD"
git diff --stat "${BASE_BRANCH}..HEAD"
git diff --name-only "${BASE_BRANCH}..HEAD"
```

**Capture:**

- Commit list (SHAs + messages)
- Files changed (with add/modify/delete classification)
- Total lines added/removed
- Whether tests were added or modified

Store this analysis for use in Steps 4 and 5.

### Step 3: Scaffold Project

Create the project using the standard scaffolder:

```bash
oat project new "{name}" --mode quick
```

Then update `state.md` frontmatter to reflect capture-specific metadata:

- `oat_workflow_mode: quick`
- `oat_workflow_origin: captured`
- `oat_phase: implement`
- `oat_phase_status: in_progress`
- `oat_hill_checkpoints: []`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

### Step 4: Synthesize Discovery

Populate `discovery.md` from **conversation context** — this is the primary value of capture. The agent has context about _why_ the work was done that commits alone can't provide.

**Required sections to populate:**

- **Initial Request:** What the user wanted to accomplish (from conversation start)
- **Key Decisions:** Decisions made during the conversation and their rationale
- **Constraints:** Any constraints that shaped the work
- **Success Criteria:** What "done" looks like

**Populate if applicable:**

- **Solution Space:** Alternatives considered (if multiple approaches were discussed)
- **Clarifying Questions:** Significant Q&A that shaped the direction
- **Out of Scope:** Things explicitly excluded

**Update frontmatter:**

- `oat_status: complete`
- `oat_generated: true`
- `oat_last_updated: {today}`

**User validation:** After drafting, present a summary of the discovery content to the user via `AskUserQuestion`:

- "Here's what I captured for discovery. Does this look right, or should I adjust anything?"
- Options: "Looks good (Recommended)" / "Needs adjustments"

If adjustments needed, ask what to change and update accordingly.

### Step 5: Capture Implementation

Populate `implementation.md` from commit history and conversation context.

**Task creation strategy:**

1. Review the commit list from Step 2.
2. Group related commits into logical tasks. A single commit = one task. Multiple closely related commits (e.g., implementation + test + fix) = one task with the latest commit as the reference.
3. If work has natural stages, group tasks into phases (e.g., "Phase 1: Foundation", "Phase 2: Feature", "Phase 3: Tests").
4. If work is a single cohesive unit, use a single phase.

**For each task, populate:**

- `Status: completed`
- `Commit: {sha}` (latest commit in the group)
- `Outcome:` 2-5 bullets describing what changed (behavior-level, not line-level)
- `Files changed:` list with purpose annotation
- `Verification:` test command + result (if tests were part of the task)

**Populate the Progress Overview table** with phase/task counts (all completed).

**Populate the Final Summary section:**

- What shipped (capabilities)
- Key files/modules with purpose
- Behavioral changes (user-facing)

**Update frontmatter:**

- `oat_status: complete` (if all work is done) or `in_progress` (if still working)
- `oat_current_task_id: null` (if complete) or next task ID
- `oat_generated: true`
- `oat_last_updated: {today}`

### Step 6: Set Lifecycle State

Ask the user via `AskUserQuestion`:

- "Is this work ready for review, or still in progress?"
- Options: "Ready for review (Recommended)" / "Still in progress"

**If ready for review:**

Update `state.md`:

- `oat_phase: implement`
- `oat_phase_status: complete`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

Update `implementation.md`:

- `oat_status: complete`
- `oat_current_task_id: null`

**If still in progress:**

Update `state.md`:

- `oat_phase: implement`
- `oat_phase_status: in_progress`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

Update `implementation.md`:

- `oat_status: in_progress`

### Step 7: Refresh Dashboard and Report

```bash
oat state refresh
```

Print a summary:

```
Project captured: {name}
  Branch: {branch}
  Commits: {count}
  Discovery: populated from conversation context
  Implementation: {task_count} tasks across {phase_count} phase(s)
  Status: {ready for review | in progress}
```

**Suggest next actions based on lifecycle state:**

- **Ready for review:**
  - `oat-project-review-provide` — run a self-review before sharing
  - `oat-project-pr-final` — create a PR directly
- **Still in progress:**
  - Continue working, then re-run capture or use `oat-project-reconcile` for new commits

## Examples

### Basic Usage

```
/oat-project-capture
```

### Conversational

```
We've been working on this retry middleware for the last hour. Let's capture this as a project so I can review it from my laptop later.
```

```
I did some work on the auth flow in a mobile session. Can you create a project from what we did?
```

## Success Criteria

- ✅ Project scaffolded with `oat_workflow_origin: captured`
- ✅ `discovery.md` captures the "why" from conversation context, not just the "what" from commits
- ✅ `implementation.md` reflects actual work done with commit SHAs
- ✅ User confirmed discovery content before finalizing
- ✅ Lifecycle state set based on user's choice (review-ready or in-progress)
- ✅ Dashboard refreshed and next actions suggested
- ✅ No retroactive plan content authored (scaffold template `plan.md` is acceptable)
