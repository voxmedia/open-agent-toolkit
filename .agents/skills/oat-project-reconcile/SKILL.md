---
name: oat-project-reconcile
version: 1.0.0
description: Use when human-implemented commits need to be mapped back to planned tasks. Reconciles implementation.md and state.md after manual work outside the OAT workflow.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Reconcile Manual Implementation

Bridge the gap between human implementation and OAT's artifact-driven workflow. Analyzes commits made outside the structured OAT flow, maps them to planned tasks, and updates tracking artifacts after human confirmation.

## Prerequisites

**Required:**

- Active OAT project with a `plan.md` containing task definitions
- Project must be in `implement` phase (or `plan` phase with `oat_phase_status: complete`)
- At least one commit exists that is not tracked in `implementation.md`

## Mode Assertion

**OAT MODE: Reconciliation**

**Purpose:** Analyze manual/human commits, map them to planned tasks, and reconcile tracking artifacts with user confirmation.

## Progress Indicators (User-Facing)

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ RECONCILE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- For each step, announce a compact header:
  - `OAT ▸ RECONCILE — Step N: {step_name}`
- Before multi-step bookkeeping:
  - `[1/N] {action}…`
- Keep it concise; don't print a line for every shell command.

**BLOCKED Activities:**

- No modifying code files
- No rewriting git history
- No deleting or overwriting existing implementation.md entries
- No silent assumptions on uncertain mappings

**ALLOWED Activities:**

- Reading git log, diffs, and file lists
- Reading plan.md, implementation.md, state.md
- Appending new entries to implementation.md
- Updating frontmatter pointers in implementation.md and state.md
- Asking user for confirmation on mappings
- Creating a single bookkeeping commit

**Self-Correction Protocol:**
If you catch yourself:

- Modifying code files → STOP (reconciliation is tracking-only)
- Assuming a mapping without user confirmation → STOP (present options)
- Overwriting existing entries → STOP (append only)

**Recovery:**

1. Acknowledge the deviation
2. Return to current step
3. Ask user for guidance

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
- Write it for future phases:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 0.5: Prerequisite Check

Verify the project is ready for reconciliation:

1. **Check `plan.md` exists:**

   ```bash
   test -f "$PROJECT_PATH/plan.md" || { echo "ERROR: plan.md not found. Run oat-project-plan first."; exit 1; }
   ```

2. **Check project phase:**

   ```bash
   PHASE=$(grep "^oat_phase:" "$PROJECT_PATH/state.md" 2>/dev/null | awk '{print $2}')
   PHASE_STATUS=$(grep "^oat_phase_status:" "$PROJECT_PATH/state.md" 2>/dev/null | awk '{print $2}')
   ```

   - If `PHASE` is `implement`: proceed
   - If `PHASE` is `plan` and `PHASE_STATUS` is `complete`: proceed (plan just finished, implementation starting)
   - Otherwise: STOP — tell user the project is not in implementation phase

3. **Check for untracked commits:**
   - Read `implementation.md` if it exists — find the last recorded commit SHA
   - If all recent commits are already tracked, inform user: "No untracked commits found. Nothing to reconcile."

### Step 1: Find Checkpoint

Identify the last commit that OAT has already tracked. Everything after this commit is "untracked human work" that needs reconciliation.

**Priority 1 — Last tracked commit in `implementation.md`:**

Read `implementation.md` and find the last task entry with a commit SHA (look for `**Commit:** {sha}` patterns where sha is not `-` or empty). This is the most reliable checkpoint because it's exactly what OAT already recorded.

```bash
LAST_TRACKED_SHA=$(grep -oP '\*\*Commit:\*\*\s+\K[0-9a-f]{7,40}' "$PROJECT_PATH/implementation.md" | tail -1)
```

**Priority 2 — Last OAT-convention commit in git log:**

If `implementation.md` has no tracked commits, scan git log for the last commit matching OAT patterns:

```bash
# Task commits: feat(p01-t01): ..., fix(p02-t03): ...
OAT_TASK_SHA=$(git log --oneline --grep='(p[0-9]*-t[0-9]*)' --extended-regexp -n 1 --format='%H')

# Bookkeeping commits: chore(oat): update tracking artifacts ...
OAT_BOOK_SHA=$(git log --oneline --grep='chore(oat):' -n 1 --format='%H')

# Use whichever is more recent (closer to HEAD)
if [ -n "$OAT_TASK_SHA" ] && [ -n "$OAT_BOOK_SHA" ]; then
  # Compare: is OAT_TASK_SHA an ancestor of OAT_BOOK_SHA?
  if git merge-base --is-ancestor "$OAT_TASK_SHA" "$OAT_BOOK_SHA" 2>/dev/null; then
    CHECKPOINT="$OAT_BOOK_SHA"
  else
    CHECKPOINT="$OAT_TASK_SHA"
  fi
elif [ -n "$OAT_TASK_SHA" ]; then
  CHECKPOINT="$OAT_TASK_SHA"
elif [ -n "$OAT_BOOK_SHA" ]; then
  CHECKPOINT="$OAT_BOOK_SHA"
fi
```

**Priority 3 — Merge-base fallback:**

If no OAT commits are found at all, fall back to the merge-base with the default branch:

```bash
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
CHECKPOINT=$(git merge-base HEAD "$DEFAULT_BRANCH" 2>/dev/null)
```

If merge-base also fails (e.g., orphan branch), use the first commit on the branch:

```bash
CHECKPOINT=$(git rev-list --max-parents=0 HEAD | tail -1)
```

**Report checkpoint to user:**

```
OAT ▸ RECONCILE — Step 1: Checkpoint

Last tracked commit: {CHECKPOINT_SHA} ({date})
Source: {implementation.md | git log pattern | merge-base}
Task: {last_tracked_task_id or "pre-project"}

Commits since checkpoint: {count}
```

Count commits in range:

```bash
COMMIT_COUNT=$(git rev-list --count "$CHECKPOINT"..HEAD)
```

**User confirmation gate:**

Ask user: "Use this as the checkpoint? Or provide a different commit SHA."

If user provides an alternative SHA, validate it:

```bash
git cat-file -t "$USER_SHA" 2>/dev/null | grep -q commit
```

Store the confirmed checkpoint as `$CHECKPOINT` for use in subsequent steps.

### Step 2: Collect and Analyze Commits

Gather all commits between the checkpoint and HEAD, filter out noise, and extract metadata for mapping.

**Collect commits in range:**

```bash
git log --format='%H|%s|%an|%ai' "$CHECKPOINT"..HEAD --reverse
```

This gives oldest-first ordering (matches plan execution order). Parse each line into: `SHA`, `message`, `author`, `date`.

**Gather per-commit details:**

For each commit SHA, collect:

1. Changed files:

   ```bash
   git diff-tree --no-commit-id -r --name-only "$SHA"
   ```

2. Diff stats (insertions/deletions):
   ```bash
   git diff --stat "$SHA"~1.."$SHA" 2>/dev/null || git diff --stat "$(git hash-object -t tree /dev/null)".."$SHA"
   ```
   (The fallback handles the case where `$SHA` is the first commit on the branch.)

**Filter out non-implementation commits:**

Remove from the analysis set:

1. **Merge commits:**

   ```bash
   git rev-list --merges "$CHECKPOINT"..HEAD
   ```

   Any SHA in this list is excluded.

2. **Bookkeeping-only commits** — commits where ALL changed files match OAT tracking patterns:
   - Files ending in `implementation.md`, `state.md`, or `plan.md` within any `.oat/` path
   - Files ending in `state.md` within any `.oat/` path
   - Commit message starts with `chore(oat):`

   Rule: if every file in the commit is under a `.oat/` subdirectory and matches one of `implementation.md`, `state.md`, `plan.md`, or `discovery.md` — then it's bookkeeping and should be excluded.

3. **Already-tracked commits** — commits whose SHA already appears in `implementation.md` task entries (from Step 0.5 check).

**Present commit summary to user:**

```
OAT ▸ RECONCILE — Step 2: Commit Analysis

Range: {CHECKPOINT_SHORT}..HEAD ({total_count} commits, {filtered_count} after filtering)
Filtered out: {merge_count} merges, {bookkeeping_count} bookkeeping, {tracked_count} already tracked

| #  | SHA (short) | Message (first 60 chars)          | Files | Insertions | Deletions |
|----|-------------|-----------------------------------|-------|------------|-----------|
| 1  | abc1234     | add auth endpoint                 | 3     | +120       | -5        |
| 2  | def5678     | fix validation logic              | 1     | +15        | -8        |
| .. | ...         | ...                               | ...   | ...        | ...       |
```

**Extract plan tasks for mapping:**

Read `plan.md` and extract all tasks:

1. Parse `### Task pNN-tNN: {Name}` headers to get task IDs and names
2. Parse `**Files:**` blocks under each task to get expected file lists (both `Create:` and `Modify:` entries)
3. Parse task descriptions/steps for keyword extraction (used in Step 3 for message matching)
4. Note which tasks already have `completed` status in `implementation.md` (skip these during mapping)

Store as a structured list:

```
TASKS = [
  { id: "p01-t01", name: "...", files: ["path/a.ts", "path/b.ts"], keywords: ["auth", "endpoint"] },
  { id: "p01-t02", name: "...", files: [...], keywords: [...] },
  ...
]
```

Only include tasks that are **not yet completed** in `implementation.md`.

### Step 3: Map Commits to Tasks

For each filtered commit from Step 2, attempt to map it to a planned task using signals in priority order. Once a commit is mapped via a higher-priority signal, skip lower-priority signals for that commit.

**Signal A — Task ID in commit message (→ High confidence):**

Check if the commit message contains a task ID pattern:

```bash
# Match patterns like: feat(p01-t03): ..., fix(p02-t01): ..., (p01-t02)
TASK_ID=$(echo "$COMMIT_MSG" | grep -oP 'p[0-9]+-t[0-9]+' | head -1)
```

If `$TASK_ID` matches a pending task in the plan: map with `confidence=high`.

**Signal B — File overlap (→ High/Medium/Low confidence):**

For each unmatched commit, compare its changed files against each pending task's file list:

```
For each pending task T:
  task_files = set of files listed in plan for T
  commit_files = set of files changed in this commit
  intersection = commit_files ∩ task_files
  overlap_ratio = |intersection| / |task_files|    (if task_files is non-empty)

  Classification:
    overlap_ratio ≥ 0.8 AND only one task matches at this level → confidence=high
    overlap_ratio ≥ 0.4 → confidence=medium
    overlap_ratio > 0   → confidence=low
```

Pick the best match (highest `overlap_ratio`). Break ties by plan order (earlier task wins).

If a commit's files don't appear in any task's file list, proceed to Signal C.

**Signal C — Message keyword match (→ Medium confidence):**

For each still-unmatched commit:

1. Tokenize the commit message: split on spaces/punctuation, lowercase, remove stop words (a, the, and, or, to, in, for, of, with, is, this, that)
2. Tokenize each pending task's name and description similarly
3. Count matching significant tokens (≥3 chars)

```
If matching_tokens ≥ 2 with a single task → confidence=medium
If matching_tokens ≥ 2 with multiple tasks → confidence=low (ambiguous)
```

**Signal D — Temporal ordering (→ Low confidence):**

For each still-unmatched commit, use its position in the commit sequence as a tiebreaker:

```
Sort remaining unmatched commits by commit date (oldest first).
Sort remaining pending tasks by plan order (p01-t01, p01-t02, ...).

For each unmatched commit (in date order):
  candidate_task = first pending task (in plan order) that has no commits mapped yet
  If candidate_task exists:
    map commit → candidate_task with confidence=low
    Remove candidate_task from pending list
  Else:
    classify as unmapped
```

This signal is intentionally conservative (low confidence) — it only applies when no stronger signal matched. It is most useful for ambiguous manual ranges where commit order is the only remaining signal that correlates with plan task order.

**Signal E — No match (→ Unmapped):**

Any commits still unmatched after all signals: classify as `unmapped`.

**Multi-commit grouping:**

After individual mapping, group commits that map to the same task:

```
For each task with multiple mapped commits:
  - representative_sha = latest commit SHA (most recent)
  - combined_files = union of all commit file lists
  - combined_message = concatenation of commit messages (for outcome generation)
  - confidence = lowest confidence among grouped commits (conservative)
```

**Present mapping report:**

```
OAT ▸ RECONCILE — Step 3: Mapping Report

Mapped to tasks:
| Task      | Task Name                | Commits          | Confidence | Files |
|-----------|--------------------------|------------------|------------|-------|
| p01-t03   | Add validation logic     | abc1234, def5678 | high       | 4     |
| p02-t01   | Implement API endpoint   | ghi9012          | medium     | 2     |

Unmapped commits:
| SHA (short) | Message                    | Files |
|-------------|----------------------------|-------|
| jkl3456     | update readme              | 1     |
| mno7890     | fix typo in config         | 1     |

Tasks still pending (no commits matched):
| Task      | Task Name                |
|-----------|--------------------------|
| p02-t02   | Add integration tests    |

Summary: {mapped_task_count}/{total_pending_tasks} tasks addressed,
         {mapped_commit_count}/{total_commits} commits mapped,
         {unmapped_count} unmapped
```

### Step 4: Confirm Mappings (Human-in-the-Loop)

Present mappings to the user for confirmation. No artifact writes happen in this step — only building the confirmed mapping set.

**4a. High-confidence batch approval:**

Present all high-confidence mappings as a batch:

```
The following high-confidence mappings were detected:

  p01-t03 "Add validation logic"
    ← abc1234: "add input validation" (file overlap 90%)
    ← def5678: "fix validation edge case" (file overlap 85%)

  p02-t01 "Implement API endpoint"
    ← ghi9012: "add /api/users endpoint" (task ID in message)

Accept all high-confidence mappings?
  1. Yes, accept all
  2. Review individually
```

If user chooses "Review individually", fall through to the per-mapping flow below.

**4b. Medium/Low-confidence individual review:**

For each medium or low confidence mapping, present individually:

```
Commit ghi9012: "fix validation logic" (2 files changed: src/validate.ts, src/utils.ts)
Best match: p02-t01 "Add input validation" (confidence: medium, file overlap 60%)

What should we do with this commit?
  1. Accept mapping to p02-t01
  2. Assign to a different task
  3. Mark as unplanned work (log in implementation.md)
  4. Skip (don't log this commit)
```

If user chooses "Assign to a different task", present the list of unmatched pending tasks and let them pick.

**4c. Unmapped commits:**

For each unmapped commit:

```
Commit jkl3456: "update readme" (1 file changed: README.md)
No matching task found.

What should we do with this commit?
  1. Assign to a task: [list pending tasks]
  2. Log as unplanned work in implementation.md
  3. Skip (don't log)
```

**4d. Task completion status:**

For each task that has confirmed mapped commits, ask about completion:

```
Task p02-t01 "Add input validation" — 1 commit mapped.
Mark this task as:
  1. Completed (all work for this task is done)
  2. In Progress (partial — more work still needed)
```

Default to "Completed" for high-confidence mappings; default to "In Progress" for medium/low.

**4e. Final confirmation:**

Present the complete confirmed mapping before proceeding:

```
OAT ▸ RECONCILE — Step 4: Confirmed Mappings

Tasks to update:
| Task      | Status      | Commits          | Confidence |
|-----------|-------------|------------------|------------|
| p01-t03   | completed   | abc1234, def5678 | high       |
| p02-t01   | in_progress | ghi9012          | medium     |

Unplanned work to log:
| SHA       | Summary                  |
|-----------|--------------------------|
| jkl3456   | update readme            |

Skipped commits: mno7890

Proceed with artifact updates?
  1. Yes, update artifacts
  2. Go back and revise mappings
```

Only proceed to Step 5 after user confirms "Yes, update artifacts".

### Step 5: Update Artifacts

Apply the confirmed mappings to OAT tracking artifacts. This is the only step that writes files.

**5a. Read existing `implementation.md`:**

Read the full file. Identify:

- Existing task entries (preserve all — never overwrite or delete)
- The insertion point for each task entry (find the `### Task pNN-tNN:` section)
- Current progress table values
- Current frontmatter values

**5b. Write task entries in `implementation.md`:**

For each confirmed task mapping, check whether a `### Task {task_id}:` section already exists in `implementation.md`:

- **If the section does NOT exist:** Insert a new task entry at the correct position (in plan task order within the appropriate phase section).
- **If the section ALREADY exists:** Do NOT replace or overwrite it. Instead, append a `**Reconciliation Update:**` block below the existing entry to augment it with the reconciled data.

**New entry template** (when no existing section):

```markdown
### Task {task_id}: {Task Name}

**Status:** {completed | in_progress}
**Commit:** {representative_sha} (reconciled)

**Outcome (reconciled from manual implementation):**

- {2-5 bullets derived from commit messages and diff summary}
- {Use git show --stat and commit messages to infer what changed}

**Files changed:**

- `{path}` - {inferred purpose from diff context}

**Verification:**

- Run: `{verification command from plan task, if available}`
- Result: not verified — reconciled entry

**Notes / Decisions:**

- Reconciled from manual implementation on {today's date}
- Original commits: {comma-separated SHA list}
- Mapping confidence: {high|medium|low}
- Mapping signal: {task ID in message | file overlap N% | keyword match}
```

**Augmentation template** (when section already exists — append below existing content):

```markdown
**Reconciliation Update ({today's date}):**

- Additional commits mapped: {comma-separated SHA list}
- Mapping confidence: {high|medium|low}
- Mapping signal: {task ID in message | file overlap N% | keyword match}
- Additional files: {files not already listed, if any}
- Status updated: {if status changed, e.g., in_progress → completed}
```

**Important:** Never delete, replace, or overwrite existing task entry content. Existing notes, decisions, and outcomes represent logged history that must be preserved.

To generate the **Outcome** bullets:

1. Read each commit's message and diff stats
2. Summarize what changed at a behavior level (not "edited file X" but "added validation for user input")
3. Use `git show --stat {sha}` and `git log --format='%s' {sha} -1` as source material

To generate **Files changed**:

1. Use the combined file list from all grouped commits
2. For each file, infer purpose from the file path and diff context

**5c. Add unplanned work entries:**

For each commit the user chose to log as unplanned work, append after the last task entry in the relevant phase (or at the end of the last phase):

```markdown
### Unplanned: {commit message summary (first 60 chars)}

**Status:** completed
**Commit:** {sha} (unplanned)

**Outcome:**

- {1-3 bullets derived from commit message and diff}

**Files changed:**

- `{path}` - {inferred from diff}

**Notes:**

- Not part of original plan. Logged during reconciliation on {today's date}.
```

**5d. Update progress table:**

Recalculate the `## Progress Overview` table dynamically from the project's actual data:

1. Enumerate all phases from `plan.md` by scanning `## Phase N:` headings
2. For each phase, count tasks by matching `### Task pNN-tNN:` headers where `NN` is the phase number
3. For each phase, count completed tasks from `implementation.md` entries with `**Status:** completed`
4. Regenerate the table with actual counts:

```markdown
| Phase | Status | Tasks | Completed |
| ----- | ------ | ----- | --------- |

{for each phase from plan.md:}
| Phase {N} | {status} | {task_count} | {completed_count}/{task_count} |

**Total:** {total_completed}/{total_tasks} tasks completed
```

A phase is `complete` when all its tasks are `completed`. A phase is `in_progress` when at least one task is `completed` or `in_progress`. Otherwise `pending`.

Do not hardcode phase counts or task totals — always derive them from the current project's plan and implementation artifacts.

**5e. Update frontmatter:**

In `implementation.md`:

```yaml
oat_current_task_id: { next_pending_task_id } # or null if all complete
oat_last_updated: { today }
```

Find the next pending task by scanning plan order: first task with status not `completed`.

In `state.md`:

```yaml
oat_current_task: { same as oat_current_task_id above }
oat_last_commit: { most recent reconciled commit SHA }
oat_phase: implement
oat_phase_status: in_progress
oat_project_state_updated: '{ISO 8601 UTC timestamp}'
# Always in_progress after reconciliation — only oat-project-review-receive
# may advance to complete after the final review passes.
```

**5f. Append to Implementation Log:**

Add a reconciliation session entry to the `## Implementation Log` section:

```markdown
### {today's date}

**Session Start:** reconciliation

{For each reconciled task:}

- [x] {task_id}: {task_name} - {sha} (reconciled, confidence: {level})

{For each unplanned entry:}

- [x] unplanned: {summary} - {sha}

**What changed (high level):**

- Reconciled {N} manually-implemented tasks from {M} commits
- Logged {K} unplanned work entries

**Decisions:**

- Mapping confidence breakdown: {high_count} high, {medium_count} medium, {low_count} low
- Skipped commits: {skip_count}

**Session End:** reconciliation complete
```

### Step 6: Commit and Report

Create a single bookkeeping commit for all artifact updates and present a final summary.

**6a. Stage only tracking files:**

```bash
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md"
# Only add plan.md if it was modified
git diff --name-only "$PROJECT_PATH/plan.md" 2>/dev/null | grep -q . && git add "$PROJECT_PATH/plan.md"
```

**Important:** Do NOT use `git add -A` or glob patterns. Only stage the specific OAT tracking files listed above.

**6b. Commit with reconciliation message:**

```bash
git diff --cached --quiet || git commit -m "chore(oat): reconcile manual implementation ({first_task_id}..{last_task_id})"
```

Example: `chore(oat): reconcile manual implementation (p01-t03..p02-t01)`

If only unplanned work was logged (no task mappings): `chore(oat): reconcile unplanned manual implementation`

**6c. Refresh dashboard (optional):**

```bash
oat state refresh 2>/dev/null || pnpm run cli -- state refresh 2>/dev/null || true
```

Dashboard refresh is best-effort; do not fail the reconciliation if it's unavailable.

**6d. Print final summary:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OAT ▸ RECONCILE — Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reconciled: {N} tasks from {M} commits
  High confidence: {high_count}
  Medium confidence: {medium_count}
  Low confidence: {low_count}

Unplanned work logged: {K} entries
Commits skipped: {skip_count}
Tasks still pending: {pending_count}

Next task: {next_task_id} "{next_task_name}" (or "all tasks complete")

Tracking commit: {bookkeeping_sha}

Recommended next steps:
  - oat-project-implement    → continue with remaining tasks
  - oat-project-review-provide → review all changes (including reconciled)
  - oat-project-progress     → check overall project status
```

## Success Criteria

- Checkpoint correctly identified from implementation.md, git log, or merge-base
- All post-checkpoint commits collected and filtered (merges, bookkeeping, already-tracked excluded)
- Commit→task mapping uses all five signal types in priority order (task ID, file overlap, keywords, temporal, unmapped)
- Every uncertain mapping (medium/low/unmapped) confirmed by user before any writes
- Generated implementation.md entries match the template format exactly
- Existing implementation.md entries are preserved (append-only)
- Frontmatter pointers (`oat_current_task_id`, `oat_current_task`) are consistent across artifacts
- Single bookkeeping commit with only tracking files staged
- Downstream skills (`oat-project-progress`, `oat-project-review-provide`) produce correct results after reconciliation
