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
