#!/usr/bin/env bash
# Run a command with HOME set to a new directory under TMPDIR, then remove that
# directory on every exit path (success, failure, INT, TERM) and exit with the
# command's status.
#
#   bash scripts/with-isolated-home.sh pnpm exec turbo run test --force
#
# The command runs in the foreground so it keeps the terminal's process group:
# Ctrl-C or a group-wide TERM stops it, and cleanup runs once it has exited.
set -u

if [ "$#" -eq 0 ]; then
  echo "usage: bash scripts/with-isolated-home.sh <command> [args...]" >&2
  exit 2
fi

tmp_root=${TMPDIR:-/tmp}
isolated_home=$(mktemp -d "${tmp_root%/}/oat-isolated-home.XXXXXX") || exit 1

trap 'rm -rf -- "$isolated_home"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

HOME="$isolated_home" "$@"
exit "$?"
