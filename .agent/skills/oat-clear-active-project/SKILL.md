---
name: oat-clear-active-project
description: Clear the active project pointer
---

# Clear Active Project

Clear the active OAT project pointer.

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
.oat/scripts/generate-oat-state.sh
```

### Step 4: Confirm to User

Show user: "Active project cleared. Dashboard updated."
