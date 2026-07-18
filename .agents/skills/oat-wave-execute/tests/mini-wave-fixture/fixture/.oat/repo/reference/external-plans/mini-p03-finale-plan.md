# Mini Plan p03: Solo Finale

**Write surface:** `src/finale.txt`
**Wave hint:** `wave-1`, ungrouped solo finale after p01 and p02

## Drift check

Run `git diff --quiet "$BASE_SHA" -- src/finale.txt`. STOP if the file changed
after the recorded base.

## Tasks

1. Change `finale: pending` to `finale: implemented`.
2. Append `fan-in-check: passed`.

## Verification

Run `/bin/bash scripts/dod-gate.sh` and
`grep -q '^fan-in-check: passed$' src/finale.txt`.

## Review focus

Confirm the finale runs after p01 and p02 fan in and only `src/finale.txt`
changes.
