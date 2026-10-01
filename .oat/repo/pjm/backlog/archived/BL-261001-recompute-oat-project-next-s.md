---
id: BL-261001-recompute-oat-project-next-s
title: Recompute oat-project-next's exit-gate fingerprint with the
  effective-delta-v2 exclusions
status: closed
priority: high
scope: task
scope_estimate: XS
labels:
  - lifecycle
  - skills
  - exit-gate
assignee: null
created: 2026-10-01T05:38:45.534Z
updated: '2026-10-01T19:47:54Z'
associated_issues: []
external_plans: []
---

## Description

Wave 2 (#332) moved exit-gate freshness to `effective-delta-v2`, which excludes
the state carrier plus every path under `.oat/projects` and `.oat/repo`
(`oat-project-implement/references/completion-and-closeout.md`, Step 14;
`DR-260928-exclude-project-and-repository`). `oat-project-next/SKILL.md`
section 5.0 (around line 403) still tells the read-only router to recompute the
fingerprint "with only its literal state-carrier exclusion". A fresh v2
generation is therefore reported as stale after any project-artifact or
repository-record commit, and the router sends the user back to implement for
no reason. #332 changed only that skill's routing table. Found by the 2026-10-01
Wave 3 reconnaissance.

## Acceptance Criteria

- `oat-project-next` recomputes a stored `effective-delta-v2` fingerprint with
  the same three literal exclusions as the implement skill, and a v1
  fingerprint with v1 rules.
- A contract test pins the exclusion set in `oat-project-next` against the one
  in `completion-and-closeout.md`, so the two cannot drift again.
- `oat-project-next` `metadata.version` bumped.
