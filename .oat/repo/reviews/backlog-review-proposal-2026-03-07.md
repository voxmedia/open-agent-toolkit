# Backlog Review & Feature Proposal

**Date:** 2026-03-07
**Scope:** All active items in `.oat/repo/reference/backlog.md` (Inbox + Planned)
**Purpose:** Review backlog, identify completed/stale items, and propose next feature for planning

---

## 1. Backlog Health Check

### Items completed since last review (2026-02-19)

The following items have been implemented and should be moved to `backlog-completed.md`:

| ID  | Title                                                                           | Status                           |
| --- | ------------------------------------------------------------------------------- | -------------------------------- |
| B05 | Switch `pnpm run cli` to direct `oat` CLI                                       | Completed (backlog-completed.md) |
| B07 | Codex markdown→TOML subagent adapter                                            | Completed (backlog-completed.md) |
| B08 | Context management commands (`AGENTS.md` ↔ `CLAUDE.md`)                         | Completed (backlog-completed.md) |
| B09 | Review receive + PR-review intake skill family                                  | Completed (backlog-completed.md) |
| B15 | Project lifecycle config consolidation (`oat config`, `oat project open/pause`) | Completed (backlog-completed.md) |

### Stale Inbox item

| Item                                                 | Status                  | Notes                                                                                                                                                                                                            |
| ---------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill versioning (`oat init tools` update detection) | **Already implemented** | `copyDirWithVersionCheck()` exists in copy-helpers.ts; all 43 skills have `version:` frontmatter; `oat init tools` already detects outdated skills and offers interactive updates. Should be moved to completed. |

---

## 2. Remaining Active Items (Ranked)

### Tier 1: High value, actionable now

| Item                                                | Priority | Area   | Value | Effort |
| --------------------------------------------------- | -------- | ------ | ----- | ------ |
| **Reconcile manual implementation**                 | P1       | skills | High  | Medium |
| **oat-project-document** (post-impl docs synthesis) | P1       | skills | High  | Medium |
| **Documentation analysis skill family**             | P1       | skills | High  | High   |

### Tier 2: Strategic, higher effort

| Item                                | Priority | Area     | Value  | Effort |
| ----------------------------------- | -------- | -------- | ------ | ------ |
| PM workflow family (`oat-pjm-*`)    | P1       | workflow | High   | High   |
| VCS policy + worktree sync behavior | P1       | tooling  | Medium | High   |

### Tier 3: Fill-in / Defer

| Item                                         | Priority | Area     | Value  | Effort |
| -------------------------------------------- | -------- | -------- | ------ | ------ |
| Scaffold `.oat/projects/` during `oat init`  | P2       | tooling  | Low    | Low    |
| Migrate active-idea pointers to config-local | P2       | tooling  | Medium | Medium |
| Codex prompt-wrapper generation              | P2       | tooling  | Low    | Low    |
| PR review follow-on skills                   | P2       | skills   | Low    | Medium |
| Dependency intelligence skill family         | P2       | skills   | Low    | Medium |
| Skill uninstall command                      | P2       | tooling  | Medium | Medium |
| Idea promotion in `oat-project-new`          | P2       | skills   | Low    | Medium |
| Backlog Refinement Flow (Jira)               | P2       | workflow | Low    | High   |

---

## 3. Feature Proposal: Reconcile Manual Implementation Skill

### Why this feature, why now

1. **Addresses a real, growing pain point.** As OAT adoption grows, mixed human/AI implementation is increasingly common. When a human implements tasks without following OAT commit conventions or updating tracking artifacts, downstream skills (`oat-project-review-provide`, `oat-project-progress`, `oat-project-pr-final`) produce inaccurate or misleading results.

2. **No dependencies.** Independent of all other backlog items. Can start immediately.

3. **Well-scoped.** The backlog item has clear boundaries and success criteria. No external integrations needed.

4. **Force multiplier.** Makes the entire project workflow resilient to context switches between human and AI work — a significant adoption barrier today.

5. **Builds on established patterns.** Uses the same artifact format (`implementation.md`, `plan.md`, `state.md`) and follows the analyze→apply pattern proven by `oat-agent-instructions-*` and `oat-docs-*` skill families.

### Proposed skill: `oat-project-reconcile`

**Purpose:** Bridge the gap between human implementation and OAT's artifact-driven workflow by analyzing post-checkpoint commits and reconciling tracking artifacts.

**Core workflow:**

```
Step 1: Find checkpoint
  └─ Scan git log for last commit matching OAT task-ID pattern
     (e.g., `feat(p01-t03): ...` or `chore(oat): update tracking artifacts for p01-t03`)
  └─ If no checkpoint found, use merge-base with the project's base branch
  └─ Report checkpoint commit and date to user

Step 2: Analyze drift
  └─ Collect all commits between checkpoint and HEAD
  └─ For each commit: extract message, changed files, diff stats
  └─ Cross-reference plan.md task list (file paths, descriptions)
  └─ Classify each commit:
     - "Maps to task pNN-tNN" (with confidence: high/medium/low)
     - "Unplanned work" (no matching task)
     - "Bookkeeping only" (artifact-only changes)

Step 3: Present reconciliation report
  └─ Table: commit → task mapping (with confidence)
  └─ Flagged items: unplanned work, ambiguous mappings
  └─ Summary: N tasks addressed, M commits unmapped, K tasks still pending

Step 4: Human-in-the-loop confirmation
  └─ User reviews mappings
  └─ User can reassign commits, mark tasks as partial, or skip
  └─ No silent assumptions on uncertain mappings

Step 5: Update artifacts (with approval)
  └─ Draft implementation.md entries for each confirmed task
     (same format: Status, Commit, Outcome, Files changed, Verification, Notes)
  └─ Update plan.md task statuses
  └─ Update state.md frontmatter (oat_current_task, oat_phase_status)
  └─ Update implementation.md progress table

Step 6: Bookkeeping commit
  └─ Single commit: `chore(oat): reconcile manual implementation (pNN-tNN..pNN-tNN)`
  └─ Only tracking files staged (implementation.md, plan.md, state.md)
```

**Key design decisions to resolve during planning:**

1. **Commit→task mapping heuristic** — How to balance file-path overlap vs. commit message analysis vs. diff content. Consider using plan task descriptions + file lists as the matching signal.

2. **Partial task completion** — When commits address only part of a task, should the task be marked `in_progress` or `completed`? Propose: default to `in_progress` with user override.

3. **Unplanned work handling** — Should unplanned commits generate new tasks in the plan, or just be logged in implementation.md as out-of-scope notes? Propose: log in implementation.md with a flag; optionally add to plan if user requests.

4. **Interaction with review state** — If a task has an associated review scope, reconciliation should not auto-update review status. Reviews are a separate concern.

### Success criteria (from backlog)

- Skill can identify the last OAT-structured checkpoint commit and scope analysis to post-checkpoint changes
- Produces accurate mapping of commits → planned tasks (including flagging unmapped/unplanned work)
- Generates draft `implementation.md` entries that maintain the same format/quality as AI-generated entries
- Downstream skills (`oat-project-review-provide`, `oat-project-progress`) produce reliable results after reconciliation runs
- Human-in-the-loop confirmation for uncertain mappings — no silent assumptions

### Estimated effort

**Medium** — ~2-3 sessions. Core logic is git log analysis + plan cross-referencing + template-driven artifact generation. All patterns are established in existing skills.

---

## 4. Recommended Next Steps

1. **Approve this proposal** and create an OAT project for `oat-project-reconcile`
2. **Clean up stale backlog items** — move skill versioning to completed, verify other item statuses
3. **After reconcile ships**, evaluate `oat-project-document` as the next feature (addresses docs drift, the #2 pain point)
