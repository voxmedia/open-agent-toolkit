#!/bin/bash
# oat-wave-execute: parallel-group worktree bootstrap.
# Wraps the oat-worktree-bootstrap-auto contract (normal mode, strict policy).
# Usage: bootstrap-group.sh <wave-prefix> <base-sha> <phase>...
#   e.g. bootstrap-group.sh wave-2 <full-sha> p01 p02 p03
# Emits one "STATUS <phase>: ..." line per phase; caller parses those.
set -u

usage() {
  echo "Usage: bootstrap-group.sh <wave-prefix> <base-sha> <phase>..." >&2
  echo "  e.g. bootstrap-group.sh wave-2 <full-40-hex-sha> p01 p02 p03" >&2
}

# Guard: require wave-prefix, base-sha, and at least one phase (3+ args)
if [[ $# -lt 3 ]]; then
  echo "FATAL: expected <wave-prefix> <base-sha> <phase>... (got $# arg(s))" >&2
  usage
  exit 2
fi

WAVE_PREFIX="$1"; shift
BASE_SHA="$1"; shift
PHASES=("$@")

# Guard: base must be a full 40-hex commit ID (standing rule 5 — no short SHAs)
if [[ ! "$BASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "FATAL: base '$BASE_SHA' is not a full 40-hex commit ID (use git rev-parse HEAD)" >&2
  usage
  exit 1
fi
REPO="$(git rev-parse --show-toplevel)"
ROOT_CFG="$(cd "$REPO" && oat config get worktrees.root 2>/dev/null || true)"
ROOT="$REPO/${ROOT_CFG:-.worktrees}"
source ~/.nvm/nvm.sh >/dev/null 2>&1
cd "$REPO" && nvm use >/dev/null 2>&1

# Guard: the full SHA must resolve to an actual commit in this repo
if ! git -C "$REPO" cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
  echo "FATAL: base '$BASE_SHA' does not resolve to a commit (use git rev-parse HEAD)"; exit 1
fi
# Guard: phase branches must not nest under an existing leaf ref (standing rule 1)
if git -C "$REPO" show-ref --verify --quiet "refs/heads/$WAVE_PREFIX"; then
  echo "FATAL: branch '$WAVE_PREFIX' exists as a leaf ref; phase branches '$WAVE_PREFIX/pNN' cannot be created"; exit 1
fi
# Smoke detection (bootstrap-auto step 1.5)
if [[ -n "$(git -C "$REPO" ls-tree "$BASE_SHA" -- .oat/smoke-bootstrap.json)" ]]; then
  echo "FATAL: smoke marker present at base; refusing normal bootstrap"; exit 1
fi

for P in "${PHASES[@]}"; do
  BR="$WAVE_PREFIX/$P"
  TP="$ROOT/$BR"
  echo "=== [$P] bootstrap → $TP (base $BASE_SHA) ==="
  if ! git -C "$REPO" worktree add "$TP" -b "$BR" "$BASE_SHA" >/dev/null 2>&1; then
    echo "STATUS $P: status=error reason=worktree-create-failed"; continue
  fi
  # Local-only config propagation (bootstrap-auto step 2.5; worktree:init also
  # covers these, but propagate before init so init's tooling sees them)
  [[ -f "$REPO/.oat/config.local.json" && ! -f "$TP/.oat/config.local.json" ]] && cp "$REPO/.oat/config.local.json" "$TP/.oat/config.local.json"
  [[ -f "$REPO/.stoa/operator-hosts.local.json" && ! -f "$TP/.stoa/operator-hosts.local.json" ]] && { mkdir -p "$TP/.stoa"; cp "$REPO/.stoa/operator-hosts.local.json" "$TP/.stoa/operator-hosts.local.json"; }
  (cd "$TP" && oat local sync "$TP" >/dev/null 2>&1) || true
  # Base verification (bootstrap-auto step 2.7)
  OBS=$(git -C "$TP" rev-parse HEAD)
  if ! git -C "$TP" merge-base --is-ancestor "$BASE_SHA" "$OBS"; then
    echo "STATUS $P: status=failed reason=base-mismatch expected=$BASE_SHA observed=$OBS"; continue
  fi
  # Repository bootstrap (declared: worktree:init) + proportionate baseline
  if ! (cd "$TP" && SKIP_S3_ARCHIVE_SYNC=1 pnpm run worktree:init >"$TP/.bootstrap-init.log" 2>&1); then
    echo "STATUS $P: status=error reason=repository-bootstrap-failed (see $TP/.bootstrap-init.log)"; tail -5 "$TP/.bootstrap-init.log"; continue
  fi
  if ! (cd "$TP" && pnpm type-check >"$TP/.bootstrap-baseline.log" 2>&1); then
    echo "STATUS $P: status=error reason=baseline-verification-failed (see $TP/.bootstrap-baseline.log)"; continue
  fi
  # Sync-commit if scoped paths dirty (bootstrap-auto step 4)
  (cd "$TP" && git add -A -- .oat/sync/manifest.json .claude .cursor .codex 2>/dev/null
   if ! git diff --cached --quiet 2>/dev/null; then
     FILES=$(git diff --cached --name-only --no-renames)
     git -c core.hooksPath=/dev/null commit -q -m "chore: run sync" $FILES && echo "  sync_commit: committed" || echo "  sync_commit: FAILED"
   else echo "  sync_commit: skip"; fi)
  # Relocate bootstrap logs out of the worktree (1.3.0: script-owned; callers
  # previously forgot this step)
  LOGDIR="${TMPDIR:-/tmp}/oat-bootstrap-logs/$WAVE_PREFIX-$P"
  mkdir -p "$LOGDIR" && mv "$TP"/.bootstrap-*.log "$LOGDIR"/ 2>/dev/null
  echo "  bootstrap_logs: $LOGDIR"
  DIRTY=$(cd "$TP" && git status --porcelain | wc -l | tr -d ' ')
  echo "STATUS $P: status=success worktree=$TP branch=$BR base=$BASE_SHA observed=$OBS git_clean=$([[ $DIRTY == 0 ]] && echo pass || echo "fail($DIRTY)")"
done
echo "=== group bootstrap done ==="
