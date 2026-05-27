#!/usr/bin/env bash
# Bootstrap a git worktree for OAT development.
#
# Copies local-only files from the main worktree (env, config.local.json,
# MCP configs, local + archived projects), then fills gaps from S3 for
# archived projects that exist on other machines. Finally installs deps,
# builds, syncs OAT localPaths into the worktree, and refreshes provider
# views via `oat sync`.
#
# Idempotent — safe to re-run in an existing worktree.
#
# Usage:
#   pnpm run worktree:init
#   SKIP_S3_ARCHIVE_SYNC=1 pnpm run worktree:init   # skip remote archive sync

set -euo pipefail

current_root="$(git rev-parse --show-toplevel)"
common_git_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
main_root="$(cd "${common_git_dir}/.." && pwd -P)"

copy_file() {
  local src="$1"
  local dest="$2"

  if [[ ! -f "$src" ]]; then
    echo "skip (missing): ${src}"
    return 0
  fi

  if [[ "$src" == "$dest" ]]; then
    echo "skip (already present): ${dest}"
    return 0
  fi

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "copied: ${dest#"${current_root}/"}"
}

copy_env_files() {
  while IFS= read -r -d '' src; do
    local rel_path="${src#"${main_root}/"}"
    local dest="${current_root}/${rel_path}"
    copy_file "$src" "$dest"
  done < <(
    find "$main_root" -type f \
      \( -name ".env" -o -name ".env.local" -o -name ".env.*.local" \) \
      -not -path "*/.git/*" \
      -not -path "*/node_modules/*" \
      -not -path "*/.turbo/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" \
      -not -path "*/.worktrees/*" \
      -not -path "*/.claude/worktrees/*" \
      -print0
  )
}

copy_directory_tree() {
  local rel_path="$1"
  local src="${main_root}/${rel_path}"
  local dest="${current_root}/${rel_path}"

  if [[ ! -d "$src" ]]; then
    echo "skip (missing): ${rel_path}"
    return 0
  fi

  if [[ "$src" == "$dest" ]]; then
    echo "skip (already present): ${rel_path}"
    return 0
  fi

  mkdir -p "$dest"
  cp -R "${src}/." "${dest}/"
  echo "copied: ${rel_path}"
}

copy_matching_files() {
  local pattern_args=("$@")

  while IFS= read -r -d '' src; do
    local rel_path="${src#"${main_root}/"}"
    local dest="${current_root}/${rel_path}"
    copy_file "$src" "$dest"
  done < <(
    find "$main_root" \
      -path "*/.git" -prune -o \
      -path "*/node_modules" -prune -o \
      -path "*/.turbo" -prune -o \
      -path "*/dist" -prune -o \
      -path "*/build" -prune -o \
      -path "*/.worktrees" -prune -o \
      -path "*/.claude/worktrees" -prune -o \
      -type f \( "${pattern_args[@]}" \) \
      -print0
  )
}

echo "main worktree: ${main_root}"
echo "target worktree: ${current_root}"

echo "copying local environment files from main worktree"
copy_env_files

echo "copying local config files from main worktree"
copy_file "${main_root}/.oat/config.local.json" "${current_root}/.oat/config.local.json"
copy_matching_files \
  -name ".mcp.json" \
  -o -path "*/.claude/settings.local.json" \
  -o -path "*/.cursor/mcp.json"

echo "copying local and archived projects from main worktree"
copy_directory_tree ".oat/projects/local"
copy_directory_tree ".oat/projects/archived"

echo "installing dependencies"
pnpm install

echo "configuring git hooks"
pnpm run hooks setup

# Build before any `pnpm run cli` call. Workspace packages (e.g.,
# @open-agent-toolkit/control-plane) export from dist/ via package.json
# `main`, so tsx cannot resolve them until they are built.
echo "building workspace"
pnpm run build

if [[ "${SKIP_S3_ARCHIVE_SYNC:-}" == "1" ]]; then
  echo "skip S3 archived-project sync: SKIP_S3_ARCHIVE_SYNC=1"
else
  echo "syncing archived projects from S3 (cross-machine archives)"
  bash "${current_root}/scripts/sync-archived-projects-from-s3.sh" --warn-only
fi

if [[ "$current_root" != "$main_root" ]]; then
  echo "syncing OAT local paths into worktree"
  pnpm run --silent cli -- local sync "$current_root"
else
  echo "skip local path sync: already in main worktree"
fi

echo "syncing OAT canonical content to provider views"
pnpm run --silent cli -- sync
