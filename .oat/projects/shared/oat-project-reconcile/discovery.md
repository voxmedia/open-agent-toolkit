---
oat_status: complete
oat_last_updated: 2026-03-07
oat_generated: true
---

# Discovery: oat-project-reconcile

## Problem Statement

When a human implements OAT project tasks outside the structured workflow — committing code without task-ID conventions, skipping `implementation.md` updates, or implementing multiple tasks in a single commit — the tracking artifacts drift from reality. Downstream skills (`oat-project-review-provide`, `oat-project-progress`, `oat-project-pr-final`) produce inaccurate or misleading results because they rely on artifact state that no longer reflects the codebase.

## Current State

### How OAT tracks implementation today

1. **Commit convention**: `{type}(pNN-tNN): {description}` — allows git log parsing to identify which task a commit belongs to
2. **`implementation.md`**: Per-task entries with status, commit SHA, outcome, files changed, verification
3. **`state.md`**: `oat_current_task` pointing to the next task to execute
4. **`plan.md`**: Task definitions with file lists and review status tracking

### Where drift occurs

| Scenario | Symptom | Impact |
|----------|---------|--------|
| Human commits without task-ID in message | `implementation.md` has no entries for completed work | Progress tracking is wrong; reviews scope incorrectly |
| Human implements multiple tasks in one commit | Tasks appear pending when work is done | Duplicate work risk; progress underreported |
| Human skips `implementation.md` updates | `oat_current_task_id` points to already-done task | `oat-project-implement` would redo work |
| Human works on unplanned changes | No plan task exists for the work | Review scope misses changes; PR summary incomplete |

### Existing drift handling

- **Step 3.5** in `oat-project-implement`: Detects narrow bookkeeping drift (review status vs artifact state mismatch) and offers to auto-correct frontmatter pointers. This handles only the case where reviews were completed but artifacts weren't updated — it cannot map arbitrary human commits back to plan tasks.

## Research: Commit→Task Mapping Strategies

### Signal sources for mapping

1. **Commit message keywords**: Even without `(pNN-tNN)` convention, task names/descriptions may appear in messages
2. **File overlap**: Compare files changed in commit vs files listed in plan task definitions
3. **Diff content**: Function/class names in diffs may match task descriptions
4. **Temporal ordering**: Commits likely follow plan phase order (weak signal but useful for disambiguation)

### Confidence classification

| Confidence | Criteria |
|------------|----------|
| **High** | Commit message contains task ID, OR file overlap ≥80% with exactly one task |
| **Medium** | File overlap 40-80% with one task, or message keywords match task name |
| **Low** | Partial file overlap with multiple tasks, or only temporal signal |
| **Unmapped** | No meaningful signal matches any planned task |

### Edge cases

- **One commit → multiple tasks**: Common when humans batch work. Need to allow splitting credit across tasks.
- **Multiple commits → one task**: Normal iterative development. Group and summarize.
- **Merge commits**: Skip or treat as metadata-only.
- **Commits outside plan scope**: Flag as unplanned work; don't force-fit into tasks.

## Stakeholder Needs

- **Primary user**: Developer who implemented tasks manually and wants to re-sync OAT artifacts before running review/PR skills
- **Key requirement**: Must not silently assume mappings — human confirmation for any uncertain mapping
- **Secondary need**: Unplanned work should be visible (not hidden), so reviews cover all changes

## Constraints

- Skill-only implementation (no CLI command needed initially)
- Must work with `spec-driven`, `quick`, and `import` workflow modes
- Must produce `implementation.md` entries matching the existing template format exactly
- Must not modify code files — only OAT tracking artifacts
- Git operations limited to read-only (`git log`, `git diff`, `git show`) except for final bookkeeping commit

## References

- Backlog item: `.oat/repo/reference/backlog.md` (Inbox, P1)
- Implementation skill: `.agents/skills/oat-project-implement/SKILL.md`
- Review provide skill: `.agents/skills/oat-project-review-provide/SKILL.md`
- Progress skill: `.agents/skills/oat-project-progress/SKILL.md`
- Templates: `.oat/templates/implementation.md`, `.oat/templates/plan.md`, `.oat/templates/state.md`
