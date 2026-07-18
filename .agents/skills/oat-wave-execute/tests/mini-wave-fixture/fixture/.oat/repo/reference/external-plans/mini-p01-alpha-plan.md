# Mini Plan p01: Alpha Lane

**Write surface:** `src/alpha.txt`
**Wave hint:** `wave-1`, group candidate with p02

## Drift check

Run `git diff --quiet "$BASE_SHA" -- src/alpha.txt`. STOP if the file changed
after the recorded base.

## Tasks

1. Change `alpha: pending` to `alpha: implemented`.
2. Append `alpha-check: passed`.

## Verification

Run `/bin/bash scripts/dod-gate.sh` and
`grep -q '^alpha-check: passed$' src/alpha.txt`.

## Review focus

Confirm only `src/alpha.txt` changed and both required lines are present.
