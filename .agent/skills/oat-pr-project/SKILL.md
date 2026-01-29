---
name: oat-pr-project
description: Create the final project PR description (into main) using OAT artifacts and final review status; optionally open a PR
---

# Project PR (Final)

Create a final PR description for the entire project (typically merging the feature branch into `main`).

## Purpose

Generate a PR-ready summary grounded in canonical OAT artifacts, including:
- what shipped (from plan + implementation)
- why (from spec)
- how (from design)
- what was reviewed (from plan Reviews table + review artifacts)

## Prerequisites

**Required:**
- `.oat/active-project` points at an active project directory (or you can provide project name when prompted)
- `{PROJECT_PATH}/spec.md`, `{PROJECT_PATH}/design.md`, `{PROJECT_PATH}/plan.md` exist

**Required (recommended to proceed):**
- Final code review status is `passed` in `{PROJECT_PATH}/plan.md` `## Reviews` table.

## Mode Assertion

**OAT MODE: PR (Project)**

**Purpose:** Create final PR description and (optionally) open a PR.

**BLOCKED Activities:**
- No implementation work
- No changing requirements/design/plan

**ALLOWED Activities:**
- Reading artifacts and git history
- Writing PR description file
- Running `gh pr create` (optional, user-confirmed)

## Usage

### With arguments (if supported)

```
/oat:pr-project
/oat:pr-project base=main
/oat:pr-project title="feat: add review loop"
```

### Without arguments

Run `/oat:pr-project` and the skill will ask for:
- PR title (default: `{project-name}: final PR`)
- base branch (default: `main`)

## Process

### Step 0: Resolve Active Project

OAT stores the active project path in `.oat/active-project` (single line, local-only).

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
```

If missing/invalid:
- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `.agent/projects/{project-name}`
- Write it:
  ```bash
  mkdir -p .oat
  echo "$PROJECT_PATH" > .oat/active-project
  ```

### Step 1: Validate Required Artifacts

```bash
ls "$PROJECT_PATH/spec.md" "$PROJECT_PATH/design.md" "$PROJECT_PATH/plan.md" 2>/dev/null
```

If missing: block and tell user which artifact(s) are required.

### Step 2: Check Final Review Status

Preferred source of truth (v1): `plan.md` `## Reviews` table.

```bash
FINAL_ROW=$(grep -E "^\\|\\s*final\\s*\\|" "$PROJECT_PATH/plan.md" 2>/dev/null | head -1)
echo "$FINAL_ROW"
```

If `FINAL_ROW` is missing or does not contain `passed`:
- Tell user: "Final review is not marked passed. Run `/oat:request-review code final` then `/oat:receive-review`."
- Ask whether to proceed anyway (allowed, but discouraged).

### Step 3: Collect Project Summary

Read:
- `{PROJECT_PATH}/spec.md` (goals, priorities, verification)
- `{PROJECT_PATH}/design.md` (architecture + testing strategy)
- `{PROJECT_PATH}/plan.md` (phases/tasks + reviews table)
- `{PROJECT_PATH}/implementation.md` (if exists; preferred for “what actually happened”)

Collect git context:
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
MERGE_BASE=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null || echo "")
```

If merge-base is available, collect:
```bash
git log --oneline "${MERGE_BASE}..HEAD"
git diff --shortstat "${MERGE_BASE}..HEAD"
```

### Step 4: Write PR Description Artifact

Write to:
- `{PROJECT_PATH}/pr/project-pr-YYYY-MM-DD.md`

```bash
mkdir -p "$PROJECT_PATH/pr"
```

Recommended template:
```markdown
---
oat_generated: true
oat_generated_at: YYYY-MM-DD
oat_pr_type: project
oat_pr_scope: final
oat_project: {PROJECT_PATH}
---

# PR: {project-name}

## Summary

{2-5 sentence summary grounded in spec + implementation}

## Goals / Non-Goals

{brief bullets from spec}

## What Changed

{phase-by-phase or capability-by-capability bullets from plan/implementation}

## Verification

{what was run / expected (tests, lint, types, build)}

## Reviews

{copy the relevant rows from plan.md Reviews table, especially final}

## References

- Spec: `{PROJECT_PATH}/spec.md`
- Design: `{PROJECT_PATH}/design.md`
- Plan: `{PROJECT_PATH}/plan.md`
- Implementation: `{PROJECT_PATH}/implementation.md`
- Reviews: `{PROJECT_PATH}/reviews/`
```

### Step 5: Optional - Open PR

Ask the user:
```
PR description written to {path}.

Do you want to open a PR now?
1) Yes (use gh CLI if available)
2) No (I will open manually)
```

If user chooses (1), provide best-effort guidance:
```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base main --title "{title}" --body-file "{path}"
```

Do not assume `gh` is installed; if missing, instruct manual PR creation using the file contents.

## Success Criteria

- Final PR description artifact written to `{PROJECT_PATH}/pr/`
- Final review status checked and referenced
- User has clear next step to open PR (manual or gh)

