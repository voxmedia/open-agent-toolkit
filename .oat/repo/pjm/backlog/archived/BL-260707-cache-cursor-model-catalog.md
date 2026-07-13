---
id: BL-260707-cache-cursor-model-catalog
title: 'Cache Cursor model catalog during matrix validation'
status: closed # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [cursor, dispatch-matrix, performance, review-followup]
assignee: null
created: '2026-07-07T21:16:23Z'
updated: '2026-07-11T03:25:48Z'
associated_issues: [BL-260707-consolidate-dispatch-matrix]
---

## Description

Final review for `multi-family-dispatch` accepted deferring a Minor performance
follow-up: Cursor availability validation shells out to `cursor-agent models`
once per matrix cell during adopt and doctor validation. Correctness is
unaffected, and these are maintenance surfaces rather than dispatch hot paths,
but a slow responsive Cursor CLI can make a full validation pass noticeably
slower.

## Acceptance Criteria

- Cache the parsed Cursor model catalog for the duration of one validation pass.
- Share the cache across adopt and doctor loops when they validate multiple
  Cursor cells.
- Preserve fallback behavior for missing Cursor CLI, failed catalog fetches, and
  `--list-models` fallback.
- Keep validation results explicit: valid, invalid, and unvalidated outcomes
  must remain distinguishable in CLI output.
- Add focused tests that prove repeated Cursor cell validation does not invoke
  the catalog command once per cell.

## Completion Evidence

- `697a80d5` separated Task probes from broad-catalog diagnostics, and
  `22e254c0` added one explicit memoized validation-pass context.
- `df5fa4c5` and `5e2fff75` share that pass across config adoption and doctor;
  `75288f32` preserved validator option boundaries.
- Availability and dispatch-validation tests cover missing CLI, failed primary
  catalog fetches, the `--list-models` fallback, and memoized failures.
- Config and doctor tests prove repeated cells share exact-candidate probes and
  one lazy broad-catalog lookup while retaining distinct `valid`,
  `unknown-value`, and `unvalidated` results.
- Phase p05 focused verification passed 724/724 tests, and full repository and
  release validation passed for version `0.1.49`.
