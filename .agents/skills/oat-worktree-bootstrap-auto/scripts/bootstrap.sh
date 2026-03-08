#!/usr/bin/env bash
# oat-worktree-bootstrap-auto: Autonomous worktree bootstrap
#
# Usage: bootstrap.sh <branch-name> [--base <ref>] [--path <root>] [--baseline-policy <strict|allow-failing>]
#
# This script is a reference implementation for agent execution.
# Agents may execute it directly or follow its logic step-by-step.

set -euo pipefail

# ─── Defaults ───────────────────────────────────────────────────────────────
BRANCH_NAME=""
BASE_REF="origin/main"
WORKTREE_ROOT=""
BASELINE_POLICY="strict"

# ─── Parse Arguments ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)       BASE_REF="$2"; shift 2 ;;
    --path)       WORKTREE_ROOT="$2"; shift 2 ;;
    --baseline-policy) BASELINE_POLICY="$2"; shift 2 ;;
    -*)           echo "error: unknown flag $1" >&2; exit 1 ;;
    *)            BRANCH_NAME="$1"; shift ;;
  esac
done

if [[ -z "$BRANCH_NAME" ]]; then
  echo "error: branch name required" >&2
  exit 1
fi

# Validate branch name
if ! [[ "$BRANCH_NAME" =~ ^[a-zA-Z0-9._/-]+$ ]]; then
  echo "error: invalid branch name '$BRANCH_NAME' (must match ^[a-zA-Z0-9._/-]+\$)" >&2
  exit 1
fi

# ─── Step 1: Resolve Worktree Root ──────────────────────────────────────────
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")

if [[ -z "$WORKTREE_ROOT" ]]; then
  # Precedence 2: environment variable
  if [[ -n "${OAT_WORKTREES_ROOT:-}" ]]; then
    WORKTREE_ROOT="$OAT_WORKTREES_ROOT"
  # Precedence 3: .oat/config.json
  elif [[ -f "$REPO_ROOT/.oat/config.json" ]]; then
    CONFIG_ROOT=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$REPO_ROOT/.oat/config.json','utf8'));console.log(c.worktrees?.root||'')}catch{}" 2>/dev/null || true)
    if [[ -n "$CONFIG_ROOT" ]]; then
      # Resolve relative to REPO_ROOT
      if [[ "$CONFIG_ROOT" = /* ]]; then
        WORKTREE_ROOT="$CONFIG_ROOT"
      else
        WORKTREE_ROOT="$REPO_ROOT/$CONFIG_ROOT"
      fi
    fi
  fi

  # Precedence 4: discover existing directories (ordered)
  if [[ -z "$WORKTREE_ROOT" ]]; then
    if [[ -d "$REPO_ROOT/.worktrees" ]]; then
      WORKTREE_ROOT="$REPO_ROOT/.worktrees"
    elif [[ -d "$REPO_ROOT/worktrees" ]]; then
      WORKTREE_ROOT="$REPO_ROOT/worktrees"
    elif [[ -d "$(dirname "$REPO_ROOT")/${REPO_NAME}-worktrees" ]]; then
      WORKTREE_ROOT="$(dirname "$REPO_ROOT")/${REPO_NAME}-worktrees"
    else
      # Precedence 5: fallback
      WORKTREE_ROOT="$(dirname "$REPO_ROOT")/${REPO_NAME}-worktrees"
    fi
  fi
fi

# Verify gitignore for project-local roots
RELATIVE_ROOT="${WORKTREE_ROOT#"$REPO_ROOT"/}"
if [[ "$RELATIVE_ROOT" == ".worktrees" || "$RELATIVE_ROOT" == "worktrees" ]]; then
  if ! git check-ignore -q "$WORKTREE_ROOT" 2>/dev/null; then
    echo "warning: $RELATIVE_ROOT is not in .gitignore" >&2
  fi
fi

# ─── Step 2: Create or Reuse Worktree ──────────────────────────────────────
TARGET_PATH="$WORKTREE_ROOT/$BRANCH_NAME"

# Check if worktree already exists at target
if [[ -d "$TARGET_PATH/.git" ]] || git worktree list --porcelain | grep -q "worktree $TARGET_PATH$"; then
  # Reuse: validate branch matches
  EXISTING_BRANCH=$(git -C "$TARGET_PATH" branch --show-current 2>/dev/null || true)
  if [[ "$EXISTING_BRANCH" != "$BRANCH_NAME" ]]; then
    echo "error: worktree at $TARGET_PATH is on branch '$EXISTING_BRANCH', expected '$BRANCH_NAME'" >&2
    exit 1
  fi
  echo "info: reusing existing worktree at $TARGET_PATH"
else
  mkdir -p "$(dirname "$TARGET_PATH")"

  # Check if branch exists
  if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
    git worktree add "$TARGET_PATH" "$BRANCH_NAME"
  else
    git worktree add "$TARGET_PATH" -b "$BRANCH_NAME" "$BASE_REF"
  fi
fi

# ─── Step 3: Run Baseline Checks ───────────────────────────────────────────
cd "$TARGET_PATH"

declare -A CHECK_RESULTS
WARNINGS=()
HAS_ERROR=false

run_check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    CHECK_RESULTS["$name"]="pass"
  else
    CHECK_RESULTS["$name"]="fail"
    if [[ "$BASELINE_POLICY" == "strict" ]]; then
      HAS_ERROR=true
      echo "error: baseline check '$name' failed (strict policy)" >&2
    else
      WARNINGS+=("$name: check failed")
    fi
  fi
}

run_check "worktree_init" pnpm run worktree:init
if [[ "$HAS_ERROR" == true ]]; then
  cat <<YAML
status: error
worktree_path: "$TARGET_PATH"
branch: "$BRANCH_NAME"
base_ref: "$BASE_REF"
error: "worktree_init failed under strict policy"
baseline_policy: $BASELINE_POLICY
YAML
  exit 1
fi

run_check "project_status" oat status --scope project
run_check "tests" pnpm test
run_check "git_clean" test -z "$(git status --porcelain)"

# ─── Step 4: Create Provider Directories ────────────────────────────────────
mkdir -p "$TARGET_PATH/.claude/skills"
mkdir -p "$TARGET_PATH/.cursor/rules"
if oat sync --scope all >/dev/null 2>&1; then
  CHECK_RESULTS["provider_sync"]="pass"
else
  CHECK_RESULTS["provider_sync"]="fail"
  if [[ "$BASELINE_POLICY" == "strict" ]]; then
    HAS_ERROR=true
  else
    WARNINGS+=("provider_sync: sync failed")
  fi
fi

# ─── Step 5: Return Structured Status ───────────────────────────────────────
if [[ "$HAS_ERROR" == true ]]; then
  STATUS="error"
elif [[ ${#WARNINGS[@]} -gt 0 ]]; then
  STATUS="warning"
else
  STATUS="success"
fi

cat <<YAML
status: $STATUS
worktree_path: "$TARGET_PATH"
branch: "$BRANCH_NAME"
base_ref: "$BASE_REF"
checks:
  worktree_init: ${CHECK_RESULTS[worktree_init]:-skip}
  project_status: ${CHECK_RESULTS[project_status]:-skip}
  tests: ${CHECK_RESULTS[tests]:-skip}
  git_clean: ${CHECK_RESULTS[git_clean]:-skip}
  provider_sync: ${CHECK_RESULTS[provider_sync]:-skip}
warnings: [$(IFS=','; echo "${WARNINGS[*]:-}")]
error: ${HAS_ERROR:+baseline check failed under strict policy}
baseline_policy: $BASELINE_POLICY
YAML
