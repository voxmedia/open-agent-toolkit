#!/usr/bin/env bash
# Test: Parallel worktree execution and reconciliation
#
# Validates that reconcile.sh correctly merges two non-conflicting unit
# branches into an orchestration branch in deterministic order.
#
# Creates a temporary git repo with simulated parallel unit branches,
# then runs reconcile.sh to merge them.
#
# Usage: bash tests/test-reconcile.sh

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

# ─── Setup Temporary Git Repo ──────────────────────────────────────────────
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cd "$TMPDIR"
git init -b orchestration-branch
git config user.email "test@test.com"
git config user.name "Test"

# Create initial commit on orchestration branch
echo '{ "name": "test-project" }' > package.json
cat > .npmrc <<'NPMRC'
# placeholder
NPMRC
git add .
git commit -m "initial commit"

# ─── Create Unit Branch p01 (non-conflicting files) ───────────────────────
git checkout -b "project/p01"
mkdir -p src/models
echo 'export const User = { id: 1, name: "test" };' > src/models/user.ts
echo 'test("user", () => {});' > src/models/user.test.ts
git add .
git commit -m "feat(p01-t01): create user model"

echo 'export const Settings = { key: "theme" };' > src/models/settings.ts
git add .
git commit -m "feat(p01-t02): create settings model"

# ─── Create Unit Branch p02 (non-conflicting files) ───────────────────────
git checkout orchestration-branch
git checkout -b "project/p02"
mkdir -p src/routes
echo 'export const userRoute = "/api/user";' > src/routes/user.ts
echo 'test("user route", () => {});' > src/routes/user.test.ts
git add .
git commit -m "feat(p02-t01): create user API endpoint"

echo 'export const settingsRoute = "/api/settings";' > src/routes/settings.ts
git add .
git commit -m "feat(p02-t02): create settings API endpoint"

# ─── Return to orchestration branch ───────────────────────────────────────
git checkout orchestration-branch

echo "=== Test: Reconcile Two Non-Conflicting Unit Branches ==="
echo ""

# ─── Run Reconcile ────────────────────────────────────────────────────────
# Note: reconcile.sh runs pnpm test/lint/type-check for integration verification.
# In this test repo those commands don't exist, so they'll "fail" but
# the merge itself should succeed. We override by creating stub scripts.
cat > run-checks.sh <<'STUB'
#!/bin/bash
exit 0
STUB
chmod +x run-checks.sh

# Create package.json with stub test/lint/type-check scripts
cat > package.json <<'PKG'
{
  "name": "test-project",
  "scripts": {
    "test": "exit 0",
    "lint": "exit 0",
    "type-check": "exit 0"
  }
}
PKG
git add .
git commit -m "chore: add stub scripts for integration verification"

# Capture reconcile output (need to handle pnpm not being in PATH for stubs)
# Override pnpm with a shim
mkdir -p "$TMPDIR/bin"
cat > "$TMPDIR/bin/pnpm" <<'SHIM'
#!/bin/bash
exit 0
SHIM
chmod +x "$TMPDIR/bin/pnpm"
export PATH="$TMPDIR/bin:$PATH"

RECONCILE_OUTPUT=$(bash "$SKILL_DIR/scripts/reconcile.sh" orchestration-branch "project/p01" "project/p02" 2>&1)

echo "$RECONCILE_OUTPUT"
echo ""

# ─── Assertions ───────────────────────────────────────────────────────────
echo "--- Assertions ---"
assert_contains "has reconcile_manifest marker" "$RECONCILE_OUTPUT" "--- reconcile_manifest ---"
assert_contains "orchestration_branch correct" "$RECONCILE_OUTPUT" "orchestration_branch: orchestration-branch"
assert_contains "unit_count is 2" "$RECONCILE_OUTPUT" "unit_count: 2"
assert_contains "p01 merged first (order 1)" "$RECONCILE_OUTPUT" "order: 1"
assert_contains "p02 merged second (order 2)" "$RECONCILE_OUTPUT" "order: 2"
assert_contains "p01 result clean" "$RECONCILE_OUTPUT" "result: clean"
assert_contains "merged count is 2" "$RECONCILE_OUTPUT" "merged: 2"
assert_contains "conflicts is 0" "$RECONCILE_OUTPUT" "conflicts: 0"
assert_contains "reverted is 0" "$RECONCILE_OUTPUT" "reverted: 0"

# Verify files exist on orchestration branch after merge
git checkout orchestration-branch 2>/dev/null
if [[ -f src/models/user.ts && -f src/routes/user.ts ]]; then
  echo "  PASS: both unit files present after reconciliation"
  PASS=$((PASS + 1))
else
  echo "  FAIL: missing files after reconciliation"
  FAIL=$((FAIL + 1))
fi

# Verify deterministic ordering (p01 before p02)
MERGE_LOG=$(git log --oneline --all | head -20)
if echo "$MERGE_LOG" | grep -q "merge(p01)"; then
  echo "  PASS: p01 merge commit present"
  PASS=$((PASS + 1))
else
  echo "  FAIL: p01 merge commit not found"
  FAIL=$((FAIL + 1))
fi

if echo "$MERGE_LOG" | grep -q "merge(p02)"; then
  echo "  PASS: p02 merge commit present"
  PASS=$((PASS + 1))
else
  echo "  FAIL: p02 merge commit not found"
  FAIL=$((FAIL + 1))
fi

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
