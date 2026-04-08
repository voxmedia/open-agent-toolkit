---
name: oat-project-pr-final
version: 1.3.2
description: Use when an active OAT project has completed all phases and is ready for final merge to main. Generates the final OAT lifecycle PR description from artifacts and review status, then creates the PR automatically.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Project PR (Final)

Create a final PR description for the entire project (typically merging the feature branch into `main`).

## Purpose

Generate a PR-ready summary grounded in canonical OAT artifacts, including:

- what shipped (from plan + implementation)
- why/how (from mode-appropriate requirements/design artifacts)
- what was reviewed (from plan Reviews table + review artifacts)

## Prerequisites

**Required:**

- `activeProject` in `.oat/config.local.json` points at an active project directory (or you can provide project name when prompted)
- `{PROJECT_PATH}/plan.md` exists
- In `spec-driven` mode: `{PROJECT_PATH}/spec.md` and `{PROJECT_PATH}/design.md` are required
- In `quick`/`import` mode: `spec.md`/`design.md` are optional

**Required (recommended to proceed):**

- Final code review status is `passed` in `{PROJECT_PATH}/plan.md` `## Reviews` table.

## Mode Assertion

**OAT MODE: PR (Project)**

**Purpose:** Create final PR description and open the PR.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ PR PROJECT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work (validating review status, reading artifacts, writing output), print 2–5 short step indicators, e.g.:
  - `[1/5] Preflighting review artifacts…`
  - `[2/5] Validating artifacts + review status…`
  - `[3/5] Reading OAT artifacts…`
  - `[4/5] Collecting git context…`
  - `[5/5] Writing PR description…`
- For long-running operations (git logs/diffs on large ranges), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

**BLOCKED Activities:**

- No implementation work
- No changing requirements/design/plan

**ALLOWED Activities:**

- Reading artifacts and git history
- Writing PR description file
- Running `gh pr create` (automatic)

## Usage

### With arguments (if supported)

```
oat-project-pr-final
oat-project-pr-final base=main
oat-project-pr-final title="feat: add review loop"
```

### Without arguments

Run the `oat-project-pr-final` skill and it will ask for:

- PR title
  - default when a known ticket is associated: `[{TICKET-NUM}] {Descriptive Project Title}`
  - otherwise default: `{type}: {project description}` using conventional-commit style (for example `feat: add review loop` or `docs: reorganize documentation for discoverability`)
- base branch (resolved from: explicit `base=` arg → `git.defaultBranch` in `.oat/config.json` → `git rev-parse --abbrev-ref origin/HEAD` → fallback `main`)

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If missing/invalid:

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

### Step 0.5: Archive Residual Active Review Artifacts

Before generating the final PR, detect any leftover active review artifacts in the top level of `"$PROJECT_PATH/reviews/"`:

```bash
find "$PROJECT_PATH/reviews" -maxdepth 1 -type f -name "*.md" 2>/dev/null
```

If any active review artifacts exist:

1. Create `"$PROJECT_PATH/reviews/archived"` if needed.
2. Rewrite any plan/implementation/state references touched during this preflight from `reviews/{filename}.md` to `reviews/archived/{filename}.md`.
3. Move each review artifact into `reviews/archived/`, adding a timestamp suffix when needed to avoid collisions.
4. Report the archived paths before continuing.

Rules:

- Only archive top-level active review artifacts. Leave `reviews/archived/` untouched.
- Keep archive destinations inside the project so worktree runs do not depend on the shared-project archive flow.

### Step 1: Validate Required Artifacts (Mode-Aware)

Resolve workflow mode from `state.md` (default `spec-driven`):

```bash
WORKFLOW_MODE=$(grep "^oat_workflow_mode:" "$PROJECT_PATH/state.md" 2>/dev/null | head -1 | awk '{print $2}')
WORKFLOW_MODE=${WORKFLOW_MODE:-spec-driven}
```

```bash
ls "$PROJECT_PATH/plan.md" 2>/dev/null
```

If missing: block and tell user which artifact(s) are required.

If `WORKFLOW_MODE=spec-driven`, also require:

```bash
ls "$PROJECT_PATH/spec.md" "$PROJECT_PATH/design.md" 2>/dev/null
```

If `WORKFLOW_MODE` is `quick` or `import`, proceed without spec/design and include a reduced-assurance note in the PR body.

### Step 2: Check Final Review Status

Preferred source of truth (v1): `plan.md` `## Reviews` table.

```bash
FINAL_ROW=$(grep -E "^\\|\\s*final\\s*\\|" "$PROJECT_PATH/plan.md" 2>/dev/null | head -1)
echo "$FINAL_ROW"
```

If `FINAL_ROW` is missing or does not contain `passed`:

- Tell user: "Final review is not marked passed. Run the `oat-project-review-provide` skill with `code final` then the `oat-project-review-receive` skill."
- Ask whether to proceed anyway (allowed, but discouraged).
  - If the status is `fixes_completed`: fixes were implemented but the re-review hasn't been run/recorded yet; re-run the `oat-project-review-provide` skill with `code final` then the `oat-project-review-receive` skill to reach `passed`.

### Step 3: Collect Project Summary

**Step 3.0: Check for summary.md**

Check if `{PROJECT_PATH}/summary.md` exists:

- If `summary.md` is missing or stale, refresh it automatically before proceeding.
- Prefer running the `oat-project-summary` skill when skill-to-skill invocation is available in the current host/runtime.
- If direct skill invocation is unavailable, generate or update `summary.md` inline by following the same synthesis rules as `oat-project-summary` (validate implementation state, read the same project artifacts, apply the same freshness checks, update the same frontmatter tracking fields, and write a complete `summary.md` before continuing).
- Do not assume `oat-project-summary` is a shell command on `PATH`. Only execute a shell command with that name if the environment explicitly provides a real executable.
- Do not ask whether to generate or refresh `summary.md` during pr-final.
- **If generation succeeds:** Read the refreshed `summary.md` and use it as the primary source for the PR description's `## Summary` section. The PR Summary should be a condensed version of summary.md's Overview + What Was Implemented sections — reviewer-oriented and actionable, not a copy-paste.
- **If generation fails:** Warn and fall back to the raw artifact synthesis below.
- **If `summary.md` already exists and is current:** Read it directly and use it as the primary summary source.

**Step 3.1: Read remaining artifacts**

Read:

- `{PROJECT_PATH}/spec.md` (goals, priorities, verification; optional in quick/import)
- `{PROJECT_PATH}/design.md` (architecture + testing strategy; optional in quick/import)
- `{PROJECT_PATH}/plan.md` (phases/tasks + reviews table)
- `{PROJECT_PATH}/implementation.md` (if exists; preferred for “what actually happened”)
- `{PROJECT_PATH}/discovery.md` (recommended for quick mode)
- `{PROJECT_PATH}/references/imported-plan.md` (recommended for import mode)

If `implementation.md` exists, check for a filled `## Final Summary (for PR/docs)` section:

- If missing or obviously empty, warn the user that PR/docs quality will suffer and recommend:
  - Run the `oat-project-implement` skill to finalize the summary (if implementation just completed), or
  - Manually fill in the Final Summary section before proceeding.

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

Resolve the default PR title before writing the artifact or opening the PR:

- First, look for a clearly associated ticket ID in project artifacts and nearby context. Accept common ticket formats like `ABC-1234`.
- Check, in order:
  - explicit user-provided title or ticket (if supplied)
  - `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `references/imported-plan.md`
  - current branch name, if it contains a clear ticket token
- If a ticket is found, default to:
  - `[{TICKET-NUM}] {Descriptive Project Title}`
- If no ticket is found, default to a conventional-commit title:
  - Prefer a domain-specific type when obvious from the project (`docs:`, `feat:`, `fix:`, `refactor:`)
  - Fall back to `feat:` when no stronger type is clear
  - Use a concise description derived from the project goal or shipped change, not the literal project directory name when a clearer phrase is available
- Examples:
  - `[JIRA-1234] Documentation Reorganization`
  - `docs: reorganize documentation for discoverability`

### Step 4: Write PR Description Artifact

Write to:

- `{PROJECT_PATH}/pr/project-pr-YYYY-MM-DD.md`

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

Local path exclusion:

- Read `.oat/config.json` and extract `localPaths` (glob patterns for gitignored directories).
- Do **not** include References links to any path that matches a `localPaths` pattern — those paths are gitignored and will not exist on the remote.
- Common matches: `.oat/projects/**/reviews/archived`, `.oat/projects/**/pr`. Active `reviews/` paths remain eligible for References when they are tracked; only archived review paths should be treated as local-only by default.

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
oat_pr_type: project
oat_pr_scope: final
oat_project: { PROJECT_PATH }
---

# {title}

## Summary

{2-5 sentence summary grounded in spec + implementation}

## Goals / Non-Goals

{brief bullets from available requirement artifacts: spec in spec-driven mode; discovery/import source in quick/import}

## Changes

{phase-by-phase or capability-by-capability bullets from plan/implementation}

## Verification

{what was run / expected (tests, lint, types, build)}

## Reviews

{copy the relevant rows from plan.md Reviews table, especially final}

## References

Only include links to artifacts that actually exist in the project. Omit any that are absent.

- Spec: `[spec.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/spec.md)`
- Design: `[design.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/design.md)`
- Plan: `[plan.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/plan.md)` (fallback: `{PROJECT_PATH}/plan.md`)
- Implementation: `[implementation.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/implementation.md)` (fallback: `{PROJECT_PATH}/implementation.md`)
- Discovery: `[discovery.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/discovery.md)`
- Imported Source: `[references/imported-plan.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/references/imported-plan.md)`
- Reviews: `[reviews/]({REPO_WEB}/tree/{BRANCH}/{PROJECT_REL}/reviews)` (fallback: `{PROJECT_PATH}/reviews/`) — include when active `reviews/` is tracked; omit archived review paths and any target that still matches a `localPaths` pattern
```

### Step 5: Create PR

After writing the PR artifact, push and create the PR automatically.

**CRITICAL — Strip YAML frontmatter before submitting to GitHub.**
The local artifact file contains YAML frontmatter (`---` delimited block at the top) for OAT metadata. This frontmatter MUST NOT appear in the GitHub PR body. Before passing the file to `gh pr create`, strip everything from the start of the file through and including the closing `---` line. Verify the resulting body starts with the markdown heading (e.g., `# feat: ...`), not YAML keys.

Steps:

1. Write the stripped body to a temporary file (remove all lines from the opening `---` through the closing `---`, inclusive).
2. Verify the temp file does not start with YAML frontmatter keys.
3. Resolve the base branch:

```bash
# Resolution chain: explicit arg > OAT config > git remote > fallback
BASE_BRANCH="{base_arg if provided}"
if [ -z "$BASE_BRANCH" ]; then
  BASE_BRANCH=$(oat config get git.defaultBranch 2>/dev/null || true)
fi
if [ -z "$BASE_BRANCH" ]; then
  BASE_BRANCH=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's|origin/||' || true)
fi
BASE_BRANCH="${BASE_BRANCH:-main}"
```

4. Push and create the PR:

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base "$BASE_BRANCH" --title "{title}" --body-file "$TMP_BODY"
```

5. Clean up the temp file.

Do not assume `gh` is installed; if missing, instruct manual PR creation using the file contents and note the resolved base branch.

### Step 6: Update Project State to pr_open

After writing the PR artifact and creating the PR, update `"$PROJECT_PATH/state.md"` so project routing reflects both the actual PR state and the `pr_open` review posture.

**Frontmatter updates:**

- `oat_phase_status: pr_open`
- `oat_pr_status: ready` after the PR artifact exists but before `gh pr create` succeeds
- `oat_pr_status: open` after PR creation succeeds
- `oat_pr_url: "{created PR URL}"` after PR creation succeeds; leave `null` when PR still needs to be opened manually
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

**Content updates:**

- In `## Current Phase`, set:
  - `Implementation — PR open, awaiting human review.`
- In `## Progress`, add:
  - `- ✓ PR created`
  - `- ⧗ Awaiting human review`
- In `## Next Milestone`, set:

  ```markdown
  PR is open for review.

  - To incorporate feedback: run `oat-project-revise`
  - When approved: run `oat-project-complete`
  ```

If `state.md` is missing, skip with a warning.

## Success Criteria

- Residual active review artifacts are archived before final PR generation continues
- Final PR description artifact written to `{PROJECT_PATH}/pr/`
- Final review status checked and referenced
- User has clear next step to open PR (manual or gh)
- Project `state.md` shows `oat_phase_status: pr_open`
- Next milestone references both `oat-project-revise` (for feedback) and `oat-project-complete` (when approved)
