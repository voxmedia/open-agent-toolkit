---
name: oat-complete-project
description: Mark a project lifecycle as complete
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
- Before multi-step work (updating state, optional cleanup, dashboard refresh), print 2–5 short step indicators.
- For any operation that may take noticeable time, print a start line and a completion line (duration optional).

## Process

### Step 1: Resolve Active Project

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)

if [[ -z "$PROJECT_PATH" ]]; then
  echo "Error: No active project set. Use /oat:open-project first." >&2
  exit 1
fi

PROJECT_NAME=$(basename "$PROJECT_PATH")
```

### Step 2: Confirm with User

Ask user: "Are you sure you want to mark **{PROJECT_NAME}** as complete?"

If user declines, exit gracefully.

### Step 3: Check for Final Review (Warning Only)

```bash
if [[ -d "${PROJECT_PATH}/reviews" ]]; then
  review_count=$(ls -1 "${PROJECT_PATH}/reviews"/*.md 2>/dev/null | wc -l)
  if [[ "$review_count" -eq 0 ]]; then
    echo "Warning: No review artifacts found. Consider running /oat:request-review first."
  fi
else
  echo "Warning: No reviews directory found. Consider running /oat:request-review first."
fi
```

### Step 4: Check for PR Description (Warning Only)

```bash
if [[ ! -f "${PROJECT_PATH}/pr-description.md" ]]; then
  echo "Warning: No PR description found. Consider running /oat:pr-project first."
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

### Step 6: Offer to Clear Active Project

Ask user: "Would you like to clear the active project pointer?"

If yes:
```bash
rm -f .oat/active-project
echo "Active project cleared."
```

### Step 7: Regenerate Dashboard

```bash
.oat/scripts/generate-oat-state.sh
```

### Step 8: Confirm to User

Show user: "Project **{PROJECT_NAME}** marked as complete."
