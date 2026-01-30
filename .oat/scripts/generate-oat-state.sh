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

# --- Main ---
main() {
  local projects_root
  projects_root=$(resolve_projects_root)

  read_active_project "$projects_root"

  echo "# OAT Repo State" > "$DASHBOARD_PATH"
  echo "" >> "$DASHBOARD_PATH"
  echo "**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$DASHBOARD_PATH"
}

main "$@"
