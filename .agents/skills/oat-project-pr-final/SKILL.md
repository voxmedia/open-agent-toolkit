---
name: oat-project-pr-final
version: 1.6.3
description: Use when the user requests or confirms opening the final PR for an active OAT project — e.g. "open the final PR", "ship it", "run oat-project-pr-final", or confirms a previously offered final-PR step. Do NOT auto-invoke when phases are marked complete. Generates the final lifecycle PR description from artifacts and creates the PR.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(awk:*), Bash(gh:*), Bash(git:*), Bash(mktemp:*), Bash(oat:*), Bash(rm:*), Glob, Grep, AskUserQuestion
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
- In `quick`/`import`/`lite` mode: `spec.md`/`design.md` are optional; lite
  proceeds with a reduced assurance note because plan.md is its full contract

**Required (recommended to proceed):**

- Final code review status is `passed` in `{PROJECT_PATH}/plan.md` `## Reviews` table.

## Mode Assertion

**OAT MODE: PR (Project)**

**Purpose:** Create final PR description and open the PR.

When `OAT_AUTONOMOUS=1`, read `references/docs/autonomy-contract.md` and keep
`OAT_NON_INTERACTIVE=1` set for this run. Autonomous resolution is limited to
the explicit branches below; never persist either environment signal. When
autonomy is inactive, preserve the existing interactive path unchanged.

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

## Artifact Hygiene

Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

After formatting, run only repository checks relevant to the files changed;
writing a PR description or project-state prose does not imply unrelated full
test suites.

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

**Archive eligibility is its own predicate.** An artifact is archive-eligible only when the `## Reviews` event that binds it — matched by `Scope` + `Type` + `Artifact` filename — has Status `passed` or `fixes_completed`. Those are the two processed statuses in `oat-project-review-receive`; `fixes_completed` still awaits re-review, and archiving it keeps the artifact discoverable without treating that re-review as done. A `pending`, `received`, or `fixes_added` event is still being consumed: leave its artifact in the top level of `reviews/` and report it. Leave a top-level artifact that no ledger event binds in place and report it too.

Archive eligibility is not the Step 2 final-review gate. Step 2 still requires the latest `final`/`code` event to be `passed`, so an archived `fixes_completed` final row still stops autonomous finalization at `PRFINAL-03`.

For each archive-eligible artifact:

1. Create `"$PROJECT_PATH/reviews/archived"` if needed.
2. Resolve the destination filename before anything is rewritten or moved: keep `{filename}.md` when `reviews/archived/{filename}.md` is free; otherwise `{stem}-$(date -u +%Y-%m-%dT%H%M%SZ).md`, then a `-2`, `-3`, … index while that name is also taken. Never overwrite an existing archive destination. This is the same collision-free identity rule as `oat-project-review-receive` Step 1, per DR-260706.
3. Rewrite references from `reviews/{filename}.md` to `reviews/archived/{destination}` in exactly these files:
   - `"$PROJECT_PATH/plan.md"`
   - `"$PROJECT_PATH/implementation.md"`
   - `"$PROJECT_PATH/state.md"`

   In `plan.md`, select the ledger event by `Scope` + `Type` + `Artifact` filename and rewrite only that event's Artifact cell. Duplicate scope/type rows keep their own identity; never rewrite a sibling row that merely shares the scope and type.

4. Move the review artifact to `reviews/archived/{destination}` only after those references are rewritten.
5. Report the archived paths before continuing.

Rules:

- Only archive top-level active review artifacts. Leave `reviews/archived/` untouched.
- Keep archive destinations inside the project so worktree runs do not depend on the shared-project archive flow.
- Step 0.5 is idempotent. A re-run re-derives eligibility from the ledger: an event whose Artifact cell already points inside `reviews/archived/` and whose top-level file is gone is already archived, so skip it — never rewrite its cell a second time and never write a second archived copy. Re-running over the same artifact set therefore neither duplicates nor clobbers an archived artifact.
- If a rewritten reference names an archived destination that does not exist while the source artifact is still in the top level, a previous run stopped between the rewrite and the move: complete the move to that exact destination rather than deriving a second name.

### Step 1: Validate Required Artifacts (Mode-Aware)

Resolve workflow mode from `state.md` (default `spec-driven`):

```bash
WORKFLOW_MODE=$(oat project status --field project.workflowMode 2>/dev/null || echo null)
```

```bash
ls "$PROJECT_PATH/plan.md" 2>/dev/null
```

If missing: block and tell user which artifact(s) are required.

If `WORKFLOW_MODE=spec-driven`, also require:

```bash
ls "$PROJECT_PATH/spec.md" "$PROJECT_PATH/design.md" 2>/dev/null
```

If `WORKFLOW_MODE` is `quick`, `import`, or `lite`, proceed without spec/design and include a reduced assurance note in the PR body. For lite, explicitly note that plan.md is the reduced artifact contract and the absence of discovery/spec/design is intentional.

### Step 2: Check Final Review Status

Preferred source of truth (v1): `plan.md` `## Reviews` table.

```bash
REVIEWS_SECTION=$(awk '
  /^## Reviews[[:space:]]*$/ { in_reviews = 1; next }
  in_reviews && /^##[[:space:]]/ { exit }
  in_reviews { print }
' "$PROJECT_PATH/plan.md" 2>/dev/null)
FINAL_ROW=$(printf '%s\n' "$REVIEWS_SECTION" | grep -E "^\\|\\s*final\\s*\\|\\s*code\\s*\\|" | tail -1)
echo "$FINAL_ROW"
```

`REVIEWS_SECTION` is strictly the `## Reviews` section through the next
level-two heading. Use the latest appended event in that ledger whose Scope is
`final` and Type is `code`. Earlier final-review events remain history and do
not determine the current gate.

If `FINAL_ROW` is missing or does not contain `passed`:

- If `OAT_AUTONOMOUS=1`, gate `PRFINAL-03` is a boundary stop. Never select
  "proceed anyway." Report the current or missing final-review row, record the
  blocker in project provenance, and stop before writing the PR artifact,
  pushing, or creating the PR. Route the resumable next step to
  `oat-project-review-provide code final` followed by
  `oat-project-review-receive`.
  - If the status is `fixes_completed`, require that same re-review/receive
    sequence to reach `passed`; completed fixes alone are not approval.
- Otherwise:
  - Tell user: "Final review is not marked passed. Run the
    `oat-project-review-provide` skill with `code final` then the
    `oat-project-review-receive` skill."
  - Ask whether to proceed anyway (allowed, but discouraged).
    - If the status is `fixes_completed`: fixes were implemented but the
      re-review hasn't been run/recorded yet; re-run the
      `oat-project-review-provide` skill with `code final` then the
      `oat-project-review-receive` skill to reach `passed`.

### Step 3: Collect Project Summary

Before generating a summary, inspect `oat_post_implement_sequence`. Reuse a
completed `summary` step instead of regenerating it; when no completed sequence
summary exists, retain normal summary generation. Every state update in this
skill must merge with, never replace, `oat_post_implement_sequence`. If a PR
was partially created, reconcile the durable PR state before retrying its `pr`
sequence step.

**Step 3.0: Check for summary.md**

Resolve the structurally exclusive route first:

```bash
# BEGIN LITE PR SUMMARY ROUTE CONTRACT
if [ "$WORKFLOW_MODE" = "lite" ]; then
  PR_SUMMARY_STRATEGY="lite-artifacts"
  GENERIC_SUMMARY_REACHABLE="false"
else
  PR_SUMMARY_STRATEGY="summary-md"
  GENERIC_SUMMARY_REACHABLE="true"
fi
# END LITE PR SUMMARY ROUTE CONTRACT
```

For `oat_workflow_mode: lite`, do not generate, refresh, or require
`summary.md`. Synthesize the PR summary directly from the `plan.md` `Summary`,
`Decisions`, and `Validation Criteria` sections plus the
`implementation.md` `Final Summary (for PR/docs)` shipped results. This is the
explicit reduced assurance path: absent `discovery.md`, `spec.md`, and
`design.md` are valid and must not block PR creation. Then continue to Step 3.1
only for the remaining available artifacts; do not invoke
`oat-project-summary` for lite. This branch ends Step 3.0 and jumps directly to
Step 3.1.

**Non-lite branch only:** If the route contract sets
`GENERIC_SUMMARY_REACHABLE=true`, check if `{PROJECT_PATH}/summary.md` exists:

- If `summary.md` is missing or stale, refresh it automatically before proceeding.
- When skill-to-skill invocation is available in the current host/runtime, load the current `oat-project-summary/SKILL.md` and follow it; never synthesize the summary from a remembered version of that skill.
- If direct skill invocation is unavailable, generate or update `summary.md` inline by following the same synthesis rules as `oat-project-summary` (validate implementation state, read the same project artifacts, apply the same freshness checks, update the same frontmatter tracking fields, and write a complete `summary.md` before continuing).
- Do not assume `oat-project-summary` is a shell command on `PATH`. Only execute a shell command with that name if the environment explicitly provides a real executable.
- Do not ask whether to generate or refresh `summary.md` during pr-final.
- **If generation succeeds:** Read the refreshed `summary.md` and use it as the primary source for the PR description's `## Summary` section. The PR Summary should be a condensed version of summary.md's Overview + What Was Implemented sections — reviewer-oriented and actionable, not a copy-paste.
- **If generation fails:** Warn and fall back to the raw artifact synthesis below.
- **If `summary.md` already exists and is current:** Read it directly and use it as the primary summary source.

**Step 3.1: Read remaining artifacts**

Read:

- `{PROJECT_PATH}/spec.md` (goals, priorities, verification; optional in quick/import/lite)
- `{PROJECT_PATH}/design.md` (architecture + testing strategy; optional in quick/import/lite)
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
- For `synced`, never add project artifact paths to References. The delimited
  `oat project links` block replaces them and contains only eligible pinned
  discovery/design/summary links; it never links plan, state, implementation,
  or reviews.

Local path exclusion:

- Read `.oat/config.json` and extract `localPaths` (glob patterns for gitignored directories).
- Do **not** include References links to any path that matches a `localPaths` pattern — those paths are gitignored and will not exist on the remote.
- Evaluate the match against the actual **file or subpath** you are about to link (e.g. `.oat/projects/<proj>/pr/project-pr-2026-04-01.md`), not against the parent directory. A pattern like `.oat/**/pr` is shorthand for "everything under this directory is local-only"; a directory-level `git check-ignore` on `.oat/projects/<proj>/pr` can report "not ignored" even when every file inside is local-only, so a directory-level check will produce a broken reference link.
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

{brief bullets from available requirement artifacts: spec in spec-driven mode; discovery/import source in quick/import; plan contract in lite}

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

**Ledger-path guard (both PR paths).** Before either `gh pr create` path runs, validate every artifact path in the project's `## Reviews` ledger. Parse each row's Artifact cell rather than grepping the section as free text, and skip a `-` placeholder. The ledger is the table rows of `## Reviews`: the scan ends at the next heading of any level, and a blockquoted line or a fenced block inside the section is a note or an example, never an event. Every other cell must normalize — `..` segments and symlinks resolved physically — to a regular file inside `$PROJECT_PATH`. The ledger is the table inside `## Reviews` whose header carries `Scope`, `Type`, and `Artifact` columns, matched after emphasis is stripped and in whatever order the header declares; a section that holds table rows but no such header, or an unclosed fenced block, stops rather than validating nothing. Processed review artifacts live in the gitignored `reviews/archived/`, so an absent path inside `reviews/archived/` is a local-only artifact: report it and continue. Every other absent path fails, in every project scope — git ignores whole project directories for `local`, `synced`, and `archived` projects, so ignore state says nothing about whether a row resolves. A missing file in a tracked location, a directory, a path that escapes the project, an unreadable ledger, a row the parser cannot read, or a ledger the guard could not check row for row stops this skill at gate `PRFINAL-05`, naming the offending row by scope, type, and artifact filename. Every stop fails closed. Both the synced flow below and the non-synced flow run after this block, so no PR is created from a ledger whose artifact paths do not resolve.

````bash
LEDGER_PROJECT_ROOT=$(cd -P "$PROJECT_PATH" 2>/dev/null && pwd -P) || {
  echo "PRFINAL-05: project path does not resolve: $PROJECT_PATH" >&2
  exit 1
}
if [ ! -r "$PROJECT_PATH/plan.md" ]; then
  echo "PRFINAL-05: cannot read the review ledger: $PROJECT_PATH/plan.md" >&2
  exit 1
fi
LEDGER_ROWS=$(awk -F'|' '
  !in_fence && /^[[:space:]]*(```|~~~)/ {
    marker = $0
    sub(/^[[:space:]]*/, "", marker)
    fence_char = substr(marker, 1, 1)
    fence_length = 0
    while (substr(marker, fence_length + 1, 1) == fence_char) fence_length++
    in_fence = 1
    next
  }
  in_fence {
    marker = $0
    sub(/^[[:space:]]*/, "", marker)
    close_length = 0
    while (substr(marker, close_length + 1, 1) == fence_char) close_length++
    if (close_length >= fence_length && substr(marker, close_length + 1) ~ /^[[:space:]]*$/) in_fence = 0
    next
  }
  /^## Reviews[[:space:]]*$/ { in_reviews = 1; at_table_start = 1; next }
  !in_reviews { next }
  /^##[[:space:]]/ { exit }
  /^#+[[:space:]]/ { at_table_start = 1; in_ledger_table = 0; next }
  /^[[:space:]]*>/ { next }
  /^[[:space:]]*$/ { at_table_start = 1; in_ledger_table = 0; next }
  $0 !~ /^[[:space:]]*\|/ {
    if ($0 ~ /\|/) {
      print "PRFINAL-05: unsupported review-ledger row (a row must start with |): " $0 > "/dev/stderr"
      exit 3
    }
    next
  }
  {
    for (i = 1; i <= NF; i++) {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i)
    }
  }
  at_table_start {
    at_table_start = 0
    saw_table = 1
    scope_column = 0
    type_column = 0
    artifact_column = 0
    last_cell = ($NF == "") ? NF - 1 : NF
    for (i = 2; i <= last_cell; i++) {
      header_cell = tolower($i)
      gsub(/[*_`]/, "", header_cell)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", header_cell)
      if (header_cell == "scope") scope_column = i
      if (header_cell == "type") type_column = i
      if (header_cell == "artifact") artifact_column = i
    }
    in_ledger_table = (scope_column > 0 && type_column > 0 && artifact_column > 0)
    if (in_ledger_table) {
      recognized_ledger = 1
    } else if (scope_column > 0 && type_column > 0) {
      print "PRFINAL-05: review-ledger table has no Artifact column; its rows cannot be validated" > "/dev/stderr"
      exit 3
    }
    next
  }
  !in_ledger_table { next }
  {
    last_cell = ($NF == "") ? NF - 1 : NF
    is_separator = (last_cell >= 2)
    for (i = 2; i <= last_cell; i++) {
      if ($i !~ /^:?-+:?$/) is_separator = 0
    }
  }
  is_separator { next }
  {
    artifact_value = $artifact_column
    unwrapping = 1
    while (unwrapping) {
      unwrapping = 0
      if (length(artifact_value) > 2 && artifact_value ~ /^`.*`$/) {
        artifact_value = substr(artifact_value, 2, length(artifact_value) - 2)
        unwrapping = 1
      } else if (length(artifact_value) > 4 && artifact_value ~ /^\*\*.*\*\*$/) {
        artifact_value = substr(artifact_value, 3, length(artifact_value) - 4)
        unwrapping = 1
      } else if (length(artifact_value) > 2 && artifact_value ~ /^\*.*\*$/) {
        artifact_value = substr(artifact_value, 2, length(artifact_value) - 2)
        unwrapping = 1
      } else if (length(artifact_value) > 2 && artifact_value ~ /^_.*_$/) {
        artifact_value = substr(artifact_value, 2, length(artifact_value) - 2)
        unwrapping = 1
      }
    }
    print $scope_column "\t" $type_column "\t" artifact_value
  }
  END {
    if (in_fence) {
      print "PRFINAL-05: unclosed fenced block; the review ledger was never scanned" > "/dev/stderr"
      exit 3
    }
    if (saw_table && !recognized_ledger) {
      print "PRFINAL-05: unrecognized review-ledger header; no table in ## Reviews carries Scope, Type, and Artifact columns" > "/dev/stderr"
      exit 3
    }
  }
' "$PROJECT_PATH/plan.md") || {
  echo "PRFINAL-05: cannot parse the review ledger: $PROJECT_PATH/plan.md" >&2
  exit 1
}
LEDGER_ROW_COUNT=$(printf '%s\n' "$LEDGER_ROWS" | grep -c '[^[:space:]]') || LEDGER_ROW_COUNT=0
LEDGER_ROWS_SEEN=0
LEDGER_PATH_FAILURES=0
while IFS="$(printf '\t')" read -r ROW_SCOPE ROW_TYPE ROW_ARTIFACT; do
  [ -n "$ROW_SCOPE$ROW_TYPE$ROW_ARTIFACT" ] || continue
  LEDGER_ROWS_SEEN=$((LEDGER_ROWS_SEEN + 1))
  if [ "$ROW_ARTIFACT" = "-" ]; then continue; fi
  ROW_REASON=""
  if [ -z "$ROW_ARTIFACT" ]; then
    ROW_REASON="artifact cell is empty"
  else
    ROW_TARGET="$PROJECT_PATH/$ROW_ARTIFACT"
    ROW_DIR=$(cd -P "$(dirname "$ROW_TARGET")" 2>/dev/null && pwd -P) || ROW_DIR=""
    ROW_RESOLVED=""
    if [ -n "$ROW_DIR" ]; then
      ROW_RESOLVED="$ROW_DIR/$(basename "$ROW_TARGET")"
      ROW_HOPS=0
      while [ -L "$ROW_RESOLVED" ] && [ "$ROW_HOPS" -lt 16 ]; do
        ROW_LINK=$(readlink "$ROW_RESOLVED")
        ROW_DIR=$(cd -P "$(dirname "$ROW_RESOLVED")" 2>/dev/null && cd -P "$(dirname "$ROW_LINK")" 2>/dev/null && pwd -P) || ROW_DIR=""
        if [ -z "$ROW_DIR" ]; then
          ROW_RESOLVED=""
          break
        fi
        ROW_RESOLVED="$ROW_DIR/$(basename "$ROW_LINK")"
        ROW_HOPS=$((ROW_HOPS + 1))
      done
    fi
    ROW_MATERIALIZED=1
    if [ -z "$ROW_RESOLVED" ]; then
      ROW_MATERIALIZED=0
      ROW_RESOLVED=$(printf '%s\n' "$LEDGER_PROJECT_ROOT/$ROW_ARTIFACT" | awk -F'/' '{
        depth = 0
        for (i = 1; i <= NF; i++) {
          if ($i == "" || $i == ".") continue
          if ($i == "..") { if (depth > 0) depth--; continue }
          segment[++depth] = $i
        }
        normalized = ""
        for (i = 1; i <= depth; i++) normalized = normalized "/" segment[i]
        print (normalized == "" ? "/" : normalized)
      }')
    fi
    ROW_CONTAINED=0
    case "$ROW_RESOLVED" in
      "$LEDGER_PROJECT_ROOT"/*) ROW_CONTAINED=1 ;;
    esac
    if [ "$ROW_CONTAINED" -eq 1 ] && [ "$ROW_MATERIALIZED" -eq 0 ]; then
      ROW_ANCESTOR="$ROW_RESOLVED"
      while [ ! -e "$ROW_ANCESTOR" ] && [ "$ROW_ANCESTOR" != "/" ]; do
        ROW_ANCESTOR=$(dirname "$ROW_ANCESTOR")
      done
      if [ ! -d "$ROW_ANCESTOR" ]; then
        ROW_ANCESTOR=$(dirname "$ROW_ANCESTOR")
      fi
      ROW_ANCESTOR_REAL=$(cd -P "$ROW_ANCESTOR" 2>/dev/null && pwd -P) || ROW_ANCESTOR_REAL=""
      case "$ROW_ANCESTOR_REAL" in
        "$LEDGER_PROJECT_ROOT" | "$LEDGER_PROJECT_ROOT"/*) ;;
        *) ROW_CONTAINED=0 ;;
      esac
    fi
    if [ "$ROW_CONTAINED" -eq 0 ]; then
      ROW_REASON="artifact resolves outside the project: $ROW_RESOLVED"
    elif [ "$ROW_MATERIALIZED" -eq 0 ]; then
      ROW_ARCHIVED_ONLY=0
      case "$ROW_RESOLVED" in
        "$LEDGER_PROJECT_ROOT"/reviews/archived/*) ROW_ARCHIVED_ONLY=1 ;;
      esac
      if [ "$ROW_ARCHIVED_ONLY" -eq 1 ]; then
        echo "oat: local-only review artifact, absent from this checkout | scope=$ROW_SCOPE type=$ROW_TYPE artifact=$ROW_ARTIFACT"
      else
        ROW_REASON="artifact file does not exist"
      fi
    elif [ -L "$ROW_RESOLVED" ]; then
      ROW_REASON="artifact symlink chain does not resolve within 16 hops"
    elif [ -d "$ROW_RESOLVED" ]; then
      ROW_REASON="artifact path is a directory"
    elif [ ! -e "$ROW_RESOLVED" ]; then
      ROW_ARCHIVED_ONLY=0
      case "$ROW_RESOLVED" in
        "$LEDGER_PROJECT_ROOT"/reviews/archived/*) ROW_ARCHIVED_ONLY=1 ;;
      esac
      if [ "$ROW_ARCHIVED_ONLY" -eq 1 ]; then
        echo "oat: local-only review artifact, absent from this checkout | scope=$ROW_SCOPE type=$ROW_TYPE artifact=$ROW_ARTIFACT"
      else
        ROW_REASON="artifact file does not exist"
      fi
    elif [ ! -f "$ROW_RESOLVED" ]; then
      ROW_REASON="artifact is not a regular file"
    fi
  fi
  [ -n "$ROW_REASON" ] || continue
  echo "PRFINAL-05: unresolved review-ledger artifact | scope=$ROW_SCOPE type=$ROW_TYPE artifact=$ROW_ARTIFACT | $ROW_REASON" >&2
  LEDGER_PATH_FAILURES=$((LEDGER_PATH_FAILURES + 1))
done <<LEDGER
$LEDGER_ROWS
LEDGER
if [ "$LEDGER_ROWS_SEEN" -ne "$LEDGER_ROW_COUNT" ]; then
  echo "PRFINAL-05: validated $LEDGER_ROWS_SEEN of $LEDGER_ROW_COUNT review-ledger rows; the ledger was not fully checked" >&2
  exit 1
fi
[ "$LEDGER_PATH_FAILURES" -eq 0 ] || exit 1
````

On `PRFINAL-05`, stop and repair the offending ledger row — usually a `reviews/` path whose artifact Step 0.5 moved into `reviews/archived/` — then re-run. Never create the PR with an unresolved ledger path.

For a synced project, use this ordered flow; do not reorder it:

1. Finish or refresh `summary.md` and the PR artifact.
2. Run `oat project push "$PROJECT_PATH" --message "chore(oat): prepare final PR artifacts" --json` so the ref contains both files; a nonzero exit stops the flow until the reported pull/conflict recovery is resolved and the push is retried.
3. Render `oat project links "$PROJECT_PATH" --format markdown` and insert or replace its delimited block in the stripped PR body. The initial body must already contain the freshly pushed summary link when `summary.md` exists.
4. Push the code branch, then run `gh pr create`; capture the returned URL.
5. Set `oat_pr_status: open`, `oat_pr_url`, `oat_phase_status: pr_open`, and the existing routing prose in `state.md`.
6. Run `oat project push "$PROJECT_PATH" --message "chore(oat): record final PR metadata" --json` again. A nonzero exit stops closeout until the reported recovery is resolved and the push is retried. A successful push publishes authoritative PR metadata and refreshes the GitHub links block to the new ref SHA.

Scope resolution is fail-closed:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing PR bookkeeping" >&2; exit 1; }
```

The non-synced flow below remains unchanged.

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
  - `Implementation — PR open; completion may run before or after merge.`
- In `## Progress`, add:
  - `- ✓ PR created`
  - `- ⧗ Awaiting human review`
- In `## Next Milestone`, set:

  ```markdown
  PR is open for review.

  - To incorporate feedback: run `oat-project-revise`
  - Complete before merge: run `oat-project-complete` now, then merge the PR.
  - Merge before completion: merge the PR, then run `oat-project-complete`.
  ```

Both orderings are supported. An open PR is not a blocker for
`oat-project-complete`; when completion archives project artifacts, it
regenerates and syncs the open PR body.

If `state.md` is missing, skip with a warning.

## Success Criteria

- Residual review artifacts whose ledger event is `passed` or `fixes_completed` are archived before final PR generation continues, with their ledger event rewritten; other rows keep their active path
- Every `## Reviews` artifact path resolves to a regular file inside the project before `gh pr create` runs
- Final PR description artifact written to `{PROJECT_PATH}/pr/`
- Final review status checked and referenced
- User has clear next step to open PR (manual or gh)
- Project `state.md` shows `oat_phase_status: pr_open`
- Next milestone references both `oat-project-revise` (for feedback) and both supported `oat-project-complete` orderings
