#!/usr/bin/env bash
# Test: Autonomous review gate blocks failed units
#
# Validates that review-gate.sh correctly:
# 1. Passes units with clean state
# 2. Fails units with failing tests (spec compliance)
# 3. Fails units with lint errors (code quality)
# 4. Produces correct verdicts and fix-loop hints
#
# Usage: bash tests/test-review-gate.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
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

# ─── Setup Temporary Git Repo ──────────────────────────────────────────────
TMPDIR=$(mktemp -d)
SHIMDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR" "$SHIMDIR"' EXIT

cd "$TMPDIR"
git init -b test-branch
git config user.email "test@test.com"
git config user.name "Test"

echo '{ "name": "test" }' > package.json
git add .
git commit -m "initial"

# ─── Test 1: Passing Unit (clean state) ───────────────────────────────────
echo "=== Test 1: Passing Unit (all checks pass) ==="
echo ""

# Create pnpm shim OUTSIDE the git repo so git status stays clean
mkdir -p "$SHIMDIR/bin"
cat > "$SHIMDIR/bin/pnpm" <<'SHIM'
#!/bin/bash
exit 0
SHIM
chmod +x "$SHIMDIR/bin/pnpm"
export PATH="$SHIMDIR/bin:$PATH"

PASS_OUTPUT=$(bash "$SKILL_DIR/scripts/review-gate.sh" "test-branch" "$TMPDIR" --retry-limit 2 2>&1)

echo "--- Output ---"
echo "$PASS_OUTPUT" | head -20
echo ""
echo "--- Assertions ---"
assert_contains "spec verdict pass" "$PASS_OUTPUT" "spec_verdict: pass"
assert_contains "quality verdict pass" "$PASS_OUTPUT" "quality_verdict: pass"
assert_contains "overall pass" "$PASS_OUTPUT" "overall: pass"
assert_contains "eligible for merge" "$PASS_OUTPUT" "disposition: eligible_for_merge"
assert_contains "finalize action" "$PASS_OUTPUT" "action: finalize"

echo ""

# ─── Test 2: Failing Tests (spec compliance failure) ──────────────────────
echo "=== Test 2: Failing Tests (spec compliance failure) ==="
echo ""

# Override pnpm test to fail
cat > "$SHIMDIR/bin/pnpm" <<'SHIM'
#!/bin/bash
case "$1" in
  test) exit 1 ;;
  *) exit 0 ;;
esac
SHIM
chmod +x "$SHIMDIR/bin/pnpm"

FAIL_TEST_OUTPUT=$(bash "$SKILL_DIR/scripts/review-gate.sh" "test-branch" "$TMPDIR" --retry-limit 2 2>&1)

echo "--- Output ---"
echo "$FAIL_TEST_OUTPUT" | head -20
echo ""
echo "--- Assertions ---"
assert_contains "tests fail" "$FAIL_TEST_OUTPUT" "tests: fail"
assert_contains "spec verdict fail" "$FAIL_TEST_OUTPUT" "spec_verdict: fail"
assert_contains "overall fail" "$FAIL_TEST_OUTPUT" "overall: fail"
assert_contains "needs fix or exclude" "$FAIL_TEST_OUTPUT" "disposition: needs_fix_or_exclude"
assert_contains "retry action (under limit)" "$FAIL_TEST_OUTPUT" "action: retry"
assert_contains "next retry count" "$FAIL_TEST_OUTPUT" "next_retry_count: 1"
# Code quality stage should NOT run when spec fails
assert_not_contains "quality stage skipped" "$FAIL_TEST_OUTPUT" "quality_verdict: pass"

echo ""

# ─── Test 3: Lint Failure (code quality failure) ──────────────────────────
echo "=== Test 3: Lint Failure (code quality failure, spec passes) ==="
echo ""

# Override pnpm lint to fail, but test passes
cat > "$SHIMDIR/bin/pnpm" <<'SHIM'
#!/bin/bash
case "$1" in
  lint) exit 1 ;;
  *) exit 0 ;;
esac
SHIM
chmod +x "$SHIMDIR/bin/pnpm"

FAIL_LINT_OUTPUT=$(bash "$SKILL_DIR/scripts/review-gate.sh" "test-branch" "$TMPDIR" --retry-limit 2 2>&1)

echo "--- Output ---"
echo "$FAIL_LINT_OUTPUT" | head -25
echo ""
echo "--- Assertions ---"
assert_contains "spec verdict pass" "$FAIL_LINT_OUTPUT" "spec_verdict: pass"
assert_contains "lint fail" "$FAIL_LINT_OUTPUT" "lint: fail"
assert_contains "quality verdict fail" "$FAIL_LINT_OUTPUT" "quality_verdict: fail"
assert_contains "overall fail" "$FAIL_LINT_OUTPUT" "overall: fail"
assert_contains "retry action (under limit)" "$FAIL_LINT_OUTPUT" "action: retry"

echo ""

# ─── Test 4: Uncommitted Changes (git clean failure) ─────────────────────
echo "=== Test 4: Uncommitted Changes (git clean failure) ==="
echo ""

# Restore passing pnpm but leave uncommitted file
cat > "$SHIMDIR/bin/pnpm" <<'SHIM'
#!/bin/bash
exit 0
SHIM
chmod +x "$SHIMDIR/bin/pnpm"

echo "dirty" > "$TMPDIR/uncommitted.txt"

DIRTY_OUTPUT=$(bash "$SKILL_DIR/scripts/review-gate.sh" "test-branch" "$TMPDIR" --retry-limit 2 2>&1)

echo "--- Output ---"
echo "$DIRTY_OUTPUT" | head -20
echo ""
echo "--- Assertions ---"
assert_contains "git clean fail" "$DIRTY_OUTPUT" "git_clean: fail"
assert_contains "spec verdict fail" "$DIRTY_OUTPUT" "spec_verdict: fail"
assert_contains "overall fail" "$DIRTY_OUTPUT" "overall: fail"

# Clean up
rm -f "$TMPDIR/uncommitted.txt"

echo ""

# ─── Test 5: Retry at limit (dispatch_fix terminal) ──────────────────
echo "=== Test 5: Retry at limit (dispatch_fix terminal) ==="
echo ""

# Failing pnpm test, retry_count == retry_limit
cat > "$SHIMDIR/bin/pnpm" <<'SHIM'
#!/bin/bash
case "$1" in
  test) exit 1 ;;
  *) exit 0 ;;
esac
SHIM
chmod +x "$SHIMDIR/bin/pnpm"

AT_LIMIT_OUTPUT=$(bash "$SKILL_DIR/scripts/review-gate.sh" "test-branch" "$TMPDIR" --retry-limit 2 --retry-count 2 2>&1)

echo "--- Output ---"
echo "$AT_LIMIT_OUTPUT" | head -25
echo ""
echo "--- Assertions ---"
assert_contains "overall fail" "$AT_LIMIT_OUTPUT" "overall: fail"
assert_contains "retry_count is 2" "$AT_LIMIT_OUTPUT" "retry_count: 2"
assert_contains "dispatch_fix at limit" "$AT_LIMIT_OUTPUT" "action: dispatch_fix"
assert_not_contains "no next_retry_count at limit" "$AT_LIMIT_OUTPUT" "next_retry_count:"

echo ""

# ─── Test 6: Retry under limit (retry with next count) ───────────────
echo "=== Test 6: Retry under limit (retry with next count) ==="
echo ""

UNDER_LIMIT_OUTPUT=$(bash "$SKILL_DIR/scripts/review-gate.sh" "test-branch" "$TMPDIR" --retry-limit 2 --retry-count 1 2>&1)

echo "--- Output ---"
echo "$UNDER_LIMIT_OUTPUT" | head -25
echo ""
echo "--- Assertions ---"
assert_contains "retry_count is 1" "$UNDER_LIMIT_OUTPUT" "retry_count: 1"
assert_contains "action is retry" "$UNDER_LIMIT_OUTPUT" "action: retry"
assert_contains "next_retry_count is 2" "$UNDER_LIMIT_OUTPUT" "next_retry_count: 2"

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
