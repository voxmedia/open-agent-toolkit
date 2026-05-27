#!/usr/bin/env bash
# Sync archived OAT projects from S3 into .oat/projects/archived/.
#
# Completed projects upload to S3 on another machine (or the main worktree) via
# oat-project-complete. Worktree init copies archived projects from the main
# checkout only — this script fills gaps for archives that exist on S3 but not
# locally (other machines, or archives completed after the last local copy).
#
# Delegates to the OAT CLI: oat project archive sync
# Requires archive.s3Uri in .oat/config.json and AWS credentials (see
# archive.awsProfile / archive.awsRegion).
#
# Usage:
#   scripts/sync-archived-projects-from-s3.sh
#     Sync the latest remote snapshot for every archived project.
#
#   scripts/sync-archived-projects-from-s3.sh <project-name>
#     Sync one project (matches slug or YYYYMMDD-slug snapshot prefix).
#
#   scripts/sync-archived-projects-from-s3.sh --dry-run [project-name]
#     Preview what would download without writing files.
#
#   scripts/sync-archived-projects-from-s3.sh --force <project-name>
#     Replace the local archive even when the snapshot name already matches.
#
#   scripts/sync-archived-projects-from-s3.sh --warn-only [args...]
#     Print warnings and exit 0 on failure (for worktree init; does not abort bootstrap).
#
# Examples:
#   pnpm run projects:sync-archived-from-s3
#   pnpm run projects:sync-archived-from-s3 -- inbox-noop-llm-guard
#   pnpm run projects:sync-archived-from-s3 -- --dry-run

set -euo pipefail

warn_only=0

warn() {
  echo "warning: $*" >&2
}

fail_or_warn() {
  if [[ "$warn_only" -eq 1 ]]; then
    warn "$*"
    exit 0
  fi
  echo "error: $*" >&2
  exit 1
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

project_name=""
oat_args=()

for arg in "$@"; do
  case "$arg" in
    --warn-only)
      warn_only=1
      ;;
    --dry-run | --force)
      oat_args+=("$arg")
      ;;
    --help | -h)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*)
      fail_or_warn "unknown option: $arg"
      ;;
    *)
      if [[ -n "$project_name" ]]; then
        fail_or_warn "unexpected extra argument: $arg"
      fi
      project_name="$arg"
      ;;
  esac
done

# Prefer the locally-built CLI so worktrees don't depend on a globally
# linked `oat` binary. Falls back to `oat` on PATH for environments where
# `pnpm run cli` is unavailable (e.g., post-clean repo states).
oat_cli=(pnpm run --silent cli --)
if ! pnpm --version >/dev/null 2>&1; then
  if command -v oat >/dev/null 2>&1; then
    oat_cli=(oat)
  else
    fail_or_warn "neither pnpm nor oat CLI is available on PATH"
  fi
fi

if ! command -v aws >/dev/null 2>&1; then
  fail_or_warn "aws CLI not found on PATH (required for archive sync)"
fi

s3_uri="$("${oat_cli[@]}" config get archive.s3Uri 2>/dev/null || true)"
if [[ -z "$s3_uri" ]]; then
  fail_or_warn "archive.s3Uri is not configured in .oat/config.json"
fi

echo "Syncing archived projects from S3"
echo "  s3: ${s3_uri}"
if [[ -n "$project_name" ]]; then
  echo "  project: ${project_name}"
else
  echo "  project: (all — latest snapshot per slug)"
fi

if [[ ${#oat_args[@]} -gt 0 ]]; then
  echo "  options: ${oat_args[*]}"
fi

sync_cmd=("${oat_cli[@]}" project archive sync)
if [[ ${#oat_args[@]} -gt 0 ]]; then
  sync_cmd+=("${oat_args[@]}")
fi
if [[ -n "$project_name" ]]; then
  sync_cmd+=("$project_name")
fi

if ! "${sync_cmd[@]}"; then
  if [[ -n "$project_name" ]]; then
    fail_or_warn "S3 archived-project sync failed for ${project_name} (profile, auth, or network)"
  else
    fail_or_warn "S3 archived-project sync failed (profile, auth, or network)"
  fi
fi
