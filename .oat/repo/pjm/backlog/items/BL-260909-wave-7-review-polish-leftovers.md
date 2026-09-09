---
id: BL-260909-wave-7-review-polish-leftovers
title: Wave-7 review polish leftovers
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - polish
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:47.659Z
updated: 2026-09-09T08:35:47.659Z
associated_issues: []
external_plans: []
---

## Description

Minor findings deferred by wave-7 reviews, none behavior-affecting; sweep in one change. p03: check `OXFMT_BINARY` exists before spawning (round-2 m2). p05: redundant set-then-get in the aggregate walk (m3). p09: dangling / file / circular symlink exclusions still receive the frozen case-sensitivity hint (m2). p11: comment that `hopCapError`'s `other` role is unreachable; docs bullet to say the empty-manifest line is human-output only. p12: the `useDiskManifestPersistence` cwd guard is unexercised by any test (m2). p13: `validatedSkillCount` reports `oat-*` only while the promoted pass iterates all 83 skills (m3). p04 brief carry-over: an optional CLI case for a non-zero-exit `oat` stub → exit 1 with `Unable to clear the active project pointer`.

## Acceptance Criteria

- Each listed item is either fixed or explicitly rejected with a reason in the closing note.
- No item changes accepted or rejected inputs (weaker-anywhere rule).
