#!/usr/bin/env bash
# Test: HiLL checkpoint behavior
#
# Validates that dispatch.sh correctly extracts oat_plan_hill_phases from
# plan frontmatter and that the orchestrator can determine checkpoint boundaries.
#
# Scenarios:
# 1. Plan with HiLL at p04 — all phases run, pause after p04 completes
# 2. Plan with HiLL at p02 — p01-p02 run, pause after p02 completes
# 3. Plan with no HiLL — default behavior (pause after every phase)
#
# Usage: bash tests/test-hill-checkpoint.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
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

# ─── Test 1: HiLL at p04 ──────────────────────────────────────────────────
echo "=== Test 1: HiLL checkpoint at p04 ==="
echo ""

OUTPUT_1=$(bash "$SKILL_DIR/scripts/dispatch.sh" "$FIXTURES_DIR/sample-plan.md" "$FIXTURES_DIR" "test-branch" 2>&1)

# Extract HiLL checkpoints line
HIL_LINE_1=$(echo "$OUTPUT_1" | grep "hill_checkpoints:")
assert_contains "extracts hill_checkpoints" "$HIL_LINE_1" "hill_checkpoints:"
# The sample-plan.md has oat_plan_hill_phases: ['p04']
assert_contains "contains p04 checkpoint" "$HIL_LINE_1" "p04"

echo ""

# ─── Test 2: HiLL at p02 (modified fixture) ───────────────────────────────
echo "=== Test 2: HiLL checkpoint at p02 ==="
echo ""

# Create a modified fixture with HiLL at p02
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

sed -E "s|oat_plan_hill_phases: \[[^]]*\]|oat_plan_hill_phases: ['p02']|" "$FIXTURES_DIR/sample-plan.md" > "$TMPDIR/plan-hil-p02.md"

OUTPUT_2=$(bash "$SKILL_DIR/scripts/dispatch.sh" "$TMPDIR/plan-hil-p02.md" "$TMPDIR" "test-branch" 2>&1)

HIL_LINE_2=$(echo "$OUTPUT_2" | grep "hill_checkpoints:")
assert_contains "extracts p02 checkpoint" "$HIL_LINE_2" "p02"

echo ""

# ─── Test 3: No HiLL phases (empty) ───────────────────────────────────────
echo "=== Test 3: No HiLL phases (empty array) ==="
echo ""

sed -E "s|oat_plan_hill_phases: \[[^]]*\]|oat_plan_hill_phases: []|" "$FIXTURES_DIR/sample-plan.md" > "$TMPDIR/plan-no-hil.md"

OUTPUT_3=$(bash "$SKILL_DIR/scripts/dispatch.sh" "$TMPDIR/plan-no-hil.md" "$TMPDIR" "test-branch" 2>&1)

HIL_LINE_3=$(echo "$OUTPUT_3" | grep "hill_checkpoints:")
assert_contains "extracts empty hill_checkpoints" "$HIL_LINE_3" "hill_checkpoints: []"

echo ""

# ─── Test 4: Validate partition logic (script-level) ─────────────────────
echo "=== Test 4: Validate checkpoint partition logic ==="
echo ""

# Parse the dispatch manifest from Test 1 and verify phase ordering
# The sample plan has 4 phases. With HiLL at p04:
# Run 1: p01, p02, p03, p04 (all run through checkpoint)
# Pause: after p04 completes (end of implementation)

# Verify all 4 phases are identified in the manifest
PHASE_COUNT=$(echo "$OUTPUT_1" | grep -c "type: phase" || true)
if [[ "$PHASE_COUNT" -eq 4 ]]; then
  echo "  PASS: all 4 phases identified in manifest"
  PASS=$((PASS + 1))
else
  echo "  FAIL: expected 4 phases, got $PHASE_COUNT"
  FAIL=$((FAIL + 1))
fi

# Verify checkpoint info allows orchestrator to partition
# The orchestrator reads hill_checkpoints and pauses after completing p04
assert_contains "p01 is in pre-checkpoint run" "$OUTPUT_1" 'unit_id: "p01"'
assert_contains "p02 is in pre-checkpoint run" "$OUTPUT_1" 'unit_id: "p02"'
assert_contains "p03 is in pre-checkpoint run" "$OUTPUT_1" 'unit_id: "p03"'
assert_contains "p04 is identified for post-checkpoint" "$OUTPUT_1" 'unit_id: "p04"'

echo ""

# ─── Test 5: Multiple HiLL checkpoints ────────────────────────────────────
echo "=== Test 5: Multiple HiLL checkpoints ==="
echo ""

sed -E "s|oat_plan_hill_phases: \[[^]]*\]|oat_plan_hill_phases: ['p02', 'p04']|" "$FIXTURES_DIR/sample-plan.md" > "$TMPDIR/plan-multi-hil.md"

OUTPUT_5=$(bash "$SKILL_DIR/scripts/dispatch.sh" "$TMPDIR/plan-multi-hil.md" "$TMPDIR" "test-branch" 2>&1)

HIL_LINE_5=$(echo "$OUTPUT_5" | grep "hill_checkpoints:")
assert_contains "extracts multiple checkpoints" "$HIL_LINE_5" "p02"
assert_contains "includes second checkpoint" "$HIL_LINE_5" "p04"

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
