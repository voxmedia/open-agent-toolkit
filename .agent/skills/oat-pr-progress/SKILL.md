---
name: oat-pr-progress
description: Create a progress PR description for a specific plan phase (pNN) using OAT artifacts and commit conventions; optionally open a PR
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Progress PR

Create a progress PR description (typically at a plan phase boundary) and write it to disk.

## Purpose

Generate a PR-ready summary that is:
- grounded in OAT artifacts (spec/design/plan/implementation)
- scoped to a specific phase (pNN) or an explicit git range
- easy to paste into GitHub (or used with `gh pr create` if desired)

## Prerequisites

**Required:**
- `.oat/active-project` points at an active project directory (or you can provide project name when prompted)
- `{PROJECT_PATH}/plan.md` exists

**Recommended:**
- Phase code review is `passed` in `plan.md` `## Reviews` before opening a progress PR.

## Mode Assertion

**OAT MODE: PR (Progress)**

**Purpose:** Create PR description and (optionally) open a PR.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ PR PROGRESS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Before multi-step work (scoping, reading artifacts, writing output), print 2–5 short step indicators, e.g.:
  - `[1/4] Resolving scope…`
  - `[2/4] Reading OAT artifacts…`
  - `[3/4] Collecting git context…`
  - `[4/4] Writing PR description…`
- For long-running operations (git logs/diffs on large ranges), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

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
/oat:pr-progress p02                 # progress PR for phase p02
/oat:pr-progress range=abc..def      # progress PR for explicit range
/oat:pr-progress base_sha=abc123     # progress PR for abc123..HEAD
```

### Without arguments

Run `/oat:pr-progress` and the skill will ask:
- which phase (pNN) or range to scope to
- PR title + base branch (defaults to main)

## Process

### Step 0: Resolve Active Project

OAT stores the active project path in `.oat/active-project` (single line, local-only).

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".agent/projects")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If missing/invalid:
- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it:
  ```bash
  mkdir -p .oat
  echo "$PROJECT_PATH" > .oat/active-project
  ```

### Step 1: Determine Scope (Phase or Range)

Parse args if provided (otherwise prompt):
- `pNN` (preferred for progress PRs)
- `range=<sha1>..<sha2>`
- `base_sha=<sha>` (meaning `<sha>..HEAD`)

If scope is `pNN`, gather commits via commit convention grep:
```bash
PHASE="p02" # example
git log --oneline --grep="\\(${PHASE}-" HEAD~500..HEAD
```

If the grep returns no commits:
- Tell user commit conventions are missing/inconsistent for this phase
- Ask user to provide:
  - `base_sha=<sha>` or `range=<sha1>..<sha2>`
  - or confirm a broad range (merge-base..HEAD)

If scope is `range`/`base_sha`, set:
- `SCOPE_RANGE` to the range string (e.g., `abc..HEAD`)

### Step 2: Load Artifacts

Read (as available):
- `{PROJECT_PATH}/spec.md`
- `{PROJECT_PATH}/design.md`
- `{PROJECT_PATH}/plan.md`
- `{PROJECT_PATH}/implementation.md` (if exists)

### Step 3: Check Review Status (Recommended)

If scope is `pNN`, check `plan.md` `## Reviews` table row:
- If `| pNN | code | passed | ...` exists: good
- Otherwise: warn that review has not been marked `passed` for this phase (e.g., it may be `received`, `fixes_added`, or `fixes_completed` pending re-review)

Do not block PR generation; this is a progress PR.

### Step 4: Collect Scope Data

Produce:
- commit list (for `pNN` grep or `SCOPE_RANGE`)
- changed files (best-effort)

For `SCOPE_RANGE`:
```bash
git log --oneline "$SCOPE_RANGE"
git diff --name-only "$SCOPE_RANGE"
git diff --shortstat "$SCOPE_RANGE"
```

For `pNN` (no reliable contiguous range):
- include the commit list from grep
- optionally include file lists per commit (only if needed; can be large)

### Step 5: Write PR Description Artifact

Write to:
- `{PROJECT_PATH}/pr/progress-{scope}-YYYY-MM-DD.md`

```bash
mkdir -p "$PROJECT_PATH/pr"
```

Frontmatter policy:
- Keep YAML frontmatter in the local artifact file for OAT metadata and traceability.
- Do **not** include YAML frontmatter in the PR body submitted to GitHub.

Reference links policy:
- Prefer clickable blob links to the current branch for References.
- Build links from `origin` + current branch when possible.
- If remote URL cannot be resolved into a web URL, fall back to plain relative paths.

Example link context:
```bash
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PROJECT_REL="${PROJECT_PATH#./}"

REPO_WEB=""
case "$ORIGIN_URL" in
  git@github.com:*) REPO_WEB="https://github.com/${ORIGIN_URL#git@github.com:}" ;;
  https://github.com/*) REPO_WEB="$ORIGIN_URL" ;;
esac
REPO_WEB="${REPO_WEB%.git}"
```

Recommended template:
```markdown
---
oat_generated: true
oat_generated_at: YYYY-MM-DD
oat_pr_type: progress
oat_pr_scope: {pNN|range}
oat_project: {PROJECT_PATH}
---

# PR: Progress - {project-name} ({scope})

## What

{1-3 sentence summary of what this phase delivered}

## Why

{How this supports goals from spec}

## Scope

- Project: `{PROJECT_PATH}`
- Scope: `{scope}`
- Commits:
{bulleted list}

## Validation

- Tests: {what was run / expected}
- Lint/Types/Build: {what was run / expected}

## References

- Spec: `[spec.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/spec.md)` (fallback: `{PROJECT_PATH}/spec.md`)
- Design: `[design.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/design.md)` (fallback: `{PROJECT_PATH}/design.md`)
- Plan: `[plan.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/plan.md)` (fallback: `{PROJECT_PATH}/plan.md`)
- Implementation: `[implementation.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/implementation.md)` (fallback: `{PROJECT_PATH}/implementation.md`)
```

### Step 6: Optional - Open PR

Ask the user:
```
PR description written to {path}.

Do you want to open a PR now?
1) Yes (use gh CLI if available)
2) No (I will open manually)
```

If user chooses (1), provide best-effort guidance:
- Strip YAML frontmatter from the local artifact into a temporary body file:
  ```bash
  BODY_FILE="{path}"
  TMP_BODY="$(mktemp -t oat-pr-body.XXXXXX.md)"
  awk 'NR==1 && $0=="---" {infm=1; next} infm && $0=="---" {infm=0; next} !infm {print}' "$BODY_FILE" > "$TMP_BODY"
  ```
- Use the stripped body file with `gh`:
```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base main --title "{title}" --body-file "$TMP_BODY"
```
- Optionally clean up temp file:
  ```bash
  rm -f "$TMP_BODY"
  ```

Do not assume `gh` is installed; if missing, instruct manual PR creation using the file contents.

## Success Criteria

- Scope determined (phase or explicit range)
- PR description artifact written to `{PROJECT_PATH}/pr/`
- User has clear next step to open PR (manual or gh)
