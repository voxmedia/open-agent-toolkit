---
id: BL-260707-cache-cursor-model-catalog
title: 'Cache Cursor model catalog during matrix validation'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [cursor, dispatch-matrix, performance, review-followup]
assignee: null
created: '2026-07-07T21:16:23Z'
updated: '2026-07-07T21:16:23Z'
associated_issues: [BL-260707-consolidate-dispatch-matrix]
oat_template: true
oat_template_name: backlog-item
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
