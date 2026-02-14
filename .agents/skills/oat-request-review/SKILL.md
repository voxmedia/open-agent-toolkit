---
name: oat-request-review
description: Use when ready to review completed work before merging - after implementing a task, phase, or full project; when quality gate needed before PR
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash(git:*), AskUserQuestion
---

# Request Review

Request and execute a code or artifact review for the current project scope.

## Purpose

Produce an independent review artifact that verifies spec/design alignment and code quality.

## Prerequisites

**Required:** Active project with at least one completed task.

## Mode Assertion

**OAT MODE: Review Request**

**Purpose:** Determine review scope and execute a fresh-context review.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ REQUEST REVIEW
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Before multi-step work (scope resolution, file gathering, writing artifact), print 2–5 short step indicators, e.g.:
  - `[1/4] Resolving scope + range…`
  - `[2/4] Collecting files + context…`
  - `[3/4] Running review (fresh context)…`
  - `[4/4] Writing review artifact…`
- For long-running operations (reviewing large diffs, running verification commands), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

**BLOCKED Activities:**
- No code changes during review
- No fixing issues found (that comes in receive-review)

**ALLOWED Activities:**
- Reading artifacts and code
- Running verification commands
- Writing review artifact

## Usage

### With arguments (if supported)

```
/oat:request-review code p02          # Code review for phase
/oat:request-review code p02-t03      # Code review for task
/oat:request-review code final        # Final code review
/oat:request-review code base_sha=abc # Review since specific SHA
/oat:request-review artifact discovery # Artifact review of discovery.md
/oat:request-review artifact spec     # Artifact review of spec.md
/oat:request-review artifact design   # Artifact review of design.md
```

### Without arguments

Run `/oat:request-review` and the skill will:
1. Ask review type (code or artifact)
2. Ask scope (task/phase/final/range)
3. Confirm before running

## Process

### Step 0: Resolve Active Project

OAT stores the active project path in `.oat/active-project` (single line, local-only).

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**
- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future use:
  ```bash
  mkdir -p .oat
  echo "$PROJECT_PATH" > .oat/active-project
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Parse Arguments or Ask

**If arguments provided:**
- Parse `$ARGUMENTS[0]` as review type: `code` or `artifact`
- Parse `$ARGUMENTS[1]` as scope token

**If no arguments:**
- Ask: "What type of review? (code / artifact)"
- Ask: "What scope?"
  - For code: `pNN-tNN` task / `pNN` phase / `final` / `base_sha=SHA` / `SHA..HEAD` range
  - For artifact: `discovery` / `spec` / `design` (and optionally `plan`)

### Step 2: Validate Artifacts Exist

```bash
ls "$PROJECT_PATH/spec.md" "$PROJECT_PATH/design.md" "$PROJECT_PATH/plan.md" "$PROJECT_PATH/discovery.md" 2>/dev/null
```

**Required for code review:**
- spec.md (requirements to verify)
- design.md (design decisions to verify)
- plan.md (tasks being reviewed)

**Required for artifact review:**
- The artifact being reviewed (discovery.md / spec.md / design.md / plan.md)
- discovery.md (required when reviewing spec.md)
- spec.md (required when reviewing design.md or plan.md)
- design.md (required when reviewing plan.md)

**If missing:** Note which artifacts are missing. Do not guess - the review will flag gaps.

### Step 3: Determine Scope and Commits

If review type is `artifact`:
- Interpret the scope token as the artifact name (`discovery`, `spec`, `design`, or `plan`)
- Set `SCOPE_RANGE=""` (no git range required)
- Proceed to Step 5 (metadata); Step 4 uses artifact files, not git diff

If review type is `code`, use the scope resolution below.

**Priority order for scope resolution:**

1. **Explicit user input (preferred):**
   - `base_sha=<sha>` → review range is `<sha>..HEAD`
   - `<sha1>..<sha2>` → exact range review
   - `pNN-tNN` → task scope
   - `pNN` → phase scope
   - `final` → full project review

2. **Automatic phase detection (if invoked at phase boundary):**
   - Derive current phase from plan.md + implementation.md
   - Use commit convention grep to find commits:
     ```bash
     # Task commits: grep for (pNN-tNN)
     git log --oneline --grep="\(p${PHASE}-t" HEAD~50..HEAD

     # Phase commits: grep for (pNN-
     git log --oneline --grep="\(p${PHASE}-" HEAD~50..HEAD
     ```

3. **Fallback (if commit conventions missing/inconsistent):**
   - Prompt user to choose:
     - Provide `base_sha=<sha>`
     - Provide `<sha1>..<sha2>` range
     - Confirm "review merge-base..HEAD" (all changes on branch)

   **Merge-base approach:**
   ```bash
   MERGE_BASE=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null)
   SCOPE_RANGE="$MERGE_BASE..HEAD"
   ```

### Step 4: Get Files Changed

If review type is `code`, once scope range is determined:

```bash
FILES_CHANGED=$(git diff --name-only "$SCOPE_RANGE" 2>/dev/null)
FILE_COUNT=$(echo "$FILES_CHANGED" | wc -l | tr -d ' ')
```

If review type is `artifact`, the "files in scope" are the artifact(s):

```bash
case "$SCOPE_TOKEN" in
  discovery) FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/discovery.md") ;;
  spec) FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/spec.md" "$PROJECT_PATH/discovery.md") ;;
  design) FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/design.md" "$PROJECT_PATH/spec.md") ;;
  plan) FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/plan.md" "$PROJECT_PATH/spec.md" "$PROJECT_PATH/design.md") ;;
esac
FILE_COUNT=$(echo "$FILES_CHANGED" | wc -l | tr -d ' ')
```

Display to user:
```
Review scope: {scope}
Range: {SCOPE_RANGE} (code reviews only; artifact reviews have no git range)
Files changed: {FILE_COUNT}

{FILE_LIST preview - first 20 files}

Proceed with review?
```

### Step 4.5: Gather Deferred Findings Ledger (Final Scope Only)

If `review type == code` and `scope == final`, gather unresolved deferred findings from prior review cycles.

Preferred sources:
- `implementation.md` sections titled `Deferred Findings (...)`
- prior review artifacts under `reviews/` when implementation notes are incomplete

Build:
- `DEFERRED_MEDIUM_COUNT`
- `DEFERRED_MINOR_COUNT`
- `DEFERRED_LEDGER` (one-line summary per finding with source artifact)

Rules:
- Include this ledger in review metadata so final review explicitly re-evaluates carry-forward debt.
- Final review should call out whether each deferred Medium remains acceptable or should now be fixed.

### Step 5: Prepare Review Metadata Block

Build the "Review Scope" metadata for the reviewer:

```markdown
## Review Scope

**Project:** {PROJECT_PATH}
**Type:** {code|artifact}
**Scope:** {scope}{optional: " (" + SCOPE_RANGE + ")"}
**Date:** {today}

**Artifact Paths:**
- Spec: {PROJECT_PATH}/spec.md
- Design: {PROJECT_PATH}/design.md
- Plan: {PROJECT_PATH}/plan.md
- Implementation: {PROJECT_PATH}/implementation.md
- Discovery: {PROJECT_PATH}/discovery.md

**Tasks in Scope (code review only):** {task IDs from plan.md matching scope}

**Files Changed ({FILE_COUNT}):**
{FILE_LIST}

**Commits (code review only):**
{git log --oneline for SCOPE_RANGE}

**Deferred Findings Ledger (final scope only):**
- Deferred Medium count: {DEFERRED_MEDIUM_COUNT}
- Deferred Minor count: {DEFERRED_MINOR_COUNT}
{DEFERRED_LEDGER}
```

### Step 6: Execute Review (3-Tier Capability Model)

**Tier 1: Subagent (if available)**

If the host supports spawning subagents (e.g., Claude Code Task tool):
- Spawn `oat-reviewer` agent with the Review Scope metadata
- Instruct it to write the review artifact
- Subagent ends with: "Review complete. Return to main session and run /oat:receive-review"

Tell user: "Running review via subagent (fresh context)..."

**Tier 2: Fresh Session (recommended fallback)**

If subagents not available:
- Tell user: "Subagent not available. For best results, run this review in a fresh session."
- If user is already in a fresh session (confirmed), proceed to Tier 3.
- If user prefers fresh session: provide instructions and exit.

Instructions for fresh session:
```
To run review in a fresh session:
1. Open a new terminal/session
2. Run: /oat:request-review code {scope}
3. When complete, return to this session
4. Run: /oat:receive-review
```

**Tier 3: Inline Reset (fallback)**

If user insists on inline review in current session:
- Tell user: "Running inline review. This is less reliable than fresh context."
- Run "reset protocol":
  1. Re-read spec.md, design.md, plan.md from scratch
  2. Read all files in FILES_CHANGED
  3. Apply oat-reviewer checklist inline
  4. Write review artifact

### Step 7: Determine Review Artifact Path

**Naming convention:**
- Phase review: `{PROJECT_PATH}/reviews/pNN-review-YYYY-MM-DD.md`
- Task review: `{PROJECT_PATH}/reviews/pNN-tNN-review-YYYY-MM-DD.md`
- Final review: `{PROJECT_PATH}/reviews/final-review-YYYY-MM-DD.md`
- Range review: `{PROJECT_PATH}/reviews/range-review-YYYY-MM-DD.md`
- Artifact review: `{PROJECT_PATH}/reviews/artifact-{artifact}-review-YYYY-MM-DD.md`

**If file exists for today:** append `-v2`, `-v3`, etc.

```bash
mkdir -p "$PROJECT_PATH/reviews"
```

### Step 8: Write Review Artifact (if Tier 3)

If running inline (Tier 3), execute the review and write artifact.

**Review checklist (from oat-reviewer):**
1. Verify scope (don't review out-of-scope changes)
2. If code review: verify spec/design alignment (missing/extra requirements)
3. If code review: verify code quality (correctness, tests, security, maintainability)
4. If artifact review: verify completeness/clarity/readiness of the artifact and its alignment with upstream artifacts
5. Categorize findings (Critical/Important/Medium/Minor)
6. For final scope: explicitly disposition deferred Medium ledger items (fix now vs accept defer)
7. Write artifact with file:line references and fix guidance

**Review artifact template:** (see `.agents/agents/oat-reviewer.md` for full format)

```markdown
---
oat_generated: true
oat_generated_at: {today}
oat_review_scope: {scope}
oat_review_type: {code|artifact}
oat_project: {PROJECT_PATH}
---

# {Code|Artifact} Review: {scope}

**Reviewed:** {today}
**Scope:** {scope description}
**Files reviewed:** {N}
**Commits:** {range}

## Summary

{2-3 sentence summary}

## Findings

### Critical
{findings or "None"}

### Important
{findings or "None"}

### Medium
{findings or "None"}

### Minor
{findings or "None"}

## Spec/Design Alignment

### Requirements Coverage
| Requirement | Status | Notes |
|-------------|--------|-------|
| {ID} | implemented / missing / partial | {notes} |

### Extra Work (not in requirements)
{list or "None"}

## Verification Commands

{commands to verify fixes}

## Recommended Next Step

Run `/oat:receive-review` to convert findings into plan tasks.
```

### Step 9: Update Plan Reviews Section

After review artifact is written, update `plan.md` `## Reviews` table *if plan.md exists*.

Update or add a row matching `{scope}`:
- `Scope`: `{scope}` (examples: `p02`, `final`, `spec`, `design`)
- `Type`: `code` or `artifact`
- `Status`: `received` (receive-review will decide `fixes_added` vs `passed`; `passed` now requires no unresolved Critical/Important/Medium and final deferred-medium disposition when applicable)
- `Date`: `{today}`
- `Artifact`: `reviews/{filename}.md`

If plan.md is missing (e.g., spec/design review before planning), skip this update and rely on the review artifact + next-step routing.

### Step 9.5: Commit Review Bookkeeping Atomically (Required)

After writing the review artifact and applying the Step 9 Reviews-table update, create an atomic bookkeeping commit.

**Commit scope:**
- Always include the review artifact file: `reviews/{filename}.md`
- Include `plan.md` when Step 9 updated the Reviews table
- Do not include unrelated implementation/code files in this commit

**Commit message:**
- `chore(oat): record {scope} review artifact`

**If the user asks to defer commit:**
- Require explicit user confirmation to proceed without commit
- Warn that uncommitted review bookkeeping can desync workflow routing/restart behavior
- In the summary, clearly state: "bookkeeping not committed (user-approved defer)"

### Step 10: Output Summary

**If subagent used (Tier 1):**
```
Review requested via subagent.

When the reviewer finishes, run /oat:receive-review to process findings.
```

**If fresh session recommended (Tier 2):**
```
For best review quality, run in a fresh session:

1. Open new terminal/session
2. Run: /oat:request-review code {scope}
3. Return here and run: /oat:receive-review

Or say "inline" to run review in current session (less reliable).
```

**If inline review completed (Tier 3):**
```
Review complete for {project-name}.

Scope: {scope}
Files reviewed: {N}
Findings: {N} critical, {N} important, {N} medium, {N} minor

Review artifact: {path}
Bookkeeping commit: {sha or "deferred with user approval"}

Next: Run /oat:receive-review to convert findings into plan tasks.
```

## Success Criteria

- Active project resolved
- Review type and scope determined
- Commit range identified
- Files changed list obtained
- Review executed (subagent, fresh session guidance, or inline)
- Review artifact written to correct path
- Plan.md Reviews section updated
- Review artifact + plan bookkeeping committed atomically (or explicitly deferred with user approval)
- For final scope, deferred findings ledger included in reviewer context
- User guided to next step (/oat:receive-review)
