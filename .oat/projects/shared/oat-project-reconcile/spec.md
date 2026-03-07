---
oat_status: complete
oat_last_updated: 2026-03-07
oat_generated: true
---

# Spec: oat-project-reconcile

## Overview

Create a new OAT skill (`oat-project-reconcile`) that analyzes commits made outside the structured OAT workflow, maps them to planned tasks, and updates tracking artifacts (`implementation.md`, `plan.md`, `state.md`) after human confirmation.

## Requirements

### R1: Checkpoint Detection

The skill MUST identify the last OAT-structured checkpoint commit by scanning git log for commits matching the task-ID pattern (`{type}(pNN-tNN): ...`) or bookkeeping pattern (`chore(oat): update tracking artifacts for ...`).

- If no checkpoint is found, fall back to the project's merge-base (or first commit if no base branch)
- Report the checkpoint commit SHA, date, and associated task to the user

### R2: Post-Checkpoint Commit Analysis

The skill MUST collect and analyze all commits between the checkpoint and HEAD:

- Extract: commit SHA, message, author, date, changed files, diff stats (insertions/deletions per file)
- Filter out: merge commits, bookkeeping-only commits (changes only to `implementation.md`, `state.md`, `plan.md`)
- Present a summary of the commit range to the user before mapping

### R3: Commit→Task Mapping

The skill MUST attempt to map each post-checkpoint commit to a planned task using these signals (in priority order):

1. **Commit message**: Task ID in message (`pNN-tNN` pattern) → High confidence
2. **File overlap**: Files changed in commit vs files listed in plan task → High (≥80%) / Medium (40-80%) / Low (<40%)
3. **Message keywords**: Task name/description keywords appearing in commit message → Medium confidence
4. **Temporal ordering**: Position in plan sequence → Low confidence (tiebreaker only)

Each mapping MUST include a confidence level: `high`, `medium`, `low`, or `unmapped`.

### R4: Reconciliation Report

The skill MUST present a reconciliation report to the user containing:

- Table of commit → task mappings with confidence levels
- List of unmapped commits (potential unplanned work)
- List of tasks still pending after mapping (not addressed by any commit)
- Summary stats: N tasks addressed, M commits mapped, K commits unmapped

### R5: Human-in-the-Loop Confirmation

The skill MUST NOT update any artifacts without explicit user approval:

- Present each mapping (or group of mappings) for confirmation
- Allow the user to: accept a mapping, reassign a commit to a different task, mark a task as partially complete, or skip a commit
- For unmapped commits: ask whether to log as unplanned work in `implementation.md` or skip
- No silent assumptions on uncertain (medium/low confidence) mappings

### R6: Artifact Updates

After user confirmation, the skill MUST update tracking artifacts:

- **`implementation.md`**: Add per-task entries matching the template format (Status, Commit, Outcome, Files changed, Verification, Notes). Update progress table. Update `oat_current_task_id` frontmatter.
- **`plan.md`**: No structural changes (tasks are not modified). Only used as read input.
- **`state.md`**: Update `oat_current_task` and `oat_phase_status` to reflect reconciled state.

### R7: Bookkeeping Commit

The skill MUST create a single bookkeeping commit after all artifact updates:

- Message: `chore(oat): reconcile manual implementation ({range_description})`
- Explicitly stage only: `implementation.md`, `state.md` (and `plan.md` only if modified)
- Use `git diff --cached --quiet || git commit` to avoid empty commits

### R8: Non-Destructive Behavior

- The skill MUST NOT modify any code files
- The skill MUST NOT rewrite git history
- The skill MUST NOT delete or overwrite existing `implementation.md` entries (append only)
- The skill MUST preserve any existing task entries that were already logged

### R9: Workflow Mode Compatibility

The skill MUST work with all three workflow modes:

- `spec-driven`: Full plan with phases and task IDs
- `quick`: May have simpler plan structure; adapt mapping accordingly
- `import`: Plan may have been imported; task format may vary

## Non-Requirements

- No CLI command needed (skill-only for now)
- No interactive TUI — use `AskUserQuestion` for confirmations
- No automatic re-running of verification commands from plan tasks
- No modification of review status in `plan.md` Reviews table

## Success Criteria

1. Running the skill after human-implemented commits produces accurate commit→task mappings
2. Generated `implementation.md` entries match the quality and format of AI-generated entries
3. After reconciliation, `oat-project-progress` correctly identifies the next pending task
4. After reconciliation, `oat-project-review-provide` correctly scopes reviews to include all changes
5. Human-in-the-loop confirmation prevents any incorrect artifact updates
