---
id: BL-261012-regenerate-the-archive-aware
title: Regenerate the archive-aware PR body on a synced archive resume
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - artifact-cleanup
assignee: null
created: 2026-10-12T14:30:42.193Z
updated: 2026-10-12T14:30:42.193Z
associated_issues: []
external_plans: []
---

## Description

Since artifact-cleanup p04-t21, oat-project-complete carries the archive-aware PR body across Step 8 in a temp file, so a run resumed recordlessly after the archive (between Step 8 and cleanup) has no body and reports a manual PR update instead of syncing. Regenerate the archive-aware body on that resume from the archive's retained artifacts and the retained project ref (PROJECT_LINKS_PIN_COMMIT), then make the Step 11.5 sync run again.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
