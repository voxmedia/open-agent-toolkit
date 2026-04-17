#!/usr/bin/env bash
set -euo pipefail

# Test: oat-project-implement plan validation
# Verifies that valid and invalid oat_plan_parallel_groups values produce correct results.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="${SCRIPT_DIR}/fixtures"

pass=0
fail=0

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS  $name"
    pass=$((pass + 1))
  else
    echo "  FAIL  $name (expected: $expected, got: $actual)"
    fail=$((fail + 1))
  fi
}

CLI="pnpm --silent run cli --"

# Test 1: sequential fixture passes validation (empty parallel_groups)
set +e
$CLI project validate-plan --project-path "${FIXTURES_DIR}/sequential-project" > /tmp/validate-seq.log 2>&1
rc=$?
set -e
check "sequential fixture validates (exit 0)" "0" "$rc"

# Test 2: parallel fixture passes validation (valid groups)
set +e
$CLI project validate-plan --project-path "${FIXTURES_DIR}/parallel-project" > /tmp/validate-par.log 2>&1
rc=$?
set -e
check "parallel fixture validates (exit 0)" "0" "$rc"

# Test 3: invalid fixture (unknown phase) fails validation
set +e
$CLI project validate-plan --project-path "${FIXTURES_DIR}/invalid-unknown-phase" > /tmp/validate-inv1.log 2>&1
rc=$?
set -e
check "invalid fixture (unknown phase) fails (exit != 0)" "1" "$([[ $rc -ne 0 ]] && echo 1 || echo 0)"

# Test 4: invalid fixture (singleton group) fails validation
set +e
$CLI project validate-plan --project-path "${FIXTURES_DIR}/invalid-singleton-group" > /tmp/validate-inv2.log 2>&1
rc=$?
set -e
check "invalid fixture (singleton group) fails (exit != 0)" "1" "$([[ $rc -ne 0 ]] && echo 1 || echo 0)"

echo ""
echo "Results: $pass passed, $fail failed"
exit $fail
