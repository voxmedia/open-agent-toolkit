# Mini Plan p02: Beta Lane

**Write surface:** `src/beta.txt`
**Wave hint:** `wave-1`, group candidate with p01

## Drift check

Run `git diff --quiet "$BASE_SHA" -- src/beta.txt`. STOP if the file changed
after the recorded base.

## Tasks

1. Change `beta: pending` to `beta: implemented`.
2. Append `beta-check: passed`.

## Verification

Run `/bin/bash scripts/dod-gate.sh` and
`grep -q '^beta-check: passed$' src/beta.txt`.

## Review focus

Confirm only `src/beta.txt` changed and both required lines are present.
