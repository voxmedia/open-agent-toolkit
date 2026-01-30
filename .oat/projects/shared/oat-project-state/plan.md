---
oat_status: complete
oat_ready_for: oat-implement
oat_blockers: []
oat_last_updated: 2026-01-30
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p03"]
oat_generated: false
oat_template: false
---

# Implementation Plan: oat-project-state

**Goal:** Provide skills to set, clear, and complete the active project, and generate a repo state dashboard showing current state at a glance.

**Architecture:** Shell script (`generate-oat-state.sh`) derives dashboard from existing sources; three thin skills (`oat-open-project`, `oat-clear-active-project`, `oat-complete-project`) manipulate the active project pointer and invoke the dashboard script.

**Tech Stack:** Bash (POSIX-compatible), git, standard utilities (grep, sed, awk, date, wc)

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` - e.g., `feat(p01-t01): create dashboard script skeleton`

---

## Phase 1: Dashboard Script (Core)

**Goal:** Implement `generate-oat-state.sh` that produces the repo dashboard from existing sources of truth.

**Verification:** Script generates correct dashboard for all test cases, idempotent, completes in <2s.

---

### Task p01-t01: Create Script Directory and Skeleton

**Files:**
- Create: `.oat/scripts/generate-oat-state.sh`

**Step 1: Create directory**

```bash
mkdir -p .oat/scripts
```

**Step 2: Create script skeleton**

```bash
#!/usr/bin/env bash
# generate-oat-state.sh - Generate OAT repo state dashboard
# Usage: ./generate-oat-state.sh
# Exit codes: 0 = Success, 1 = Error (only for real failures, not missing data)

# Use -eu but NOT pipefail - we need graceful degradation for missing data
set -eu

# --- Configuration ---
DASHBOARD_PATH=".oat/state.md"

# --- Error Handling Pattern ---
# For best-effort parsing, use:
#   result=$(command 2>/dev/null || echo "")
#   result=$(grep ... || true)
# Never let missing frontmatter or files cause script exit.

# --- Main ---
main() {
  echo "# OAT Repo State" > "$DASHBOARD_PATH"
  echo "" >> "$DASHBOARD_PATH"
  echo "**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$DASHBOARD_PATH"
}

main "$@"
```

**Step 3: Make executable**

```bash
chmod +x .oat/scripts/generate-oat-state.sh
```

**Step 4: Verify**

Run: `.oat/scripts/generate-oat-state.sh && cat .oat/state.md`
Expected: Dashboard file created with header and timestamp

**Step 5: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t01): create dashboard script skeleton"
```

---

### Task p01-t02: Implement PROJECTS_ROOT Resolution

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add resolution logic**

Add function after Configuration section:

```bash
# --- Functions ---

# Resolve PROJECTS_ROOT from env, file, or default
resolve_projects_root() {
  local root="${OAT_PROJECTS_ROOT:-}"
  if [[ -z "$root" ]] && [[ -f ".oat/projects-root" ]]; then
    root=$(cat ".oat/projects-root" 2>/dev/null || true)
  fi
  root="${root:-.agent/projects}"
  echo "${root%/}"  # Strip trailing slash
}
```

**Step 2: Use in main**

```bash
main() {
  local projects_root
  projects_root=$(resolve_projects_root)
  # ... rest of main
}
```

**Step 3: Verify**

Run: `OAT_PROJECTS_ROOT=/tmp/test .oat/scripts/generate-oat-state.sh && echo "OK"`
Expected: Script runs without error

**Step 4: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t02): implement PROJECTS_ROOT resolution"
```

---

### Task p01-t03: Implement Active Project Reading

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add dual-format reading function**

```bash
# Read active project pointer (accepts path or name format)
# Sets: PROJECT_NAME, PROJECT_PATH, PROJECT_STATUS
read_active_project() {
  local projects_root="$1"
  local raw_value

  PROJECT_NAME=""
  PROJECT_PATH=""
  PROJECT_STATUS="not set"

  if [[ ! -f ".oat/active-project" ]]; then
    return
  fi

  raw_value=$(cat ".oat/active-project" 2>/dev/null || true)
  raw_value=$(echo "$raw_value" | tr -d '[:space:]')

  if [[ -z "$raw_value" ]]; then
    return
  fi

  # Detect format: path (contains /) or name-only
  if [[ "$raw_value" == */* ]]; then
    PROJECT_NAME=$(basename "$raw_value")
    PROJECT_PATH="$raw_value"
  else
    PROJECT_NAME="$raw_value"
    PROJECT_PATH="${projects_root}/${PROJECT_NAME}"
  fi

  # Validate directory exists
  if [[ ! -d "$PROJECT_PATH" ]]; then
    PROJECT_STATUS="directory missing"
    return
  fi

  # Validate state.md exists
  if [[ ! -f "${PROJECT_PATH}/state.md" ]]; then
    PROJECT_STATUS="state.md missing"
    return
  fi

  PROJECT_STATUS="active"
}
```

**Step 2: Call from main**

```bash
main() {
  local projects_root
  projects_root=$(resolve_projects_root)

  read_active_project "$projects_root"

  # ... dashboard generation
}
```

**Step 3: Verify**

Run: `.oat/scripts/generate-oat-state.sh && echo "Status: $PROJECT_STATUS"`
Expected: Script runs, PROJECT_STATUS reflects actual state

**Step 4: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t03): implement active project reading with dual format"
```

---

### Task p01-t04: Implement Project State Parsing

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add frontmatter parsing function**

```bash
# Parse YAML frontmatter field from file (best-effort, never fails)
# Usage: parse_frontmatter "file.md" "field_name"
# Returns: Field value or empty string (never exits on missing data)
parse_frontmatter() {
  local file="$1"
  local field="$2"
  local content value

  if [[ ! -f "$file" ]]; then
    echo ""
    return 0
  fi

  # Extract frontmatter block, then find field - use || true to prevent exit
  content=$(sed -n '/^---$/,/^---$/p' "$file" 2>/dev/null) || true
  if [[ -z "$content" ]]; then
    echo ""
    return 0
  fi

  # Find field value - grep returns 1 if no match, so use || true
  value=$(echo "$content" | grep "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//") || true
  echo "$value"
}

# Read project state from state.md frontmatter
# Sets: OAT_PHASE, OAT_PHASE_STATUS, OAT_LIFECYCLE, OAT_BLOCKERS
read_project_state() {
  local state_file="${PROJECT_PATH}/state.md"

  OAT_PHASE=$(parse_frontmatter "$state_file" "oat_phase")
  OAT_PHASE_STATUS=$(parse_frontmatter "$state_file" "oat_phase_status")
  OAT_LIFECYCLE=$(parse_frontmatter "$state_file" "oat_lifecycle")
  OAT_BLOCKERS=$(parse_frontmatter "$state_file" "oat_blockers")

  # Defaults
  OAT_PHASE="${OAT_PHASE:-unknown}"
  OAT_PHASE_STATUS="${OAT_PHASE_STATUS:-unknown}"
  OAT_LIFECYCLE="${OAT_LIFECYCLE:-active}"
  OAT_BLOCKERS="${OAT_BLOCKERS:-[]}"
}
```

**Step 2: Call from main**

```bash
main() {
  # ... after read_active_project

  if [[ "$PROJECT_STATUS" == "active" ]]; then
    read_project_state
  fi

  # ... dashboard generation
}
```

**Step 3: Verify**

Run: `.oat/scripts/generate-oat-state.sh && echo "Phase: $OAT_PHASE"`
Expected: Correctly parses phase from current project state.md

**Step 4: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t04): implement project state.md frontmatter parsing"
```

---

### Task p01-t05: Implement Knowledge Index Parsing

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add knowledge status function**

```bash
# Read knowledge index status
# Sets: KNOWLEDGE_GENERATED_AT, KNOWLEDGE_MERGE_BASE_SHA, KNOWLEDGE_STATUS
read_knowledge_status() {
  local index_file=".oat/knowledge/repo/project-index.md"

  KNOWLEDGE_GENERATED_AT=""
  KNOWLEDGE_MERGE_BASE_SHA=""
  KNOWLEDGE_STATUS="not generated"

  if [[ ! -f "$index_file" ]]; then
    return
  fi

  KNOWLEDGE_GENERATED_AT=$(parse_frontmatter "$index_file" "oat_generated_at")
  KNOWLEDGE_MERGE_BASE_SHA=$(parse_frontmatter "$index_file" "oat_source_main_merge_base_sha")

  if [[ -n "$KNOWLEDGE_GENERATED_AT" ]]; then
    KNOWLEDGE_STATUS="generated"
  fi
}
```

**Step 2: Call from main**

```bash
main() {
  # ... after read_project_state

  read_knowledge_status

  # ... dashboard generation
}
```

**Step 3: Verify**

Run: `.oat/scripts/generate-oat-state.sh && echo "Knowledge: $KNOWLEDGE_STATUS ($KNOWLEDGE_GENERATED_AT)"`
Expected: Shows knowledge generation date from index

**Step 4: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t05): implement knowledge index frontmatter parsing"
```

---

### Task p01-t06: Implement Git Diff Stats for Staleness

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add staleness calculation function**

```bash
# Calculate knowledge staleness via git diff (best-effort, never fails)
# Sets: FILES_CHANGED, KNOWLEDGE_AGE_DAYS, STALENESS_STATUS
calculate_staleness() {
  FILES_CHANGED=0
  KNOWLEDGE_AGE_DAYS=0
  STALENESS_STATUS="fresh"

  if [[ -z "$KNOWLEDGE_MERGE_BASE_SHA" ]]; then
    STALENESS_STATUS="unknown"
    return 0
  fi

  # Count files changed since merge base - git diff may fail if SHA is invalid
  local diff_output
  diff_output=$(git diff --name-only "$KNOWLEDGE_MERGE_BASE_SHA" HEAD 2>/dev/null) || true
  if [[ -n "$diff_output" ]]; then
    FILES_CHANGED=$(echo "$diff_output" | wc -l | tr -d ' ')
  fi

  # Calculate age in days - handle both macOS and Linux date formats
  if [[ -n "$KNOWLEDGE_GENERATED_AT" ]]; then
    local gen_epoch today_epoch
    # Try macOS format first, then Linux, fallback to 0
    gen_epoch=$(date -j -f "%Y-%m-%d" "$KNOWLEDGE_GENERATED_AT" "+%s" 2>/dev/null) || \
               gen_epoch=$(date -d "$KNOWLEDGE_GENERATED_AT" "+%s" 2>/dev/null) || \
               gen_epoch=0
    today_epoch=$(date "+%s")
    if [[ "$gen_epoch" -gt 0 ]]; then
      KNOWLEDGE_AGE_DAYS=$(( (today_epoch - gen_epoch) / 86400 ))
    fi
  fi

  # Determine staleness
  if [[ "$FILES_CHANGED" -gt 20 ]] || [[ "$KNOWLEDGE_AGE_DAYS" -gt 7 ]]; then
    STALENESS_STATUS="stale"
  elif [[ "$FILES_CHANGED" -gt 5 ]] || [[ "$KNOWLEDGE_AGE_DAYS" -gt 3 ]]; then
    STALENESS_STATUS="aging"
  fi
}
```

**Step 2: Call from main**

```bash
main() {
  # ... after read_knowledge_status

  calculate_staleness

  # ... dashboard generation
}
```

**Step 3: Verify**

Run: `.oat/scripts/generate-oat-state.sh && echo "Staleness: $STALENESS_STATUS ($FILES_CHANGED files, $KNOWLEDGE_AGE_DAYS days)"`
Expected: Shows staleness calculation

**Step 4: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t06): implement git diff stats for knowledge staleness"
```

---

### Task p01-t07: Implement Next Step Recommendation

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add recommendation function**

```bash
# Compute recommended next step based on state
# Sets: RECOMMENDED_STEP, RECOMMENDED_REASON
compute_next_step() {
  RECOMMENDED_STEP=""
  RECOMMENDED_REASON=""

  # No active project
  if [[ "$PROJECT_STATUS" == "not set" ]]; then
    RECOMMENDED_STEP="/oat:open-project"
    RECOMMENDED_REASON="Set an active project to continue work"
    return
  fi

  # Project has issues
  if [[ "$PROJECT_STATUS" != "active" ]]; then
    RECOMMENDED_STEP="/oat:open-project"
    RECOMMENDED_REASON="Current project has issues: $PROJECT_STATUS"
    return
  fi

  # Map phase + status to next skill
  case "${OAT_PHASE}:${OAT_PHASE_STATUS}" in
    "discovery:in_progress") RECOMMENDED_STEP="/oat:discovery"; RECOMMENDED_REASON="Continue discovery phase" ;;
    "discovery:complete") RECOMMENDED_STEP="/oat:spec"; RECOMMENDED_REASON="Create specification from discovery" ;;
    "spec:in_progress") RECOMMENDED_STEP="/oat:spec"; RECOMMENDED_REASON="Continue specification phase" ;;
    "spec:complete") RECOMMENDED_STEP="/oat:design"; RECOMMENDED_REASON="Create design from specification" ;;
    "design:in_progress") RECOMMENDED_STEP="/oat:design"; RECOMMENDED_REASON="Continue design phase" ;;
    "design:complete") RECOMMENDED_STEP="/oat:plan"; RECOMMENDED_REASON="Create implementation plan from design" ;;
    "plan:in_progress") RECOMMENDED_STEP="/oat:plan"; RECOMMENDED_REASON="Continue planning phase" ;;
    "plan:complete") RECOMMENDED_STEP="/oat:implement"; RECOMMENDED_REASON="Start implementation" ;;
    "implement:in_progress") RECOMMENDED_STEP="/oat:implement"; RECOMMENDED_REASON="Continue implementation" ;;
    "implement:complete") RECOMMENDED_STEP="/oat:request-review"; RECOMMENDED_REASON="Request final review" ;;
    *) RECOMMENDED_STEP="/oat:progress"; RECOMMENDED_REASON="Check current progress" ;;
  esac
}
```

**Step 2: Call from main**

```bash
main() {
  # ... after calculate_staleness

  compute_next_step

  # ... dashboard generation
}
```

**Step 3: Verify**

Run: `.oat/scripts/generate-oat-state.sh && echo "Next: $RECOMMENDED_STEP - $RECOMMENDED_REASON"`
Expected: Shows appropriate next step for current state

**Step 4: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t07): implement next step recommendation logic"
```

---

### Task p01-t08: Implement Available Projects Listing

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add projects listing function**

```bash
# List available projects with their phases
# Output: Markdown formatted list
list_available_projects() {
  local projects_root="$1"
  local project_dir project_name phase

  if [[ ! -d "$projects_root" ]]; then
    echo "*(No projects directory found)*"
    return
  fi

  local found=false
  for project_dir in "$projects_root"/*/; do
    [[ -d "$project_dir" ]] || continue
    project_name=$(basename "$project_dir")

    if [[ -f "${project_dir}state.md" ]]; then
      phase=$(parse_frontmatter "${project_dir}state.md" "oat_phase")
      phase="${phase:-unknown}"
      echo "- **${project_name}** - ${phase}"
      found=true
    fi
  done

  if [[ "$found" == "false" ]]; then
    echo "*(No projects found)*"
  fi
}
```

**Step 2: Verify**

Run: `list_available_projects ".agent/projects"`
Expected: Lists projects with their phases

**Step 3: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t08): implement available projects listing"
```

---

### Task p01-t09: Assemble Dashboard Markdown Output

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Add dashboard generation function**

```bash
# Generate the complete dashboard markdown
generate_dashboard() {
  local projects_root="$1"
  local timestamp
  timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

  cat > "$DASHBOARD_PATH" << EOF
---
oat_generated: true
oat_generated_at: $(date -u +"%Y-%m-%d")
---

# OAT Repo State

**Generated:** ${timestamp}

## Active Project

EOF

  # Active project section
  if [[ "$PROJECT_STATUS" == "not set" ]]; then
    echo "*(not set)*" >> "$DASHBOARD_PATH"
  else
    echo "**${PROJECT_NAME}** (\`${PROJECT_PATH}\`)" >> "$DASHBOARD_PATH"
  fi

  echo "" >> "$DASHBOARD_PATH"

  # Project status section (only if active)
  if [[ "$PROJECT_STATUS" == "active" ]]; then
    cat >> "$DASHBOARD_PATH" << EOF
## Project Status

| Field | Value |
|-------|-------|
| Phase | ${OAT_PHASE} |
| Status | ${OAT_PHASE_STATUS} |
| Lifecycle | ${OAT_LIFECYCLE} |
| Blockers | ${OAT_BLOCKERS} |

EOF
  elif [[ "$PROJECT_STATUS" != "not set" ]]; then
    echo "**Warning:** ${PROJECT_STATUS}" >> "$DASHBOARD_PATH"
    echo "" >> "$DASHBOARD_PATH"
  fi

  # Knowledge status section
  cat >> "$DASHBOARD_PATH" << EOF
## Knowledge Status

| Field | Value |
|-------|-------|
| Generated | ${KNOWLEDGE_GENERATED_AT:-N/A} |
| Age | ${KNOWLEDGE_AGE_DAYS} days |
| Files Changed | ${FILES_CHANGED} |
| Status | ${STALENESS_STATUS} |

EOF

  # Recommended next step
  cat >> "$DASHBOARD_PATH" << EOF
## Recommended Next Step

**${RECOMMENDED_STEP}** - ${RECOMMENDED_REASON}

## Quick Commands

- \`/oat:progress\` - Check current status
- \`/oat:index\` - Refresh knowledge base
- \`/oat:open-project\` - Switch active project
- \`/oat:clear-active-project\` - Clear active project
- \`/oat:complete-project\` - Mark project complete

## Available Projects

EOF

  list_available_projects "$projects_root" >> "$DASHBOARD_PATH"
}
```

**Step 2: Update main to call generate_dashboard**

```bash
main() {
  local projects_root
  projects_root=$(resolve_projects_root)

  read_active_project "$projects_root"

  if [[ "$PROJECT_STATUS" == "active" ]]; then
    read_project_state
  fi

  read_knowledge_status
  calculate_staleness
  compute_next_step

  generate_dashboard "$projects_root"

  echo "Dashboard generated: $DASHBOARD_PATH"
}
```

**Step 3: Verify**

Run: `.oat/scripts/generate-oat-state.sh && cat .oat/state.md`
Expected: Complete dashboard with all sections

**Step 4: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p01-t09): assemble complete dashboard markdown output"
```

---

### Task p01-t10: Verify Robustness, Idempotency, and Performance

**Files:**
- No changes (verification only)

**Step 1: Test graceful degradation (critical - tests error handling)**

```bash
# Missing active project file
rm -f .oat/active-project
.oat/scripts/generate-oat-state.sh && echo "PASS: no active project"
grep -q "not set" .oat/state.md && echo "PASS: shows not set"

# Invalid project path (directory missing)
echo "/invalid/path" > .oat/active-project
.oat/scripts/generate-oat-state.sh && echo "PASS: invalid path handled"
grep -q "missing" .oat/state.md && echo "PASS: shows missing"

# Valid path but missing state.md
mkdir -p /tmp/test-project
echo "/tmp/test-project" > .oat/active-project
.oat/scripts/generate-oat-state.sh && echo "PASS: missing state.md handled"
rm -rf /tmp/test-project

# Missing knowledge index (with trap to ensure restore on failure/Ctrl-C)
(
  bak="/tmp/project-index.md.bak"
  trap 'test -f "$bak" && mv "$bak" .oat/knowledge/repo/project-index.md || true' EXIT
  mv .oat/knowledge/repo/project-index.md "$bak" 2>/dev/null || true
  echo ".oat/projects/shared/oat-project-state" > .oat/active-project
  .oat/scripts/generate-oat-state.sh && echo "PASS: missing knowledge handled"
)

# Invalid SHA in knowledge index (git diff will fail)
# Script should still complete with "unknown" staleness
```

Expected: Script completes (exit 0) for ALL edge cases, never crashes

**Step 2: Test idempotency**

```bash
.oat/scripts/generate-oat-state.sh
cp .oat/state.md /tmp/state1.md
sleep 2
.oat/scripts/generate-oat-state.sh
# Compare (ignoring timestamp line)
diff <(grep -v "Generated:" /tmp/state1.md) <(grep -v "Generated:" .oat/state.md)
```

Expected: No differences (aside from timestamp)

**Step 3: Test performance**

```bash
time .oat/scripts/generate-oat-state.sh
```

Expected: Completes in <2 seconds

**Step 4: Restore and commit**

```bash
# Restore active project pointer
echo ".oat/projects/shared/oat-project-state" > .oat/active-project

# Verification-only commit (no files changed)
git commit --allow-empty -m "test(p01-t10): verify robustness, idempotency, and performance"
```

---

## Phase 2: Project Lifecycle Skills

**Goal:** Implement three skills for project lifecycle management: open, clear, complete.

**Verification:** All three skills work correctly and regenerate dashboard.

---

### Task p02-t01: Create oat-open-project Skill

**Files:**
- Create: `.agent/skills/oat-open-project/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p .agent/skills/oat-open-project
```

**Step 2: Write SKILL.md**

```markdown
---
name: oat-open-project
description: Set the active project with validation
---

# Open Project

Set the active OAT project with validation.

## Process

### Step 1: Resolve Projects Root

```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".agent/projects")}"
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
  echo "Error: Invalid project name. Use only alphanumeric, dash, underscore."
  exit 1
fi

# Validate directory exists
if [[ ! -d "$PROJECT_PATH" ]]; then
  echo "Error: Project directory not found: $PROJECT_PATH"
  exit 1
fi

# Validate state.md exists
if [[ ! -f "${PROJECT_PATH}/state.md" ]]; then
  echo "Error: Project missing state.md: ${PROJECT_PATH}/state.md"
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
.oat/scripts/generate-oat-state.sh
```

### Step 7: Confirm to User

Show user:
- Active project: {PROJECT_NAME}
- Phase: {oat_phase from state.md}
- Next step: {from dashboard}

```

**Step 3: Verify**

Run: `cat .agent/skills/oat-open-project/SKILL.md`
Expected: Skill file exists with correct structure

**Step 4: Commit**

```bash
git add .agent/skills/oat-open-project/
git commit -m "feat(p02-t01): create oat-open-project skill"
```

---

### Task p02-t02: Create oat-clear-active-project Skill

**Files:**
- Create: `.agent/skills/oat-clear-active-project/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p .agent/skills/oat-clear-active-project
```

**Step 2: Write SKILL.md**

```markdown
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

```

**Step 3: Verify**

Run: `cat .agent/skills/oat-clear-active-project/SKILL.md`
Expected: Skill file exists with correct structure

**Step 4: Commit**

```bash
git add .agent/skills/oat-clear-active-project/
git commit -m "feat(p02-t02): create oat-clear-active-project skill"
```

---

### Task p02-t03: Create oat-complete-project Skill

**Files:**
- Create: `.agent/skills/oat-complete-project/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p .agent/skills/oat-complete-project
```

**Step 2: Write SKILL.md**

```markdown
---
name: oat-complete-project
description: Mark a project lifecycle as complete
---

# Complete Project

Mark the active OAT project lifecycle as complete.

## Process

### Step 1: Resolve Active Project

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)

if [[ -z "$PROJECT_PATH" ]]; then
  echo "Error: No active project set. Use /oat:open-project first."
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
  # Update existing
  sed -i '' 's/^oat_lifecycle:.*/oat_lifecycle: complete/' "$STATE_FILE"
else
  # Add after oat_phase_status line
  sed -i '' '/^oat_phase_status:/a\
oat_lifecycle: complete
' "$STATE_FILE"
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

```

**Step 3: Verify**

Run: `cat .agent/skills/oat-complete-project/SKILL.md`
Expected: Skill file exists with correct structure

**Step 4: Commit**

```bash
git add .agent/skills/oat-complete-project/
git commit -m "feat(p02-t03): create oat-complete-project skill"
```

---

### Task p02-t04: Register Skills in AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Step 1: Add skill entries**

Add to the `<available_skills>` section in AGENTS.md:

```xml
<skill>
<name>oat-open-project</name>
<description>Set the active OAT project with validation and dashboard refresh.</description>
<location>project</location>
</skill>

<skill>
<name>oat-clear-active-project</name>
<description>Clear the active OAT project pointer and refresh dashboard.</description>
<location>project</location>
</skill>

<skill>
<name>oat-complete-project</name>
<description>Mark the active project lifecycle as complete with optional review/PR checks.</description>
<location>project</location>
</skill>
```

**Step 2: Verify**

Run: `grep -A2 "oat-open-project\|oat-clear-active-project\|oat-complete-project" AGENTS.md`
Expected: All three skills registered

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "feat(p02-t04): register lifecycle skills in AGENTS.md"
```

---

### Task p02-t05: Manual Test All Skills

**Files:**
- No changes (verification only)

**Step 1: Test oat-open-project**

Invoke `/oat:open-project` skill manually:
- Verify it lists available projects
- Select a project
- Verify .oat/active-project is written
- Verify dashboard is regenerated

**Step 2: Test oat-clear-active-project**

Invoke `/oat:clear-active-project` skill manually:
- Verify it shows current project
- Verify .oat/active-project is removed
- Verify dashboard shows "not set"

**Step 3: Test oat-complete-project**

Invoke `/oat:complete-project` skill manually:
- First run oat-open-project to set a project
- Verify confirmation prompt
- Verify warnings for missing review/PR
- Verify oat_lifecycle is set in state.md
- Verify dashboard is regenerated

**Step 4: Commit**

```bash
git commit --allow-empty -m "test(p02-t05): manual verification of lifecycle skills complete"
```

---

## Phase 3: Integration Hooks

**Goal:** Wire dashboard generation into existing skills for auto-refresh.

**Verification:** Dashboard auto-updates when running oat-progress or oat-index.

---

### Task p03-t01: Add Hook to oat-progress

**Files:**
- Modify: `.agent/skills/oat-progress/SKILL.md`

**Step 1: Add dashboard generation step**

Add at the end of the oat-progress skill process, before the final output:

```markdown
### Step N: Regenerate Dashboard

After all progress checks, regenerate the repo state dashboard:

```bash
if [[ -f ".oat/scripts/generate-oat-state.sh" ]]; then
  .oat/scripts/generate-oat-state.sh
fi
```
```

**Step 2: Verify**

Run: `grep -A3 "generate-oat-state" .agent/skills/oat-progress/SKILL.md`
Expected: Dashboard generation step present

**Step 3: Commit**

```bash
git add .agent/skills/oat-progress/
git commit -m "feat(p03-t01): add dashboard hook to oat-progress skill"
```

---

### Task p03-t02: Add Hook to oat-index

**Files:**
- Modify: `.agent/skills/oat-index/SKILL.md`

**Step 1: Add dashboard generation step**

Add at the end of the oat-index skill process, after knowledge generation completes:

```markdown
### Step N: Regenerate Dashboard

After knowledge base generation, regenerate the repo state dashboard:

```bash
if [[ -f ".oat/scripts/generate-oat-state.sh" ]]; then
  .oat/scripts/generate-oat-state.sh
fi
```

This ensures the dashboard reflects fresh knowledge status immediately.
```

**Step 2: Verify**

Run: `grep -A3 "generate-oat-state" .agent/skills/oat-index/SKILL.md`
Expected: Dashboard generation step present

**Step 3: Commit**

```bash
git add .agent/skills/oat-index/
git commit -m "feat(p03-t02): add dashboard hook to oat-index skill"
```

---

### Task p03-t03: Final Integration Test

**Files:**
- No changes (verification only)

**Step 1: Test oat-progress integration**

- Set an active project
- Note current .oat/state.md timestamp
- Run `/oat:progress`
- Verify .oat/state.md has newer timestamp

**Step 2: Test oat-index integration**

- Note current .oat/state.md timestamp
- Run `/oat:index`
- Verify .oat/state.md has newer timestamp
- Verify knowledge status reflects fresh generation

**Step 3: End-to-end workflow**

- Clear active project
- Open a project
- Run progress
- Verify dashboard shows correct state at each step

**Step 4: Commit**

```bash
git commit --allow-empty -m "test(p03-t03): integration verification complete"
```

---

## Reviews

{Track reviews here after running /oat:request-review and /oat:receive-review.}

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| final | code | received | 2026-01-30 | reviews/final-review-2026-01-30.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` | `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 10 tasks - Dashboard script with all sections
- Phase 2: 5 tasks - Three lifecycle skills + registration + testing
- Phase 3: 3 tasks - Integration hooks for oat-progress and oat-index

**Total: 18 tasks**

Ready for implementation.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
