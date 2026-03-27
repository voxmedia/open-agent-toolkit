---
name: oat-project-summary
version: 1.0.0
description: Use when a project needs a summary artifact. Generates summary.md from project artifacts as institutional memory.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Project Summary

Generate a durable project summary artifact from project lifecycle artifacts.

## Purpose

Produce a `summary.md` that serves as institutional memory — capturing what was built, why decisions were made, what tradeoffs occurred, and what follow-up work was identified. This artifact is distinct from the PR description: summary.md is reflective and thorough; PR descriptions are reviewer-oriented and actionable.

## Prerequisites

**Required:** Active project with `implementation.md` that has meaningful progress (at least one completed task).

## Mode Assertion

**OAT MODE: Summary Generation**

**Purpose:** Synthesize a structured summary from project artifacts, grounded in what actually happened.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ SUMMARY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/4] Resolving project + reading artifacts…`
  - `[2/4] Checking for existing summary…`
  - `[3/4] Generating / updating summary sections…`
  - `[4/4] Committing…`

**BLOCKED Activities:**

- ❌ No implementation work
- ❌ No changing project artifacts (other than summary.md)
- ❌ No creating tasks or modifying plan

**ALLOWED Activities:**

- ✅ Reading all project artifacts
- ✅ Creating or updating summary.md
- ✅ Committing summary.md changes

**Self-Correction Protocol:**
If you catch yourself:

- Writing implementation code → STOP
- Modifying plan.md or implementation.md → STOP
- Adding speculative future work → STOP (summary captures what happened, not what should happen next — except Follow-up Items from deferred work)

**Recovery:**

1. Acknowledge the deviation
2. Return to summary generation
3. Keep content grounded in artifacts

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

### Step 1: Validate Implementation State

```bash
test -f "$PROJECT_PATH/implementation.md"
```

**If missing:** Block and tell user: "No implementation.md found. Summary requires at least one completed task."

**If exists:** Read the file. Check for at least one task with `**Status:** completed`. If no completed tasks, warn: "No completed tasks found. Summary will be minimal."

### Step 2: Read Project Artifacts

Read all available artifacts for synthesis:

- `"$PROJECT_PATH/discovery.md"` — initial request, decisions, constraints
- `"$PROJECT_PATH/spec.md"` — requirements, goals (optional — may not exist in quick mode)
- `"$PROJECT_PATH/design.md"` — architecture, key decisions (optional — may not exist in quick mode)
- `"$PROJECT_PATH/plan.md"` — phases, tasks, reviews, deferred items
- `"$PROJECT_PATH/implementation.md"` — task outcomes, deviations, challenges, review notes
- `"$PROJECT_PATH/state.md"` — associated issues, workflow mode

**Priority for content:** Implementation.md outcomes take precedence over design.md plans. Summary should reflect what actually happened, not what was planned.

### Step 3: Check for Existing Summary

```bash
test -f "$PROJECT_PATH/summary.md"
```

**If exists (re-run mode):**

1. Read summary.md frontmatter tracking fields:
   - `oat_summary_last_task` — last task ID when summary was generated
   - `oat_summary_revision_count` — revision phases at generation time
   - `oat_summary_includes_revisions` — which `p-revN` phases are reflected

2. Compare to current state:

   ```
   current_last_task = highest completed task ID in implementation.md
   current_rev_count = count of p-revN phases in plan.md
   current_rev_list  = list of p-revN phase IDs in plan.md
   ```

3. Determine update scope:
   - If `oat_summary_last_task == current_last_task` AND `oat_summary_revision_count == current_rev_count`: **No changes detected. Skip update.** Report: "Summary is current. No updates needed."
   - If `current_rev_count > oat_summary_revision_count`: New revision phases exist. Update: Revision History, What Was Implemented, Follow-up Items.
   - If `current_last_task > oat_summary_last_task`: New tasks completed. Update: What Was Implemented, Notable Challenges, Tradeoffs Made.

**If does not exist (first run):**

Copy template: `.oat/templates/summary.md` → `"$PROJECT_PATH/summary.md"`

### Step 4: Generate / Update Summary Sections

For each section, synthesize content from the relevant artifacts. Apply these rules:

**Grounding rule:** Prefer implementation.md outcomes over design.md plans. If the implementation diverged from the design, reflect what actually happened.

**Section omission rule:** If a section would have no meaningful content, omit it entirely (remove the heading). Do not leave empty sections or "N/A" placeholders.

**Conciseness constraint (NFR3):** Target under 200 lines total. If a draft exceeds this, trim narrative sections (What Was Implemented, Notable Challenges) to essential points. Revision History entries: 2-3 sentences per round max.

**Minimum viable summary:** Overview + What Was Implemented + Key Decisions. All other sections are included only when they have content worth preserving.

**Section sources:**

| Section              | Primary Sources                                             |
| -------------------- | ----------------------------------------------------------- |
| Overview             | discovery.md initial request, spec.md problem statement     |
| What Was Implemented | implementation.md task outcomes, plan.md phase structure    |
| Key Decisions        | design.md decisions, implementation.md notes/decisions      |
| Design Deltas        | implementation.md deviations table                          |
| Notable Challenges   | implementation.md issues/blockers in task notes             |
| Tradeoffs Made       | implementation.md decisions, design.md tradeoff sections    |
| Integration Notes    | implementation.md notes about cross-cutting concerns        |
| Revision History     | plan.md p-revN phases, implementation.md revision notes     |
| Follow-up Items      | implementation.md deferred findings, plan.md deferred items |
| Associated Issues    | state.md `associated_issues` field                          |

**For incremental updates (re-run):**

Only update sections affected by the new content. Do not rewrite the entire summary. Preserve existing section content and append/modify as needed.

### Step 5: Update Summary Frontmatter

After generating/updating sections:

```yaml
---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_generated: true
oat_summary_last_task: { highest completed task ID }
oat_summary_revision_count: { count of p-revN phases }
oat_summary_includes_revisions: [{ list of p-revN IDs reflected }]
---
```

### Step 6: Commit

```bash
git add "$PROJECT_PATH/summary.md"
git commit -m "docs: generate summary for {project-name}"
```

If this is a re-run (incremental update):

```bash
git commit -m "docs: update summary for {project-name}"
```

### Step 7: Output Summary

```
Summary generated for {project-name}.

Sections: {list of non-empty sections included}
Lines: {line count}
Mode: {fresh | incremental update}

Summary tracks: last task {task_id}, {N} revision phases
```

## Success Criteria

- Summary.md exists in the project directory with valid frontmatter
- Content is grounded in implementation outcomes, not plans
- Sections with no content are omitted
- Frontmatter tracking fields are current
- Summary is under 200 lines for typical projects
- Re-run after revisions updates only affected sections
- Re-run with no changes produces no modifications
