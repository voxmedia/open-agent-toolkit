#!/bin/bash
# TEMPORARY G01 pin-probe capture hook.
# Records raw Cursor hook payloads so subagent model resolution can be observed
# from Cursor itself rather than from agent self-report.
# Delete together with .cursor/hooks.json and the zz-pin-probe-* agents.
set -u

OUT_DIR="/tmp/g01-probe"
OUT="$OUT_DIR/hooks.jsonl"
mkdir -p "$OUT_DIR" 2>/dev/null || :

input=$(cat)
ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

printf '{"captured_at":"%s","payload":%s}\n' "$ts" "$input" >>"$OUT" 2>/dev/null || :

event=$(printf '%s' "$input" |
  sed -n 's/.*"hook_event_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

# Observe only. Never block, never fail closed.
case "$event" in
  subagentStop) printf '{}\n' ;;
  *) printf '{"permission":"allow"}\n' ;;
esac

exit 0
