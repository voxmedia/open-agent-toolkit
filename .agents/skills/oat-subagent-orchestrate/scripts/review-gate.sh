#!/usr/bin/env bash
# oat-subagent-orchestrate: Autonomous review gate with fix-loop retry
#
# Usage: review-gate.sh <unit-branch> <worktree-path> [--retry-limit <N>]
#
# This script is a reference implementation for the review gate logic.
# The orchestrator agent uses it (or follows its logic) to run the
# two-stage review gate per unit after subagent implementation.
#
# Stage 1: Spec compliance (does the implementation match the plan?)
# Stage 2: Code quality (is the code well-written and passing checks?)
#
# If a stage fails, the fix-loop dispatches the implementer to fix,
# then re-runs the same stage. Up to --retry-limit attempts.

set -euo pipefail

# ─── Defaults ───────────────────────────────────────────────────────────────
UNIT_BRANCH=""
WORKTREE_PATH=""
RETRY_LIMIT=2

# ─── Parse Arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --retry-limit) RETRY_LIMIT="$2"; shift 2 ;;
    -*)            echo "error: unknown flag $1" >&2; exit 1 ;;
    *)
      if [[ -z "$UNIT_BRANCH" ]]; then UNIT_BRANCH="$1"
      elif [[ -z "$WORKTREE_PATH" ]]; then WORKTREE_PATH="$1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$UNIT_BRANCH" || -z "$WORKTREE_PATH" ]]; then
  echo "error: required: <unit-branch> <worktree-path>" >&2
  exit 1
fi

cd "$WORKTREE_PATH"

# ─── Stage 1: Spec Compliance ──────────────────────────────────────────────
# The orchestrator agent runs this check by comparing the implementer's
# output against the plan task specification.
#
# Checks:
# 1. All planned files exist (created/modified as specified)
# 2. Verification commands from plan pass
# 3. No files modified outside the task's file boundary
# 4. No scope creep (features not in the plan)
#
# This stage is primarily agent-driven (reading code vs spec).
# The shell checks below handle the automatable parts.

echo "--- review_gate ---"
echo "unit_branch: $UNIT_BRANCH"
echo "worktree_path: $WORKTREE_PATH"
echo "retry_limit: $RETRY_LIMIT"

SPEC_VERDICT="pass"
QUALITY_VERDICT="pending"
RETRY_COUNT=0
FINDINGS_CRITICAL=()
FINDINGS_IMPORTANT=()
FINDINGS_MINOR=()

# Automatable spec checks: verification commands
echo "stage: spec_compliance"
echo "checks:"

# Check: tests pass
if pnpm test >/dev/null 2>&1; then
  echo "  tests: pass"
else
  echo "  tests: fail"
  SPEC_VERDICT="fail"
  FINDINGS_CRITICAL+=("Tests failing in unit branch")
fi

# Check: git status is clean (all work committed)
if [[ -z "$(git status --porcelain)" ]]; then
  echo "  git_clean: pass"
else
  echo "  git_clean: fail"
  SPEC_VERDICT="fail"
  FINDINGS_IMPORTANT+=("Uncommitted changes in unit branch")
fi

echo "  spec_verdict: $SPEC_VERDICT"

# ─── Stage 2: Code Quality ─────────────────────────────────────────────────
# Only runs if spec compliance passes.

if [[ "$SPEC_VERDICT" == "pass" ]]; then
  echo "stage: code_quality"
  echo "checks:"
  QUALITY_VERDICT="pass"

  # Check: lint
  if pnpm lint >/dev/null 2>&1; then
    echo "  lint: pass"
  else
    echo "  lint: fail"
    QUALITY_VERDICT="fail"
    FINDINGS_IMPORTANT+=("Lint errors in unit branch")
  fi

  # Check: type-check
  if pnpm type-check >/dev/null 2>&1; then
    echo "  type_check: pass"
  else
    echo "  type_check: fail"
    QUALITY_VERDICT="fail"
    FINDINGS_IMPORTANT+=("Type errors in unit branch")
  fi

  # Check: build
  if pnpm build >/dev/null 2>&1; then
    echo "  build: pass"
  else
    echo "  build: fail"
    QUALITY_VERDICT="fail"
    FINDINGS_CRITICAL+=("Build failure in unit branch")
  fi

  echo "  quality_verdict: $QUALITY_VERDICT"
fi

# ─── Verdict Summary ────────────────────────────────────────────────────────
if [[ "$SPEC_VERDICT" == "pass" && "$QUALITY_VERDICT" == "pass" ]]; then
  OVERALL="pass"
  DISPOSITION="eligible_for_merge"
elif [[ "$SPEC_VERDICT" == "fail" || "$QUALITY_VERDICT" == "fail" ]]; then
  OVERALL="fail"
  DISPOSITION="needs_fix_or_exclude"
else
  OVERALL="incomplete"
  DISPOSITION="blocked"
fi

echo "verdict:"
echo "  overall: $OVERALL"
echo "  spec_compliance: $SPEC_VERDICT"
echo "  code_quality: $QUALITY_VERDICT"
echo "  retry_count: $RETRY_COUNT"
echo "  disposition: $DISPOSITION"
echo "  findings:"
echo "    critical:"
for f in "${FINDINGS_CRITICAL[@]:-}"; do
  [[ -n "$f" ]] && echo "      - \"$f\""
done
echo "    important:"
for f in "${FINDINGS_IMPORTANT[@]:-}"; do
  [[ -n "$f" ]] && echo "      - \"$f\""
done
echo "    minor:"
for f in "${FINDINGS_MINOR[@]:-}"; do
  [[ -n "$f" ]] && echo "      - \"$f\""
done

# ─── Fix-Loop Hint ──────────────────────────────────────────────────────────
# The orchestrator agent handles the fix-loop:
# 1. If verdict is "fail", dispatch implementer subagent with findings
# 2. Re-run this script (incrementing retry count)
# 3. If retry_count >= retry_limit, mark unit as "failed" and exclude

echo "fix_loop:"
echo "  retry_limit: $RETRY_LIMIT"
if [[ "$OVERALL" == "fail" && $RETRY_COUNT -lt $RETRY_LIMIT ]]; then
  echo "  action: dispatch_fix"
  echo "  next_retry: $((RETRY_COUNT + 1))"
else
  echo "  action: finalize"
fi

echo "---"
