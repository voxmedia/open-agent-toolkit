---
name: oat-project-pr-final
version: 1.2.0
description: Use when an active OAT project has completed all phases and is ready for final merge to main. Generates the final OAT lifecycle PR description from artifacts and review status, with optional PR creation.
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

**Purpose:** Create final PR description and (optionally) open a PR.

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
- Running `gh pr create` (optional, user-confirmed)

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
- base branch (default: `main`)

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

### Step 5: Optional - Open PR

Ask the user:

```
PR description written to {path}.

Do you want to open a PR now?
1) Yes (use gh CLI if available)
2) No (I will open manually)
```

If user chooses (1):

**CRITICAL — Strip YAML frontmatter before submitting to GitHub.**
The local artifact file contains YAML frontmatter (`---` delimited block at the top) for OAT metadata. This frontmatter MUST NOT appear in the GitHub PR body. Before passing the file to `gh pr create`, strip everything from the start of the file through and including the closing `---` line. Verify the resulting body starts with the markdown heading (e.g., `# feat: ...`), not YAML keys.

Steps:

1. Write the stripped body to a temporary file (remove all lines from the opening `---` through the closing `---`, inclusive).
2. Verify the temp file does not start with YAML frontmatter keys.
3. Push and create the PR:

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base main --title "{title}" --body-file "$TMP_BODY"
```

4. Clean up the temp file.

Do not assume `gh` is installed; if missing, instruct manual PR creation using the file contents.

### Step 6: Update Project State Milestone

After writing the PR artifact (and after optional PR creation), update `"$PROJECT_PATH/state.md"` so project routing reflects the next lifecycle step.

Required update:

- In the `## Next Milestone` section, set:
  - `Run \`oat-project-complete\`.`
- Update frontmatter: `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

If `state.md` is missing, skip with a warning.

## Success Criteria

- Residual active review artifacts are archived before final PR generation continues
- Final PR description artifact written to `{PROJECT_PATH}/pr/`
- Final review status checked and referenced
- User has clear next step to open PR (manual or gh)
- Project `state.md` next milestone points to `oat-project-complete`
