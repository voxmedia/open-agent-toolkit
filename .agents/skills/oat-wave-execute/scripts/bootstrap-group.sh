#!/bin/bash
# oat-wave-execute: parallel-group worktree bootstrap.
# Wraps the oat-worktree-bootstrap-auto contract (normal mode, strict policy).
# Usage: bootstrap-group.sh <wave-prefix> <base-sha> <phase>...
#   e.g. bootstrap-group.sh wave-2 <full-sha> p01 p02 p03
# Emits one terminal "STATUS <phase>: status=..." line per phase (plus optional
# "STATUS <phase>: <step>=skipped ..." informational lines); caller parses those.
# Repo hooks (repo-neutral): OAT_WAVE_BOOTSTRAP_CMD runs repository bootstrap in
# each worktree; OAT_WAVE_BASELINE_CMD runs the proportionate baseline check.
# When unset, a pnpm-shaped repo (pnpm-lock.yaml + matching package.json script)
# defaults to `pnpm run worktree:init` / `pnpm type-check`; otherwise the step
# is skipped with a STATUS line.
set -u

usage() {
  echo "Usage: bootstrap-group.sh <wave-prefix> <base-sha> <phase>..." >&2
  echo "  e.g. bootstrap-group.sh wave-2 <full-40-hex-sha> p01 p02 p03" >&2
}

provider_view_list() {
  local checkout="$1"
  node - "$checkout/.oat/sync/manifest.json" <<'NODE'
const fs = require("fs");
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const paths = manifest.entries.map((entry) => entry.providerPath).sort();
process.stdout.write(`${paths.join("\n")}\n`);
NODE
}

verify_view_parity() {
  local root_checkout="$1"
  local worktree_checkout="$2"
  local root_list
  local worktree_list
  local local_version
  local global_version

  root_list="$(mktemp "${TMPDIR:-/tmp}/oat-root-views.XXXXXX")" || return 1
  worktree_list="$(mktemp "${TMPDIR:-/tmp}/oat-worktree-views.XXXXXX")" || {
    rm -f "$root_list"
    return 1
  }

  if ! provider_view_list "$root_checkout" >"$root_list" ||
     ! provider_view_list "$worktree_checkout" >"$worktree_list"; then
    echo "STATUS view-parity=MISMATCH"
    echo "  diagnostic: unable to read provider-view lists from sync manifests"
    rm -f "$root_list" "$worktree_list"
    return 1
  fi

  if cmp -s "$root_list" "$worktree_list"; then
    echo "STATUS view-parity=ok"
    rm -f "$root_list" "$worktree_list"
    return 0
  fi

  echo "STATUS view-parity=MISMATCH"
  echo "  root-only provider views:"
  comm -23 "$root_list" "$worktree_list"
  echo "  worktree-only provider views:"
  comm -13 "$root_list" "$worktree_list"
  if [[ -x "$worktree_checkout/node_modules/.bin/oat" ]]; then
    local_version="$("$worktree_checkout/node_modules/.bin/oat" --version 2>&1)"
  else
    local_version="missing"
  fi
  global_version="$(cd "$worktree_checkout" && oat --version 2>&1)"
  echo "  node_modules/.bin/oat --version: $local_version"
  echo "  oat --version: $global_version"
  rm -f "$root_list" "$worktree_list"
  return 1
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
# Optional node env setup: source nvm only when present; otherwise honor the
# already-configured node environment (nvm is a repo convention, not required).
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
  cd "$REPO" && nvm use >/dev/null 2>&1
fi

# Repo-hook resolution: explicit env hooks win; a pnpm-shaped repo (lockfile +
# matching package.json script) falls back to its conventional commands;
# anything else skips the step with a STATUS line.
has_pnpm_script() {
  [[ -f "$REPO/pnpm-lock.yaml" ]] || return 1
  grep -q "\"$1\"" "$REPO/package.json" 2>/dev/null
}
BOOTSTRAP_CMD="${OAT_WAVE_BOOTSTRAP_CMD:-}"
if [[ -z "$BOOTSTRAP_CMD" ]] && has_pnpm_script "worktree:init"; then
  BOOTSTRAP_CMD="pnpm run worktree:init"
fi
BASELINE_CMD="${OAT_WAVE_BASELINE_CMD:-}"
if [[ -z "$BASELINE_CMD" ]] && has_pnpm_script "type-check"; then
  BASELINE_CMD="pnpm type-check"
fi
GROUP_STATUS=0

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
  # Local-only config propagation (bootstrap-auto step 2.5; the bootstrap hook
  # may also cover these, but propagate first so its tooling sees them). Other
  # repo-local files belong in a consuming repo's own wrapper around this script.
  [[ -f "$REPO/.oat/config.local.json" && ! -f "$TP/.oat/config.local.json" ]] && cp "$REPO/.oat/config.local.json" "$TP/.oat/config.local.json"
  (cd "$TP" && oat local sync "$TP" >/dev/null 2>&1) || true
  # Base verification (bootstrap-auto step 2.7)
  OBS=$(git -C "$TP" rev-parse HEAD)
  if ! git -C "$TP" merge-base --is-ancestor "$BASE_SHA" "$OBS"; then
    echo "STATUS $P: status=failed reason=base-mismatch expected=$BASE_SHA observed=$OBS"; continue
  fi
  # Repository bootstrap (hook-resolved) + proportionate baseline
  if [[ -n "$BOOTSTRAP_CMD" ]]; then
    if ! (cd "$TP" && /bin/bash -c "$BOOTSTRAP_CMD" >"$TP/.bootstrap-init.log" 2>&1); then
      echo "STATUS $P: status=error reason=repository-bootstrap-failed (see $TP/.bootstrap-init.log)"; tail -5 "$TP/.bootstrap-init.log"; continue
    fi
  else
    echo "STATUS $P: bootstrap=skipped reason=no-bootstrap-hook (set OAT_WAVE_BOOTSTRAP_CMD)"
  fi
  if ! verify_view_parity "$REPO" "$TP"; then
    echo "STATUS $P: status=error reason=provider-view-parity-mismatch"; continue
  fi
  if [[ -n "$BASELINE_CMD" ]]; then
    if ! (cd "$TP" && /bin/bash -c "$BASELINE_CMD" >"$TP/.bootstrap-baseline.log" 2>&1); then
      echo "STATUS $P: status=error reason=baseline-verification-failed (see $TP/.bootstrap-baseline.log)"; continue
    fi
  else
    echo "STATUS $P: baseline=skipped reason=no-baseline-hook (set OAT_WAVE_BASELINE_CMD)"
  fi
  # Sync-commit if scoped paths dirty (bootstrap-auto step 4)
  if ! (
    cd "$TP" && git add -A -- .oat/sync/manifest.json .claude .cursor .codex 2>/dev/null
    if ! git diff --cached --quiet 2>/dev/null; then
      if git -c core.hooksPath=/dev/null commit -q -m "chore: run sync"; then
        echo "  sync_commit: committed"
      else
        echo "  sync_commit: FAILED"
        exit 1
      fi
    else
      echo "  sync_commit: skip"
    fi
  ); then
    echo "STATUS $P: status=failed reason=sync-commit"
    GROUP_STATUS=1
    continue
  fi
  # Relocate bootstrap logs out of the worktree (1.3.0: script-owned; callers
  # previously forgot this step)
  LOGDIR="${TMPDIR:-/tmp}/oat-bootstrap-logs/$WAVE_PREFIX-$P"
  mkdir -p "$LOGDIR" && mv "$TP"/.bootstrap-*.log "$LOGDIR"/ 2>/dev/null
  echo "  bootstrap_logs: $LOGDIR"
  DIRTY=$(cd "$TP" && git status --porcelain | wc -l | tr -d ' ')
  echo "STATUS $P: status=success worktree=$TP branch=$BR base=$BASE_SHA observed=$OBS git_clean=$([[ $DIRTY == 0 ]] && echo pass || echo "fail($DIRTY)")"
done
echo "=== group bootstrap done ==="
exit "$GROUP_STATUS"
