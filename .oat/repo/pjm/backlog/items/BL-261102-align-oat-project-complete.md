---
id: BL-261102-align-oat-project-complete
title: Align oat-project-complete recap skip guidance with the terminal-outcome guard
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - skills
  - lifecycle
assignee: null
created: 2026-11-02T14:07:17.505Z
updated: 2026-11-02T14:07:17.505Z
associated_issues: []
external_plans: []
---

## Description

oat-project-complete Step 3.6 tells callers to invoke the oat-explainer-kit check-terminal-outcome.mjs guard with --project-root "$PROJECT_PATH" for every persisted skip. The guard rejects --project-root unless the skip source is failed_attempt: for a skip with source interactive it exits 1 with {"code":"E_RECAP_OUTCOME","message":"A failed-attempt project root applies only to skip/failed_attempt evidence."}. Reproduced on 2026-11-02 while completing wave-1-correctness, where the same call without --project-root returned ok. A caller that follows the skill text literally stops completion before any lifecycle write.

## Acceptance Criteria

- Following `oat-project-complete` Step 3.6 literally for a persisted skip with source `interactive`, `configured` or any other non-`failed_attempt` source runs the guard successfully (exit 0, `ok: true`).
- A `skip/failed_attempt` decision still passes `--project-root` with its validated `--manifest` or `--failure` evidence, and the guard still rejects a failed-attempt skip that lacks that evidence.
- Either the skill passes `--project-root` only for `failed_attempt`, or the guard accepts and ignores it for other skip sources; the skill text and guard behavior agree, and the choice is recorded in the change.
- A contract test runs the documented invocation for an `interactive` skip and for a `failed_attempt` skip and fails against the current mismatch.
