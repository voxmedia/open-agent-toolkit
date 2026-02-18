#!/usr/bin/env bash
# Test: Dry-run orchestration on sample multi-phase plan
#
# Validates that dispatch.sh correctly parses a sample plan and produces
# a well-formed dispatch manifest at both phase-level and task-level granularity.
#
# Usage: bash tests/test-dry-run.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
PLAN_PATH="$FIXTURES_DIR/sample-plan.md"
PROJECT_PATH="$FIXTURES_DIR"

PASS=0
FAIL=0

assert_contains() {
  local label="$1" output="$2" expected="$3"
  if echo "$output" | grep -qF -- "$expected"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — expected to contain: $expected"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local label="$1" output="$2" unexpected="$3"
  if echo "$output" | grep -qF -- "$unexpected"; then
    echo "  FAIL: $label — should NOT contain: $unexpected"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  fi
}

assert_line_count() {
  local label="$1" output="$2" pattern="$3" expected="$4"
  local actual
  actual=$(echo "$output" | grep -c "$pattern" || true)
  if [[ "$actual" -eq "$expected" ]]; then
    echo "  PASS: $label (count=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — expected $expected occurrences of '$pattern', got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Test: Dry-Run Dispatch (Phase-Level) ==="
echo ""

PHASE_OUTPUT=$(bash "$SKILL_DIR/scripts/dispatch.sh" "$PLAN_PATH" "$PROJECT_PATH" "test-branch" --unit-granularity phase 2>&1)

echo "--- Phase-level manifest ---"
assert_contains "has dispatch_manifest marker" "$PHASE_OUTPUT" "--- dispatch_manifest ---"
assert_contains "orchestration_branch is test-branch" "$PHASE_OUTPUT" "orchestration_branch: test-branch"
assert_contains "unit_granularity is phase" "$PHASE_OUTPUT" "unit_granularity: phase"
assert_contains "has log_path" "$PHASE_OUTPUT" "log_path:"
assert_line_count "identifies 4 phases" "$PHASE_OUTPUT" "type: phase" 4
assert_contains "phase p01 present" "$PHASE_OUTPUT" 'unit_id: "p01"'
assert_contains "phase p02 present" "$PHASE_OUTPUT" 'unit_id: "p02"'
assert_contains "phase p03 present" "$PHASE_OUTPUT" 'unit_id: "p03"'
assert_contains "phase p04 present" "$PHASE_OUTPUT" 'unit_id: "p04"'
assert_contains "HiL checkpoints extracted" "$PHASE_OUTPUT" "hil_checkpoints:"
assert_contains "branch naming pattern" "$PHASE_OUTPUT" "branch_naming:"

echo ""
echo "=== Test: Dry-Run Dispatch (Task-Level) ==="
echo ""

TASK_OUTPUT=$(bash "$SKILL_DIR/scripts/dispatch.sh" "$PLAN_PATH" "$PROJECT_PATH" "test-branch" --unit-granularity task 2>&1)

echo "--- Task-level manifest ---"
assert_contains "unit_granularity is task" "$TASK_OUTPUT" "unit_granularity: task"
assert_line_count "identifies 6 tasks" "$TASK_OUTPUT" "type: task" 6
assert_contains "task p01-t01 present" "$TASK_OUTPUT" 'unit_id: "p01-t01"'
assert_contains "task p01-t02 present" "$TASK_OUTPUT" 'unit_id: "p01-t02"'
assert_contains "task p02-t01 present" "$TASK_OUTPUT" 'unit_id: "p02-t01"'
assert_contains "task p02-t02 present" "$TASK_OUTPUT" 'unit_id: "p02-t02"'
assert_contains "task p03-t01 present" "$TASK_OUTPUT" 'unit_id: "p03-t01"'
assert_contains "task p04-t01 present" "$TASK_OUTPUT" 'unit_id: "p04-t01"'
assert_contains "branch naming examples" "$TASK_OUTPUT" "examples:"

echo ""
echo "=== Test: Manifest YAML Structure ==="
echo ""

# Phase-level: tasks: should be block sequence header (no [])
# When tasks are present, should NOT have "tasks: []" followed by list items
assert_not_contains "no inline empty array before tasks" "$PHASE_OUTPUT" "tasks: []"

# tasks: header (block sequence) should appear for each phase
assert_line_count "tasks: header per phase" "$PHASE_OUTPUT" "    tasks:" 4

# Task items should be indented under tasks:
assert_contains "task item indented under phase" "$PHASE_OUTPUT" '      - "p01-t01"'

echo ""
echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo "OVERALL: FAIL"
  exit 1
else
  echo "OVERALL: PASS"
fi
