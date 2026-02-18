#!/usr/bin/env bash
# oat-subagent-orchestrate: Fan-in merge/reconcile logic
#
# Usage: reconcile.sh <orchestration-branch> [--merge-strategy <merge|cherry-pick>] <unit-branch>...
#
# This script merges passing unit branches back into the orchestration
# branch in deterministic order (by task ID) with integration verification
# after each merge.
#
# If merge fails, falls back to cherry-pick. If both fail, classifies
# the conflict and reports for manual resolution.

set -euo pipefail

# ─── Defaults ───────────────────────────────────────────────────────────────
ORCHESTRATION_BRANCH=""
MERGE_STRATEGY="merge"
UNIT_BRANCHES=()

# ─── Parse Arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --merge-strategy) MERGE_STRATEGY="$2"; shift 2 ;;
    -*)               echo "error: unknown flag $1" >&2; exit 1 ;;
    *)
      if [[ -z "$ORCHESTRATION_BRANCH" ]]; then
        ORCHESTRATION_BRANCH="$1"
      else
        UNIT_BRANCHES+=("$1")
      fi
      shift
      ;;
  esac
done

if [[ -z "$ORCHESTRATION_BRANCH" || ${#UNIT_BRANCHES[@]} -eq 0 ]]; then
  echo "error: required: <orchestration-branch> <unit-branch>..." >&2
  exit 1
fi

# ─── Sort Branches by Task ID ──────────────────────────────────────────────
# Deterministic ordering: sort by the unit ID suffix (p01-t01, p02-t01, etc.)
IFS=$'\n' SORTED_BRANCHES=($(printf '%s\n' "${UNIT_BRANCHES[@]}" | sort)); unset IFS

# ─── Checkout Orchestration Branch ──────────────────────────────────────────
git checkout "$ORCHESTRATION_BRANCH"

echo "--- reconcile_manifest ---"
echo "orchestration_branch: $ORCHESTRATION_BRANCH"
echo "merge_strategy: $MERGE_STRATEGY"
echo "unit_count: ${#SORTED_BRANCHES[@]}"
echo "merge_outcomes:"

MERGE_ORDER=0
TOTAL_MERGED=0
TOTAL_CONFLICTS=0
TOTAL_REVERTED=0

for UNIT_BRANCH in "${SORTED_BRANCHES[@]}"; do
  MERGE_ORDER=$((MERGE_ORDER + 1))
  UNIT_ID=$(echo "$UNIT_BRANCH" | sed 's|.*/||')  # Extract unit ID from branch name

  echo "  - order: $MERGE_ORDER"
  echo "    unit_id: \"$UNIT_ID\""
  echo "    branch: \"$UNIT_BRANCH\""

  # ─── Attempt Merge ────────────────────────────────────────────────────
  STRATEGY_USED="$MERGE_STRATEGY"
  MERGE_RESULT="pending"
  PRE_MERGE_SHA=$(git rev-parse HEAD)

  if [[ "$MERGE_STRATEGY" == "merge" ]]; then
    if git merge --no-ff "$UNIT_BRANCH" -m "merge($UNIT_ID): reconcile unit into orchestration branch" 2>/dev/null; then
      MERGE_RESULT="clean"
    else
      # Merge conflict — abort and try cherry-pick fallback
      git merge --abort 2>/dev/null || true
      STRATEGY_USED="cherry-pick (fallback)"

      # Get commits unique to the unit branch
      COMMITS=$(git log --reverse --format='%H' "$ORCHESTRATION_BRANCH..$UNIT_BRANCH" 2>/dev/null || true)
      if [[ -n "$COMMITS" ]]; then
        CHERRY_FAILED=false
        while IFS= read -r COMMIT; do
          if ! git cherry-pick "$COMMIT" 2>/dev/null; then
            git cherry-pick --abort 2>/dev/null || true
            CHERRY_FAILED=true
            break
          fi
        done <<< "$COMMITS"

        if [[ "$CHERRY_FAILED" == true ]]; then
          MERGE_RESULT="conflict"
        else
          MERGE_RESULT="clean"
        fi
      else
        MERGE_RESULT="no_commits"
      fi
    fi
  elif [[ "$MERGE_STRATEGY" == "cherry-pick" ]]; then
    COMMITS=$(git log --reverse --format='%H' "$ORCHESTRATION_BRANCH..$UNIT_BRANCH" 2>/dev/null || true)
    if [[ -n "$COMMITS" ]]; then
      CHERRY_FAILED=false
      while IFS= read -r COMMIT; do
        if ! git cherry-pick "$COMMIT" 2>/dev/null; then
          git cherry-pick --abort 2>/dev/null || true
          CHERRY_FAILED=true
          break
        fi
      done <<< "$COMMITS"

      if [[ "$CHERRY_FAILED" == true ]]; then
        MERGE_RESULT="conflict"
      else
        MERGE_RESULT="clean"
      fi
    else
      MERGE_RESULT="no_commits"
    fi
  fi

  echo "    strategy: \"$STRATEGY_USED\""

  # ─── Integration Verification ─────────────────────────────────────────
  if [[ "$MERGE_RESULT" == "clean" ]]; then
    INTEGRATION="pending"

    # Run integration checks
    TESTS_PASS=true
    LINT_PASS=true
    TYPECHECK_PASS=true

    pnpm test >/dev/null 2>&1 || TESTS_PASS=false
    pnpm lint >/dev/null 2>&1 || LINT_PASS=false
    pnpm type-check >/dev/null 2>&1 || TYPECHECK_PASS=false

    if [[ "$TESTS_PASS" == true && "$LINT_PASS" == true && "$TYPECHECK_PASS" == true ]]; then
      INTEGRATION="pass"
      TOTAL_MERGED=$((TOTAL_MERGED + 1))
    else
      INTEGRATION="fail"
      # Rollback to pre-merge state
      git reset --hard "$PRE_MERGE_SHA" 2>/dev/null || true
      MERGE_RESULT="reverted"
      TOTAL_REVERTED=$((TOTAL_REVERTED + 1))
    fi

    echo "    result: $MERGE_RESULT"
    echo "    integration:"
    echo "      tests: $([ "$TESTS_PASS" == true ] && echo 'pass' || echo 'fail')"
    echo "      lint: $([ "$LINT_PASS" == true ] && echo 'pass' || echo 'fail')"
    echo "      type_check: $([ "$TYPECHECK_PASS" == true ] && echo 'pass' || echo 'fail')"
    echo "      verdict: $INTEGRATION"
  else
    echo "    result: $MERGE_RESULT"
    TOTAL_CONFLICTS=$((TOTAL_CONFLICTS + 1))
    echo "    integration: skipped (merge not clean)"

    # Classify conflict
    if [[ "$MERGE_RESULT" == "conflict" ]]; then
      echo "    conflict_type: file-level"
      echo "    resolution: manual_required"
    fi
  fi
done

# ─── Summary ────────────────────────────────────────────────────────────────
echo "summary:"
echo "  total_units: ${#SORTED_BRANCHES[@]}"
echo "  merged: $TOTAL_MERGED"
echo "  conflicts: $TOTAL_CONFLICTS"
echo "  reverted: $TOTAL_REVERTED"
echo "  final_branch: $ORCHESTRATION_BRANCH"
echo "  final_commit: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
echo "---"
