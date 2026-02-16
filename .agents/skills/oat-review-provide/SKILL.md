---
name: oat-review-provide
description: Run an ad-hoc code or file review when no OAT project/state exists.
argument-hint: "[unstaged|staged|base_branch=<branch>|base_sha=<sha>|<sha1>..<sha2>|--files <path1,path2,...>] [--output <path>] [--mode auto|local|tracked|inline]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Ad-Hoc Review

Request and execute a code/file review that is not tied to an OAT project lifecycle.

## Prerequisites

- Git repository with changes/files to review.
- User wants a code/diff review without requiring `.oat/active-project` or project artifacts.

## Mode Assertion

**OAT MODE: Ad-Hoc Review**

**Purpose:** Review commit ranges, working-tree diffs, or explicit files and write an optional review artifact even when no project state exists.

**BLOCKED Activities:**
- No implementation/code changes.
- No project state mutations unless user explicitly requests conversion into an OAT project flow.

**ALLOWED Activities:**
- Range-based code review.
- Optional review artifact generation (tracked or local-only).
- Inline review output when requested.

**Self-Correction Protocol:**
If you catch yourself:
- Expecting project artifacts (`state.md`, `plan.md`) for this review → STOP and continue in ad-hoc mode.
- Auto-committing tracked artifacts without user approval → STOP and ask.

**Recovery:**
1. Re-resolve review range directly from git.
2. Re-resolve artifact destination policy (local-only, tracked, or inline).

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ AD-HOC REVIEW
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print 2–5 short step indicators.
- For long-running operations, print a brief “starting…” line and a matching “done” line.

## Process

### Step 0: Resolve Review Scope

Parse `$ARGUMENTS` and resolve one scope mode:

- `--files <path1,path2,...>` → explicit file review (works for old/pre-existing files)
- `unstaged` → review current unstaged working tree changes
- `staged` → review staged changes (`--cached`)
- `base_branch=<branch>` → review current branch against merge-base with branch (e.g., `base_branch=main`)
- `base_sha=<sha>` → `{sha}..HEAD`
- `<sha1>..<sha2>` → exact range
- If omitted, ask user to choose one of the above and recommend `unstaged` for in-progress local review.

Recommended fallback:

```bash
MERGE_BASE=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null)
SCOPE_RANGE="$MERGE_BASE..HEAD"
```

Branch-based range example:

```bash
BASE_BRANCH="main"
MERGE_BASE=$(git merge-base "origin/$BASE_BRANCH" HEAD 2>/dev/null || git merge-base "$BASE_BRANCH" HEAD 2>/dev/null)
SCOPE_RANGE="$MERGE_BASE..HEAD"
```

### Step 1: Gather Scope Evidence (Mode-Aware)

For `--files` mode:
- Split comma-separated list
- Validate each file exists
- Set `FILES_CHANGED` to explicit files
- Set `SCOPE_RANGE=""` and `COMMITS=""`

For `unstaged` mode:

```bash
FILES_CHANGED=$(git diff --name-only 2>/dev/null || true)
FILE_COUNT=$(echo "$FILES_CHANGED" | sed '/^$/d' | wc -l | awk '{print $1}')
COMMITS=""
```

For `staged` mode:

```bash
FILES_CHANGED=$(git diff --cached --name-only 2>/dev/null || true)
FILE_COUNT=$(echo "$FILES_CHANGED" | sed '/^$/d' | wc -l | awk '{print $1}')
COMMITS=""
```

For commit-range modes:

```bash
FILES_CHANGED=$(git diff --name-only "$SCOPE_RANGE" 2>/dev/null || true)
FILE_COUNT=$(echo "$FILES_CHANGED" | sed '/^$/d' | wc -l | awk '{print $1}')
COMMITS=$(git log --oneline "$SCOPE_RANGE" 2>/dev/null || true)
```

Show the resolved scope and ask for confirmation before review.

### Step 2: Resolve Artifact Destination Policy

If user requested inline review explicitly, skip file output.

Otherwise resolve destination via helper script:

```bash
bash .agents/skills/oat-review-provide/scripts/resolve-review-output.sh --mode auto
```

Policy:
- If `.oat/reviews` exists and is not gitignored, assume user wants tracked artifacts there.
- Otherwise default to local-only `.oat/projects/local/orphan-reviews`.
- If user preference is unclear, ask and recommend local-only.

If user asks for tracked `.oat/reviews` and it is gitignored, warn and ask whether to:
- choose a different tracked destination, or
- use local-only/inline.

### Step 3: Determine Output Path (File Mode)

For file mode:

```bash
mkdir -p "$OUTPUT_DIR"
TODAY=$(date +%Y-%m-%d)
OUT_FILE="$OUTPUT_DIR/ad-hoc-review-$TODAY.md"
```

If the file already exists, suffix with `-v2`, `-v3`, etc.

### Step 4: Run Review

Use the same severity model and checklist as project reviews:
- Critical / Important / Minor findings
- file:line references
- actionable fix guidance
- verification commands

Template source of truth:
- `.agents/skills/oat-review-provide/references/review-artifact-template.md`

### Step 5: Write Artifact or Return Inline

- If file mode: write review artifact to `OUT_FILE`.
- If inline mode: return the same sections directly in session output.

### Step 6: Commit Bookkeeping (Tracked Destinations Only)

If artifact is in tracked storage (e.g., `.oat/reviews`), ask whether to commit bookkeeping.

Suggested commit (when approved):

```bash
git add "{artifact-path}"
git commit -m "chore(oat): record ad-hoc review artifact"
```

For local-only or inline modes, do not commit unless user explicitly requests.

### Step 7: Output Summary

Report (required):
- scope/range reviewed
- files reviewed
- findings counts by severity
- `Review artifact: {absolute-or-repo-relative path}` (or explicitly `inline-only`)
- whether bookkeeping commit was created/deferred

## Success Criteria

- ✅ Scope mode resolved and confirmed (`--files`, `unstaged`, `staged`, or commit range).
- ✅ Files in scope collected.
- ✅ Output policy resolved (local-only, tracked, or inline).
- ✅ Review findings produced with severity + file references.
- ✅ Review artifact written (or inline review returned).
- ✅ Artifact location explicitly reported after write.
- ✅ Tracked bookkeeping commit is explicit (created or intentionally deferred).
