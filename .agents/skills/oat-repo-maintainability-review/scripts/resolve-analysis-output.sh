#!/usr/bin/env bash
# resolve-analysis-output.sh - resolve output destination for repo review analysis artifacts
# Usage:
#   resolve-analysis-output.sh [--mode auto|local|tracked|inline] [--output <path>]

set -eu

MODE="auto"
OUTPUT=""
TRACKED_DIR=".oat/repo/analysis"
LOCAL_DIR=".oat/projects/local/analysis"

usage() {
  cat <<USAGE
Usage: resolve-analysis-output.sh [--mode auto|local|tracked|inline] [--output <path>]

Resolves output destination for repo review analysis artifacts.

Policy:
- If --output is provided, it overrides mode-derived destination.
- If mode=inline, no file artifact is written.
- In auto mode:
  - If .oat/repo/analysis exists and is NOT gitignored, use tracked output.
  - Otherwise, use local-only output under .oat/projects/local/analysis.
- Default filename contract:
  <YYYY-MM-DD>-repo-review-analysis.md
  with same-day suffixes -2, -3, ... when needed.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --mode" >&2
        exit 1
      fi
      MODE="$2"
      shift 2
      ;;
    --output)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --output" >&2
        exit 1
      fi
      OUTPUT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "$MODE" in
  auto|local|tracked|inline) ;;
  *)
    echo "Invalid --mode: $MODE" >&2
    exit 1
    ;;
esac

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Error: Must be run from a git repository" >&2
  exit 1
fi

is_gitignored() {
  local path="$1"
  # Best-effort for non-existent paths: gitignore evaluation may be incomplete.
  if git check-ignore -q "$path" 2>/dev/null; then
    echo "true"
  else
    echo "false"
  fi
}

next_default_output_path() {
  local dir="$1"
  local today base candidate n
  today=$(date +%Y-%m-%d)
  base="${today}-repo-review-analysis.md"
  candidate="$dir/$base"

  if [[ ! -e "$candidate" ]]; then
    printf '%s\n' "$candidate"
    return
  fi

  n=2
  while [[ -e "$dir/${today}-repo-review-analysis-${n}.md" ]]; do
    n=$((n + 1))
  done
  printf '%s\n' "$dir/${today}-repo-review-analysis-${n}.md"
}

emit_file_result() {
  local kind="$1"
  local output_path="$2"
  local reason="$3"

  echo "analysis_mode=file"
  echo "output_path=$output_path"
  echo "output_kind=$kind"
  echo "output_gitignored=$(is_gitignored "$output_path")"
  echo "reason=$reason"
}

if [[ -n "$OUTPUT" ]]; then
  if [[ "$MODE" == "inline" ]]; then
    echo "warning: --output overrides --mode inline; artifact will be written to file." >&2
  fi

  if [[ -d "$OUTPUT" ]]; then
    if [[ ! -w "$OUTPUT" ]]; then
      echo "warning: advisory: output directory is not writable: $OUTPUT" >&2
    fi
    emit_file_result "custom" "$(next_default_output_path "$OUTPUT")" "explicit_output_dir"
  else
    parent_dir=$(dirname "$OUTPUT")
    if [[ ! -d "$parent_dir" ]]; then
      echo "warning: advisory: parent directory does not exist: $parent_dir" >&2
    elif [[ ! -w "$parent_dir" ]]; then
      echo "warning: advisory: parent directory is not writable: $parent_dir" >&2
    fi
    emit_file_result "custom" "$OUTPUT" "explicit_output_path"
  fi
  exit 0
fi

if [[ "$MODE" == "inline" ]]; then
  echo "analysis_mode=inline"
  echo "output_path="
  echo "output_kind=inline"
  echo "output_gitignored=n/a"
  echo "reason=inline_mode"
  exit 0
fi

if [[ "$MODE" == "tracked" ]]; then
  emit_file_result "tracked" "$(next_default_output_path "$TRACKED_DIR")" "forced_tracked"
  exit 0
fi

if [[ "$MODE" == "local" ]]; then
  emit_file_result "local" "$(next_default_output_path "$LOCAL_DIR")" "forced_local"
  exit 0
fi

# auto mode
if [[ -d "$TRACKED_DIR" ]] && [[ "$(is_gitignored "$TRACKED_DIR")" == "false" ]]; then
  emit_file_result "tracked" "$(next_default_output_path "$TRACKED_DIR")" "existing_tracked_dir"
  exit 0
fi

emit_file_result "local" "$(next_default_output_path "$LOCAL_DIR")" "default_local_only"
