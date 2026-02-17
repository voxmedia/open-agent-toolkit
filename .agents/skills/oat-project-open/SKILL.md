---
name: oat-project-open
description: Use when switching to or resuming a specific OAT project. Sets the active project pointer with validation.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, AskUserQuestion
---

# Open Project

Set the active OAT project with validation.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ OPEN PROJECT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Before multi-step work (listing, validating, writing pointer, dashboard refresh), print 2–5 short step indicators.
- For any operation that may take noticeable time, print a start line and a completion line (duration optional).

## Process

### Step 1: Resolve Projects Root

```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

### Step 2: List Available Projects

Show user available projects:

```bash
echo "Available projects in ${PROJECTS_ROOT}/:"
for dir in "${PROJECTS_ROOT}"/*/; do
  [[ -d "$dir" ]] || continue
  name=$(basename "$dir")
  if [[ -f "${dir}state.md" ]]; then
    phase=$(grep "^oat_phase:" "${dir}state.md" | head -1 | sed 's/oat_phase:[[:space:]]*//')
    echo "  - ${name} (${phase:-unknown})"
  fi
done
```

### Step 3: Accept Project Selection

Ask user: "Which project would you like to open?"

Accept project name from user input.

### Step 4: Validate Project

```bash
PROJECT_NAME="{user_input}"
PROJECT_PATH="${PROJECTS_ROOT}/${PROJECT_NAME}"

# Validate name (alphanumeric, dash, underscore only)
if [[ ! "$PROJECT_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo "Error: Invalid project name. Use only alphanumeric, dash, underscore." >&2
  exit 1
fi

# Validate directory exists
if [[ ! -d "$PROJECT_PATH" ]]; then
  echo "Error: Project directory not found: $PROJECT_PATH" >&2
  exit 1
fi

# Validate state.md exists
if [[ ! -f "${PROJECT_PATH}/state.md" ]]; then
  echo "Error: Project missing state.md: ${PROJECT_PATH}/state.md" >&2
  exit 1
fi
```

### Step 5: Write Active Project Pointer

Write full path for v1 compatibility:

```bash
mkdir -p .oat
echo "$PROJECT_PATH" > .oat/active-project
echo "Active project set to: $PROJECT_NAME"
```

### Step 6: Regenerate Dashboard

```bash
pnpm run cli -- state refresh
```

### Step 7: Confirm to User

Show user:
- Active project: {PROJECT_NAME}
- Phase: {oat_phase from state.md}
- Next step: {from Repo State Dashboard}
