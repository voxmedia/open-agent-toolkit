#!/usr/bin/env bash
# Test: Execution-mode selector persistence and routing
#
# Validates that select-mode.sh correctly:
# 1. Reads current mode from state.md
# 2. Persists selected mode
# 3. Routes to correct next command
# 4. Auto-persists orchestration defaults for subagent-driven mode
#
# Usage: bash tests/test-mode-selector.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SELECTOR_SCRIPT="$(cd "$SCRIPT_DIR/../../oat-execution-mode-select/scripts" && pwd)/select-mode.sh"
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

assert_file_contains() {
  local label="$1" file="$2" expected="$3"
  if grep -qF -- "$expected" "$file"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — file does not contain: $expected"
    FAIL=$((FAIL + 1))
  fi
}

assert_file_not_contains() {
  local label="$1" file="$2" unexpected="$3"
  if grep -qF -- "$unexpected" "$file"; then
    echo "  FAIL: $label — file should NOT contain: $unexpected"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  fi
}

# ─── Setup ─────────────────────────────────────────────────────────────────
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Create a minimal state.md
cat > "$TMPDIR/state.md" <<'STATE'
---
oat_current_task: null
oat_last_commit: null
oat_execution_mode: single-thread
oat_workflow_mode: full
oat_workflow_origin: native
---

# Project State: Test
STATE

# ─── Test 1: Read-only mode ──────────────────────────────────────────────
echo "=== Test 1: Read-only mode ==="
echo ""

RO_OUTPUT=$(bash "$SELECTOR_SCRIPT" "$TMPDIR/state.md" --read-only 2>&1)
assert_contains "reports current mode" "$RO_OUTPUT" "current_mode: single-thread"
assert_contains "action is read_only" "$RO_OUTPUT" "action: read_only"

echo ""

# ─── Test 2: Report-only (no --mode flag) ────────────────────────────────
echo "=== Test 2: Report-only (no --mode flag) ==="
echo ""

REPORT_OUTPUT=$(bash "$SELECTOR_SCRIPT" "$TMPDIR/state.md" 2>&1)
assert_contains "reports current mode" "$REPORT_OUTPUT" "current_mode: single-thread"
assert_contains "action is report_only" "$REPORT_OUTPUT" "action: report_only"
assert_contains "routes to implement" "$REPORT_OUTPUT" "next_command: oat-project-implement"

echo ""

# ─── Test 3: Set subagent-driven mode ────────────────────────────────────
echo "=== Test 3: Set subagent-driven mode ==="
echo ""

SUB_OUTPUT=$(bash "$SELECTOR_SCRIPT" "$TMPDIR/state.md" --mode subagent-driven 2>&1)
assert_contains "selected subagent-driven" "$SUB_OUTPUT" "selected_mode: subagent-driven"
assert_contains "persisted" "$SUB_OUTPUT" "persisted: true"
assert_contains "routes to orchestrate" "$SUB_OUTPUT" "next_command: oat-subagent-orchestrate"
assert_contains "defaults persisted" "$SUB_OUTPUT" "orchestration_defaults_persisted: true"

# Verify file was updated
assert_file_contains "state has subagent-driven" "$TMPDIR/state.md" "oat_execution_mode: subagent-driven"
assert_file_contains "merge strategy persisted" "$TMPDIR/state.md" "oat_orchestration_merge_strategy: merge"
assert_file_contains "retry limit persisted" "$TMPDIR/state.md" "oat_orchestration_retry_limit: 2"
assert_file_contains "baseline policy persisted" "$TMPDIR/state.md" "oat_orchestration_baseline_policy: strict"

echo ""

# ─── Test 4: Switch back to single-thread ────────────────────────────────
echo "=== Test 4: Switch back to single-thread ==="
echo ""

ST_OUTPUT=$(bash "$SELECTOR_SCRIPT" "$TMPDIR/state.md" --mode single-thread 2>&1)
assert_contains "selected single-thread" "$ST_OUTPUT" "selected_mode: single-thread"
assert_contains "routes to implement" "$ST_OUTPUT" "next_command: oat-project-implement"

# Verify file was updated
assert_file_contains "state has single-thread" "$TMPDIR/state.md" "oat_execution_mode: single-thread"

echo ""

# ─── Test 5: Re-select subagent-driven (defaults already present) ────────
echo "=== Test 5: Re-select subagent-driven (defaults already present) ==="
echo ""

RE_OUTPUT=$(bash "$SELECTOR_SCRIPT" "$TMPDIR/state.md" --mode subagent-driven 2>&1)
assert_contains "defaults already present" "$RE_OUTPUT" "orchestration_defaults_persisted: false (already present)"

echo ""

# ─── Test 6: Invalid mode ────────────────────────────────────────────────
echo "=== Test 6: Invalid mode ==="
echo ""

INVALID_OUTPUT=$(bash "$SELECTOR_SCRIPT" "$TMPDIR/state.md" --mode invalid 2>&1 || true)
assert_contains "error for invalid mode" "$INVALID_OUTPUT" "error: invalid mode"

echo ""

# ─── Test 7: Missing state file ──────────────────────────────────────────
echo "=== Test 7: Missing state file ==="
echo ""

MISSING_OUTPUT=$(bash "$SELECTOR_SCRIPT" "$TMPDIR/nonexistent.md" 2>&1 || true)
assert_contains "error for missing file" "$MISSING_OUTPUT" "error: state file not found"

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
