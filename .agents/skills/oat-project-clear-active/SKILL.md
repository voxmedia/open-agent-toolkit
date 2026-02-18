---
name: oat-project-clear-active
description: Use when switching context or cleaning up project state. Clears the active OAT project pointer.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, AskUserQuestion
---

# Clear Active Project

Clear the active OAT project pointer.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ CLEAR ACTIVE PROJECT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Before multi-step work (clearing pointer, dashboard refresh), print 2–3 short step indicators.
- For any operation that may take noticeable time, print a start line and a completion line (duration optional).

## Process

### Step 1: Check Current State

```bash
if [[ -f ".oat/active-project" ]]; then
  current=$(cat .oat/active-project)
  echo "Current active project: $current"
else
  echo "No active project is currently set."
  exit 0
fi
```

### Step 2: Clear Pointer

```bash
rm -f .oat/active-project
echo "Active project cleared."
```

### Step 3: Regenerate Dashboard

```bash
pnpm run cli -- state refresh
```

### Step 4: Confirm to User

Show user: "Active project cleared. Dashboard updated."
