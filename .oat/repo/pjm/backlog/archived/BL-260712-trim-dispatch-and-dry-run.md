---
id: BL-260712-trim-dispatch-and-dry-run
title: 'Trim dispatch-and-dry-run implementation reference'
status: closed # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: [skills, context-efficiency, oat-project-implement]
assignee: null
created: '2026-07-12T19:27:00Z'
updated: '2026-07-13T04:13:27Z'
associated_issues: []
---

## Description

The `oat-project-implement` skill was split into a 167-line router plus four
phase-routed references (commit `b335aa18`, skill v2.0.38). The split was a
deliberately verbatim, lossless block extraction: it changed loading order,
not content. As a result `references/dispatch-and-dry-run.md` was already the
largest slice at 697 lines and grew to 715 during topology restoration —
roughly a third of the total contract — while the root agent still loads all
of it before any dispatch preflight.

Follow-up content editing (out of scope for the bounded refactor) should trim
this reference: condense redundant prose, collapse repeated invariant
restatements, and evaluate whether dry-run handling deserves its own smaller
route so the common (non-dry-run) path doesn't pay for it.

Origin: session-observer review of the smoke-testing/skill-size work on
2026-07-12; identified as the next candidate after verifying the extraction
preserved all contracts.

## Acceptance Criteria

- `references/dispatch-and-dry-run.md` is materially smaller (target: under
  ~450 lines) without dropping any behavioral invariant
- Dry-run-only content is either clearly separated within the reference or
  moved to its own route loaded only when `--dry-run` is passed
- Contract tests (`skills.test.ts`, `review-skill-contracts`,
  `post-implement-sequence-contracts`) updated and passing
- Skill frontmatter `version:` bumped in the same PR (PR-scoped rule)
- Lockstep public package versions bumped and `pnpm release:validate` passes
