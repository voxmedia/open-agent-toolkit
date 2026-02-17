---
name: oat-project-complete
description: Use when all implementation work is finished and the project is ready to close. Marks the OAT project lifecycle as complete.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, AskUserQuestion
---

# Complete Project

Mark the active OAT project lifecycle as complete.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ COMPLETE PROJECT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Before multi-step work (updating state, optional archive/cleanup, dashboard refresh), print 2–5 short step indicators.
- For any operation that may take noticeable time, print a start line and a completion line (duration optional).

## Process

### Step 1: Resolve Active Project

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)

if [[ -z "$PROJECT_PATH" ]]; then
  echo "Error: No active project set. Use the oat-project-open skill first." >&2
  exit 1
fi

PROJECT_NAME=$(basename "$PROJECT_PATH")
```

### Step 2: Confirm with User

Ask user: "Are you sure you want to mark **{PROJECT_NAME}** as complete?"

If user declines, exit gracefully.

### Step 3: Check for Final Review (Warning + Confirmation)

```bash
PLAN_FILE="${PROJECT_PATH}/plan.md"

if [[ -f "$PLAN_FILE" ]]; then
  final_row=$(grep -E "^\|\s*final\s*\|" "$PLAN_FILE" | head -1 || true)
  if [[ -z "$final_row" ]]; then
    echo "Warning: No final review row found in plan.md."
  elif ! echo "$final_row" | grep -qE "\|\s*passed\s*\|"; then
    echo "Warning: Final code review is not marked passed."
    echo "Recommendation: run the oat-project-review-provide skill with code final and oat-project-review-receive before completing."
  fi
else
  echo "Warning: plan.md not found, unable to verify final review status."
fi
```

### Step 3.5: Check Deferred Medium Findings (Warning + Confirmation)

```bash
IMPL_FILE="${PROJECT_PATH}/implementation.md"

if [[ -f "$IMPL_FILE" ]]; then
  if rg -n "Deferred Findings \(Medium|Deferred Findings \(Medium/Minor" "$IMPL_FILE" >/dev/null 2>&1; then
    echo "Warning: Deferred Medium findings are recorded in implementation.md."
    echo "Recommendation: resurface via final review and explicitly disposition before completion."
  fi
fi
```

After Step 3 and 3.5 warnings:
- Ask user for explicit confirmation to continue if final review is not `passed` OR deferred Medium findings are present.
- Suggested prompt: "Completion gates are not fully satisfied. Continue marking lifecycle complete anyway?"

### Step 4: Check for PR Description (Warning Only)

```bash
if [[ ! -f "${PROJECT_PATH}/pr-description.md" ]]; then
  echo "Warning: No PR description found. Consider running the oat-project-pr-final skill first."
fi
```

### Step 5: Set Lifecycle Complete

Update state.md frontmatter to add/update `oat_lifecycle: complete`:

```bash
STATE_FILE="${PROJECT_PATH}/state.md"

# Check if oat_lifecycle already exists
if grep -q "^oat_lifecycle:" "$STATE_FILE"; then
  # Update existing (portable approach using temp file)
  sed 's/^oat_lifecycle:.*/oat_lifecycle: complete/' "$STATE_FILE" > "$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
else
  # Add after oat_phase_status line using awk (more portable for multi-line inserts)
  awk '/^oat_phase_status:/ {print; print "oat_lifecycle: complete"; next} 1' "$STATE_FILE" > "$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
fi
```

### Step 6: Offer Archive for Shared Projects

Detect whether the active project is under shared projects root:

```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
ARCHIVED_ROOT=".oat/projects/archived"
IS_SHARED_PROJECT="false"

case "$PROJECT_PATH" in
  "${PROJECTS_ROOT}/"*) IS_SHARED_PROJECT="true" ;;
esac
```

If `IS_SHARED_PROJECT` is `true`, ask user:

"This is a shared project. Move it to `.oat/projects/archived/` now?"

If user approves:

```bash
mkdir -p "$ARCHIVED_ROOT"
ARCHIVE_PATH="${ARCHIVED_ROOT}/${PROJECT_NAME}"

if [[ -e "$ARCHIVE_PATH" ]]; then
  ARCHIVE_PATH="${ARCHIVED_ROOT}/${PROJECT_NAME}-$(date +%Y%m%d-%H%M%S)"
fi

mv "$PROJECT_PATH" "$ARCHIVE_PATH"
PROJECT_PATH="$ARCHIVE_PATH"
echo "Project archived to $ARCHIVE_PATH"
```

**Git handling after archive:**

If the archived directory is gitignored (check with `git check-ignore -q "$ARCHIVE_PATH"`), the move looks like a deletion to git — the original tracked files disappear and the archived copy is local-only. To commit:

```bash
git add -A "$PROJECTS_ROOT/$PROJECT_NAME" 2>/dev/null || true
```

This stages the deletions from the shared directory. The archived copy is preserved locally but not tracked by git.

**Worktree note (recommended):**

If running from a git worktree and the primary repo archive path is accessible, copy the archived project there as well so history is available from the main checkout:

```bash
MAIN_REPO_ARCHIVE="/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/archived"

if [[ -d "$(dirname "$MAIN_REPO_ARCHIVE")" ]]; then
  mkdir -p "$MAIN_REPO_ARCHIVE"
  cp -R "$ARCHIVE_PATH" "$MAIN_REPO_ARCHIVE/"
fi
```

### Step 7: Offer to Clear Active Project

Ask user: "Would you like to clear the active project pointer?"

If yes:
```bash
rm -f .oat/active-project
echo "Active project cleared."
```

### Step 8: Regenerate Dashboard

```bash
.oat/scripts/generate-oat-state.sh
```

### Step 9: Confirm to User

Show user:
- "Project **{PROJECT_NAME}** marked as complete."
- If archived: "Archived location: **{PROJECT_PATH}**"
