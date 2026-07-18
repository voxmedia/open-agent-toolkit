#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_DIR="$SCRIPT_DIR/fixture"
MATERIALIZED_DIR=""

materialize() {
  local timestamp
  local destination

  timestamp="$(date +%Y%m%d%H%M%S)-$$"
  destination="${TMPDIR:-/tmp}/mini-wave-$timestamp"
  MATERIALIZED_DIR="$destination"

  mkdir -p "$destination"
  cp -R "$FIXTURE_DIR/." "$destination/"

  git -C "$destination" init -q
  git -C "$destination" config user.name "Mini Wave Fixture"
  git -C "$destination" config user.email "mini-wave@example.invalid"
  git -C "$destination" add .
  git -C "$destination" commit -q -m "chore: initialize mini-wave fixture"

  MATERIALIZED_DIR=""
  printf '%s\n' "$destination"
}

main() {
  if [[ $# -ne 0 ]]; then
    echo "Usage: setup-fixture.sh" >&2
    return 2
  fi

  trap 'if [[ -n "$MATERIALIZED_DIR" ]]; then rm -rf "$MATERIALIZED_DIR"; fi' EXIT
  materialize
}

main "$@"
