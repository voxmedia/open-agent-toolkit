#!/usr/bin/env bash
# oat-execution-mode-select: Read/write execution mode in state.md
#
# Usage: select-mode.sh <state-path> [--mode <single-thread|subagent-driven>] [--read-only]
#
# This script is a reference implementation for the execution-mode selector.
# The agent may execute this directly or follow the logic step-by-step.
#
# --read-only: Print current mode and exit without modifying state.
# --mode: Set the mode and persist to state.md frontmatter.
# If neither flag is provided, prints current mode and exits.

set -euo pipefail

# ─── Defaults ───────────────────────────────────────────────────────────────
STATE_PATH=""
MODE=""
READ_ONLY=false

# ─── Parse Arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)      MODE="$2"; shift 2 ;;
    --read-only) READ_ONLY=true; shift ;;
    -*)          echo "error: unknown flag $1" >&2; exit 1 ;;
    *)
      if [[ -z "$STATE_PATH" ]]; then STATE_PATH="$1"; fi
      shift
      ;;
  esac
done

if [[ -z "$STATE_PATH" ]]; then
  echo "error: required: <state-path>" >&2
  exit 1
fi

if [[ ! -f "$STATE_PATH" ]]; then
  echo "error: state file not found: $STATE_PATH" >&2
  exit 1
fi

# ─── Read Current Mode ─────────────────────────────────────────────────────
CURRENT_MODE=$(grep -E '^oat_execution_mode:' "$STATE_PATH" | sed 's/oat_execution_mode: *//' | sed 's/ *#.*//' || echo "single-thread")
if [[ -z "$CURRENT_MODE" ]]; then
  CURRENT_MODE="single-thread"
fi

echo "--- execution_mode ---"
echo "state_path: $STATE_PATH"
echo "current_mode: $CURRENT_MODE"

# ─── Read-Only Mode ────────────────────────────────────────────────────────
if [[ "$READ_ONLY" == true ]]; then
  echo "action: read_only"
  echo "---"
  exit 0
fi

# ─── Validate Mode ─────────────────────────────────────────────────────────
if [[ -n "$MODE" ]]; then
  case "$MODE" in
    single-thread|subagent-driven) ;;
    *) echo "error: invalid mode '$MODE'. Must be 'single-thread' or 'subagent-driven'." >&2; exit 1 ;;
  esac
else
  # No mode specified — just report current and exit
  echo "action: report_only"
  echo "next_command: $([ "$CURRENT_MODE" == "subagent-driven" ] && echo 'oat-subagent-orchestrate' || echo 'oat-project-implement')"
  echo "---"
  exit 0
fi

# ─── Portable sed helper ──────────────────────────────────────────────────
# Replaces sed -i '' (BSD-only) with portable temp-file approach
sed_portable() {
  local file="$1"
  shift
  sed "$@" "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

# ─── Persist Mode ──────────────────────────────────────────────────────────
if grep -q '^oat_execution_mode:' "$STATE_PATH"; then
  sed_portable "$STATE_PATH" "s/^oat_execution_mode:.*/oat_execution_mode: $MODE/"
else
  # Try inserting after oat_workflow_origin line
  if grep -q '^oat_workflow_origin:' "$STATE_PATH"; then
    sed_portable "$STATE_PATH" "/^oat_workflow_origin:/a\\
oat_execution_mode: $MODE"
  else
    # Fallback: insert before closing frontmatter delimiter
    # Matches the second --- (closing delimiter) and inserts before it
    sed_portable "$STATE_PATH" "0,/^---$/!{/^---$/i\\
oat_execution_mode: $MODE
}"
  fi
fi

# Verify persistence succeeded
if grep -q "^oat_execution_mode: $MODE" "$STATE_PATH"; then
  echo "selected_mode: $MODE"
  echo "persisted: true"
else
  echo "selected_mode: $MODE"
  echo "persisted: false (write failed)"
fi

# ─── Route Output ──────────────────────────────────────────────────────────
case "$MODE" in
  single-thread)
    echo "next_command: oat-project-implement"
    ;;
  subagent-driven)
    echo "next_command: oat-subagent-orchestrate"
    # Persist default orchestration policies if not already present
    if ! grep -q '^oat_orchestration_merge_strategy:' "$STATE_PATH"; then
      sed_portable "$STATE_PATH" "/^oat_execution_mode:/a\\
oat_orchestration_merge_strategy: merge\\
oat_orchestration_retry_limit: 2\\
oat_orchestration_baseline_policy: strict\\
oat_orchestration_unit_granularity: phase"
      echo "orchestration_defaults_persisted: true"
    else
      echo "orchestration_defaults_persisted: false (already present)"
    fi
    ;;
esac

echo "---"
