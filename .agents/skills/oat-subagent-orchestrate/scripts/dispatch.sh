#!/usr/bin/env bash
# oat-subagent-orchestrate: Fan-out dispatch and result collection
#
# Usage: dispatch.sh <plan-path> <project-path> <orchestration-branch> [--unit-granularity <phase|task>]
#
# This script is a reference implementation for the orchestrator agent.
# It parses the plan, identifies parallelizable units, and outputs
# a dispatch manifest for the orchestrator to execute via the Task tool.
#
# The orchestrator reads the manifest and dispatches subagents accordingly.
# This script does NOT dispatch subagents directly — that requires the
# Task tool, which is only available to the agent runtime.

set -euo pipefail

# ─── Defaults ───────────────────────────────────────────────────────────────
PLAN_PATH=""
PROJECT_PATH=""
ORCHESTRATION_BRANCH=""
UNIT_GRANULARITY="phase"

# ─── Parse Arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --unit-granularity) UNIT_GRANULARITY="$2"; shift 2 ;;
    -*)                 echo "error: unknown flag $1" >&2; exit 1 ;;
    *)
      if [[ -z "$PLAN_PATH" ]]; then PLAN_PATH="$1"
      elif [[ -z "$PROJECT_PATH" ]]; then PROJECT_PATH="$1"
      elif [[ -z "$ORCHESTRATION_BRANCH" ]]; then ORCHESTRATION_BRANCH="$1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$PLAN_PATH" || -z "$PROJECT_PATH" || -z "$ORCHESTRATION_BRANCH" ]]; then
  echo "error: required: <plan-path> <project-path> <orchestration-branch>" >&2
  exit 1
fi

# ─── Step 1: Parse Plan Structure ───────────────────────────────────────────
# Extract phase and task structure from plan.md
# Output: list of units with task IDs, files, and verification commands

echo "--- dispatch_manifest ---"
echo "orchestration_branch: $ORCHESTRATION_BRANCH"
echo "unit_granularity: $UNIT_GRANULARITY"
echo "plan_path: $PLAN_PATH"
echo "project_path: $PROJECT_PATH"
echo "log_path: $PROJECT_PATH/implementation.md"
echo "units:"

# Parse phases (## Phase N: ...)
CURRENT_PHASE=""
CURRENT_TASK=""
TASK_FILES=""
IN_FILES_BLOCK=false

while IFS= read -r line; do
  # Detect phase headers
  if [[ "$line" =~ ^##\ Phase\ ([0-9]+):\ (.+)$ ]]; then
    CURRENT_PHASE="p$(printf '%02d' "${BASH_REMATCH[1]}")"
    PHASE_NAME="${BASH_REMATCH[2]}"

    if [[ "$UNIT_GRANULARITY" == "phase" ]]; then
      echo "  - unit_id: \"$CURRENT_PHASE\""
      echo "    phase: \"$CURRENT_PHASE\""
      echo "    phase_name: \"$PHASE_NAME\""
      echo "    type: phase"
      echo "    tasks: []"
    fi
  fi

  # Detect task headers (### Task pNN-tNN: ...)
  if [[ "$line" =~ ^###\ Task\ (p[0-9]+-t[0-9]+):\ (.+)$ ]]; then
    CURRENT_TASK="${BASH_REMATCH[1]}"
    TASK_NAME="${BASH_REMATCH[2]}"

    if [[ "$UNIT_GRANULARITY" == "task" ]]; then
      echo "  - unit_id: \"$CURRENT_TASK\""
      echo "    phase: \"$CURRENT_PHASE\""
      echo "    task_id: \"$CURRENT_TASK\""
      echo "    task_name: \"$TASK_NAME\""
      echo "    type: task"
    elif [[ "$UNIT_GRANULARITY" == "phase" ]]; then
      # Append task to current phase unit
      echo "      - \"$CURRENT_TASK\""
    fi
  fi

  # Detect file boundaries
  if [[ "$line" =~ ^\*\*Files:\*\*$ ]]; then
    IN_FILES_BLOCK=true
    if [[ "$UNIT_GRANULARITY" == "task" ]]; then
      echo "    files:"
    fi
  elif [[ "$IN_FILES_BLOCK" == true ]]; then
    if [[ "$line" =~ ^-\ (Create|Modify):\ \`(.+)\`$ ]]; then
      if [[ "$UNIT_GRANULARITY" == "task" ]]; then
        echo "      - action: \"${BASH_REMATCH[1]}\""
        echo "        path: \"${BASH_REMATCH[2]}\""
      fi
    elif [[ ! "$line" =~ ^- ]]; then
      IN_FILES_BLOCK=false
    fi
  fi
done < "$PLAN_PATH"

echo "---"

# ─── Step 2: Check HiL Checkpoints ─────────────────────────────────────────
# Extract oat_plan_hil_phases from frontmatter
HIL_PHASES=$(sed -n '/^---$/,/^---$/p' "$PLAN_PATH" | grep 'oat_plan_hil_phases' | sed 's/.*: //' || true)
echo "hil_checkpoints: $HIL_PHASES"

# ─── Step 3: Output Branch Naming Plan ──────────────────────────────────────
PROJECT_NAME=$(basename "$PROJECT_PATH")
echo "branch_naming:"
echo "  pattern: \"${PROJECT_NAME}/{unit-id}\""
echo "  base_ref: \"$ORCHESTRATION_BRANCH\""
echo "  examples:"

# Re-parse to list branch names
while IFS= read -r line; do
  if [[ "$UNIT_GRANULARITY" == "phase" && "$line" =~ ^##\ Phase\ ([0-9]+): ]]; then
    PHASE_ID="p$(printf '%02d' "${BASH_REMATCH[1]}")"
    echo "    - \"${PROJECT_NAME}/${PHASE_ID}\""
  elif [[ "$UNIT_GRANULARITY" == "task" && "$line" =~ ^###\ Task\ (p[0-9]+-t[0-9]+): ]]; then
    TASK_ID="${BASH_REMATCH[1]}"
    echo "    - \"${PROJECT_NAME}/${TASK_ID}\""
  fi
done < "$PLAN_PATH"
