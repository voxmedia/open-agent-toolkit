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
    # Try macOS format first
    if gen_epoch=$(date -j -f "%Y-%m-%d" "$KNOWLEDGE_GENERATED_AT" "+%s" 2>/dev/null); then
      : # Success on macOS
    # Then try Linux format
    elif gen_epoch=$(date -d "$KNOWLEDGE_GENERATED_AT" "+%s" 2>/dev/null); then
      : # Success on Linux
    else
      # Fallback: cannot parse date
      gen_epoch=0
    fi
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

# --- Main ---
main() {
  # Validate we're in a git repo
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Must be run from a git repository" >&2
    exit 1
  fi

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

main "$@"
