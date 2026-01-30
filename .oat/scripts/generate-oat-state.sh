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

# --- Main ---
main() {
  local projects_root
  projects_root=$(resolve_projects_root)

  read_active_project "$projects_root"

  if [[ "$PROJECT_STATUS" == "active" ]]; then
    read_project_state
  fi

  echo "# OAT Repo State" > "$DASHBOARD_PATH"
  echo "" >> "$DASHBOARD_PATH"
  echo "**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$DASHBOARD_PATH"
}

main "$@"
