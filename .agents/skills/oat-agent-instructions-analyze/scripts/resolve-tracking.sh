#!/usr/bin/env bash
# resolve-tracking.sh — Read/write/init .oat/tracking.json
#
# Usage:
#   resolve-tracking.sh init
#   resolve-tracking.sh read <operation>
#   resolve-tracking.sh write <operation> <commitHash> <baseBranch> <mode> [--artifact-path <path>] [formats...]
#
# Schema (flat top-level keys per backlog convention):
#   {
#     "version": 1,
#     "<operation>": {
#       "lastRunAt": "ISO 8601",
#       "commitHash": "...",
#       "baseBranch": "...",
#       "mode": "full|delta",
#       "formats": ["agents_md", ...],
#       "artifactPath": "..."
#     }
#   }
#
# Write protocol: optimistic per-key merge. Each writer reads the file,
# updates only its own operation key, and writes back.

set -euo pipefail

# Resolve repo root and tracking file path
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TRACKING_FILE="${REPO_ROOT}/.oat/tracking.json"

# Ensure jq is available
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required but not found in PATH" >&2
  exit 1
fi

cmd_init() {
  mkdir -p "$(dirname "$TRACKING_FILE")"
  if [[ ! -f "$TRACKING_FILE" ]] || ! jq empty "$TRACKING_FILE" 2>/dev/null; then
    echo '{"version":1}' | jq . > "$TRACKING_FILE"
    echo "Initialized $TRACKING_FILE"
  else
    echo "$TRACKING_FILE already exists and is valid JSON"
  fi
}

cmd_read() {
  local operation="${1:?Usage: resolve-tracking.sh read <operation>}"

  if [[ ! -f "$TRACKING_FILE" ]]; then
    echo "{}"
    return 0
  fi

  jq -r --arg op "$operation" '.[$op] // empty' "$TRACKING_FILE"
}

cmd_write() {
  local operation="${1:?Usage: resolve-tracking.sh write <operation> <commitHash> <baseBranch> <mode> [--artifact-path <path>] [formats...]}"
  local commit_hash="${2:?Missing commitHash}"
  local base_branch="${3:?Missing baseBranch}"
  local mode="${4:?Missing mode}"
  shift 4

  # Parse optional --artifact-path flag before variadic formats
  local artifact_path=""
  if [[ "${1:-}" == "--artifact-path" ]]; then
    artifact_path="${2:?Missing artifact path value after --artifact-path}"
    shift 2
  fi

  local formats=("$@")

  # Build formats JSON array
  local formats_json="[]"
  if [[ ${#formats[@]} -gt 0 ]]; then
    formats_json=$(printf '%s\n' "${formats[@]}" | jq -R . | jq -s .)
  fi

  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  # Read existing or initialize
  local existing
  if [[ -f "$TRACKING_FILE" ]] && jq empty "$TRACKING_FILE" 2>/dev/null; then
    existing="$(cat "$TRACKING_FILE")"
  else
    mkdir -p "$(dirname "$TRACKING_FILE")"
    existing='{"version":1}'
  fi

  # Merge operation entry (include artifactPath only if provided)
  if [[ -n "$artifact_path" ]]; then
    echo "$existing" | jq \
      --arg op "$operation" \
      --arg ts "$timestamp" \
      --arg hash "$commit_hash" \
      --arg branch "$base_branch" \
      --arg mode "$mode" \
      --argjson formats "$formats_json" \
      --arg artifact "$artifact_path" \
      '.[$op] = {
        lastRunAt: $ts,
        commitHash: $hash,
        baseBranch: $branch,
        mode: $mode,
        formats: $formats,
        artifactPath: $artifact
      }' > "$TRACKING_FILE"
  else
    echo "$existing" | jq \
      --arg op "$operation" \
      --arg ts "$timestamp" \
      --arg hash "$commit_hash" \
      --arg branch "$base_branch" \
      --arg mode "$mode" \
      --argjson formats "$formats_json" \
      '.[$op] = {
        lastRunAt: $ts,
        commitHash: $hash,
        baseBranch: $branch,
        mode: $mode,
        formats: $formats
      }' > "$TRACKING_FILE"
  fi

  echo "Updated $TRACKING_FILE [$operation]"
}

# Dispatch subcommand
case "${1:-}" in
  init)
    cmd_init
    ;;
  read)
    shift
    cmd_read "$@"
    ;;
  write)
    shift
    cmd_write "$@"
    ;;
  *)
    echo "Usage: resolve-tracking.sh {init|read|write} [args...]" >&2
    echo "" >&2
    echo "Commands:" >&2
    echo "  init                                              Create tracking.json if missing" >&2
    echo "  read <operation>                                  Read operation entry" >&2
    echo "  write <op> <hash> <branch> <mode> [--artifact-path <p>] [fmts]" >&2
    exit 1
    ;;
esac
