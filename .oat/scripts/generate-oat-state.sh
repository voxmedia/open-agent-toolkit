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

# --- Main ---
main() {
  local projects_root
  projects_root=$(resolve_projects_root)

  echo "# OAT Repo State" > "$DASHBOARD_PATH"
  echo "" >> "$DASHBOARD_PATH"
  echo "**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "$DASHBOARD_PATH"
}

main "$@"
